import { useEffect, useRef } from 'react'
import {
  useFontFamilySetting,
  useShowAdvancedEditorTabsSetting,
} from '../settings/localSettings'
import type { BytecodeInstruction, BytecodeProc } from '../stores/bytecodeStore'
import useBytecodeStore from '../stores/bytecodeStore'

/** Godbolt-style alternating line-group colors */
const LINE_COLORS = [
  'rgba(120, 160, 255, 0.10)',
  'rgba(255, 200, 80, 0.10)',
  'rgba(100, 210, 140, 0.10)',
  'rgba(255, 110, 150, 0.10)',
  'rgba(170, 130, 230, 0.10)',
  'rgba(60, 220, 230, 0.10)',
]

function getLineColor(
  line: number | null,
  baseColor: number
): string | undefined {
  if (line == null) return undefined
  return LINE_COLORS[(line - baseColor) % LINE_COLORS.length]
}

function InstructionRow({
  ins,
  isHighlighted,
  baseColor,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  ins: BytecodeInstruction
  isHighlighted: boolean
  baseColor: number
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
}) {
  const bg = getLineColor(ins.line, baseColor)

  return (
    <div
      className="relative flex gap-3 px-2.5 py-px cursor-pointer"
      style={bg ? { backgroundColor: bg } : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {isHighlighted && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
      )}
      <span className="text-slate-500 select-none w-6 text-right shrink-0">
        {ins.offset.toString(16).padStart(4, '0')}
      </span>
      <span className="text-slate-400 w-29 shrink-0 truncate" title={ins.hex}>
        {ins.hex}
      </span>
      <span className="text-[var(--editor-text)]">{ins.text}</span>
    </div>
  )
}

function ProcSection({
  proc,
  highlightedKeys,
  onLeave,
}: {
  proc: BytecodeProc
  highlightedKeys: Set<string>
  onLeave: () => void
}) {
  // Zustand actions are stable, safe to read once at module level via getState
  const { setHoveredSource, setPendingFocus } = useBytecodeStore.getState()
  // Use the first defined line number in this proc as the color base so
  // colors are relative within each proc rather than globally by line number.
  const baseColor = proc.instructions.find((i) => i.line != null)?.line ?? 0

  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-xs font-semibold text-[var(--editor-button-border-hover)] border-b border-[var(--editor-border)] mb-1 sticky top-0 bg-[var(--editor-header-bg)] z-10">
        {proc.path}
      </div>
      {proc.instructions.map((ins) => (
        <InstructionRow
          key={ins.offset}
          ins={ins}
          isHighlighted={highlightedKeys.has(`${proc.path}::${ins.offset}`)}
          baseColor={baseColor}
          onMouseEnter={() =>
            ins.line != null && ins.file != null
              ? setHoveredSource({
                  line: ins.line,
                  file: ins.file.replace(/\.dm$/, ''),
                })
              : setHoveredSource(null)
          }
          onMouseLeave={onLeave}
          onClick={() => {
            if (ins.line != null && ins.file != null) {
              setPendingFocus({
                line: ins.line,
                file: ins.file.replace(/\.dm$/, ''),
              })
            }
          }}
        />
      ))}
    </div>
  )
}

export function BytecodePanel() {
  const disassembly = useBytecodeStore((s) => s.disassembly)
  const status = useBytecodeStore((s) => s.status)
  const errorMessage = useBytecodeStore((s) => s.errorMessage)
  const hoveredBytecodeOffsets = useBytecodeStore(
    (s) => s.hoveredBytecodeOffsets
  )
  const [fontFamily] = useFontFamilySetting()
  const [showAdvancedEditorTabs] = useShowAdvancedEditorTabsSetting()
  const containerRef = useRef<HTMLDivElement>(null)

  const highlightedKeys = hoveredBytecodeOffsets ?? new Set<string>()

  const handleLeave = () => useBytecodeStore.getState().setHoveredSource(null)

  // Auto-scroll to top when new disassembly arrives
  useEffect(() => {
    if (disassembly && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [disassembly])

  if (status === 'loading') {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-500">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-400 border-t-transparent mr-2" />
        Waiting for disassembly...
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="h-full flex items-center justify-center text-xs text-red-400 px-4 text-center">
        {errorMessage || 'Disassembly failed'}
      </div>
    )
  }

  if (!disassembly) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-500">
        Run code to see bytecode
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto text-[11px] leading-[1.4rem] bg-[var(--editor-header-bg)]"
      style={{ fontFamily }}
    >
      {disassembly.procs
        .filter((proc) => showAdvancedEditorTabs || proc.path !== '/world/New')
        .map((proc) => (
          <ProcSection
            key={proc.path}
            proc={proc}
            highlightedKeys={highlightedKeys}
            onLeave={handleLeave}
          />
        ))}
    </div>
  )
}

export function BytecodePanelHeader() {
  return <span>Bytecode</span>
}
