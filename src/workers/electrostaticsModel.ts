// Numeric data stays in workers; do not import this module into UI components.
import { SHEET, electrodes, electrodeContains, electrodeAt, type ElectroVariant, type Point } from '../lib/electrostatics.js'
export type FieldGrid = { nx: number; ny: number; step: number; potential: Float64Array; iterations: number; residual: number; converged: boolean }
export function solveElectrostatic(v: ElectroVariant): FieldGrid {
  const step = SHEET.step, nx = SHEET.width / step + 1, ny = SHEET.height / step + 1
  const conductors = electrodes(v)
  const potential = new Float64Array(nx * ny), fixed = new Int8Array(nx * ny).fill(-1)
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const k = y * nx + x, e = conductors.find(e => electrodeContains(e, { x: x * step, y: y * step }))?.potential ?? null
    fixed[k] = e ?? -1; potential[k] = e === null ? .5 : e
  }
  let residual = Infinity, iterations = 0
  // Reflecting (zero normal flux) boundary: use the interior neighbour twice.
  for (; iterations < 7000; iterations++) {
    let change = 0
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const k = y * nx + x
      if (fixed[k] !== -1) continue
      const avg = (potential[y * nx + (x === 0 ? 1 : x - 1)] + potential[y * nx + (x === nx - 1 ? nx - 2 : x + 1)] + potential[(y === 0 ? 1 : y - 1) * nx + x] + potential[(y === ny - 1 ? ny - 2 : y + 1) * nx + x]) / 4
      const delta = 1.8 * (avg - potential[k]); potential[k] += delta; change = Math.max(change, Math.abs(delta))
    }
    if (change < 1e-9) { iterations++; break }
  }
  // Explicit equation residual, independent of the SOR update criterion.
  residual = 0
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const k = y * nx + x
    if (fixed[k] !== -1) continue
    const avg = (potential[y * nx + (x === 0 ? 1 : x - 1)] + potential[y * nx + (x === nx - 1 ? nx - 2 : x + 1)] + potential[(y === 0 ? 1 : y - 1) * nx + x] + potential[(y === ny - 1 ? ny - 2 : y + 1) * nx + x]) / 4
    residual = Math.max(residual, Math.abs(potential[k] - avg))
  }
  for (let k = 0; k < potential.length; k++) potential[k] *= v.voltage
  return { nx, ny, step, potential, iterations, residual: residual * v.voltage, converged: residual < 1e-6 }
}
export function samplePotential(g: FieldGrid, p: Point): number {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x > SHEET.width || p.y > SHEET.height) return NaN
  const x = p.x / g.step, y = p.y / g.step, ix = Math.min(g.nx - 2, Math.floor(x)), iy = Math.min(g.ny - 2, Math.floor(y)), a = x - ix, b = y - iy, k = iy * g.nx + ix
  return (1 - b) * ((1 - a) * g.potential[k] + a * g.potential[k + 1]) + b * ((1 - a) * g.potential[k + g.nx] + a * g.potential[k + g.nx + 1])
}
export function electricField(g: FieldGrid, p: Point) {
  const h = .5, left = Math.max(0, p.x - h), right = Math.min(SHEET.width, p.x + h), top = Math.max(0, p.y - h), bottom = Math.min(SHEET.height, p.y + h)
  const x = -(samplePotential(g, { x: right, y: p.y }) - samplePotential(g, { x: left, y: p.y })) / ((right - left) / 1000)
  const y = -(samplePotential(g, { x: p.x, y: bottom }) - samplePotential(g, { x: p.x, y: top })) / ((bottom - top) / 1000)
  return { x, y, magnitude: Math.hypot(x, y) }
}
export const voltmeter = (g: FieldGrid, v: ElectroVariant, p: Point) => Math.round((electrodeAt(v, p) === null ? samplePotential(g, p) : electrodeAt(v, p)! * v.voltage) * 10) / 10
/** Marching squares; saddle cells are split using the centre potential. */
export function contourSegments(g: FieldGrid, level: number): Array<[Point, Point]> {
  const segments: Array<[Point, Point]> = []
  for (let y = 0; y < g.ny - 1; y++) for (let x = 0; x < g.nx - 1; x++) {
    const k = y * g.nx + x, values = [g.potential[k], g.potential[k + 1], g.potential[k + g.nx + 1], g.potential[k + g.nx]], vertices = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], hits: number[][] = []
    for (let e = 0; e < 4; e++) { const n = (e + 1) % 4; if ((values[e] >= level) === (values[n] >= level)) continue; const t = (level - values[e]) / (values[n] - values[e]); hits.push([(vertices[e][0] + t * (vertices[n][0] - vertices[e][0])) * g.step, (vertices[e][1] + t * (vertices[n][1] - vertices[e][1])) * g.step]) }
    if (hits.length === 4 && ((values[0] + values[1] + values[2] + values[3]) / 4 >= level) !== (values[0] >= level)) hits.push(hits.shift()!)
    for (let i = 0; i + 1 < hits.length; i += 2) segments.push([{ x: hits[i][0], y: hits[i][1] }, { x: hits[i + 1][0], y: hits[i + 1][1] }])
  }
  return segments
}
export function contourPath(g: FieldGrid, level: number): string {
  return contourSegments(g, level).map(([a, b]) => `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${b.x.toFixed(2)},${b.y.toFixed(2)}`).join('')
}
export function fieldLines(g: FieldGrid, v: ElectroVariant): string[] {
  const paths: string[] = []
  for (const electrode of electrodes(v).filter(e => e.potential === 1)) for (let seed = 0; seed < 16; seed++) {
    const angle = seed / 16 * 2 * Math.PI
    const side = Math.floor(seed / 4), t = (seed % 4 + .5) / 4 * 2 - 1
    const local = electrode.shape === 'disc' ? { x: Math.cos(angle) * (electrode.radius + 2), y: Math.sin(angle) * (electrode.radius + 2) } : side < 2 ? { x: t * electrode.length / 2, y: side === 0 ? -5 : 5 } : { x: (side === 2 ? -1 : 1) * (electrode.length / 2 + 2), y: t * 3 }
    const rotation = electrode.angle * Math.PI / 180
    let p: Point = { x: electrode.x + local.x * Math.cos(rotation) - local.y * Math.sin(rotation), y: electrode.y + local.x * Math.sin(rotation) + local.y * Math.cos(rotation) }
    if (electrodeAt(v, p) !== null) continue
    const pts = [p]
    for (let i = 0; i < 650; i++) {
      const e = electricField(g, p); if (e.magnitude < .01 || !Number.isFinite(e.magnitude)) break
      const mid = { x: p.x + e.x / e.magnitude * .4, y: p.y + e.y / e.magnitude * .4 }, em = electricField(g, mid)
      if (!Number.isFinite(em.magnitude) || em.magnitude < .01) break
      p = { x: p.x + em.x / em.magnitude * .8, y: p.y + em.y / em.magnitude * .8 }
      if (p.x < 1 || p.x > 179 || p.y < 1 || p.y > 239 || electrodeAt(v, p) !== null) break
      pts.push(p)
    }
    if (pts.length > 3) paths.push(pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(''))
  }
  return paths
}
