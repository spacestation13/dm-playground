import { emulatorService } from './EmulatorService'
import { commandQueueService, type Process, type ProcessExit } from './CommandQueueService'
import { byondService } from './ByondService'
import { STREAM_OUTPUT_KEY } from '../app/App'

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

    const byondPath = byondService.getActiveVersion() ? '/var/lib/byond/' : null
    if (!byondPath) {
      this.appendOutput('No active BYOND version loaded.\n')
      this.setStatus('idle')
      return
    }

    const filename = `tmp-${Date.now()}`
    const hostDme = `/mnt/host/${filename}.dme`
    const hostDmb = `/mnt/host/${filename}.dmb`

    emulatorService.start('https://spacestation13.github.io/dm-playground-linux/')
    emulatorService.sendFile(`${filename}.dme`, new TextEncoder().encode(code))

    const env = new Map<string, string>([['LD_LIBRARY_PATH', byondPath]])
    const streamCompilerOutput = localStorage.getItem(STREAM_OUTPUT_KEY) === '1'

    const dmProcess = await commandQueueService.runProcess(`${byondPath}DreamMaker`, hostDme, env)

    if (streamCompilerOutput) {
      this.attachProcess(dmProcess)

      dmProcess.addEventListener('exit', async (event) => {
        const detail = (event as CustomEvent<ProcessExit>).detail
        const code = detail.cause === 'exit' ? detail.code : null
        if (code === 0) {
          this.appendOutput('-- DreamDaemon --\n')
          try {
            const ddProcess = await commandQueueService.runProcess(`${byondPath}DreamDaemon`, `${hostDmb}\0-trusted`, env)
            this.attachProcess(ddProcess)
            ddProcess.addEventListener('exit', () => {
              commandQueueService
                .runProcess('/bin/rm', `${hostDme}\0${hostDmb}`)
                .catch((error) => {
                  this.appendOutput(`Cleanup failed: ${String(error)}\n`)
                })
            })
          } catch (error) {
            this.appendOutput(`DreamDaemon failed: ${String(error)}\n`)
          }
        } else {
          // compile failed: output has already been streamed live, just cleanup
          try {
            await commandQueueService.runProcess('/bin/rm', `${hostDme}\0${hostDmb}`)
          } catch (error) {
            this.appendOutput(`Cleanup failed: ${String(error)}\n`)
          }
        }
      })
    } else {
      // Buffer compiler output: suppress piping and only show on failure
      this.attachProcess(dmProcess, { pipeOutput: false })

      const dmOutputBuf: string[] = []
      dmProcess.addEventListener('stdout', (event) => {
        const detail = (event as CustomEvent<string>).detail
        dmOutputBuf.push(detail)
      })
      dmProcess.addEventListener('stderr', (event) => {
        const detail = (event as CustomEvent<string>).detail
        dmOutputBuf.push(detail)
      })

      dmProcess.addEventListener('exit', async (event) => {
        const detail = (event as CustomEvent<ProcessExit>).detail
        const code = detail.cause === 'exit' ? detail.code : null

        if (code === 0) {
          // successful compile: don't show compiler text, proceed to start DreamDaemon
          try {
            const ddProcess = await commandQueueService.runProcess(`${byondPath}DreamDaemon`, `${hostDmb}\0-trusted`, env)
            this.attachProcess(ddProcess)
            ddProcess.addEventListener('exit', () => {
              commandQueueService
                .runProcess('/bin/rm', `${hostDme}\0${hostDmb}`)
                .catch((error) => {
                  this.appendOutput(`Cleanup failed: ${String(error)}\n`)
                })
            })
          } catch (error) {
            this.appendOutput(`DreamDaemon failed: ${String(error)}\n`)
          }
        } else {
          // compile failed: show buffered compiler output and cleanup
          if (dmOutputBuf.length > 0) {
            this.appendOutput(dmOutputBuf.join(''))
          }
          try {
            await commandQueueService.runProcess('/bin/rm', `${hostDme}\0${hostDmb}`)
          } catch (error) {
            this.appendOutput(`Cleanup failed: ${String(error)}\n`)
          }
        }
      })
    }
  }

  cancel() {
    for (const pid of this.activePids) {
      commandQueueService.signal(pid, 15)
    }
    this.activePids.clear()
    this.appendOutput('Execution cancelled.\n')
    this.setStatus('idle')
  }

  private attachProcess(process: Process, opts: { pipeOutput?: boolean } = { pipeOutput: true }) {
    this.activePids.add(process.pid)
    if (opts.pipeOutput !== false) {
      process.addEventListener('stdout', (event) => {
        const detail = (event as CustomEvent<string>).detail
        this.appendOutput(detail)
      })
      process.addEventListener('stderr', (event) => {
        const detail = (event as CustomEvent<string>).detail
        this.appendOutput(detail)
      })
    }
    process.addEventListener('exit', () => {
      this.activePids.delete(process.pid)
      if (this.activePids.size === 0) {
        this.setStatus('idle')
      }
    })
  }
}

export const executorService = new ExecutorService()
