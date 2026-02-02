import type * as Monaco from 'monaco-editor'

export type BuiltinThemeId = 'vs-dark' | 'vs-light' | 'hc-black' | 'hc-light'

export type LocalThemeId = 'one-dark'

export type RemoteThemeId =
  | 'monokai'
  | 'dracula'
  | 'nord'
  | 'solarized-dark'
  | 'solarized-light'
  | 'github-dark'
  | 'github-light'

export type EditorThemeId = BuiltinThemeId | LocalThemeId | RemoteThemeId

export interface EditorThemeOption {
  id: EditorThemeId
  label: string
  isLocal?: boolean
}

export const editorThemeOptions: EditorThemeOption[] = [
  { id: 'vs-dark', label: 'VS Dark', isLocal: true },
  { id: 'vs-light', label: 'VS Light', isLocal: true },
  { id: 'monokai', label: 'Monokai' },
  { id: 'one-dark', label: 'One Dark', isLocal: true },
  { id: 'dracula', label: 'Dracula' },
  { id: 'nord', label: 'Nord' },
  { id: 'solarized-dark', label: 'Solarized Dark' },
  { id: 'solarized-light', label: 'Solarized Light' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'github-light', label: 'GitHub Light' },
  { id: 'hc-black', label: 'GitHub Dark High Contrast', isLocal: true },
  { id: 'hc-light', label: 'GitHub Light High Contrast', isLocal: true },
]

const hardcodedThemes: Set<BuiltinThemeId> = new Set([
  'vs-dark',
  'vs-light',
  'hc-black',
  'hc-light',
])

const localThemeLoaders: Partial<Record<LocalThemeId, () => Promise<{ default: unknown }>>> = {
  'one-dark': () => import('./themeData/OneDark.json'),
}

const remoteThemeUrls: Record<RemoteThemeId, string> = {
  monokai: 'https://unpkg.com/monaco-themes/themes/Monokai.json',
  dracula: 'https://unpkg.com/monaco-themes/themes/Dracula.json',
  nord: 'https://unpkg.com/monaco-themes/themes/Nord.json',
  'solarized-dark': 'https://unpkg.com/monaco-themes/themes/Solarized-dark.json',
  'solarized-light': 'https://unpkg.com/monaco-themes/themes/Solarized-light.json',
  'github-dark': 'https://unpkg.com/monaco-themes/themes/GitHub Dark.json',
  'github-light': 'https://unpkg.com/monaco-themes/themes/GitHub Light.json',
}

const loadedThemes = new Set<EditorThemeId>()

export async function ensureMonacoTheme(
  monaco: typeof Monaco,
  themeId: EditorThemeId,
): Promise<void> {
  if (hardcodedThemes.has(themeId as BuiltinThemeId)) {
    return
  }

  if (loadedThemes.has(themeId)) {
    return
  }

  const localLoader = localThemeLoaders[themeId as LocalThemeId]
  if (localLoader) {
    const { default: theme } = await localLoader()
    monaco.editor.defineTheme(themeId, theme as Monaco.editor.IStandaloneThemeData)
    loadedThemes.add(themeId)
    return
  }

  const remoteUrl = remoteThemeUrls[themeId as RemoteThemeId]
  if (!remoteUrl) {
    return
  }

  const response = await fetch(remoteUrl)
  if (!response.ok) {
    return
  }
  const theme = (await response.json()) as Monaco.editor.IStandaloneThemeData
  monaco.editor.defineTheme(themeId, theme)
  loadedThemes.add(themeId)
}
