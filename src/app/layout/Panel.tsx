import { useCallback, useState } from 'react'
import { LayoutMode, PanelId } from './layoutTypes'
import { PanelRegistry, type PanelHeaderState } from '../panels/PanelRegistry'
import { useResolvedLayoutMode } from './useResolvedLayoutMode'

interface PanelProps {
  id: PanelId
  showTitlebar?: boolean
}

export function Panel({ id, showTitlebar }: PanelProps) {
  const panel = PanelRegistry[id]
  const [headerState, setHeaderState] = useState<PanelHeaderState>({})
  const isMobile = useResolvedLayoutMode() === LayoutMode.Mobile

  const registerHeaderState = useCallback((state: PanelHeaderState) => {
    setHeaderState(state)
  }, [])

  const header = panel.header
    ? panel.header({ isMobile, ...headerState })
    : panel.title

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-md border border-slate-800 bg-[var(--editor-tab-bar-bg)]">
      {showTitlebar !== false ? (
        <header className="flex items-center justify-between border-b border-slate-800 pl-2 pr-1 py-1 text-sm font-semibold text-[var(--editor-text)] bg-[var(--editor-tab-active-bg)]">
          {header}
        </header>
      ) : null}
      <div className="flex-1 overflow-auto p-2">
        {panel.render({ registerHeaderState, isMobile })}
      </div>
    </section>
  )
}
