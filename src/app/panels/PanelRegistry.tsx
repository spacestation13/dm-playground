import type { ReactNode } from 'react'
import { PanelId } from '../layout/layoutTypes'
import { ByondPanel } from './ByondPanel'
import { ConsolePanel } from './ConsolePanel'
import { ControllerPanel } from './ControllerPanel'
import { EditorPanel } from './EditorPanel'
import { OutputPanel } from './OutputPanel'
import { ScreenPanel } from './ScreenPanel'

interface PanelDescriptor {
  title: string
  render: () => ReactNode
}

export const PanelRegistry: Record<PanelId, PanelDescriptor> = {
  [PanelId.Console]: {
    title: 'Console',
    render: () => <ConsolePanel />,
  },
  [PanelId.Screen]: {
    title: 'Screen',
    render: () => <ScreenPanel />,
  },
  [PanelId.Controller]: {
    title: 'Controller',
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
    title: 'BYOND',
    render: () => <ByondPanel />,
  },
}
