const BYOND_DB_NAME = 'dm-playground'
const BYOND_DB_VERSION = 1
const BYOND_ARCHIVE_STORE = 'byondArchives'
const OPFS_PROBE_FILE_NAME = '.byond-storage-probe'
const VERSION_PATTERN = /^\d+\.\d+$/

// This file is so annoyingly complex because FileSystemWritableFileStream is only a thing since Sept 2025  (aka opfs in non-web-workers)
// Safari/Apple are so mean.
export type ByondStorageMode = 'opfs' | 'indexeddb'
export type ByondStoredVersionStatus = 'fetched' | 'installed'

export class ByondArchiveStorage {
  private storageModePromise: Promise<ByondStorageMode> | null = null

  async getMode() {
    if (!this.storageModePromise) {
      this.storageModePromise = this.detectStorageMode().catch((error) => {
        this.storageModePromise = null
        throw error
      })
    }

    return this.storageModePromise
  }

  async listVersions() {
    const storageMode = await this.getMode()

    if (storageMode === 'opfs') {
      const directory = await this.getByondDirectory()
      const iterable = directory as FileSystemDirectoryHandle & {
        entries: () => AsyncIterable<[string, FileSystemHandle]>
      }
      const versions: string[] = []

      for await (const [, entry] of iterable.entries()) {
        if (entry.kind !== 'file' || !entry.name.endsWith('.zip')) {
          continue
        }

        const version = entry.name.replace(/\.zip$/, '')
        if (VERSION_PATTERN.test(version)) {
          versions.push(version)
        }
      }

      return versions.sort().reverse()
    }

    return this.listIndexedDbArchiveVersions()
  }

  async listVersionStatuses() {
    const storageMode = await this.getMode()
    const statuses = new Map<string, ByondStoredVersionStatus>()

    if (storageMode === 'opfs') {
      const directory = await this.getByondDirectory()
      const iterable = directory as FileSystemDirectoryHandle & {
        entries: () => AsyncIterable<[string, FileSystemHandle]>
      }

      for await (const [, entry] of iterable.entries()) {
        if (entry.kind === 'directory' && VERSION_PATTERN.test(entry.name)) {
          statuses.set(entry.name, 'installed')
          continue
        }

        if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
          const version = entry.name.replace(/\.zip$/, '')
          if (!VERSION_PATTERN.test(version) || statuses.has(version)) {
            continue
          }
          statuses.set(version, 'fetched')
        }
      }

      return statuses
    }

    const versions = await this.listIndexedDbArchiveVersions()
    versions.forEach((version) => {
      statuses.set(version, 'fetched')
    })
    return statuses
  }

  async getDirectory() {
    return this.getByondDirectory()
  }

  async writeArchive(
    version: string,
    response: Response,
    onProgress?: (value: number) => void
  ) {
    const storageMode = await this.getMode()

    if (storageMode === 'opfs') {
      const directory = await this.getByondDirectory()
      await this.writeArchiveToOpfs(directory, version, response, onProgress)
      return
    }

    const blob = await this.readResponseAsBlob(response, onProgress)
    await this.putIndexedDbArchive(version, blob)
  }

  async getArchive(version: string) {
    const storageMode = await this.getMode()

    if (storageMode === 'opfs') {
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

    const archive = await this.getIndexedDbArchive(version)
    if (archive.size !== 0) {
      return archive
    }

    throw new Error('Version not downloaded')
  }

  async deleteArchive(version: string) {
    const storageMode = await this.getMode()

    if (storageMode === 'opfs') {
      const directory = await this.getByondDirectory()
      await this.removeDirectoryEntry(directory, `${version}.zip`, false)
      return
    }

    await this.deleteIndexedDbArchive(version)
  }

  async deleteVersionStorage(version: string) {
    const storageMode = await this.getMode()

    if (storageMode === 'opfs') {
      const directory = await this.getByondDirectory()
      await Promise.all([
        this.removeDirectoryEntry(directory, `${version}.zip`, false),
        this.removeDirectoryEntry(directory, version, true),
      ])
      return
    }

    await this.deleteIndexedDbArchive(version)
  }

  async clear() {
    const storageMode = await this.getMode()

    if (storageMode === 'opfs') {
      const root = await this.getStorageRootDirectory()
      await this.removeDirectoryEntry(root, 'byond', true)
      return
    }

    await this.clearIndexedDbArchives()
  }

  private async detectStorageMode(): Promise<ByondStorageMode> {
    if (await this.supportsOpfsArchives()) {
      return 'opfs'
    }

    const database = await this.openArchiveDatabase()
    database.close()
    return 'indexeddb'
  }

  private async supportsOpfsArchives() {
    try {
      const directory = await this.getByondDirectory()
      const fileHandle = await directory.getFileHandle(OPFS_PROBE_FILE_NAME, {
        create: true,
      })
      const supported = typeof fileHandle.createWritable === 'function'
      await this.removeDirectoryEntry(directory, OPFS_PROBE_FILE_NAME, false)
      return supported
    } catch {
      return false
    }
  }

  private async getStorageRootDirectory() {
    const storageManager = navigator.storage
    if (!storageManager || typeof storageManager.getDirectory !== 'function') {
      throw new Error('Browser storage directory API is unavailable')
    }

    return storageManager.getDirectory()
  }

  private async getByondDirectory() {
    const root = await this.getStorageRootDirectory()
    return root.getDirectoryHandle('byond', { create: true })
  }

  private async writeArchiveToOpfs(
    directory: FileSystemDirectoryHandle,
    version: string,
    response: Response,
    onProgress?: (value: number) => void
  ) {
    const fileHandle = await directory.getFileHandle(`${version}.zip`, {
      create: true,
    })

    if (typeof fileHandle.createWritable !== 'function') {
      throw new Error('Writable file handles are unavailable in this browser')
    }

    const writable = await fileHandle.createWritable()

    if (!response.body) {
      try {
        const buffer = await response.arrayBuffer()
        await writable.write(buffer)
      } finally {
        await writable.close()
      }
      onProgress?.(1)
      return
    }

    const reader = response.body.getReader()
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    let received = 0

    try {
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
    } finally {
      await writable.close()
    }
  }

  private async readResponseAsBlob(
    response: Response,
    onProgress?: (value: number) => void
  ) {
    if (!response.body) {
      const buffer = await response.arrayBuffer()
      onProgress?.(1)
      return new Blob([buffer], { type: 'application/zip' })
    }

    const reader = response.body.getReader()
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    const chunks: BlobPart[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value) {
        continue
      }

      received += value.length
      // Use a Uint8Array view (subarray) to avoid copying the underlying buffer.
      // `value.slice()` would allocate a new ArrayBuffer; `subarray()` shares the
      // same buffer and avoids temporary large allocations.
      chunks.push(value.subarray(0) as unknown as BlobPart)
      if (contentLength > 0) {
        onProgress?.(received / contentLength)
      }
    }

    return new Blob(chunks, { type: 'application/zip' })
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

  private openArchiveDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(BYOND_DB_NAME, BYOND_DB_VERSION)

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open archive database'))
      }
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(BYOND_ARCHIVE_STORE)) {
          database.createObjectStore(BYOND_ARCHIVE_STORE)
        }
      }
      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  private async listIndexedDbArchiveVersions() {
    const database = await this.openArchiveDatabase()

    try {
      return await new Promise<string[]>((resolve, reject) => {
        const transaction = database.transaction(
          BYOND_ARCHIVE_STORE,
          'readonly'
        )
        const store = transaction.objectStore(BYOND_ARCHIVE_STORE)
        const versions: string[] = []
        const request = store.openKeyCursor()

        request.onerror = () => {
          reject(request.error ?? new Error('Failed to read archive versions'))
        }
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) {
            resolve(versions.sort().reverse())
            return
          }

          const version = String(cursor.key)
          if (VERSION_PATTERN.test(version)) {
            versions.push(version)
          }
          cursor.continue()
        }
      })
    } finally {
      database.close()
    }
  }

  private async putIndexedDbArchive(version: string, archive: Blob) {
    const database = await this.openArchiveDatabase()

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          BYOND_ARCHIVE_STORE,
          'readwrite'
        )
        const store = transaction.objectStore(BYOND_ARCHIVE_STORE)

        transaction.oncomplete = () => {
          resolve()
        }
        transaction.onerror = () => {
          reject(transaction.error ?? new Error('Failed to store archive'))
        }
        transaction.onabort = () => {
          reject(transaction.error ?? new Error('Archive write aborted'))
        }

        store.put(archive, version)
      })
    } finally {
      database.close()
    }
  }

  private async getIndexedDbArchive(version: string) {
    const database = await this.openArchiveDatabase()

    try {
      return await new Promise<Blob>((resolve, reject) => {
        const transaction = database.transaction(
          BYOND_ARCHIVE_STORE,
          'readonly'
        )
        const store = transaction.objectStore(BYOND_ARCHIVE_STORE)
        const request = store.get(version)

        request.onerror = () => {
          reject(request.error ?? new Error('Failed to load archive'))
        }
        request.onsuccess = () => {
          const archive = request.result
          if (archive instanceof Blob) {
            resolve(archive)
            return
          }

          reject(new Error('Version not downloaded'))
        }
      })
    } finally {
      database.close()
    }
  }

  private async deleteIndexedDbArchive(version: string) {
    const database = await this.openArchiveDatabase()

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          BYOND_ARCHIVE_STORE,
          'readwrite'
        )
        const store = transaction.objectStore(BYOND_ARCHIVE_STORE)

        transaction.oncomplete = () => {
          resolve()
        }
        transaction.onerror = () => {
          reject(transaction.error ?? new Error('Failed to delete archive'))
        }
        transaction.onabort = () => {
          reject(transaction.error ?? new Error('Archive delete aborted'))
        }

        store.delete(version)
      })
    } finally {
      database.close()
    }
  }

  private async clearIndexedDbArchives() {
    const database = await this.openArchiveDatabase()

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          BYOND_ARCHIVE_STORE,
          'readwrite'
        )
        const store = transaction.objectStore(BYOND_ARCHIVE_STORE)

        transaction.oncomplete = () => {
          resolve()
        }
        transaction.onerror = () => {
          reject(transaction.error ?? new Error('Failed to clear archives'))
        }
        transaction.onabort = () => {
          reject(transaction.error ?? new Error('Archive clear aborted'))
        }

        store.clear()
      })
    } finally {
      database.close()
    }
  }
}

export const byondArchiveStorage = new ByondArchiveStorage()
