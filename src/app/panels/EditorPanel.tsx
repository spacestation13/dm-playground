import { useEffect, useState } from 'react'
import { Base64 } from 'js-base64'
import { Editor } from '../components/Editor'
import { executorService } from '../../services/executorSingleton'
import { byondService } from '../../services/byondSingleton'

const DEFAULT_CODE = `/world/New()\n  world.log << "meow";\n  ..()\n  eval("")\n  shutdown()\n`

const wrapTemplate = (code: string) => `// DM Playground\n\n${code}\n`

const getSeededCode = () => {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('code')
  if (encoded) {
    try {
      return wrapTemplate(Base64.decode(encoded))
    } catch {
      return wrapTemplate(DEFAULT_CODE)
    }
  }
  return wrapTemplate(DEFAULT_CODE)
}

export function EditorPanel() {
  const [value, setValue] = useState(() => getSeededCode())
  const [, setStatus] = useState<'running' | 'idle'>('idle')
  const [activeByond, setActiveByond] = useState<string | null>(() => byondService.getActiveVersion())

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<'running' | 'idle'>).detail
      setStatus(detail)
    }

    executorService.addEventListener('status', handleStatus)
    return () => executorService.removeEventListener('status', handleStatus)
  }, [])

  useEffect(() => {
    const handleActive = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail
      setActiveByond(detail)
    }
    byondService.addEventListener('active', handleActive)
    return () => byondService.removeEventListener('active', handleActive)
  }, [])

  const handleRun = () => {
    if (!activeByond) {
      return
    }
    void executorService.executeImmediate(value)
  }


  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Editor value={value} onChange={setValue} onRun={handleRun} />
    </div>
  )
}
