import {
  getThemeColors,
  editorThemeOptions,
  type EditorThemeId,
} from '../monaco/themes'

export function useApplyThemeVariables() {
  const applyThemeVariables = (currentThemeId: EditorThemeId) => {
    const colors = getThemeColors(currentThemeId)
    if (!colors) {
      return
    }

    const themeOption = editorThemeOptions.find(
      (option) => option.id === currentThemeId
    )
    const isLight = themeOption?.isLight || false
    const isHighContrast =
      currentThemeId === 'hc-black' || currentThemeId === 'hc-light'
    const root = document.documentElement.style

    root.setProperty(
      '--editor-bg',
      colors['editor.background'] || (isLight ? '#ffffff' : '#1e1e1e')
    )
    root.setProperty(
      '--editor-header-bg',
      colors['activityBar.background'] ||
        colors['editor.background'] ||
        (isLight ? '#f9fafb' : '#0f172a')
    )
    root.setProperty(
      '--editor-tab-bar-bg',
      colors['editorGroup.background'] || (isLight ? '#f3f4f6' : '#252526')
    )
    root.setProperty(
      '--editor-tab-inactive-bg',
      colors['tab.inactiveBackground'] || (isLight ? '#e5e7eb' : '#2d2d2d')
    )
    root.setProperty(
      '--editor-tab-hover-bg',
      colors['tab.hoverBackground'] || (isLight ? '#d1d5db' : '#323233')
    )
    root.setProperty(
      '--editor-tab-active-bg',
      colors['sideBar.background'] ||
        colors['editor.background'] ||
        (isLight ? '#ffffff' : '#1e1e1e')
    )
    root.setProperty(
      '--editor-border',
      colors['panel.border'] ||
        colors['input.border'] ||
        (isLight ? '#d1d5db' : '#1e293b')
    )
    root.setProperty(
      '--editor-text',
      colors['editor.foreground'] || (isLight ? '#111827' : '#cbd5e1')
    )
    root.setProperty(
      '--editor-input-bg',
      colors['input.background'] || (isLight ? '#f9fafb' : '#0f172a')
    )
    root.setProperty(
      '--editor-input-border',
      colors['input.border'] || (isLight ? '#d1d5db' : '#374151')
    )

    if (isHighContrast) {
      root.setProperty('--editor-button-bg', '#6fc3df')
      root.setProperty('--editor-button-border', '#6fc3df')
      root.setProperty('--editor-button-text', '#000')
      root.setProperty('--editor-button-bg-hover', '#41a6d9')
      root.setProperty('--editor-button-border-hover', '#41a6d9')
      root.setProperty('--editor-button-text-hover', '#000')
      return
    }

    if (isLight) {
      root.setProperty('--editor-button-bg', '#d0f2d9')
      root.setProperty('--editor-button-border', '#34d399')
      root.setProperty('--editor-button-text', '#065f36')
      root.setProperty('--editor-button-bg-hover', '#bbf7d0')
      root.setProperty('--editor-button-border-hover', '#059669')
      root.setProperty('--editor-button-text-hover', '#065f36')
      return
    }

    root.setProperty('--editor-button-bg', '#064e3b')
    root.setProperty('--editor-button-border', '#049060')
    root.setProperty('--editor-button-text', '#d1eae5')
    root.setProperty('--editor-button-bg-hover', '#065f46')
    root.setProperty('--editor-button-border-hover', '#30d090')
    root.setProperty('--editor-button-text-hover', '#d1eae5')
  }

  return applyThemeVariables
}
