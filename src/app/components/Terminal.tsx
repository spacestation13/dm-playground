import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  label: string
  readOnly?: boolean
}

export function Terminal({ label, readOnly = false }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const terminal = new XTerm({
      convertEol: true,
      disableStdin: readOnly,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      theme: {
        background: '#020617',
        foreground: '#e2e8f0',
        cursor: '#e2e8f0',
        selectionBackground: '#1e293b',
      },
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()
    terminal.write(`${label}\r\n`)

    const observer = new ResizeObserver(() => {
      fitAddon.fit()
    })
    observer.observe(containerRef.current)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    return () => {
      observer.disconnect()
      terminal.dispose()
    }
  }, [label, readOnly])

  return <div ref={containerRef} className="h-full min-h-0 w-full rounded border border-slate-800 bg-slate-950/60" />
}
