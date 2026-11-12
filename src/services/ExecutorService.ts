import {
  DISASM_LIB_PATH,
  DISASM_PARAMS,
  DISASM_SO_NAME,
} from '../app/editorProject/disasmProject'
import {
  buildProjectExecutionFiles,
  type PlaygroundProject,
} from '../app/editorProject/projectState'
import useLocalSettings, {
  selectBytecodeEnabled,
} from '../app/settings/localSettings'
import useBytecodeStore from '../app/stores/bytecodeStore'
import {
  type OutputSegment,
  parseCompilerErrorLine,
} from '../utils/compilerOutputParser'
import { byondService } from './ByondService'
import {
  commandQueueService,
  type Process,
  type ProcessExit,
} from './CommandQueueService'
import { createDisasmInterceptor, fetchDisasmSo } from './DisassemblyService'
import { emulatorService } from './EmulatorService'
import { ensureRuntime } from './runtimeBootstrap'

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
    value:
      | string
      | { text: string; color?: string; bold?: boolean; system?: boolean },
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
      const showBytecodePanel = selectBytecodeEnabled(
        useLocalSettings.getState()
      )

      // Pre-fetch the disasm .so before building execution files so we know
      // whether to inject the disasm DM code.
      let disasmSo: Uint8Array | null = null
      if (showBytecodePanel) {
        disasmSo = await fetchDisasmSo()
        if (disasmSo === null) {
          useBytecodeStore
            .getState()
            .setError('Disassembly library not available')
        }
      }
      const effectiveDisasm = showBytecodePanel && disasmSo !== null

      const executionFiles = buildProjectExecutionFiles(project, {
        disassembly: effectiveDisasm,
      })

      const hostDme = `/mnt/host/${executionFiles.dmeName}`
      const hostDmb = `/mnt/host/${executionFiles.dmbName}`
      const hostCleanupTargets = [
        executionFiles.dmeName,
        executionFiles.dmbName,
        ...executionFiles.files.map((file) => file.name),
      ]
      const cleanupArgs = [
        ...hostCleanupTargets.map((fileName) => `/mnt/host/${fileName}`),
        ...(effectiveDisasm ? [DISASM_LIB_PATH] : []),
      ].join('\0')
      const encoder = new TextEncoder()

      await Promise.all([
        emulatorService.sendFile(
          executionFiles.dmeName,
          encoder.encode(executionFiles.dmeContent)
        ),
        ...executionFiles.files.map((file) =>
          emulatorService.sendFile(file.name, encoder.encode(file.value))
        ),
        ...(effectiveDisasm && disasmSo !== null
          ? [emulatorService.sendFile(DISASM_SO_NAME, disasmSo.slice())]
          : []),
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
        this.attachProcess(dmProcess, {
          suppressIdleOnExit: true,
          system: true,
        })

        const handleDmExit = async (event: Event) => {
          const detail = (event as CustomEvent<ProcessExit>).detail
          const code = detail.cause === 'exit' ? detail.code : null
          if (code === 0) {
            this.appendOutput({
              text: '-- DreamDaemon --\n',
              color: 'var(--editor-button-border-hover)',
              system: true,
            })
            try {
              await this.startDaemons({
                byondPath,
                hostDmb,
                env,
                cleanupArgs,
                disassembly: effectiveDisasm,
                display: { tagDaemonBannerAsSystem: true },
              })
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
                  if (!line?.trim()) continue

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
              await this.startDaemons({
                byondPath,
                hostDmb,
                env,
                cleanupArgs,
                disassembly: effectiveDisasm,
                display: { suppressDaemonBanner: true },
              })
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
                if (!line?.trim()) continue

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

  /**
   * Starts the program's DreamDaemon and, with bytecode on, a second one that only disassembles the world,
   * so the program's output isn't held up by the disassembly. Cleans up once both have exited.
   */
  private async startDaemons(opts: {
    byondPath: string
    hostDmb: string
    env: Map<string, string>
    cleanupArgs: string
    disassembly: boolean
    display: {
      suppressDaemonBanner?: boolean
      tagDaemonBannerAsSystem?: boolean
    }
  }) {
    if (opts.disassembly) {
      // Wait for the copy: a library still being written crashes DreamDaemon when it loads it.
      await commandQueueService.runToSuccess(
        '/bin/cp',
        `/mnt/host/${DISASM_SO_NAME}\0${DISASM_LIB_PATH}`
      )
    }

    const daemon = `${opts.byondPath}DreamDaemon`
    const args = `${opts.hostDmb}\0-trusted\0-invisible`
    const program = await commandQueueService.runProcess(daemon, args, opts.env)
    this.attachProcess(program, opts.display)
    const exits = [commandQueueService.waitForExit(program)]

    if (opts.disassembly) {
      const disassembler = await commandQueueService.runProcess(
        daemon,
        `${args}\0-params\0${DISASM_PARAMS}`,
        opts.env
      )
      this.attachDisassembler(disassembler)
      exits.push(commandQueueService.waitForExit(disassembler))
    }

    void Promise.all(exits)
      .then(() => commandQueueService.runProcess('/bin/rm', opts.cleanupArgs))
      .catch((error) => {
        this.appendOutput(`Cleanup failed: ${String(error)}\n`)
      })
  }

  /** Feeds the disassembling DreamDaemon's output to the bytecode panel; none of it is shown as output. */
  private attachDisassembler(process: Process) {
    this.activePids.add(process.pid)
    const intercept = createDisasmInterceptor()
    const handleOutput = (event: Event) => {
      intercept((event as CustomEvent<string>).detail)
    }
    process.addEventListener('stdout', handleOutput)
    process.addEventListener('stderr', handleOutput)
    process.addEventListener(
      'exit',
      () => {
        process.removeEventListener('stdout', handleOutput)
        process.removeEventListener('stderr', handleOutput)
        const bytecode = useBytecodeStore.getState()
        if (!this.cancelled && bytecode.status === 'loading') {
          bytecode.setError('Disassembly failed')
        }
        this.activePids.delete(process.pid)
        if (this.activePids.size === 0) {
          this.setStatus('idle')
        }
      },
      { once: true }
    )
  }

  private attachProcess(
    process: Process,
    opts: {
      pipeOutput?: boolean
      suppressDaemonBanner?: boolean
      tagDaemonBannerAsSystem?: boolean
      suppressIdleOnExit?: boolean
      system?: boolean
    } = {
      pipeOutput: true,
    }
  ) {
    this.activePids.add(process.pid)
    const bannerMode = opts.suppressDaemonBanner
      ? 'suppress'
      : opts.tagDaemonBannerAsSystem
        ? 'tag'
        : 'none'
    let remainingBannerLines =
      bannerMode !== 'none' ? DREAM_DAEMON_STARTUP_BANNER_LINES : 0

    const processBannerLines = (
      value: string
    ): { text: string; system?: boolean }[] => {
      if (remainingBannerLines <= 0) {
        return [{ text: value }]
      }

      const lines = value.split('\n')
      const segments: { text: string; system?: boolean }[] = []
      const bannerParts: string[] = []
      const outputParts: string[] = []

      for (const line of lines) {
        if (remainingBannerLines > 0 && line.trim().length > 0) {
          remainingBannerLines -= 1
          if (bannerMode === 'tag') {
            bannerParts.push(line)
          }
          continue
        }
        outputParts.push(line)
      }

      if (bannerParts.length > 0) {
        segments.push({ text: `${bannerParts.join('\n')}\n`, system: true })
      }
      const remaining = outputParts.join('\n')
      if (remaining) {
        segments.push({ text: remaining })
      }

      return segments
    }

    if (opts.pipeOutput !== false) {
      const isSystem = opts.system ?? false
      const emitOutput = (detail: string) => {
        const segments = processBannerLines(detail)
        for (const seg of segments) {
          const text = seg.text
          if (text) {
            const system = seg.system || isSystem || undefined
            this.appendOutput({ text, system })
          }
        }
      }
      const handleStdout = (event: Event) => {
        if (this.cancelled) return
        emitOutput((event as CustomEvent<string>).detail)
      }
      const handleStderr = (event: Event) => {
        if (this.cancelled) return
        emitOutput((event as CustomEvent<string>).detail)
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
