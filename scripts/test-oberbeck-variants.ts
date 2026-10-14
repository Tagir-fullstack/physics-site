import assert from 'node:assert/strict'
import { createOberbeckVariant, expectedOberbeckTables, referenceVariant, variantFingerprint } from '../src/lib/oberbeckVariant.js'
import { experiment, CROSS_INERTIA, CYLINDER_MASS } from '../src/pages/labs/oberbeckModel.js'
assert.ok(Math.abs(expectedOberbeckTables(referenceVariant).one[0].time - 18.5) < 1e-10)
assert.ok(Math.abs(expectedOberbeckTables(referenceVariant).two[1].time - 6.7) < 1e-10)
assert.equal(experiment(.1, .01, .1, 1, .6).duration / experiment(.1, .01, .1, 1, .3).duration, Math.sqrt(2))
const fingerprints = new Set<string>()
for (let i = 0; i < 1000; i++) {
  const variant = createOberbeckVariant()
  fingerprints.add(variantFingerprint(variant))
  assert.ok(variant.radii[0] < variant.radii[1]); assert.ok(variant.small < variant.large)
  const tables = expectedOberbeckTables(variant)
  assert.equal(tables.one.length, 8); assert.equal(tables.two.length, 7)
  tables.one.forEach(r => { assert.ok(r.minTime < r.time && r.time < r.maxTime); assert.ok(r.time > 0); assert.ok(Math.abs(r.moment / r.epsilon - r.inertia) < 1e-10); assert.ok(r.bounds.minTime.epsilon > r.epsilon && r.bounds.maxTime.epsilon < r.epsilon) })
  tables.two.forEach((r, n) => { assert.equal(r.length, 10 + n * 2); assert.equal(r.lengthSquared, r.length ** 2); assert.equal(r.radius, variant.radii[1]); assert.ok(Math.abs(r.inertia - (CROSS_INERTIA + 4 * CYLINDER_MASS * (r.length / 100) ** 2)) < 1e-10); assert.ok(r.bounds.minTime.inertia < r.inertia && r.bounds.maxTime.inertia > r.inertia) })
  for (let j = 1; j < 4; j++) assert.ok(tables.one[j].time < tables.one[j - 1].time)
  for (let j = 0; j < 4; j++) assert.ok(tables.one[j + 4].time < tables.one[j].time)
  for (let j = 1; j < 7; j++) assert.ok(tables.two[j].time > tables.two[j - 1].time)
}
assert.equal(fingerprints.size, 1000)
console.log('PASS: reference times, variable height, 1000 distinct parameter sets, 8+7 rows, torque/inertia consistency, bounds and monotonicity')
