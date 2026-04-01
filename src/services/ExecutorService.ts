import { emulatorService } from './EmulatorService'
import {
  commandQueueService,
  type Process,
  type ProcessExit,
} from './CommandQueueService'
import {
  buildProjectExecutionFiles,
  type PlaygroundProject,
} from '../app/editorProject/projectState'
import { byondService } from './ByondService'
import useLocalSettings from '../app/settings/localSettings'
import { ensureRuntime } from './runtimeBootstrap'
import {
  parseCompilerErrorLine,
  type OutputSegment,
} from '../utils/compilerOutputParser'

export type ExecutorEventType = 'reset' | 'output' | 'status'
const DREAM_DAEMON_STARTUP_BANNER_LINES = 3

export class ExecutorService {
  private events = new EventTarget()
  private activePids = new Set<number>()
  private status: 'running' | 'idle' = 'idle'
  private cancelled = false

  addEventListener(
    type: ExecutorEventType,
    listener: EventListenerOrEventListenerObject
  ) {
    this.events.addEventListener(type, listener)
  }

  removeEventListener(
    type: ExecutorEventType,
    listener: EventListenerOrEventListenerObject
  ) {
    this.events.removeEventListener(type, listener)
  }

  reset() {
    this.cancelled = false
    this.events.dispatchEvent(new CustomEvent('reset'))
  }

  appendOutput(
    value: string | { text: string; color?: string; bold?: boolean },
    color?: string
  ) {
    const item = typeof value === 'string' ? { text: value, color } : value

    this.events.dispatchEvent(new CustomEvent('output', { detail: item }))
  }

  getStatus() {
    return this.status
  }

  setStatus(value: 'running' | 'idle') {
    this.status = value
    this.events.dispatchEvent(new CustomEvent('status', { detail: value }))
  }

  async executeImmediate(project: PlaygroundProject) {
    this.reset()

    try {
      await ensureRuntime()
    } catch (error) {
      this.appendOutput(`Runtime initialization failed: ${String(error)}\n`)
      this.setStatus('idle')
      return
    }

    const byondPath = byondService.getActiveVersion() ? '/var/lib/byond/' : null
    if (!byondPath) {
      this.appendOutput('No active BYOND version loaded.\n')
      this.setStatus('idle')
      return
    }

    try {
      const executionFiles = buildProjectExecutionFiles(project)
      const hostDme = `/mnt/host/${executionFiles.dmeName}`
      const hostDmb = `/mnt/host/${executionFiles.dmbName}`
      const hostCleanupTargets = [
        executionFiles.dmeName,
        executionFiles.dmbName,
        ...executionFiles.files.map((file) => file.name),
      ]
      const cleanupArgs = hostCleanupTargets
        .map((fileName) => `/mnt/host/${fileName}`)
        .join('\0')
      const encoder = new TextEncoder()

      await Promise.all([
        emulatorService.sendFile(
          executionFiles.dmeName,
          encoder.encode(executionFiles.dmeContent)
        ),
        ...executionFiles.files.map((file) =>
          emulatorService.sendFile(file.name, encoder.encode(file.value))
        ),
      ])

      const env = new Map<string, string>([['LD_LIBRARY_PATH', byondPath]])
      const streamCompilerOutput =
        useLocalSettings.getState().streamCompilerOutput

      this.setStatus('running')

      const dmProcess = await commandQueueService.runProcess(
        `${byondPath}DreamMaker`,
        hostDme,
        env
      )

      if (streamCompilerOutput) {
        this.attachProcess(dmProcess, { suppressIdleOnExit: true })

        const handleDmExit = async (event: Event) => {
          const detail = (event as CustomEvent<ProcessExit>).detail
          const code = detail.cause === 'exit' ? detail.code : null
          if (code === 0) {
            this.appendOutput(
              '-- DreamDaemon --\n',
              'var(--editor-button-border-hover)'
            )
            try {
              const ddProcess = await commandQueueService.runProcess(
                `${byondPath}DreamDaemon`,
                `${hostDmb}\0-trusted\0-invisible`,
                env
              )
              this.attachProcess(ddProcess)
              ddProcess.addEventListener(
                'exit',
                () => {
                  commandQueueService
                    .runProcess('/bin/rm', cleanupArgs)
                    .catch((error) => {
                      this.appendOutput(`Cleanup failed: ${String(error)}\n`)
                    })
                },
                { once: true }
              )
            } catch (error) {
              this.appendOutput(`DreamDaemon failed: ${String(error)}\n`)
              this.setStatus('idle')
            }
          } else {
            // compile failed: output has already been streamed live, just cleanup
            try {
              await commandQueueService.runProcess('/bin/rm', cleanupArgs)
            } catch (error) {
              this.appendOutput(`Cleanup failed: ${String(error)}\n`)
            }
            this.setStatus('idle')
          }
        }

        dmProcess.addEventListener('exit', handleDmExit, { once: true })
      } else {
        // Buffer compiler output: suppress piping and only show on failure
        this.attachProcess(dmProcess, {
          pipeOutput: false,
          suppressIdleOnExit: true,
        })

        const dmOutputBuf: string[] = []
        const handleDmStdout = (event: Event) => {
          const detail = (event as CustomEvent<string>).detail
          dmOutputBuf.push(detail)
        }
        const handleDmStderr = (event: Event) => {
          const detail = (event as CustomEvent<string>).detail
          dmOutputBuf.push(detail)
        }

        dmProcess.addEventListener('stdout', handleDmStdout)
        dmProcess.addEventListener('stderr', handleDmStderr)

        const handleDmExit = async (event: Event) => {
          dmProcess.removeEventListener('stdout', handleDmStdout)
          dmProcess.removeEventListener('stderr', handleDmStderr)

          const detail = (event as CustomEvent<ProcessExit>).detail
          const code = detail.cause === 'exit' ? detail.code : null

          if (code === 0) {
            // successful compile: show any warnings from the buffered compiler output,
            // then proceed to start DreamDaemon
            try {
              if (dmOutputBuf.length > 0) {
                const buf = dmOutputBuf.join('')
                const lines = buf.split(/\r?\n/)

                const warnItems: OutputSegment[] = []

                for (const line of lines) {
                  if (!line || !line.trim()) continue

                  const parsed = parseCompilerErrorLine(line)
                  if (!parsed) continue
                  if (parsed.errtype !== 'warning') continue

                  const baseFile = parsed.file.includes('/')
                    ? parsed.file.split('/').pop() || parsed.file
                    : parsed.file
                  const isMain = /(^|[-_])main\.dm$/i.test(baseFile)

                  if (!isMain) {
                    warnItems.push({ text: `${baseFile}: ` })
                  }

                  warnItems.push({
                    text: `warning`,
                    color: 'var(--editor-warning-text)',
                    bold: true,
                  })
                  warnItems.push({
                    text: ` (line ${parsed.line})`,
                    color: 'var(--editor-warning-text)',
                  })
                  warnItems.push({
                    text: `: ${parsed.issue}\n`,
                  })
                }

                if (warnItems.length > 0) {
                  for (const it of warnItems) this.appendOutput(it)
                }
              }
              const ddProcess = await commandQueueService.runProcess(
                `${byondPath}DreamDaemon`,
                `${hostDmb}\0-trusted\0-invisible`,
                env
              )
              this.attachProcess(ddProcess, { suppressDaemonBanner: true })
              ddProcess.addEventListener(
                'exit',
                () => {
                  commandQueueService
                    .runProcess('/bin/rm', cleanupArgs)
                    .catch((error) => {
                      this.appendOutput(`Cleanup failed: ${String(error)}\n`)
                    })
                },
                { once: true }
              )
            } catch (error) {
              this.appendOutput(`DreamDaemon failed: ${String(error)}\n`)
              this.setStatus('idle')
            }
          } else {
            // compile failed: parse buffered compiler output and show only parsed errors
            if (dmOutputBuf.length > 0) {
              const buf = dmOutputBuf.join('')
              const lines = buf.split(/\r?\n/)

              const items: OutputSegment[] = []

              for (const line of lines) {
                if (!line || !line.trim()) continue

                const parsed = parseCompilerErrorLine(line)
                if (!parsed) continue

                const file = parsed.file
                const lineNum = parsed.line
                const errtype = parsed.errtype
                const issue = parsed.issue

                const baseFile = file.includes('/')
                  ? file.split('/').pop() || file
                  : file
                const isMain = /(^|[-_])main\.dm$/i.test(baseFile)

                const notMainText = isMain ? '' : `${baseFile} `

                if (errtype === 'error') {
                  items.push({
                    text: 'error',
                    color: 'var(--editor-error-text)',
                    bold: true,
                  })
                  items.push({
                    text: ` (${notMainText}line ${lineNum})`,
                    color: 'var(--editor-error-text)',
                  })
                  items.push({ text: `: ${issue}\n` })
                } else {
                  items.push({
                    text: 'warning',
                    color: 'var(--editor-warning-text)',
                    bold: true,
                  })
                  items.push({
                    text: ` (${notMainText}line ${lineNum})`,
                    color: 'var(--editor-warning-text)',
                  })
                  items.push({ text: `: ${issue}\n` })
                }
              }

              if (items.length > 0) {
                for (const it of items) {
                  this.appendOutput(it)
                }
              } else {
                // Fallback: nothing parsed, show full buffer
                this.appendOutput(buf)
              }
            }
            try {
              await commandQueueService.runProcess('/bin/rm', cleanupArgs)
            } catch (error) {
              this.appendOutput(`Cleanup failed: ${String(error)}\n`)
            }
            this.setStatus('idle')
          }
        }

        dmProcess.addEventListener('exit', handleDmExit, { once: true })
      }
    } catch (error) {
      this.appendOutput(`Execution failed: ${String(error)}\n`)
      this.setStatus('idle')
    }
  }

  cancel() {
    this.cancelled = true
    for (const pid of this.activePids) {
      commandQueueService.signal(pid, 15)
    }
    this.activePids.clear()
    this.appendOutput('// Execution cancelled\n', 'var(--editor-error-text)')
    this.setStatus('idle')
  }

  private attachProcess(
    process: Process,
    opts: {
      pipeOutput?: boolean
      suppressDaemonBanner?: boolean
      suppressIdleOnExit?: boolean
    } = {
      pipeOutput: true,
    }
  ) {
    this.activePids.add(process.pid)
    let remainingBannerLines = opts.suppressDaemonBanner
      ? DREAM_DAEMON_STARTUP_BANNER_LINES
      : 0

    // DreamDaemon emits a startup banner.
    // This drops it, then passes all later output through.
    const dropInitialDaemonBannerLines = (value: string) => {
      if (remainingBannerLines <= 0) {
        return value
      }

      const lines = value.split('\n')
      const output: string[] = []

      for (const line of lines) {
        if (remainingBannerLines > 0 && line.trim().length > 0) {
          remainingBannerLines -= 1
          continue
        }

        output.push(line)
      }

      return output.join('\n')
    }

    if (opts.pipeOutput !== false) {
      const handleStdout = (event: Event) => {
        if (this.cancelled) return
        const detail = (event as CustomEvent<string>).detail
        const output = dropInitialDaemonBannerLines(detail)
        if (output) {
          this.appendOutput(output)
        }
      }
      const handleStderr = (event: Event) => {
        if (this.cancelled) return
        const detail = (event as CustomEvent<string>).detail
        const output = dropInitialDaemonBannerLines(detail)
        if (output) {
          this.appendOutput(output)
        }
      }

      process.addEventListener('stdout', handleStdout)
      process.addEventListener('stderr', handleStderr)

      process.addEventListener(
        'exit',
        () => {
          process.removeEventListener('stdout', handleStdout)
          process.removeEventListener('stderr', handleStderr)
          this.activePids.delete(process.pid)
          if (this.activePids.size === 0 && !opts.suppressIdleOnExit) {
            this.setStatus('idle')
          }
        },
        { once: true }
      )

      return
    }

    process.addEventListener(
      'exit',
      () => {
        this.activePids.delete(process.pid)
        if (this.activePids.size === 0 && !opts.suppressIdleOnExit) {
          this.setStatus('idle')
        }
      },
      { once: true }
    )
  }
}

export const executorService = new ExecutorService()
