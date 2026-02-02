import { Editor } from '../components/Editor'

export function EditorPanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs text-slate-400">
        Editor panel placeholder. CodeMirror and Run Code will be wired in a later step.
      </p>
      <Editor />
    </div>
  )
}
