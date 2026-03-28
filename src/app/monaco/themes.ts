import type * as Monaco from 'monaco-editor'
import { builtinThemeColors } from './builtinThemeColors'
import oneDarkTheme from './themeData/OneDark.json'
import gruvboxTheme from './themeData/Gruvbox.json'
import gruvboxLightTheme from './themeData/GruvboxLight.json'

export type BuiltinThemeId = 'vs-dark' | 'vs-light' | 'hc-dark' | 'hc-light'

export type LocalThemeId = 'one-dark' | 'gruvbox-dark' | 'gruvbox-light'

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
  isLight?: boolean
}

export const editorThemeOptions: EditorThemeOption[] = [
  { id: 'vs-dark', label: 'VS Dark', isLocal: true },
  { id: 'vs-light', label: 'VS Light', isLocal: true, isLight: true },
  { id: 'monokai', label: 'Monokai' },
  { id: 'one-dark', label: 'One Dark', isLocal: true },
  { id: 'gruvbox-dark', label: 'Gruvbox Dark', isLocal: true },
  { id: 'gruvbox-light', label: 'Gruvbox Light', isLocal: true, isLight: true },
  { id: 'dracula', label: 'Dracula' },
  { id: 'nord', label: 'Nord' },
  { id: 'solarized-dark', label: 'Solarized Dark' },
  { id: 'solarized-light', label: 'Solarized Light', isLight: true },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'github-light', label: 'GitHub Light', isLight: true },
  { id: 'hc-dark', label: 'High Contrast Dark', isLocal: true },
  {
    id: 'hc-light',
    label: 'High Contrast Light',
    isLocal: true,
    isLight: true,
  },
]

const editorThemeIds = new Set<EditorThemeId>(
  editorThemeOptions.map((option) => option.id)
)

export function isEditorThemeId(value: string): value is EditorThemeId {
  return editorThemeIds.has(value as EditorThemeId)
}

const hardcodedThemes: Set<BuiltinThemeId> = new Set([
  'vs-dark',
  'vs-light',
  'hc-dark',
  'hc-light',
])

const localThemeLoaders: Partial<
  Record<LocalThemeId, () => Promise<{ default: unknown }>>
> = {
  'one-dark': async () => ({ default: oneDarkTheme }),
  'gruvbox-dark': async () => ({ default: gruvboxTheme }),
  'gruvbox-light': async () => ({ default: gruvboxLightTheme }),
}

const remoteThemeUrls: Record<RemoteThemeId, string> = {
  monokai: 'https://unpkg.com/monaco-themes/themes/Monokai.json',
  dracula: 'https://unpkg.com/monaco-themes/themes/Dracula.json',
  nord: 'https://unpkg.com/monaco-themes/themes/Nord.json',
  'solarized-dark':
    'https://unpkg.com/monaco-themes/themes/Solarized-dark.json',
  'solarized-light':
    'https://unpkg.com/monaco-themes/themes/Solarized-light.json',
  'github-dark': 'https://unpkg.com/monaco-themes/themes/GitHub Dark.json',
  'github-light': 'https://unpkg.com/monaco-themes/themes/GitHub Light.json',
}

const loadedThemes = new Set<EditorThemeId>()
const loadedThemeData = new Map<
  EditorThemeId,
  Monaco.editor.IStandaloneThemeData
>()

export async function ensureMonacoTheme(
  monaco: typeof Monaco,
  themeId: EditorThemeId
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
    const themeData = theme as Monaco.editor.IStandaloneThemeData
    monaco.editor.defineTheme(themeId, themeData)
    loadedThemeData.set(themeId, themeData)
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
  loadedThemeData.set(themeId, theme)
  loadedThemes.add(themeId)
}

export function getThemeColors(
  themeId: EditorThemeId
): Record<string, string> | undefined {
  if (hardcodedThemes.has(themeId as BuiltinThemeId)) {
    return builtinThemeColors[themeId as BuiltinThemeId]
  }
  return loadedThemeData.get(themeId)?.colors
}
