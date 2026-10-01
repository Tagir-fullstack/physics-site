// Planar point-mass pendulums with instantaneous central impacts. The drawing
// offsets their centres by one diameter; contact is the constraint theta1 >= theta2.
export type CollisionMode = 'elastic' | 'inelastic'
export type PhysicsConfig = {
  mass1: number
  mass2: number
  length: number
  angle: number
  restitution: number
  damping: number
}
export type Impact = {
  time: number
  v1: number
  v2: number
  u1: number
  u2: number
  momentumBefore: number
  momentumAfter: number
  energyBefore: number
  energyAfter: number
  energyLoss: number
  k: number
}
export type PendulumState = {
  time: number
  angle1: number
  angle2: number
  omega1: number
  omega2: number
  collisions: number
  lastImpactTime: number
  firstImpact: Impact | null
  stuck: boolean
  peak2: number | null
  initialEnergy: number
  settled: boolean
}
export const G = 9.81
export const PHYSICS_STEP = 1 / 480
const RAD = Math.PI / 180
const REST_AMPLITUDE = .1 * RAD
const REST_SPEED = .003 // m/s

export function energy(state: PendulumState, config: PhysicsConfig) {
  const kinetic = .5 * config.length ** 2 * (config.mass1 * state.omega1 ** 2 + config.mass2 * state.omega2 ** 2)
  const potential = G * config.length * (config.mass1 * (1 - Math.cos(state.angle1)) + config.mass2 * (1 - Math.cos(state.angle2)))
  return { kinetic, potential, total: kinetic + potential }
}

export function createPendulums(config: PhysicsConfig): PendulumState {
  return {
    time: 0, angle1: config.angle * RAD, angle2: 0, omega1: 0, omega2: 0,
    collisions: 0, lastImpactTime: -Infinity, firstImpact: null, stuck: false,
    peak2: null, initialEnergy: config.mass1 * G * config.length * (1 - Math.cos(config.angle * RAD)), settled: false,
  }
}

// RK4 integration keeps the undamped pendulum energy stable over many swings.
function integrate(angle: number, omega: number, dt: number, config: PhysicsConfig): [number, number] {
  const acceleration = (a: number, w: number) => -G / config.length * Math.sin(a) - config.damping * w
  const a1 = acceleration(angle, omega)
  const w2 = omega + a1 * dt / 2
  const a2 = acceleration(angle + omega * dt / 2, w2)
  const w3 = omega + a2 * dt / 2
  const a3 = acceleration(angle + w2 * dt / 2, w3)
  const w4 = omega + a3 * dt
  const a4 = acceleration(angle + w3 * dt, w4)
  return [angle + dt / 6 * (omega + 2 * w2 + 2 * w3 + w4), omega + dt / 6 * (a1 + 2 * a2 + 2 * a3 + a4)]
}

function freeStep(state: PendulumState, config: PhysicsConfig, dt: number): PendulumState {
  const [angle1, omega1] = integrate(state.angle1, state.omega1, dt, config)
  const [angle2, omega2] = state.stuck ? [angle1, omega1] : integrate(state.angle2, state.omega2, dt, config)
  return { ...state, time: state.time + dt, angle1, angle2, omega1, omega2 }
}

export function impactResult(v1: number, v2: number, config: PhysicsConfig, time = 0): Impact {
  const { mass1: m1, mass2: m2, restitution: e } = config
  const impulse = -(1 + e) * (v1 - v2) / (1 / m1 + 1 / m2)
  const u1 = v1 + impulse / m1
  const u2 = v2 - impulse / m2
  const energyBefore = .5 * (m1 * v1 ** 2 + m2 * v2 ** 2)
  const energyAfter = .5 * (m1 * u1 ** 2 + m2 * u2 ** 2)
  return {
    time, v1, v2, u1, u2, momentumBefore: m1 * v1 + m2 * v2,
    momentumAfter: m1 * u1 + m2 * u2, energyBefore, energyAfter,
    energyLoss: energyBefore - energyAfter, k: energyBefore > 0 ? energyAfter / energyBefore : 0,
  }
}

export function stepPendulums(state: PendulumState, config: PhysicsConfig, dt = PHYSICS_STEP): PendulumState {
  if (state.settled) return state
  let next = freeStep(state, config, dt)
  if (!state.stuck && next.angle1 < next.angle2) {
    // Locate contact inside the step before exchanging impulses. No overlap
    // correction at the end of a frame, which would inject/remove energy.
    let low = 0
    let high = dt
    for (let i = 0; i < 30; i++) {
      const middle = (low + high) / 2
      const candidate = freeStep(state, config, middle)
      if (candidate.angle1 >= candidate.angle2) low = middle
      else high = middle
    }
    const contact = freeStep(state, config, low)
    const angle = (config.mass1 * contact.angle1 + config.mass2 * contact.angle2) / (config.mass1 + config.mass2)
    const impact = impactResult(contact.omega1 * config.length, contact.omega2 * config.length, config, contact.time)
    next = freeStep({
      ...contact, angle1: angle, angle2: angle,
      omega1: impact.u1 / config.length, omega2: impact.u2 / config.length,
      collisions: state.collisions + 1, lastImpactTime: contact.time,
      firstImpact: state.firstImpact ?? impact, stuck: config.restitution === 0,
    }, config, dt - low)
  }
  // First outward turning point, not a theoretical angle calculated from speed.
  if (next.firstImpact && next.peak2 === null && state.omega2 < 0 && next.omega2 >= 0) {
    next.peak2 = Math.max(Math.abs(state.angle2), Math.abs(next.angle2)) / RAD
  }
  // Use remaining oscillation amplitude, not just instantaneous angle or speed:
  // a turning point and a fast passage through equilibrium are not rest.
  const amplitude1 = Math.acos(Math.max(-1, 1 - (1 - Math.cos(next.angle1) + config.length * next.omega1 ** 2 / (2 * G))))
  const amplitude2 = Math.acos(Math.max(-1, 1 - (1 - Math.cos(next.angle2) + config.length * next.omega2 ** 2 / (2 * G))))
  next.settled = next.peak2 !== null && config.damping > 0
    && Math.max(amplitude1, amplitude2) < REST_AMPLITUDE
    && Math.max(Math.abs(next.omega1), Math.abs(next.omega2)) * config.length < REST_SPEED
  if (next.settled) {
    // Resolve sub-visible residual motion to exact equilibrium. Keep the first
    // measurement and impact count, but clear the transient collision highlight.
    next.angle1 = 0
    next.angle2 = 0
    next.omega1 = 0
    next.omega2 = 0
    next.lastImpactTime = -Infinity
  }
  return next
}

export type Reading = { beta: number; time: number; v1: number; u1: number; u2: number; k: number; energyLoss: number; momentumError: number }

// Synthetic instrument readings, sampled once per run and independent of physics.
export function measure(state: PendulumState, config: PhysicsConfig, noisy: boolean, random = Math.random): Reading | null {
  const impact = state.firstImpact
  if (!impact || state.peak2 === null) return null
  const read = (value: number, halfWidth: number, resolution: number) => noisy
    ? Math.round((value + (2 * random() - 1) * halfWidth) / resolution) * resolution : value
  const v1 = read(impact.v1, .008, .001)
  const u1 = read(impact.u1, .008, .001)
  const u2 = read(impact.u2, .008, .001)
  const before = .5 * config.mass1 * v1 ** 2
  const after = .5 * (config.mass1 * u1 ** 2 + config.mass2 * u2 ** 2)
  return {
    beta: Math.max(0, read(state.peak2, 1, 2)), time: read(impact.time, .002, .001),
    v1, u1, u2, k: before > 0 ? after / before : 0, energyLoss: before - after,
    momentumError: config.mass1 * u1 + config.mass2 * u2 - config.mass1 * v1,
  }
}
