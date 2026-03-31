interface ProgressBarProps {
  /** Progress value from 0 to 1 */
  value: number
  /** Optional: className for outer container */
  className?: string
  /** Optional: aria-label */
  label?: string
}

export function ProgressBar({
  value,
  className = '',
  label,
}: ProgressBarProps) {
  const percent = Math.round(value * 100)
  return (
    <div
      className={`relative w-18 h-4 bg-[var(--editor-button-bg)] rounded overflow-hidden border border-slate-700 ${className}`}
      aria-label={label || 'Progress'}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="absolute left-0 top-0 h-full bg-[var(--editor-button-border-hover)] transition-all"
        style={{ width: `${percent}%` }}
      />
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs tabular-nums px-1 py-0.5 font-bold bg-black/70 text-white rounded"
        style={{ pointerEvents: 'none' }}
      >
        {percent}%
      </span>
    </div>
  )
}
