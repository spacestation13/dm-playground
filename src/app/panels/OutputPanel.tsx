import { useCallback, useEffect, useRef, useState } from 'react'
import { executorService } from '../../services/ExecutorService'
import { useExecutorStatus } from '../hooks/useExecutorStatus'
import { useFontFamilySetting } from '../settings/localSettings'
import { ByondPanel } from './ByondPanel'
import type { PanelHeaderProps, PanelRenderProps } from './PanelRegistry'

export function OutputPanelHeader({
  isMobile,
  headerFunction: openByondModal,
  stopFunction,
  isLoading = false,
}: PanelHeaderProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span>Output</span>
        {isLoading && (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-400 border-t-transparent"
            aria-label="DreamDaemon is executing"
            title="DreamDaemon is executing"
          />
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isMobile && openByondModal && (
          <button
            type="button"
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
            onClick={openByondModal}
          >
            BYOND Version
          </button>
        )}
        {stopFunction && (
          <button
            type="button"
            className="rounded border border-red-700/70 bg-red-950/40 px-2 py-1 text-xs text-red-200 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={stopFunction}
            disabled={!isLoading}
          >
            Stop Execution
          </button>
        )}
      </div>
    </div>
  )
}

export function OutputPanel({
  isMobile = false,
  registerHeaderState,
}: PanelRenderProps) {
  const [output, setOutput] = useState<Array<{ text: string; color?: string }>>(
    []
  )
  const status = useExecutorStatus()
  const outputRef = useRef<HTMLDivElement | null>(null)
  const [fontFamily] = useFontFamilySetting()
  const [showByondModal, setShowByondModal] = useState(false)

  const handleOpenByondModal = useCallback(() => {
    setShowByondModal(true)
  }, [])

  const handleCloseByondModal = useCallback(() => {
    setShowByondModal(false)
  }, [])

  const handleStopExecution = useCallback(() => {
    executorService.cancel()
  }, [])

  useEffect(() => {
    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ text: string; color?: string }>)
        .detail
      setOutput((prev) => [...prev, detail])
    }

    const handleReset = () => setOutput([])

    executorService.addEventListener('output', handleOutput)
    executorService.addEventListener('reset', handleReset)
    return () => {
      executorService.removeEventListener('output', handleOutput)
      executorService.removeEventListener('reset', handleReset)
    }
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    if (!registerHeaderState) {
      return
    }

    registerHeaderState({
      headerFunction: isMobile ? handleOpenByondModal : undefined,
      stopFunction: handleStopExecution,
      isLoading: status === 'running',
    })

    return () => {
      registerHeaderState({})
    }
  }, [
    handleOpenByondModal,
    handleStopExecution,
    isMobile,
    registerHeaderState,
    status,
  ])

  return (
    <>
      <div className="h-full relative">
        <div
          ref={outputRef}
          className="h-full overflow-auto whitespace-pre-wrap rounded bg-slate-950/60 p-3 text-xs text-slate-200"
          style={{ fontFamily }}
        >
          {output.map((item, i) => (
            <span key={i} style={item.color ? { color: item.color } : {}}>
              {item.text}
            </span>
          ))}
        </div>
      </div>
      {isMobile && showByondModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70"
          onClick={handleCloseByondModal}
        >
          <div
            className="w-100 rounded-lg border border-slate-800 bg-slate-900 p-4 text-slate-200 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="BYOND Version"
          >
            <div className="mb-2 flex justify-between">
              <h2 className="text-sm font-semibold">BYOND Version</h2>
              <button
                type="button"
                onClick={handleCloseByondModal}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <ByondPanel />
          </div>
        </div>
      )}
    </>
  )
}
