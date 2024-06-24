import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CompressionService {
  public async compress(input: string) {
    const reader = new Blob([input])
      .stream()
      .pipeThrough(new CompressionStream('gzip'))
      .getReader();
    const output = [];
    let totalSize = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      output.push(value);
      totalSize += value.byteLength;
    }
    const concatenated = new Uint8Array(totalSize);
    let offset = 0;
    for (const array of output) {
      concatenated.set(array, offset);
      offset += array.byteLength;
    }
    return this.bytesToBase64(concatenated);
  }

  public async decompress(input: string) {
    if (input === '') return '';

    const data = this.base64ToBytes(input);
    const blob = new Blob([data]);
    const stream = blob.stream();
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream('gzip'),
    );
    return new Response(decompressedStream).text();
  }

  private base64ToBytes(base64: string) {
    const binString = atob(base64);
    return Uint8Array.from<string>(
      binString,
      (m) => m.codePointAt(0) as number,
    );
  }

  private bytesToBase64(bytes: Uint8Array) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join(
      '',
    );
    return btoa(binString);
  }
}
