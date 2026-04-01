import { commandQueueService } from './CommandQueueService'
import { byondArchiveStorage } from './ByondArchiveStorage'
import { emulatorService } from './EmulatorService'
import { ensurePersistentStorage } from './storagePersistence'

const LATEST_VERSION_URL = 'https://byond-builds.dm-lang.org/version.txt'
const DOWNLOAD_BASE_URL = 'https://byond-builds.dm-lang.org'

const ACTIVE_VERSION_KEY = 'byondActiveVersion'

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
  Progress = 'progress',
}

export class ByondService {
  private versions = new Map<string, ByondStatus>()
  private activeVersion: string | null = null
  private events = new EventTarget()
  private initialized = false
  private loading = false
  private runtimePreparationPromise: Promise<void> | null = null

  private static readonly LOCAL_VERSION_STATUSES = new Set<ByondStatus>([
    ByondStatus.Fetched,
    ByondStatus.Loading,
    ByondStatus.Installed,
  ])

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

  addProgressListener(listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener(ByondEvent.Progress, listener)
  }

  removeProgressListener(listener: EventListenerOrEventListenerObject) {
    this.events.removeEventListener(ByondEvent.Progress, listener)
  }

  async initialize() {
    if (this.initialized) {
      return
    }
    this.initialized = true

    const localVersions = await this.getLocalVersions()
    const storedActive = localStorage.getItem(ACTIVE_VERSION_KEY)

    await this.ensureRuntimePrepared()

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
    const statuses = new Map<string, ByondStatus>()

    const storedStatuses = await byondArchiveStorage.listVersionStatuses()
    storedStatuses.forEach((storedStatus, version) => {
      statuses.set(
        version,
        storedStatus === 'installed'
          ? ByondStatus.Installed
          : ByondStatus.Fetched
      )
    })

    for (const [version, currentStatus] of this.versions.entries()) {
      if (
        ByondService.LOCAL_VERSION_STATUSES.has(currentStatus) &&
        !statuses.has(version)
      ) {
        statuses.set(version, currentStatus)
      }
    }

    for (const [version, status] of statuses.entries()) {
      const currentStatus = this.versions.get(version)
      if (
        currentStatus === ByondStatus.Loading ||
        currentStatus === ByondStatus.Installed
      ) {
        continue
      }
      this.setStatus(version, status)
    }

    return [...statuses.keys()].sort().reverse()
  }

  async downloadVersion(version: string, onProgress?: (value: number) => void) {
    this.setStatus(version, ByondStatus.Fetching)
    const major = version.split('.')[0]
    const url = `${DOWNLOAD_BASE_URL}/${major}/${version}_byond_linux.zip`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          `Failed to download BYOND ${version}: ${response.status}`
        )
      }

      const progressHandler = (v: number) => {
        onProgress?.(v)
        this.events.dispatchEvent(
          new CustomEvent(ByondEvent.Progress, {
            detail: { version, value: v },
          })
        )
      }

      await byondArchiveStorage.writeArchive(version, response, progressHandler)

      progressHandler(1)
      void ensurePersistentStorage()
      this.setStatus(version, ByondStatus.Fetched)
    } catch (error) {
      await byondArchiveStorage.deleteArchive(version)
      this.clearStatus(version)
      throw error
    }
  }

  async load(version: string, setActive = true) {
    if (this.loading) {
      throw new Error('Another version is currently being loaded')
    }

    await this.ensureRuntimePrepared()

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
      const stagedArchiveName = `${version}.zip`
      const stagedArchivePath = `/mnt/host/${stagedArchiveName}`

      if (status !== ByondStatus.Installed) {
        this.setStatus(version, ByondStatus.Loading)
        const zipFile = await this.getVersion(version)
        await emulatorService.sendFile(
          stagedArchiveName,
          new Uint8Array(await zipFile.arrayBuffer())
        )
        await commandQueueService.runToSuccess([
          `/bin/rm -rf ${installPath}`,
          `/bin/mkdir -p ${installPath}`,
          `/bin/unzip ${stagedArchivePath} 'byond/bin*' -j -d ${installPath}`,
          `/bin/rm -f ${stagedArchivePath}`,
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
    await this.ensureRuntimePrepared()

    const wasActive = this.activeVersion === version

    await byondArchiveStorage.deleteVersionStorage(version)

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

  async clearStorage() {
    await byondArchiveStorage.clear()
  }

  useActive<T>(fn: (path: string | null) => T) {
    return fn(this.getActiveVersion() ? '/var/lib/byond/' : null)
  }

  private async getVersion(version: string) {
    const archive = await byondArchiveStorage.getArchive(version)
    if (archive.size !== 0) {
      return archive
    }

    throw new Error('Version not downloaded')
  }

  private setStatus(version: string, status: ByondStatus) {
    this.versions.set(version, status)
    this.events.dispatchEvent(
      new CustomEvent('status', { detail: { version, status } })
    )
  }

  private clearStatus(version: string) {
    this.versions.delete(version)
    this.events.dispatchEvent(
      new CustomEvent('status', {
        detail: { version, status: ByondStatus.Idle },
      })
    )
  }

  private ensureRuntimePrepared() {
    if (!this.runtimePreparationPromise) {
      this.runtimePreparationPromise = (async () => {
        emulatorService.start()
        await commandQueueService.runToSuccess(
          '/bin/mkdir',
          `-p\0${HOST_BYOND_PATH}`
        )
      })().catch((error) => {
        this.runtimePreparationPromise = null
        throw error
      })
    }

    return this.runtimePreparationPromise
  }
}

export const byondService = new ByondService()
