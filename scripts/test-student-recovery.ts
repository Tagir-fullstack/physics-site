import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import profileHandler from '../api/student-profile.js'
import labHandler from '../api/oberbeck.js'
import { databaseSql as sql } from '../api/_lib/db.js'
import { issueStudentRecovery, findStudentRecovery, redeemStudentRecovery } from '../api/_lib/studentRecovery.js'
import { linkStudentAccount } from '../api/_lib/studentProfile.js'
import type { StudentProfile } from '../src/lib/studentProfile.js'

type Payload = { profile?: StudentProfile | null; code?: string; variantCode?: string; variant?: { id: string; code: string; parameters: unknown }; error?: string }
async function call(handler: typeof profileHandler, method: string, body?: unknown, token?: string, origin = 'http://localhost:5173') {
  let status = 200, cookie = '', payload: Payload = {}
  const req = { method, body, query: {}, cookies: token ? { physez_student: token } : {}, headers: { host: 'localhost:5173', origin } } as unknown as VercelRequest
  const res = { setHeader: (key: string, value: string) => { if (key === 'Set-Cookie') cookie = value }, status: (value: number) => { status = value; return res }, json: (value: Payload) => { payload = value; return res } } as unknown as VercelResponse
  await handler(req, res)
  return { status, payload, cookie }
}
const fixtureGroup = `RECOVERY-TEST-${randomBytes(6).toString('hex')}`
let fixtureId = ''
try {
  const created = await call(profileHandler, 'POST', { action: 'create', student: { lastName: 'Тестовый', firstName: 'Восстановление', group: fixtureGroup } })
  assert.equal(created.status, 201)
  fixtureId = created.payload.profile!.id
  const oldToken = created.payload.code!
  const started = await call(labHandler, 'POST', { action: 'start' }, oldToken)
  assert.equal(started.status, 200)
  const variant = started.payload.variant!
  assert.equal((await call(labHandler, 'POST', { action: 'issueRecovery', variantId: variant.id }, oldToken)).status, 403, 'Guest cannot issue links')
  assert.equal((await call(labHandler, 'POST', { action: 'issueRecovery', variantId: variant.id })).status, 403, 'Anonymous user cannot issue links')
  const obCode = await call(profileHandler, 'POST', { action: 'recover', code: variant.code })
  assert.equal(obCode.status, 400)
  assert.ok(obCode.payload.error!.includes('номер варианта'))
  const first = await issueStudentRecovery(fixtureId, 'user_recovery_test')
  assert.ok(await findStudentRecovery(first.token))
  assert.equal((await call(profileHandler, 'GET', undefined, oldToken)).payload.profile!.id, fixtureId, 'Issuance must not invalidate existing access')
  const second = await issueStudentRecovery(fixtureId, 'user_recovery_test')
  assert.equal(await findStudentRecovery(first.token), null, 'New issuance revokes the previous unused link')
  assert.equal((await call(profileHandler, 'POST', { action: 'previewRecovery', token: first.token })).status, 410)
  assert.equal((await call(profileHandler, 'POST', { action: 'previewRecovery', token: second.token }, undefined, 'https://other.example')).status, 403)
  const wrong = second.token.slice(0, -1) + (second.token.endsWith('A') ? 'B' : 'A')
  assert.equal(await findStudentRecovery(wrong), null)
  for (let i = 0; i < 2; i++) {
    const preview = await call(profileHandler, 'POST', { action: 'previewRecovery', token: second.token })
    assert.equal(preview.status, 200)
    assert.equal(preview.payload.profile!.id, fixtureId)
    assert.equal(preview.payload.variantCode, variant.code)
    assert.ok(!('recoveryHash' in preview.payload.profile!))
  }
  const attempts = await Promise.all([call(profileHandler, 'POST', { action: 'redeemRecovery', token: second.token }), call(profileHandler, 'POST', { action: 'redeemRecovery', token: second.token })])
  assert.deepEqual(attempts.map(r => r.status).sort(), [200, 410], 'Only one simultaneous redemption may succeed')
  const restored = attempts.find(r => r.status === 200)!
  assert.ok(restored.cookie.includes('HttpOnly') && restored.cookie.includes('SameSite=Lax'))
  const newToken = restored.cookie.split(';')[0].slice('physez_student='.length)
  assert.equal((await call(profileHandler, 'GET', undefined, oldToken)).payload.profile, null, 'Old private code is rotated only on redemption')
  assert.equal((await call(profileHandler, 'POST', { action: 'recover', code: oldToken })).status, 401)
  assert.equal((await call(profileHandler, 'GET', undefined, newToken)).payload.profile!.id, fixtureId)
  assert.deepEqual((await call(labHandler, 'GET', undefined, newToken)).payload.variant, variant, 'Variant id, code and every parameter must remain unchanged')
  assert.equal((await call(profileHandler, 'POST', { action: 'redeemRecovery', token: second.token })).status, 410, 'No replay')
  const expired = await issueStudentRecovery(fixtureId, 'user_recovery_test')
  await sql`update student_recovery_links set expires_at = now() - interval '1 second' where id = ${expired.token.split('.')[0]}::uuid and student_id = ${fixtureId}::uuid`
  assert.equal(await findStudentRecovery(expired.token), null)
  assert.equal((await call(profileHandler, 'POST', { action: 'redeemRecovery', token: expired.token })).status, 410)
  const clerkId = `user_recovery_test_${randomBytes(6).toString('hex')}`
  await linkStudentAccount(fixtureId, clerkId)
  const linkedRecovery = await issueStudentRecovery(fixtureId, 'user_recovery_test')
  assert.equal(await redeemStudentRecovery(linkedRecovery.token, `${clerkId}_different`), null, 'Wrong signed-in account cannot redeem')
  assert.ok(await findStudentRecovery(linkedRecovery.token), 'Wrong-account attempt must not consume the link')
  const linkedRestored = await redeemStudentRecovery(linkedRecovery.token, clerkId)
  assert.equal(linkedRestored!.studentId, fixtureId)
  const [linked] = await sql`select clerk_id from student_profiles where id = ${fixtureId}::uuid and student_group = ${fixtureGroup}`
  assert.equal(linked.clerk_id, clerkId, 'Recovery must never rebind the Google account')
  assert.deepEqual((await call(labHandler, 'GET', undefined, linkedRestored!.sessionToken)).payload.variant, variant)
  const [stored] = await sql`select token_hash, issued_by from student_recovery_links where id = ${linkedRecovery.token.split('.')[0]}::uuid and student_id = ${fixtureId}::uuid`
  assert.equal(stored.issued_by, 'user_recovery_test')
  assert.equal(stored.token_hash.length, 64)
  assert.notEqual(stored.token_hash, linkedRecovery.token.split('.')[1], 'Only a hash is stored')
  console.log('PASS: admin-only issuance API, OB-code guidance, revocation, read-only preview, CSRF, wrong secret, atomic single use, expiry, session rotation, Google binding and full variant preservation')
} finally {
  if (fixtureId) await sql.transaction([
    sql`delete from oberbeck_variants where student_id = ${fixtureId}::uuid and exists (select 1 from student_profiles where id = ${fixtureId}::uuid and student_group = ${fixtureGroup})`,
    sql`delete from student_profiles where id = ${fixtureId}::uuid and student_group = ${fixtureGroup}`,
  ])
  console.log('Removed only this run’s guarded test fixture and its recovery links; no existing student data changed.')
}
