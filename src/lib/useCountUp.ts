import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from its previous value to a new target value.
 * The counter smoothly ticks up/down whenever `target` changes.
 *
 * @param target   The real value to animate toward
 * @param duration Animation duration in ms (default 800)
 */
export function useCountUp(target: number, duration = 800): number {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = prevRef.current
    const end = target
    const diff = end - start
    if (diff === 0) return

    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + diff * eased)
      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevRef.current = end
      }
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return display
}
