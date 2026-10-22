import assert from 'node:assert/strict'
import { manualOberbeckValues, parseManualOberbeck, OBERBECK_SPEEDS } from '../src/lib/oberbeckManual.ts'
import { referenceVariant } from '../src/lib/oberbeckVariant.ts'
import { experiment } from '../src/pages/labs/oberbeckModel.ts'

const input = manualOberbeckValues({ variant: referenceVariant, length: 10 })
const original = structuredClone(referenceVariant)
const source = parseManualOberbeck(input)
assert.ok(source.ok)
assert.equal(source.setup.length, 10)
for (const key of ['height', 'base', 'small', 'large'] as const) assert.ok(Math.abs(source.setup.variant[key] - referenceVariant[key]) < 1e-12)
assert.deepEqual(source.setup.variant.radii, referenceVariant.radii)
const custom = parseManualOberbeck({ height: '61,2', r1: '9.8', r2: '18,7', base: '102.37', small: '56,32', large: '88.85', length: '13.5' })
assert.ok(custom.ok)
assert.ok(Math.abs(custom.setup.variant.height - .612) < 1e-12)
assert.ok(Math.abs(custom.setup.variant.radii[0] - .0098) < 1e-12)
assert.equal(custom.setup.length, 13.5)
const result = experiment(custom.setup.variant.base, custom.setup.variant.radii[0], .135, 1, .612)
assert.ok(Number.isFinite(result.duration) && result.duration > 0)
assert.ok(Math.abs(result.acceleration * result.duration ** 2 / 2 - .612) < 1e-10)
for (const patch of [{ height: '' }, { height: '-1' }, { r1: '0' }, { r2: '1' }, { base: 'NaN' }, { small: '-3' }, { large: 'Infinity' }, { length: '0' }, { length: '1e308' }]) assert.equal(parseManualOberbeck({ ...input, ...patch }).ok, false)
assert.equal(parseManualOberbeck({ ...input, small: '0', large: '0', length: '75' }).ok, true)
assert.deepEqual(referenceVariant, original)
assert.deepEqual(OBERBECK_SPEEDS, [1, 2, 5, 10])
console.log('PASS: manual units, comma input, arbitrary valid distance, zero optional masses, invalid/extreme values rejected, physics consistent, source variant unchanged')
