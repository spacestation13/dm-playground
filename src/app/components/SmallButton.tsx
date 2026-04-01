import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

interface SmallButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'muted' | 'primary' | 'danger'
  size?: 'sm' | 'md'
  className?: string
}

export const SmallButton = forwardRef<HTMLButtonElement, SmallButtonProps>(
  function SmallButton(
    { variant = 'default', size = 'sm', className, type = 'button', ...rest },
    ref
  ) {
    const base = 'inline-flex items-center gap-2 font-semibold border'
    const sizeClass =
      size === 'md'
        ? 'rounded-md px-2 py-1 text-sm whitespace-nowrap'
        : 'rounded pl-2 py-1 text-xs'

    const variantMap: Record<
      NonNullable<SmallButtonProps['variant']>,
      string
    > = {
      default:
        'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500',
      muted:
        'border-[var(--editor-input-border)] bg-[var(--editor-input-bg)] text-[var(--editor-text)] hover:border-[var(--editor-button-border-hover)] hover:bg-[var(--editor-button-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50',
      primary:
        'border-[var(--editor-button-border)] bg-[var(--editor-button-bg)] text-[var(--editor-button-text)] hover:border-[var(--editor-button-border-hover)] hover:bg-[var(--editor-button-bg-hover)] hover:text-[var(--editor-button-text-hover)] disabled:cursor-not-allowed disabled:opacity-50',
      danger:
        'border-red-700/70 bg-red-950/40 text-red-200 hover:border-red-500',
    }

    const classes = [base, sizeClass, variantMap[variant], className]
      .filter(Boolean)
      .join(' ')

    return <button ref={ref} type={type} {...rest} className={classes} />
  }
)

SmallButton.displayName = 'SmallButton'
