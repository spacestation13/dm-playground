import { useEffect, useState } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    window.innerHeight > window.innerWidth
  )

  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
