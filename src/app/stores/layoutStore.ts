import { create } from 'zustand'
import { embedParams } from '../embed/embedParams'
import {
  LayoutMode,
  type LayoutRoot,
  embedLayout,
  type PersistedLayoutMode,
} from '../layout/layoutTypes'
import {
  loadLayouts,
  saveLayouts,
  type StoredLayouts,
} from '../layout/layoutStorage'
import { updateBranchSizes as updateLayoutBranchSizes } from '../layout/layoutUtils'

type LayoutStore = {
  layouts: StoredLayouts | null
  loadInitialLayouts: () => Promise<void>
  updateBranchSizes: (
    mode: PersistedLayoutMode,
    branchId: number,
    sizes: number[]
  ) => Promise<void>
}

const embedLayouts: StoredLayouts = {
  [LayoutMode.Desktop]: embedLayout,
  [LayoutMode.Mobile]: embedLayout,
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  layouts: embedParams.isEmbed ? embedLayouts : null,
  loadInitialLayouts: async () => {
    if (embedParams.isEmbed) return
    try {
      const loaded = await loadLayouts()
      set({ layouts: loaded })
    } catch (error) {
      console.warn('Failed to load layout', error)
    }
  },
  updateBranchSizes: async (mode, branchId, sizes) => {
    const layouts = get().layouts
    if (!layouts) return

    const layout = layouts[mode]
    try {
      const nextLayout: LayoutRoot = {
        ...layout,
        root: updateLayoutBranchSizes(layout.root, branchId, sizes),
      }
      const nextLayouts: StoredLayouts = {
        ...layouts,
        [mode]: nextLayout,
      }
      await saveLayouts(nextLayouts)
      set({ layouts: nextLayouts })
    } catch (error) {
      console.warn('Failed to update layout', error)
    }
  },
}))

export default useLayoutStore
