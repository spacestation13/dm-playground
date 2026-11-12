import { loader } from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'
import {
  DM_ASM_HEX_LANGUAGE_ID,
  DM_ASM_LANGUAGE_ID,
  ensureDmAsmLanguages,
} from '../monaco/dmAsmLanguage'
import {
  useFontFamilySetting,
  useShowAdvancedEditorTabsSetting,
} from '../settings/localSettings'
import type {
  BytecodeInstruction,
  BytecodeProc,
  DisassemblyResult,
} from '../stores/bytecodeStore'
import useBytecodeStore from '../stores/bytecodeStore'
import useUIStore from '../stores/uiStore'

/** One proc's colorized HTML, one string per instruction */
type ColorizedProc = { text: string[]; hex: string[] }

type ColorizedDisassembly = {
  source: DisassemblyResult
  theme: string
  procs: Map<string, ColorizedProc>
}

/**
 * Highlights the instructions with the editor theme's colors.
 */
function useColorizedDisassembly(disassembly: DisassemblyResult | null) {
  const theme = useUIStore((s) => s.monacoTheme)
  const [colorized, setColorized] = useState<ColorizedDisassembly | null>(null)

  useEffect(() => {
    if (!disassembly || !theme) {
      return
    }

    let cancelled = false
    void (async () => {
      const monaco = await loader.init()
      ensureDmAsmLanguages(monaco)
      const colorize = async (lines: string[], languageId: string) =>
        (await monaco.editor.colorize(lines.join('\n'), languageId, {})).split(
          '<br/>'
        )

      const procs = new Map<string, ColorizedProc>()
      for (const proc of disassembly.procs) {
        procs.set(proc.path, {
          text: await colorize(
            proc.instructions.map((ins) => ins.text),
            DM_ASM_LANGUAGE_ID
          ),
          hex: await colorize(
            proc.instructions.map((ins) => ins.hex),
            DM_ASM_HEX_LANGUAGE_ID
          ),
        })
      }
      if (!cancelled) {
        setColorized({ source: disassembly, theme, procs })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [disassembly, theme])

  return colorized?.source === disassembly && colorized.theme === theme
    ? colorized.procs
    : null
}

/** Monaco's colorizer escapes the text and only adds its own token spans. */
function ColorizedText({
  html,
  text,
  className,
  title,
}: {
  html: string | undefined
  text: string
  className: string
  title?: string
}) {
  return html === undefined ? (
    <span className={className} title={title}>
      {text}
    </span>
  ) : (
    <span
      className={className}
      title={title}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Monaco-escaped markup
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

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
  colorized,
  isHighlighted,
  baseColor,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  ins: BytecodeInstruction
  colorized: { text: string; hex: string } | undefined
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
      <ColorizedText
        className="w-29 shrink-0 truncate text-slate-400"
        title={ins.hex}
        text={ins.hex}
        html={colorized?.hex}
      />
      <ColorizedText
        className="text-[var(--editor-text)]"
        text={ins.text}
        html={colorized?.text}
      />
    </div>
  )
}

function ProcSection({
  proc,
  colorized,
  highlightedKeys,
  onLeave,
}: {
  proc: BytecodeProc
  colorized: ColorizedProc | undefined
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
      {proc.instructions.map((ins, index) => (
        <InstructionRow
          key={ins.offset}
          ins={ins}
          colorized={
            colorized && {
              text: colorized.text[index],
              hex: colorized.hex[index],
            }
          }
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
  const colorized = useColorizedDisassembly(disassembly)

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
            colorized={colorized?.get(proc.path)}
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
