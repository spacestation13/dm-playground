import { commandQueueService } from './CommandQueueService'
import { emulatorService } from './EmulatorService'

const LATEST_VERSION_URL = 'https://byond-builds.dm-lang.org/version.txt'
const DOWNLOAD_BASE_URL = 'https://byond-builds.dm-lang.org'
const ACTIVE_VERSION_KEY = 'byondActiveVersion'

export enum ByondStatus {
  Idle = 'idle',
  Fetching = 'fetching',
  Fetched = 'fetched',
  Loading = 'loading',
  Installed = 'installed',
  Error = 'error',
}

export class ByondService {
  private versions = new Map<string, ByondStatus>()
  private activeVersion: string | null = null
  private events = new EventTarget()
  private initialized = false

  addEventListener(type: 'active', listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener(type, listener)
  }

  removeEventListener(type: 'active', listener: EventListenerOrEventListenerObject) {
    this.events.removeEventListener(type, listener)
  }

  addStatusListener(listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener('status', listener)
  }

  removeStatusListener(listener: EventListenerOrEventListenerObject) {
    this.events.removeEventListener('status', listener)
  }

  async initialize() {
    if (this.initialized) {
      return
    }
    this.initialized = true

    const localVersions = await this.getLocalVersions()
    const storedActive = localStorage.getItem(ACTIVE_VERSION_KEY)

    if (storedActive && localVersions.includes(storedActive)) {
      this.activeVersion = storedActive
      try {
        await this.load(storedActive, true)
      } catch {
        this.activeVersion = null
      }
      return
    }

    if (localVersions.length > 0) {
      const latest = localVersions[0]
      try {
        await this.load(latest, true)
      } catch {
        this.activeVersion = null
      }
    }
  }

  async getLatestVersion() {
    const response = await fetch(LATEST_VERSION_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch version.txt: ${response.status}`)
    }

    const text = await response.text()
    const version = text.trim().split(/\r?\n/)[0]?.trim()
    if (!version || !/^\d+\.\d+$/.test(version)) {
      throw new Error('Invalid version format in version.txt')
    }
    return version
  }

  async getLocalVersions() {
    const directory = await this.getByondDirectory()
    const versions: string[] = []

    const iterable = directory as FileSystemDirectoryHandle & {
      entries: () => AsyncIterable<[string, FileSystemHandle]>
    }

    for await (const [, entry] of iterable.entries()) {
      if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
        versions.push(entry.name.replace(/\.zip$/, ''))
        if (!this.versions.has(entry.name.replace(/\.zip$/, ''))) {
          this.setStatus(entry.name.replace(/\.zip$/, ''), ByondStatus.Fetched)
        }
      }
    }

    return versions.sort().reverse()
  }

  async downloadVersion(version: string, onProgress?: (value: number) => void) {
    this.setStatus(version, ByondStatus.Fetching)
    const major = version.split('.')[0]
    const url = `${DOWNLOAD_BASE_URL}/${major}/${version}_byond_linux.zip`
    const response = await fetch(url)

    if (!response.ok) {
      this.setStatus(version, ByondStatus.Error)
      throw new Error(`Failed to download BYOND ${version}: ${response.status}`)
    }

    const directory = await this.getByondDirectory()
    const fileHandle = await directory.getFileHandle(`${version}.zip`, { create: true })
    const writable = await fileHandle.createWritable()

    if (!response.body) {
      const buffer = await response.arrayBuffer()
      await writable.write(buffer)
      await writable.close()
      onProgress?.(1)
      this.setStatus(version, ByondStatus.Fetched)
      return
    }

    const reader = response.body.getReader()
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        received += value.length
        await writable.write(value)
        if (contentLength > 0) {
          onProgress?.(received / contentLength)
        }
      }
    }

    await writable.close()
    onProgress?.(1)
    this.setStatus(version, ByondStatus.Fetched)
  }

  async load(version: string, setActive = true) {
    const status = this.versions.get(version)
    if (!status || (status !== ByondStatus.Fetched && status !== ByondStatus.Installed)) {
      throw new Error('Version not available')
    }

    await commandQueueService.runToSuccess('/bin/mkdir', '-p\0/mnt/host/byond')

    const destination = setActive ? '/var/lib/byond_staging' : `/mnt/host/byond/${version}`

    if (status !== ByondStatus.Installed) {
      this.setStatus(version, ByondStatus.Loading)
      const zipFile = await this.getVersion(version)
      await emulatorService.sendFile(`byond/${version}.zip`, new Uint8Array(await zipFile.arrayBuffer()))
      await commandQueueService.runToSuccess([
        `/bin/unzip /mnt/host/byond/${version}.zip 'byond/bin*' -j -d ${destination}`,
        `/bin/rm /mnt/host/byond/${version}.zip`,
      ])
      this.setStatus(version, ByondStatus.Installed)
    } else if (setActive) {
      // Version is already installed at /mnt/host/byond/${version}, move it to staging
      await commandQueueService.runToSuccess('/bin/mv', `/mnt/host/byond/${version}\0${destination}`)
    }

    if (setActive) {
      await commandQueueService.runToSuccess('/bin/mkdir', '-p\0/var/lib/byond')
      if (this.activeVersion) {
        await commandQueueService.runToSuccess('/bin/mv', `/var/lib/byond\0/mnt/host/byond/${this.activeVersion}`)
      }
      await commandQueueService.runToSuccess('/bin/mv', `${destination}\0/var/lib/byond`)
      this.activeVersion = version
      localStorage.setItem(ACTIVE_VERSION_KEY, version)
      this.events.dispatchEvent(new CustomEvent('active', { detail: version }))
    }
  }

  async deleteVersion(version: string) {
    const directory = await this.getByondDirectory()
    await directory.removeEntry(`${version}.zip`, { recursive: false })
    this.versions.delete(version)
    this.events.dispatchEvent(new CustomEvent('status', { detail: { version, status: ByondStatus.Idle } }))
    if (this.activeVersion === version) {
      this.activeVersion = null
      localStorage.removeItem(ACTIVE_VERSION_KEY)
      this.events.dispatchEvent(new CustomEvent('active', { detail: null }))
    }
    await commandQueueService.runToCompletion('/bin/rm', `-rf\0/var/lib/byond/${version}.zip\0/mnt/host/byond/${version}`)
  }

  getStatus(version: string) {
    return this.versions.get(version) ?? ByondStatus.Idle
  }

  getActiveVersion() {
    return this.activeVersion ?? localStorage.getItem(ACTIVE_VERSION_KEY)
  }

  useActive<T>(fn: (path: string | null) => T) {
    return fn(this.getActiveVersion() ? '/var/lib/byond/' : null)
  }

  private async getVersion(version: string) {
    const directory = await this.getByondDirectory()
    const handle = await directory.getFileHandle(`${version}.zip`, { create: true })
    const file = await handle.getFile()
    if (file.size !== 0) {
      return file
    }
    throw new Error('Version not downloaded')
  }

  private setStatus(version: string, status: ByondStatus) {
    this.versions.set(version, status)
    this.events.dispatchEvent(new CustomEvent('status', { detail: { version, status } }))
  }

  private async getByondDirectory() {
    const root = await navigator.storage.getDirectory()
    return root.getDirectoryHandle('byond', { create: true })
  }
}

export const byondService = new ByondService()
