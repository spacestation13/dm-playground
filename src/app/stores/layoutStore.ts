import { create } from 'zustand'
import { embedParams } from '../embed/embedParams'
import {
  type LayoutBranch,
  type LayoutRoot,
  embedLayout,
  PanelId,
} from '../layout/layoutTypes'
import {
  loadLayout,
  saveLayout,
  updateAndSaveLayout,
} from '../layout/layoutStorage'
import { addPanel, removePanel } from '../layout/layoutTreeUtils'

type LayoutStore = {
  desktopLayout: LayoutRoot | null
  setDesktopLayout: (layout: LayoutRoot | null) => void
  loadInitialLayout: () => Promise<void>
  updateBranchSizes: (branchId: number, sizes: number[]) => Promise<void>
  toggleConsolePanel: (show: boolean) => Promise<void>
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  desktopLayout: embedParams.isEmbed ? embedLayout : null,
  setDesktopLayout: (layout) => set({ desktopLayout: layout }),
  loadInitialLayout: async () => {
    if (embedParams.isEmbed) return
    try {
      const loaded = await loadLayout()
      set({ desktopLayout: loaded })
    } catch (error) {
      console.warn('Failed to load layout', error)
    }
  },
  updateBranchSizes: async (branchId, sizes) => {
    const layout = get().desktopLayout
    if (!layout) return
    try {
      const next = await updateAndSaveLayout(layout, branchId, sizes)
      set({ desktopLayout: next })
    } catch (error) {
      console.warn('Failed to update layout', error)
    }
  },
  toggleConsolePanel: async (show) => {
    const layout = get().desktopLayout
    if (!layout) return
    try {
      const root = layout.root
      const newRoot = show
        ? addPanel(root as LayoutBranch, PanelId.Console, 2, 30)
        : removePanel(root as LayoutBranch, PanelId.Console)
      const nextLayout = { ...layout, root: newRoot }
      await saveLayout(nextLayout)
      set({ desktopLayout: nextLayout })
    } catch (error) {
      console.warn('Failed to toggle console panel', error)
    }
  },
}))

export default useLayoutStore
