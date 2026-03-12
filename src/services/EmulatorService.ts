export type EmulatorPort = 'console' | 'screen' | 'controller'

import { commandQueueService } from './CommandQueueService'

export type EmulatorOutboundMessage =
  | { type: 'sendPort'; port: EmulatorPort; data: string }
  | { type: 'resizePort'; port: EmulatorPort; rows: number; cols: number }
  | { type: 'start'; assetBaseUrl: string }
  | { type: 'pause' }
  | {
      type: 'sendFile'
      commandId: string
      name: string
      data: Uint8Array
    }

export type EmulatorInboundMessage =
  | { type: 'receivedOutput'; port: EmulatorPort; data: string }
  | { type: 'resetOutputConsole' }
  | { type: 'asyncResponse'; commandId: string; error?: string }

export class EmulatorService {
  private worker: Worker | null = null
  private events = new EventTarget()
  private pendingResponses = new Map<
    string,
    {
      resolve: () => void
      reject: (error: Error) => void
    }
  >()
  private nextCommandId = 0

  addEventListener(
    type: EmulatorInboundMessage['type'],
    listener: EventListenerOrEventListenerObject
  ) {
    this.events.addEventListener(type, listener)
  }

  removeEventListener(
    type: EmulatorInboundMessage['type'],
    listener: EventListenerOrEventListenerObject
  ) {
    this.events.removeEventListener(type, listener)
  }

  start() {
    if (this.worker) {
      return
    }

    this.worker = new Worker(
      new URL('../workers/emulator.worker.ts?worker', import.meta.url)
    )
    this.worker.addEventListener(
      'message',
      (event: MessageEvent<EmulatorInboundMessage>) => {
        const payload = event.data

        if (payload.type === 'asyncResponse') {
          const pending = this.pendingResponses.get(payload.commandId)
          if (pending) {
            this.pendingResponses.delete(payload.commandId)
            if (payload.error) {
              pending.reject(new Error(payload.error))
            } else {
              pending.resolve()
            }
          }
        }

        this.events.dispatchEvent(
          new CustomEvent(payload.type, { detail: payload })
        )
      }
    )
    this.post({
      type: 'start',
      assetBaseUrl: new URL('lib/', window.location.href).toString(),
    })
  }

  pause() {
    this.post({ type: 'pause' })
  }

  sendPort(port: EmulatorPort, data: string) {
    this.post({ type: 'sendPort', port, data })
  }

  resizePort(port: EmulatorPort, rows: number, cols: number) {
    this.post({ type: 'resizePort', port, rows, cols })
  }

  sendFile(name: string, data: Uint8Array) {
    if (!this.worker) {
      return Promise.reject(new Error('Emulator has not been started'))
    }

    const commandId = `send-file-${this.nextCommandId}`
    this.nextCommandId += 1

    return new Promise<void>((resolve, reject) => {
      this.pendingResponses.set(commandId, { resolve, reject })
      this.post({ type: 'sendFile', commandId, name, data })
    })
  }

  private post(message: EmulatorOutboundMessage) {
    if (!this.worker) {
      return
    }
    this.worker.postMessage(message)
  }
}

export const emulatorService = new EmulatorService()

commandQueueService.setSender((value) => {
  emulatorService.sendPort('controller', value)
})

emulatorService.addEventListener('receivedOutput', (event) => {
  const detail = (event as CustomEvent<{ port: string; data: string }>).detail
  if (detail.port === 'controller') {
    commandQueueService.receiveInput(detail.data)
  }
})
