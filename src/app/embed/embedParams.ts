import { CompressionService } from '../../services/CompressionService'
import {
  createProjectFromMainCode,
  deserializeProject,
  serializeProject,
  type PlaygroundProject,
} from '../editorProject/projectState'
import { isEditorThemeId, type EditorThemeId } from '../monaco/themes'

const searchParams = new URLSearchParams(window.location.search)

const resolveProject = (): PlaygroundProject | null => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  if (!hash) {
    return null
  }

  try {
    const decoded = CompressionService.decode<unknown>(hash)
    return (
      deserializeProject(decoded) ||
      (typeof decoded === 'string' ? createProjectFromMainCode(decoded) : null)
    )
  } catch {
    return null
  }
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
  url.hash = CompressionService.encode(payload, true)
  return url.toString()
}
