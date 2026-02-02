import { useState } from 'react'
import { Base64 } from 'js-base64'
import { Editor } from '../components/Editor'
import { executorService } from '../../services/executorSingleton'

const DEFAULT_CODE = `// Write your DM code here\n`

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

  const handleRun = () => {
    void executorService.executeImmediate(value)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Editor value={value} onChange={setValue} onRun={handleRun} />
    </div>
  )
}
