import { useMemo, useState } from 'react'
import { Base64 } from 'js-base64'
import { Editor } from '../components/Editor'
import { commandQueueService } from '../../services/commandQueueSingleton'

const DEFAULT_CODE = `// Write your DM code here\n`

const wrapTemplate = (code: string) => `// DM Playground\n\n${code}\n`

export function EditorPanel() {
  const seededCode = useMemo(() => {
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
  }, [])

  const [value, setValue] = useState(seededCode)

  const handleRun = () => {
    const process = commandQueueService.run('dreammaker', ['--noop'])
    process.emitStdout(`Running code (${value.length} chars)\n`)
    commandQueueService.poll()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Editor value={value} onChange={setValue} onRun={handleRun} />
    </div>
  )
}
