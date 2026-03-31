import {
  cacheRuntimeAsset,
  getCachedRuntimeAsset,
} from '../services/runtimeAssetCache'

export type RuntimeAsset =
  | 'bzimage'
  | 'rootfs'
  | 'v86wasm'
  | 'seabios'
  | 'vgabios'

export type AssetDownloadProgressMessage = {
  type: 'assetDownloadProgress'
  asset: RuntimeAsset
  loaded: number
  total: number | null
}

const UNKNOWN_PROGRESS_STEP_BYTES = 256 * 1024
const KNOWN_PROGRESS_STEPS = 40

function createProgressReporter(
  asset: RuntimeAsset,
  total: number | null,
  postProgress: (message: AssetDownloadProgressMessage) => void
) {
  let lastReportedLoaded = -1
  let nextUnknownThreshold = UNKNOWN_PROGRESS_STEP_BYTES
  let nextKnownThreshold =
    total && total > 0
      ? Math.max(Math.floor(total / KNOWN_PROGRESS_STEPS), 1)
      : 0

  return (loaded: number, force = false) => {
    if (loaded === lastReportedLoaded) {
      return
    }

    if (!force) {
      if (total && total > 0) {
        if (loaded < nextKnownThreshold) {
          return
        }

        const knownStep = Math.max(Math.floor(total / KNOWN_PROGRESS_STEPS), 1)
        while (loaded >= nextKnownThreshold) {
          nextKnownThreshold += knownStep
        }
      } else if (loaded < nextUnknownThreshold) {
        return
      } else {
        while (loaded >= nextUnknownThreshold) {
          nextUnknownThreshold += UNKNOWN_PROGRESS_STEP_BYTES
        }
      }
    }

    lastReportedLoaded = loaded
    postProgress({
      type: 'assetDownloadProgress',
      asset,
      loaded,
      total,
    })
  }
}

const readResponseChunks = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  chunks: Uint8Array[],
  onProgress: (loaded: number) => void,
  loaded = 0
): Promise<number> => {
  const { done, value } = await reader.read()
  if (done) {
    return loaded
  }

  if (!value || value.byteLength === 0) {
    return readResponseChunks(reader, chunks, onProgress, loaded)
  }

  chunks.push(value)
  const nextLoaded = loaded + value.byteLength
  onProgress(nextLoaded)
  return readResponseChunks(reader, chunks, onProgress, nextLoaded)
}

export async function fetchBinary(
  urlValue: string,
  asset: RuntimeAsset,
  postProgress: (message: AssetDownloadProgressMessage) => void
) {
  const cachedResponse = await getCachedRuntimeAsset(urlValue)
  if (cachedResponse) {
    const buffer = await cachedResponse.arrayBuffer()
    postProgress({
      type: 'assetDownloadProgress',
      asset,
      loaded: buffer.byteLength,
      total: buffer.byteLength,
    })
    return buffer
  }

  const response = await fetch(urlValue)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${urlValue}: ${response.status}`)
  }

  const cacheWritePromise = cacheRuntimeAsset(urlValue, response.clone())

  const totalHeader = response.headers.get('content-length')
  const total = totalHeader ? Number.parseInt(totalHeader, 10) : Number.NaN
  const contentLength = Number.isFinite(total) && total > 0 ? total : null
  const reportProgress = createProgressReporter(
    asset,
    contentLength,
    postProgress
  )

  if (!response.body) {
    const buffer = await response.arrayBuffer()
    reportProgress(buffer.byteLength, true)
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  const loaded = await readResponseChunks(reader, chunks, (nextLoaded) => {
    reportProgress(nextLoaded)
  })

  const buffer = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.byteLength
  }

  reportProgress(loaded, true)
  await cacheWritePromise
  return buffer.buffer
}
