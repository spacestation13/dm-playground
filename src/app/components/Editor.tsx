import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useEffect, useRef } from 'react'

import { ensureDmTextmate } from '../monaco/setupTextmate'
import { ensureMonacoTheme, type EditorThemeId } from '../monaco/themes'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
  themeId: EditorThemeId
}

export function Editor({ value, onChange, onRun, themeId }: EditorProps) {
  const monacoRef = useRef<typeof Monaco | null>(null)

  const handleMount: OnMount = async (_editor, monaco) => {
    monacoRef.current = monaco as typeof Monaco
    monaco.languages.register({ id: 'dm' })
    monaco.languages.registerCompletionItemProvider('dm', {
      triggerCharacters: ['.', ':', '/'],
      provideCompletionItems: (
        model: Monaco.editor.ITextModel,
        position: Monaco.Position
      ) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const keywords = [
          'as',
          'break',
          'catch',
          'const',
          'continue',
          'del',
          'do',
          'else',
          'for',
          'global',
          'goto',
          'if',
          'in',
          'new',
          'proc',
          'return',
          'set',
          'sleep',
          'spawn',
          'static',
          'switch',
          'throw',
          'tmp',
          'try',
          'var',
          'verb',
          'while',
          'world',
          'src',
          'usr',
          'args',
        ]

        const suggestions = keywords.map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range,
        }))

        return { suggestions }
      },
    })
    await ensureMonacoTheme(monaco as typeof Monaco, themeId)
    monaco.editor.setTheme(themeId)
    await ensureDmTextmate(monaco as typeof Monaco)
  }

  useEffect(() => {
    if (!monacoRef.current) {
      return
    }

    void (async () => {
      await ensureMonacoTheme(monacoRef.current as typeof Monaco, themeId)
      monacoRef.current?.editor.setTheme(themeId)
    })()
  }, [themeId])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded border border-slate-800 bg-slate-950/50">
      <div className="flex items-center justify-end border-b border-slate-800 pl-2 pr-1 py-1">
        <span className="text-xs font-semibold text-slate-300 mr-auto">
          DM Editor
        </span>
        <button
          type="button"
          onClick={onRun}
          disabled={!onRun}
          className="rounded-md border border-emerald-700/70 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run Code
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <MonacoEditor
          value={value}
          height="100%"
          theme={themeId}
          language="dm"
          onMount={handleMount}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            contextmenu: false,
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
