import { strFromU8, strToU8, unzlibSync, zlibSync } from 'fflate'
import { Base64 } from 'js-base64'

const CURRENT_VERSION = 1

export class CompressionService {
  static encode(value: unknown, urlsafe = false) {
    const compressed = zlibSync(strToU8(JSON.stringify(value)), {
      level: 4,
    })
    return `${CURRENT_VERSION}:${Base64.fromUint8Array(compressed, urlsafe)}`
  }

  static decode<T>(value: string) {
    const colonIdx = value.indexOf(':')
    const payload = colonIdx === -1 ? value : value.slice(colonIdx + 1)
    const bytes = Base64.toUint8Array(payload)
    return JSON.parse(strFromU8(unzlibSync(bytes))) as T
  }
}
