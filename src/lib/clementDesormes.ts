// Revision 1 is immutable: the same permanent profile number gives the same apparatus.
export const CLEMENT_TIMES = [5, 10, 15, 20, 25] as const
export const AIR_GAMMA = 1.4
export const WATER_HEAD_PA = 1000 * 9.80665 / 1000 // Pa per mm of water
export const STABILIZATION_SECONDS = 80
export type ClementVariant = { version: 1; number: number; targetHead: number; ambientK: number; pressurePa: number; heatLeak: number }
export function clementVariant(number: number): ClementVariant {
  if (!Number.isSafeInteger(number) || number < 1) throw Error('Некорректный номер варианта.')
  let seed = 2166136261
  for (const char of `clement-desormes:v1:${number}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619)
  const random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  return { version: 1, number, targetHead: 180 + Math.floor(random() * 17) * 5, ambientK: 291.15 + Math.floor(random() * 9), pressurePa: 95000 + Math.floor(random() * 101) * 50, heatLeak: .018 + Math.floor(random() * 23) / 1000 }
}
export const clementIdealHead = (head: number) => head * (1 - 1 / AIR_GAMMA)
export const clementFinalHead = (v: ClementVariant, head: number, seconds: number) => clementIdealHead(head) * Math.exp(-v.heatLeak * seconds)
export function clementGamma(head: number, extrapolated: number): number | null {
  return Number.isFinite(head) && Number.isFinite(extrapolated) && head > extrapolated && extrapolated > 0 ? head / (head - extrapolated) : null
}
export function clementFit(points: Array<{ time: number; head: number }>) {
  if (points.length < 2 || points.some(p => !Number.isFinite(p.time) || !Number.isFinite(p.head) || p.time < 0 || p.head <= 0)) return null
  const n = points.length, mx = points.reduce((s, p) => s + p.time, 0) / n, my = points.reduce((s, p) => s + Math.log(p.head), 0) / n
  const denominator = points.reduce((s, p) => s + (p.time - mx) ** 2, 0)
  if (!denominator) return null
  const slope = points.reduce((s, p) => s + (p.time - mx) * (Math.log(p.head) - my), 0) / denominator
  const intercept = my - slope * mx
  return { slope, intercept, head: Math.exp(intercept) }
}
export function clementExpected(v: ClementVariant) {
  return { gamma: AIR_GAMMA, idealHead: clementIdealHead(v.targetHead), intercept: Math.log(clementIdealHead(v.targetHead)), slope: -v.heatLeak,
    trials: CLEMENT_TIMES.map(time => ({ time, head: clementFinalHead(v, v.targetHead, time), log: Math.log(clementFinalHead(v, v.targetHead, time)) })) }
}
export type ClementPhase = 'idle' | 'pumping' | 'settling' | 'ready' | 'venting' | 'warming' | 'complete'
export type ClementState = { run: number; phase: ClementPhase; inletOpen: boolean; outletOpen: boolean; pumping: boolean; elapsed: number; ventTime: number; equilibriumHead: number; head: number; temperatureK: number; initialHead: number; finalHead: number }
export function freshClement(v: ClementVariant, run = 0): ClementState {
  return { run, phase: 'idle', inletOpen: false, outletOpen: false, pumping: false, elapsed: 0, ventTime: 0, equilibriumHead: 0, head: 0, temperatureK: v.ambientK, initialHead: 0, finalHead: 0 }
}
export type ClementAction = 'inlet' | 'outlet' | 'pump-on' | 'pump-off' | 'reset'
export function clementAction(v: ClementVariant, state: ClementState, action: ClementAction): ClementState {
  const s = { ...state }
  if (action === 'reset') return freshClement(v, state.run + 1)
  if (action === 'pump-off') return { ...s, pumping: false }
  if (action === 'pump-on') return s.inletOpen && !s.outletOpen && ['idle', 'pumping'].includes(s.phase) ? { ...s, pumping: true, phase: 'pumping' } : s
  if (action === 'inlet') {
    if (s.outletOpen || !['idle', 'pumping'].includes(s.phase)) return s
    s.inletOpen = !s.inletOpen
    if (!s.inletOpen && s.equilibriumHead > 0) { s.pumping = false; s.phase = 'settling'; s.elapsed = 0 }
    return s
  }
  if (!s.outletOpen && s.phase === 'ready' && !s.inletOpen) {
    return { ...s, outletOpen: true, phase: 'venting', elapsed: 0, ventTime: 0, initialHead: s.head }
  }
  if (s.outletOpen && s.phase === 'venting' && s.ventTime >= 1) {
    const finalHead = clementFinalHead(v, s.initialHead, s.ventTime)
    return { ...s, outletOpen: false, phase: 'warming', elapsed: 0, finalHead, head: 0, temperatureK: v.ambientK * v.pressurePa / (v.pressurePa + WATER_HEAD_PA * finalHead) }
  }
  return s
}
export function stepClement(v: ClementVariant, state: ClementState, dt: number): ClementState {
  if (!Number.isFinite(dt) || dt <= 0) return state
  if (['idle', 'ready', 'complete'].includes(state.phase)) return state
  const s = { ...state, elapsed: state.elapsed + dt }
  if (s.phase === 'pumping' && s.pumping) {
    s.equilibriumHead = Math.min(v.targetHead, s.equilibriumHead + dt * 28)
    s.temperatureK = v.ambientK + 1.2 * (1 - Math.exp(-s.elapsed / 5))
    s.head = ((v.pressurePa + WATER_HEAD_PA * s.equilibriumHead) * s.temperatureK / v.ambientK - v.pressurePa) / WATER_HEAD_PA
  } else if (s.phase === 'settling' || s.phase === 'pumping') {
    s.temperatureK = v.ambientK + (s.temperatureK - v.ambientK) * Math.exp(-dt / 16)
    s.head = ((v.pressurePa + WATER_HEAD_PA * s.equilibriumHead) * s.temperatureK / v.ambientK - v.pressurePa) / WATER_HEAD_PA
    if (s.phase === 'settling' && s.elapsed >= STABILIZATION_SECONDS) { s.phase = 'ready'; s.head = s.equilibriumHead; s.temperatureK = v.ambientK }
  } else if (s.phase === 'venting') {
    s.ventTime += dt
    s.head = s.ventTime >= 1 ? 0 : s.initialHead * Math.exp(-s.ventTime / .12)
    const final = clementFinalHead(v, s.initialHead, s.ventTime)
    const cold = v.ambientK * v.pressurePa / (v.pressurePa + WATER_HEAD_PA * final)
    s.temperatureK = v.ambientK - (v.ambientK - cold) * (1 - Math.exp(-s.ventTime / .12))
  } else if (s.phase === 'warming') {
    const cold = v.ambientK * v.pressurePa / (v.pressurePa + WATER_HEAD_PA * s.finalHead)
    s.temperatureK = v.ambientK - (v.ambientK - cold) * Math.exp(-s.elapsed / 16)
    s.head = ((v.pressurePa + WATER_HEAD_PA * s.finalHead) * s.temperatureK / v.ambientK - v.pressurePa) / WATER_HEAD_PA
    if (s.elapsed >= STABILIZATION_SECONDS) { s.phase = 'complete'; s.head = s.finalHead; s.temperatureK = v.ambientK }
  }
  return s
}
// Simulated instrument offset: at most 1 mm in the level difference before
// rounding each limb to 0.5 mm (at most another 0.5 mm in the difference).
// Stable within a reading; reset changes the run, never the assigned variant.
export const CLEMENT_READING_OFFSET_MM = 1
export const CLEMENT_READING_ERROR_BOUND_MM = 1.5
export function clementReading(v: ClementVariant, state: ClementState) {
  const seed = v.number * 1.73 + state.run * 2.399963
  const initialError = Math.sin(seed)
  const finalError = Math.sin(seed + state.ventTime * .91 + 1.1)
  const recovery = state.phase === 'complete' ? 1 : state.phase === 'warming' ? Math.min(1, state.elapsed / STABILIZATION_SECONDS) : 0
  const error = CLEMENT_READING_OFFSET_MM * ((1 - recovery) * initialError + recovery * finalError) * Math.min(1, Math.max(0, state.head) / 10)
  const head = Math.max(0, state.head + error)
  const left = Math.round((250 - head / 2) * 2) / 2, right = Math.round((250 + head / 2) * 2) / 2
  return { left, right, difference: right - left }
}
