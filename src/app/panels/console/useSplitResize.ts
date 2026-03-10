import { useEffect, useRef, useState } from 'react'
import { getSplitPercentFromClientX } from './splitUtils'

export function useSplitResize(initialPercent = 50) {
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const [splitPercent, setSplitPercent] = useState(initialPercent)
  const [resizingSplit, setResizingSplit] = useState(false)

  useEffect(() => {
    const handleSplitMove = (event: MouseEvent) => {
      if (!resizingSplit || !splitContainerRef.current) {
        return
      }

      const rect = splitContainerRef.current.getBoundingClientRect()
      const nextPercent = getSplitPercentFromClientX(event.clientX, rect)
      if (nextPercent === null) {
        return
      }

      setSplitPercent(nextPercent)
    }

    const handleSplitEnd = () => setResizingSplit(false)

    if (resizingSplit) {
      window.addEventListener('mousemove', handleSplitMove)
      window.addEventListener('mouseup', handleSplitEnd)
    } else {
      window.removeEventListener('mousemove', handleSplitMove)
      window.removeEventListener('mouseup', handleSplitEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleSplitMove)
      window.removeEventListener('mouseup', handleSplitEnd)
    }
  }, [resizingSplit])

  const handleSplitDragStart = (event: React.MouseEvent) => {
    setResizingSplit(true)
    event.preventDefault()
  }

  return {
    splitContainerRef,
    splitPercent,
    handleSplitDragStart,
  }
}
