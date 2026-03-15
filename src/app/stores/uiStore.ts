import { create, type StateCreator } from 'zustand'

type UIState = {
  isMobile: boolean
  setIsMobile: (v: boolean) => void
  isWideEditorControls: boolean
  setIsWideEditorControls: (v: boolean) => void
}

const getInitialIsMobile = () =>
  typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false

const getInitialIsWideEditorControls = () =>
  typeof window !== 'undefined' ? window.innerWidth > 400 : true

const initializer: StateCreator<UIState> = (set) => ({
  isMobile: getInitialIsMobile(),
  setIsMobile: (v: boolean) => set({ isMobile: v }),
  isWideEditorControls: getInitialIsWideEditorControls(),
  setIsWideEditorControls: (v: boolean) => set({ isWideEditorControls: v }),
})

const useUIStore = create<UIState>(initializer)

if (typeof window !== 'undefined') {
  const handleResize = () => {
    const s = useUIStore.getState()
    s.setIsMobile(window.innerHeight > window.innerWidth)
    s.setIsWideEditorControls(window.innerWidth > 400)
  }
  window.addEventListener('resize', handleResize)
}

export default useUIStore
