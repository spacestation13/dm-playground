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

export function swapSplitDirections(node: LayoutBranch): LayoutBranch {
  return {
    ...node,
    split: node.split === 'horizontal' ? 'vertical' : 'horizontal',
    children: node.children.map((child) => {
      if (child.type === 'branch') {
        return swapSplitDirections(child)
      }
      return child
    }),
  }
}
