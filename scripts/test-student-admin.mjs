// Integration tests use ONLY the explicitly named local PostgreSQL socket.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { drizzle } from 'drizzle-orm/pg-proxy'
const exec = promisify(execFile)
const namespace = 'student_admin_test_' + Date.now()
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
const sqlTag=(strings,...values)=>{const statement=strings.reduce((s,p,i)=>s+(i?literal(values[i-1]):'')+p,'');return {statement,then:(resolve,reject)=>(/^select/i.test(statement.trim()) ? psql('select row_to_json(t) from ('+statement+') t').then(s=>s.trim().split('\n').filter(Boolean).map(JSON.parse)) : psql(statement).then(()=>[])).then(resolve,reject)}}
sqlTag.transaction=async queries=>{await psql('begin;'+queries.map(q=>q.statement).join(';')+';commit;');return []}
globalThis.__educationFixture={db:proxy,databaseSql:sqlTag,hasDatabaseConfig:true}
let failedLogin = false
const removedLogins = []
globalThis.__educationFixture.deleteLogin = async (id, beforeDelete) => { if (failedLogin) throw Error('Clerk unavailable'); await beforeDelete(); removedLogins.push(id) }
await mkdir('node_modules/.cache',{recursive:true})
await build({stdin:{contents:`export {default as student} from './api/student-profile.ts';export {default as oberbeck} from './api/oberbeck.ts'`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:'node_modules/.cache/student-admin-test.cjs',plugins:[{name:'isolated-fixtures',setup(b){
 b.onResolve({filter:/\/(_lib\/)?db\.js$/},a=>a.importer.includes('/api/')?({path:'db',namespace:'fixture'}):undefined)
 b.onResolve({filter:/\/(_lib\/)?auth\.js$/},a=>a.importer.includes('/api/')?({path:'auth',namespace:'fixture'}):undefined)
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:process.cwd(),contents:a.path==='db'?`export const {db,databaseSql,hasDatabaseConfig}=globalThis.__educationFixture;export * as schema from '${process.cwd()}/api/_lib/schema.ts'`:`export async function getClerkUser(req){const id=req.headers.authorization?.replace('Bearer ','');return id?{userId:id,email:'',isPremium:id==='pro'}:null}export function hasPremiumAccess(u){return isAdmin(u)||u?.isPremium===true}export function isAdmin(u){return ['admin','owner'].includes(u?.userId)}export const deleteStudentLogin=globalThis.__educationFixture.deleteLogin;`}))
}}]})
const {student,oberbeck}=createRequire(import.meta.url)('../node_modules/.cache/student-admin-test.cjs')
async function call(handler,id,body,query={},headers={}) {
 let status=200,payload
 const req={method:body?'POST':'GET',body:body||{},query,headers:{host:'localhost:5173',origin:'http://localhost:5173',...(id?{authorization:'Bearer '+id}:{}),...headers},cookies:{}}
 const res={setHeader(){},status(n){status=n;return this},json(p){payload=p;return this}}
 await handler(req,res);return {status,payload}
}
await psql('create schema '+namespace)
try {
 await psql(`
 create table student_profiles(id uuid primary key default gen_random_uuid(), variant_number serial unique not null, clerk_id varchar(64) unique, last_name varchar(60) not null,first_name varchar(60) not null,student_group varchar(60) not null,identity_key varchar(64) unique not null,recovery_hash varchar(64) not null,created_at timestamptz default now(),updated_at timestamptz default now());
 create table oberbeck_variants(id uuid primary key default gen_random_uuid(),student_id uuid references student_profiles(id),code varchar(16),fingerprint text,parameters jsonb,created_at timestamptz default now());
 create table student_recovery_links(student_id uuid references student_profiles(id));
 create table users(id uuid primary key default gen_random_uuid(),clerk_id varchar(64),email text,display_name text,avatar_url text,role varchar(16),verification_status text,school text,city text,subject text,created_at timestamptz,updated_at timestamptz);
 create table comments(user_id uuid references users(id) on delete cascade);
 create table teacher_classes(id uuid primary key default gen_random_uuid());
 create table class_students(id uuid primary key default gen_random_uuid(),normalized_identity text);
 create table teacher_test_attempts(student_id uuid references class_students(id) on delete cascade);
 create table assessment_participants(clerk_user_id text);
 create table assessment_attempts(clerk_user_id text);
 create table billing_subscriptions(user_id text primary key,auto_renew boolean default true,card_cipher text,cancel_version int default 0);
 create table billing_orders(user_id text references billing_subscriptions(user_id),status text);
 `)
 await psql(await readFile('scripts/sql/account-revocation.sql','utf8'))
 await psql(await readFile('scripts/sql/education-profiles.sql','utf8'))
 await psql(await readFile('scripts/sql/teacher-verification.sql','utf8'))
 await psql(await readFile('scripts/sql/profile-merge.sql','utf8'))
 const add=async(id)=> (await psql(`insert into student_profiles(clerk_id,last_name,first_name,student_group,identity_key,recovery_hash) values(${literal(id)},'Тестовый','Студент','B062',${literal('key-'+id)},repeat('0',64)) returning id`)).trim()
 const a=await add('studentA'),b=await add('studentB'),self=await add('admin'),teacher=await add('staff'),guest=await add(null)
 const number=Number((await psql(`select variant_number from student_profiles where id='${a}'`)).trim())
 await psql(`insert into oberbeck_variants(student_id,code,parameters) values('${a}','OB-TEST','{"version":1,"height":0.5,"base":0.1,"small":0.04,"large":0.09,"radii":[0.01,0.02]}');insert into student_recovery_links values('${a}');insert into users(clerk_id,role) values('studentA','student'),('staff','teacher');insert into comments(user_id) select id from users where clerk_id='studentA';insert into billing_subscriptions(user_id,card_cipher) values('studentA','encrypted');insert into billing_orders values('studentA','paid');insert into assessment_participants values('studentA'),('studentB');insert into assessment_attempts values('studentA'),('studentB');insert into class_students(normalized_identity) values('account|studentA'),('account|studentB');insert into teacher_test_attempts select id from class_students;insert into education_profiles(user_id,role,university_id,institution,display_name,first_name,last_name,class_student_id) select 'studentA','student','satbayev','Satbayev','Тестовый Студент','Студент','Тестовый',id from class_students where normalized_identity='account|studentA'`)
 const deletion={action:'deleteStudent',studentId:a,confirmation:`УДАЛИТЬ ${number}`}
 for(const id of ['', 'studentA','pro']) assert.equal((await call(student,id,deletion)).status,403)
 assert.equal((await call(student,'admin',deletion,{}, {'sec-fetch-site':'cross-site'})).status,403)
 assert.equal((await call(student,'admin',{...deletion,confirmation:'УДАЛИТЬ 999'})).status,400)
 for(const target of [self,teacher]) {const n=(await psql(`select variant_number from student_profiles where id='${target}'`)).trim();assert.equal((await call(student,'admin',{...deletion,studentId:target,confirmation:`УДАЛИТЬ ${n}`})).status,403)}
 assert.equal((await call(oberbeck,'studentA',undefined,{view:'lookup',number:String(number)})).status,403)
 const lookup=await call(oberbeck,'admin',undefined,{view:'lookup',number:String(number)})
 assert.equal(lookup.status,200);assert.equal(lookup.payload.parameters.height,.5);assert.deepEqual(Object.keys(lookup.payload),['parameters'])
 assert.equal((await call(oberbeck,'admin',undefined,{view:'lookup',number:'-1'})).status,400)
 assert.equal((await call(oberbeck,'admin',undefined,{view:'lookup',number:'999'})).status,404)
 failedLogin=true
 assert.equal((await call(student,'admin',deletion)).status,503)
 assert.equal((await psql(`select count(*) from student_profiles where id='${a}'`)).trim(),'1','External failure preserves local profile')
 failedLogin=false
 await psql(`update billing_orders set status='pending' where user_id='studentA'`)
 assert.equal((await call(student,'admin',deletion)).status,409)
 await psql(`update billing_orders set status='paid' where user_id='studentA'`)
 const removed=await call(student,'admin',deletion)
 assert.equal(removed.status,200,JSON.stringify(removed.payload));assert.deepEqual(removedLogins,['studentA']);assert.equal((await psql("select count(*) from revoked_clerk_accounts where user_id='studentA'")).trim(),'1')
 for(const table of ['oberbeck_variants','student_recovery_links','comments','billing_orders','billing_subscriptions','education_profiles'])assert.equal((await psql(`select count(*) from ${table}`)).trim(),'0',table+' cleaned')
 for(const table of ['class_students','assessment_attempts','assessment_participants','teacher_test_attempts'])assert.equal((await psql(`select count(*) from ${table}`)).trim(),'1',table+' unrelated student remains')
 assert.equal((await psql(`select count(*) from student_profiles where id='${b}'`)).trim(),'1')
 assert.equal((await call(student,'admin',deletion)).status,404,'Retry cannot delete another student')
 const gn=(await psql(`select variant_number from student_profiles where id='${guest}'`)).trim()
 assert.equal((await call(student,'admin',{action:'deleteStudent',studentId:guest,confirmation:`УДАЛИТЬ ${gn}`})).status,200,'Unlinked test profile can be removed')
 console.log('PASS: variant lookup authorization, exact stored parameters, missing numbers, admin-only deletion, confirmation, CSRF, self/staff protection, Clerk failure, pending payments, atomic associated data cleanup, guest cleanup, unrelated account preservation')
}finally{await psql('drop schema '+namespace+' cascade')}
