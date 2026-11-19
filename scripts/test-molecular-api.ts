import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { getTableName } from 'drizzle-orm'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, schema } from '../api/_lib/db.js'
import handler from '../api/molecular-assessment.js'
import { createMolecularVariant, molecularExpected } from '../api/_lib/molecularAssessment.js'
import { canRestartAssessment } from '../api/_lib/assessmentAccess.js'
import { ASSESSMENT_DURATION_MS } from '../api/_lib/mechanicsAssessment.js'

// Exercise the real API and release/session code against read-only in-memory rows.
// Any unexpected write/network query fails; no existing period or student is touched.
const id='00000000-0000-4000-8000-000000000001', secret='a'.repeat(32), key='molecular-cut-v1'
const student={lastName:'Тестовый',firstName:'Студент',group:'B076',variantNumber:7}
const now=Date.now(), variant={...createMolecularVariant(),student,penaltyPolicy:{version:1 as const}}
const expected=molecularExpected(variant)
const answers=Object.fromEntries(Object.entries(expected).map(([id,v])=>[id,{value:String(v.value)}]))
const session={id,periodKey:key,testId:'molecular',name:'Fixture',startsAt:new Date(now-60_000),endsAt:new Date(now+49*60_000),endedAt:null,durationMinutes:50}
const member={id,sessionId:id,student,status:'admitted',clerkUserId:null,tokenHash:createHash('sha256').update(secret).digest('hex'),extraSeconds:0}
const attempt={id,assessmentKey:`${key}-s-${id}`,variantData:variant,variantCode:'TEST',startedAt:session.startsAt,expiresAt:session.endsAt,submittedAt:null as Date|null,score:null as number|null,answers,violations:[]}
const period={key,testId:'molecular',name:'Fixture',active:true,maxPointsTenths:40,createdAt:new Date(now),archivedAt:null}
let revealAt:Date|null=new Date(now+60*60_000)
const originalSelect=db.select
const rows=(table:unknown)=>{
  switch(String(getTableName(table as typeof schema.assessmentAttempts))) {
    case 'assessment_periods': return [period]
    case 'assessment_access_settings':return [{periodKey:key,sessionsRequired:true,revealAt}]
    case 'assessment_participants':return [{session,member}]
    case 'assessment_attempts':return [attempt]
    default:throw Error('Unexpected fixture read')
  }
}
// Drizzle's fluent query is thenable; only SELECT is replaced in this process.
Object.assign(db,{select:()=>{
  let table:unknown
  const chain:Record<string,unknown>={from:(t:unknown)=>{table=t;return chain},where:()=>chain,innerJoin:()=>chain,leftJoin:()=>chain,orderBy:()=>chain,limit:()=>chain,
    then:(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown)=>Promise.resolve().then(()=>rows(table)).then(resolve,reject)}
  return chain
}})
async function call(body?:Record<string,unknown>,query:Record<string,string>={},cookie=true,origin='http://localhost:5173') {
  let status=200;let payload:Record<string,unknown>={}
  const req={method:body?'POST':'GET',body,query,cookies:cookie?{physez_exam_molecular:`${id}.${secret}`}:{},headers:{host:'localhost:5173',origin}} as unknown as VercelRequest
  const res={setHeader(){},getHeader(){},status(s:number){status=s;return res},json(p:Record<string,unknown>){payload=p;return res}} as unknown as VercelResponse
  await handler(req,res);return {status,payload}
}
try {
  assert.equal(ASSESSMENT_DURATION_MS,50*60_000)
  assert.equal(canRestartAssessment('molecular',{userId:'fixture',email:'',isPremium:true}),false)
  assert.equal(canRestartAssessment('molecular',{userId:'fixture',email:'',isPremium:false,accessRole:'admin'}),true)
  let r=await call(undefined,{view:'entry'},false);assert.equal(r.payload.phase,'code');assert.equal(r.payload.mode,'session')
  r=await call({action:'start'}, {},false);assert.equal(r.status,403);assert.ok(!('tasks'in r.payload))
  session.startsAt=new Date(now+60_000)
  assert.equal((await call(undefined,{view:'entry'})).payload.phase,'waiting')
  assert.equal((await call({action:'resume'})).payload.status,'locked')
  session.startsAt=new Date(now-60_000)
  const active=await call({action:'resume'});assert.equal(active.payload.status,'active');assert.equal((active.payload.tasks as unknown[]).length,8)
  assert.ok(!/"expected"|"solution"/.test(JSON.stringify(active.payload)))
  const repeated=await call({action:'resume'});assert.deepEqual(repeated.payload.tasks,active.payload.tasks)
  for(const action of ['createSession','saveReveal','startSession','extendParticipant','endSession','restart'])assert.equal((await call({action,isAdmin:true,practice:true}, {},false)).status,403)
  assert.equal((await call({action:'progress'}, {},true,'https://foreign.invalid')).status,403)
  assert.equal((await call(undefined,{view:'monitor'})).status,401)
  attempt.submittedAt=new Date();attempt.score=400
  const sealed=await call({action:'resume'});assert.equal(sealed.payload.status,'sealed');assert.equal(sealed.payload.score,4);assert.equal(sealed.payload.maxScore,4)
  for(const key of ['review','tasks','correctness','answers'])assert.ok(!(key in sealed.payload))
  revealAt=new Date(now-1000)
  const released=await call({action:'resume'});assert.equal(released.payload.status,'submitted');assert.equal(released.payload.score,4)
  assert.deepEqual(released.payload.taskMaxScores,[.3,.3,.5,.5,.5,.5,.7,.7])
  assert.ok((released.payload.review as Array<{solution:string}>).every(t=>t.solution.length>10))
  assert.ok((released.payload.correctness as boolean[]).every(Boolean))
  console.log('PASS: real molecular API with isolated read fixtures: waiting room, locked before start, persistent tasks, admin/spoof/origin restrictions, sealed until reveal, solutions and 400→4 score scaling; no DB writes')
} finally {db.select=originalSelect}
