import { useEffect, useRef, useState } from 'react'
import { executorService } from '../../services/ExecutorService'
import { useFontFamilySetting } from '../settings/localSettings'

export function OutputPanel() {
  const [output, setOutput] = useState<string>('')
  const [status, setStatus] = useState<'running' | 'idle'>('idle')
  const outputRef = useRef<HTMLPreElement | null>(null)
  const [fontFamily] = useFontFamilySetting()

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

  return (
    <div className="h-full">
      <pre
        ref={outputRef}
        className="h-full overflow-auto whitespace-pre-wrap rounded bg-slate-950/60 p-3 text-xs text-slate-200"
        style={{ fontFamily }}
      >
        {output ||
          (status === 'running' ? (
            <span className="inline-flex items-center gap-2 text-slate-400">
              <span className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
              Waiting for output...
            </span>
          ) : null)}
      </pre>
    </div>
  )
}
