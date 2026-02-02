import { Fragment } from 'react'
import { Panel as PanelHost } from './Panel'
import { Group, Panel as ResizablePanel, Separator, type Layout } from 'react-resizable-panels'
import type { LayoutBranch, LayoutLeaf } from './layoutTypes'
import { useLayoutContext } from './useLayoutContext'

interface PanelTreeProps {
  node: LayoutBranch | LayoutLeaf
}

export function PanelTree({ node }: PanelTreeProps) {
  const { updateBranchSizes } = useLayoutContext()

  if (node.type === 'leaf') {
    return (
      <PanelHost id={node.id} />
    )
  }

  const direction = node.split === 'vertical' ? 'horizontal' : 'vertical'
  const isVertical = direction === 'vertical'
  const panelIds = node.children.map((_, index) => `${node.id}-${index}`)

  const handleLayoutChanged = (layout: Layout) => {
    const sizes = panelIds.map((id, index) => layout[id] ?? node.children[index]?.size ?? 0)
    updateBranchSizes(node.id, sizes)
  }

  return (
    <Group
      orientation={direction}
      className="h-full w-full"
      onLayoutChanged={handleLayoutChanged}
    >
      {node.children.map((child, index) => (
        <Fragment key={`${node.id}-${index}`}>
          <ResizablePanel
            id={panelIds[index]}
            defaultSize={child.size}
            minSize={10}
            className="min-h-0 min-w-0"
          >
            <PanelTree node={child} />
          </ResizablePanel>
          {index < node.children.length - 1 && (
            <Separator
              className={
                isVertical
                  ? 'h-1 w-full bg-slate-800/80 hover:bg-slate-600/80'
                  : 'w-1 h-full bg-slate-800/80 hover:bg-slate-600/80'
              }
            />
          )}
        </Fragment>
      ))}
    </Group>
  )
}
