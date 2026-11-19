import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { VercelRequest,VercelResponse } from '@vercel/node'
import { createElectrostaticsHandler } from '../api/_lib/electrostaticsLab'
import type { ClerkUser } from '../api/_lib/auth'
import type { currentStudent } from '../api/_lib/studentProfile'
import { emptyElectroNotebook } from '../src/lib/electrostaticsNotebook'
import { validateElectroSubmission,electroProgress } from '../src/lib/electrostaticsSubmission'
import { probeReading } from '../api/_lib/electrostaticsInstrument'
import { electroVariant, electrodes, potentialLevels, type Reading, type Point } from '../src/lib/electrostatics'
const studentId=randomUUID(),id=randomUUID(),student={id:studentId,variantNumber:24} as Awaited<ReturnType<typeof currentStudent>>
let account:ClerkUser|null={userId:'student',email:'',isPremium:false,accessRole:'user'}
let saves=0,details=0,reviews=0,quotaAllowed=true,charges=0,quotaFails=false,expectedAllowed=true
let listSort: unknown[]=[]
const notebook=emptyElectroNotebook();notebook.conclusion='Плотность линий выше в сильном поле.'
const variant=electroVariant(24),work={id,studentId,variant,notebook,status:'submitted' as const,comment:'',createdAt:new Date().toISOString(),reviewedAt:null,reviewVersion:0,progress:electroProgress(notebook,variant)}
const handler=createElectrostaticsHandler({
  account:async()=>account,profile:async()=>student,
  consume:async (_key: string, cost: number)=>{charges+=cost;if(quotaFails)throw Error('DB unavailable');return quotaAllowed},
  scope:async user=>user?.accessRole==='admin'?{teacherId:null,reviewerId:user.userId}:user?.userId==='verified-teacher'&&user.isPremium?{teacherId:user.userId,reviewerId:user.userId}:null,
  store:{expectedStudent:async()=>expectedAllowed?({id:studentId,variantNumber:24,lastName:'Тестовый',firstName:'Студент',group:'B062'}):null,mine:async()=>work,save:async()=>{saves++;return work},list:async(_scope,_page,_query,_group,_status,sort,direction)=>{listSort=[sort,direction];return {students:[],hasMore:false}},detail:async()=>{details++;return null},review:async()=>{reviews++;return null}},
})
async function call(method='GET',body:unknown=undefined,query:Record<string,string>={},headers:Record<string,string>={}){
  let status=200,payload:Record<string,unknown>={}
  const req={method,body,query,headers:{host:'localhost:5173',origin:'http://localhost:5173',authorization:'Bearer fixture',...headers}} as unknown as VercelRequest
  const res={setHeader(){},status(n:number){status=n;return res},json(data:Record<string,unknown>){payload=data;return res}} as unknown as VercelResponse
  await handler(req,res);return{status,payload}
}
// A student receives one rounded reading, never a solved grid or reference paths.
const instrument=await call('GET',undefined,{view:'instrument'})
assert.equal(instrument.status,200)
assert.deepEqual(instrument.payload.variant,electroVariant(24,studentId))
assert.equal(instrument.payload.canReference,false)
const probe=await call('POST',{action:'probe',point:{x:90,y:120}})
assert.equal(probe.status,200)
assert.deepEqual(Object.keys(probe.payload).sort(),['point','reading'])
assert.ok(Number.isFinite(probe.payload.reading))
assert.ok(charges>0)
const assigned=electroVariant(24,studentId)
for(const e of electrodes(assigned))assert.equal((await call('POST',{action:'probe',point:{x:e.x,y:e.y}})).payload.reading,e.potential*assigned.voltage)
assert.equal((await call('POST',{action:'probe',points:[{x:90,y:120}]})).status,400)
assert.equal((await call('POST',{action:'probe',point:{x:181,y:120}})).status,400)
assert.equal((await call('POST',{action:'probe',point:{x:90.1,y:120}})).status,400)
assert.equal((await call('POST',{action:'probe',point:{x:90,y:120},studentId:id})).status,400)
assert.equal((await call('POST',{action:'probe',point:{x:90,y:120},variant:electroVariant(7)})).status,400)
assert.equal((await call('GET',undefined,{view:'instrument',practice:'7'})).status,403)
assert.equal((await call('POST',{action:'reference'})).status,403)
for(const point of [null,[],{x:'90',y:120},{x:NaN,y:120},{x:90,y:Infinity},{x:-.5,y:120},{x:90,y:240.5},{x:90,y:120,extra:1}])assert.equal((await call('POST',{action:'probe',point})).status,400)
assert.equal((await call('POST',{action:'probe',point:{x:90,y:120}},{},{origin:'https://other.example'})).status,403)
assert.equal((await call('POST',{action:'probe',point:{x:90,y:120}},{},{authorization:''})).status,403)
quotaFails=true;assert.equal((await call('POST',{action:'probe',point:{x:90,y:120}})).status,503);quotaFails=false
quotaAllowed=false
assert.equal((await call('POST',{action:'probe',point:{x:90,y:120}})).status,429)
quotaAllowed=true
account={...account!,isPremium:true}
assert.equal((await call('POST',{action:'reference'})).status,403,'PRO student is not a teacher')
assert.equal((await call('POST',{action:'probe',point:{x:90,y:120},practice:7})).status,200)
assert.equal((await call('GET',undefined,{view:'expected',id:studentId})).status,403)
const candidates:Reading[]=[]
for(let y=0;y<=240&&candidates.length<8;y+=2)for(let x=0;x<=180&&candidates.length<8;x+=2){
  const potential=probeReading(assigned,{x,y})
  if(potentialLevels(assigned).includes(potential))candidates.push({x,y,potential,level:potential})
}
assert.ok(candidates.length>=2)
const chargeBefore=charges
const connected=await call('POST',{action:'connections',points:candidates})
assert.equal(connected.status,200);assert.equal(charges-chargeBefore,candidates.length)
assert.deepEqual(Object.keys(connected.payload),['edges'])
for(const group of connected.payload.edges as Array<Array<[Point,Point]>>)for(const edge of group)for(const p of edge)assert.ok(candidates.some(q=>q.x===p.x&&q.y===p.y),'Only submitted endpoints are returned')
assert.equal((await call('POST',{action:'connections',points:[{...candidates[0],potential:-1}]})).status,400)
account={...account!,isPremium:false}
const body={action:'submit',id,studentId,variantNumber:24,notebook}
assert.equal((await call('PUT')).status,405)
account=null;assert.equal((await call()).status,401)
account={userId:'student',email:'',isPremium:false,accessRole:'user'}
assert.equal((await call('GET',undefined,{view:'list'})).status,403)
assert.equal((await call('GET',undefined,{view:'expected',id:studentId})).status,403);
assert.equal((await call('GET',undefined,{view:'detail',id})).status,403);assert.equal(details,0)
assert.equal((await call('POST',body,{}, {origin:'https://other.example'})).status,403)
assert.equal((await call('POST',body,{}, {authorization:''})).status,403)
assert.equal((await call('POST',body)).status,403);assert.equal(saves,0)
assert.equal((await call('POST',{...body,notebook:{...notebook,conclusion:'x'.repeat(260000)}})).status,400)
account={...account,isPremium:true}
assert.equal((await call('POST',body)).status,403);assert.equal(saves,0)
account={...account,isPremium:false}
assert.equal((await call('GET',undefined,{view:'mine'})).payload.monitorPath,null)
assert.equal((await call('POST',{action:'review',id,reviewVersion:0,status:'accepted',comment:''})).status,403);assert.equal(reviews,0)
account={userId:'verified-teacher',email:'',isPremium:true,accessRole:'user'}
assert.equal((await call('GET',undefined,{view:'mine'})).payload.monitorPath,'/teacher/electrostatics-monitor')
assert.equal((await call('GET',undefined,{view:'list',page:'-1'})).status,400)
assert.equal((await call('GET',undefined,{view:'list',status:'invented'})).status,400)
assert.equal((await call('GET',undefined,{view:'expected',id:'invalid'})).status,400)
expectedAllowed=false;assert.equal((await call('GET',undefined,{view:'expected',id:studentId})).status,404);expectedAllowed=true
assert.equal((await call('POST',{action:'reference'})).status,200)
assert.equal((await call('POST',{action:'connections',points:[]})).status,200)
assert.equal((await call('POST',{action:'connections',points:Array(201).fill({x:90,y:120})})).status,400)
assert.equal((await call('POST',{action:'pair',points:[]})).status,400)
const expected=await call('GET',undefined,{view:'expected',id:studentId})
assert.equal(expected.status,200)
assert.ok(Array.isArray((expected.payload.drawing as {contours:unknown[]}).contours))
assert.equal('grid' in expected.payload,false)
assert.equal('potential' in expected.payload,false)
assert.deepEqual((await call('GET',undefined,{view:'expected',id:studentId})).payload.variant,electroVariant(24,studentId))
assert.equal((await call('GET',undefined,{view:'list',sort:'variant',direction:'desc'})).status,200);assert.deepEqual(listSort,['variant','desc'])
assert.equal((await call('GET',undefined,{view:'list',sort:'bad'})).status,400)
assert.equal((await call('GET',undefined,{view:'list',direction:'bad'})).status,400)
assert.equal((await call('GET',undefined,{view:'detail',id:'invalid'})).status,400)
assert.equal((await call('GET',undefined,{view:'detail',id})).status,404)
assert.equal((await call('POST',{action:'review',id,reviewVersion:0,status:'revision',comment:''})).status,400)
assert.equal((await call('POST',{action:'review',id,reviewVersion:0,status:'accepted',comment:'Проверено'})).status,409)
account={...account,isPremium:false};assert.equal((await call('GET',undefined,{view:'list'})).status,403)
account={...account,accessRole:'admin'};assert.equal((await call('GET',undefined,{view:'mine'})).payload.monitorPath,'/admin/electrostatics-monitor')
assert.throws(()=>validateElectroSubmission({...notebook,axis:[{x:10,y:20,potential:2}]},24))
assert.throws(()=>validateElectroSubmission({...notebook,points:[{x:0,y:100,potential:3,level:3},{x:0,y:100,potential:3,level:3}]},24))
console.log('PASS: private probe payload, no grid, identity and geometry spoof rejection, Basic/PRO reference denial, teacher scope, quota/DB failure, invalid points, authentication, CSRF, submissions disabled for basic and PRO, oversized payloads, PRO teacher access, review validation and stale writes')
