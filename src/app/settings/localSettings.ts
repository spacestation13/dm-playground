import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EditorThemeId } from '../monaco/themes'

type LocalSettingsState = {
  themeId: EditorThemeId
  setThemeId: (id: EditorThemeId) => void
  streamCompilerOutput: boolean
  setStreamCompilerOutput: (v: boolean) => void
  showConsolePanel: boolean
  setShowConsolePanel: (v: boolean) => void
}

export const useLocalSettings = create<LocalSettingsState>()(
  persist(
    (set) => ({
      themeId: 'vs-dark',
      setThemeId: (id: EditorThemeId) => set({ themeId: id }),
      streamCompilerOutput: false,
      setStreamCompilerOutput: (v: boolean) => set({ streamCompilerOutput: v }),
      showConsolePanel: false,
      setShowConsolePanel: (v: boolean) => set({ showConsolePanel: v }),
    }),
    {
      name: 'local-settings',
    }
  )
)

export default useLocalSettings

// Hooks
export const useThemeSetting = () => useLocalSettings((s: LocalSettingsState) => [s.themeId, s.setThemeId] as const)
export const useStreamCompilerSetting = () =>
  useLocalSettings((s: LocalSettingsState) => [s.streamCompilerOutput, s.setStreamCompilerOutput] as const)
export const useShowConsoleSetting = () => useLocalSettings((s: LocalSettingsState) => [s.showConsolePanel, s.setShowConsolePanel] as const)
