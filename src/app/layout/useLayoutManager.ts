import { useCallback, useEffect, useState } from 'react'
import { embedParams } from '../embed/embedParams'
import {
  PanelId,
  embedLayout,
  type LayoutBranch,
  type LayoutLeaf,
  type LayoutRoot,
} from './layoutTypes'
import { swapSplitDirections, updateBranchSizes } from './layoutUtils'
import { loadLayout, saveLayout } from './layoutStorage'
import { addPanel, removePanel } from './layoutTreeUtils'

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
  const [desktopLayout, setDesktopLayout] = useState<LayoutRoot | null>(() =>
    embedParams.isEmbed ? embedLayout : null
  )
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.innerHeight > window.innerWidth)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (embedParams.isEmbed) {
      return
    }

    let isMounted = true

    void loadLayout().then((loadedLayout) => {
      if (isMounted) {
        setDesktopLayout(loadedLayout)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

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
      setDesktopLayout((prev) => {
        if (!prev) {
          return prev
        }

        const next = {
          ...prev,
          root: updateBranchSizes(prev.root, branchId, sizes),
        }

        if (!embedParams.isEmbed) {
          void saveLayout(next)
        }
        return next
      })
    },
    []
  )

  const toggleConsolePanel = useCallback((show: boolean) => {
    setDesktopLayout((prev) => {
      if (!prev) return prev
      const newRoot = show
        ? addPanel(prev.root as LayoutBranch, PanelId.Console, 2, 30)
        : removePanel(prev.root as LayoutBranch, PanelId.Console)
      const nextLayout = { ...prev, root: newRoot }
      if (!embedParams.isEmbed) {
        void saveLayout(nextLayout)
      }
      return nextLayout
    })
  }, [])

  return {
    layout,
    handleUpdateBranchSizes,
    toggleConsolePanel,
  }
}
