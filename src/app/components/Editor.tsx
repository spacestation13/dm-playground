import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useEffect, useMemo, useRef } from 'react'
import type { EditableProjectFileName } from '../editorProject/projectState'
import { dmCompletionKeywords, ensureDmLanguage } from '../monaco/dmLanguage'
import { installHighlightingTestBridge } from '../monaco/highlightingTestBridge'
import { ensureMonacoTheme, type EditorThemeId } from '../monaco/themes'
import { useApplyThemeVariables } from '../hooks/useApplyThemeVariables'
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
  const shellRef = useRef<HTMLDivElement | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const contextViewSyncCleanupRef = useRef<(() => void) | null>(null)
  const [tabSize, setTabSize] = useTabSizeSetting()
  const [fontSize, setFontSize] = useFontSizeSetting()
  const [fontFamily] = useFontFamilySetting()
  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0],
    [activeFileId, files]
  )
  const showFileTabs = files.length > 1
  const applyThemeVariables = useApplyThemeVariables()

  const installContextViewOffsetSync = (
    editor: Monaco.editor.IStandaloneCodeEditor
  ) => {
    contextViewSyncCleanupRef.current?.()

    const shell = shellRef.current
    if (!shell) {
      contextViewSyncCleanupRef.current = null
      return
    }

    const editorContainer = editor.getContainerDomNode()
    const updateContextViewOffset = () => {
      const rect = editorContainer.getBoundingClientRect()
      shell.style.setProperty('--dm-editor-context-offset-x', `${rect.left}px`)
      shell.style.setProperty('--dm-editor-context-offset-y', `${rect.top}px`)
    }

    updateContextViewOffset()

    const layoutListener = editor.onDidLayoutChange(() => {
      updateContextViewOffset()
    })

    window.addEventListener('resize', updateContextViewOffset)

    contextViewSyncCleanupRef.current = () => {
      layoutListener.dispose()
      window.removeEventListener('resize', updateContextViewOffset)
    }
  }

  const handleMount: OnMount = async (editor, monaco) => {
    monacoRef.current = monaco as typeof Monaco
    editorRef.current = editor
    installContextViewOffsetSync(editor)
    ensureDmLanguage(monaco as typeof Monaco)

    // Disable built-in language services for JS, CSS, HTML, & JSON
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    })
    monaco.languages.css.cssDefaults.setOptions({
      validate: false,
    })
    monaco.languages.html.htmlDefaults.setOptions({
      validate: false,
    })
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: false,
    })

    if (import.meta.env.DEV) {
      installHighlightingTestBridge(monaco as typeof Monaco)
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

          const suggestions = dmCompletionKeywords.map((keyword) => ({
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
    applyThemeVariables(themeId)
  }

  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) {
      return
    }

    void (async () => {
      await ensureMonacoTheme(monacoRef.current as typeof Monaco, themeId)
      monacoRef.current?.editor.setTheme(themeId)
      applyThemeVariables(themeId)
    })()
  }, [themeId, applyThemeVariables])

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

  useEffect(() => {
    return () => {
      contextViewSyncCleanupRef.current?.()
      contextViewSyncCleanupRef.current = null
    }
  }, [])

  if (!activeFile) {
    return null
  }

  return (
    <div
      ref={shellRef}
      className="dm-editor-shell flex h-full min-h-0 flex-col overflow-hidden rounded border border-[var(--editor-border)] bg-[var(--editor-bg)]"
    >
      <div className="flex items-center justify-end border-b border-[var(--editor-border)] bg-[var(--editor-header-bg)] pl-2 pr-1 py-1">
        <span className="text-xs font-semibold text-[var(--editor-text)] mr-auto">
          DM Editor
        </span>
        <label className="mr-2 inline-flex items-center gap-1.5 text-xs text-[var(--editor-text)]">
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
            className="w-14 rounded border border-[var(--editor-input-border)] bg-[var(--editor-input-bg)] px-1 py-0.5 text-xs text-[var(--editor-text)]"
          />
        </label>
        <span
          className="mr-2 h-4 w-px bg-[var(--editor-border)]"
          aria-hidden="true"
        />
        <label className="mr-2 inline-flex items-center gap-1.5 text-xs text-[var(--editor-text)]">
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
            className="w-14 rounded border border-[var(--editor-input-border)] bg-[var(--editor-input-bg)] px-1 py-0.5 text-xs text-[var(--editor-text)]"
          />
        </label>
        <span
          className="mr-2 h-4 w-px bg-[var(--editor-border)]"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={onRun}
          disabled={runDisabled}
          className="rounded-md border border-[var(--editor-button-border)] bg-[var(--editor-button-bg)] px-3 py-1 text-xs font-semibold text-[var(--editor-button-text)] hover:border-[var(--editor-button-border-hover)] hover:bg-[var(--editor-button-bg-hover)] hover:text-[var(--editor-button-text-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run Code
        </button>
      </div>
      {showFileTabs && (
        <div className="flex items-end gap-px border-b border-[var(--editor-border)] bg-[var(--editor-tab-bar-bg)] px-2 pt-1">
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
                    ? 'border-[var(--editor-border)] bg-[var(--editor-tab-active-bg)] text-[var(--editor-text)]'
                    : 'border-transparent bg-[var(--editor-tab-inactive-bg)] text-[var(--editor-text)] hover:bg-[var(--editor-tab-hover-bg)] hover:text-[var(--editor-text)]',
                ].join(' ')}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.25 bg-[var(--editor-text)]"
                  />
                )}
                {file.label}
              </button>
            )
          })}
        </div>
      )}
      <div className="flex-1 min-h-0 bg-[var(--editor-bg)]">
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
            codeLens: false,
            colorDecorators: true,
            contextmenu: false,
            detectIndentation: false,
            glyphMargin: false,
            insertSpaces: false,
            // lightbulb: { enabled: Monaco.editor.ShowLightbulbIconMode.Off },
            lineNumbers: 'on',
            lineNumbersMinChars: 4,
            lineDecorationsWidth: 10,
            links: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderWhitespace: 'all',
            tabSize,
            fontFamily,
            fontSize,
            wordWrap: 'off',
          }}
        />
      </div>
    </div>
  )
}
