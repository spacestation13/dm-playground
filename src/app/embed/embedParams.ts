import { Base64 } from 'js-base64'
import { CompressionService } from '../../services/CompressionService'
import {
  createProjectFromMainCode,
  deserializeProject,
  serializeProject,
  type PlaygroundProject,
} from '../editorProject/projectState'
import { isEditorThemeId, type EditorThemeId } from '../monaco/themes'

const searchParams = new URLSearchParams(window.location.search)
const hashPayload = window.location.hash.startsWith('#')
  ? window.location.hash.slice(1)
  : window.location.hash

const decodeBase64Code = (value: string) => {
  try {
    return Base64.decode(value)
  } catch {
    return null
  }
}

const decodeCompressedCode = async (value: string) => {
  try {
    return await CompressionService.decode<unknown>(value)
  } catch {
    return null
  }
}

const resolveProject = async (): Promise<PlaygroundProject | null> => {
  if (hashPayload) {
    const decoded = await decodeCompressedCode(hashPayload)
    const project = deserializeProject(decoded)
    if (project) {
      return project
    }

    if (typeof decoded === 'string') {
      return createProjectFromMainCode(decoded)
    }
  }

  const encodedCode = searchParams.get('code')
  if (encodedCode) {
    const decoded = decodeBase64Code(encodedCode)
    if (decoded !== null) {
      return createProjectFromMainCode(decoded)
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
  project: await resolveProject(),
  theme: resolveTheme(),
}

export async function buildShareUrl(project: PlaygroundProject) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = await CompressionService.encode(serializeProject(project), true)
  return url.toString()
}
