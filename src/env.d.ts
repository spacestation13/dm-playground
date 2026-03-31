declare const __APP_VERSION__: string

declare module 'v86' {
  const V86: new (config: Record<string, unknown>) => {
    bus: { send: (event: string, data: number[] | Uint8Array) => void }
    add_listener: (event: string, handler: (bytes: Uint8Array) => void) => void
    create_file: (name: string, data: Uint8Array) => Promise<void>
    run: () => Promise<void>
    stop: () => Promise<void>
  }

  export default V86
}

declare module 'v86/build/v86.wasm?url' {
  const url: string
  export default url
}
