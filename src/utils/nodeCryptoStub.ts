class RandomBytesBuffer {
  private bytes: Uint8Array

  constructor(size: number) {
    this.bytes = new Uint8Array(size)
    globalThis.crypto.getRandomValues(this.bytes)
  }

  readInt32LE(offset = 0) {
    return new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset,
      this.bytes.byteLength
    ).getInt32(offset, true)
  }
}

export function randomBytes(size: number) {
  return new RandomBytesBuffer(size)
}
