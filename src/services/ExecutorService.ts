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
    this.appendOutput(`Code length: ${code.length}\n`)
    this.appendOutput('DreamMaker complete. Starting DreamDaemon...\n')
    this.appendOutput('DreamDaemon exited with code 0\n')
  }
}
