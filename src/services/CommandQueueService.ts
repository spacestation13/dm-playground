import { Base64 } from 'js-base64'

export type ControllerEventType = 'boot' | 'stdout' | 'stderr' | 'pidexit' | 'unknown' | 'sent'

export interface ControllerEvent {
  type: ControllerEventType
  pid?: number
  data?: string
  code?: number
}

export class Process extends EventTarget {
  constructor(public readonly pid: number) {
    super()
  }

  emitStdout(data: string) {
    this.dispatchEvent(new CustomEvent('stdout', { detail: data }))
  }

  emitStderr(data: string) {
    this.dispatchEvent(new CustomEvent('stderr', { detail: data }))
  }

  emitExit(code: number) {
    this.dispatchEvent(new CustomEvent('exit', { detail: code }))
  }
}

export class CommandQueueService {
  private sender: ((value: string) => void) | null = null
  private buffer = ''
  private nextPid = 1
  private processes = new Map<number, Process>()
  private events = new EventTarget()
  private booted = false
  private pollTimer: number | null = null

  setSender(sender: (value: string) => void) {
    this.sender = sender
  }

  get isBooted() {
    return this.booted
  }

  addEventListener(type: ControllerEventType, listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener(type, listener)
  }

  removeEventListener(type: ControllerEventType, listener: EventListenerOrEventListenerObject) {
    this.events.removeEventListener(type, listener)
  }

  run(command: string, args: string[] = []) {
    const pid = this.nextPid++
    const process = new Process(pid)
    this.processes.set(pid, process)
    this.send(`run ${pid} ${command} ${args.join(' ')}`.trim())
    return process
  }

  signal(pid: number, signal: string) {
    this.send(`signal ${pid} ${signal}`)
  }

  poll() {
    this.send('poll')
  }

  startPolling(intervalMs = 250) {
    if (this.pollTimer) {
      return
    }
    this.pollTimer = self.setInterval(() => this.poll(), intervalMs)
  }

  stopPolling() {
    if (!this.pollTimer) {
      return
    }
    clearInterval(this.pollTimer)
    this.pollTimer = null
  }

  handleInput(chunk: string) {
    this.buffer += chunk
    const parts = this.buffer.split('\0')
    this.buffer = parts.pop() ?? ''
    for (const part of parts) {
      const message = part.trim()
      if (message.length === 0) {
        continue
      }
      this.handleMessage(message)
    }
  }

  private send(message: string) {
    if (!this.sender) {
      return
    }
    this.events.dispatchEvent(new CustomEvent('sent', { detail: message }))
    this.sender(`${message}\0`)
  }

  private handleMessage(message: string) {
    if (message === 'HELLO') {
      this.booted = true
      this.events.dispatchEvent(new CustomEvent('boot'))
      return
    }

    const lines = message.split('\n').filter(Boolean)
    for (const line of lines) {
      const decoded = this.decodeLine(line)
      const [type, pidToken, ...rest] = decoded.split(' ')
      const pid = pidToken ? Number(pidToken) : undefined
      const payload = rest.join(' ')

      if (type === 'stdout' && pid !== undefined) {
        this.processes.get(pid)?.emitStdout(payload)
        this.events.dispatchEvent(new CustomEvent('stdout', { detail: { pid, data: payload } }))
      } else if (type === 'stderr' && pid !== undefined) {
        this.processes.get(pid)?.emitStderr(payload)
        this.events.dispatchEvent(new CustomEvent('stderr', { detail: { pid, data: payload } }))
      } else if (type === 'pidexit' && pid !== undefined) {
        const code = rest.length > 0 ? Number(rest[0]) : 0
        this.processes.get(pid)?.emitExit(code)
        this.events.dispatchEvent(new CustomEvent('pidexit', { detail: { pid, code } }))
      } else {
        this.events.dispatchEvent(new CustomEvent('unknown', { detail: { data: decoded } }))
      }
    }
  }

  private decodeLine(line: string) {
    try {
      return Base64.decode(line)
    } catch {
      return line
    }
  }
}
