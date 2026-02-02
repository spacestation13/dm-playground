import { emulatorService } from './emulatorSingleton'
import { commandQueueService, type Process } from './commandQueueSingleton'

export type ExecutorEventType = 'reset' | 'output'

export class ExecutorService {
  private events = new EventTarget()

  addEventListener(type: ExecutorEventType, listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener(type, listener)
  }

  removeEventListener(type: ExecutorEventType, listener: EventListenerOrEventListenerObject) {
    this.events.removeEventListener(type, listener)
  }

  reset() {
    this.events.dispatchEvent(new CustomEvent('reset'))
  }

  appendOutput(value: string) {
    this.events.dispatchEvent(new CustomEvent('output', { detail: value }))
  }

  async executeImmediate(code: string) {
    this.reset()
    this.appendOutput('Starting DreamMaker...\n')

    emulatorService.start('https://spacestation13.github.io/dm-playground-linux/')
    emulatorService.sendFile('/tmp/playground.dme', new TextEncoder().encode(code))

    commandQueueService.startPolling()

    const dmProcess = commandQueueService.run('dreammaker', ['/tmp/playground.dme'])
    this.attachProcess(dmProcess)

    dmProcess.addEventListener('exit', () => {
      this.appendOutput('DreamMaker complete. Starting DreamDaemon...\n')
      const ddProcess = commandQueueService.run('dreamdaemon', ['/tmp/playground.dme'])
      this.attachProcess(ddProcess)
      ddProcess.addEventListener('exit', () => {
        this.appendOutput('DreamDaemon exited.\n')
      })
    })
  }

  private attachProcess(process: Process) {
    process.addEventListener('stdout', (event) => {
      const detail = (event as CustomEvent<string>).detail
      this.appendOutput(detail)
    })
    process.addEventListener('stderr', (event) => {
      const detail = (event as CustomEvent<string>).detail
      this.appendOutput(detail)
    })
  }
}
