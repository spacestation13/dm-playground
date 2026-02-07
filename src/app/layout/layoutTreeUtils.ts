import { PanelId, type LayoutBranch, type LayoutLeaf } from '../layout/layoutTypes'

/**
 * Removes all panels with the given id from the layout tree.
 */
export function removePanel(root: LayoutBranch, panelId: PanelId): LayoutBranch {
  return {
    ...root,
    children: root.children.map((child) => {
      if (child.type === 'branch') {
        return removePanel(child, panelId)
      }
      if (child.type === 'leaf' && child.id === panelId) {
        return null
      }
      return child
    }).filter(Boolean) as Array<LayoutBranch | LayoutLeaf>,
  }
}

/**
 * Adds a panel with the given id to the layout tree, if not already present.
 * Optionally, you can specify a branch id to add to, and a size.
 */
export function addPanel(root: LayoutBranch, panelId: PanelId, branchId: number = 2, size: number = 30): LayoutBranch {
  // Only add if not present
  const hasPanel = (node: LayoutBranch | LayoutLeaf): boolean => {
    if (node.type === 'leaf') return node.id === panelId
    return node.children.some(hasPanel)
  }
  if (hasPanel(root)) return root
  return {
    ...root,
    children: root.children.map((child) => {
      if (child.type === 'branch' && child.id === branchId) {
        return {
          ...child,
          children: [
            ...child.children,
            { type: 'leaf', id: panelId, size },
          ],
        }
      }
      if (child.type === 'branch') return addPanel(child, panelId, branchId, size)
      return child
    }),
  }
}
