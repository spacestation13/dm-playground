import { commandQueueService } from './CommandQueueService'
import { emulatorService } from './EmulatorService'

const LATEST_VERSION_URL = 'https://byond-builds.dm-lang.org/version.txt'
const DOWNLOAD_BASE_URL = 'https://byond-builds.dm-lang.org'

const ACTIVE_VERSION_KEY = 'byondActiveVersion'
const VERSION_PATTERN = /^\d+\.\d+$/

const HOST_BYOND_PATH = '/mnt/host/byond'
const ACTIVE_BYOND_PATH = '/var/lib/byond'

export enum ByondStatus {
  Idle = 'idle',
  Fetching = 'downloading',
  Fetched = 'cached',
  Loading = 'loading',
  Installed = 'ready',
  Error = 'error',
}

export enum ByondEvent {
  Active = 'active',
  Loading = 'loading',
}

export class ByondService {
  private versions = new Map<string, ByondStatus>()
  private activeVersion: string | null = null
  private events = new EventTarget()
  private initialized = false
  private loading = false

  addEventListener(
    type: ByondEvent,
    listener: EventListenerOrEventListenerObject
  ) {
    this.events.addEventListener(type, listener)
  }

  removeEventListener(
    type: ByondEvent,
    listener: EventListenerOrEventListenerObject
  ) {
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

    await commandQueueService.runToSuccess(
      '/bin/mkdir',
      `-p\0${HOST_BYOND_PATH}`
    )

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
      return
    }

    // no local versions available, fetch the latest version
    const latestVersion = await this.getLatestVersion()
    await this.downloadVersion(latestVersion)
    await this.load(latestVersion, true)
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
    const statuses = new Map<string, ByondStatus>()

    const iterable = directory as FileSystemDirectoryHandle & {
      entries: () => AsyncIterable<[string, FileSystemHandle]>
    }

    for await (const [, entry] of iterable.entries()) {
      if (entry.kind === 'directory' && VERSION_PATTERN.test(entry.name)) {
        statuses.set(entry.name, ByondStatus.Installed)
        continue
      }

      if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
        const version = entry.name.replace(/\.zip$/, '')
        if (!VERSION_PATTERN.test(version)) {
          continue
        }
        if (!statuses.has(version)) {
          statuses.set(version, ByondStatus.Fetched)
        }
      }
    }

    for (const [version, status] of statuses.entries()) {
      this.setStatus(version, status)
    }

    return [...statuses.keys()].sort().reverse()
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
    const fileHandle = await directory.getFileHandle(`${version}.zip`, {
      create: true,
    })
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
    if (this.loading) {
      throw new Error('Another version is currently being loaded')
    }

    const status = this.versions.get(version)
    if (
      !status ||
      (status !== ByondStatus.Fetched && status !== ByondStatus.Installed)
    ) {
      throw new Error('Version not available')
    }

    this.loading = true
    this.events.dispatchEvent(
      new CustomEvent(ByondEvent.Loading, { detail: true })
    )
    try {
      const installPath = `${HOST_BYOND_PATH}/${version}`

      if (status !== ByondStatus.Installed) {
        this.setStatus(version, ByondStatus.Loading)
        const zipFile = await this.getVersion(version)
        emulatorService.sendFile(
          `byond/${version}.zip`,
          new Uint8Array(await zipFile.arrayBuffer())
        )
        await commandQueueService.runToSuccess([
          `/bin/rm -rf ${installPath}`,
          `/bin/mkdir -p ${installPath}`,
          `/bin/unzip ${HOST_BYOND_PATH}/${version}.zip 'byond/bin*' -j -d ${installPath}`,
          `/bin/rm -f ${HOST_BYOND_PATH}/${version}.zip`,
        ])
        this.setStatus(version, ByondStatus.Installed)
      }

      if (setActive) {
        await commandQueueService.runToSuccess([
          '/bin/mkdir -p /var/lib',
          `/bin/rm -rf ${ACTIVE_BYOND_PATH}`,
          `/bin/ln -s ${installPath} ${ACTIVE_BYOND_PATH}`,
        ])
        this.activeVersion = version
        localStorage.setItem(ACTIVE_VERSION_KEY, version)
        this.events.dispatchEvent(
          new CustomEvent(ByondEvent.Active, { detail: version })
        )
      }
    } finally {
      this.loading = false
      this.events.dispatchEvent(
        new CustomEvent(ByondEvent.Loading, { detail: false })
      )
    }
  }

  async deleteVersion(version: string) {
    const directory = await this.getByondDirectory()
    const wasActive = this.activeVersion === version

    await Promise.all([
      this.removeDirectoryEntry(directory, `${version}.zip`, false),
      this.removeDirectoryEntry(directory, version, true),
    ])
    this.versions.delete(version)
    this.events.dispatchEvent(
      new CustomEvent('status', {
        detail: { version, status: ByondStatus.Idle },
      })
    )
    if (wasActive) {
      this.activeVersion = null
      localStorage.removeItem(ACTIVE_VERSION_KEY)
      this.events.dispatchEvent(
        new CustomEvent(ByondEvent.Active, { detail: null })
      )
    }

    const pathsToRemove = [
      `${HOST_BYOND_PATH}/${version}`,
      `${HOST_BYOND_PATH}/${version}.zip`,
    ]
    if (wasActive) {
      pathsToRemove.unshift(ACTIVE_BYOND_PATH)
    }

    await commandQueueService.runToCompletion(
      '/bin/rm',
      ['-rf', ...pathsToRemove].join('\0')
    )
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
    const handle = await directory.getFileHandle(`${version}.zip`, {
      create: true,
    })
    const file = await handle.getFile()
    if (file.size !== 0) {
      return file
    }
    throw new Error('Version not downloaded')
  }

  private setStatus(version: string, status: ByondStatus) {
    this.versions.set(version, status)
    this.events.dispatchEvent(
      new CustomEvent('status', { detail: { version, status } })
    )
  }

  private async removeDirectoryEntry(
    directory: FileSystemDirectoryHandle,
    name: string,
    recursive: boolean
  ) {
    try {
      await directory.removeEntry(name, { recursive })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return
      }
      throw error
    }
  }

  private async getByondDirectory() {
    const root = await navigator.storage.getDirectory()
    return root.getDirectoryHandle('byond', { create: true })
  }
}

export const byondService = new ByondService()
