/** 2D conducting-sheet model: Laplace equation, fixed-potential electrodes,
 * insulating outer edges. Geometry is in mm; electric field is in V/m. */
export const SHEET = { width: 180, height: 240, step: 2 } as const
export const GEOMETRIES = ['discs', 'disc-plate', 'plates'] as const
export type Geometry = typeof GEOMETRIES[number]
export const GEOMETRY_NAMES: Record<Geometry, string> = { discs: 'Два круглых электрода', 'disc-plate': 'Круглый и плоский электроды', plates: 'Два плоских электрода' }
export type Layout = 'classic' | 'offset' | 'tilted' | 'three' | 'four' | 'random'
export type Electrode = { x: number; y: number; potential: 0 | 1; shape: 'disc' | 'plate'; radius: number; length: number; angle: number }
export type ElectroVariant = { revision?: 3; conductors?: Electrode[]; layout?: Layout; number: number; geometry: Geometry; voltage: number; interval: number; gap: number; radius: number; length: number }
export type Point = { x: number; y: number }
export type Reading = Point & { potential: number; level: number }
export type FieldGrid = { nx: number; ny: number; step: number; potential: Float64Array; iterations: number; residual: number; converged: boolean }
/** Reproducible per-student layouts. Stored older variants retain their original geometry. */
function seededRandom(key: string) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = 0xdeadbeef
  for (let i = 0; i < key.length; i++) {
    const n = key.charCodeAt(i)
    a = Math.imul(a ^ n, 1664525); b = Math.imul(b ^ n, 2246822507)
    c = Math.imul(c ^ n, 3266489909); d = Math.imul(d ^ n, 668265263)
  }
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0
    const t = ((a + b | 0) + d | 0); d = d + 1 | 0
    a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0
    return (t >>> 0) / 4294967296
  }
}
function electrodeSegment(e: Electrode): [Point, Point] {
  const angle = e.angle * Math.PI / 180, half = e.shape === 'plate' ? e.length / 2 : 0
  return [{ x: e.x - Math.cos(angle) * half, y: e.y - Math.sin(angle) * half }, { x: e.x + Math.cos(angle) * half, y: e.y + Math.sin(angle) * half }]
}
function pointSegmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy
  const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}
/** Conservative surface clearance: plates are enclosed by a 3 mm radius capsule. */
export function electrodeClearance(a: Electrode, b: Electrode): number {
  const [p, q] = electrodeSegment(a), [r, s] = electrodeSegment(b)
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const crosses = cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0
  const distance = crosses ? 0 : Math.min(pointSegmentDistance(p, r, s), pointSegmentDistance(q, r, s), pointSegmentDistance(r, p, q), pointSegmentDistance(s, p, q))
  return distance - (a.shape === 'disc' ? a.radius : 3) - (b.shape === 'disc' ? b.radius : 3)
}
export function electroVariant(number: number, studentKey = ''): ElectroVariant {
  if (!Number.isSafeInteger(number) || number < 1 || number > 1_000_000) throw Error('Номер варианта должен быть целым числом от 1 до 1 000 000.')
  const random = seededRandom(`electrostatics-v3:${number}:${studentKey}`)
  for (let i = 0; i < 16; i++) random() // Mix the four seed words before drawing parameters.
  const count = 2 + Math.floor(random() * 3), voltage = 12 + Math.floor(random() * 4)
  const conductors: Electrode[] = []
  for (let i = 0; i < count; i++) {
    let placed = false
    for (let attempt = 0; attempt < 4000; attempt++) {
      const shape = random() < .65 ? 'plate' : 'disc'
      const e: Electrode = { x: 16 + Math.floor(random() * 149), y: 16 + Math.floor(random() * 209), potential: i === 0 ? 1 : i === 1 ? 0 : random() < .5 ? 0 : 1, shape, radius: 8 + Math.floor(random() * 7), length: 34 + Math.floor(random() * (count === 4 ? 33 : 57)), angle: Math.floor(random() * 36) * 5 }
      const angle = e.angle * Math.PI / 180
      const halfX = shape === 'disc' ? e.radius : Math.abs(Math.cos(angle)) * e.length / 2 + Math.abs(Math.sin(angle)) * 3
      const halfY = shape === 'disc' ? e.radius : Math.abs(Math.sin(angle)) * e.length / 2 + Math.abs(Math.cos(angle)) * 3
      if (e.x - halfX < 12 || e.x + halfX > SHEET.width - 12 || e.y - halfY < 12 || e.y + halfY > SHEET.height - 12) continue
      if (conductors.some(other => electrodeClearance(e, other) < 14)) continue
      if (i === 1 && Math.hypot(e.x - conductors[0].x, e.y - conductors[0].y) < 75) continue
      conductors.push(e); placed = true; break
    }
    if (!placed) throw Error('Не удалось разместить электроды без пересечений.')
  }
  const discs = conductors.filter(e => e.shape === 'disc').length
  return { revision: 3, number, layout: 'random', geometry: discs === count ? 'discs' : discs === 0 ? 'plates' : 'disc-plate', voltage, interval: 1, gap: Math.hypot(conductors[0].x - conductors[1].x, conductors[0].y - conductors[1].y), radius: conductors[0].radius, length: conductors[0].length, conductors }
}
export const electrodeY = (v: ElectroVariant, electrode: 0 | 1) => SHEET.height / 2 + (electrode === 1 ? -1 : 1) * v.gap / 2
/** Solver coordinates stay unchanged so existing notebooks remain valid.
 * Display coordinates have their origin at the sheet centre and positive y upwards. */
export const toDisplayPoint = (p: Point): Point => ({ x: p.y - 120, y: 90 - p.x })
export const toModelPoint = (p: Point): Point => ({ x: 90 - p.y, y: p.x + 120 })
export function electrodes(v: ElectroVariant): Electrode[] {
  if (v.revision === 3 && v.conductors) return v.conductors
  const layout = v.layout ?? 'classic'
  const result: Electrode[] = ([1, 0] as const).map(potential => {
    const multiple = layout === 'three' || layout === 'four'
    return { potential, shape: v.geometry === 'discs' || v.geometry === 'disc-plate' && potential === 0 ? 'disc' : 'plate',
      x: multiple ? potential ? 45 : 135 : layout === 'offset' ? potential ? 65 : 115 : 90,
      y: multiple ? potential ? 65 : 175 : electrodeY(v, potential),
      radius: v.radius, length: multiple ? Math.min(v.length, 56) : v.length,
      angle: layout === 'tilted' ? potential ? 25 : -25 : 0 }
  })
  if (layout === 'three') result.push({ x: 135, y: 65, potential: 0, shape: 'disc', radius: v.radius, length: 0, angle: 0 })
  if (layout === 'four') result.push({ x: 135, y: 65, potential: 0, shape: 'disc', radius: v.radius, length: 0, angle: 0 }, { x: 45, y: 175, potential: 1, shape: 'disc', radius: v.radius, length: 0, angle: 0 })
  if (v.number > 300) result.forEach((e, i) => {
    e.x += ((v.number * 7 + i * 3) % 11 - 5) * 2
    e.y += ((Math.floor(v.number / 11) + i * 5) % 7 - 3) * 2
  })
  return result
}
export function variantDescription(v: ElectroVariant): string {
  if (v.revision === 3 && v.conductors) {
    const n = v.conductors.length, discs = v.conductors.filter(e => e.shape === 'disc').length
    return `${n} электрода · ${discs === n ? 'круглые' : discs === 0 ? 'плоские' : 'плоские и круглые'}`
  }
  return ({ random: 'Индивидуальная схема', offset: 'Смещённые электроды', tilted: 'Наклонённые электроды', three: 'Три электрода', four: 'Четыре электрода', classic: GEOMETRY_NAMES[v.geometry] })[v.layout ?? 'classic']
}
export const axisOrigin = (v: ElectroVariant) => electrodes(v).find(e => e.potential === 0)!.y
export function electrodeContains(e: Electrode, p: Point): boolean {
  const dx = p.x - e.x, dy = p.y - e.y, angle = e.angle * Math.PI / 180
  return e.shape === 'disc' ? dx * dx + dy * dy <= e.radius ** 2 : Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle)) <= e.length / 2 && Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle)) <= 3
}
export function electrodeAt(v: ElectroVariant, p: Point): 0 | 1 | null {
  return electrodes(v).find(e => electrodeContains(e, p))?.potential ?? null
}
export const potentialLevels = (v: ElectroVariant) => Array.from({ length: Math.ceil(v.voltage / v.interval) - 1 }, (_, i) => (i + 1) * v.interval)
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
export function fieldEstimate(a: Point & { potential: number }, b: Point & { potential: number }) {
  const distanceMm = Math.hypot(a.x - b.x, a.y - b.y)
  if (distanceMm < 1 || !Number.isFinite(distanceMm)) return null
  return { distanceMm, delta: Math.abs(a.potential - b.potential), field: Math.abs(a.potential - b.potential) / (distanceMm / 1000) }
}
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
