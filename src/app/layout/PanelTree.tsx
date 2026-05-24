import { Fragment, useCallback, useMemo, useRef } from 'react'
import {
  Group,
  type Layout,
  Panel as ResizablePanel,
  Separator,
} from 'react-resizable-panels'
import { useLocalSettings } from '../settings/localSettings'
import { type LayoutBranch, type LayoutLeaf, PanelId } from './layoutTypes'
import { Panel } from './Panel'
import { useLayoutContext } from './useLayoutContext'

export function PanelTree({ node }: { node: LayoutBranch | LayoutLeaf }) {
  const showBytecodePanel = useLocalSettings((s) => s.showBytecodePanel)

  if (node.type === 'leaf') {
    if (node.id === PanelId.Bytecode && !showBytecodePanel) {
      return null
    }
    return <Panel id={node.id} showTitlebar={node.showTitlebar} />
  }

  return <PanelTreeBranch node={node} />
}

interface PanelTreeBranchProps {
  node: LayoutBranch
}

function PanelTreeBranch({ node }: PanelTreeBranchProps) {
  const { updateBranchSizes } = useLayoutContext()
  const showBytecodePanel = useLocalSettings((s) => s.showBytecodePanel)

  const direction = node.split
  const isVertical = direction === 'vertical'

  const visibleChildren = useMemo(
    () =>
      node.children.filter(
        (child) =>
          child.type !== 'leaf' ||
          child.id !== PanelId.Bytecode ||
          showBytecodePanel
      ),
    [node.children, showBytecodePanel]
  )

  const panelIds = useMemo(
    () => visibleChildren.map((_, index) => `${node.id}-${index}`),
    [node.id, visibleChildren]
  )
  const lastSizesRef = useRef<number[] | null>(null)

  const handleLayoutChanged = useCallback(
    (layout: Layout) => {
      const sizes = panelIds.map(
        (id, index) => layout[id] ?? visibleChildren[index]?.size ?? 0
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
    [node.id, panelIds, visibleChildren, updateBranchSizes]
  )

  return (
    <Group
      orientation={direction}
      className="h-full w-full"
      onLayoutChanged={handleLayoutChanged}
    >
      {visibleChildren.map((child, index) => (
        <Fragment key={child.id}>
          <ResizablePanel
            id={panelIds[index]}
            defaultSize={child.size}
            minSize={10}
            className="min-h-0 min-w-0"
          >
            <PanelTree node={child} />
          </ResizablePanel>
          {index < visibleChildren.length - 1 && (
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
