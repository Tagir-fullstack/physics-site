import assert from 'node:assert/strict'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import midterm from '../api/midterm-assessment.js'

// Lifecycle/persistence tests use an isolated period in test-assessment-sessions.ts.
async function call(body?: Record<string, unknown>, query = {}) {
  let status = 200; let payload: Record<string, unknown> = {}
  const req = { method: body ? 'POST' : 'GET', body, query, cookies: {}, headers: { host: 'localhost:5173', origin: 'http://localhost:5173' } } as unknown as VercelRequest
  const res = { setHeader: () => {}, status: (value: number) => { status = value; return res }, json: (value: Record<string, unknown>) => { payload = value; return res } } as unknown as VercelResponse
  await midterm(req, res)
  return { status, payload }
}
const entry = await call(undefined, { view: 'entry' })
assert.equal(entry.payload.mode, 'session'); assert.equal(entry.payload.phase, 'code')
assert.equal(entry.payload.canPractice, false)
for (const action of ['start', 'progress', 'submit', 'event', 'restart']) {
  const result = await call({ action, student: { lastName: 'Тестовый', firstName: 'Студент', group: 'B076' }, practice: true, isAdmin: true })
  assert.equal(result.status, 403)
  for (const key of ['tasks', 'review', 'score', 'answers', 'variantCode']) assert.ok(!(key in result.payload))
}
assert.equal((await call({ action: 'resume' })).payload.status, 'locked')
assert.equal((await call(undefined, { view: 'monitor' })).status, 401)
assert.equal((await call(undefined, { view: 'sessions' })).status, 403)
assert.equal((await call(undefined, { view: 'attempt', attemptId: '00000000-0000-4000-8000-000000000000' })).status, 401)
for (const action of ['createSession', 'saveReveal', 'updateEntryTime', 'shortenSessionCode', 'startSession', 'endSession', 'decideParticipant', 'revokeParticipant', 'restoreParticipant', 'extendParticipant']) assert.equal((await call({ action, isAdmin: true })).status, 403)
console.log('PASS: direct midterm entry blocked, no question/answer leaks, spoofed admin/practice rejected, session administration protected; no data changed')
