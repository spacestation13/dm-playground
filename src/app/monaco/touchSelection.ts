import type * as Monaco from 'monaco-editor'

const TOUCH_SELECTION_HOLD_MS = 300
const TOUCH_SELECTION_MOVE_TOLERANCE_PX = 8

export interface TouchSelectionSnapshot {
  selection: Monaco.Selection | null
  clientX: number
  clientY: number
}

export interface TouchSelectionLifecycleCallbacks {
  onSelectionChange?: (snapshot: TouchSelectionSnapshot) => void
  onSelectionComplete?: (snapshot: TouchSelectionSnapshot) => void
  onSelectionReset?: () => void
}

export function detectTouchInput() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  if (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) {
    return true
  }

  const mediaMatches = (query: string) =>
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches

  return (
    mediaMatches('(pointer: coarse)') ||
    mediaMatches('(any-pointer: coarse)') ||
    mediaMatches('(hover: none)') ||
    mediaMatches('(any-hover: none)')
  )
}

export function syncTouchSelectionMode(
  editor: Monaco.editor.IStandaloneCodeEditor,
  enabled: boolean
) {
  const container = editor.getContainerDomNode()
  container.classList.toggle('enable-user-select', enabled)

  if (enabled) {
    container.classList.remove('no-user-select')
    return
  }

  container.classList.remove('enable-user-select')
}

export function installTouchSelectionHandler(
  editor: Monaco.editor.IStandaloneCodeEditor,
  enabled: boolean,
  callbacks: TouchSelectionLifecycleCallbacks = {}
) {
  if (!enabled || typeof window === 'undefined') {
    return () => {}
  }

  let pointerId: number | null = null
  let anchor: Monaco.IPosition | null = null
  let selecting = false
  let startX = 0
  let startY = 0
  let holdTimer: number | null = null

  const container = editor.getContainerDomNode()

  const getSelectionSnapshot = (
    clientX: number,
    clientY: number
  ): TouchSelectionSnapshot => {
    const selection = editor.getSelection()
    return {
      selection: selection && !selection.isEmpty() ? selection : null,
      clientX,
      clientY,
    }
  }

  const clearHoldTimer = () => {
    if (holdTimer === null) {
      return
    }

    window.clearTimeout(holdTimer)
    holdTimer = null
  }

  const resetState = () => {
    clearHoldTimer()
    pointerId = null
    anchor = null
    selecting = false
  }

  const getPositionAtPoint = (clientX: number, clientY: number) =>
    editor.getTargetAtClientPoint(clientX, clientY)?.position ?? null

  const updateSelection = (clientX: number, clientY: number) => {
    if (!anchor) {
      return null
    }

    const position = getPositionAtPoint(clientX, clientY)
    if (!position) {
      return null
    }

    editor.setSelection(
      {
        selectionStartLineNumber: anchor.lineNumber,
        selectionStartColumn: anchor.column,
        positionLineNumber: position.lineNumber,
        positionColumn: position.column,
      },
      'touch-selection'
    )
    editor.revealPositionInCenterIfOutsideViewport(position)

    const snapshot = getSelectionSnapshot(clientX, clientY)
    callbacks.onSelectionChange?.(snapshot)
    return snapshot
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || event.isPrimary === false) {
      return
    }

    callbacks.onSelectionReset?.()
    pointerId = event.pointerId
    anchor = getPositionAtPoint(event.clientX, event.clientY)
    selecting = false
    startX = event.clientX
    startY = event.clientY
    clearHoldTimer()

    holdTimer = window.setTimeout(() => {
      if (!anchor || pointerId !== event.pointerId) {
        return
      }

      selecting = true
      editor.focus()
      updateSelection(startX, startY)
    }, TOUCH_SELECTION_HOLD_MS)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || event.pointerId !== pointerId) {
      return
    }

    if (!selecting) {
      const moved = Math.hypot(event.clientX - startX, event.clientY - startY)
      if (moved > TOUCH_SELECTION_MOVE_TOLERANCE_PX) {
        clearHoldTimer()
        anchor = null
        callbacks.onSelectionReset?.()
      }
      return
    }

    event.preventDefault()
    updateSelection(event.clientX, event.clientY)
  }

  const handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || event.pointerId !== pointerId) {
      return
    }

    if (selecting && event.type !== 'pointercancel') {
      event.preventDefault()
      const snapshot = updateSelection(event.clientX, event.clientY)
      callbacks.onSelectionComplete?.(
        snapshot ?? getSelectionSnapshot(event.clientX, event.clientY)
      )
    } else {
      callbacks.onSelectionReset?.()
    }

    resetState()
  }

  container.addEventListener('pointerdown', handlePointerDown, {
    passive: true,
  })
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerEnd, { passive: false })
  window.addEventListener('pointercancel', handlePointerEnd, { passive: false })

  return () => {
    resetState()
    container.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerEnd)
    window.removeEventListener('pointercancel', handlePointerEnd)
  }
}
