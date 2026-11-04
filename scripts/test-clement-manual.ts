import assert from 'node:assert/strict'
import { clementVariant, clementExpected } from '../src/lib/clementDesormes.ts'
import { clementManualValues, parseManualClement, clementVariantKey } from '../src/lib/clementManual.ts'
const original = clementVariant(24)
const before = JSON.stringify(original)
const values = clementManualValues(original)
const custom = parseManualClement({ ...values, targetHead: '245,5', temperature: '23,5', pressure: '100,4', heatLeak: '0,027' }, 143)
assert.equal(custom.ok, true)
if (!custom.ok) throw Error(custom.error)
assert.equal(custom.variant.targetHead,245.5)
assert.equal(custom.variant.ambientK,296.65)
assert.equal(custom.variant.pressurePa,100400)
assert.equal(custom.variant.number,143)
assert.equal(clementExpected(custom.variant).slope,-.027)
assert.notEqual(clementVariantKey(custom.variant),clementVariantKey(original))
assert.equal(JSON.stringify(original),before,'Manual edits never mutate the assigned variant')
for (let number=1;number<=1000;number++) {
 const variant=clementVariant(number)
 const result=parseManualClement(clementManualValues(variant),number)
 assert.equal(result.ok,true)
 if(result.ok) for(const field of ['targetHead','ambientK','pressurePa','heatLeak'] as const) assert(Math.abs(result.variant[field]-variant[field])<1e-9)
}
for(const patch of [{targetHead:''},{targetHead:'NaN'},{targetHead:'Infinity'},{targetHead:'401'},{targetHead:'0'},{temperature:'-274'},{temperature:'51'},{pressure:'0'},{pressure:'120.1'},{heatLeak:'0'},{heatLeak:'.101'}]) assert.equal(parseManualClement({...values,...patch},24).ok,false,JSON.stringify(patch))
assert.equal(parseManualClement(values,0).ok,false)
assert.equal(parseManualClement(values,2.5).ok,false)
console.log('PASS: manual Clement units and decimal commas, 1000 generated variants round-trip, invalid/extreme values rejected, expected readings use edited parameters, source assignment unchanged')
