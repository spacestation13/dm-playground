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

const sanitizeNode = (
  node: LayoutBranch | LayoutLeaf
): LayoutBranch | LayoutLeaf | null => {
  if (node.type === 'leaf') {
    return VALID_LAYOUT_PANELS.has(node.id) ? node : null
  }

  const children = node.children
    .map((child) => sanitizeNode(child))
    .filter((child): child is LayoutBranch | LayoutLeaf => child !== null)

  if (children.length === 0) {
    return null
  }

  if (children.length === 1) {
    return children[0]
  }

  return {
    ...node,
    children,
  }
}

function sanitizeLayout(layout: LayoutRoot, fallback: LayoutRoot): LayoutRoot {
  if (!layout || layout.version < MIN_LAYOUT_VERSION) {
    return fallback
  }

  const sanitizedRoot = sanitizeNode(layout.root)
  if (!sanitizedRoot || sanitizedRoot.type !== 'branch') {
    return fallback
  }

  return {
    ...layout,
    root: sanitizedRoot,
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
      [LayoutMode.Desktop]: sanitizeLayout(
        value.layouts[LayoutMode.Desktop],
        defaults[LayoutMode.Desktop]
      ),
      [LayoutMode.Mobile]: sanitizeLayout(
        value.layouts[LayoutMode.Mobile],
        defaults[LayoutMode.Mobile]
      ),
    }
  }

  return defaults
}

export async function saveLayouts(layouts: StoredLayouts): Promise<void> {
  const compressed = await CompressionService.encode({
    version: STORAGE_VERSION,
    layouts,
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
