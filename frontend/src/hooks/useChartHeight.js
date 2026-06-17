import { useEffect, useState } from 'react'

/** Returns explicit pixel height for Recharts (avoids height="100%" measuring as -1). */
export function useChartHeight(mobile, desktop) {
  const query = '(max-width: 767px)'
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return desktop
    return window.matchMedia(query).matches ? mobile : desktop
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setHeight(mq.matches ? mobile : desktop)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [mobile, desktop])

  return height
}
