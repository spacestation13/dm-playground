import { useEffect, useState } from 'react'
import { executorService } from '../../services/executorSingleton'

export function OutputPanel() {
  const [output, setOutput] = useState<string>('')

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

  return (
    <div className="h-full">
      <pre className="h-full whitespace-pre-wrap rounded bg-slate-950/60 p-3 text-xs text-slate-200">
        {output || 'Output stream placeholder.'}
      </pre>
    </div>
  )
}
