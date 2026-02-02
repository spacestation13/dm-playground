export type ControllerEventType = 'boot' | 'sent'

export interface CommandResultOK<C extends Command> {
  status: 'OK'
  result: CommandReturnType<C>
}

export interface CommandResultErr {
  status: 'ERR'
  error: string
}
export type CommandResult<C extends Command> = CommandResultOK<C> | CommandResultErr

export type CommandReturnType<C extends Command> = C extends SignalCommand
  ? null
  : C extends RunCommand
    ? number
    : C extends PollCommand
      ? PollEvent[]
      : never

export type Command = SignalCommand | RunCommand | PollCommand

type QueuedCommand<T extends Command> = T & {
  resultCallback: (result: CommandResult<T>) => unknown
}

export type PollEvent = ExitPollEvent | StdoutPollEvent | StderrPollEvent

export interface ExitPollEvent {
  event: 'pidexit'
  pid: number
  exit: number
}
export interface StdoutPollEvent {
  event: 'stdout'
  pid: number
  data: string
}
export interface StderrPollEvent {
  event: 'stderr'
  pid: number
  data: string
}

export interface SignalCommand {
  type: 'signal'
  pid: number
  signal: number
}

export interface RunCommand {
  type: 'run'
  binary: string
  args: string
  env: Map<string, string>
}

export interface PollCommand {
  type: 'poll'
}

export type ProcessExit =
  | { cause: 'signal'; signal: number }
  | { cause: 'exit'; code: number }
  | { cause: 'unknown' }

export class Process extends EventTarget {
  public killed = false

  constructor(
    public readonly pid: number,
    private readonly commandQueue: CommandQueueService,
  ) {
    super()
  }

  emitStdout(data: string) {
    this.dispatchEvent(new CustomEvent('stdout', { detail: data }))
  }

  emitStderr(data: string) {
    this.dispatchEvent(new CustomEvent('stderr', { detail: data }))
  }

  emitExit(exit: ProcessExit) {
    this.dispatchEvent(new CustomEvent('exit', { detail: exit }))
  }

  signal(signal = 15) {
    return this.commandQueue.queueCommand({ type: 'signal', pid: this.pid, signal })
  }

  kill(): Promise<CommandResult<SignalCommand>> {
    return new Promise((resolve, reject) => {
      this.signal(15)
        .then((res) => {
          if (res.status === 'ERR') return reject(res.error)
          this.addEventListener('exit', () => resolve({ status: 'OK', result: null }))
          setTimeout(() => {
            if (!this.killed) {
              this.signal(9)
                .then((innerRes) => {
                  if (innerRes.status === 'ERR') reject(innerRes.error)
                })
                .catch((err) => reject(err))
            }
          }, 15000)
        })
        .catch((err) => reject(err))
    })
  }
}

export class CommandQueueService {
  private sender: ((value: string) => void) | null = null
  private queue: QueuedCommand<Command>[] = []
  private activeCommand: QueuedCommand<Command> | null = null
  private resultBuffer = ''
  private queueSuspended = false
  private queueEmpty = true
  private isBusy = false
  private initialized = false
  private trackedProcesses = new Map<number, Process>()
  private idlePollDelay = 50
  private events = new EventTarget()

  setSender(sender: (value: string) => void) {
    this.sender = sender
  }

  addEventListener(type: ControllerEventType, listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener(type, listener)
  }

  getBusy() {
    return this.isBusy
  }

  removeEventListener(type: ControllerEventType, listener: EventListenerOrEventListenerObject) {
    this.events.removeEventListener(type, listener)
  }

  addBusyListener(listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener('busy', listener)
  }

  removeBusyListener(listener: EventListenerOrEventListenerObject) {
    this.events.removeEventListener('busy', listener)
  }

  receiveInput(chunk: string) {
    for (const chr of chunk) {
      this.receiveChr(chr)
    }
  }

  queueCommand<C extends Command>(command: C): Promise<CommandResult<C>> {
    return new Promise((resolve) => {
      const queuedCommand: QueuedCommand<C> = {
        ...command,
        resultCallback: resolve,
      }
      this.queue.push(queuedCommand as unknown as QueuedCommand<Command>)
      if (this.queueEmpty) {
        this.queueEmpty = false
        this.updateBusy()
        this.tickQueue()
      }
    })
  }

  async runProcess(
    path: string | string[],
    args = '',
    env = new Map<string, string>(),
  ): Promise<Process> {
    if (Array.isArray(path)) {
      args = `-e\0-u\0-o\0pipefail\0-c\0${path.join(';')}\0${args}`
      path = '/bin/sh'
    }

    const result = await this.queueCommand({ type: 'run', binary: path, args, env })
    if (result.status === 'ERR') throw Error('Failed to create process: ' + result.error)

    const tracked = this.trackedProcesses.get(result.result)
    if (!tracked) throw Error('Process was created but not tracked')
    return tracked
  }

  async runToCompletion(path: string | string[], args = '', env = new Map<string, string>()) {
    const process = await this.runProcess(path, args, env)
    const exit = await this.waitForExit(process)
    return exit
  }

  async runToSuccess(path: string | string[], args = '', env = new Map<string, string>()) {
    const exit = await this.runToCompletion(path, args, env)
    if (exit.cause === 'exit' && exit.code !== 0) {
      throw new Error(`Process exited abnormally: ${exit.code}`)
    }
    if (exit.cause === 'signal') {
      throw new Error(`Process killed by signal: ${exit.signal}`)
    }
    return exit
  }

  signal(pid: number, signal: number) {
    return this.queueCommand({ type: 'signal', pid, signal })
  }

  private tickQueue() {
    if (!this.queue.length && !this.trackedProcesses.size) {
      this.queueEmpty = true
      this.updateBusy()
      return
    }

    this._tickQueue().catch((error) => {
      console.error('Command queue error', error)
      this.queueSuspended = true
    })
  }

  private async _tickQueue() {
    if (this.queueSuspended || !this.initialized) return

    let command = this.queue.shift()
    if (!command) {
      command = { type: 'poll', resultCallback: () => {} }
    }

    let cmdStr = ''
    switch (command.type) {
      case 'signal': {
        cmdStr = `signal ${command.pid} ${command.signal}`
        break
      }
      case 'run': {
        const binary = btoa(command.binary)
        const args = btoa(command.args)
        let env = ''
        for (let [key, val] of command.env.entries()) {
          key = key.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/=/g, '\\=')
          val = val.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/=/g, '\\=')
          env += `${key}=${val};`
        }
        cmdStr = `run ${binary} ${args} ${btoa(env)}`
        break
      }
      case 'poll':
        cmdStr = 'poll'
        break
    }

    this.activeCommand = command
    this.send(cmdStr)
  }

  private receiveChr(chr: string) {
    if (this.initialized && this.queueSuspended) return

    if (chr === '\0' && this.resultBuffer === 'HELLO') {
      if (this.initialized) throw Error('Controller initialized twice. It probably crashed.')
      this.initialized = true
      this.resultBuffer = ''
      this.events.dispatchEvent(new CustomEvent('boot'))
      this.tickQueue()
      return
    }

    if (chr === '\0') {
      try {
        this.processResult()
      } finally {
        this.activeCommand = null
        this.resultBuffer = ''
      }

      if (this.queue.length) {
        this.tickQueue()
      } else {
        if (this.idlePollDelay === -1) {
          this.tickQueue()
        } else {
          setTimeout(() => this.tickQueue(), this.idlePollDelay)
        }
      }
      return
    }

    this.resultBuffer += chr
  }

  private processResult() {
    if (!this.activeCommand) {
      throw new Error('Received result without any active commands')
    }

    const components = this.resultBuffer.split('\n') as string[]
    const status = components.pop() as string
    const callback = this.activeCommand.resultCallback

    if (status === 'ERR') {
      const errRes: CommandResultErr = {
        status: 'ERR',
        error: components.map(atob).join('\n'),
      }
      callback(errRes)
      return
    }

    switch (this.activeCommand.type) {
      case 'poll': {
        const res = components.map((pollevent) => {
          const [type, ...pollComponents] = pollevent.split(' ')
          switch (type) {
            case 'pidexit': {
              return {
                event: 'pidexit',
                pid: parseInt(pollComponents[0]),
                exit: parseInt(pollComponents[1]),
              } as ExitPollEvent
            }
            case 'stderr':
            case 'stdout': {
              return {
                event: type,
                pid: parseInt(pollComponents[0]),
                data: atob(pollComponents[1]),
              } as StdoutPollEvent | StderrPollEvent
            }
            default: {
              throw Error('Unknown event type: ' + type)
            }
          }
        }) as PollEvent[]

        res.forEach((pollEvent) => {
          const trackedProcess = this.trackedProcesses.get(pollEvent.pid)
          if (!trackedProcess) return
          if (pollEvent.event === 'pidexit') {
            if (pollEvent.exit >= 257) {
              trackedProcess.emitExit({ cause: 'signal', signal: pollEvent.exit - 256 })
            } else if (pollEvent.exit === 256) {
              trackedProcess.emitExit({ cause: 'unknown' })
            } else {
              trackedProcess.emitExit({ cause: 'exit', code: pollEvent.exit })
            }
            trackedProcess.killed = true
            this.trackedProcesses.delete(pollEvent.pid)
          } else {
            trackedProcess[pollEvent.event === 'stdout' ? 'emitStdout' : 'emitStderr'](
              pollEvent.data,
            )
          }
        })

        callback({ status: 'OK', result: res } as CommandResult<PollCommand>)
        break
      }
      case 'signal': {
        callback({ status: 'OK', result: null } as CommandResult<SignalCommand>)
        break
      }
      case 'run': {
        const pid = parseInt(components[0] ?? '')
        if (Number.isNaN(pid)) {
          throw new Error('Failed to parse pid from controller response')
        }
        const process = new Process(pid, this)
        this.trackedProcesses.set(pid, process)
        callback({ status: 'OK', result: pid } as CommandResult<RunCommand>)
        break
      }
    }

    this.updateBusy()
  }

  private waitForExit(process: Process): Promise<ProcessExit> {
    return new Promise((resolve) => {
      const handler = (event: Event) => {
        process.removeEventListener('exit', handler)
        resolve((event as CustomEvent<ProcessExit>).detail)
      }
      process.addEventListener('exit', handler)
    })
  }

  private send(message: string) {
    if (!this.sender) return
    this.events.dispatchEvent(new CustomEvent('sent', { detail: message }))
    this.sender(`${message}\0`)
  }

  private updateBusy() {
    const value = Boolean(
      this.activeCommand || this.queue.length > 0 || this.trackedProcesses.size > 0,
    )
    if (this.isBusy === value) {
      return
    }
    this.isBusy = value
    this.events.dispatchEvent(new CustomEvent('busy', { detail: value }))
  }
}

export const commandQueueService = new CommandQueueService()
