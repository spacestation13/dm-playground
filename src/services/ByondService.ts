const VERSIONS_URL = 'https://byond-builds.dm-lang.org/version.txt'
const DOWNLOAD_BASE_URL = 'https://byond-builds.dm-lang.org'
const ACTIVE_VERSION_KEY = 'byondActiveVersion'

export type ByondStatus = 'idle' | 'fetching' | 'fetched' | 'error'

export class ByondService {
  static async getAvailableVersions() {
    const response = await fetch(VERSIONS_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch BYOND versions: ${response.status}`)
    }

    const text = await response.text()
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+\.\d+$/.test(line))
  }

  static async getLocalVersions() {
    const directory = await this.getByondDirectory()
    const versions: string[] = []

    const iterable = directory as FileSystemDirectoryHandle & {
      entries: () => AsyncIterable<[string, FileSystemHandle]>
    }

    for await (const [, entry] of iterable.entries()) {
      if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
        versions.push(entry.name.replace(/\.zip$/, ''))
      }
    }

    return versions.sort().reverse()
  }

  static async downloadVersion(version: string, onProgress?: (value: number) => void) {
    const major = version.split('.')[0]
    const url = `${DOWNLOAD_BASE_URL}/${major}/${version}_byond_linux.zip`
    const response = await fetch(url)

    if (!response.ok) {
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
  }

  static async deleteVersion(version: string) {
    const directory = await this.getByondDirectory()
    await directory.removeEntry(`${version}.zip`, { recursive: false })
  }

  static getActiveVersion() {
    return localStorage.getItem(ACTIVE_VERSION_KEY)
  }

  static setActiveVersion(version: string) {
    localStorage.setItem(ACTIVE_VERSION_KEY, version)
  }

  private static async getByondDirectory() {
    const root = await navigator.storage.getDirectory()
    return root.getDirectoryHandle('byond', { create: true })
  }
}
