import { useEffect, useState } from 'react'
import { Base64 } from 'js-base64'
import { Editor } from '../components/Editor'
import { executorService } from '../../services/ExecutorService'
import {
  ByondEvent,
  ByondStatus,
  byondService,
} from '../../services/ByondService'
import { useTheme } from '../theme/useTheme'

const DEFAULT_CODE = `/world/New()\n  world.log << "meow"\n  ..()\n  eval("")\n  shutdown()\n`

const getSeededCode = () => {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('code')
  if (encoded) {
    try {
      return Base64.decode(encoded)
    } catch {
      return DEFAULT_CODE
    }
  }
  return DEFAULT_CODE
}

export function EditorPanel() {
  const [currentCode, setCurrentCode] = useState(() => getSeededCode())
  const [, setStatus] = useState<'running' | 'idle'>('idle')
  const [isByondReady, setIsByondReady] = useState(() => {
    const activeVersion = byondService.getActiveVersion()
    if (!activeVersion) {
      return false
    }
    return byondService.getStatus(activeVersion) === ByondStatus.Installed
  })
  const [isByondLoading, setIsByondLoading] = useState(false)
  const { themeId } = useTheme()

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<'running' | 'idle'>).detail
      setStatus(detail)
    }

    executorService.addEventListener('status', handleStatus)
    return () => executorService.removeEventListener('status', handleStatus)
  }, [])

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

  const canRun = isByondReady && !isByondLoading

  useEffect(() => {
    const handleRequestShare = async () => {
      const encoded = Base64.encode(currentCode)
      const url = `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(
        encoded
      )}`
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

  const handleRun = () => {
    if (!canRun) {
      return
    }
    void executorService.executeImmediate(currentCode)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Editor
        value={currentCode}
        onChange={setCurrentCode}
        onRun={canRun ? handleRun : undefined}
        themeId={themeId}
      />
    </div>
  )
}
