import { useEffect, useMemo, useState } from 'react'
import { ByondEvent, ByondStatus } from '../../services/ByondService'
import { byondService } from '../../services/ByondService'

type StatusMap = Record<string, ByondStatus>

export function ByondTitle() {
  const refresh = async () => {
    window.dispatchEvent(new CustomEvent('byond:refresh'))
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      <span>BYOND</span>
      <button
        type="button"
        onClick={() => void refresh()}
        className="ml-auto rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
        title="Refresh versions"
      >
        Refresh
      </button>
    </div>
  )
}

export function ByondPanel() {
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [local, setLocal] = useState<string[]>([])
  const [activeVersion, setActiveVersion] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusMap>({})
  const [error, setError] = useState<string | null>(null)
  const [customMajor, setCustomMajor] = useState('')
  const [customMinor, setCustomMinor] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const displayVersions = useMemo(() => {
    const list = [...local]
    if (latestVersion && !list.includes(latestVersion)) {
      list.push(latestVersion)
    }
    return list
  }, [local, latestVersion])

  const refresh = async () => {
    try {
      const [latestVersion, localVersions] = await Promise.all([
        byondService.getLatestVersion(),
        byondService.getLocalVersions(),
      ])
      setLatestVersion(latestVersion)
      // custom inputs default to latest remote version
      if (latestVersion) {
        const parts = latestVersion.split('.')
        setCustomMajor((prev) => (prev ? prev : (parts[0] ?? '')))
        setCustomMinor((prev) => (prev ? prev : (parts[1] ?? '')))
      }
      setLocal(localVersions)
      const active = byondService.getActiveVersion()
      setActiveVersion(active)
      setStatus((prev) => {
        const next: StatusMap = { ...prev }
        localVersions.forEach((version) => {
          next[version] = byondService.getStatus(version)
        })
        return next
      })

      if (!active && localVersions.length > 0) {
        const latest = localVersions[0]
        setStatus((prev) => ({ ...prev, [latest]: ByondStatus.Loading }))
        void byondService
          .load(latest, true)
          .then(() => {
            setActiveVersion(latest)
            setStatus((prev) => ({ ...prev, [latest]: ByondStatus.Installed }))
          })
          .catch((loadError) => {
            setStatus((prev) => ({ ...prev, [latest]: ByondStatus.Error }))
            setError(
              loadError instanceof Error ? loadError.message : 'Load failed'
            )
          })
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load versions'
      )
    }
  }

  useEffect(() => {
    const id = setTimeout(() => {
      void refresh()
    }, 0)
    const handleRefresh = () => {
      void refresh()
    }
    window.addEventListener('byond:refresh', handleRefresh)
    return () => {
      clearTimeout(id)
      window.removeEventListener('byond:refresh', handleRefresh)
    }
  }, [])

  useEffect(() => {
    const handleActive = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail
      setActiveVersion(detail)
    }
    byondService.addEventListener(ByondEvent.Active, handleActive)
    return () =>
      byondService.removeEventListener(ByondEvent.Active, handleActive)
  }, [])

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (
        event as CustomEvent<{ version: string; status: ByondStatus }>
      ).detail
      setStatus((prev) => ({ ...prev, [detail.version]: detail.status }))
    }
    byondService.addStatusListener(handleStatus)
    return () => byondService.removeStatusListener(handleStatus)
  }, [])

  useEffect(() => {
    const handleLoading = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      setIsLoading(detail)
    }
    byondService.addEventListener(ByondEvent.Loading, handleLoading)
    return () =>
      byondService.removeEventListener(ByondEvent.Loading, handleLoading)
  }, [])

  const handleDownload = async (version: string) => {
    setStatus((prev) => ({ ...prev, [version]: ByondStatus.Fetching }))
    setError(null)
    try {
      await byondService.downloadVersion(version, (value) => {
        if (value >= 1) {
          setStatus((prev) => ({ ...prev, [version]: ByondStatus.Fetched }))
        }
      })
      // Ensure local state reflects the newly downloaded version immediately
      setLocal((prev) => (prev.includes(version) ? prev : [version, ...prev]))
      setStatus((prev) => ({ ...prev, [version]: ByondStatus.Fetched }))
    } catch (downloadError) {
      setStatus((prev) => ({ ...prev, [version]: ByondStatus.Error }))
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : 'Download failed'
      )
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
      setError(
        deleteError instanceof Error ? deleteError.message : 'Delete failed'
      )
    }
  }

  const handleSetActive = (version: string) => {
    setIsLoading(true)
    setStatus((prev) => ({ ...prev, [version]: ByondStatus.Loading }))
    void byondService
      .load(version, true)
      .then(() => {
        setActiveVersion(version)
        setStatus((prev) => ({ ...prev, [version]: ByondStatus.Installed }))
      })
      .catch((loadError) => {
        setStatus((prev) => ({ ...prev, [version]: ByondStatus.Error }))
        setError(loadError instanceof Error ? loadError.message : 'Load failed')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-300">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">BYOND Version:</label>
        <input
          type="number"
          min={0}
          value={customMajor}
          onChange={(e) => setCustomMajor(e.target.value)}
          className="w-20 rounded border border-slate-700 bg-transparent px-2 py-1 text-xs text-slate-200"
          placeholder="major"
        />
        <input
          type="number"
          min={0}
          value={customMinor}
          onChange={(e) => setCustomMinor(e.target.value)}
          className="w-24 rounded border border-slate-700 bg-transparent px-2 py-1 text-xs text-slate-200"
          placeholder="minor"
        />
        <button
          type="button"
          onClick={() => {
            const version = `${customMajor}.${customMinor}`
            if (!customMajor || !customMinor) return
            if (local.includes(version)) return
            void handleDownload(version)
          }}
          disabled={
            !customMajor ||
            !customMinor ||
            local.includes(`${customMajor}.${customMinor}`)
          }
          title={
            local.includes(`${customMajor}.${customMinor}`)
              ? 'Version already installed'
              : undefined
          }
          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
        >
          Fetch
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
            {displayVersions.map((version) => {
              const isLocal = local.includes(version)
              const isActive = activeVersion === version
              const isLatest = version === latestVersion
              const versionStatus =
                status[version] ??
                (isLocal ? ByondStatus.Installed : ByondStatus.Idle)

              return (
                <tr key={version} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-mono text-slate-200">
                    {version}
                    {isActive && (
                      <span className="ml-2 rounded bg-emerald-900/40 px-2 py-0.5 text-[10px]">
                        active
                      </span>
                    )}
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
                          disabled={isLoading || isActive}
                          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            isActive
                              ? 'Already active'
                              : isLoading
                                ? 'Another version is loading'
                                : 'Set as active version'
                          }
                        >
                          Set active
                        </button>
                      )}
                      {isLocal && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(version)}
                          disabled={isLatest || isActive}
                          title={
                            isLatest || isActive
                              ? 'Cannot delete the latest or active version'
                              : undefined
                          }
                          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500 disabled:opacity-50"
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
