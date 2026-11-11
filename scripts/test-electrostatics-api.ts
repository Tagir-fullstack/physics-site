import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { VercelRequest,VercelResponse } from '@vercel/node'
import { createElectrostaticsHandler } from '../api/_lib/electrostaticsLab'
import type { ClerkUser } from '../api/_lib/auth'
import type { currentStudent } from '../api/_lib/studentProfile'
import { emptyElectroNotebook } from '../src/lib/electrostaticsNotebook'
import { validateElectroSubmission,electroProgress } from '../src/lib/electrostaticsSubmission'
import { electroVariant } from '../src/lib/electrostatics'
const studentId=randomUUID(),id=randomUUID(),student={id:studentId,variantNumber:24} as Awaited<ReturnType<typeof currentStudent>>
let account:ClerkUser|null={userId:'student',email:'',isPremium:false,accessRole:'user'}
let saves=0,details=0,reviews=0
let listSort: unknown[]=[]
const notebook=emptyElectroNotebook();notebook.conclusion='Плотность линий выше в сильном поле.'
const variant=electroVariant(24),work={id,studentId,variant,notebook,status:'submitted' as const,comment:'',createdAt:new Date().toISOString(),reviewedAt:null,reviewVersion:0,progress:electroProgress(notebook,variant)}
const handler=createElectrostaticsHandler({
  account:async()=>account,profile:async()=>student,
  scope:async user=>user?.accessRole==='admin'?{teacherId:null,reviewerId:user.userId}:user?.userId==='verified-teacher'&&user.isPremium?{teacherId:user.userId,reviewerId:user.userId}:null,
  store:{expectedStudent:async()=>({id:studentId,variantNumber:24,lastName:'Тестовый',firstName:'Студент',group:'B062'}),mine:async()=>work,save:async()=>{saves++;return work},list:async(_scope,_page,_query,_group,_status,sort,direction)=>{listSort=[sort,direction];return {students:[],hasMore:false}},detail:async()=>{details++;return null},review:async()=>{reviews++;return null}},
})
async function call(method='GET',body:unknown=undefined,query:Record<string,string>={},headers:Record<string,string>={}){
  let status=200,payload:Record<string,unknown>={}
  const req={method,body,query,headers:{host:'localhost:5173',origin:'http://localhost:5173',authorization:'Bearer fixture',...headers}} as unknown as VercelRequest
  const res={setHeader(){},status(n:number){status=n;return res},json(data:Record<string,unknown>){payload=data;return res}} as unknown as VercelResponse
  await handler(req,res);return{status,payload}
}
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
assert.equal((await call('GET',undefined,{view:'expected',id:studentId})).status,200)
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
console.log('PASS: authentication, CSRF, submissions disabled for basic and PRO, oversized payloads, PRO teacher access, review validation and stale writes')
