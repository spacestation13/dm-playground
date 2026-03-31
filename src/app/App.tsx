import { useState, useEffect, useRef } from 'react'
import { PanelTree } from './layout/PanelTree'
import { ConsolePanel } from './panels/ConsolePanel'
import { LayoutProvider } from './layout/LayoutProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { editorThemeOptions, type EditorThemeId } from './monaco/themes'
import {
  useLayoutModeSetting,
  useThemeSetting,
  useFontFamilySetting,
  useFontSizeSetting,
  useTabSizeSetting,
  useShowAdvancedEditorTabsSetting,
  useStreamCompilerSetting,
  useShowConsoleSetting,
} from './settings/localSettings'
import { useLayoutManager } from './layout/useLayoutManager'
import { embedParams, buildShareUrl } from './embed/embedParams'
import useProjectStore from './stores/projectStore'
import { LayoutMode, type LayoutRoot } from './layout/layoutTypes'
import { byondService } from '../services/ByondService'
import { clearRuntimeAssetCaches } from '../services/runtimeAssetCache'

function PlaygroundLayout({
  layout,
  handleUpdateBranchSizes,
  showConsolePanel = false,
}: {
  layout: LayoutRoot
  handleUpdateBranchSizes: (branchId: number, sizes: number[]) => void
  showConsolePanel?: boolean
}) {
  return (
    <div className="flex-1 min-h-0">
      <ErrorBoundary>
        <LayoutProvider updateBranchSizes={handleUpdateBranchSizes}>
          <PanelTree node={layout.root} />
        </LayoutProvider>
        {showConsolePanel && <ConsolePanel />}
      </ErrorBoundary>
    </div>
  )
}

function FullApp() {
  const { layout, handleUpdateBranchSizes } = useLayoutManager()
  const [showSettings, setShowSettings] = useState(false)
  const [themeId, setThemeId] = useThemeSetting()
  const [layoutMode, setLayoutMode] = useLayoutModeSetting()
  const [fontFamily, setFontFamily] = useFontFamilySetting()
  const [fontSize, setFontSize] = useFontSizeSetting()
  const [tabSize, setTabSize] = useTabSizeSetting()
  const [streamCompilerOutput, setStreamCompilerOutput] =
    useStreamCompilerSetting()
  const [showConsolePanel, setShowConsolePanel] = useShowConsoleSetting()
  const [showAdvancedEditorTabs, setShowAdvancedEditorTabs] =
    useShowAdvancedEditorTabsSetting()

  const project = useProjectStore((s) => s.project)
  const [shareLabel, setShareLabel] = useState('🔗 Share Code')
  const shareTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  )

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) {
        window.clearTimeout(shareTimeoutRef.current)
      }
    }
  }, [])

  const handleShareClick = async () => {
    try {
      const url = buildShareUrl(project)
      try {
        await navigator.clipboard.writeText(url)
        setShareLabel('Link copied!')
        if (shareTimeoutRef.current) {
          window.clearTimeout(shareTimeoutRef.current)
        }
        shareTimeoutRef.current = window.setTimeout(() => {
          setShareLabel('🔗 Share Code')
        }, 3000)
      } catch {
        window.prompt('Copy this link', url)
      }
    } catch (err) {
      console.warn('Failed to build share url', err)
    }
  }

  const handleDeleteSiteData = async () => {
    const confirmed = window.confirm(
      'Delete all site data? This will clear settings, layout, cached assets, and BYOND downloads.'
    )
    if (!confirmed) return

    try {
      await byondService.clearStorage()
    } catch (error) {
      console.warn('Failed to clear BYOND storage', error)
    }

    try {
      await clearRuntimeAssetCaches()
    } catch (error) {
      console.warn('Failed to clear runtime asset cache', error)
    }

    localStorage.removeItem('local-settings')
    localStorage.removeItem('layout')
    localStorage.removeItem('byondActiveVersion')
    window.location.reload()
  }

  if (!layout) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400"></div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">
            DM Playground
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Share"
            onClick={() => void handleShareClick()}
            className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-sm font-semibold text-slate-200 hover:border-slate-500"
          >
            {shareLabel}
          </button>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setShowSettings(true)}
            className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-sm font-semibold text-slate-200 hover:border-slate-500"
          >
            ⚙️
          </button>
        </div>
      </header>
      <PlaygroundLayout
        layout={layout}
        handleUpdateBranchSizes={handleUpdateBranchSizes}
        showConsolePanel={showConsolePanel}
      />
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-4 text-slate-200 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Settings</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Layout mode
                </span>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  value={layoutMode}
                  onChange={(event) =>
                    setLayoutMode(event.target.value as LayoutMode)
                  }
                >
                  <option value={LayoutMode.Automatic}>Automatic</option>
                  <option value={LayoutMode.Desktop}>Desktop</option>
                  <option value={LayoutMode.Mobile}>Mobile</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Editor theme
                </span>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  value={themeId}
                  onChange={(event) =>
                    setThemeId(event.target.value as EditorThemeId)
                  }
                >
                  {editorThemeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Font Family
                </span>
                <input
                  type="text"
                  value={fontFamily}
                  onChange={(event) => setFontFamily(event.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                />
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Font size
                  </span>
                  <input
                    type="number"
                    min={8}
                    max={40}
                    value={fontSize}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10)
                      if (Number.isNaN(parsed)) return
                      setFontSize(parsed)
                    }}
                    className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Tab size
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={tabSize}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10)
                      if (Number.isNaN(parsed)) return
                      setTabSize(parsed)
                    }}
                    className="w-13 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={streamCompilerOutput}
                  onChange={(e) => {
                    setStreamCompilerOutput(e.target.checked)
                  }}
                />
                <span className="text-xs">Stream DreamMaker output live</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showConsolePanel}
                  onChange={(e) => {
                    setShowConsolePanel(e.target.checked)
                  }}
                />
                <span className="text-xs">Show Console panel</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showAdvancedEditorTabs}
                  onChange={(e) => {
                    setShowAdvancedEditorTabs(e.target.checked)
                  }}
                />
                <span className="text-xs">Show advanced editor tabs</span>
              </label>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void handleDeleteSiteData()}
                  className="w-full rounded border border-red-700/70 bg-red-950/40 px-2 py-1 text-xs text-red-200 hover:border-red-500"
                >
                  Delete all site data
                </button>
              </div>
              <div>
                {(() => {
                  const version = __APP_VERSION__
                  const isSha = /^[0-9a-f]{7,40}$/.test(version)
                  const repoBase =
                    'https://github.com/spacestation13/dm-playground'
                  const href = isSha
                    ? `${repoBase}/commit/${version}`
                    : repoBase
                  return (
                    <>
                      Version{' '}
                      <a
                        className="text-sky-300 hover:text-sky-200"
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {version}
                      </a>
                    </>
                  )
                })()}
              </div>
              <div>
                <a
                  className="text-sky-300 hover:text-sky-200"
                  href="https://github.com/spacestation13/dm-playground"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/spacestation13/dm-playground
                </a>
                <br />
                Made by alexkar598 & ZeWaka
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmbedApp() {
  const { layout, handleUpdateBranchSizes } = useLayoutManager()

  if (!layout) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400"></div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PlaygroundLayout
        layout={layout}
        handleUpdateBranchSizes={handleUpdateBranchSizes}
      />
    </div>
  )
}

export function App() {
  const [, setThemeId] = useThemeSetting()

  useEffect(() => {
    if (embedParams.isEmbed && embedParams.theme) {
      setThemeId(embedParams.theme)
    }
  }, [setThemeId])

  return embedParams.isEmbed ? <EmbedApp /> : <FullApp />
}
