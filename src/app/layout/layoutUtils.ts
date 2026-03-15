import type { LayoutBranch } from './layoutTypes'

export function updateBranchSizes(
  node: LayoutBranch,
  branchId: number,
  sizes: number[]
): LayoutBranch {
  if (node.id === branchId) {
    return {
      ...node,
      children: node.children.map((child, index) => {
        const size = sizes[index]
        if (!size) {
          return child
        }
        return {
          ...child,
          size,
        }
      }),
    }
  }

  return {
    ...node,
    children: node.children.map((child) => {
      if (child.type === 'branch') {
        return updateBranchSizes(child, branchId, sizes)
      }
      return child
    }),
  }
}
