import CodeMirror from '@uiw/react-codemirror'
import { dracula } from '@uiw/codemirror-theme-dracula'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}

export function Editor({ value, onChange, onRun }: EditorProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onRun}
          disabled={!onRun}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
        >
          Run Code
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden rounded border border-slate-800 bg-slate-950/50">
        <CodeMirror
          value={value}
          height="100%"
          className="h-full"
          theme={dracula}
          basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
