import { useEffect, useState } from 'react'
import { Terminal, type TerminalApi } from '../components/Terminal'
import { emulatorService } from '../../services/emulatorSingleton'

export function ConsolePanel() {
  const [terminal, setTerminal] = useState<TerminalApi | null>(null)

  useEffect(() => {
    if (!terminal) {
      return
    }

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ port: string; data: string }>).detail
      if (detail.port === 'console') {
        terminal.write(detail.data)
      }
    }

    const handleReset = () => terminal.clear()

    emulatorService.addEventListener('receivedOutput', handleOutput)
    emulatorService.addEventListener('resetOutputConsole', handleReset)

    return () => {
      emulatorService.removeEventListener('receivedOutput', handleOutput)
      emulatorService.removeEventListener('resetOutputConsole', handleReset)
    }
  }, [terminal])

  return (
    <Terminal
      label="Console ready"
      onReady={setTerminal}
      onData={(value) => emulatorService.sendPort('console', value)}
      onResize={(rows, cols) => emulatorService.resizePort('console', rows, cols)}
    />
  )
}
