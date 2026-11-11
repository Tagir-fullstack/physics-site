import { contourSegments, type FieldGrid, type Point } from './electrostatics'

type Component = { path: Point[]; closed: boolean }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
/** The model determines connectivity/order only; every drawn endpoint is an
 * actual measurement. Separate branches are never bridged by nearest distance. */
function contourComponents(grid: FieldGrid, level: number): Component[] {
  const segments = contourSegments(grid, level).filter(([a, b]) => distance(a, b) > 1e-7)
  const key = (p: Point) => `${p.x.toFixed(5)}:${p.y.toFixed(5)}`
  const adjacency = new Map<string, number[]>()
  segments.forEach((edge, i) => edge.forEach(p => { const k = key(p); adjacency.set(k, [...(adjacency.get(k) ?? []), i]) }))
  const used = new Set<number>(), components: Component[] = []
  const walk = (first: number, start: Point) => {
    const path = [start]; let current = start, index = first
    while (!used.has(index)) {
      used.add(index)
      const edge = segments[index], next = key(edge[0]) === key(current) ? edge[1] : edge[0]
      path.push(next); current = next
      const neighbours = adjacency.get(key(current)) ?? []
      if (neighbours.length !== 2) break
      const following = neighbours.find(i => !used.has(i))
      if (following === undefined) break
      index = following
    }
    components.push({ path, closed: key(path[0]) === key(path[path.length - 1]) })
  }
  segments.forEach((edge, i) => {
    if (used.has(i)) return
    const end = edge.find(p => adjacency.get(key(p))?.length !== 2)
    if (end) walk(i, end)
  })
  segments.forEach((edge, i) => { if (!used.has(i)) walk(i, edge[0]) })
  return components
}
export function measuredNeighborEdges(grid: FieldGrid, level: number, points: readonly Point[]): Array<[Point, Point]> {
  if (points.length < 2) return []
  const components = contourComponents(grid, level)
  const cumulative = components.map(c => { const values = [0]; for (let i = 1; i < c.path.length; i++) values.push(values[i - 1] + distance(c.path[i - 1], c.path[i])); return values })
  const groups: Array<Array<{ point: Point; along: number }>> = components.map(() => [])
  for (const point of points) {
    let best = Infinity, component = -1, along = 0
    components.forEach((c, ci) => {
      for (let i = 1; i < c.path.length; i++) {
        const a = c.path[i - 1], b = c.path[i], dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy
        if (lengthSquared < 1e-14) continue
        const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
        const deviation = distance(point, { x: a.x + t * dx, y: a.y + t * dy })
        if (deviation < best) { best = deviation; component = ci; along = cumulative[ci][i - 1] + t * Math.sqrt(lengthSquared) }
      }
    })
    if (component >= 0) groups[component].push({ point, along })
  }
  const result: Array<[Point, Point]> = []
  groups.forEach((group, ci) => {
    group.sort((a, b) => a.along - b.along || a.point.x - b.point.x || a.point.y - b.point.y)
    if (group.length < 2) return
    const candidates = group.slice(1).map((p, i) => ({ a: group[i], b: p, gap: p.along - group[i].along }))
    const component = components[ci], total = cumulative[ci].at(-1)!
    if (component.closed && group.length >= 3) candidates.push({ a: group[group.length - 1], b: group[0], gap: total - group[group.length - 1].along + group[0].along })
    const gaps = candidates.map(c => c.gap).filter(g => g > 1e-5).sort((a, b) => a - b)
    const typical = gaps[Math.floor((gaps.length - 1) / 2)] ?? 0
    const limit = group.length < 3 ? 50 : Math.max(20, Math.min(70, typical * 2.5))
    candidates.forEach(({ a, b, gap }) => { if (gap > 1e-5 && gap <= limit) result.push([a.point, b.point]) })
  })
  return result
}
