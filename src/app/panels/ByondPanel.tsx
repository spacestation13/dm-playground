import { useEffect, useMemo, useState } from 'react'
import type { ByondStatus } from '../../services/ByondService'
import { byondService } from '../../services/byondSingleton'

type StatusMap = Record<string, ByondStatus>

export function ByondPanel() {
  const [available, setAvailable] = useState<string[]>([])
  const [local, setLocal] = useState<string[]>([])
  const [activeVersion, setActiveVersion] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusMap>({})
  const [error, setError] = useState<string | null>(null)

  const topVersions = useMemo(() => available.slice(0, 20), [available])

  const refresh = async () => {
    try {
      const [remoteVersions, localVersions] = await Promise.all([
        byondService.getAvailableVersions(),
        byondService.getLocalVersions(),
      ])
      setAvailable(remoteVersions)
      setLocal(localVersions)
      setActiveVersion(byondService.getActiveVersion())
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load versions')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleDownload = async (version: string) => {
    setStatus((prev) => ({ ...prev, [version]: 'fetching' }))
    setError(null)
    try {
      await byondService.downloadVersion(version, (value) => {
        if (value >= 1) {
          setStatus((prev) => ({ ...prev, [version]: 'fetched' }))
        }
      })
      const localVersions = await byondService.getLocalVersions()
      setLocal(localVersions)
    } catch (downloadError) {
      setStatus((prev) => ({ ...prev, [version]: 'error' }))
      setError(downloadError instanceof Error ? downloadError.message : 'Download failed')
    }
  }

  const handleDelete = async (version: string) => {
    try {
      await byondService.deleteVersion(version)
      const localVersions = await byondService.getLocalVersions()
      setLocal(localVersions)
      if (activeVersion === version) {
        setActiveVersion(null)
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed')
    }
  }

  const handleSetActive = (version: string) => {
    setStatus((prev) => ({ ...prev, [version]: 'loading' }))
    void byondService
      .load(version, true)
      .then(() => {
        setActiveVersion(version)
        setStatus((prev) => ({ ...prev, [version]: 'loaded' }))
      })
      .catch((loadError) => {
        setStatus((prev) => ({ ...prev, [version]: 'error' }))
        setError(loadError instanceof Error ? loadError.message : 'Load failed')
      })
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">BYOND versions</span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex-1 min-h-0 overflow-auto rounded border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-950/90 text-slate-400">
            <tr>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {topVersions.map((version) => {
              const isLocal = local.includes(version)
              const isActive = activeVersion === version
              const versionStatus = status[version] ?? byondService.getStatus(version)

              return (
                <tr key={version} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-mono text-slate-200">
                    {version}
                    {isActive && <span className="ml-2 rounded bg-emerald-900/40 px-2 py-0.5 text-[10px]">active</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{versionStatus}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {!isLocal && (
                        <button
                          type="button"
                          onClick={() => void handleDownload(version)}
                          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                        >
                          Download
                        </button>
                      )}
                      {isLocal && (
                        <button
                          type="button"
                          onClick={() => handleSetActive(version)}
                          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                        >
                          Set active
                        </button>
                      )}
                      {isLocal && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(version)}
                          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
