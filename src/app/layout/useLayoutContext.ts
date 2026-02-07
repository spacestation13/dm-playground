import { useContext } from 'react'
import { LayoutContext } from './layoutContextState'

export function useLayoutContext() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error(
      'LayoutContext is missing. Wrap components with LayoutProvider.'
    )
  }
  return context
}
