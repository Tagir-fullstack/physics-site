// Run with: node --experimental-strip-types --test tests/ballCollisionPhysics.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPendulums, stepPendulums, energy, measure, G, PHYSICS_STEP } from '../src/lib/ballCollisionPhysics.ts'

const defaults = { mass1: .1235, mass2: .1235, length: .37, angle: 10, restitution: 1, damping: 0 }
function simulate(config, seconds, check = () => {}) {
  let state = createPendulums(config)
  for (let i = 0; i < seconds / PHYSICS_STEP && !state.settled; i++) {
    state = stepPendulums(state, config)
    check(state)
  }
  return state
}
function near(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
}

test('equal ideal masses exchange velocities and continue colliding without energy drift', () => {
  const expectedSpeed = Math.sqrt(2 * G * defaults.length * (1 - Math.cos(defaults.angle * Math.PI / 180)))
  const state = simulate(defaults, 30, s => {
    assert.ok(s.angle1 >= s.angle2 - 1e-10, 'balls crossed')
    near(energy(s, defaults).total / s.initialEnergy, 1, 1e-7)
  })
  assert.ok(state.collisions > 30)
  assert.equal(state.settled, false)
  near(state.firstImpact.v1, -expectedSpeed)
  near(state.firstImpact.u1, 0)
  near(state.firstImpact.u2, -expectedSpeed)
})

test('unequal and extreme masses preserve contact order, impact momentum and do not gain energy', () => {
  for (const [mass1, mass2] of [[.08, .2], [.2, .08], [.001, 1], [1, .001]]) {
    for (const restitution of [0, .7, .94, 1]) {
      const config = { ...defaults, mass1, mass2, restitution, angle: 30, length: .2, damping: .12 }
      let previous = energy(createPendulums(config), config).total
      const state = simulate(config, 12, s => {
        assert.ok(s.angle1 >= s.angle2 - 1e-9, 'balls crossed')
        assert.ok(Number.isFinite(s.angle1) && Number.isFinite(s.angle2))
        const current = energy(s, config).total
        assert.ok(current <= previous + 1e-9, 'energy was created')
        previous = current
      })
      assert.ok(state.firstImpact)
      near(state.firstImpact.momentumBefore, state.firstImpact.momentumAfter)
      near(state.firstImpact.u1 - state.firstImpact.u2, -restitution * state.firstImpact.v1)
    }
  }
})

test('perfectly inelastic balls stay attached, lose half the energy for equal masses and settle naturally', () => {
  const config = { ...defaults, restitution: 0, damping: .12 }
  const state = simulate(config, 120, s => {
    if (s.stuck) {
      near(s.angle1, s.angle2)
      near(s.omega1, s.omega2)
    }
  })
  assert.equal(state.collisions, 1)
  assert.equal(state.settled, true)
  assert.ok(state.time > 30)
  near(state.firstImpact.k, .5)
  assert.ok(energy(state, config).total < state.initialEnergy * .001)
})

test('longer suspension increases first-contact time with square-root length', () => {
  const short = simulate({ ...defaults, length: .25 }, 2)
  const long = simulate({ ...defaults, length: 1 }, 3)
  near(long.firstImpact.time / short.firstImpact.time, 2, 1e-6)
})

test('rest threshold produces exact, permanent equilibrium and preserves the first measurement', () => {
  for (const restitution of [0, .94]) {
    const config = { ...defaults, restitution, damping: .6 }
    let firstReading
    const state = simulate(config, 30, s => {
      if (!firstReading && s.peak2 !== null) firstReading = measure(s, config, false)
    })
    assert.equal(state.settled, true)
    assert.deepEqual([state.angle1, state.angle2, state.omega1, state.omega2], [0, 0, 0, 0])
    assert.equal(energy(state, config).total, 0)
    assert.equal(state.lastImpactTime, -Infinity)
    assert.deepEqual(measure(state, config, false), firstReading)
    assert.strictEqual(stepPendulums(state, config), state, 'rest must not restart the clock or collisions')
  }
})

test('a turning point or crossing equilibrium at speed must not trigger full stop', () => {
  const config = { ...defaults, damping: .6 }
  const initial = { ...createPendulums(config), peak2: 2 }
  const turning = stepPendulums(initial, config)
  assert.equal(turning.settled, false)
  const crossing = stepPendulums({ ...initial, angle1: 0, angle2: 0, omega1: 1, omega2: 1 }, config)
  assert.equal(crossing.settled, false)
})

test('instrument errors are bounded and never modify the physical state', () => {
  const state = simulate(defaults, 1)
  const copy = structuredClone(state)
  const exact = measure(state, defaults, false)
  near(exact.beta, state.peak2)
  near(exact.v1, state.firstImpact.v1)
  near(exact.momentumError, 0)
  const lower = measure(state, defaults, true, () => 0)
  const upper = measure(state, defaults, true, () => 1)
  for (const reading of [lower, upper]) {
    assert.ok(Math.abs(reading.beta - state.peak2) <= 2)
    assert.ok(Math.abs(reading.v1 - state.firstImpact.v1) <= .0055 + 1e-12)
    assert.ok(Math.abs(reading.time - state.firstImpact.time) <= .0015 + 1e-12)
  }
  assert.notEqual(lower.v1, upper.v1)
  assert.deepEqual(state, copy)
  assert.equal(measure(createPendulums(defaults), defaults, true), null)
})
