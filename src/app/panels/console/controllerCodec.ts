import { Base64 } from 'js-base64'

export function decodeController(input: string) {
  const lines = input.replace(/\0/g, '').split('\n')
  const decodedLines = lines.map((line) => {
    const trimmed = line.trim()
    if (/^\d+$/.test(trimmed)) {
      return `pidenter ${trimmed}`
    }

    const parts = line.split(' ')
    if (parts.length >= 3 && (parts[0] === 'stdout' || parts[0] === 'stderr')) {
      const payload = parts[2]
      if (isBase64(payload)) {
        try {
          parts[2] = Base64.decode(payload)
        } catch {
          return line
        }
      }
      return parts.join(' ')
    }

    if (parts.length === 1 && isBase64(parts[0])) {
      try {
        return Base64.decode(parts[0])
      } catch {
        return line
      }
    }

    return line.trim() === 'OK' ? '' : line
  })

  return decodedLines.filter(Boolean).join('\n')
}

export function decodeSent(input: string) {
  const parts = input.split(' ')
  if (parts[0] !== 'run') {
    return input
  }

  const decoded = parts.map((part, index) => {
    if (index === 0) {
      return part
    }
    if (!isBase64(part)) {
      return part
    }
    try {
      return Base64.decode(part)
    } catch {
      return part
    }
  })

  return decoded.join(' ')
}

function isBase64(value: string) {
  return value.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(value)
}
