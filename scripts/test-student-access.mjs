// Integration tests use ONLY the explicitly named local PostgreSQL socket.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { drizzle } from 'drizzle-orm/pg-proxy'
const exec = promisify(execFile)
const namespace = 'profile_access_test_' + Date.now()
const literal = v => v === null || v === undefined ? 'null' : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : "'" + String(v).replaceAll("'", "''") + "'"
async function psql(statement, csv = false) {
 const { stdout } = await exec('psql', ['-X','-qAt',...(csv?['--csv']:[]),'-v','ON_ERROR_STOP=1','-h','/private/tmp','-p','55439','-d','postgres','-c',statement], { env:{PATH:process.env.PATH,USER:process.env.USER,PGUSER:process.env.USER,PGOPTIONS:'-c search_path='+namespace},maxBuffer:4e6 })
 return stdout
}
function csvRows(text) {
 const rows=[];let row=[],cell='',quoted=false
 for(let i=0;i<text.length;i++) { const c=text[i]; if(c==='"'){ if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted }else if(c===','&&!quoted){row.push(cell);cell=''}else if(c==='\n'&&!quoted){row.push(cell);rows.push(row);row=[];cell=''}else cell+=c }
 return rows.map(row=>row.map(v=>v===''?null:v==='t'?true:v==='f'?false:/^-?\d+(\.\d+)?$/.test(v)?Number(v):/^[\[{]/.test(v)?JSON.parse(v):v))
}
function interpolate(query, params) { return query.replace(/\$(\d+)/g,(_,n)=>literal(params[Number(n)-1])) }
const proxy=drizzle(async(query,params)=>({rows:csvRows(await psql(interpolate(query,params),true))}))
const sqlTag=(strings,...values)=>({statement:strings.reduce((s,p,i)=>s+(i?literal(values[i-1]):'')+p,'')})
sqlTag.transaction=async queries=>{await psql('begin;'+queries.map(q=>q.statement).join(';')+';commit;');return []}
globalThis.__educationFixture={db:proxy,databaseSql:sqlTag,hasDatabaseConfig:true}

await mkdir('node_modules/.cache',{recursive:true})
await build({stdin:{contents:`export {default as handler} from './api/student-profile.ts'`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:'node_modules/.cache/profile-access-test.cjs',plugins:[{name:'isolated-fixtures',setup(b){
 b.onResolve({filter:/\/(_lib\/)?db\.js$/},a=>a.importer.includes('/api/')?({path:'db',namespace:'fixture'}):undefined)
 b.onResolve({filter:/\/(_lib\/)?auth\.js$/},a=>a.importer.includes('/api/')?({path:'auth',namespace:'fixture'}):undefined)
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:process.cwd(),contents:a.path==='db'?`export const {db,databaseSql,hasDatabaseConfig}=globalThis.__educationFixture;export * as schema from '${process.cwd()}/api/_lib/schema.ts'`:`export async function getClerkUser(req){const id=req.headers.authorization?.replace('Bearer ','');return id?{userId:id,email:'',isPremium:false}:null}export function hasPremiumAccess(u){return isAdmin(u)||u?.isPremium===true}export function isAdmin(u){return u?.userId==='admin'}export async function deleteStudentLogin(){throw Error('Login deletion is not part of this recovery fixture')}`}))
}}]})
const {handler}=createRequire(import.meta.url)('../node_modules/.cache/profile-access-test.cjs')
async function call(body, {id,token,method,origin}={}) {
 let status=200,payload,cookie=''
 const req={method:method||(body?'POST':'GET'),body:body||{},query:{},headers:{host:'localhost:5173',origin:origin||'http://localhost:5173',...(id?{authorization:'Bearer '+id}:{})},cookies:token?{physez_student:token}:{}}
 const res={setHeader(k,v){if(k==='Set-Cookie')cookie=v},status(n){status=n;return this},json(p){payload=p;return this}}
 await handler(req,res);return {status,payload,cookie}
}
await psql('create schema '+namespace)
try {
 await psql(await readFile('scripts/sql/oberbeck-student-variants.sql','utf8'))
 await psql('alter table student_profiles add column clerk_id varchar(64) unique;alter table student_profiles add column variant_number serial unique not null;alter table student_profiles add column merged_into uuid')
 await psql(await readFile('scripts/sql/student-recovery-links.sql','utf8'))
 const student={lastName:'Тестовый',firstName:'Студент',group:'B062'}
 const created=await call({action:'create',student})
 assert.equal(created.status,201)
 const token=created.payload.code,profile=created.payload.profile
 assert.ok(created.cookie.includes('HttpOnly'))
 const duplicate=await call({action:'create',student})
 assert.equal(duplicate.status,409)
 assert.equal(duplicate.payload.code,'STUDENT_RECOVERY_REQUIRED')
 assert.equal(duplicate.payload.profile,undefined,'FIO alone never grants access')
 assert.equal((await call({action:'issueRecovery',studentId:profile.id})).status,403)
 assert.equal((await call({action:'issueRecovery',studentId:profile.id},{id:'other'})).status,403)
 assert.equal((await call({action:'issueRecovery',studentId:profile.id},{id:'admin',origin:'https://other.example'})).status,403)
 const issued=await call({action:'issueRecovery',studentId:profile.id},{id:'admin'})
 assert.equal(issued.status,200,'Recovery does not require an Oberbeck variant')
 assert.ok(issued.payload.path.startsWith('/student/recover?from=clement-desormes#token='))
 assert.equal((await psql('select count(*) from student_recovery_links')).trim(),'1')
 assert.equal((await call(undefined,{token})).payload.profile.id,profile.id,'Issuing a link keeps existing access')
 assert.equal((await call({action:'linkAccount',profileId:'another-profile'},{token,id:'studentA'})).status,409)
 assert.equal((await call({action:'linkAccount',profileId:profile.id},{id:'studentA'})).status,401,'Cannot link without private cookie')
 const linked=await call({action:'linkAccount',profileId:profile.id},{token,id:'studentA'})
 assert.equal(linked.status,200)
 assert.equal(linked.payload.profile.accountLinked,true)
 const remote=await call(undefined,{id:'studentA'})
 assert.equal(remote.payload.profile.id,profile.id,'Account opens same profile without guest cookie')
 assert.equal(remote.payload.profile.variantNumber,profile.variantNumber)
 assert.equal((await call(undefined,{id:'studentB'})).payload.profile,null)
 assert.equal((await call({action:'linkAccount',profileId:profile.id},{token,id:'studentB'})).status,401,'Cannot rebind to another account')
 assert.equal((await call({action:'recover',code:token})).payload.profile.id,profile.id)
 const retry=await call({action:'create',student},{id:'studentA'})
 assert.equal(retry.status,200)
 assert.equal(retry.payload.profile.id,profile.id)
 assert.equal((await psql('select count(*) from student_profiles')).trim(),'1','No duplicated profile or variant')
 console.log('PASS: duplicate recovery state, no access by FIO, admin-only links without Oberbeck, CSRF, private-cookie account binding, wrong-account rejection, cross-device account access, unchanged variant and idempotent registration')
} finally { await psql('drop schema '+namespace+' cascade') }
