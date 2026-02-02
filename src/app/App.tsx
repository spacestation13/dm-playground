import { useCallback, useEffect, useState } from 'react'
import packageJson from '../../package.json'
import { PanelTree } from './layout/PanelTree'
import { LayoutProvider } from './layout/LayoutProvider'
import { PanelId, defaultLayout, type LayoutBranch, type LayoutLeaf, type LayoutRoot } from './layout/layoutTypes'
import { updateBranchSizes } from './layout/layoutUtils'
import { CompressionService } from '../services/CompressionService'
import { emulatorService } from '../services/EmulatorService'
import { ErrorBoundary } from './components/ErrorBoundary'
import { byondService } from '../services/ByondService'
import { ThemeProvider } from './theme/ThemeContext'
import { editorThemeOptions, type EditorThemeId } from './monaco/themes'

const LAYOUT_STORAGE_KEY = 'layout'
const MIN_LAYOUT_VERSION = 1
const APP_VERSION = packageJson.version
const VALID_PANELS = new Set(Object.values(PanelId))
const THEME_STORAGE_KEY = 'editor-theme'
export const STREAM_OUTPUT_KEY = 'stream-compiler-output'

const sanitizeNode = (node: LayoutBranch | LayoutLeaf): LayoutBranch | LayoutLeaf | null => {
  if (node.type === 'leaf') {
    return VALID_PANELS.has(node.id) ? node : null
  }

  const children = node.children
    .map((child) => sanitizeNode(child))
    .filter((child): child is LayoutBranch | LayoutLeaf => child !== null)

  if (children.length === 0) {
    return null
  }

  if (children.length === 1) {
    return children[0]
  }

  return {
    ...node,
    children,
  }
}

export function App() {
  const [layout, setLayout] = useState<LayoutRoot | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [themeId, setThemeId] = useState<EditorThemeId>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return (stored as EditorThemeId) || 'vs-dark'
  })
  const [streamCompilerOutput, setStreamCompilerOutput] = useState<boolean>(() => {
    return localStorage.getItem(STREAM_OUTPUT_KEY) === '1'
  })

  const saveLayout = useCallback(async (next: LayoutRoot) => {
    setLayout(next)
    const compressed = await CompressionService.encode(next)
    localStorage.setItem(LAYOUT_STORAGE_KEY, compressed)
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadLayout = async () => {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
      if (!stored) {
        await saveLayout(defaultLayout)
        return
      }

      try {
        const parsed = await CompressionService.decode<LayoutRoot>(stored)
        if (!parsed || parsed.version < MIN_LAYOUT_VERSION) {
          await saveLayout(defaultLayout)
          return
        }

        const sanitizedRoot = sanitizeNode(parsed.root)
        const nextLayout =
          sanitizedRoot && sanitizedRoot.type === 'branch'
            ? { ...parsed, root: sanitizedRoot }
            : defaultLayout

        if (isMounted) {
          setLayout(nextLayout)
        }

        if (sanitizedRoot && sanitizedRoot.type === 'branch') {
          const compressed = await CompressionService.encode(nextLayout)
          localStorage.setItem(LAYOUT_STORAGE_KEY, compressed)
        }
      } catch (error) {
        console.warn('Failed to load layout, resetting to default.', error)
        await saveLayout(defaultLayout)
      }
    }

    void loadLayout()

    return () => {
      isMounted = false
    }
  }, [saveLayout])

  useEffect(() => {
    emulatorService.start('https://spacestation13.github.io/dm-playground-linux/')
    void byondService.initialize()
  }, [])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
  }, [themeId])

  const handleUpdateBranchSizes = useCallback((branchId: number, sizes: number[]) => {
    setLayout((prev) => {
      if (!prev) {
        return prev
      }

      const next = {
        ...prev,
        root: updateBranchSizes(prev.root, branchId, sizes),
      }

      void (async () => {
        const compressed = await CompressionService.encode(next)
        localStorage.setItem(LAYOUT_STORAGE_KEY, compressed)
      })()

      return next
    })
  }, [])

  if (!layout) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Loading layout...
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">DM Playground</h1>
        </div>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => setShowSettings(true)}
          className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          ⚙️
        </button>
      </header>
      <div className="flex-1 min-h-0">
        <ThemeProvider value={{ themeId, setThemeId }}>
          <LayoutProvider updateBranchSizes={handleUpdateBranchSizes}>
            <ErrorBoundary>
              <PanelTree node={layout.root} />
            </ErrorBoundary>
          </LayoutProvider>
        </ThemeProvider>
      </div>
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
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
                <span className="text-xs uppercase tracking-wide text-slate-400">Editor theme</span>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  value={themeId}
                  onChange={(event) => setThemeId(event.target.value as EditorThemeId)}
                >
                  {editorThemeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={streamCompilerOutput}
                  onChange={(e) => {
                    setStreamCompilerOutput(e.target.checked)
                    localStorage.setItem(STREAM_OUTPUT_KEY, e.target.checked ? '1' : '0')
                  }}
                />
                <span className="text-xs">Stream DreamMaker output live</span>
              </label>
              <div>Version {APP_VERSION}</div>
              <div>
                <a
                  className="text-sky-300 hover:text-sky-200"
                  href="https://github.com/spacestation13/dm-playground"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/spacestation13/dm-playground
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
