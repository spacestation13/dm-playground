import type { ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeContextState'

export function ThemeProvider({
  value,
  children,
}: {
  value: ThemeContextValue
  children: ReactNode
}) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
