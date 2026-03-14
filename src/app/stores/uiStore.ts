import { create, type StateCreator } from 'zustand'

type UIState = {
  isMobile: boolean
  setIsMobile: (v: boolean) => void
}

const getInitialIsMobile = () =>
  typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false

const initializer: StateCreator<UIState> = (set) => ({
  isMobile: getInitialIsMobile(),
  setIsMobile: (v: boolean) => set({ isMobile: v }),
})

const useUIStore = create<UIState>(initializer)

if (typeof window !== 'undefined') {
  const handleResize = () =>
    useUIStore.getState().setIsMobile(window.innerHeight > window.innerWidth)
  window.addEventListener('resize', handleResize)
}

export default useUIStore
