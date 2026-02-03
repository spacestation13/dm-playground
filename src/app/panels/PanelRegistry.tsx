import type { ReactNode } from 'react'
import { PanelId } from '../layout/layoutTypes'
import { ByondPanel, ByondTitle } from './ByondPanel'
import { ConsolePanel } from './ConsolePanel'
import { ControllerPanel, ControllerTitle } from './ControllerPanel'
import { EditorPanel } from './EditorPanel'
import { OutputPanel } from './OutputPanel'

interface PanelDescriptor {
  title: ReactNode
  render: () => ReactNode
}

export const PanelRegistry: Record<PanelId, PanelDescriptor> = {
  [PanelId.Console]: {
    title: 'Console',
    render: () => <ConsolePanel />,
  },
  [PanelId.Controller]: {
    title: <ControllerTitle />,
    render: () => <ControllerPanel />,
  },
  [PanelId.Editor]: {
    title: 'Editor',
    render: () => <EditorPanel />,
  },
  [PanelId.Output]: {
    title: 'Output',
    render: () => <OutputPanel />,
  },
  [PanelId.Byond]: {
    title: <ByondTitle />,
    render: () => <ByondPanel />,
  },
}
