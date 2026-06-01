import { create, type StateCreator } from 'zustand'
import { ByondEvent, byondService } from '../../services/ByondService'
import { executorService } from '../../services/ExecutorService'

export interface BytecodeInstruction {
  offset: number
  hex: string
  text: string
  file: string | null
  line: number | null
}

export interface BytecodeProc {
  path: string
  instructions: BytecodeInstruction[]
}

export interface DisassemblyResult {
  procs: BytecodeProc[]
}

export interface BytecodeSourceLocation {
  line: number
  /** file id without .dm extension */
  file: string
}

export type BytecodeState = {
  disassembly: DisassemblyResult | null
  status: 'idle' | 'loading' | 'error'
  errorMessage: string | null
  /** Source location being hovered in the bytecode panel */
  hoveredSource: BytecodeSourceLocation | null
  /** Proc-scoped highlight keys ("procPath::offset") for the editor cursor position */
  hoveredBytecodeOffsets: Set<string> | null
  /** Pending jump: bytecode panel click requesting a cursor move in the editor */
  pendingFocus: BytecodeSourceLocation | null
  /** keyed by file id (without .dm extension); values are "procPath::offset" keys */
  sourceToByteMap: Map<string, Map<number, string[]>>
  setDisassembly: (result: DisassemblyResult) => void
  setError: (message: string) => void
  setHoveredSource: (location: BytecodeSourceLocation | null) => void
  setHoveredBytecodeOffsets: (offsets: Set<string> | null) => void
  setPendingFocus: (location: BytecodeSourceLocation | null) => void
  reset: () => void
}

function buildSourceToByteMap(result: DisassemblyResult) {
  const map = new Map<string, Map<number, string[]>>()

  for (const proc of result.procs) {
    for (const ins of proc.instructions) {
      if (ins.line == null || ins.file == null) continue
      const fileKey = ins.file.replace(/\.dm$/, '')
      let fileMap = map.get(fileKey)
      if (!fileMap) {
        fileMap = new Map()
        map.set(fileKey, fileMap)
      }
      const key = `${proc.path}::${ins.offset}`
      const existing = fileMap.get(ins.line) ?? []
      existing.push(key)
      fileMap.set(ins.line, existing)
    }
  }

  return map
}

const emptyState = {
  disassembly: null,
  status: 'idle' as const,
  errorMessage: null,
  hoveredSource: null,
  hoveredBytecodeOffsets: null,
  pendingFocus: null,
  sourceToByteMap: new Map<string, Map<number, string[]>>(),
}

const initializer: StateCreator<BytecodeState> = (set) => {
  executorService.addEventListener('reset', () => {
    set({ status: 'loading', disassembly: null, errorMessage: null })
  })

  byondService.addEventListener(ByondEvent.Loading, () => {
    set({ status: 'idle', disassembly: null, errorMessage: null })
  })

  return {
    ...emptyState,
    setDisassembly: (result) =>
      set({
        disassembly: result,
        status: 'idle',
        errorMessage: null,
        sourceToByteMap: buildSourceToByteMap(result),
      }),
    setError: (message) =>
      set({ status: 'error', errorMessage: message, disassembly: null }),
    setHoveredSource: (location) => set({ hoveredSource: location }),
    setHoveredBytecodeOffsets: (offsets) =>
      set({ hoveredBytecodeOffsets: offsets }),
    setPendingFocus: (location) => set({ pendingFocus: location }),
    reset: () => set(emptyState),
  }
}

const useBytecodeStore = create<BytecodeState>()(initializer)
export default useBytecodeStore
