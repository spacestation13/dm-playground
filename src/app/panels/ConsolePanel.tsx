import { Suspense, lazy, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TerminalApi } from '../components/Terminal'
import { emulatorService } from '../../services/EmulatorService'
import { commandQueueService } from '../../services/CommandQueueService'
import { green, red } from '../../utils/terminalColors'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { decodeController, decodeSent } from './console/controllerCodec'
import { useSplitResize } from './console/useSplitResize'

const LazyTerminal = lazy(async () => {
  const module = await import('../components/Terminal')
  return { default: module.Terminal }
})

export function ConsolePanel() {
  const [consoleTerminal, setConsoleTerminal] = useState<TerminalApi | null>(
    null
  )
  const [controllerTerminal, setControllerTerminal] =
    useState<TerminalApi | null>(null)
  const [persistTerminal, setPersistTerminal] = useState(true)
  const { splitContainerRef, splitPercent, handleSplitDragStart } =
    useSplitResize(35)

  useEffect(() => {
    if (!consoleTerminal) {
      return
    }

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ port: string; data: string }>)
        .detail
      if (detail.port === 'console') {
        consoleTerminal.write(detail.data)
      }
    }

    const handleReset = () => {
      if (!persistTerminal) {
        consoleTerminal.clear()
      }
    }

    emulatorService.addEventListener('receivedOutput', handleOutput)
    emulatorService.addEventListener('resetOutputConsole', handleReset)

    return () => {
      emulatorService.removeEventListener('receivedOutput', handleOutput)
      emulatorService.removeEventListener('resetOutputConsole', handleReset)
    }
  }, [consoleTerminal, persistTerminal])

  useEffect(() => {
    if (!controllerTerminal) {
      return
    }

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ port: string; data: string }>)
        .detail
      if (detail.port === 'controller') {
        const decoded = decodeController(detail.data)
        const filtered = decoded
          .split('\n')
          .map((line) => line.replace(/\0/g, '').trim())
          .filter((line) => line && line !== 'OK')
          .join(`\n${red('< ')}`)
        if (!filtered) {
          return
        }
        controllerTerminal.write(`\n${red('< ')}${filtered}`)
      }
    }

    const handleSent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail.trim() === 'poll') {
        return
      }
      controllerTerminal.write(`\n${green('> ')}${decodeSent(detail)}\n`)
    }

    emulatorService.addEventListener('receivedOutput', handleOutput)
    commandQueueService.addEventListener('sent', handleSent)
    return () => {
      emulatorService.removeEventListener('receivedOutput', handleOutput)
      commandQueueService.removeEventListener('sent', handleSent)
    }
  }, [controllerTerminal])

  // Responsive modal/bottom panel
  // Use portal for modal on desktop, inline for mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Draggable modal state
  const [modalPos, setModalPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const [dragging, setDragging] = useState(false)
  const dragStart = (e: React.MouseEvent) => {
    setDragging(true)
    e.preventDefault()
  }
  const dragEnd = () => setDragging(false)
  useEffect(() => {
    const dragMove = (e: MouseEvent) => {
      if (!dragging) return
      setModalPos((pos) => ({
        x: pos.x + e.movementX,
        y: pos.y + e.movementY,
      }))
    }
    if (dragging) {
      window.addEventListener('mousemove', dragMove)
      window.addEventListener('mouseup', dragEnd)
    } else {
      window.removeEventListener('mousemove', dragMove)
      window.removeEventListener('mouseup', dragEnd)
    }
    return () => {
      window.removeEventListener('mousemove', dragMove)
      window.removeEventListener('mouseup', dragEnd)
    }
  }, [dragging])

  const panelContent = (
    <div
      className={
        isMobile
          ? 'w-full bg-slate-900 border-t border-slate-800 p-2'
          : 'fixed z-40 flex flex-col rounded-lg border border-slate-800 bg-slate-900 p-2 shadow-2xl overflow-hidden'
      }
      style={
        isMobile
          ? { minHeight: 320, maxHeight: 560 }
          : {
              width: 680,
              height: 420,
              minWidth: 480,
              minHeight: 320,
              maxWidth: window.innerWidth - 16,
              maxHeight: window.innerHeight - 16,
              resize: 'both',
              overflow: 'hidden',
              top: `${modalPos.y + 16}px`,
              left: `${modalPos.x + 8}px`,
            }
      }
    >
      {!isMobile && (
        <div
          className="mb-1.5 flex cursor-move items-center justify-between gap-2 rounded px-1"
          style={{ userSelect: 'none' }}
          onMouseDown={dragStart}
        >
          <div className="text-sm font-semibold text-slate-200 select-none">
            Console
          </div>
          <label
            className="flex items-center gap-1.5 rounded-sm border border-slate-700 px-1 py-0.5 text-xs text-slate-300"
            onMouseDown={(event) => event.stopPropagation()}
            title="Keep terminal output between runs"
          >
            <input
              type="checkbox"
              checked={persistTerminal}
              onChange={(event) => setPersistTerminal(event.target.checked)}
            />
            <span>Persist terminal</span>
          </label>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden rounded border border-slate-800">
        <div ref={splitContainerRef} className="flex h-full min-h-0">
          <div className="min-h-0" style={{ width: `${splitPercent}%` }}>
            <Suspense fallback={<TerminalLoadingFallback />}>
              <LazyTerminal
                label="System Terminal"
                onReady={setConsoleTerminal}
                onData={(value) => emulatorService.sendPort('console', value)}
                onResize={(rows, cols) =>
                  emulatorService.resizePort('console', rows, cols)
                }
              />
            </Suspense>
          </div>
          <div
            className="w-2 cursor-col-resize bg-slate-800/80 hover:bg-slate-700"
            onMouseDown={handleSplitDragStart}
          />
          <div className="min-h-0 flex-1">
            <Suspense fallback={<TerminalLoadingFallback />}>
              <LazyTerminal
                readOnly
                label="Controller"
                onReady={setControllerTerminal}
                onResize={(rows, cols) =>
                  emulatorService.resizePort('controller', rows, cols)
                }
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )

  // Portal for desktop modal
  if (!isMobile && typeof document !== 'undefined') {
    const el = document.getElementById('console-modal-root')
    if (el) {
      return createPortal(panelContent, el)
    }
  }
  // Inline for mobile or fallback
  return panelContent
}

function TerminalLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-slate-950/60">
      <LoadingSpinner />
    </div>
  )
}
