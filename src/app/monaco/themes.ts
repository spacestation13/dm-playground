import type * as Monaco from 'monaco-editor'
import { builtinThemeColors } from './builtinThemeColors'
import gruvboxTheme from './themeData/Gruvbox.json'
import gruvboxLightTheme from './themeData/GruvboxLight.json'
import oneDarkTheme from './themeData/OneDark.json'

export type BuiltinThemeId = 'vs-dark' | 'vs-light' | 'hc-black' | 'hc-light'

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
  { id: 'hc-black', label: 'High Contrast Dark', isLocal: true },
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
  'hc-black',
  'hc-light',
])

const localThemeLoaders: Partial<
  Record<LocalThemeId, () => Promise<{ default: unknown }>>
> = {
  'one-dark': async () => ({ default: oneDarkTheme }),
  'gruvbox-dark': async () => ({ default: gruvboxTheme }),
  'gruvbox-light': async () => ({ default: gruvboxLightTheme }),
}

import { isDiscordActivity } from '../../discord/discordSdk'

function themeUrl(file: string): string {
  if (isDiscordActivity()) {
    return `${window.location.origin}/.proxy/ext/monaco-themes/${file}`
  }
  return `https://unpkg.com/monaco-themes/themes/${file}`
}

const remoteThemeUrls: Record<RemoteThemeId, () => string> = {
  monokai: () => themeUrl('Monokai.json'),
  dracula: () => themeUrl('Dracula.json'),
  nord: () => themeUrl('Nord.json'),
  'solarized-dark': () => themeUrl('Solarized-dark.json'),
  'solarized-light': () => themeUrl('Solarized-light.json'),
  'github-dark': () => themeUrl('GitHub Dark.json'),
  'github-light': () => themeUrl('GitHub Light.json'),
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

  const remoteUrlFn = remoteThemeUrls[themeId as RemoteThemeId]
  if (!remoteUrlFn) {
    return
  }

  const response = await fetch(remoteUrlFn())
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
