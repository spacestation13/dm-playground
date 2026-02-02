import { useCallback, useEffect, useState } from 'react'
import { PanelTree } from './layout/PanelTree'
import { defaultLayout, type LayoutRoot } from './layout/layoutTypes'
import { CompressionService } from '../services/CompressionService'

const LAYOUT_STORAGE_KEY = 'layout'
const MIN_LAYOUT_VERSION = 1

export function App() {
  const [layout, setLayout] = useState<LayoutRoot | null>(null)

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

        if (isMounted) {
          setLayout(parsed)
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
      </header>
      <div className="flex-1 min-h-0">
        <PanelTree node={layout.root} />
      </div>
    </div>
  )
}
