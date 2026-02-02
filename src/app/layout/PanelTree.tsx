import { Panel } from './Panel'
import type { LayoutBranch, LayoutLeaf } from './layoutTypes'

interface PanelTreeProps {
  node: LayoutBranch | LayoutLeaf
}

export function PanelTree({ node }: PanelTreeProps) {
  if (node.type === 'leaf') {
    return (
      <div className="h-full min-h-0 min-w-0" style={getSizeStyle(node.size)}>
        <Panel id={node.id} />
      </div>
    )
  }

  const directionClass = node.split === 'vertical' ? 'flex-row' : 'flex-col'

  return (
    <div className={`flex h-full min-h-0 min-w-0 w-full ${directionClass}`}>
      {node.children.map((child, index) => (
        <div
          key={`${node.id}-${index}`}
          className="flex min-h-0 min-w-0"
          style={getSizeStyle(child.size)}
        >
          <PanelTree node={child} />
        </div>
      ))}
    </div>
  )
}

function getSizeStyle(size?: number) {
  if (!size) {
    return { flex: '1 1 0%' }
  }

  return {
    flexGrow: size,
    flexShrink: 1,
    flexBasis: 0,
  }
}
