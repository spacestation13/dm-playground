import { useCallback, useEffect, useRef, useState } from 'react'
import { executorService } from '../../services/ExecutorService'
import {
  ByondEvent,
  ByondStatus,
  byondService,
} from '../../services/ByondService'
import { ensureRuntime } from '../../services/runtimeBootstrap'

export function useRuntimeBootstrap(isEmbed: boolean) {
  const [isByondReady, setIsByondReady] = useState(() => {
    const activeVersion = byondService.getActiveVersion()
    if (!activeVersion) {
      return false
    }

    return byondService.getStatus(activeVersion) === ByondStatus.Installed
  })
  const [isByondLoading, setIsByondLoading] = useState(false)
  const [isRuntimeBootstrapping, setIsRuntimeBootstrapping] = useState(false)
  const runtimeBootstrapRef = useRef<Promise<boolean> | null>(null)

  useEffect(() => {
    const refreshByondReady = () => {
      const activeVersion = byondService.getActiveVersion()
      if (!activeVersion) {
        setIsByondReady(false)
        return
      }

      setIsByondReady(
        byondService.getStatus(activeVersion) === ByondStatus.Installed
      )
    }

    const handleLoading = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      setIsByondLoading(detail)
    }

    refreshByondReady()
    byondService.addEventListener(ByondEvent.Active, refreshByondReady)
    byondService.addStatusListener(refreshByondReady)
    byondService.addEventListener(ByondEvent.Loading, handleLoading)

    return () => {
      byondService.removeEventListener(ByondEvent.Loading, handleLoading)
      byondService.removeStatusListener(refreshByondReady)
      byondService.removeEventListener(ByondEvent.Active, refreshByondReady)
    }
  }, [])

  const bootstrapRuntime = useCallback(() => {
    if (runtimeBootstrapRef.current) {
      return runtimeBootstrapRef.current
    }

    const promise = (async () => {
      executorService.reset()
      executorService.setStatus('running')
      executorService.appendOutput('Initializing runtime...\n')
      setIsRuntimeBootstrapping(true)

      try {
        await ensureRuntime()
        return true
      } catch (error) {
        executorService.appendOutput(
          `Runtime initialization failed: ${String(error)}\n`
        )
        executorService.setStatus('idle')
        return false
      } finally {
        runtimeBootstrapRef.current = null
        setIsRuntimeBootstrapping(false)
      }
    })()

    runtimeBootstrapRef.current = promise
    return promise
  }, [])

  const canRun = isByondReady && !isByondLoading

  return {
    bootstrapRuntime,
    canRun,
    canTriggerRun: canRun || isEmbed,
    isByondLoading,
    isRuntimeBootstrapping,
  }
}
