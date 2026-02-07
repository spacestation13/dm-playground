import type { ReactNode } from 'react'
import { PanelId } from './layoutTypes'
import { PanelRegistry } from '../panels/PanelRegistry'

interface PanelProps {
  id: PanelId
  showTitlebar?: boolean
}

export function Panel({ id, showTitlebar }: PanelProps) {
  const panel = PanelRegistry[id]
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-md border border-slate-800 bg-slate-900">
      {showTitlebar !== false ? (
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-200">
          {panel.title}
        </header>
      ) : null}
      <div className="flex-1 min-h-0 overflow-auto p-3 text-sm text-slate-300">
        <PanelContent>{panel.render()}</PanelContent>
      </div>
    </section>
  )
}

function PanelContent({ children }: { children: ReactNode }) {
  return <div className="h-full">{children}</div>
}
