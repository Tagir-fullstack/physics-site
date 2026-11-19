import assert from 'node:assert/strict'
import { createMolecularVariant, molecularTasks, molecularExpected, gradeMolecular, reviewMolecular, molecularFingerprint } from '../api/_lib/molecularAssessment.js'
const seen = new Set<string>(), easy = new Set<number>()
for(let i=0;i<1000;i++) {
  const v=createMolecularVariant(), expected=molecularExpected(v)
  assert.notEqual(v.easy[0].kind,v.easy[1].kind)
  v.easy.forEach(e=>easy.add(e.kind))
  const fingerprint=molecularFingerprint(v);assert.ok(!seen.has(fingerprint));seen.add(fingerprint);assert.ok(fingerprint.length<=255)
  const answers=Object.fromEntries(Object.entries(expected).map(([id,r])=>[id,{value:String(r.value).replace('.',',')}]))
  assert.equal(gradeMolecular(v,answers).score,4)
  assert.equal(gradeMolecular(v,{}).score,0)
  assert.equal(gradeMolecular(v,{easy1:{value:''}}).score,0)
  assert.equal(gradeMolecular(v,{easy1:{value:String(expected.easy1.value)}}).score,.3)
  assert.equal(gradeMolecular(v,{easy1:{value:'Infinity'}}).score,0)
  for(const lang of ['ru','kk'] as const) {
    const tasks=molecularTasks(v,lang)
    assert.deepEqual(tasks.map(t=>t.points),[.3,.3,.5,.5,.5,.5,.7,.7]);assert.equal(tasks.length,8)
    assert.ok(tasks.every(t=>t.kind==='numeric'&&t.fields.length===1))
    assert.ok(!/expected|solution|correct|penaltyPolicy/.test(JSON.stringify(tasks)))
    const review=reviewMolecular(v,answers,lang);assert.equal(review.fields.length,8);assert.ok(review.tasks.every(t=>t.solution.length>10))
  }
  // Independent dimensional/physics checks, all values in SI before output scaling.
  assert.ok(Math.abs(expected.concentration.value-v.concentration.coefficient*1e23/(v.concentration.litres*1e-3)/1e25)<1e-10)
  assert.ok(Math.abs(expected.gasMass.value-v.gasMass.kpa*1000*v.gasMass.litres*.001*(v.gasMass.molarMass/1000)/(8.31*v.gasMass.temperature)*1000)<1e-9)
  assert.ok(Math.abs(expected.speed.value**2-3*8.31*v.speed.temperature/(v.speed.molarMass/1000))<1e-6)
  assert.ok(Math.abs(expected.heating.value-v.heating.temperature*v.heating.delta/100)<1e-10)
  const mix=v.mixture, molar=1/(mix.fraction/.028+(1-mix.fraction)/.004)
  assert.ok(Math.abs(expected.mixture.value-mix.kpa*1000*molar/(8.31*mix.temperature))<1e-10)
  const d=v.dissociation, alpha=expected.dissociation.value/100
  assert.ok(Math.abs(d.finalKpa/d.initialKpa-(1+alpha)*d.finalK/d.initialK)<1e-9)
  assert.ok(expected.dissociation.value>0&&expected.dissociation.value<100)
  const molars=[2,4,28,32,44,40]
  v.easy.forEach((e,i)=>{
    const M=molars[e.gas], reference=[M,e.amount,e.amount*M,e.amount*6.02,M/6.02,e.amount*22.4][e.kind]
    assert.ok(Math.abs(expected[`easy${i+1}`].value-reference)<1e-10)
  })
}
assert.equal(easy.size,6)
console.log('PASS: 1000 unique variants, six distinct easy templates, eight numeric tasks/4 points, RU/KK, formulas, grading and no public solutions')
