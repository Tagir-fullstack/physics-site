import { createHash, randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, asc, eq, gt, isNull } from 'drizzle-orm'
import { db, hasDatabaseConfig, schema } from './_lib/db.js'
import { evaluateFormula, generateVariables, substituteVariables } from './_lib/safeFormula.js'

type QuestionConfig = {
  options?: string[]
  answer: string | string[] | number
  unit?: string
  tolerance?: number
  explanation?: string
  variables?: string
  formula?: string
}
type VariantQuestion = {
  id: string
  orderNo: number
  section: string | null
  difficulty: string | null
  kind: string
  prompt: string
  points: number
  config: QuestionConfig
}
type Answers = Record<string, string | string[] | number>

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const normalizedIdentity = (lastName: string, firstName: string, group: string) => [lastName, firstName, group].map((item) => item.toLocaleLowerCase('ru-RU')).join('|')
const shuffle = <T>(items: T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}
async function bodyOf(req: VercelRequest) {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) as Record<string, unknown> } catch { return {} }
  }
  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
  try { return raw ? JSON.parse(raw) as Record<string, unknown> : {} } catch { return {} }
}
const publicQuestions = (questions: VariantQuestion[]) => questions.map((question) => ({
  id: question.id, orderNo: question.orderNo, section: question.section, difficulty: question.difficulty,
  kind: question.kind, prompt: question.prompt, points: question.points,
  config: { options: question.config.options, unit: question.config.unit },
}))

function individualize(question: VariantQuestion): VariantQuestion {
  if (!question.config.variables || !question.config.formula) return question
  const variables = generateVariables(question.config.variables)
  const answer = Number(evaluateFormula(question.config.formula, variables).toFixed(8))
  return {
    ...question,
    prompt: substituteVariables(question.prompt, variables),
    config: {
      ...question.config,
      answer,
      options: question.config.options?.map((option) => substituteVariables(option, variables)),
      variables: undefined,
      formula: undefined,
    },
  }
}

async function studentFor(req: VercelRequest) {
  const token = clean(req.headers['x-student-token'], 200)
  if (!token) return null
  const [student] = await db.select().from(schema.classStudents).where(and(eq(schema.classStudents.joinTokenHash, hash(token)), eq(schema.classStudents.active, true))).limit(1)
  return student ?? null
}

function isCorrect(question: VariantQuestion, answer: unknown) {
  const expected = question.config.answer
  if (question.kind === 'number') {
    const actual = Number(String(answer ?? '').replace(',', '.'))
    const target = Number(expected)
    const tolerance = Number(question.config.tolerance || 0)
    return Number.isFinite(actual) && Number.isFinite(target) && Math.abs(actual - target) <= tolerance
  }
  if (question.kind === 'multiple') {
    const actual = Array.isArray(answer) ? answer.map(String).sort() : []
    const target = Array.isArray(expected) ? expected.map(String).sort() : []
    return actual.length === target.length && actual.every((value, index) => value === target[index])
  }
  return String(answer ?? '').trim().toLocaleLowerCase('ru-RU') === String(expected).trim().toLocaleLowerCase('ru-RU')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!hasDatabaseConfig) return res.status(503).json({ error: 'База данных не подключена.' })
  const body = await bodyOf(req)

  if (req.method === 'POST' && body.action === 'join') {
    const inviteCode = clean(body.inviteCode, 12).toUpperCase()
    const lastName = clean(body.lastName, 60)
    const firstName = clean(body.firstName, 60)
    const groupName = clean(body.group, 40)
    if (!inviteCode || lastName.length < 2 || firstName.length < 2 || !groupName) return res.status(400).json({ error: 'Введите код, фамилию, имя и группу.' })
    const [teacherClass] = await db.select().from(schema.teacherClasses).where(and(eq(schema.teacherClasses.inviteCode, inviteCode), eq(schema.teacherClasses.archived, false))).limit(1)
    if (!teacherClass) return res.status(404).json({ error: 'Класс с таким кодом не найден.' })
    const identity = normalizedIdentity(lastName, firstName, groupName)
    const token = randomBytes(32).toString('base64url')
    const [student] = await db.insert(schema.classStudents).values({
      classId: teacherClass.id, lastName, firstName, groupName, normalizedIdentity: identity, joinTokenHash: hash(token),
    }).onConflictDoUpdate({
      target: [schema.classStudents.classId, schema.classStudents.normalizedIdentity],
      set: { joinTokenHash: hash(token), lastSeenAt: new Date(), active: true },
    }).returning()
    return res.status(200).json({ token, student: { id: student.id, lastName, firstName, group: groupName }, class: { id: teacherClass.id, name: teacherClass.name, subject: teacherClass.subject } })
  }

  const student = await studentFor(req)
  if (!student) return res.status(401).json({ error: 'Войдите в класс ещё раз по коду преподавателя.' })
  await db.update(schema.classStudents).set({ lastSeenAt: new Date() }).where(eq(schema.classStudents.id, student.id))

  if (req.method === 'GET') {
    const assignments = await db.select({
      id: schema.testAssignments.id, active: schema.testAssignments.active,
      opensAt: schema.testAssignments.opensAt, closesAt: schema.testAssignments.closesAt,
      title: schema.teacherTests.title, description: schema.teacherTests.description,
      language: schema.teacherTests.language, durationMinutes: schema.teacherTests.durationMinutes,
      calculatorAllowed: schema.teacherTests.calculatorAllowed,
    }).from(schema.testAssignments).innerJoin(schema.teacherTests, eq(schema.testAssignments.testId, schema.teacherTests.id))
      .where(and(eq(schema.testAssignments.classId, student.classId), eq(schema.testAssignments.active, true), eq(schema.teacherTests.status, 'published')))
    const attempts = await db.select().from(schema.teacherTestAttempts).where(eq(schema.teacherTestAttempts.studentId, student.id))
    return res.status(200).json({ student: { lastName: student.lastName, firstName: student.firstName, group: student.groupName }, assignments: assignments.map((assignment) => {
      const attempt = attempts.find((item) => item.assignmentId === assignment.id)
      return { ...assignment, attempt: attempt ? { id: attempt.id, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt, submittedAt: attempt.submittedAt, score: attempt.score, maxScore: attempt.maxScore } : null }
    }) })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (body.action === 'start') {
    const assignmentId = clean(body.assignmentId, 36)
    const [assignment] = await db.select({ assignment: schema.testAssignments, test: schema.teacherTests })
      .from(schema.testAssignments).innerJoin(schema.teacherTests, eq(schema.testAssignments.testId, schema.teacherTests.id))
      .where(and(eq(schema.testAssignments.id, assignmentId), eq(schema.testAssignments.classId, student.classId), eq(schema.testAssignments.active, true))).limit(1)
    if (!assignment || assignment.test.status !== 'published') return res.status(404).json({ error: 'Тест недоступен.' })
    const now = new Date()
    if (assignment.assignment.opensAt && assignment.assignment.opensAt > now) return res.status(409).json({ error: 'Тест ещё не открыт.' })
    if (assignment.assignment.closesAt && assignment.assignment.closesAt < now) return res.status(409).json({ error: 'Срок выполнения теста истёк.' })
    const existing = await db.select().from(schema.teacherTestAttempts).where(and(eq(schema.teacherTestAttempts.assignmentId, assignmentId), eq(schema.teacherTestAttempts.studentId, student.id))).limit(1)
    let attempt = existing[0]
    if (!attempt) {
      const rawQuestions = await db.select().from(schema.testQuestions).where(eq(schema.testQuestions.testId, assignment.test.id)).orderBy(asc(schema.testQuestions.orderNo))
      let questions: VariantQuestion[] = rawQuestions.map((question) => individualize({ ...question, config: question.config as QuestionConfig }))
      if (assignment.test.shuffleQuestions) questions = shuffle(questions).map((question, index) => ({ ...question, orderNo: index + 1 }))
      questions = questions.map((question) => question.config.options ? { ...question, config: { ...question.config, options: shuffle(question.config.options) } } : question)
      const maxScore = questions.reduce((sum, question) => sum + question.points, 0)
      const [created] = await db.insert(schema.teacherTestAttempts).values({
        assignmentId, studentId: student.id, variantCode: randomBytes(4).toString('hex').toUpperCase(),
        variantData: questions, maxScore, violations: [], expiresAt: new Date(now.getTime() + assignment.test.durationMinutes * 60_000),
      }).onConflictDoNothing().returning()
      attempt = created || (await db.select().from(schema.teacherTestAttempts).where(and(eq(schema.teacherTestAttempts.assignmentId, assignmentId), eq(schema.teacherTestAttempts.studentId, student.id))).limit(1))[0]
    }
    return res.status(200).json({ attempt: { id: attempt.id, variantCode: attempt.variantCode, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt, submittedAt: attempt.submittedAt, score: attempt.score, maxScore: attempt.maxScore, answers: attempt.answers || {}, questions: publicQuestions(attempt.variantData as VariantQuestion[]) }, test: { title: assignment.test.title, calculatorAllowed: assignment.test.calculatorAllowed } })
  }

  const attemptId = clean(body.attemptId, 36)
  const [attempt] = await db.select({ attempt: schema.teacherTestAttempts, assignment: schema.testAssignments })
    .from(schema.teacherTestAttempts).innerJoin(schema.testAssignments, eq(schema.teacherTestAttempts.assignmentId, schema.testAssignments.id))
    .where(and(eq(schema.teacherTestAttempts.id, attemptId), eq(schema.teacherTestAttempts.studentId, student.id), eq(schema.testAssignments.classId, student.classId))).limit(1)
  if (!attempt) return res.status(404).json({ error: 'Попытка не найдена.' })
  if (attempt.attempt.submittedAt) return res.status(409).json({ error: 'Работа уже сдана.' })
  const answers = body.answers && typeof body.answers === 'object' ? body.answers as Answers : {}
  if (body.action === 'progress') {
    await db.update(schema.teacherTestAttempts).set({ answers }).where(and(eq(schema.teacherTestAttempts.id, attemptId), isNull(schema.teacherTestAttempts.submittedAt), gt(schema.teacherTestAttempts.expiresAt, new Date())))
    return res.status(200).json({ ok: true })
  }
  if (body.action === 'submit') {
    const questions = attempt.attempt.variantData as VariantQuestion[]
    const expired = new Date() > attempt.attempt.expiresAt
    const details = questions.map((question) => ({ id: question.id, correct: !expired && isCorrect(question, answers[question.id]), points: question.points }))
    const score = details.reduce((sum, result) => sum + (result.correct ? result.points : 0), 0)
    const [saved] = await db.update(schema.teacherTestAttempts).set({ answers, score, submittedAt: new Date() })
      .where(and(eq(schema.teacherTestAttempts.id, attemptId), isNull(schema.teacherTestAttempts.submittedAt))).returning()
    return res.status(200).json({ score: saved?.score ?? score, maxScore: attempt.attempt.maxScore, details, expired })
  }
  return res.status(400).json({ error: 'Неизвестное действие.' })
}
