import { create, type StateCreator } from 'zustand'
import { executorService } from '../../services/ExecutorService'

export type OutputItem = { text: string; color?: string }

export type ExecutorState = {
  status: 'running' | 'idle'
  output: OutputItem[]
  appendOutput: (item: OutputItem) => void
  resetOutput: () => void
  setStatus: (s: 'running' | 'idle') => void
}

const initializer: StateCreator<ExecutorState> = (set) => {
  const handleOutput = (event: Event) => {
    const detail = (event as CustomEvent<OutputItem>).detail
    set((state) => ({ output: [...state.output, detail] }))
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
