import type * as Monaco from 'monaco-editor'
import type {
  TouchSelectionLifecycleCallbacks,
  TouchSelectionSnapshot,
} from './touchSelection'

const NATIVE_TOUCH_SELECTION_ATTRIBUTE = 'data-dm-native-touch-selection'
const MIRROR_EDGE_GUTTER_PX = 12
const MIRROR_MAX_WIDTH_PX = 320
const MIRROR_MIN_WIDTH_PX = 48
const MIRROR_MIN_HEIGHT_PX = 28

export interface TouchNativeSelectionBridge {
  callbacks: TouchSelectionLifecycleCallbacks
  dispose: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getEditorSelection(
  editor: Monaco.editor.IStandaloneCodeEditor,
  fallback: Monaco.Selection | null
) {
  const selection = editor.getSelection()
  if (selection && !selection.isEmpty()) {
    return selection
  }

  return fallback && !fallback.isEmpty() ? fallback : null
}

function getSelectedEditorText(
  editor: Monaco.editor.IStandaloneCodeEditor,
  selection: Monaco.Selection | null
) {
  const model = editor.getModel()
  if (!model || !selection) {
    return ''
  }

  return model.getValueInRange(selection)
}

function setCollapsedSelection(
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

function replaceEditorSelection(
  editor: Monaco.editor.IStandaloneCodeEditor,
  selection: Monaco.Selection,
  text: string
) {
  const model = editor.getModel()
  if (!model) {
    return
  }

  const startOffset = model.getOffsetAt(selection.getStartPosition())
  editor.executeEdits('touch-native-selection', [
    {
      range: selection,
      text,
      forceMoveMarkers: true,
    },
  ])
  setCollapsedSelection(editor, startOffset + text.length)
}

function createMirrorElement() {
  const mirror = document.createElement('div')
  mirror.setAttribute(NATIVE_TOUCH_SELECTION_ATTRIBUTE, 'true')
  mirror.setAttribute('contenteditable', 'true')
  mirror.setAttribute('role', 'textbox')
  mirror.setAttribute('aria-multiline', 'true')
  mirror.autocapitalize = 'off'
  mirror.spellcheck = false
  mirror.tabIndex = -1
  mirror.style.position = 'fixed'
  mirror.style.left = '0'
  mirror.style.top = '0'
  mirror.style.minWidth = `${MIRROR_MIN_WIDTH_PX}px`
  mirror.style.minHeight = `${MIRROR_MIN_HEIGHT_PX}px`
  mirror.style.maxWidth = `${MIRROR_MAX_WIDTH_PX}px`
  mirror.style.padding = '2px 4px'
  mirror.style.margin = '0'
  mirror.style.border = '0'
  mirror.style.outline = 'none'
  mirror.style.background = 'rgba(255, 255, 255, 0.015)'
  mirror.style.color = 'transparent'
  mirror.style.caretColor = 'transparent'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordBreak = 'break-word'
  mirror.style.overflow = 'hidden'
  mirror.style.userSelect = 'text'
  mirror.style.webkitUserSelect = 'text'
  mirror.style.zIndex = '2147483647'
  return mirror
}

function selectMirrorContents(mirror: HTMLDivElement) {
  const selection = window.getSelection()
  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(mirror)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function createTouchNativeSelectionBridge(
  editor: Monaco.editor.IStandaloneCodeEditor,
  enabled: boolean
): TouchNativeSelectionBridge {
  if (
    !enabled ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return {
      callbacks: {},
      dispose: () => {},
    }
  }

  let activeSnapshot: TouchSelectionSnapshot | null = null
  let mirror: HTMLDivElement | null = null
  let mirrorText = ''
  let selectionFrame: number | null = null
  let selectionTimeout: number | null = null

  const clearScheduledSelection = () => {
    if (selectionFrame !== null) {
      window.cancelAnimationFrame(selectionFrame)
      selectionFrame = null
    }
    if (selectionTimeout !== null) {
      window.clearTimeout(selectionTimeout)
      selectionTimeout = null
    }
  }

  const getMirror = () => {
    if (mirror) {
      return mirror
    }

    mirror = createMirrorElement()
    mirror.addEventListener('copy', handleCopy)
    mirror.addEventListener('cut', handleCut)
    mirror.addEventListener('paste', handlePaste)
    mirror.addEventListener('input', handleInput)
    document.body.appendChild(mirror)
    return mirror
  }

  const clearMirrorSelection = () => {
    const selection = window.getSelection()
    if (!selection) {
      return
    }

    if (
      mirror &&
      selection.anchorNode &&
      mirror.contains(selection.anchorNode)
    ) {
      selection.removeAllRanges()
    }
  }

  const clearMirror = () => {
    clearScheduledSelection()
    clearMirrorSelection()
    activeSnapshot = null
    mirrorText = ''

    if (!mirror) {
      return
    }

    mirror.remove()
    mirror = null
  }

  const focusMirror = () => {
    if (!mirror) {
      return
    }

    mirror.focus({ preventScroll: true })
    selectMirrorContents(mirror)
  }

  const scheduleMirrorSelection = () => {
    focusMirror()
    selectionFrame = window.requestAnimationFrame(() => {
      selectionFrame = null
      focusMirror()
    })
    selectionTimeout = window.setTimeout(() => {
      selectionTimeout = null
      focusMirror()
    }, 40)
  }

  const positionMirror = (
    nextMirror: HTMLDivElement,
    snapshot: TouchSelectionSnapshot
  ) => {
    const maxLeft = Math.max(
      MIRROR_EDGE_GUTTER_PX,
      window.innerWidth - MIRROR_MAX_WIDTH_PX - MIRROR_EDGE_GUTTER_PX
    )
    const left = clamp(
      snapshot.clientX - MIRROR_MAX_WIDTH_PX / 2,
      MIRROR_EDGE_GUTTER_PX,
      maxLeft
    )
    const top = clamp(
      snapshot.clientY - MIRROR_MIN_HEIGHT_PX - MIRROR_EDGE_GUTTER_PX,
      MIRROR_EDGE_GUTTER_PX,
      Math.max(MIRROR_EDGE_GUTTER_PX, window.innerHeight - MIRROR_MIN_HEIGHT_PX)
    )

    nextMirror.style.left = `${left}px`
    nextMirror.style.top = `${top}px`
  }

  const syncMirrorFromSnapshot = (snapshot: TouchSelectionSnapshot | null) => {
    const selection = snapshot?.selection ?? null
    const text = selection ? getSelectedEditorText(editor, selection) : ''

    if (!snapshot || !selection || text.length === 0) {
      clearMirror()
      return
    }

    activeSnapshot = snapshot
    mirrorText = text

    const nextMirror = getMirror()
    nextMirror.textContent = text
    positionMirror(nextMirror, snapshot)
    scheduleMirrorSelection()
  }

  const commitMirrorText = (nextText: string) => {
    const selection = getEditorSelection(
      editor,
      activeSnapshot?.selection ?? null
    )
    if (!selection) {
      clearMirror()
      return
    }

    replaceEditorSelection(editor, selection, nextText)
    clearMirror()
    editor.focus()
  }

  const handleCopy = (event: ClipboardEvent) => {
    const selection = getEditorSelection(
      editor,
      activeSnapshot?.selection ?? null
    )
    if (!selection) {
      return
    }

    const text = getSelectedEditorText(editor, selection)
    if (!text || !event.clipboardData) {
      return
    }

    event.preventDefault()
    event.clipboardData.setData('text/plain', text)
  }

  const handleCut = (event: ClipboardEvent) => {
    const selection = getEditorSelection(
      editor,
      activeSnapshot?.selection ?? null
    )
    if (!selection) {
      return
    }

    const text = getSelectedEditorText(editor, selection)
    if (!text) {
      return
    }

    if (event.clipboardData) {
      event.preventDefault()
      event.clipboardData.setData('text/plain', text)
      commitMirrorText('')
    }
  }

  const handlePaste = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text/plain')
    if (typeof text !== 'string') {
      return
    }

    event.preventDefault()
    commitMirrorText(text)
  }

  const handleInput = () => {
    if (!mirror || activeSnapshot === null) {
      return
    }

    const nextText = mirror.textContent ?? ''
    if (nextText === mirrorText) {
      return
    }

    commitMirrorText(nextText)
  }

  const handleEditorSelectionChange = editor.onDidChangeCursorSelection(() => {
    const selection = editor.getSelection()
    if (!selection || selection.isEmpty()) {
      clearMirror()
    }
  })

  const syncMirrorWithListeners = (snapshot: TouchSelectionSnapshot | null) => {
    if (snapshot?.selection) {
      getMirror()
    }

    syncMirrorFromSnapshot(snapshot)
  }

  return {
    callbacks: {
      onSelectionComplete: (snapshot) => {
        syncMirrorWithListeners(snapshot)
      },
      onSelectionReset: () => {
        clearMirror()
      },
    },
    dispose: () => {
      handleEditorSelectionChange.dispose()
      if (mirror) {
        mirror.removeEventListener('copy', handleCopy)
        mirror.removeEventListener('cut', handleCut)
        mirror.removeEventListener('paste', handlePaste)
        mirror.removeEventListener('input', handleInput)
      }
      clearMirror()
    },
  }
}

export { NATIVE_TOUCH_SELECTION_ATTRIBUTE }
