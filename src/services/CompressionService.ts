import { Base64 } from 'js-base64'
import brotliPromise from 'brotli-wasm'

let _brotli: Awaited<typeof brotliPromise> | null = null

async function getBrotli() {
  if (!_brotli) {
    _brotli = await brotliPromise
  }
  return _brotli
}

const CURRENT_VERSION = 1

export class CompressionService {
  static async encode(value: unknown, urlsafe = false) {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    const brotli = await getBrotli()
    const compressed = brotli.compress(bytes)
    return `${CURRENT_VERSION}:${Base64.fromUint8Array(compressed, urlsafe)}`
  }

  static async decode<T>(value: string) {
    const colonIdx = value.indexOf(':')
    const payload = colonIdx === -1 ? value : value.slice(colonIdx + 1)
    const bytes = Base64.toUint8Array(payload)
    const brotli = await getBrotli()
    const decompressed = brotli.decompress(bytes)
    return JSON.parse(new TextDecoder().decode(decompressed)) as T
  }
}
