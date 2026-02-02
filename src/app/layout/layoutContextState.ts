import { createContext } from 'react'

export interface LayoutContextValue {
  updateBranchSizes: (branchId: number, sizes: number[]) => void
}

export const LayoutContext = createContext<LayoutContextValue | null>(null)
