import type * as Monaco from 'monaco-editor'

const TOUCH_SELECTION_HOLD_MS = 300
const TOUCH_SELECTION_MOVE_TOLERANCE_PX = 8
const SCROLL_EDGE_EPSILON_PX = 1
const MOMENTUM_MIN_VELOCITY_PX_PER_MS = 0.12
const MOMENTUM_FRICTION_PER_FRAME = 0.92
const MOMENTUM_MAX_STEP_PX = 48

function canEditorScrollVertically(
  editor: Monaco.editor.IStandaloneCodeEditor,
  deltaY: number
) {
  if (deltaY === 0) {
    return false
  }

  const scrollTop = editor.getScrollTop()
  const viewportHeight = editor.getLayoutInfo().height
  const contentHeight = editor.getContentHeight()
  const maxScrollTop = Math.max(0, contentHeight - viewportHeight)

  if (deltaY > 0) {
    return scrollTop < maxScrollTop - SCROLL_EDGE_EPSILON_PX
  }

  return scrollTop > SCROLL_EDGE_EPSILON_PX
}

function isScrollableElement(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY

  if (!/(auto|scroll|overlay)/.test(overflowY)) {
    return false
  }

  return element.scrollHeight > element.clientHeight + SCROLL_EDGE_EPSILON_PX
}

function canElementScrollVertically(element: HTMLElement, deltaY: number) {
  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight)

  if (maxScrollTop <= SCROLL_EDGE_EPSILON_PX || deltaY === 0) {
    return false
  }

  if (deltaY > 0) {
    return element.scrollTop < maxScrollTop - SCROLL_EDGE_EPSILON_PX
  }

  return element.scrollTop > SCROLL_EDGE_EPSILON_PX
}

function getScrollHandoffTarget(startElement: HTMLElement, deltaY: number) {
  let current = startElement.parentElement
  while (current) {
    if (
      isScrollableElement(current) &&
      canElementScrollVertically(current, deltaY)
    ) {
      return current
    }
    current = current.parentElement
  }

  const scrollRoot = document.scrollingElement
  if (
    scrollRoot instanceof HTMLElement &&
    canElementScrollVertically(scrollRoot, deltaY)
  ) {
    return scrollRoot
  }

  return null
}

function scrollElementBy(target: HTMLElement, deltaY: number) {
  const previousScrollTop = target.scrollTop
  target.scrollTop += deltaY
  return target.scrollTop - previousScrollTop
}

export function installTouchScrollHandoff(
  editor: Monaco.editor.IStandaloneCodeEditor,
  enabled: boolean
) {
  if (!enabled || typeof window === 'undefined') {
    return () => {}
  }

  let pointerId: number | null = null
  let selecting = false
  let startX = 0
  let startY = 0
  let holdTimer: number | null = null
  let touchStartX = 0
  let touchStartY = 0
  let lastTouchY = 0
  let touchHandoffTarget: HTMLElement | null = null
  let lastHandoffTarget: HTMLElement | null = null
  let lastMoveTimestamp = 0
  let momentumVelocity = 0
  let momentumFrame: number | null = null
  let momentumLastFrameTimestamp = 0
  let momentumStartTimeout: number | null = null

  const container = editor.getContainerDomNode()
  const touchEventTarget =
    container.querySelector('.monaco-editor') instanceof HTMLElement
      ? (container.querySelector('.monaco-editor') as HTMLElement)
      : container

  const clearHoldTimer = () => {
    if (holdTimer === null) {
      return
    }

    window.clearTimeout(holdTimer)
    holdTimer = null
  }

  const clearMomentumStartTimeout = () => {
    if (momentumStartTimeout === null) {
      return
    }

    window.clearTimeout(momentumStartTimeout)
    momentumStartTimeout = null
  }

  const stopMomentum = (resetVelocity = true) => {
    clearMomentumStartTimeout()
    if (momentumFrame !== null) {
      window.cancelAnimationFrame(momentumFrame)
      momentumFrame = null
    }
    momentumLastFrameTimestamp = 0
    if (resetVelocity) {
      momentumVelocity = 0
    }
  }

  const stepMomentum = (timestamp: number) => {
    if (!lastHandoffTarget) {
      stopMomentum()
      return
    }

    if (momentumLastFrameTimestamp === 0) {
      momentumLastFrameTimestamp = timestamp
    }

    const elapsed = Math.max(1, timestamp - momentumLastFrameTimestamp)
    momentumLastFrameTimestamp = timestamp

    const frameScale = elapsed / 16
    const deltaY = Math.max(
      -MOMENTUM_MAX_STEP_PX,
      Math.min(MOMENTUM_MAX_STEP_PX, momentumVelocity * elapsed)
    )

    const consumed = scrollElementBy(lastHandoffTarget, deltaY)
    momentumVelocity *= Math.pow(MOMENTUM_FRICTION_PER_FRAME, frameScale)

    if (
      Math.abs(consumed) < SCROLL_EDGE_EPSILON_PX ||
      Math.abs(momentumVelocity) < MOMENTUM_MIN_VELOCITY_PX_PER_MS
    ) {
      stopMomentum()
      return
    }

    momentumFrame = window.requestAnimationFrame(stepMomentum)
  }

  const startMomentum = () => {
    if (
      !lastHandoffTarget ||
      Math.abs(momentumVelocity) < MOMENTUM_MIN_VELOCITY_PX_PER_MS
    ) {
      stopMomentum()
      return
    }

    stopMomentum(false)
    momentumFrame = window.requestAnimationFrame(stepMomentum)
  }

  const applyHandoffScroll = (target: HTMLElement, deltaY: number) => {
    lastHandoffTarget = target
    const consumed = scrollElementBy(target, deltaY)
    return consumed
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || event.isPrimary === false) {
      return
    }

    pointerId = event.pointerId
    selecting = false
    startX = event.clientX
    startY = event.clientY
    stopMomentum()
    clearHoldTimer()

    holdTimer = window.setTimeout(() => {
      if (pointerId !== event.pointerId) {
        return
      }

      selecting = true
    }, TOUCH_SELECTION_HOLD_MS)
  }

  const resetTouchHandoffState = () => {
    touchStartX = 0
    touchStartY = 0
    lastTouchY = 0
    touchHandoffTarget = null
    lastMoveTimestamp = 0
  }

  const resetPointerState = () => {
    clearHoldTimer()
    pointerId = null
    selecting = false
  }

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      resetTouchHandoffState()
      return
    }

    const touch = event.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    lastTouchY = touch.clientY
    touchHandoffTarget = null
    lastHandoffTarget = null
    lastMoveTimestamp = performance.now()
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (selecting || event.touches.length !== 1) {
      return
    }

    const touch = event.touches[0]
    const timestamp = performance.now()
    const totalDeltaX = touch.clientX - touchStartX
    const totalDeltaY = touch.clientY - touchStartY
    const stepDeltaY = lastTouchY - touch.clientY
    lastTouchY = touch.clientY

    const moved = Math.hypot(totalDeltaX, totalDeltaY)
    if (moved <= TOUCH_SELECTION_MOVE_TOLERANCE_PX) {
      return
    }

    const isVerticalGesture = Math.abs(totalDeltaY) >= Math.abs(totalDeltaX)
    if (!isVerticalGesture || stepDeltaY === 0) {
      touchHandoffTarget = null
      return
    }

    if (canEditorScrollVertically(editor, stepDeltaY)) {
      touchHandoffTarget = null
      return
    }

    const nextTarget =
      touchHandoffTarget &&
      canElementScrollVertically(touchHandoffTarget, stepDeltaY)
        ? touchHandoffTarget
        : getScrollHandoffTarget(container, stepDeltaY)

    if (!nextTarget) {
      return
    }

    event.preventDefault()
    touchHandoffTarget = nextTarget
    const consumed = applyHandoffScroll(nextTarget, stepDeltaY)
    const elapsed = Math.max(1, timestamp - lastMoveTimestamp)
    lastMoveTimestamp = timestamp

    if (Math.abs(consumed) >= SCROLL_EDGE_EPSILON_PX) {
      const instantVelocity = consumed / elapsed
      momentumVelocity = momentumVelocity * 0.35 + instantVelocity * 0.65
    }
  }

  const handleTouchEnd = () => {
    clearMomentumStartTimeout()
    // Slightly delay starting momentum to avoid fighting the browser's
    // native scroll state; do NOT forcibly reset `scrollTop` here which
    // can cause the scrollbar thumb to jump.
    momentumStartTimeout = window.setTimeout(() => {
      momentumStartTimeout = null
      startMomentum()
    }, 16)
    resetTouchHandoffState()
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || event.pointerId !== pointerId) {
      return
    }

    if (selecting) {
      return
    }

    const moved = Math.hypot(event.clientX - startX, event.clientY - startY)
    if (moved > TOUCH_SELECTION_MOVE_TOLERANCE_PX) {
      clearHoldTimer()
    }
  }

  const handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || event.pointerId !== pointerId) {
      return
    }

    resetPointerState()
  }

  container.addEventListener('pointerdown', handlePointerDown, {
    passive: true,
  })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerup', handlePointerEnd, { passive: true })
  window.addEventListener('pointercancel', handlePointerEnd, { passive: true })
  touchEventTarget.addEventListener('touchstart', handleTouchStart, {
    passive: true,
    capture: true,
  })
  touchEventTarget.addEventListener('touchmove', handleTouchMove, {
    passive: false,
    capture: true,
  })
  touchEventTarget.addEventListener('touchend', handleTouchEnd, {
    passive: true,
    capture: true,
  })
  touchEventTarget.addEventListener('touchcancel', handleTouchEnd, {
    passive: true,
    capture: true,
  })

  return () => {
    resetTouchHandoffState()
    resetPointerState()
    stopMomentum()
    container.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerEnd)
    window.removeEventListener('pointercancel', handlePointerEnd)
    touchEventTarget.removeEventListener('touchstart', handleTouchStart)
    touchEventTarget.removeEventListener('touchmove', handleTouchMove)
    touchEventTarget.removeEventListener('touchend', handleTouchEnd)
    touchEventTarget.removeEventListener('touchcancel', handleTouchEnd)
  }
}
