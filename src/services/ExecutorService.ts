import { emulatorService } from './emulatorSingleton'
import { commandQueueService, type Process, type ProcessExit } from './commandQueueSingleton'

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


    const dmProcess = await commandQueueService.runProcess('dreammaker', '/tmp/playground.dme')
    this.attachProcess(dmProcess)

    dmProcess.addEventListener('exit', () => {
      this.appendOutput('DreamMaker complete. Starting DreamDaemon...\n')
      commandQueueService
        .runProcess('dreamdaemon', '/tmp/playground.dme')
        .then((ddProcess) => {
          this.attachProcess(ddProcess)
          ddProcess.addEventListener('exit', () => {
            this.appendOutput('DreamDaemon exited.\n')
            commandQueueService
              .runProcess('rm', '/tmp/playground.dme')
              .then((cleanup) => {
                this.attachProcess(cleanup)
                cleanup.addEventListener('exit', () => {
                  this.appendOutput('Cleaned up temp files.\n')
                })
              })
              .catch((error) => {
                this.appendOutput(`Cleanup failed: ${String(error)}\n`)
              })
          })
        })
        .catch((error) => {
          this.appendOutput(`DreamDaemon failed: ${String(error)}\n`)
        })
    })
  }

  cancel() {
    for (const pid of this.activePids) {
      commandQueueService.signal(pid, 15)
    }
    this.activePids.clear()
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
      const detail = (event as CustomEvent<ProcessExit>).detail
      this.activePids.delete(process.pid)
      if (detail.cause === 'exit') {
        this.appendOutput(`Process ${process.pid} exited (${detail.code}).\n`)
      } else if (detail.cause === 'signal') {
        this.appendOutput(`Process ${process.pid} killed by signal ${detail.signal}.\n`)
      } else {
        this.appendOutput(`Process ${process.pid} exited.\n`)
      }
      if (this.activePids.size === 0) {
        this.setStatus('idle')
      }
    })
  }
}
