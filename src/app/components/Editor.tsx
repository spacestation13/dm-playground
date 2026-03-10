import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useEffect, useRef, useState } from 'react'

import { ensureDmTextmate } from '../monaco/setupTextmate'
import { ensureMonacoTheme, type EditorThemeId } from '../monaco/themes'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
  themeId: EditorThemeId
}

let dmLanguageRegistered = false
let dmCompletionProviderRegistered = false

export function Editor({ value, onChange, onRun, themeId }: EditorProps) {
  const monacoRef = useRef<typeof Monaco | null>(null)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const [tabSize, setTabSize] = useState(2)

  const handleMount: OnMount = async (editor, monaco) => {
    monacoRef.current = monaco as typeof Monaco
    editorRef.current = editor
    if (!dmLanguageRegistered) {
      monaco.languages.register({ id: 'dm' })
      dmLanguageRegistered = true
    }

    if (!dmCompletionProviderRegistered) {
      monaco.languages.registerCompletionItemProvider('dm', {
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
      dmCompletionProviderRegistered = true
    }
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

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    editor.updateOptions({
      tabSize,
      insertSpaces: false,
      detectIndentation: false,
      fontSize: 14,
    })

    editor.getModel()?.updateOptions({
      insertSpaces: false,
      tabSize,
      indentSize: tabSize,
      trimAutoWhitespace: true,
    })
  }, [tabSize])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded border border-slate-800 bg-slate-950/50">
      <div className="flex items-center justify-end border-b border-slate-800 pl-2 pr-1 py-1">
        <span className="text-xs font-semibold text-slate-300 mr-auto">
          DM Editor
        </span>
        <span className="mr-2 text-xs text-slate-300">Font size 14</span>
        <span className="mr-2 h-4 w-px bg-slate-700" aria-hidden="true" />
        <label className="mr-2 inline-flex items-center gap-1.5 text-xs text-slate-300">
          <span>Tab size</span>
          <input
            type="number"
            min={1}
            max={8}
            value={tabSize}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10)
              if (Number.isNaN(parsed)) {
                return
              }
              setTabSize(Math.max(1, Math.min(8, parsed)))
            }}
            className="w-14 rounded border border-slate-700 bg-slate-950/60 px-1 py-0.5 text-xs text-slate-200"
          />
        </label>
        <span className="mr-2 h-4 w-px bg-slate-700" aria-hidden="true" />
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
            renderWhitespace: 'all',
            detectIndentation: false,
            insertSpaces: false,
            tabSize,
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: 14,
          }}
        />
      </div>
    </div>
  )
}
