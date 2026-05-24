import {
  decode as compressionDecode,
  encode as compressionEncode,
} from '../../services/CompressionService'
import {
  createProjectFromMainCode,
  deserializeProject,
  type PlaygroundProject,
  serializeProject,
} from '../editorProject/projectState'
import { type EditorThemeId, isEditorThemeId } from '../monaco/themes'

const searchParams = new URLSearchParams(window.location.search)

const decodeBase64UrlText = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '='
  )
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const resolveProject = (): PlaygroundProject | null => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const codeParam = searchParams.get('code')

  // Hash is a compressed share string.
  if (hash) {
    try {
      const decoded = compressionDecode<unknown>(hash)
      return (
        deserializeProject(decoded) ||
        (typeof decoded === 'string'
          ? createProjectFromMainCode(decoded)
          : null)
      )
    } catch {
      return null
    }
  }

  // `?code=` is URL-safe base64.
  if (codeParam) {
    try {
      return createProjectFromMainCode(decodeBase64UrlText(codeParam))
    } catch {
      return null
    }
  }

  return null
}

const resolveTheme = (): EditorThemeId | null => {
  const theme = searchParams.get('theme')
  if (!theme || !isEditorThemeId(theme)) {
    return null
  }

  return theme
}

export const embedParams = {
  isEmbed: searchParams.has('embed'),
  autorun: searchParams.has('autorun'),
  project: resolveProject(),
  theme: resolveTheme(),
}

export function buildShareUrl(project: PlaygroundProject) {
  const url = new URL(window.location.href)
  url.search = ''
  const serialized = serializeProject(project)
  // For simple single-file projects, encode just the main code string.
  // For projects with a custom bootstrap, encode the full project.
  const payload = serialized.f.boot ? serialized : serialized.f.main
  url.hash = compressionEncode(payload, true)
  return url.toString()
}
