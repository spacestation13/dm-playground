import { useEffect, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

type DraftNumberInputOptions = {
  value: number
  min: number
  max: number
  setValue: (value: number) => void
}

export function useDraftNumberInput({
  value,
  min,
  max,
  setValue,
}: DraftNumberInputOptions) {
  const [draft, setDraft] = useState(() => String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commitDraft = (nextDraft: string, clamp = false) => {
    const trimmed = nextDraft.trim()
    if (trimmed.length === 0) {
      setDraft(String(value))
      return
    }

    const parsed = Number.parseInt(trimmed, 10)
    if (Number.isNaN(parsed)) {
      setDraft(String(value))
      return
    }

    const nextValue = clamp ? Math.min(max, Math.max(min, parsed)) : parsed
    if (nextValue < min || nextValue > max) {
      return
    }

    setValue(nextValue)
    setDraft(String(nextValue))
  }

  return {
    value: draft,
    onChange: (nextDraft: string) => {
      if (!/^\d*$/u.test(nextDraft)) {
        return
      }

      setDraft(nextDraft)
      if (nextDraft.length === 0) {
        return
      }

      const parsed = Number.parseInt(nextDraft, 10)
      if (Number.isNaN(parsed) || parsed < min || parsed > max) {
        return
      }

      setValue(parsed)
    },
    onBlur: () => {
      commitDraft(draft, true)
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur()
        return
      }

      if (event.key === 'Escape') {
        setDraft(String(value))
        event.currentTarget.blur()
      }
    },
  }
}
