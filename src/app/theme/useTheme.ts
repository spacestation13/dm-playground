import { useContext } from 'react'
import { ThemeContext } from './ThemeContextState'

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
