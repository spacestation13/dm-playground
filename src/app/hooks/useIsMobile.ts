import useUIStore from '../stores/uiStore'

export function useIsMobile() {
  return useUIStore((s) => s.isMobile)
}
