import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createAssessmentHandler } from '../api/mechanics-assessment.js'
import midterm from '../api/midterm-assessment.js'
import { handleSessionRequest, finalizeExpiredSessionAttempts } from '../api/_lib/assessmentSessions.js'
import { databaseSql as sql } from '../api/_lib/db.js'
import { createVariant, variantFingerprint, createVariantCode, gradeVariant, type StudentIdentity } from '../api/_lib/mechanicsAssessment.js'

// A separate test ID and period: never alter any real student's work or schedule.
const key = `session-test-${randomBytes(6).toString('hex')}`
const testId = key as 'mechanics'
const publicHandler = createAssessmentHandler(testId)
const admin = { userId: 'fixture-admin', email: '', isPremium: false, accessRole: 'admin' as const }
const engine = { create: createVariant, fingerprint: variantFingerprint, code: createVariantCode, grade: gradeVariant, scale: 1, student: (v: unknown) => v as StudentIdentity, respond: async () => ({}) }
type Browser = { cookies: Record<string, string> }
async function call(browser: Browser, body?: Record<string, unknown>, query = {}, teacher = false, handler = publicHandler, origin = 'http://localhost:5173') {
  let status = 200; let payload: Record<string, unknown> = {}
  const req = { method: body ? 'POST' : 'GET', body, query, cookies: { ...browser.cookies }, headers: { host: 'localhost:5173', origin, ...(teacher ? { authorization: 'Bearer fixture-only-helper' } : {}) } } as unknown as VercelRequest
  const res = { setHeader: (name: string, value: string) => { if (name.toLowerCase() === 'set-cookie') { const [name, token] = value.split(';')[0].split('='); browser.cookies[name] = token } }, status: (s: number) => { status = s; return res }, json: (p: Record<string, unknown>) => { payload = p; return res } } as unknown as VercelResponse
  // Only helper tests inject an already-verified user. Public tests always use real auth middleware.
  if (teacher) assert.equal(await handleSessionRequest(req, res, body ?? {}, testId, admin, engine), true)
  else await handler(req, res)
  return { status, payload }
}
const teacher: Browser = { cookies: {} }, one: Browser = { cookies: {} }, two: Browser = { cookies: {} }, late: Browser = { cookies: {} }, rejected: Browser = { cookies: {} }
const student = (name: string, group = 'B076') => ({ lastName: 'Проверочный', firstName: name, group })
const adminCall = (body: Record<string, unknown>) => call(teacher, { ...body, period: key }, {}, true)
try {
  await sql`insert into assessment_periods(key,test_id,name,active,max_points_tenths) values(${key},${key},'Fixture only',true,20)`
  assert.equal((await call(one, undefined, { view: 'entry' }, false, midterm)).payload.mode, 'session')
  assert.equal((await call(one, { action: 'start', student: student('Первый'), practice: true, isAdmin: true }, {}, false, midterm)).status, 403)
  assert.equal((await call(one, { action: 'createSession', period: key })).status, 403)
  const created = await adminCall({ action: 'createSession', name: 'Mixed OP fixture', opensAt: new Date(Date.now() - 60_000).toISOString(), startsAt: new Date(Date.now() + 600_000).toISOString(), durationMinutes: 50 })
  assert.equal(created.status, 201)
  const sessionId = created.payload.id, code = created.payload.code
  assert.match(String(code), /^\d{6}$/)
  // Existing long codes keep working until the teacher explicitly replaces them.
  const compatibility = await adminCall({ action: 'createSession', name: 'Legacy code fixture', opensAt: new Date(Date.now() - 60_000).toISOString(), startsAt: new Date(Date.now() + 600_000).toISOString(), durationMinutes: 50 })
  assert.equal(compatibility.status, 201)
  const legacyCode = randomBytes(6).toString('hex').toUpperCase()
  await sql`update assessment_sessions set code=${legacyCode} where id=${compatibility.payload.id as string}::uuid and period_key=${key}`
  const oldBrowser: Browser = { cookies: {} }
  const legacyJoined = await call(oldBrowser, { action: 'joinSession', code: legacyCode, student: student('Старый') })
  assert.equal(legacyJoined.payload.phase, 'waiting')
  const simplified = await adminCall({ action: 'shortenSessionCode', sessionId: compatibility.payload.id })
  assert.equal(simplified.status, 200); assert.match(String(simplified.payload.code), /^\d{6}$/)
  assert.equal((await call(oldBrowser, undefined, { view: 'entry' })).payload.participantId, legacyJoined.payload.participantId)
  assert.equal((await call({ cookies: {} }, { action: 'joinSession', code: legacyCode, student: student('Новый') })).status, 404)
  assert.equal((await call({ cookies: {} }, { action: 'joinSession', code: simplified.payload.code, student: student('Новый') })).payload.phase, 'waiting')
  await adminCall({ action: 'endSession', sessionId: compatibility.payload.id })
  assert.equal((await adminCall({ action: 'updateEntryTime', sessionId, opensAt: 'not-a-date' })).status, 400)
  assert.equal((await adminCall({ action: 'updateEntryTime', sessionId, opensAt: new Date(Date.now() + 7200_000).toISOString() })).status, 409)
  const newEntry = new Date(Date.now() - 120_000).toISOString()
  assert.equal((await adminCall({ action: 'updateEntryTime', sessionId, opensAt: newEntry })).status, 200)
  const [updatedSession] = await sql`select opens_at,starts_at,ends_at from assessment_sessions where id=${sessionId as string}::uuid and period_key=${key}`
  assert.equal(new Date(updatedSession.opens_at).toISOString(), newEntry)
  assert.equal(new Date(updatedSession.ends_at).getTime() - new Date(updatedSession.starts_at).getTime(), 50 * 60_000)
  assert.equal((await call(one, { action: 'joinSession', code, student: student('Первый') }, {}, false, publicHandler, 'https://foreign.invalid')).status, 403)
  const joined = await call(one, { action: 'joinSession', code, student: student('Первый') })
  assert.equal(joined.payload.phase, 'waiting'); assert.ok(!('tasks' in joined.payload))
  assert.equal((await call(one, { action: 'start', student: student('Другой') })).payload.status, 'locked')
  assert.equal((await call(two, { action: 'joinSession', code, student: student('Второй', 'B062') })).payload.phase, 'waiting')
  const removed: Browser = { cookies: {} }
  const waitingRemoved = await call(removed, { action: 'joinSession', code, student: student('Удаляемый') })
  assert.equal((await call(removed, { action: 'revokeParticipant', sessionId, participantId: joined.payload.participantId })).status, 403)
  assert.equal((await adminCall({ action: 'revokeParticipant', sessionId, participantId: waitingRemoved.payload.participantId })).status, 200)
  assert.equal((await call(removed, undefined, { view: 'entry' })).payload.phase, 'rejected')
  assert.equal((await call(removed, { action: 'joinSession', code, student: student('Удаляемый') })).payload.phase, 'rejected')
  assert.equal((await call(removed, { action: 'start' })).payload.status, 'locked')
  assert.equal((await call({ cookies: {} }, { action: 'joinSession', code, student: student('Первый') })).status, 409)
  assert.equal((await adminCall({ action: 'startSession', sessionId })).status, 200)
  assert.equal((await adminCall({ action: 'shortenSessionCode', sessionId })).status, 409)
  assert.equal((await adminCall({ action: 'updateEntryTime', sessionId, opensAt: newEntry })).status, 409)
  const started = await call(one, { action: 'resume' }), other = await call(two, { action: 'resume' })
  assert.equal(started.payload.status, 'active'); assert.equal((started.payload.tasks as unknown[]).length, 3)
  assert.equal(started.payload.expiresAt, other.payload.expiresAt)
  assert.notEqual(started.payload.variantCode, other.payload.variantCode)
  assert.ok(!('review' in started.payload)); assert.ok(!JSON.stringify(started.payload).includes('expected'))
  assert.equal((await call(one, { action: 'resume', student: student('Подмена') })).payload.attemptId, started.payload.attemptId)
  const pending = await call(late, { action: 'joinSession', code, student: student('Опоздавший') })
  assert.equal(pending.payload.phase, 'pending')
  assert.equal((await call(late, { action: 'start' })).payload.status, 'locked')
  const denied = await call(rejected, { action: 'joinSession', code, student: student('Отклонённый') })
  assert.equal((await adminCall({ action: 'decideParticipant', sessionId, participantId: denied.payload.participantId, admit: false })).status, 200)
  assert.equal((await call(rejected, undefined, { view: 'entry' })).payload.phase, 'rejected')
  assert.equal((await adminCall({ action: 'decideParticipant', sessionId, participantId: pending.payload.participantId, admit: true })).status, 200)
  assert.equal((await call(late, { action: 'resume' })).payload.expiresAt, started.payload.expiresAt)
  assert.equal((await adminCall({ action: 'extendParticipant', sessionId, participantId: pending.payload.participantId, minutes: 5, reason: '' })).status, 400)
  assert.equal((await adminCall({ action: 'extendParticipant', sessionId, participantId: pending.payload.participantId, minutes: 5, reason: 'Технический сбой' })).status, 200)
  assert.equal(Date.parse(String((await call(late, { action: 'resume' })).payload.expiresAt)) - Date.parse(String(started.payload.expiresAt)), 300_000)
  const lateAttempt = await call(late, { action: 'resume' })
  await call(late, { action: 'progress', answers: { fixture: { value: 18 } } })
  assert.equal((await adminCall({ action: 'revokeParticipant', sessionId, participantId: pending.payload.participantId })).status, 200)
  for (const action of ['resume', 'start', 'progress', 'submit', 'event']) {
    const revoked = await call(late, { action, answers: { fixture: { value: 999 } }, eventType: 'copy' })
    assert.equal(revoked.payload.status, 'locked'); assert.ok(!('tasks' in revoked.payload))
  }
  assert.equal((await call(late, undefined, { view: 'entry' })).payload.phase, 'rejected')
  const [kept] = await sql`select answers from assessment_attempts where id=${lateAttempt.payload.attemptId as string}::uuid and assessment_key like ${key + '-s-%'}`
  assert.deepEqual(kept.answers, { fixture: { value: 18 } })
  assert.equal((await adminCall({ action: 'saveReveal', revealAt: new Date().toISOString() })).status, 409)
  const future = new Date(Date.now() + 7 * 86400_000).toISOString()
  assert.equal((await adminCall({ action: 'saveReveal', revealAt: future })).status, 200)
  const submitted = await call(one, { action: 'submit', answers: {} })
  assert.equal(submitted.payload.status, 'sealed')
  for (const field of ['tasks', 'review', 'score', 'correctness', 'answers', 'variantCode', 'sources']) assert.ok(!(field in submitted.payload), `Sealed response must not contain ${field}`)
  assert.equal((await call(one, { action: 'resume' })).payload.status, 'sealed')
  assert.equal((await adminCall({ action: 'extendParticipant', sessionId, participantId: joined.payload.participantId, minutes: 5, reason: 'Сданную нельзя' })).status, 409)
  assert.equal((await call(two, { action: 'restart' })).status, 403)
  await call(two, { action: 'progress', answers: { fixture: { value: 17 } } })
  assert.equal((await adminCall({ action: 'endSession', sessionId })).status, 200)
  await finalizeExpiredSessionAttempts(key, engine)
  const [saved] = await sql`select submitted_at,answers from assessment_attempts where id=${other.payload.attemptId as string}::uuid and assessment_key like ${key + '-s-%'}`
  assert.ok(saved.submitted_at); assert.deepEqual(saved.answers, { fixture: { value: 17 } })
  assert.equal((await call(two, { action: 'submit', answers: { fixture: { value: 999 } } })).payload.status, 'sealed')
  assert.equal((await call({ cookies: {} }, { action: 'joinSession', code, student: student('После') })).status, 409)
  assert.equal((await adminCall({ action: 'saveReveal', revealAt: new Date().toISOString() })).status, 200)
  const released = await call(one, { action: 'resume' })
  assert.equal(released.payload.status, 'submitted'); assert.ok('review' in released.payload); assert.ok('score' in released.payload)
  assert.equal((await adminCall({ action: 'saveReveal', revealAt: null })).status, 200)
  assert.equal((await call(one, { action: 'resume' })).payload.status, 'sealed')
  console.log('PASS: waiting room, mixed OPs, scheduled gate, late admission/rejection, same attempt, extension, server deadline, saved-answer finalization, sealed results, common release, origin/auth guards')
} finally {
  // Exact isolated fixture namespace, no real exam or student data.
  await sql`delete from assessment_attempts where assessment_key like ${key + '-s-%'}`
  await sql`delete from assessment_sessions where period_key=${key} and test_id=${key}`
  await sql`delete from assessment_access_settings where period_key=${key}`
  await sql`delete from assessment_periods where key=${key} and test_id=${key}`
  console.log('Removed only isolated session-test fixtures.')
}
