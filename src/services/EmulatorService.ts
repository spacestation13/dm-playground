export type EmulatorPort = 'console' | 'screen' | 'controller'

import { getWorkerAssetUrls, isDiscordActivity } from '../discord/activity'
import { commandQueueService } from './CommandQueueService'

export type EmulatorOutboundMessage =
  | { type: 'sendPort'; port: EmulatorPort; data: string }
  | { type: 'resizePort'; port: EmulatorPort; rows: number; cols: number }
  | { type: 'start'; snapshotKey: string | null }
  | { type: 'pause' }
  | {
      type: 'sendFile'
      commandId: string
      name: string
      data: Uint8Array
    }
  | {
      type: 'extractZip'
      commandId: string
      data: Uint8Array
      entryPrefix: string
      namePrefix: string
    }
  | { type: 'saveSnapshot'; snapshotKey: string }
  | {
      type: 'setAssetUrls'
      vmRemoteUrl: string
      seaBiosUrl: string
      vgaBiosUrl: string
    }

export type EmulatorInboundMessage =
  | { type: 'receivedOutput'; port: EmulatorPort; data: string }
  | { type: 'resetOutputConsole' }
  | {
      type: 'assetDownloadProgress'
      asset: 'bzimage' | 'rootfs' | 'v86wasm' | 'seabios' | 'vgabios'
      loaded: number
      total: number | null
    }
  | { type: 'asyncResponse'; commandId: string; error?: string }
  | { type: 'started'; restored: boolean }

export class EmulatorService {
  private worker: Worker | null = null
  private startPromise: Promise<boolean> | null = null
  private events = new EventTarget()
  private assetDownloadProgress = new Map<
    'bzimage' | 'rootfs' | 'v86wasm' | 'seabios' | 'vgabios',
    { loaded: number; total: number | null }
  >()
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

  getAssetDownloadProgress() {
    return new Map(this.assetDownloadProgress)
  }

  /**
   * Starts the VM once; later calls get the first call's result. With a snapshot key, the VM is
   * restored from the snapshot saved under it if there is one. Resolves when the VM runs, with
   * whether it was restored.
   */
  start(snapshotKey: string | null = null) {
    if (this.startPromise) {
      return this.startPromise
    }

    let resolveStarted: (restored: boolean) => void = () => {}
    this.startPromise = new Promise<boolean>((resolve) => {
      resolveStarted = resolve
    })

    this.worker = new Worker(
      new URL('../workers/emulator.worker.ts', import.meta.url),
      { type: 'module' }
    )
    this.worker.addEventListener(
      'message',
      (event: MessageEvent<EmulatorInboundMessage>) => {
        const payload = event.data

        if (payload.type === 'assetDownloadProgress') {
          this.assetDownloadProgress.set(payload.asset, {
            loaded: payload.loaded,
            total: payload.total,
          })
        }

        if (payload.type === 'started') {
          resolveStarted(payload.restored)
        }

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
    if (isDiscordActivity()) {
      const urls = getWorkerAssetUrls()
      this.post({ type: 'setAssetUrls', ...urls })
    }
    this.post({ type: 'start', snapshotKey })
    return this.startPromise
  }

  /** Saves the VM's state under `snapshotKey` for {@link start} to restore on a later visit. */
  saveSnapshot(snapshotKey: string) {
    this.post({ type: 'saveSnapshot', snapshotKey })
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
    return this.request((commandId) => ({
      type: 'sendFile',
      commandId,
      name,
      data,
    }))
  }

  /** Writes the files under `entryPrefix` in a zip to the shared folder, named `namePrefix` + basename. */
  extractZip(data: Uint8Array, entryPrefix: string, namePrefix: string) {
    return this.request((commandId) => ({
      type: 'extractZip',
      commandId,
      data,
      entryPrefix,
      namePrefix,
    }))
  }

  private request(
    build: (
      commandId: string
    ) => EmulatorOutboundMessage & { commandId: string }
  ) {
    if (!this.worker) {
      return Promise.reject(new Error('Emulator has not been started'))
    }

    const commandId = `request-${this.nextCommandId}`
    this.nextCommandId += 1

    return new Promise<void>((resolve, reject) => {
      this.pendingResponses.set(commandId, { resolve, reject })
      this.post(build(commandId))
    })
  }

  private post(message: EmulatorOutboundMessage) {
    if (!this.worker) {
      return
    }
    if (
      (message.type === 'sendFile' || message.type === 'extractZip') &&
      message.data instanceof Uint8Array
    ) {
      try {
        this.worker.postMessage(message, [message.data.buffer])
        return
      } catch {
        // Fall back to a regular postMessage if transfer fails.
      }
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
