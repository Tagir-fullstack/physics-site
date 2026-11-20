import assert from 'node:assert/strict'
import { createInstrumentSession } from '../src/workers/electrostaticsInstrument.js'
import { electroVariant, electrodes, potentialLevels, type Reading } from '../src/lib/electrostatics.js'
import { solveElectrostatic, voltmeter } from '../src/workers/electrostaticsModel.js'
const variant=electroVariant(24,'instrument-fixture'), original=solveElectrostatic(variant)
const session=createInstrumentSession()
let id=0
const send=(op:string,body:Record<string,unknown>={})=>session.handle({id:++id,op,...body})
assert.equal(send('read',{point:{x:90,y:120}}).ok,false)
const opened=send('open',{variant});assert.deepEqual(opened,{id,ok:true,data:{ready:true}})
for(const op of ['grid','dump','preview','reference','solve','field'])assert.equal(send(op).ok,false)
assert.equal(send('open',{variant:electroVariant(25)}).ok,false,'A session is bound to one initialized variant')
const points:Reading[]=[]
for(let y=0;y<=240;y+=12)for(let x=0;x<=180;x+=12){
 const point={x,y},reply=send('read',{point})
 assert.equal(reply.ok,true)
 assert.deepEqual(reply.data,{point,value:voltmeter(original,variant,point)})
 assert.ok(!/"(grid|potential|gradient|contours|lines)"/.test(JSON.stringify(reply)))
 const value=voltmeter(original,variant,point)
 if(potentialLevels(variant).includes(value)&&points.length<100)points.push({...point,potential:value,level:value})
}
for(const e of electrodes(variant))assert.equal(send('read',{point:{x:e.x,y:e.y}}).data?.value,e.potential*variant.voltage)
for(const point of [null,[],{x:NaN,y:120},{x:181,y:120},{x:90,y:-1},{x:'90',y:120}])assert.equal(send('read',{point}).ok,false)
const connected=send('connect',{points});assert.equal(connected.ok,true)
for(const group of connected.data!.edges)for(const edge of group)for(const p of edge)assert.ok(points.some(q=>q.x===p.x&&q.y===p.y))
assert.equal(send('connect',{points:Array(201).fill(points[0])}).ok,false)
assert.equal(send('pair',{points:[]}).ok,false)
assert.equal(send('pair',{points:points.slice(0,2)}).ok,true)
assert.equal(session.handle(null).ok,false)
console.log('PASS: private instrument protocol, original-model readings, electrode values, no grid/reference dump, bounded measurement connections and malformed commands')
