import type * as Monaco from 'monaco-editor'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface MobileEditorClipboardActions {
  canCopy: boolean
  canPaste: boolean
  copySupported: boolean
  pasteSupported: boolean
  bindEditor: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void
  copySelection: () => Promise<void>
  pasteClipboard: () => Promise<void>
}

function getClipboardSupport() {
  if (typeof navigator === 'undefined') {
    return {
      copySupported: false,
      pasteSupported: false,
    }
  }

  return {
    copySupported: typeof navigator.clipboard?.writeText === 'function',
    pasteSupported: typeof navigator.clipboard?.readText === 'function',
  }
}

function getInsertionRange(editor: Monaco.editor.IStandaloneCodeEditor) {
  const selection = editor.getSelection()
  if (selection) {
    return selection
  }

  const position = editor.getPosition()
  if (!position) {
    return null
  }

  return {
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  }
}

function getSelectionText(editor: Monaco.editor.IStandaloneCodeEditor) {
  const model = editor.getModel()
  const selection = editor.getSelection()

  if (!model || !selection || selection.isEmpty()) {
    return ''
  }

  return model.getValueInRange(selection)
}

function collapseSelectionToOffset(
  editor: Monaco.editor.IStandaloneCodeEditor,
  offset: number
) {
  const model = editor.getModel()
  if (!model) {
    return
  }

  const position = model.getPositionAt(offset)
  editor.setSelection({
    selectionStartLineNumber: position.lineNumber,
    selectionStartColumn: position.column,
    positionLineNumber: position.lineNumber,
    positionColumn: position.column,
  })
  editor.revealPositionInCenterIfOutsideViewport(position)
}

export function useMobileEditorClipboardActions(
  enabled: boolean
): MobileEditorClipboardActions {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const selectionListenerRef = useRef<Monaco.IDisposable | null>(null)
  const [hasEditor, setHasEditor] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const { copySupported, pasteSupported } = getClipboardSupport()

  const bindEditor = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor | null) => {
      selectionListenerRef.current?.dispose()
      selectionListenerRef.current = null
      editorRef.current = editor
      setHasEditor(editor !== null)
      setHasSelection(Boolean(editor?.getSelection()?.isEmpty() === false))

      if (!editor || !enabled) {
        return
      }

      selectionListenerRef.current = editor.onDidChangeCursorSelection(
        (event) => {
          setHasSelection(!event.selection.isEmpty())
        }
      )
    },
    [enabled]
  )

  const copySelection = useCallback(async () => {
    if (!enabled || !copySupported) {
      return
    }

    const editor = editorRef.current
    if (!editor) {
      return
    }

    const text = getSelectionText(editor)
    if (!text) {
      return
    }

    await navigator.clipboard.writeText(text)
  }, [copySupported, enabled])

  const pasteClipboard = useCallback(async () => {
    if (!enabled || !pasteSupported) {
      return
    }

    const editor = editorRef.current
    if (!editor) {
      return
    }

    const text = await navigator.clipboard.readText()
    if (typeof text !== 'string') {
      return
    }

    const model = editor.getModel()
    const range = getInsertionRange(editor)
    if (!model || !range) {
      return
    }

    const startOffset = model.getOffsetAt({
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    })

    editor.pushUndoStop()
    editor.executeEdits('mobile-clipboard', [
      {
        range,
        text,
        forceMoveMarkers: true,
      },
    ])
    collapseSelectionToOffset(editor, startOffset + text.length)
    editor.pushUndoStop()
    editor.focus()
  }, [enabled, pasteSupported])

  useEffect(() => {
    if (!enabled) {
      selectionListenerRef.current?.dispose()
      selectionListenerRef.current = null
      editorRef.current = null
      setHasEditor(false)
      setHasSelection(false)
    }

    return () => {
      selectionListenerRef.current?.dispose()
      selectionListenerRef.current = null
    }
  }, [enabled])

  return useMemo(
    () => ({
      canCopy: enabled && copySupported && hasSelection,
      canPaste: enabled && pasteSupported && hasEditor,
      copySupported,
      pasteSupported,
      bindEditor,
      copySelection,
      pasteClipboard,
    }),
    [
      bindEditor,
      copySelection,
      copySupported,
      enabled,
      hasEditor,
      hasSelection,
      pasteClipboard,
      pasteSupported,
    ]
  )
}
