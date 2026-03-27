interface MobileEditorClipboardButtonsProps {
  canCopy: boolean
  canPaste: boolean
  onCopy: () => void
  onPaste: () => void
}

function CopyIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 9h9v11H9zM6 6h9v2H8v9H6z" fill="currentColor" />
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 3h6l1 2h3v16H5V5h3zm1.2 4H7v12h10V7h-3.2l-1-2h-1.6z"
        fill="currentColor"
      />
    </svg>
  )
}

export function MobileEditorClipboardButtons({
  canCopy,
  canPaste,
  onCopy,
  onPaste,
}: MobileEditorClipboardButtonsProps) {
  const buttonClassName =
    'inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--editor-input-border)] bg-[var(--editor-input-bg)] text-[var(--editor-text)] hover:border-[var(--editor-button-border-hover)] hover:bg-[var(--editor-button-bg-hover)] disabled:cursor-not-allowed disabled:opacity-45'

  return (
    <div className="mr-2 inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Copy selection"
        title="Copy selection"
        onClick={onCopy}
        disabled={!canCopy}
        className={buttonClassName}
      >
        <CopyIcon />
      </button>
      <button
        type="button"
        aria-label="Paste clipboard"
        title="Paste clipboard"
        onClick={onPaste}
        disabled={!canPaste}
        className={buttonClassName}
      >
        <PasteIcon />
      </button>
    </div>
  )
}
