import { useEffect, useState } from 'react'
import { Terminal, type TerminalApi } from '../components/Terminal'
import { emulatorService } from '../../services/emulatorSingleton'

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

    emulatorService.addEventListener('receivedOutput', handleOutput)
    return () => emulatorService.removeEventListener('receivedOutput', handleOutput)
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
