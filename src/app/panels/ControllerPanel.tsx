import { useEffect, useState } from 'react'
import { Base64 } from 'js-base64'
import { Terminal, type TerminalApi } from '../components/Terminal'
import { emulatorService } from '../../services/EmulatorService'
import { commandQueueService } from '../../services/CommandQueueService'

export function ControllerTitle() {
  const [busy, setBusy] = useState(() => commandQueueService.getBusy())

  useEffect(() => {
    const handleBusy = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      setBusy(detail)
    }
    commandQueueService.addBusyListener(handleBusy)
    return () => commandQueueService.removeBusyListener(handleBusy)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <span>Controller</span>
      {busy && (
        <span className="inline-flex items-center gap-2 text-xs text-emerald-300">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          &nbsp;- Busy
        </span>
      )}
    </div>
  )
}

export function ControllerPanel() {
  const [terminal, setTerminal] = useState<TerminalApi | null>(null)

  useEffect(() => {
    if (!terminal) {
      return
    }

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ port: string; data: string }>).detail
      if (detail.port === 'controller') {
        const decoded = decodeController(detail.data)
        const filtered = decoded
          .split('\n')
          .map((line) => line.replace(/\0/g, '').trim())
          .filter((line) => line && line !== 'OK')
          .join('\n')
        if (!filtered) {
          return
        }
        terminal.write(`\r\n--- controller ---\r\n${filtered}`)
      }
    }

    const handleSent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail.trim() === 'poll') {
        return
      }
      terminal.write(`\r\n>>> ${decodeSent(detail)}\r\n`)
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

function decodeController(input: string) {
  const lines = input.replace(/\0/g, '').split('\n')
  const decodedLines = lines.map((line) => {
    const parts = line.split(' ')
    if (parts.length >= 3 && (parts[0] === 'stdout' || parts[0] === 'stderr')) {
      const payload = parts[2]
      if (isBase64(payload)) {
        try {
          parts[2] = Base64.decode(payload)
        } catch {
          return line
        }
      }
      return parts.join(' ')
    }
    if (parts.length === 1 && isBase64(parts[0])) {
      try {
        return Base64.decode(parts[0])
      } catch {
        return line
      }
    }
    return line.trim() === 'OK' ? '' : line
  })

  return decodedLines.filter(Boolean).join('\n')
}

function isBase64(value: string) {
  return value.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(value)
}

function decodeSent(input: string) {
  const parts = input.split(' ')
  if (parts[0] !== 'run') {
    return input
  }

  const decoded = parts.map((part, index) => {
    if (index === 0) {
      return part
    }
    if (!isBase64(part)) {
      return part
    }
    try {
      return Base64.decode(part)
    } catch {
      return part
    }
  })

  return decoded.join(' ')
}
