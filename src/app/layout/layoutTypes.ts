export const PanelId = {
  Console: 'Console',
  Editor: 'Editor',
  Output: 'Output',
  Byond: 'Byond',
} as const

export type PanelId = (typeof PanelId)[keyof typeof PanelId]

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

export const defaultLayout: LayoutRoot = {
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
        size: 70,
        showTitlebar: false,
      },
      {
        type: 'branch',
        id: 1,
        split: 'vertical',
        size: 30,
        children: [
          {
            type: 'leaf',
            id: PanelId.Byond,
            size: 40,
          },
          {
            type: 'leaf',
            id: PanelId.Output,
            size: 60,
          },
        ],
      },
    ],
  },
}
