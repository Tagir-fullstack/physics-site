// Integration tests use ONLY the explicitly named local PostgreSQL socket.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import {mergeTeacherProfiles} from './lib/merge-teacher-profiles.mjs'
import { drizzle } from 'drizzle-orm/pg-proxy'
const exec = promisify(execFile)
const namespace = 'education_test_' + Date.now()
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
await mkdir('node_modules/.cache',{recursive:true})
await build({stdin:{contents:`export {handleEducation} from './api/_lib/education.ts';export {profileForAccount,linkStudentAccount,profileForToken,hash} from './api/_lib/studentProfile.ts';export {default as student} from './api/student-platform.ts';export {default as teacher} from './api/teacher-platform.ts'`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:'node_modules/.cache/education-test.cjs',plugins:[{name:'isolated-fixtures',setup(b){
 b.onResolve({filter:/\/(_lib\/)?db\.js$/},a=>a.importer.includes('/api/')?({path:'db',namespace:'fixture'}):undefined)
 b.onResolve({filter:/\/(_lib\/)?auth\.js$/},a=>a.importer.includes('/api/')?({path:'auth',namespace:'fixture'}):undefined)
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:process.cwd(),contents:a.path==='db'?`export const {db,databaseSql,hasDatabaseConfig}=globalThis.__educationFixture;export * as schema from '${process.cwd()}/api/_lib/schema.ts'`:`export async function getClerkUser(req){const id=req.headers.authorization?.replace('Bearer ','');return id?{userId:id,email:'',isPremium:id.startsWith('teacher')}:null}export function hasPremiumAccess(u){return u?.isPremium}export function isAdmin(u){return u?.userId==='admin'}`}))
}}]})
const {handleEducation,student,teacher,profileForAccount,linkStudentAccount,profileForToken,hash}=createRequire(import.meta.url)('../node_modules/.cache/education-test.cjs')
async function call(handler,id,body,query={},headers={}) {
 let status=200,payload
 const req={method:body?'POST':'GET',body:body||{},query,headers:{...(id?{authorization:'Bearer '+id}:{}),...headers},cookies:{}}
 const res={setHeader(){},status(n){status=n;return this},json(p){payload=p;return this}}
 await handler(req,res);return {status,payload}
}
const edu=(id,body,query={})=>call(handleEducation,id,body,{education:'profile',...query})
await psql('create schema '+namespace)
try {
 await psql(`
 create table teacher_classes(id uuid primary key default gen_random_uuid(),owner_clerk_id varchar(64) not null,name varchar(160) not null,subject varchar(120),invite_code varchar(12) unique not null,archived boolean not null default false,created_at timestamptz default now(),updated_at timestamptz default now());
 create table class_students(id uuid primary key default gen_random_uuid(),class_id uuid references teacher_classes(id),last_name varchar(60) not null,first_name varchar(60) not null,group_name varchar(40) not null,normalized_identity varchar(180) not null,join_token_hash varchar(64) unique not null,active boolean default true,joined_at timestamptz default now(),last_seen_at timestamptz default now(),unique(class_id,normalized_identity));
 create table teacher_tests(id uuid primary key default gen_random_uuid(),owner_clerk_id varchar(64) not null,title varchar(200) not null,description text,language varchar(8) default 'ru',status varchar(20) default 'draft',duration_minutes integer default 10,calculator_allowed boolean default false,shuffle_questions boolean default false,version integer default 1,source_filename varchar(255),created_at timestamptz default now(),updated_at timestamptz default now(),published_at timestamptz);
 create table test_questions(id uuid primary key default gen_random_uuid(),test_id uuid references teacher_tests(id),order_no integer,section text,difficulty text,kind text,prompt text,points integer,config jsonb);
 create table test_assignments(id uuid primary key default gen_random_uuid(),test_id uuid references teacher_tests(id),class_id uuid references teacher_classes(id),owner_clerk_id varchar(64),active boolean default true,opens_at timestamptz,closes_at timestamptz,created_at timestamptz default now(),unique(test_id,class_id));
 create table teacher_test_attempts(id uuid primary key default gen_random_uuid(),assignment_id uuid references test_assignments(id),student_id uuid references class_students(id),variant_code text,variant_data jsonb,answers jsonb,score integer,max_score integer,violations jsonb,started_at timestamptz default now(),expires_at timestamptz,submitted_at timestamptz,unique(assignment_id,student_id));
 `)
 await psql(await readFile('scripts/sql/education-profiles.sql','utf8'))
 await psql(await readFile('scripts/sql/teacher-verification.sql','utf8'))
 await psql(await readFile('scripts/sql/oberbeck-student-variants.sql','utf8'))
 await psql('alter table student_profiles add column clerk_id varchar(64) unique;alter table student_profiles add column variant_number serial unique not null')
 await psql(await readFile('scripts/sql/profile-merge.sql','utf8'))
 const details={role:'teacher',universityId:'satbayev',firstName:'Тагир',lastName:'Аймұрза',department:'Кафедра физики'}
 assert.equal((await edu('',details)).status,401)
 assert.equal((await edu('teacherA',details)).status,200)
 assert.equal((await edu('teacherB',{...details,universityId:'enu',firstName:'Коллега',lastName:'Преподаватель'})).status,200)
 assert.equal((await edu('',undefined,{education:'directory',universityId:'satbayev'})).payload.teachers.length,0,'Pending teacher is not in public directory')
 assert.equal((await call(teacher,'teacherA')).status,403,'PRO cannot bypass pending teacher approval')
 const review={action:'reviewTeacher',userId:'teacherA',status:'approved'}
 assert.equal((await edu('teacherA',review)).status,403,'Cannot approve oneself')
 assert.equal((await edu('admin',undefined,{education:'reviews'})).payload.requests.length,2,'Admin has paginated review queue')
 assert.equal((await edu('admin',review)).status,200)
 assert.equal((await edu('admin',review)).status,409,'Review decision is applied once')
 assert.equal((await edu('admin',{...review,userId:'teacherB'})).status,200)
 const directory=await edu('',undefined,{education:'directory',universityId:'satbayev'})
 assert.equal(directory.payload.teachers.length,1);assert.equal(directory.payload.teachers[0].id,'teacherA')
 const draft={role:'student',universityId:'satbayev',firstName:'Студент',lastName:'Тестовый',group:'B062',teacherId:'teacherA'}
 assert.equal((await edu('student1',{...draft,group:'ФИЗ-24'})).status,400,'Invalid OP rejected')
 assert.equal((await edu('student1',{...draft,teacherId:'teacherB'})).status,400,'Reject teacher of another university')
 assert.equal((await edu('student1',{...draft,teacherId:''})).status,400,'Teacher required when directory has teachers')
 assert.equal((await edu('student1',draft)).status,200)
 assert.equal((await edu('student1',draft)).status,200,'Retry must not duplicate enrollment')
 assert.equal((await psql('select count(*) from class_students')).trim(),'1')
 assert.equal((await edu('student1',details)).status,409,'Role cannot be changed through registration')
 assert.equal((await edu('student2',{...draft,universityId:'enu',teacherId:'teacherB'})).status,200)
 assert.equal((await edu('student3',{...draft,universityId:'other',institution:'Мой университет',teacherId:''})).status,200,'Other university without staff')
 const own=(await call(teacher,'teacherA')).payload
 const other=(await call(teacher,'teacherB')).payload
 assert.equal(own.classes.length,1);assert.equal(other.classes.length,1);assert.notEqual(own.classes[0].id,other.classes[0].id)
 const classes=[own.classes[0].id,other.classes[0].id]
 const assignmentIds=[]
 for(let i=0;i<2;i++) {
  const testId=(await psql(`insert into teacher_tests(owner_clerk_id,title,status) values('teacher${i?'B':'A'}','Тест ${i+1}','published') returning id`)).trim()
  await psql(`insert into test_questions(test_id,order_no,kind,prompt,points,config) values('${testId}',1,'number','2+3?',1,'{"answer":5,"tolerance":0}')`)
  const assigned=await call(teacher,'teacher'+(i?'B':'A'),{action:'assign',testId,classId:classes[i]})
  assert.equal(assigned.status,200);assignmentIds.push(assigned.payload.id)
 }
 const list=await call(student,'student1')
 assert.equal(list.payload.assignments.length,1);assert.equal(list.payload.assignments[0].id,assignmentIds[0])
 assert.equal((await call(student,'student1',{action:'start',assignmentId:assignmentIds[1]})).status,404,'Cannot start another teacher test')
 const started=await call(student,'student1',{action:'start',assignmentId:assignmentIds[0]})
 assert.equal(started.status,200)
 assert.equal(started.payload.attempt.questions[0].config.answer,undefined,'Correct answers not exposed')
 const attemptId=started.payload.attempt.id,questionId=started.payload.attempt.questions[0].id
 assert.equal((await call(student,'student2',{action:'submit',attemptId,answers:{[questionId]:5}})).status,404,'Cannot submit another student attempt')
 const submitted=await call(student,'student1',{action:'submit',attemptId,answers:{[questionId]:5}})
 assert.equal(submitted.payload.score,1)
 assert.equal((await call(teacher,'teacherB',undefined,{attemptId})).status,404,'Other teacher cannot open results')
 const monitor=await call(teacher,'teacherA',undefined,{attemptId})
 assert.equal(monitor.status,200);assert.equal(monitor.payload.attempt.score,1)
 assert.equal((await call(teacher,'student1')).status,403,'Student role does not grant PRO')
 assert.equal((await edu('teacherStudent',draft)).status,200)
 assert.equal((await call(teacher,'teacherStudent')).status,403,'Even PRO cannot bypass registered student role')
 assert.equal((await call(student,'',{action:'join',inviteCode:own.classes[0].inviteCode,lastName:'Гостевой',firstName:'Студент',group:'B063'})).status,401,'New class enrollment requires account')
 const guest=await call(student,'inviteStudent',{action:'join',inviteCode:own.classes[0].inviteCode,lastName:'Гостевой',firstName:'Студент',group:'B063'})
 assert.equal(guest.status,200)
 const guestList=await call(student,'',undefined,{}, {'x-student-token':guest.payload.token})
 assert.equal(guestList.status,200);assert.equal(guestList.payload.assignments[0].id,assignmentIds[0])

 assert.equal((await edu('teacherC',{...details,firstName:'Новый'})).status,200)
 assert.equal((await edu('admin',{action:'reviewTeacher',userId:'teacherC',status:'rejected'})).status,400,'Rejection requires reason')
 assert.equal((await edu('admin',{action:'reviewTeacher',userId:'teacherC',status:'rejected',note:'Проверьте принадлежность к кафедре'})).status,200)
 assert.equal((await edu('',undefined,{education:'directory',universityId:'satbayev'})).payload.teachers.some(t=>t.id==='teacherC'),false)
 assert.equal((await edu('teacherA',{...details,department:'Другая кафедра'})).status,200)
 assert.equal((await call(teacher,'teacherA')).status,403,'Changed verified details require re-approval')
 // A deliberate owner merge shares the number and teaching workspace, never guesses by name.
 const institution='Merge Fixture University'
 for(const id of ['teacherPrimary','teacherSecondary']) {
  assert.equal((await edu(id,{...details,universityId:'other',institution,firstName:id==='teacherPrimary'?'Основной':'Второй'})).status,200)
  assert.equal((await edu('admin',{action:'reviewTeacher',userId:id,status:'approved'})).status,200)
 }
 for(const [id,teacherId] of [['mergeStudentA','teacherPrimary'],['mergeStudentB','teacherSecondary']])assert.equal((await edu(id,{...draft,universityId:'other',institution,teacherId})).status,200)
 const primaryWork=(await call(teacher,'teacherPrimary')).payload,secondaryWork=(await call(teacher,'teacherSecondary')).payload
 const secondaryClass=secondaryWork.classes[0].id,primaryClass=primaryWork.classes[0].id
 const mergeTest=(await psql(`insert into teacher_tests(owner_clerk_id,title,status) values('teacherSecondary','Сохранённая работа','published') returning id`)).trim()
 const mergeAssignment=(await psql(`insert into test_assignments(test_id,class_id,owner_clerk_id) values('${mergeTest}','${secondaryClass}','teacherSecondary') returning id`)).trim()
 await psql(`insert into teacher_test_attempts(assignment_id,student_id,variant_code,variant_data,score) select '${mergeAssignment}',id,'KEEP-VARIANT','{}',7 from class_students where class_id='${secondaryClass}'`)
 const addProfile=async(clerk,last,secret)=>{const id=(await psql(`insert into student_profiles(clerk_id,last_name,first_name,student_group,identity_key,recovery_hash) values('${clerk}','${last}','Тестовый','B062','${clerk}',${literal(hash(secret))}) returning id`)).trim();return (await sqlTag`select * from student_profiles where id=${id}::uuid`)[0]}
 const first=await addProfile('teacherPrimary','Основной','a'.repeat(32)),second=await addProfile('teacherSecondary','Второй','b'.repeat(32))
 for(const p of [first,second])await psql(`insert into oberbeck_variants(student_id,code,fingerprint,parameters) values('${p.id}','OB-${p.variant_number}','finger-${p.id}','{"version":1,"height":0.5,"base":0.1,"small":0.04,"large":0.09,"radii":[0.01,0.02]}')`)
 assert.equal((await mergeTeacherProfiles(sqlTag,first.variant_number,second.variant_number)).apply,false)
 const merged=await mergeTeacherProfiles(sqlTag,first.variant_number,second.variant_number,{apply:true})
 assert.equal(merged.students,2);assert.equal(merged.attempts,1);assert.equal(merged.variants,2)
 assert.equal((await profileForAccount('teacherPrimary')).variantNumber,first.variant_number)
 assert.equal((await profileForAccount('teacherSecondary')).id,first.id,'Second login sees canonical profile and number')
 assert.equal((await linkStudentAccount(first.id,'teacherSecondary')).id,first.id)
 assert.equal(await linkStudentAccount(second.id,'teacherSecondary'),null,'Cannot re-link alias to its archived profile')
 assert.equal((await profileForToken(second.id+'.'+'b'.repeat(32))).id,first.id,'Old private cookie resolves to canonical profile')
 const dir=(await edu('',undefined,{education:'directory',universityId:'other',institution})).payload.teachers
 assert.equal(dir.length,1);assert.equal(dir[0].id,'teacherPrimary')
 const workspace=(await call(teacher,'teacherSecondary')).payload
 assert.equal(workspace.classes.length,2);assert.equal(workspace.tests[0].id,mergeTest,'Both logins share tests')
 assert.equal((await psql(`select count(*) from education_profiles where teacher_user_id='teacherPrimary'`)).trim(),'2')
 assert.equal((await psql(`select score from teacher_test_attempts where assignment_id='${mergeAssignment}'`)).trim(),'7','Answers and score unchanged')
 assert.equal((await psql(`select count(*) from oberbeck_variants where student_id in ('${first.id}','${second.id}')`)).trim(),'2','Historical apparatus preserved')
 assert.equal((await psql(`select default_class_id from education_profiles where user_id='teacherPrimary'`)).trim(),primaryClass)
 assert.equal((await mergeTeacherProfiles(sqlTag,first.variant_number,second.variant_number,{apply:true})).alreadyMerged,true,'Merge is idempotent')
 assert.equal((await call(teacher,'teacherB',undefined,{testId:mergeTest})).status,404,'Other teacher cannot access merged workspace')
 console.log('PASS: deliberate teacher merge, one directory entry, both logins share original profile/number, retained private cookie, all class/test links, unchanged historical variants/answers/scores, idempotent retry and cross-account isolation')
 console.log('PASS: teacher review queue, self-approval rejection, pending/rejected teacher isolation, mandatory reasons, re-verification, allowed OPs, registration, 2 universities/teachers, directory privacy, retries, other university, server enrollment, assigned tests, cross-account isolation, completion and owner monitoring')
} finally {await psql('drop schema '+namespace+' cascade')}
