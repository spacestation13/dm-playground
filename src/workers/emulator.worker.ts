type EmulatorPort = 'console' | 'screen' | 'controller'

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
const vmSourceUrl = url.searchParams.get('vmSourceUrl')

const post = (message: EmulatorOutboundMessage) => {
  self.postMessage(message)
}

self.addEventListener('message', (event: MessageEvent<EmulatorInboundMessage>) => {
  const { data } = event

  switch (data.type) {
    case 'start':
      post({ type: 'resetOutputConsole' })
      if (vmSourceUrl) {
        post({ type: 'receivedOutput', port: 'console', data: `VM source: ${vmSourceUrl}\n` })
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
