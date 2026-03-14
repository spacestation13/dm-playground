import type { ReactNode } from 'react'
import { PanelId } from '../layout/layoutTypes'
import { ByondPanel, ByondTitle } from './ByondPanel'
import { LazyEditorPanel } from './LazyEditorPanel'
import { OutputPanel } from './OutputPanel'

export interface PanelRenderProps {
  isMobile?: boolean
  registerHeaderAction?: (action?: () => void) => void
}

export interface PanelHeaderProps {
  isMobile: boolean
  headerFunction?: () => void
}

interface PanelDescriptor {
  title: ReactNode
  render: (props?: PanelRenderProps) => ReactNode
  header?: (props: PanelHeaderProps) => ReactNode
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
    render: ({ isMobile, registerHeaderAction } = {}) => (
      <OutputPanel
        isMobile={!!isMobile}
        registerHeaderAction={registerHeaderAction}
      />
    ),
    header: ({ isMobile, headerFunction }) => (
      <>
        Output
        {isMobile && headerFunction && (
          <button
            type="button"
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:border-slate-500 ml-2"
            onClick={headerFunction}
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
