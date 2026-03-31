import { useEffect, useState } from 'react'
import { emulatorService } from '../../services/EmulatorService'
import { byondService } from '../../services/ByondService'

type RuntimeAsset = 'bzimage' | 'rootfs' | 'v86wasm' | 'seabios' | 'vgabios'

type RuntimeAssetProgress = {
  loaded: number
  total: number | null
}

type RuntimeDownloadState = Partial<Record<RuntimeAsset, RuntimeAssetProgress>>

function getRuntimeDownloadValue(runtimeDownloads: RuntimeDownloadState) {
  const entries = Object.values(runtimeDownloads)
  if (entries.length === 0) {
    return null
  }

  const hasActive = entries.some(
    ({ loaded, total }) => total === null || loaded < total
  )
  if (!hasActive) {
    return null
  }

  const knownEntries = entries.filter(
    (entry): entry is { loaded: number; total: number } =>
      typeof entry.total === 'number' && entry.total > 0
  )
  if (knownEntries.length === 0) {
    return null
  }

  const loaded = knownEntries.reduce((sum, entry) => sum + entry.loaded, 0)
  const total = knownEntries.reduce((sum, entry) => sum + entry.total, 0)
  return total > 0 ? Math.min(loaded / total, 1) : null
}

export function useOutputPanelProgress() {
  const [downloadValue, setDownloadValue] = useState<number | null>(null)
  const [runtimeDownloads, setRuntimeDownloads] =
    useState<RuntimeDownloadState>(() =>
      Object.fromEntries(emulatorService.getAssetDownloadProgress())
    )

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ version: string; value: number }>)
        .detail
      const value = typeof detail?.value === 'number' ? detail.value : null
      setDownloadValue(value !== null && value < 1 ? value : null)
    }

    byondService.addProgressListener(handleProgress)
    return () => byondService.removeProgressListener(handleProgress)
  }, [])

  useEffect(() => {
    const handleRuntimeProgress = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          asset: RuntimeAsset
          loaded: number
          total: number | null
        }>
      ).detail

      setRuntimeDownloads((prev) => ({
        ...prev,
        [detail.asset]: {
          loaded: detail.loaded,
          total: detail.total,
        },
      }))
    }

    emulatorService.addEventListener(
      'assetDownloadProgress',
      handleRuntimeProgress
    )
    return () => {
      emulatorService.removeEventListener(
        'assetDownloadProgress',
        handleRuntimeProgress
      )
    }
  }, [])

  const runtimeDownloadValue = getRuntimeDownloadValue(runtimeDownloads)

  return {
    progressValue: downloadValue ?? runtimeDownloadValue,
  }
}
