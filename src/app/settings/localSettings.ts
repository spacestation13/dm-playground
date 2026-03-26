import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EditorThemeId } from '../monaco/themes'
import { LayoutMode } from '../layout/layoutTypes'

type EditorSettings = {
  fontFamily: string
  fontSize: number
  tabSize: number
}

type LocalSettingsState = {
  themeId: EditorThemeId
  setThemeId: (id: EditorThemeId) => void
  layoutMode: LayoutMode
  setLayoutMode: (v: LayoutMode) => void
  editor: EditorSettings
  setFontFamily: (v: string) => void
  setFontSize: (v: number) => void
  setTabSize: (v: number) => void
  streamCompilerOutput: boolean
  setStreamCompilerOutput: (v: boolean) => void
  showConsolePanel: boolean
  setShowConsolePanel: (v: boolean) => void
  showAdvancedEditorTabs: boolean
  setShowAdvancedEditorTabs: (v: boolean) => void
}

const DEFAULT_FONT_FAMILY = 'Consolas, "Liberation Mono", Courier, monospace'
const DEFAULT_FONT_SIZE = 14
const DEFAULT_TAB_SIZE = 2

const defaultEditorSettings: EditorSettings = {
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  tabSize: DEFAULT_TAB_SIZE,
}

export const useLocalSettings = create<LocalSettingsState>()(
  persist(
    (set) => ({
      themeId: 'one-dark',
      setThemeId: (id: EditorThemeId) => set({ themeId: id }),
      layoutMode: LayoutMode.Automatic,
      setLayoutMode: (v: LayoutMode) => set({ layoutMode: v }),
      editor: defaultEditorSettings,
      setFontFamily: (v: string) =>
        set((state) => ({
          editor: {
            ...state.editor,
            fontFamily: v,
          },
        })),
      setFontSize: (v: number) =>
        set((state) => ({
          editor: {
            ...state.editor,
            fontSize: Math.max(8, Math.min(40, v)),
          },
        })),
      setTabSize: (v: number) =>
        set((state) => ({
          editor: {
            ...state.editor,
            tabSize: Math.max(1, Math.min(8, v)),
          },
        })),
      streamCompilerOutput: false,
      setStreamCompilerOutput: (v: boolean) => set({ streamCompilerOutput: v }),
      showConsolePanel: false,
      setShowConsolePanel: (v: boolean) => set({ showConsolePanel: v }),
      showAdvancedEditorTabs: false,
      setShowAdvancedEditorTabs: (v: boolean) =>
        set({ showAdvancedEditorTabs: v }),
    }),
    {
      name: 'local-settings',
    }
  )
)

export default useLocalSettings

// Hooks
export const useThemeSetting = () => {
  const themeId = useLocalSettings((s: LocalSettingsState) => s.themeId)
  const setThemeId = useLocalSettings((s: LocalSettingsState) => s.setThemeId)
  return [themeId, setThemeId] as const
}

export const useLayoutModeSetting = () => {
  const layoutMode = useLocalSettings((s: LocalSettingsState) => s.layoutMode)
  const setLayoutMode = useLocalSettings(
    (s: LocalSettingsState) => s.setLayoutMode
  )
  return [layoutMode, setLayoutMode] as const
}

export const useStreamCompilerSetting = () => {
  const streamCompilerOutput = useLocalSettings(
    (s: LocalSettingsState) => s.streamCompilerOutput
  )
  const setStreamCompilerOutput = useLocalSettings(
    (s: LocalSettingsState) => s.setStreamCompilerOutput
  )
  return [streamCompilerOutput, setStreamCompilerOutput] as const
}

export const useFontFamilySetting = () => {
  const fontFamily = useLocalSettings(
    (s: LocalSettingsState) => s.editor.fontFamily
  )
  const setFontFamily = useLocalSettings(
    (s: LocalSettingsState) => s.setFontFamily
  )
  return [fontFamily, setFontFamily] as const
}

export const useFontSizeSetting = () => {
  const fontSize = useLocalSettings(
    (s: LocalSettingsState) => s.editor.fontSize
  )
  const setFontSize = useLocalSettings((s: LocalSettingsState) => s.setFontSize)
  return [fontSize, setFontSize] as const
}

export const useTabSizeSetting = () => {
  const tabSize = useLocalSettings((s: LocalSettingsState) => s.editor.tabSize)
  const setTabSize = useLocalSettings((s: LocalSettingsState) => s.setTabSize)
  return [tabSize, setTabSize] as const
}

export const useShowConsoleSetting = () => {
  const showConsolePanel = useLocalSettings(
    (s: LocalSettingsState) => s.showConsolePanel
  )
  const setShowConsolePanel = useLocalSettings(
    (s: LocalSettingsState) => s.setShowConsolePanel
  )
  return [showConsolePanel, setShowConsolePanel] as const
}

export const useShowAdvancedEditorTabsSetting = () => {
  const showAdvancedEditorTabs = useLocalSettings(
    (s: LocalSettingsState) => s.showAdvancedEditorTabs
  )
  const setShowAdvancedEditorTabs = useLocalSettings(
    (s: LocalSettingsState) => s.setShowAdvancedEditorTabs
  )
  return [showAdvancedEditorTabs, setShowAdvancedEditorTabs] as const
}
