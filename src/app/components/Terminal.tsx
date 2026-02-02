interface TerminalProps {
  label: string
}

export function Terminal({ label }: TerminalProps) {
  return (
    <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-700 bg-slate-950/40 text-xs text-slate-500">
      {label}
    </div>
  )
}
