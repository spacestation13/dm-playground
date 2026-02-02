import type { ReactNode } from 'react'
import { LayoutContext, type LayoutContextValue } from './layoutContextState'

export function LayoutProvider({
  children,
  updateBranchSizes,
}: {
  children: ReactNode
  updateBranchSizes: LayoutContextValue['updateBranchSizes']
}) {
  return <LayoutContext.Provider value={{ updateBranchSizes }}>{children}</LayoutContext.Provider>
}
