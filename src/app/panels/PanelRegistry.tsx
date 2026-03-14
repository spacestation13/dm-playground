import type { ReactNode } from 'react'
import { PanelId } from '../layout/layoutTypes'
import { ByondPanel, ByondTitle } from './ByondPanel'
import { LazyEditorPanel } from './LazyEditorPanel'
import { OutputPanel, OutputPanelHeader } from './OutputPanel'

export interface PanelHeaderState {
  headerFunction?: () => void
  isLoading?: boolean
}

export interface PanelRenderProps {
  isMobile?: boolean
  registerHeaderState?: (state: PanelHeaderState) => void
}

export interface PanelHeaderProps extends PanelHeaderState {
  isMobile: boolean
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
    render: ({ isMobile, registerHeaderState } = {}) => (
      <OutputPanel
        isMobile={!!isMobile}
        registerHeaderState={registerHeaderState}
      />
    ),
    header: (props) => <OutputPanelHeader {...props} />,
  },
  [PanelId.Byond]: {
    title: <ByondTitle />,
    render: ({ isMobile } = {}) => (isMobile ? null : <ByondPanel />),
  },
}
