import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useEffect, useMemo, useRef } from 'react'
import type { MouseEvent } from 'react'
import { MobileEditorClipboardButtons } from './MobileEditorClipboardButtons'
import { SmallInput } from './SmallInput'
import { embedParams, buildShareUrl } from '../embed/embedParams'
import { createDefaultProject } from '../editorProject/projectState'
import type { EditableProjectFileName } from '../editorProject/projectState'
import { dmCompletionKeywords, ensureDmLanguage } from '../monaco/dmLanguage'
import { ensureMonacoTheme, type EditorThemeId } from '../monaco/themes'
import { useMobileEditorClipboardActions } from '../hooks/useMobileEditorClipboardActions'
import { useDraftNumberInput } from '../hooks/useDraftNumberInput'
import {
  detectTouchInput,
  installTouchSelectionHandler,
  syncTouchSelectionMode,
} from '../monaco/touchSelection'
import { installTouchScrollHandoff } from '../monaco/touchScrollHandoff'
import { useApplyThemeVariables } from '../hooks/useApplyThemeVariables'
import useUIStore from '../stores/uiStore'
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
  // use global UI store for responsive breakpoint
  const showInlineSettings = useUIStore((s) => s.isWideEditorControls)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const contextViewSyncCleanupRef = useRef<(() => void) | null>(null)
  const touchSelectionCleanupRef = useRef<(() => void) | null>(null)
  const touchScrollCleanupRef = useRef<(() => void) | null>(null)
  const [tabSize, setTabSize] = useTabSizeSetting()
  const [fontSize, setFontSize] = useFontSizeSetting()
  const [fontFamily] = useFontFamilySetting()
  const fontSizeInput = useDraftNumberInput({
    value: fontSize,
    min: 8,
    max: 40,
    setValue: setFontSize,
  })
  const tabSizeInput = useDraftNumberInput({
    value: tabSize,
    min: 1,
    max: 8,
    setValue: setTabSize,
  })
  const touchSelectionEnabled = useMemo(() => detectTouchInput(), [])
  const {
    bindEditor,
    canCopy,
    canPaste,
    copySelection,
    copySupported,
    pasteClipboard,
    pasteSupported,
  } = useMobileEditorClipboardActions(touchSelectionEnabled)
  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0],
    [activeFileId, files]
  )
  const showFileTabs = files.length > 1
  const applyThemeVariables = useApplyThemeVariables()

  const handleOpenPlayground = async (ev: MouseEvent<HTMLAnchorElement>) => {
    ev.preventDefault()
    const main = files.find((f) => f.id === 'main')?.value ?? activeFile.value
    const bootstrap =
      files.find((f) => f.id === 'bootstrap')?.value ??
      createDefaultProject().files.bootstrap

    try {
      const url = buildShareUrl({ files: { main, bootstrap } })
      window.open(url, '_blank', 'noopener')
    } catch {
      window.open('https://play.dm-lang.org', '_blank', 'noopener')
    }
  }

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
    bindEditor(editor)
    syncTouchSelectionMode(editor, touchSelectionEnabled)
    touchSelectionCleanupRef.current?.()
    touchScrollCleanupRef.current?.()
    touchSelectionCleanupRef.current = installTouchSelectionHandler(
      editor,
      touchSelectionEnabled
    )
    touchScrollCleanupRef.current = installTouchScrollHandoff(
      editor,
      touchSelectionEnabled
    )
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
      const { installHighlightingTestBridge } =
        await import('../monaco/highlightingTestBridge')
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

    syncTouchSelectionMode(editor, touchSelectionEnabled)
    bindEditor(editor)

    editor.updateOptions({
      dragAndDrop: !touchSelectionEnabled,
      tabSize,
      fontSize,
      fontFamily,
    })

    editor.getModel()?.updateOptions({
      tabSize,
      indentSize: tabSize,
    })
  }, [
    activeFileId,
    tabSize,
    fontSize,
    fontFamily,
    bindEditor,
    touchSelectionEnabled,
  ])

  useEffect(() => {
    return () => {
      contextViewSyncCleanupRef.current?.()
      contextViewSyncCleanupRef.current = null
      touchSelectionCleanupRef.current?.()
      touchSelectionCleanupRef.current = null
      bindEditor(null)
      touchScrollCleanupRef.current?.()
      touchScrollCleanupRef.current = null
    }
  }, [bindEditor])

  if (!activeFile) {
    return null
  }

  return (
    <div
      ref={shellRef}
      className={[
        'dm-editor-shell flex h-full min-h-0 flex-col overflow-hidden rounded border border-[var(--editor-border)] bg-[var(--editor-bg)]',
        touchSelectionEnabled ? 'dm-editor-shell-touch' : '',
      ].join(' ')}
    >
      <div className="flex items-center border-b border-[var(--editor-border)] bg-[var(--editor-header-bg)] pl-2 pr-1 py-1">
        {touchSelectionEnabled && (copySupported || pasteSupported) && (
          <MobileEditorClipboardButtons
            canCopy={canCopy}
            canPaste={canPaste}
            onCopy={() => {
              void copySelection()
            }}
            onPaste={() => {
              void pasteClipboard()
            }}
          />
        )}
        {embedParams.isEmbed ? (
          <a
            href="#"
            onClick={handleOpenPlayground}
            className="text-xs font-semibold text-[var(--editor-text)] mr-auto underline"
          >
            DM Playground
          </a>
        ) : (
          <span className="text-xs font-semibold text-[var(--editor-text)] mr-auto"></span>
        )}
        {showInlineSettings && (
          <>
            <label className="mr-1 inline-flex items-center gap-0 text-xs text-[var(--editor-text)]">
              <span className="mr-1">Font size</span>
              <SmallInput
                type="text"
                inputMode="numeric"
                enterKeyHint="done"
                pattern="[0-9]*"
                value={fontSizeInput.value}
                onChange={(event) => {
                  fontSizeInput.onChange(event.target.value)
                }}
                onBlur={fontSizeInput.onBlur}
                onKeyDown={fontSizeInput.onKeyDown}
                className="w-6"
              />
            </label>
            <span
              className="mr-1 h-4 w-px bg-[var(--editor-border)]"
              aria-hidden="true"
            />
            {!touchSelectionEnabled && (
              <>
                <label className="mr-1 inline-flex items-center gap-0 text-xs text-[var(--editor-text)]">
                  <span className="mr-1">Tab size</span>
                  <SmallInput
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="done"
                    pattern="[0-9]*"
                    value={tabSizeInput.value}
                    onChange={(event) => {
                      tabSizeInput.onChange(event.target.value)
                    }}
                    onBlur={tabSizeInput.onBlur}
                    onKeyDown={tabSizeInput.onKeyDown}
                    className="w-5"
                  />
                </label>
                <span
                  className="mr-1 h-4 w-px bg-[var(--editor-border)]"
                  aria-hidden="true"
                />
              </>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onRun}
          disabled={runDisabled}
          className="rounded-md whitespace-nowrap border border-[var(--editor-button-border)] bg-[var(--editor-button-bg)] pl-2 py-1 text-xs font-semibold text-[var(--editor-button-text)] hover:border-[var(--editor-button-border-hover)] hover:bg-[var(--editor-button-bg-hover)] hover:text-[var(--editor-button-text-hover)] disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-2"
        >
          Run Code
          <svg
            className="h-4 w-4"
            viewBox="8 2 18 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M8 5v14l11-7z" fill="var(--editor-button-border)" />
          </svg>
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
            insertSpaces: true,
            // lightbulb: { enabled: Monaco.editor.ShowLightbulbIconMode.Off },
            lineNumbers: 'on',
            lineNumbersMinChars: 2,
            lineDecorationsWidth: 3,
            links: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderWhitespace: 'all',
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
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
