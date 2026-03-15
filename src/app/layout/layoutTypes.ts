export const PanelId = {
  Console: 'Console',
  Editor: 'Editor',
  Output: 'Output',
  Byond: 'Byond',
} as const

export type PanelId = (typeof PanelId)[keyof typeof PanelId]

export enum LayoutMode {
  Automatic = 'automatic',
  Desktop = 'desktop',
  Mobile = 'mobile',
}

export type PersistedLayoutMode = Exclude<LayoutMode, LayoutMode.Automatic>

export const persistedLayoutModes = [
  LayoutMode.Desktop,
  LayoutMode.Mobile,
] as const satisfies readonly PersistedLayoutMode[]

export const layoutPanelIds = [
  PanelId.Editor,
  PanelId.Output,
  PanelId.Byond,
] as const satisfies readonly PanelId[]

export type SplitDirection = 'horizontal' | 'vertical'

export interface LayoutLeaf {
  type: 'leaf'
  id: PanelId
  size: number
  showTitlebar?: boolean
}

export interface LayoutBranch {
  type: 'branch'
  id: number
  split: SplitDirection
  size?: number
  children: Array<LayoutBranch | LayoutLeaf>
}

export interface LayoutRoot {
  version: number
  nextBranchId: number
  root: LayoutBranch
}

export function resolveLayoutMode(
  layoutMode: LayoutMode,
  isMobileDevice: boolean
): PersistedLayoutMode {
  if (layoutMode === LayoutMode.Automatic) {
    return isMobileDevice ? LayoutMode.Mobile : LayoutMode.Desktop
  }

  return layoutMode
}

export const defaultDesktopLayout: LayoutRoot = {
  version: 3,
  nextBranchId: 2,
  root: {
    type: 'branch',
    id: 0,
    split: 'horizontal',
    children: [
      {
        type: 'leaf',
        id: PanelId.Editor,
        size: 65,
        showTitlebar: false,
      },
      {
        type: 'branch',
        id: 1,
        split: 'vertical',
        size: 35,
        children: [
          {
            type: 'leaf',
            id: PanelId.Byond,
            size: 30,
          },
          {
            type: 'leaf',
            id: PanelId.Output,
            size: 70,
          },
        ],
      },
    ],
  },
}

export const defaultMobileLayout: LayoutRoot = {
  version: 3,
  nextBranchId: 1,
  root: {
    type: 'branch',
    id: 0,
    split: 'vertical',
    children: [
      {
        type: 'leaf',
        id: PanelId.Editor,
        size: 60,
        showTitlebar: false,
      },
      {
        type: 'leaf',
        id: PanelId.Output,
        size: 40,
      },
    ],
  },
}

export const defaultLayouts: Record<PersistedLayoutMode, LayoutRoot> = {
  [LayoutMode.Desktop]: defaultDesktopLayout,
  [LayoutMode.Mobile]: defaultMobileLayout,
}

export const embedLayout: LayoutRoot = {
  version: 3,
  nextBranchId: 1,
  root: {
    type: 'branch',
    id: 0,
    split: 'horizontal',
    children: [
      {
        type: 'leaf',
        id: PanelId.Editor,
        size: 60,
        showTitlebar: false,
      },
      {
        type: 'leaf',
        id: PanelId.Output,
        size: 40,
      },
    ],
  },
}
