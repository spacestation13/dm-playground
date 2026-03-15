import { useCallback, useEffect, useRef, useState } from 'react'
import { executorService } from '../../services/ExecutorService'
import {
  ByondEvent,
  ByondStatus,
  byondService,
} from '../../services/ByondService'
import { ensureRuntime } from '../../services/runtimeBootstrap'

export function useRuntimeBootstrap() {
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

    const loadingMessages = [
      'Reticulating splines…',
      'Processing geometry…',
      'Compiling shaders…',
      'Generating mipmaps…',
      'Calculating trajectories…',
      'Loading mods…',
      'Streaming assets…',
      'Optimizing build order…',
      'Acquiring spoons…',
      'Consulting the manual…',
      'Debugging debugger…',
      'Simulating program execution…',
      'Adding more work…',
      'Computing optimal square packing…',
      'Normalizing quaternions…',
      'Lecturing late subsystems…',
      'Ascending…',
    ]
    let intervalId: number | undefined
    let shuffled: string[] = []
    let firstMessageShown = false
    const showNextMessage = () => {
      if (!firstMessageShown) {
        executorService.appendOutput('Loading…\n')
        firstMessageShown = true
        return
      }
      if (shuffled.length === 0) {
        shuffled = loadingMessages.slice().sort(() => Math.random() - 0.5)
      }
      executorService.appendOutput(shuffled.shift() + '\n')
    }

    const promise = (async () => {
      executorService.reset()
      executorService.setStatus('running')
      setIsRuntimeBootstrapping(true)

      showNextMessage()
      intervalId = window.setInterval(showNextMessage, 1_500)

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
        if (intervalId !== undefined) {
          clearInterval(intervalId)
        }
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
    canTriggerRun: true,
    isByondLoading,
    isRuntimeBootstrapping,
  }
}
