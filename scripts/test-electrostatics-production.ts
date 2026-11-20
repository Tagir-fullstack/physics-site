import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import vm from 'node:vm'
import {performance} from 'node:perf_hooks'
import {electroVariant} from '../src/lib/electrostatics.js'
import {solveElectrostatic,voltmeter} from '../src/workers/electrostaticsModel.js'
const assets=await readdir(new URL('../dist/assets/',import.meta.url))
assert.ok(!assets.some(f=>f.endsWith('.map')),'Production assets have no source maps')
assert.ok(!assets.some(f=>f.includes('preview.worker')),'No generic reference worker is published')
const file=assets.find(f=>/^electrostatics\.worker-.*\.js$/.test(f));assert.ok(file)
const source=await readFile(new URL(`../dist/assets/${file}`,import.meta.url),'utf8')
assert.ok(source.includes('_0x'),'Production numerical worker is obfuscated')
assert.ok(!source.includes('sourceMappingURL'))
assert.ok(!/\bdebugger\s*;|\beval\s*\(/.test(source),'No debugger traps or eval wrapper')
const messages:unknown[]=[]
const context=vm.createContext({Math,Number,Float64Array,Int8Array,Array,Map,Set,Object,String,JSON,self:{postMessage:(reply:unknown)=>messages.push(reply)},atob:(s:string)=>Buffer.from(s,'base64').toString('binary')})
vm.runInContext(source,context,{timeout:5000})
const send=(data:unknown)=>{
 context.command=data;vm.runInContext('self.onmessage({data:command})',context,{timeout:10000})
 return JSON.parse(JSON.stringify(messages.at(-1))) as {ok:boolean;data?:{value?:number};error?:string}
}
const variant=electroVariant(24,'production-worker-fixture'),grid=solveElectrostatic(variant)
assert.equal(send({id:1,op:'open',variant}).ok,true)
const start=performance.now()
let id=1
for(let y=0;y<=240;y+=12)for(let x=0;x<=180;x+=12){
 const reply=send({id:++id,op:'read',point:{x,y}})
 assert.equal(reply.ok,true);assert.equal(reply.data?.value,voltmeter(grid,variant,{x,y}))
 assert.ok(!/"(grid|potential|gradient|contours|lines)"/.test(JSON.stringify(reply)))
}
const elapsed=performance.now()-start
for(const op of ['grid','dump','preview','reference','solve'])assert.equal(send({id:++id,op}).ok,false)
assert.equal(send({id:++id,op:'read',point:{x:90,y:120}}).data?.value,voltmeter(grid,variant,{x:90,y:120}))
console.log(`PASS: built obfuscated worker executes ${id-7} correct scalar reads (${Math.round(elapsed)} ms including VM calls), no raw grid/reference dump, no public preview worker or source maps`)
