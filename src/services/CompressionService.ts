import { Base64 } from 'js-base64'
import { pack, unpack } from 'msgpackr'

export class CompressionService {
  static async encode(value: unknown, urlsafe = false) {
    const packed = pack(value)

    if (typeof CompressionStream === 'undefined') {
      return Base64.fromUint8Array(new Uint8Array(packed), urlsafe)
    }

    const compressed = await this.compress(packed)
    return Base64.fromUint8Array(new Uint8Array(compressed), urlsafe)
  }

  static async decode<T>(value: string) {
    const bytes = Base64.toUint8Array(value)

    if (typeof DecompressionStream === 'undefined') {
      return unpack(new Uint8Array(bytes)) as T
    }

    const decompressed = await this.decompress(bytes)
    return unpack(new Uint8Array(decompressed)) as T
  }

  private static async compress(input: Uint8Array) {
    const stream = new CompressionStream('gzip')
    const arrayBuffer = Uint8Array.from(input).buffer
    const blob = new Blob([arrayBuffer])
    const compressedStream = blob.stream().pipeThrough(stream)
    const compressedBuffer = await new Response(compressedStream).arrayBuffer()
    return compressedBuffer
  }

  private static async decompress(input: Uint8Array) {
    const stream = new DecompressionStream('gzip')
    const arrayBuffer = Uint8Array.from(input).buffer
    const blob = new Blob([arrayBuffer])
    const decompressedStream = blob.stream().pipeThrough(stream)
    const decompressedBuffer = await new Response(
      decompressedStream
    ).arrayBuffer()
    return new Uint8Array(decompressedBuffer)
  }
}
