import { useEffect, useState } from 'react'
import { Terminal, type TerminalApi } from '../components/Terminal'
import { emulatorService } from '../../services/emulatorSingleton'
import { commandQueueService } from '../../services/commandQueueSingleton'

export function ControllerPanel() {
  const [terminal, setTerminal] = useState<TerminalApi | null>(null)

  useEffect(() => {
    if (!terminal) {
      return
    }

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ port: string; data: string }>).detail
      if (detail.port === 'controller') {
        terminal.write(`\r\n--- controller ---\r\n${detail.data}`)
      }
    }

    const handleSent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      terminal.write(`\r\n>>> ${detail}\r\n`)
    }

    const handleBoot = () => {
      terminal.write('\r\n[controller boot]\r\n')
    }

    emulatorService.addEventListener('receivedOutput', handleOutput)
    commandQueueService.addEventListener('sent', handleSent)
    commandQueueService.addEventListener('boot', handleBoot)
    return () => {
      emulatorService.removeEventListener('receivedOutput', handleOutput)
      commandQueueService.removeEventListener('sent', handleSent)
      commandQueueService.removeEventListener('boot', handleBoot)
    }
  }, [terminal])

  return (
    <Terminal
      label="Controller log"
      readOnly
      onReady={setTerminal}
      onResize={(rows, cols) => emulatorService.resizePort('controller', rows, cols)}
    />
  )
}
