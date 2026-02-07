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
export const useThemeSetting = () => {
  const themeId = useLocalSettings((s: LocalSettingsState) => s.themeId)
  const setThemeId = useLocalSettings((s: LocalSettingsState) => s.setThemeId)
  return [themeId, setThemeId] as const
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

export const useShowConsoleSetting = () => {
  const showConsolePanel = useLocalSettings(
    (s: LocalSettingsState) => s.showConsolePanel
  )
  const setShowConsolePanel = useLocalSettings(
    (s: LocalSettingsState) => s.setShowConsolePanel
  )
  return [showConsolePanel, setShowConsolePanel] as const
}
