import { useEffect, useRef, useState } from 'react'
import { executorService } from '../../services/ExecutorService'

export function OutputPanel() {
  const [output, setOutput] = useState<string>('')
  const outputRef = useRef<HTMLPreElement | null>(null)

  useEffect(() => {
    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      setOutput((prev) => `${prev}${detail}`)
    }

    const handleReset = () => setOutput('')

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

  return (
    <div className="h-full">
      <pre
        ref={outputRef}
        className="h-full overflow-auto whitespace-pre-wrap rounded bg-slate-950/60 p-3 text-xs text-slate-200"
      >
        {output || (
          <span className="inline-flex items-center gap-2 text-slate-400">
            <span className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
            Waiting for output...
          </span>
        )}
      </pre>
    </div>
  )
}
