type EmulatorPort = 'console' | 'screen' | 'controller'

declare function importScripts(...urls: string[]): void

type EmulatorInboundMessage =
  | { type: 'sendPort'; port: EmulatorPort; data: string }
  | { type: 'resizePort'; port: EmulatorPort; rows: number; cols: number }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'sendFile'; name: string; data: Uint8Array }

type EmulatorOutboundMessage =
  | { type: 'receivedOutput'; port: EmulatorPort; data: string }
  | { type: 'resetOutputConsole' }
  | { type: 'asyncResponse'; commandId: string }

const url = new URL(self.location.href)
const vmRemoteUrl = url.searchParams.get('vmRemoteUrl') ?? 'https://spacestation13.github.io/dm-playground-linux/'
const vmLocalUrl = '/lib/'

const post = (message: EmulatorOutboundMessage) => {
  self.postMessage(message)
}

self.addEventListener('message', (event: MessageEvent<EmulatorInboundMessage>) => {
  const { data } = event

  switch (data.type) {
    case 'start':
      post({ type: 'resetOutputConsole' })
      post({ type: 'receivedOutput', port: 'console', data: `VM assets (remote): ${vmRemoteUrl}bzImage and ${vmRemoteUrl}rootfs.cpio.lz4\n` })
      try {
        importScripts(`${vmLocalUrl}libv86.js`)
        post({ type: 'receivedOutput', port: 'console', data: 'Loaded libv86.js\n' })
      } catch (error) {
        post({
          type: 'receivedOutput',
          port: 'console',
          data: `Failed to load libv86.js: ${(error as Error).message}\n`,
        })
      }
      break
    case 'pause':
      post({ type: 'receivedOutput', port: 'console', data: 'VM paused\n' })
      break
    case 'sendPort':
      post({ type: 'receivedOutput', port: data.port, data: data.data })
      break
    case 'resizePort':
      break
    case 'sendFile':
      post({ type: 'receivedOutput', port: 'console', data: `Received file ${data.name}\n` })
      break
    default:
      break
  }
})
