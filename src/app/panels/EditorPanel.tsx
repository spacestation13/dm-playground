import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from '../components/Editor'
import { executorService } from '../../services/ExecutorService'
import { useTheme } from '../theme/useTheme'
import { buildShareUrl, embedParams } from '../embed/embedParams'
import { useRuntimeBootstrap } from '../hooks/useRuntimeBootstrap'

const DEFAULT_CODE = `/world/New()\n\tworld.log << "meow"\n\t..()\n\teval("")\n\tshutdown()\n`

export function EditorPanel() {
  const [currentCode, setCurrentCode] = useState(
    () => embedParams.code ?? DEFAULT_CODE
  )
  const [, setStatus] = useState<'running' | 'idle'>('idle')
  const { themeId } = useTheme()
  const hasAutoran = useRef(false)
  const {
    bootstrapRuntime,
    canRun,
    canTriggerRun,
    isByondLoading,
    isRuntimeBootstrapping,
  } = useRuntimeBootstrap(embedParams.isEmbed)

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<'running' | 'idle'>).detail
      setStatus(detail)
    }

    executorService.addEventListener('status', handleStatus)
    return () => executorService.removeEventListener('status', handleStatus)
  }, [])

  useEffect(() => {
    if (embedParams.isEmbed && embedParams.autorun) {
      void bootstrapRuntime()
    }
  }, [bootstrapRuntime])

  const handleRun = useCallback(() => {
    void (async () => {
      if (!canRun) {
        if (!embedParams.isEmbed) {
          return
        }

        const bootstrapped = await bootstrapRuntime()
        if (!bootstrapped) {
          return
        }
      }

      void executorService.executeImmediate(currentCode)
    })()
  }, [bootstrapRuntime, canRun, currentCode])

  useEffect(() => {
    if (!embedParams.autorun || hasAutoran.current || !canRun) {
      return
    }

    hasAutoran.current = true
    handleRun()
  }, [canRun, handleRun])

  useEffect(() => {
    const handleRequestShare = async () => {
      const url = await buildShareUrl(currentCode)
      try {
        await navigator.clipboard.writeText(url)
        window.alert('Share link copied to clipboard')
      } catch {
        window.prompt('Copy this link', url)
      }
    }

    window.addEventListener('requestShare', handleRequestShare as EventListener)
    return () =>
      window.removeEventListener(
        'requestShare',
        handleRequestShare as EventListener
      )
  }, [currentCode])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Editor
        value={currentCode}
        onChange={setCurrentCode}
        onRun={canTriggerRun ? handleRun : undefined}
        runDisabled={
          canTriggerRun ? isByondLoading || isRuntimeBootstrapping : true
        }
        themeId={themeId}
      />
    </div>
  )
}
