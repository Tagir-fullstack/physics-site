import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { databaseSql } from '../api/_lib/db'
import { createElectroStore } from '../api/_lib/electrostaticsStore'
import { electroVariant } from '../src/lib/electrostatics'
import { emptyElectroNotebook } from '../src/lib/electrostaticsNotebook'
// Explicit local test instance only. Never read DATABASE_URL for psql.
const namespace=`electro_test_${randomUUID().replaceAll('-','')}`
const testPort=process.env.PHYSEZ_TEST_PG_PORT || '55439'
if (!/^\d{4,5}$/.test(testPort)) throw Error('Invalid local test port')
async function psql(input:string):Promise<string>{return new Promise((resolve,reject)=>{
  const env: NodeJS.ProcessEnv={...process.env,PGOPTIONS:'',PGDATABASE:'postgres',PGUSER:process.env.USER||'tagir'};delete env.PGSERVICE
  const child=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-h','/private/tmp','-p',testPort,'-d','postgres'],{env})
  let out='',error='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>error+=v);child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(Error(error)));child.stdin.end(input)
})}
const literal=(v:unknown)=>v==null?'NULL':typeof v==='boolean'||typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`
const adapter=((strings:TemplateStringsArray,...values:unknown[])=>{
  const statement=strings.reduce((out,part,i)=>out+(i?literal(values[i-1]):'')+part,'')
  const query=/^\s*select/i.test(statement)?`select coalesce(jsonb_agg(t),'[]') from (${statement}) t;`:/\breturning\b/i.test(statement)?`with t as (${statement}) select coalesce(jsonb_agg(t),'[]') from t;`:`${statement};select '[]';`
  return psql(`begin;set local search_path to ${namespace};${query}commit;`).then(text=>JSON.parse(text.trim()))
}) as unknown as typeof databaseSql
await psql(`create schema ${namespace};set search_path to ${namespace};create table student_profiles(id uuid primary key,clerk_id text,variant_number integer,last_name text,first_name text,student_group text,merged_into uuid);create table education_profiles(user_id text,role text,teacher_user_id text);`)
try{
  const migration=await readFile(new URL('./sql/electrostatics-submissions.sql',import.meta.url),'utf8')
  await psql(`set search_path to ${namespace};${migration}${migration}`)
  const store=createElectroStore(adapter),a=randomUUID(),b=randomUUID(),c=randomUUID(),id=randomUUID(),second=randomUUID()
  await adapter`insert into student_profiles values(${a}::uuid,'account-a',24,'Иванов','Иван','B062',null),(${b}::uuid,'account-b',25,'Петров','Пётр','B063',null),(${c}::uuid,'account-c',26,'Сидоров','Сидор','B062',null)`
  await adapter`insert into education_profiles values('account-a','student','teacher-a'),('account-b','student','teacher-b'),('account-c','student','teacher-a')`
  const admin={teacherId:null,reviewerId:'admin'},ta={teacherId:'teacher-a',reviewerId:'teacher-a'},tb={teacherId:'teacher-b',reviewerId:'teacher-b'}
  assert.equal((await store.expectedStudent(admin,c))?.variantNumber,26,'Expected field available before any submission')
  assert.equal((await store.expectedStudent(ta,c))?.id,c)
  assert.equal(await store.expectedStudent(tb,c),null,'Expected fields respect teacher isolation')
  const notebook=emptyElectroNotebook();notebook.conclusion='Первый вывод'
  const first=await store.save(id,a,electroVariant(24),notebook,'a'.repeat(64))
  assert.equal(first.status,'submitted')
  assert.equal((await store.save(id,a,electroVariant(24),notebook,'a'.repeat(64))).id,id)
  assert.equal((await adapter`select count(*)::int as n from electrostatics_submissions`)[0].n,1)
  await assert.rejects(store.save(id,b,electroVariant(25),notebook,'a'.repeat(64)),/SNAPSHOT_CONFLICT/)
  await assert.rejects(store.save(id,a,electroVariant(24),notebook,'b'.repeat(64)),/SNAPSHOT_CONFLICT/)
  const listing=await store.list(admin,0,'','','')
  assert.equal(listing.students.length,3)
  assert.ok(listing.students.every(s=>!('notebook' in s)&&!('parameters' in s)), 'The list contains no full notebook or field data')
  assert.equal((await store.list(ta,0,'','','')).students.length,2)
  assert.equal((await store.list(tb,0,'','','')).students.length,1)
  assert.equal((await store.list(ta,0,'','B062','not-started')).students.length,1)
  assert.equal((await store.list(admin,0,"' OR 1=1 --",'','')).students.length,0)
  assert.equal(await store.detail(tb,id),null)
  assert.equal(await store.review(tb,id,0,'accepted','Чужая работа'),null)
  const reviewed=await store.review(ta,id,0,'accepted','Хорошо')
  assert.equal(reviewed?.reviewVersion,1)
  assert.equal(await store.review(admin,id,0,'revision','Устаревшая проверка'),null)
  assert.equal((await store.save(id,a,electroVariant(24),notebook,'a'.repeat(64))).status,'accepted','Retry cannot erase review')
  notebook.conclusion='Новая версия'
  await store.save(second,a,electroVariant(24),notebook,'c'.repeat(64))
  assert.equal((await store.mine(a))?.id,second)
  assert.equal((await store.detail(admin,id))?.submission.notebook.conclusion,'Первый вывод')
  assert.equal((await store.detail(admin,second))?.history.length,2)
  assert.equal((await store.list(admin,0,'Иванов','','submitted')).students.length,1)
  const alias=randomUUID(), aliasWork=randomUUID()
  await adapter`insert into student_profiles values(${alias}::uuid,'old-account-a',27,'Старый','Профиль','B062',${a}::uuid)`
  await store.save(aliasWork,alias,electroVariant(27),notebook,'d'.repeat(64))
  assert.equal((await store.mine(a))?.id,aliasWork,'Merged history is visible from canonical profile')
  assert.equal((await store.detail(ta,aliasWork))?.student.id,a)
  assert.equal(await store.detail(tb,aliasWork),null)
  assert.ok(await store.review(ta,aliasWork,0,'revision','Дополните вывод'))
  await adapter`delete from student_profiles where id=${alias}::uuid`
  await adapter`delete from student_profiles where id=${a}::uuid`
  assert.equal((await adapter`select count(*)::int as n from electrostatics_submissions`)[0].n,0,'Student deletion cascades')
  const sortA=randomUUID(),sortB=randomUUID()
  await adapter`insert into student_profiles values(${sortA}::uuid,'sort-a',100,'Ааа','Первый','SORT',null),(${sortB}::uuid,'sort-b',2,'Яяя','Второй','SORT',null)`
  assert.deepEqual((await store.list(admin,0,'','SORT','','variant','asc')).students.map(s=>s.variantNumber),[2,100])
  assert.deepEqual((await store.list(admin,0,'','SORT','','variant','desc')).students.map(s=>s.variantNumber),[100,2])
  assert.deepEqual((await store.list(admin,0,'','SORT','','name','asc')).students.map(s=>s.lastName),['Ааа','Яяя'])
  assert.deepEqual((await store.list(admin,0,'','SORT','','name','desc')).students.map(s=>s.lastName),['Яяя','Ааа'])
  await adapter`insert into student_profiles select md5('pagination-student-'||n)::uuid,'page-'||n,n,'Фамилия-'||lpad((56-n)::text,2,'0'),'Имя','PAGES',null from generate_series(1,55) n`
  assert.deepEqual((await store.list(admin,0,'','PAGES','','variant','asc')).students.map(s=>s.variantNumber),Array.from({length:50},(_,i)=>i+1))
  assert.deepEqual((await store.list(admin,1,'','PAGES','','variant','asc')).students.map(s=>s.variantNumber),[51,52,53,54,55])
  assert.deepEqual((await store.list(admin,1,'','PAGES','','variant','desc')).students.map(s=>s.variantNumber),[5,4,3,2,1])
  assert.equal((await store.list(ta,0,'','PAGES','','variant','desc')).students.length,0)
  console.log('PASS: idempotent migration/submission, immutable snapshots, history, teacher isolation, status filters, numeric/name sorting before pagination, review races and student deletion cascade (local PostgreSQL)')
}finally{await psql(`drop schema ${namespace} cascade;`)}
