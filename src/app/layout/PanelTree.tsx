import { Fragment, useCallback, useMemo, useRef } from 'react'
import { Panel } from './Panel'
import {
  Group,
  Panel as ResizablePanel,
  Separator,
  type Layout,
} from 'react-resizable-panels'
import type { LayoutBranch, LayoutLeaf } from './layoutTypes'
import { useLayoutContext } from './useLayoutContext'

interface PanelTreeProps {
  node: LayoutBranch | LayoutLeaf
}

export function PanelTree({ node }: PanelTreeProps) {
  if (node.type === 'leaf') {
    return <Panel id={node.id} showTitlebar={node.showTitlebar} />
  }

  return <PanelTreeBranch node={node} />
}

interface PanelTreeBranchProps {
  node: LayoutBranch
}

function PanelTreeBranch({ node }: PanelTreeBranchProps) {
  const { updateBranchSizes } = useLayoutContext()

  const direction = node.split === 'vertical' ? 'horizontal' : 'vertical'
  const isVertical = direction === 'vertical'
  const panelIds = useMemo(
    () => node.children.map((_, index) => `${node.id}-${index}`),
    [node.id, node.children]
  )
  const lastSizesRef = useRef<number[] | null>(null)

  const handleLayoutChanged = useCallback(
    (layout: Layout) => {
      const sizes = panelIds.map(
        (id, index) => layout[id] ?? node.children[index]?.size ?? 0
      )
      if (sizes.every((value) => value === 0)) {
        return
      }

      const last = lastSizesRef.current
      const isSame =
        last &&
        last.length === sizes.length &&
        last.every((value, index) => Math.abs(value - sizes[index]) < 0.1)

      if (isSame) {
        return
      }

      lastSizesRef.current = sizes
      updateBranchSizes(node.id, sizes)
    },
    [node.id, panelIds, node.children, updateBranchSizes]
  )

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
