export type EmulatorPort = 'console' | 'screen' | 'controller'

import { commandQueueService } from './CommandQueueService'

export type EmulatorOutboundMessage =
  | { type: 'sendPort'; port: EmulatorPort; data: string }
  | { type: 'resizePort'; port: EmulatorPort; rows: number; cols: number }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'sendFile'; name: string; data: Uint8Array }

export type EmulatorInboundMessage =
  | { type: 'receivedOutput'; port: EmulatorPort; data: string }
  | { type: 'resetOutputConsole' }
  | { type: 'asyncResponse'; commandId: string }

export class EmulatorService {
  private worker: Worker | null = null
  private events = new EventTarget()

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
      this.post({ type: 'start' })
      return
    }

    this.worker = new Worker(
      new URL('../workers/emulator.worker.ts?worker', import.meta.url)
    )
    this.worker.addEventListener(
      'message',
      (event: MessageEvent<EmulatorInboundMessage>) => {
        const payload = event.data
        this.events.dispatchEvent(
          new CustomEvent(payload.type, { detail: payload })
        )
      }
    )
    this.post({ type: 'start' })
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
    this.post({ type: 'sendFile', name, data })
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
