import assert from 'node:assert/strict'
import { readdir,readFile } from 'node:fs/promises'
import { join } from 'node:path'
async function entrypoints(path){const entries=await readdir(path,{withFileTypes:true});return(await Promise.all(entries.filter(e=>!e.name.startsWith('_')&&!e.name.startsWith('.')).map(e=>e.isDirectory()?entrypoints(join(path,e.name)):/\.(?:[cm]?[jt]s)$/.test(e.name)?[join(path,e.name)]:[]))).flat()}
const functions=await entrypoints('api')
assert.ok(functions.length<=12,`Hobby allows 12 functions; found ${functions.length}: ${functions.join(', ')}`)
const config=JSON.parse(await readFile('vercel.json','utf8'))
assert.ok(config.rewrites.some(r=>r.source==='/api/molecular-assessment'&&r.destination==='/api/mechanics-assessment?assessment=molecular'),'Molecular public URL must route to existing function')
console.log(`PASS: ${functions.length}/12 Vercel function entrypoints; molecular URL reuses the assessment function`)
