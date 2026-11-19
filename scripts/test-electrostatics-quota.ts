import assert from 'node:assert/strict'
import { randomUUID,createHash } from 'node:crypto'
import { databaseSql as sql } from '../api/_lib/db.js'
import { consumeElectroQuota } from '../api/_lib/electrostaticsInstrument.js'
const identity=`instrument-quota-test:${randomUUID()}`
const key=createHash('sha256').update(identity).digest('hex')
try {
  // Seed one isolated quota row; no existing account quota is touched.
  await sql`insert into electrostatics_instrument_quotas(identity_hash,tokens,updated_at,day,measurements) values (${key},12,now()+interval '1 hour',(now() at time zone 'UTC')::date,0)`
  // Each accepted update sets its timestamp, so prefill 4999 points to independently
  // prove the shared daily ceiling with concurrent calls (one winner).
  await sql`update electrostatics_instrument_quotas set measurements=4999 where identity_hash=${key}`
  const results=await Promise.all(Array.from({length:20},()=>consumeElectroQuota(identity,1)))
  assert.equal(results.filter(Boolean).length,1,'Only one concurrent request can spend the final daily measurement')
  assert.equal(await consumeElectroQuota(identity,1),false)
  await sql`update electrostatics_instrument_quotas set tokens=0,updated_at=now()+interval '1 hour',measurements=0 where identity_hash=${key}`
  assert.equal(await consumeElectroQuota(identity,1),false,'No burst tokens available')
  await sql`update electrostatics_instrument_quotas set tokens=0,updated_at=now()-interval '1 minute',day=(now() at time zone 'UTC')::date-1,measurements=5000 where identity_hash=${key}`
  assert.equal(await consumeElectroQuota(identity,200),true,'Tokens refill and daily budget resets')
  const [row]=await sql`select tokens,measurements from electrostatics_instrument_quotas where identity_hash=${key}`
  assert.equal(row.measurements,200);assert.ok(row.tokens>=0&&row.tokens<=12)
  console.log('PASS: real PostgreSQL atomic daily limit under 20 concurrent requests, burst rejection, refill, daily reset and batched measurement cost')
}finally{await sql`delete from electrostatics_instrument_quotas where identity_hash=${key}`}
