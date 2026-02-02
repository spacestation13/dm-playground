import CodeMirror from '@uiw/react-codemirror'
import { dracula } from '@uiw/codemirror-theme-dracula'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}

export function Editor({ value, onChange, onRun }: EditorProps) {
  return (
    <div className="relative h-full min-h-0">
      <button
        type="button"
        onClick={onRun}
        disabled={!onRun}
        className="absolute right-2 top-2 z-10 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
      >
        Run Code
      </button>
      <div className="absolute inset-0 overflow-hidden rounded border border-slate-800 bg-slate-950/50">
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
