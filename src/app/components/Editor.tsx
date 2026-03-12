import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useEffect, useMemo, useRef } from 'react'

import type { EditableProjectFileName } from '../editorProject/projectState'
import { ensureDmTextmate } from '../monaco/setupTextmate'
import { ensureMonacoTheme, type EditorThemeId } from '../monaco/themes'
import {
  useFontFamilySetting,
  useFontSizeSetting,
  useTabSizeSetting,
} from '../settings/localSettings'

interface EditorFileTab {
  id: EditableProjectFileName
  label: string
  value: string
}

interface EditorProps {
  files: EditorFileTab[]
  activeFileId: EditableProjectFileName
  onActiveFileChange: (fileId: EditableProjectFileName) => void
  onChange: (fileId: EditableProjectFileName, value: string) => void
  onRun?: () => void
  runDisabled?: boolean
  themeId: EditorThemeId
}

let dmLanguageRegistered = false
let dmCompletionProviderRegistered = false

export function Editor({
  files,
  activeFileId,
  onActiveFileChange,
  onChange,
  onRun,
  runDisabled = !onRun,
  themeId,
}: EditorProps) {
  const monacoRef = useRef<typeof Monaco | null>(null)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const [tabSize, setTabSize] = useTabSizeSetting()
  const [fontSize, setFontSize] = useFontSizeSetting()
  const [fontFamily] = useFontFamilySetting()
  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0],
    [activeFileId, files]
  )

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
      fontSize,
      fontFamily,
    })

    editor.getModel()?.updateOptions({
      insertSpaces: false,
      tabSize,
      indentSize: tabSize,
      trimAutoWhitespace: true,
    })
  }, [activeFileId, tabSize, fontSize, fontFamily])

  if (!activeFile) {
    return null
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded border border-slate-800 bg-[#1e1e1e]">
      <div className="flex items-center justify-end border-b border-slate-800 bg-slate-900/80 pl-2 pr-1 py-1">
        <span className="text-xs font-semibold text-slate-300 mr-auto">
          DM Editor
        </span>
        <label className="mr-2 inline-flex items-center gap-1.5 text-xs text-slate-300">
          <span>Font size</span>
          <input
            type="number"
            min={8}
            max={40}
            value={fontSize}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10)
              if (Number.isNaN(parsed)) {
                return
              }
              setFontSize(parsed)
            }}
            className="w-14 rounded border border-slate-700 bg-slate-950/60 px-1 py-0.5 text-xs text-slate-200"
          />
        </label>
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
              setTabSize(parsed)
            }}
            className="w-14 rounded border border-slate-700 bg-slate-950/60 px-1 py-0.5 text-xs text-slate-200"
          />
        </label>
        <span className="mr-2 h-4 w-px bg-slate-700" aria-hidden="true" />
        <button
          type="button"
          onClick={onRun}
          disabled={runDisabled}
          className="rounded-md border border-emerald-700/70 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run Code
        </button>
      </div>
      <div className="flex items-end gap-px border-b border-slate-800 bg-[#252526] px-2 pt-1">
        {files.map((file) => {
          const isActive = file.id === activeFile.id
          return (
            <button
              key={file.id}
              type="button"
              onClick={() => onActiveFileChange(file.id)}
              className={[
                'relative min-w-24 border border-b-0 px-3 py-1.5 text-left text-xs leading-none transition-colors',
                isActive
                  ? 'border-slate-700 bg-[#1e1e1e] text-slate-100'
                  : 'border-transparent bg-[#2d2d2d] text-slate-400 hover:bg-[#323233] hover:text-slate-200',
              ].join(' ')}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 bg-sky-400"
                />
              )}
              {file.label}
            </button>
          )
        })}
      </div>
      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        <MonacoEditor
          path={activeFile.id}
          value={activeFile.value}
          height="100%"
          loading={null}
          theme={themeId}
          language="dm"
          onMount={handleMount}
          saveViewState
          onChange={(nextValue) => onChange(activeFile.id, nextValue ?? '')}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            lineNumbersMinChars: 4,
            lineDecorationsWidth: 10,
            glyphMargin: false,
            contextmenu: false,
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            renderWhitespace: 'all',
            detectIndentation: false,
            insertSpaces: false,
            tabSize,
            fontFamily,
            fontSize,
          }}
        />
      </div>
    </div>
  )
}
