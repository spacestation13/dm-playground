import { useCallback, useEffect, useRef, useState } from 'react'
import { executorService } from '../../services/ExecutorService'
import { useFontFamilySetting } from '../settings/localSettings'
import { ByondPanel } from './ByondPanel'
import type { PanelHeaderProps, PanelRenderProps } from './PanelRegistry'

export function OutputPanelHeader({
  isMobile,
  headerFunction: openByondModal,
}: PanelHeaderProps) {
  return (
    <>
      Output
      {isMobile && openByondModal && (
        <button
          type="button"
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:border-slate-500 ml-2"
          onClick={openByondModal}
        >
          BYOND Version
        </button>
      )}
    </>
  )
}

export function OutputPanel({
  isMobile = false,
  registerHeaderAction,
}: PanelRenderProps) {
  const [output, setOutput] = useState<string>('')
  const [status, setStatus] = useState<'running' | 'idle'>('idle')
  const outputRef = useRef<HTMLPreElement | null>(null)
  const [fontFamily] = useFontFamilySetting()
  const [showByondModal, setShowByondModal] = useState(false)

  const handleOpenByondModal = useCallback(() => {
    setShowByondModal(true)
  }, [])

  const handleCloseByondModal = useCallback(() => {
    setShowByondModal(false)
  }, [])

  useEffect(() => {
    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      setOutput((prev) => `${prev}${detail}`)
    }

    const handleReset = () => setOutput('')
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<'running' | 'idle'>).detail
      setStatus(detail)
    }

    executorService.addEventListener('output', handleOutput)
    executorService.addEventListener('reset', handleReset)
    executorService.addEventListener('status', handleStatus)
    return () => {
      executorService.removeEventListener('output', handleOutput)
      executorService.removeEventListener('reset', handleReset)
      executorService.removeEventListener('status', handleStatus)
    }
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    if (!registerHeaderAction) {
      return
    }

    registerHeaderAction(isMobile ? handleOpenByondModal : undefined)

    return () => {
      registerHeaderAction(undefined)
    }
  }, [handleOpenByondModal, isMobile, registerHeaderAction])

  return (
    <>
      <div className="h-full relative">
        <pre
          ref={outputRef}
          className="h-full overflow-auto whitespace-pre-wrap rounded bg-slate-950/60 p-3 text-xs text-slate-200"
          style={{ fontFamily }}
        >
          {output ||
            (status === 'running' ? (
              <span className="inline-flex items-center gap-2 text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
                Waiting for output…
              </span>
            ) : null)}
        </pre>
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
