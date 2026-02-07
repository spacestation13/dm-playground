import { CompressionService } from '../../services/CompressionService'
import {
  PanelId,
  defaultLayout,
  type LayoutBranch,
  type LayoutLeaf,
  type LayoutRoot,
} from './layoutTypes'
import { removePanel } from './layoutTreeUtils'
import { updateBranchSizes } from './layoutUtils'

const LAYOUT_STORAGE_KEY = 'layout'
const MIN_LAYOUT_VERSION = 1
const VALID_PANELS = new Set(Object.values(PanelId))

const sanitizeNode = (
  node: LayoutBranch | LayoutLeaf
): LayoutBranch | LayoutLeaf | null => {
  if (node.type === 'leaf') {
    return VALID_PANELS.has(node.id) ? node : null
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

export async function saveLayout(layout: LayoutRoot): Promise<void> {
  const compressed = await CompressionService.encode(layout)
  localStorage.setItem(LAYOUT_STORAGE_KEY, compressed)
}

export async function loadLayout(): Promise<LayoutRoot> {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
  if (!stored) {
    await saveLayout(defaultLayout)
    return defaultLayout
  }

  try {
    const parsed = await CompressionService.decode<LayoutRoot>(stored)
    if (!parsed || parsed.version < MIN_LAYOUT_VERSION) {
      await saveLayout(defaultLayout)
      return defaultLayout
    }

    // Remove Console panel from any stored layout
    const sanitizedRoot = sanitizeNode(
      removePanel(parsed.root, PanelId.Console)
    )
    const nextLayout =
      sanitizedRoot && sanitizedRoot.type === 'branch'
        ? { ...parsed, root: sanitizedRoot }
        : defaultLayout

    if (sanitizedRoot && sanitizedRoot.type === 'branch') {
      await saveLayout(nextLayout)
    }

    return nextLayout
  } catch (error) {
    console.warn('Failed to load layout, resetting to default.', error)
    await saveLayout(defaultLayout)
    return defaultLayout
  }
}

export async function updateAndSaveLayout(
  layout: LayoutRoot,
  branchId: number,
  sizes: number[]
): Promise<LayoutRoot> {
  const next = {
    ...layout,
    root: updateBranchSizes(layout.root, branchId, sizes),
  }
  await saveLayout(next)
  return next
}
