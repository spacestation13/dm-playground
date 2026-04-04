import { useEffect, useRef, useState } from 'react'

interface ProgressBarProps {
  /** Progress value from 0 to 1 */
  value: number
  /** Optional: className for outer container */
  className?: string
  /** Optional: aria-label */
  label?: string
  /** Optional: delay in ms before showing the bar */
  delayMs?: number
}

export function ProgressBar({
  value,
  className = '',
  label,
  delayMs,
}: ProgressBarProps) {
  const percent = Math.round(value * 100)
  // If no delay, show immediately; if delay, start hidden
  const [show, setShow] = useState(() => (delayMs ? false : value != null))
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (value == null) {
      setShow(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }
    if (!delayMs) {
      setShow(true)
      return
    }
    // Only set timer if not already showing
    if (!show) {
      timeoutRef.current = setTimeout(() => {
        setShow(true)
        timeoutRef.current = null
      }, delayMs)
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs])

  if (!show) return null

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
