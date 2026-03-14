import type { ReactNode } from 'react'
import { PanelId } from '../layout/layoutTypes'
import { ByondPanel, ByondTitle } from './ByondPanel'
import { LazyEditorPanel } from './LazyEditorPanel'
import { OutputPanel } from './OutputPanel'

interface PanelDescriptor {
  title: ReactNode
  render: (props?: { isMobile?: boolean }) => ReactNode
  header?: (props: {
    isMobile: boolean
    customFunction?: () => void
  }) => ReactNode
}

export const PanelRegistry: Record<PanelId, PanelDescriptor> = {
  [PanelId.Console]: {
    title: 'Console',
    render: () => null,
  },
  [PanelId.Editor]: {
    title: 'Editor',
    render: () => <LazyEditorPanel />,
  },
  [PanelId.Output]: {
    title: 'Output',
    render: () => <OutputPanel />,
    header: ({ isMobile, customFunction: openByondModal }) => (
      <>
        Output
        {isMobile && openByondModal && (
          <button
            type="button"
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:border-slate-500 ml-2"
            onClick={openByondModal}
          >
            BYOND Version
          </button>
        )}
      </>
    ),
  },
  [PanelId.Byond]: {
    title: <ByondTitle />,
    render: ({ isMobile } = {}) => (isMobile ? null : <ByondPanel />),
  },
}
