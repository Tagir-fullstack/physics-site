import { neon } from '@neondatabase/serverless'
import { randomBytes } from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173'
const suffix = randomBytes(4).toString('hex').toUpperCase()
const inviteCode = `T${suffix.slice(0, 7)}`
let classId = ''
let testId = ''

const request = async (path, init) => {
  const response = await fetch(`${baseUrl}${path}`, init)
  const body = await response.json()
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`)
  return body
}

try {
  const [teacherClass] = await sql`
    insert into teacher_classes (owner_clerk_id, name, subject, invite_code)
    values ('_codex_e2e', 'E2E test class', 'Physics', ${inviteCode}) returning id
  `
  classId = teacherClass.id
  const [test] = await sql`
    insert into teacher_tests (owner_clerk_id, title, status, duration_minutes, published_at)
    values ('_codex_e2e', 'E2E platform test', 'published', 10, now()) returning id
  `
  testId = test.id
  await sql`
    insert into test_questions (test_id, order_no, kind, prompt, points, config)
    values (${testId}, 1, 'number', '2 + 3 = ?', 1, ${JSON.stringify({ answer: 5, tolerance: 0 })}::jsonb)
  `
  const [assignment] = await sql`
    insert into test_assignments (test_id, class_id, owner_clerk_id)
    values (${testId}, ${classId}, '_codex_e2e') returning id
  `
  const joined = await request('/api/student-platform', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'join', inviteCode, lastName: 'Тестов', firstName: 'Ученик', group: 'E2E' }),
  })
  const headers = { 'Content-Type': 'application/json', 'X-Student-Token': joined.token }
  const catalog = await request('/api/student-platform', { headers })
  const started = await request('/api/student-platform', {
    method: 'POST', headers, body: JSON.stringify({ action: 'start', assignmentId: assignment.id }),
  })
  const questionId = started.attempt.questions[0].id
  const submitted = await request('/api/student-platform', {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'submit', attemptId: started.attempt.id, answers: { [questionId]: '5' } }),
  })
  if (submitted.score !== 1 || submitted.maxScore !== 1) throw new Error(`Unexpected grade: ${JSON.stringify(submitted)}`)
  console.log(JSON.stringify({ ok: true, catalogItems: catalog.assignments.length, variantCode: started.attempt.variantCode, grade: `${submitted.score}/${submitted.maxScore}` }))
} finally {
  if (classId) await sql`delete from teacher_classes where id = ${classId} and owner_clerk_id = '_codex_e2e'`
  if (testId) await sql`delete from teacher_tests where id = ${testId} and owner_clerk_id = '_codex_e2e'`
}
