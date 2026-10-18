import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export default function AssessmentCatalogRail({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const updateEdges = useCallback(() => {
    const rail = railRef.current
    if (rail) setEdges({ start: rail.scrollLeft <= 2, end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2 })
  }, [])
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const frame = requestAnimationFrame(updateEdges)
    const observer = new ResizeObserver(updateEdges)
    observer.observe(rail)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [children, updateEdges])
  const scroll = (direction: number) => {
    const rail = railRef.current
    if (!rail) return
    const card = rail.querySelector('.monitor-test-card')
    const step = (card?.getBoundingClientRect().width ?? rail.clientWidth) + parseFloat(getComputedStyle(rail).columnGap || '0')
    rail.scrollBy({ left: direction * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return <>
    <div className="monitor-catalog-navigation"><span>Листайте работы вправо</span><div><button type="button" aria-label="Предыдущие работы" aria-controls={id} disabled={edges.start} onClick={() => scroll(-1)}>←</button><button type="button" aria-label="Следующие работы" aria-controls={id} disabled={edges.end} onClick={() => scroll(1)}>→</button></div></div>
    <div className="monitor-catalog monitor-catalog-rail" id={id} ref={railRef} onScroll={updateEdges} role="region" aria-label={label} tabIndex={0}>{children}</div>
  </>
}
