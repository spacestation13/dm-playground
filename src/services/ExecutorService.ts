import { emulatorService } from './emulatorSingleton'
import { commandQueueService, type Process } from './commandQueueSingleton'

export type ExecutorEventType = 'reset' | 'output' | 'status'

export class ExecutorService {
  private events = new EventTarget()
  private activePids = new Set<number>()

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

  setStatus(value: 'running' | 'idle') {
    this.events.dispatchEvent(new CustomEvent('status', { detail: value }))
  }

  async executeImmediate(code: string) {
    this.reset()
    this.setStatus('running')
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
        const cleanup = commandQueueService.run('rm', ['/tmp/playground.dme'])
        this.attachProcess(cleanup)
        cleanup.addEventListener('exit', () => {
          this.appendOutput('Cleaned up temp files.\n')
        })
      })
    })
  }

  cancel() {
    for (const pid of this.activePids) {
      commandQueueService.signal(pid, 'SIGTERM')
    }
    this.activePids.clear()
    commandQueueService.stopPolling()
    this.appendOutput('Execution cancelled.\n')
    this.setStatus('idle')
  }

  private attachProcess(process: Process) {
    this.activePids.add(process.pid)
    process.addEventListener('stdout', (event) => {
      const detail = (event as CustomEvent<string>).detail
      this.appendOutput(detail)
    })
    process.addEventListener('stderr', (event) => {
      const detail = (event as CustomEvent<string>).detail
      this.appendOutput(detail)
    })
    process.addEventListener('exit', (event) => {
      const detail = (event as CustomEvent<number>).detail
      this.activePids.delete(process.pid)
      this.appendOutput(`Process ${process.pid} exited (${detail}).\n`)
      if (this.activePids.size === 0) {
        commandQueueService.stopPolling()
        this.setStatus('idle')
      }
    })
  }
}
