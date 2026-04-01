import { create, type StateCreator } from 'zustand'
import { executorService } from '../../services/ExecutorService'
import {
  parseCompilerOutput,
  type OutputSegment,
} from '../../utils/compilerOutputParser'

export type ExecutorState = {
  status: 'running' | 'idle'
  output: OutputSegment[]
  appendOutput: (item: OutputSegment) => void
  resetOutput: () => void
  setStatus: (s: 'running' | 'idle') => void
}

const initializer: StateCreator<ExecutorState> = (set) => {
  const handleOutput = (event: Event) => {
    const detail = (event as CustomEvent<OutputSegment>).detail

    // If the producer specified a color or bold explicitly, respect it and don't parse.
    if (detail.color !== undefined || detail.bold !== undefined) {
      set((state) => ({ output: [...state.output, detail] }))
      return
    }

    const text = detail.text ?? ''

    // Parse and return segments (preserves newlines)
    const newItems: OutputSegment[] = parseCompilerOutput(text).map((s) => ({
      text: s.text,
      color: s.color,
      bold: s.bold,
    }))

    if (newItems.length === 0) {
      // Nothing matched; append original
      set((state) => ({ output: [...state.output, detail] }))
    } else {
      set((state) => ({ output: [...state.output, ...newItems] }))
    }
  }

  const handleReset = () => set({ output: [] })

  const handleStatus = (event: Event) => {
    const detail = (event as CustomEvent<'running' | 'idle'>).detail
    set({ status: detail })
  }

  executorService.addEventListener('output', handleOutput)
  executorService.addEventListener('reset', handleReset)
  executorService.addEventListener('status', handleStatus)

  return {
    status: executorService.getStatus(),
    output: [],
    appendOutput: (item) => set((s) => ({ output: [...s.output, item] })),
    resetOutput: () => set({ output: [] }),
    setStatus: (s) => set({ status: s }),
  }
}

const useExecutorStore = create<ExecutorState>(initializer)

export default useExecutorStore
