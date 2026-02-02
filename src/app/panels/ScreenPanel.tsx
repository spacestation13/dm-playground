import { useEffect, useState } from 'react'
import { Terminal, type TerminalApi } from '../components/Terminal'
import { emulatorService } from '../../services/emulatorSingleton'

export function ScreenPanel() {
  const [terminal, setTerminal] = useState<TerminalApi | null>(null)

  useEffect(() => {
    if (!terminal) {
      return
    }

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ port: string; data: string }>).detail
      if (detail.port === 'screen') {
        terminal.write(detail.data)
      }
    }

    emulatorService.addEventListener('receivedOutput', handleOutput)
    return () => emulatorService.removeEventListener('receivedOutput', handleOutput)
  }, [terminal])

  return <Terminal label="Screen output" readOnly onReady={setTerminal} />
}
