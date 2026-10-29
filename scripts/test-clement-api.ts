import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../api/student-profile.js'
import { databaseSql as sql } from '../api/_lib/db.js'
import { hash } from '../api/_lib/studentProfile.js'
import { clementAccess } from '../api/_lib/clementLab.js'
const id = randomUUID(), secret = randomBytes(24).toString('base64url')
async function call(query: Record<string, string>, token?: string, method = 'GET') {
  let status = 200, payload: Record<string, unknown> = {}
  const req = { method, query: { lab: 'clement-desormes', ...query }, cookies: token ? { physez_student: token } : {}, headers: { host: 'localhost:5173', origin: 'http://localhost:5173' } } as unknown as VercelRequest
  const res = { setHeader() {}, status(value: number) { status = value; return res }, json(value: Record<string, unknown>) { payload = value; return res } } as unknown as VercelResponse
  await handler(req, res)
  return { status, payload }
}
try {
  assert.deepEqual(clementAccess(null), { canMonitor: false, canUsePro: false })
  const basic = { userId: 'fixture_clement_basic', email: '', isPremium: false, accessRole: 'user' as const }
  assert.deepEqual(clementAccess(basic), { canMonitor: false, canUsePro: false })
  assert.deepEqual(clementAccess({ ...basic, isPremium: true }), { canMonitor: false, canUsePro: true })
  assert.deepEqual(clementAccess({ ...basic, accessRole: 'admin' }), { canMonitor: true, canUsePro: true })
  assert.equal((await call({})).status, 401)
  assert.equal((await call({ view: 'list' })).status, 403)
  assert.equal((await call({ view: 'expected', id })).status, 403)
  assert.equal((await call({}, undefined, 'POST')).status, 405)
  await sql`insert into student_profiles(id,last_name,first_name,student_group,identity_key,recovery_hash) values(${id}::uuid,'Проверка Клемана','Тестовый','B062',${'clement-api-fixture-' + id},${hash(secret)})`
  const first = await call({}, `${id}.${secret}`)
  assert.equal(first.status, 200)
  assert.equal((first.payload.profile as { id: string }).id, id)
  assert.equal(first.payload.canMonitor, false)
  assert.equal(first.payload.canUsePro, false)
  assert.ok(!('expected' in first.payload)); assert.ok(!('recoveryHash' in first.payload))
  const spoofed = await call({ number: '999999', id: randomUUID(), isPremium: 'true', canUsePro: 'true' }, `${id}.${secret}`)
  assert.deepEqual(spoofed.payload.variant, first.payload.variant, 'Browser-supplied numbers and IDs cannot select another variant')
  assert.equal(spoofed.payload.canUsePro, false, 'Client flags cannot grant PRO')
  assert.equal((await call({ view: 'list' }, `${id}.${secret}`)).status, 403)
  assert.equal((await call({ view: 'expected', id }, `${id}.${secret}`)).status, 403)
  assert.equal((await call({}, `${id}.${randomBytes(24).toString('base64url')}`)).status, 401)
  await sql`update student_profiles set first_name='Изменённый' where id=${id}::uuid and identity_key=${'clement-api-fixture-' + id}`
  assert.deepEqual((await call({}, `${id}.${secret}`)).payload.variant, first.payload.variant, 'Editing a name does not change the apparatus')
  console.log('PASS: private profile access, guest/participant admin guards, no spoofed variant selection, stable conditions after name edit, no expected-answer or recovery-secret exposure')
} finally {
  await sql`delete from student_profiles where id=${id}::uuid and identity_key=${'clement-api-fixture-' + id}`
  console.log('Removed only the isolated Clement API fixture.')
}
