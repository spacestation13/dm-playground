import { createContext } from 'react'
import type { EditorThemeId } from '../monaco/themes'

export interface ThemeContextValue {
  themeId: EditorThemeId
  setThemeId: (themeId: EditorThemeId) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
