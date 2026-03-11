import { Base64 } from 'js-base64'
import { CompressionService } from '../../services/CompressionService'
import { isEditorThemeId, type EditorThemeId } from '../monaco/themes'

const searchParams = new URLSearchParams(window.location.search)

const decodeBase64Code = (value: string) => {
  try {
    return Base64.decode(value)
  } catch {
    return null
  }
}

const decodeCompressedCode = async (value: string) => {
  try {
    return await CompressionService.decode<string>(value)
  } catch {
    return null
  }
}

const resolveCode = async () => {
  const compressedCode = searchParams.get('codez')
  if (compressedCode) {
    const decoded = await decodeCompressedCode(compressedCode)
    if (decoded !== null) {
      return decoded
    }
  }

  const encodedCode = searchParams.get('code')
  if (encodedCode) {
    return decodeBase64Code(encodedCode)
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
  isEmbed: searchParams.get('embed') === '1',
  autorun: searchParams.get('autorun') === '1',
  code: await resolveCode(),
  theme: resolveTheme(),
}

export async function buildShareUrl(code: string) {
  const url = new URL(window.location.href)
  url.search = ''

  url.searchParams.set('codez', await CompressionService.encode(code, true))
  return url.toString()
}