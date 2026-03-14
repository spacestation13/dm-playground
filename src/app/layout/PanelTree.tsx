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
import { PanelId } from './layoutTypes'

interface PanelTreeProps {
  node: LayoutBranch | LayoutLeaf
  isMobile: boolean
}

export function PanelTree({ node, isMobile }: PanelTreeProps) {
  if (node.type === 'leaf') {
    if (isMobile && node.id === PanelId.Byond) return null
    return (
      <Panel
        id={node.id}
        showTitlebar={node.showTitlebar}
        isMobile={isMobile}
      />
    )
  }

  return <PanelTreeBranch node={node} isMobile={isMobile} />
}

interface PanelTreeBranchProps {
  node: LayoutBranch
  isMobile: boolean
}

function PanelTreeBranch({ node, isMobile }: PanelTreeBranchProps) {
  const { updateBranchSizes } = useLayoutContext()

  const direction = node.split
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

  // Remove Byond panel if isMobile
  const filteredChildren = isMobile
    ? node.children.filter(
        (child) => child.type !== 'leaf' || child.id !== PanelId.Byond
      )
    : node.children

  return (
    <Group
      orientation={direction}
      className="h-full w-full"
      onLayoutChanged={handleLayoutChanged}
    >
      {filteredChildren.map((child, index) => (
        <Fragment key={`${node.id}-${index}`}>
          <ResizablePanel
            id={panelIds[index]}
            defaultSize={child.size}
            minSize={10}
            className="min-h-0 min-w-0"
          >
            <PanelTree node={child} isMobile={isMobile} />
          </ResizablePanel>
          {index < filteredChildren.length - 1 && (
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
