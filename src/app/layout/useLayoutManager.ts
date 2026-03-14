import { useCallback, useEffect } from 'react'
import {
  PanelId,
  type LayoutBranch,
  type LayoutLeaf,
  type LayoutRoot,
} from './layoutTypes'
import { swapSplitDirections } from './layoutUtils'
import { useIsMobile } from '../hooks/useIsMobile'
import useLayoutStore from '../stores/layoutStore'

function filterByondPanel(
  node: LayoutBranch | LayoutLeaf
): LayoutBranch | LayoutLeaf | null {
  if (node.type === 'leaf') {
    if (node.id === PanelId.Byond) return null
    return node
  }
  return {
    ...node,
    children: node.children.map(filterByondPanel).filter(Boolean) as Array<
      LayoutBranch | LayoutLeaf
    >,
  }
}

export function useLayoutManager() {
  const desktopLayout = useLayoutStore((s) => s.desktopLayout)
  const loadInitialLayout = useLayoutStore((s) => s.loadInitialLayout)
  const updateBranchSizes = useLayoutStore((s) => s.updateBranchSizes)
  const toggleConsolePanel = useLayoutStore((s) => s.toggleConsolePanel)
  const isMobile = useIsMobile()

  useEffect(() => {
    void loadInitialLayout()
  }, [loadInitialLayout])

  let layout: LayoutRoot | null = null
  if (desktopLayout) {
    const swapped = isMobile
      ? swapSplitDirections(desktopLayout.root)
      : desktopLayout.root
    const filtered = isMobile && swapped ? filterByondPanel(swapped) : swapped
    layout = {
      ...desktopLayout,
      root: filtered as LayoutBranch,
    }
  }

  const handleUpdateBranchSizes = useCallback(
    (branchId: number, sizes: number[]) => {
      void updateBranchSizes(branchId, sizes)
    },
    [updateBranchSizes]
  )

  const handleToggleConsolePanel = useCallback(
    (show: boolean) => void toggleConsolePanel(show),
    [toggleConsolePanel]
  )

  return {
    layout,
    handleUpdateBranchSizes,
    toggleConsolePanel: handleToggleConsolePanel,
  }
}
