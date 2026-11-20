import assert from 'node:assert/strict'
import { SHEET, electrodes, electrodeClearance, electrodeContains, toModelPoint, toDisplayPoint, electroVariant, solveElectrostatic, samplePotential, electricField, electrodeAt, electrodeY, potentialLevels, voltmeter, fieldEstimate, contourPath, fieldLines, type ElectroVariant } from '../src/lib/electrostatics'
import { emptyElectroNotebook, validElectroNotebook } from '../src/lib/electrostaticsNotebook'
const start = Date.now(), unique = new Set<string>(), personal = new Set<string>(), counts = new Set<number>(), rotations = new Set<number>()
for (let n = 1; n <= 10000; n++) {
  const v = electroVariant(n, `student-${n}`), conductors = electrodes(v)
  assert.equal(v.revision, 3); assert.ok(v.voltage >= 12 && v.voltage <= 15); assert.equal(v.interval, 1)
  assert.ok(potentialLevels(v).every(p => p > 0 && p < v.voltage))
  assert.ok(conductors.length >= 2 && conductors.length <= 4); counts.add(conductors.length)
  assert.ok(conductors.some(e => e.potential === 0) && conductors.some(e => e.potential === 1))
  for (const e of conductors) {
    assert.equal(electrodeAt(v, e), e.potential); if (e.shape === 'plate') rotations.add(e.angle)
    // Bounding-circle containment is stronger than the physical rotated rectangle in some orientations;
    // check its actual rectangle corners instead.
    const a = e.angle * Math.PI / 180
    const hx = e.shape === 'disc' ? e.radius : Math.abs(Math.cos(a)) * e.length / 2 + Math.abs(Math.sin(a)) * 3
    const hy = e.shape === 'disc' ? e.radius : Math.abs(Math.sin(a)) * e.length / 2 + Math.abs(Math.cos(a)) * 3
    assert.ok(e.x - hx >= 12 && e.x + hx <= SHEET.width - 12 && e.y - hy >= 12 && e.y + hy <= SHEET.height - 12, `boundary ${n}`)
  }
  for (let i = 0; i < conductors.length; i++) for (let j = 0; j < i; j++) assert.ok(electrodeClearance(conductors[i], conductors[j]) >= 14, `clearance ${n}`)
  unique.add(JSON.stringify(conductors))
  personal.add(JSON.stringify(electrodes(electroVariant(24, `student-${n}`))))
  if (n <= 100) assert.deepEqual(v, electroVariant(n, `student-${n}`))
}
assert.equal(unique.size,10000); assert.equal(personal.size,10000,'Different profiles with the same number get different layouts')
assert.equal(counts.size,3); assert.ok(rotations.size >= 30)
for (const n of [0,-1,1.5,NaN,Infinity,1_000_001]) assert.throws(()=>electroVariant(n))
assert.ok(electroVariant(1_000_000))
// Old snapshots have no revision/conductors, so their legacy geometry must remain unchanged.
const classic = (n: number): ElectroVariant => ({ number:n,layout:'classic',geometry:(['discs','disc-plate','plates'] as const)[(n-1)%3],voltage:15,interval:3,gap:96,radius:10,length:80 })
for (const n of [1,2,3]) {
  const v=classic(n),g=solveElectrostatic(v)
  assert.ok(g.converged && g.residual<1e-5)
  for (const e of [0,1] as const) assert.equal(voltmeter(g,v,{x:90,y:electrodeY(v,e)}),e*v.voltage)
  for (const y of [30,90,120,190,220]) {
    assert.ok(Math.abs(samplePotential(g,{x:40,y})-samplePotential(g,{x:140,y}))<2e-5)
    if(v.geometry!=='disc-plate') assert.ok(Math.abs(samplePotential(g,{x:90,y})+samplePotential(g,{x:90,y:240-y})-v.voltage)<2e-5)
  }
  const e=electricField(g,{x:90,y:120});assert.ok(Math.abs(e.x)<.01 && e.y>0)
}
for (const n of [1,2,3,24,26,66,88,96,142,193,435,471,500,600,1000,1000000]) {
  const v=electroVariant(n,`student-${n}`),g=solveElectrostatic(v)
  assert.ok(g.converged && g.residual<1e-5,`convergence ${n}`)
  for(const value of g.potential) assert.ok(value>=-1e-5 && value<=v.voltage+1e-5,'Maximum principle')
  for(const e of electrodes(v)) assert.equal(voltmeter(g,v,e),e.potential*v.voltage)
  assert.ok(potentialLevels(v).every(level=>{const path=contourPath(g,level);return path.length>0&&!/NaN|Infinity/.test(path)}))
  const lines=fieldLines(g,v);assert.ok(lines.length>0 && lines.every(p=>!/NaN|Infinity/.test(p)))
  // Independent collision check at solver resolution.
  for(let x=0;x<=SHEET.width;x+=2)for(let y=0;y<=SHEET.height;y+=2)assert.ok(electrodes(v).filter(e=>electrodeContains(e,{x,y})).length<=1)
}
// Analytic benchmark independent of the random generator.
const v={...classic(3),length:SHEET.width},g=solveElectrostatic(v)
const top=electrodeY(v,1)+Math.floor(3/SHEET.step)*SHEET.step,bottom=electrodeY(v,0)-Math.floor(3/SHEET.step)*SHEET.step
for(let y=top;y<=bottom;y+=2)assert.ok(Math.abs(samplePotential(g,{x:90,y})-v.voltage*(bottom-y)/(bottom-top))<2e-5)
assert.ok(Math.abs(electricField(g,{x:90,y:120}).magnitude-v.voltage/((bottom-top)/1000))<.01)
assert.equal(fieldEstimate({x:0,y:0,potential:2},{x:0,y:10,potential:4})?.field,200)
assert.equal(fieldEstimate({x:0,y:0,potential:2},{x:0,y:0,potential:4}),null)
assert.ok(Number.isNaN(samplePotential(g,{x:-1,y:10})))
const notebook=emptyElectroNotebook();assert.ok(validElectroNotebook(notebook,v))
assert.ok(!validElectroNotebook({...notebook,points:[{x:NaN,y:0,potential:2,level:2}]},v))
assert.ok(!validElectroNotebook({...notebook,axis:[{x:0,y:300,potential:2}]},v))
assert.ok(!validElectroNotebook({...notebook,answers:[]},v));assert.ok(!validElectroNotebook(null,v))
assert.deepEqual(toModelPoint(toDisplayPoint({x:35,y:160})),{x:35,y:160})
assert.deepEqual(toDisplayPoint({x:90,y:120}),{x:0,y:0})
assert.deepEqual(toDisplayPoint({x:0,y:0}),{x:-120,y:90})
assert.deepEqual(toDisplayPoint({x:180,y:240}),{x:120,y:-90})
for (const x of [0,35.5,90,180]) for (const y of [0,85.5,120,240]) assert.deepEqual(toModelPoint(toDisplayPoint({x,y})),{x,y})
console.log(`PASS: 10000 unique layouts and 10000 same-number personal layouts, 12–15 V, rotations/containment/clearances, deterministic reproduction, 16 random field solutions, legacy snapshots, maximum principle, boundary values, contours, field lines, analytic benchmark and draft validation (${Date.now()-start} ms)`)
