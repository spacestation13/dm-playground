import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface SmallInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const SmallInput = forwardRef<HTMLInputElement, SmallInputProps>(
  function SmallInput({ className, ...props }, ref) {
    const base =
      'rounded border border-[var(--editor-input-border)] bg-[var(--editor-input-bg)] px-1 py-0.5 text-xs text-[var(--editor-text)]'
    return (
      <input
        ref={ref}
        {...props}
        className={[base, className].filter(Boolean).join(' ')}
      />
    )
  }
)

SmallInput.displayName = 'SmallInput'
