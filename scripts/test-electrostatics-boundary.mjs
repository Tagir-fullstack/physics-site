import assert from 'node:assert/strict'
import {readdir,readFile} from 'node:fs/promises'
import {join} from 'node:path'
async function files(directory){const entries=await readdir(directory,{withFileTypes:true});return(await Promise.all(entries.map(e=>e.isDirectory()?files(join(directory,e.name)):join(directory,e.name)))).flat()}
for(const file of await files('src')) {
  if(!/\.(tsx?|jsx?)$/.test(file))continue
  const source=await readFile(file,'utf8')
  assert.ok(!/\b(solveElectrostatic|contourSegments|samplePotential|FieldGrid)\b/.test(source),`Server model leaked into ${file}`)
  assert.ok(!/from\s*['"][^'"]*api\/_lib\//.test(source),`Server import in ${file}`)
  assert.ok(!source.includes('electrostatics.worker'),`Worker reference in ${file}`)
}
for(const file of await files('dist/assets')) {
  assert.ok(!file.includes('electrostatics.worker'),'Worker emitted into production assets')
  if(file.endsWith('.js'))assert.ok(!(await readFile(file,'utf8')).includes('Float64Array'),'Numerical grid constructor emitted into production JS')
}
console.log('PASS: client source and production assets exclude numerical solver, grid, server imports and electrostatics worker')
