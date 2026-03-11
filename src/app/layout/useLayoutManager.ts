import { useCallback, useEffect, useState } from 'react'
import { embedParams } from '../embed/embedParams'
import {
  PanelId,
  embedLayout,
  type LayoutBranch,
  type LayoutRoot,
} from './layoutTypes'
import { updateBranchSizes } from './layoutUtils'
import { loadLayout, saveLayout } from './layoutStorage'
import { addPanel, removePanel } from './layoutTreeUtils'

export function useLayoutManager() {
  const [layout, setLayout] = useState<LayoutRoot | null>(() =>
    embedParams.isEmbed ? embedLayout : null
  )

  useEffect(() => {
    if (embedParams.isEmbed) {
      return
    }

    let isMounted = true

    void loadLayout().then((loadedLayout) => {
      if (isMounted) {
        setLayout(loadedLayout)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const handleUpdateBranchSizes = useCallback(
    (branchId: number, sizes: number[]) => {
      setLayout((prev) => {
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
    setLayout((prev) => {
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
