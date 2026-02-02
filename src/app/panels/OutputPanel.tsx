import { useEffect, useState } from 'react'
import { commandQueueService } from '../../services/commandQueueSingleton'

export function OutputPanel() {
  const [output, setOutput] = useState<string>('')

  useEffect(() => {
    const handleStdout = (event: Event) => {
      const detail = (event as CustomEvent<{ pid: number; data: string }>).detail
      setOutput((prev) => `${prev}${detail.data}`)
    }
    const handleStderr = (event: Event) => {
      const detail = (event as CustomEvent<{ pid: number; data: string }>).detail
      setOutput((prev) => `${prev}${detail.data}`)
    }

    commandQueueService.addEventListener('stdout', handleStdout)
    commandQueueService.addEventListener('stderr', handleStderr)
    return () => {
      commandQueueService.removeEventListener('stdout', handleStdout)
      commandQueueService.removeEventListener('stderr', handleStderr)
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
