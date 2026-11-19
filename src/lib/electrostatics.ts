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
export function fieldEstimate(a: Point & { potential: number }, b: Point & { potential: number }) {
  const distanceMm = Math.hypot(a.x - b.x, a.y - b.y)
  if (distanceMm < 1 || !Number.isFinite(distanceMm)) return null
  return { distanceMm, delta: Math.abs(a.potential - b.potential), field: Math.abs(a.potential - b.potential) / (distanceMm / 1000) }
}
