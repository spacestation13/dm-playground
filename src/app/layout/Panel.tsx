import { useCallback, useState } from 'react'
import { PanelId } from './layoutTypes'
import { PanelRegistry } from '../panels/PanelRegistry'

interface PanelProps {
  id: PanelId
  showTitlebar?: boolean
  isMobile: boolean
}

export function Panel({ id, showTitlebar, isMobile }: PanelProps) {
  const panel = PanelRegistry[id]
  const [headerFunction, setHeaderFunction] = useState<
    (() => void) | undefined
  >(undefined)

  const registerHeaderAction = useCallback((action?: () => void) => {
    setHeaderFunction(() => action)
  }, [])

  const header = panel.header
    ? panel.header({ isMobile, headerFunction })
    : panel.title

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-md border border-slate-800 bg-slate-900">
      {showTitlebar !== false ? (
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 pl-2 pr-1 py-1 text-sm font-semibold text-slate-200">
          {header}
        </header>
      ) : null}
      <div className="flex-1 overflow-auto p-2">
        {panel.render({
          isMobile,
          registerHeaderAction,
        })}
      </div>
    </section>
  )
}
