export const PanelId = {
  Console: 'Console',
  Controller: 'Controller',
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
  version: 1,
  nextBranchId: 4,
  root: {
    type: 'branch',
    id: 0,
    split: 'vertical',
    children: [
      {
        type: 'branch',
        id: 1,
        split: 'horizontal',
        size: 70,
        children: [
          { type: 'leaf', id: PanelId.Editor, size: 70 },
          {
            type: 'branch',
            id: 2,
            split: 'vertical',
            size: 30,
            children: [
              { type: 'leaf', id: PanelId.Output, size: 70 },
              { type: 'leaf', id: PanelId.Byond, size: 30 },
            ],
          },
        ],
      },
      {
        type: 'branch',
        id: 3,
        split: 'horizontal',
        size: 30,
        children: [
          { type: 'leaf', id: PanelId.Console, size: 50 },
          { type: 'leaf', id: PanelId.Controller, size: 50 },
        ],
      },
    ],
  },
}
