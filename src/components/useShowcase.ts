import { useEffect, useRef, useState } from 'react'
import { useAccessibility } from '../context/AccessibilityContext'
import { useMotionPreference } from '../lib/useMotionPreference'

export function useShowcase(count: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)
  const elapsed = useRef(0)
  const duration = 6500
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const systemReducedMotion = useMotionPreference()
  const { reducedMotion } = useAccessibility()
  const playing = !hovered && !focused && visible && !hidden && !systemReducedMotion && !reducedMotion
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .2 })
    if (ref.current) observer.observe(ref.current)
    const changed = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', changed)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', changed) }
  }, [])
  useEffect(() => { elapsed.current = 0 }, [active, cycle])
  useEffect(() => {
    if (!playing || count < 2) return
    const started = performance.now()
    const timer = window.setTimeout(() => setActive(n => (n + 1) % count), Math.max(0, duration - elapsed.current))
    return () => { clearTimeout(timer); elapsed.current += performance.now() - started }
  }, [playing, count, active, cycle])
  const select = (n: number) => { setActive(n); setCycle(c => c + 1) }
  return { active, cycle, duration, playing, select, reducedMotion: systemReducedMotion || reducedMotion, visibility: { ref }, interaction: {
    onPointerEnter: (event: React.PointerEvent<HTMLDivElement>) => { if (event.pointerType === 'mouse') setHovered(true) },
    onPointerLeave: (event: React.PointerEvent<HTMLDivElement>) => { if (event.pointerType === 'mouse') setHovered(false) },
    onFocusCapture: () => setFocused(true),
    onBlurCapture: (event: React.FocusEvent<HTMLDivElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) },
  } }
}
