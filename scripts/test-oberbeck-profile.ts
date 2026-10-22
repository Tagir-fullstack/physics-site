import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import profileHandler from '../api/student-profile.js'
import labHandler from '../api/oberbeck.js'
import { databaseSql as sql } from '../api/_lib/db.js'
import { currentStudent, linkStudentAccount, publicProfile } from '../api/_lib/studentProfile.js'
import { variantFingerprint } from '../src/lib/oberbeckVariant.js'
import type { OberbeckVariant } from '../src/lib/oberbeckVariant.js'
type Payload = { profile?: { id: string; firstName: string; variantNumber: number }; code?: string; variant?: { id: string; code: string; parameters: OberbeckVariant }; error?: string }
const fixtureGroup = `OB-TEST-${randomBytes(8).toString('hex')}`
const fixtureIds: string[] = []
async function call(handler: typeof profileHandler, method: string, body?: unknown, token?: string, query: Record<string, string> = {}, origin = 'http://localhost:5173') {
  const headers = new Map<string, unknown>(); let status = 200; let result: Payload = {}
  const req = { method, body, query, cookies: token ? { physez_student: token } : {}, headers: { host: 'localhost:5173', origin } } as unknown as VercelRequest
  const res = { setHeader: (key: string, value: unknown) => headers.set(key, value), status: (value: number) => { status = value; return res }, json: (value: Payload) => { result = value; return res } } as unknown as VercelResponse
  await handler(req, res)
  return { status, body: result, cookie: String(headers.get('Set-Cookie') ?? '') }
}
try {
  assert.equal((await call(profileHandler, 'GET')).body.profile, null)
  assert.equal((await call(labHandler, 'POST', { action: 'start' })).status, 401)
  const identities = [0, 1].map(n => ({ firstName: n ? 'Второй' : 'Первый', lastName: 'Тестовый', group: fixtureGroup }))
  const created = await call(profileHandler, 'POST', { action: 'create', student: identities[0] })
  assert.equal(created.status, 201); fixtureIds.push(created.body.profile!.id)
  assert.ok(created.body.profile!.variantNumber > 0)
  const token = created.body.code!
  assert.ok(created.cookie.includes('HttpOnly') && created.cookie.includes('SameSite=Lax'))
  assert.ok(!JSON.stringify(created.body.profile).includes('recoveryHash'))
  assert.equal((await call(profileHandler, 'POST', { action: 'create', student: identities[0] })).status, 409)
  const [a, b] = await Promise.all([call(labHandler, 'POST', { action: 'start' }, token), call(labHandler, 'POST', { action: 'start' }, token)])
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(a.body.variant!.id, b.body.variant!.id)
  assert.ok(!('expected' in a.body), 'Student response must not include teacher answers')
  const modified = await call(profileHandler, 'POST', { action: 'update', student: { ...identities[0], firstName: 'Исправленный' } }, token)
  assert.equal(modified.body.profile!.id, created.body.profile!.id)
  assert.equal(modified.body.profile!.variantNumber, created.body.profile!.variantNumber)
  assert.equal((await call(labHandler, 'GET', undefined, token)).body.variant!.id, a.body.variant!.id)
  const restored = await call(profileHandler, 'POST', { action: 'recover', code: token })
  assert.equal(restored.status, 200); assert.equal(restored.body.profile!.firstName, 'Исправленный')
  assert.equal(restored.body.profile!.variantNumber, created.body.profile!.variantNumber)
  const wrongToken = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`
  assert.equal((await call(profileHandler, 'POST', { action: 'recover', code: wrongToken })).status, 401)
  assert.equal((await call(profileHandler, 'POST', { action: 'update', student: identities[0] }, token, {}, 'https://untrusted.example')).status, 403)
  assert.equal((await call(labHandler, 'GET', undefined, token, { view: 'list' })).status, 403)
  assert.equal((await call(labHandler, 'GET', undefined, token, { view: 'expected', id: a.body.variant!.id })).status, 403)
  const second = await call(profileHandler, 'POST', { action: 'create', student: identities[1] }); assert.equal(second.status, 201); fixtureIds.push(second.body.profile!.id)
  assert.notEqual(second.body.profile!.variantNumber, created.body.profile!.variantNumber)
  const secondVariant = await call(labHandler, 'POST', { action: 'start' }, second.body.code!)
  assert.notEqual(variantFingerprint(secondVariant.body.variant!.parameters), variantFingerprint(a.body.variant!.parameters))
  assert.equal((await call(profileHandler, 'GET', undefined, token)).body.profile!.firstName, 'Исправленный')
  const clerkId = `user_test_${fixtureGroup}`
  const linked = await linkStudentAccount(created.body.profile!.id, clerkId)
  assert.ok(linked); assert.equal(publicProfile(linked).accountLinked, true)
  const resolved = await currentStudent({ cookies: {}, headers: {} } as unknown as VercelRequest, { userId: clerkId, email: '', isPremium: false })
  assert.equal(resolved!.id, created.body.profile!.id, 'Authenticated account should resolve the same profile without a cookie')
  assert.equal((await call(labHandler, 'GET', undefined, token)).body.variant!.id, a.body.variant!.id, 'Account linking must preserve the variant')
  assert.equal(await linkStudentAccount(created.body.profile!.id, `${clerkId}_other`), null, 'A profile must not be rebound to another account')
  await assert.rejects(linkStudentAccount(second.body.profile!.id, clerkId), 'An account must not own two student profiles')
  assert.equal(await currentStudent({ cookies: { physez_student: token }, headers: {} } as unknown as VercelRequest, { userId: `${clerkId}_other`, email: '', isPremium: false }), null, 'An unrelated signed-in account must not adopt a different linked cookie profile')
  assert.equal((await call(profileHandler, 'POST', { action: 'linkAccount' }, token)).status, 401, 'Linking requires a verified account session')
  const loggedOut = await call(profileHandler, 'POST', { action: 'logout' }, token)
  assert.equal(loggedOut.status, 200); assert.ok(loggedOut.cookie.includes('Max-Age=0'))
  assert.equal((await call(profileHandler, 'POST', { action: 'recover', code: token })).status, 200, 'Logout must not delete the stored profile')
  console.log('PASS: private persistent profiles, duplicate identity protection, concurrent idempotent variant assignment, profile correction, recovery, unique variants, CSRF and teacher-answer access control')
} finally {
  // Delete only exact IDs created by this test, additionally guarded by its unique group.
  for (const id of fixtureIds) await sql.transaction([
    sql`delete from oberbeck_variants where student_id = ${id}::uuid and exists (select 1 from student_profiles where id = ${id}::uuid and student_group = ${fixtureGroup})`,
    sql`delete from student_profiles where id = ${id}::uuid and student_group = ${fixtureGroup}`,
  ])
  console.log(`Cleaned up ${fixtureIds.length} test-only profiles and variants; no existing student data changed`)
}
