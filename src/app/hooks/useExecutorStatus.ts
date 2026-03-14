import { useEffect, useState } from 'react'
import { executorService } from '../../services/ExecutorService'

export function useExecutorStatus() {
  const [status, setStatus] = useState<'running' | 'idle'>(() =>
    executorService.getStatus()
  )

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<'running' | 'idle'>).detail
      setStatus(detail)
    }

    executorService.addEventListener('status', handleStatus)
    return () => {
      executorService.removeEventListener('status', handleStatus)
    }
  }, [])

  return status
}
