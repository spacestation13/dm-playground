import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

import { ensureDmTextmate } from '../monaco/setupTextmate'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}

export function Editor({ value, onChange, onRun }: EditorProps) {
  const handleMount: OnMount = async (_editor, monaco) => {
    monaco.languages.register({ id: 'dm' })
    await ensureDmTextmate(monaco as typeof Monaco)
  }

  return (
    <div className="relative h-full min-h-0">
      <button
        type="button"
        onClick={onRun}
        disabled={!onRun}
        className="absolute right-2 top-2 z-50 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
      >
        Run Code
      </button>
      <div className="absolute inset-0 overflow-hidden rounded border border-slate-800 bg-slate-950/50">
        <MonacoEditor
          value={value}
          height="100%"
          theme="vs-dark"
          language="dm"
          onMount={handleMount}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
          }}
        />
      </div>
    </div>
  )
}
