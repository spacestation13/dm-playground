import { CompressionService } from '../../services/CompressionService'
import {
  LayoutMode,
  type LayoutBranch,
  type LayoutLeaf,
  type LayoutRoot,
  type PanelId,
  defaultLayouts,
  layoutPanelIds,
  persistedLayoutModes,
  type PersistedLayoutMode,
} from './layoutTypes'

const LAYOUT_STORAGE_KEY = 'layout'
const MIN_LAYOUT_VERSION = 1
const STORAGE_VERSION = 1
const VALID_LAYOUT_PANELS = new Set<PanelId>(layoutPanelIds)

export type StoredLayouts = Record<PersistedLayoutMode, LayoutRoot>

interface LayoutStoragePayload {
  version: number
  layouts: StoredLayouts
}

function getDefaultLayouts(): StoredLayouts {
  return {
    [LayoutMode.Desktop]: defaultLayouts[LayoutMode.Desktop],
    [LayoutMode.Mobile]: defaultLayouts[LayoutMode.Mobile],
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function collectPersistedLayoutState(
  node: LayoutBranch | LayoutLeaf,
  branchSizes: Map<number, number>,
  leafSizes: Map<PanelId, number>,
  leafTitlebars: Map<PanelId, boolean>
): void {
  if (node.type === 'leaf') {
    if (!VALID_LAYOUT_PANELS.has(node.id)) {
      return
    }

    if (isFiniteNumber(node.size)) {
      leafSizes.set(node.id, node.size)
    }

    if (typeof node.showTitlebar === 'boolean') {
      leafTitlebars.set(node.id, node.showTitlebar)
    }

    return
  }

  if (isFiniteNumber(node.size)) {
    branchSizes.set(node.id, node.size)
  }

  node.children.forEach((child) => {
    collectPersistedLayoutState(child, branchSizes, leafSizes, leafTitlebars)
  })
}

function applyPersistedLayoutState(
  node: LayoutBranch | LayoutLeaf,
  branchSizes: Map<number, number>,
  leafSizes: Map<PanelId, number>,
  leafTitlebars: Map<PanelId, boolean>
): LayoutBranch | LayoutLeaf {
  if (node.type === 'leaf') {
    return {
      ...node,
      size: leafSizes.get(node.id) ?? node.size,
      showTitlebar: leafTitlebars.get(node.id) ?? node.showTitlebar,
    }
  }

  return {
    ...node,
    size: branchSizes.get(node.id) ?? node.size,
    children: node.children.map((child) =>
      applyPersistedLayoutState(child, branchSizes, leafSizes, leafTitlebars)
    ),
  }
}

function mergeLayout(layout: LayoutRoot, fallback: LayoutRoot): LayoutRoot {
  if (!layout || layout.version < MIN_LAYOUT_VERSION) {
    return fallback
  }

  if (layout.root.type !== 'branch') {
    return fallback
  }

  const branchSizes = new Map<number, number>()
  const leafSizes = new Map<PanelId, number>()
  const leafTitlebars = new Map<PanelId, boolean>()

  collectPersistedLayoutState(
    layout.root,
    branchSizes,
    leafSizes,
    leafTitlebars
  )

  return {
    ...fallback,
    root: applyPersistedLayoutState(
      fallback.root,
      branchSizes,
      leafSizes,
      leafTitlebars
    ) as LayoutBranch,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isLayoutRoot(value: unknown): value is LayoutRoot {
  return (
    isRecord(value) && isRecord(value.root) && typeof value.version === 'number'
  )
}

function isLayoutStoragePayload(value: unknown): value is LayoutStoragePayload {
  if (!isRecord(value)) {
    return false
  }

  const { layouts } = value
  if (!isRecord(layouts)) {
    return false
  }

  return persistedLayoutModes.every((mode) => isLayoutRoot(layouts[mode]))
}

function normalizeLayouts(value: unknown): StoredLayouts {
  const defaults = getDefaultLayouts()

  if (isLayoutStoragePayload(value)) {
    return {
      [LayoutMode.Desktop]: mergeLayout(
        value.layouts[LayoutMode.Desktop],
        defaults[LayoutMode.Desktop]
      ),
      [LayoutMode.Mobile]: mergeLayout(
        value.layouts[LayoutMode.Mobile],
        defaults[LayoutMode.Mobile]
      ),
    }
  }

  return defaults
}

export async function saveLayouts(layouts: StoredLayouts): Promise<void> {
  const defaults = getDefaultLayouts()
  const normalizedLayouts: StoredLayouts = {
    [LayoutMode.Desktop]: mergeLayout(
      layouts[LayoutMode.Desktop],
      defaults[LayoutMode.Desktop]
    ),
    [LayoutMode.Mobile]: mergeLayout(
      layouts[LayoutMode.Mobile],
      defaults[LayoutMode.Mobile]
    ),
  }

  const compressed = await CompressionService.encode({
    version: STORAGE_VERSION,
    layouts: normalizedLayouts,
  } satisfies LayoutStoragePayload)
  localStorage.setItem(LAYOUT_STORAGE_KEY, compressed)
}

export async function loadLayouts(): Promise<StoredLayouts> {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
  if (!stored) {
    const defaults = getDefaultLayouts()
    await saveLayouts(defaults)
    return defaults
  }

  try {
    const parsed = await CompressionService.decode<unknown>(stored)
    const layouts = normalizeLayouts(parsed)
    await saveLayouts(layouts)
    return layouts
  } catch (error) {
    console.warn('Failed to load layout, resetting to default.', error)
    const defaults = getDefaultLayouts()
    await saveLayouts(defaults)
    return defaults
  }
}
