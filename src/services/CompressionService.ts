import { Base64 } from 'js-base64'
import brotliPromise from 'brotli-wasm'

let _brotli: Awaited<typeof brotliPromise> | null = null

async function getBrotli() {
  if (!_brotli) {
    _brotli = await brotliPromise
  }
  return _brotli
}

export class CompressionService {
  static async encode(value: unknown, urlsafe = false) {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    const brotli = await getBrotli()
    const compressed = brotli.compress(bytes)
    return Base64.fromUint8Array(compressed, urlsafe)
  }

  static async decode<T>(value: string) {
    const bytes = Base64.toUint8Array(value)
    const brotli = await getBrotli()
    const decompressed = brotli.decompress(bytes)
    return JSON.parse(new TextDecoder().decode(decompressed)) as T
  }
}
