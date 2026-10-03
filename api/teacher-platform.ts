import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import { db, hasDatabaseConfig, schema } from './_lib/db.js'
import { getClerkUser, hasPremiumAccess } from './_lib/auth.js'

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

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
const idOf = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : ''

async function createInviteCode() {
  for (let tries = 0; tries < 10; tries += 1) {
    const code = randomBytes(4).toString('hex').toUpperCase()
    const [exists] = await db.select({ id: schema.teacherClasses.id }).from(schema.teacherClasses).where(eq(schema.teacherClasses.inviteCode, code)).limit(1)
    if (!exists) return code
  }
  throw new Error('Не удалось создать код класса.')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!hasDatabaseConfig) return res.status(503).json({ error: 'База данных не подключена.' })
  const user = await getClerkUser(req)
  if (!user) return res.status(401).json({ error: 'Войдите в аккаунт преподавателя.' })
  if (!hasPremiumAccess(user)) return res.status(403).json({ error: 'Конструктор тестов доступен преподавателям с PRO.' })

  if (req.method === 'GET') {
    const attemptId = idOf(req.query.attemptId)
    if (attemptId) {
      const [result] = await db.select({
        attempt: schema.teacherTestAttempts,
        assignment: schema.testAssignments,
        student: schema.classStudents,
        testTitle: schema.teacherTests.title,
      }).from(schema.teacherTestAttempts)
        .innerJoin(schema.testAssignments, eq(schema.teacherTestAttempts.assignmentId, schema.testAssignments.id))
        .innerJoin(schema.classStudents, eq(schema.teacherTestAttempts.studentId, schema.classStudents.id))
        .innerJoin(schema.teacherTests, eq(schema.testAssignments.testId, schema.teacherTests.id))
        .where(and(eq(schema.teacherTestAttempts.id, attemptId), eq(schema.testAssignments.ownerClerkId, user.userId))).limit(1)
      if (!result) return res.status(404).json({ error: 'Попытка не найдена.' })
      return res.status(200).json(result)
    }
    const testId = idOf(req.query.testId)
    if (testId) {
      const [test] = await db.select().from(schema.teacherTests)
        .where(and(eq(schema.teacherTests.id, testId), eq(schema.teacherTests.ownerClerkId, user.userId))).limit(1)
      if (!test) return res.status(404).json({ error: 'Тест не найден.' })
      const questions = await db.select().from(schema.testQuestions).where(eq(schema.testQuestions.testId, test.id)).orderBy(asc(schema.testQuestions.orderNo))
      const assignments = await db.select({
        id: schema.testAssignments.id, classId: schema.testAssignments.classId,
        className: schema.teacherClasses.name, inviteCode: schema.teacherClasses.inviteCode,
        active: schema.testAssignments.active, createdAt: schema.testAssignments.createdAt,
      }).from(schema.testAssignments).innerJoin(schema.teacherClasses, eq(schema.testAssignments.classId, schema.teacherClasses.id))
        .where(and(eq(schema.testAssignments.testId, test.id), eq(schema.testAssignments.ownerClerkId, user.userId)))
      const assignmentIds = assignments.map((item) => item.id)
      const attempts = assignmentIds.length ? await db.select({
        id: schema.teacherTestAttempts.id,
        assignmentId: schema.teacherTestAttempts.assignmentId,
        studentId: schema.teacherTestAttempts.studentId,
        lastName: schema.classStudents.lastName,
        firstName: schema.classStudents.firstName,
        groupName: schema.classStudents.groupName,
        variantCode: schema.teacherTestAttempts.variantCode,
        startedAt: schema.teacherTestAttempts.startedAt,
        expiresAt: schema.teacherTestAttempts.expiresAt,
        submittedAt: schema.teacherTestAttempts.submittedAt,
        score: schema.teacherTestAttempts.score,
        maxScore: schema.teacherTestAttempts.maxScore,
        violations: schema.teacherTestAttempts.violations,
      }).from(schema.teacherTestAttempts)
        .innerJoin(schema.classStudents, eq(schema.teacherTestAttempts.studentId, schema.classStudents.id))
        .where(inArray(schema.teacherTestAttempts.assignmentId, assignmentIds))
        .orderBy(desc(schema.teacherTestAttempts.startedAt)) : []
      return res.status(200).json({ test, questions, assignments, attempts })
    }
    const [classes, tests] = await Promise.all([
      db.select().from(schema.teacherClasses).where(and(eq(schema.teacherClasses.ownerClerkId, user.userId), eq(schema.teacherClasses.archived, false))).orderBy(desc(schema.teacherClasses.createdAt)),
      db.select().from(schema.teacherTests).where(eq(schema.teacherTests.ownerClerkId, user.userId)).orderBy(desc(schema.teacherTests.createdAt)),
    ])
    const classIds = classes.map((item) => item.id)
    const studentCounts = classIds.length
      ? await db.select({ classId: schema.classStudents.classId, value: count() }).from(schema.classStudents).where(inArray(schema.classStudents.classId, classIds)).groupBy(schema.classStudents.classId)
      : []
    return res.status(200).json({ classes, tests, studentCounts })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = await bodyOf(req)
  if (body.action === 'create-class') {
    const name = clean(body.name, 160)
    if (name.length < 2) return res.status(400).json({ error: 'Введите название класса или группы.' })
    const [created] = await db.insert(schema.teacherClasses).values({
      ownerClerkId: user.userId,
      name,
      subject: clean(body.subject, 120) || null,
      inviteCode: await createInviteCode(),
    }).returning()
    return res.status(201).json(created)
  }
  if (body.action === 'publish') {
    const testId = idOf(body.testId)
    const [updated] = await db.update(schema.teacherTests).set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.teacherTests.id, testId), eq(schema.teacherTests.ownerClerkId, user.userId), eq(schema.teacherTests.status, 'draft'))).returning()
    return updated ? res.status(200).json(updated) : res.status(409).json({ error: 'Черновик не найден или уже опубликован.' })
  }
  if (body.action === 'assign') {
    const testId = idOf(body.testId)
    const classId = idOf(body.classId)
    const [[test], [teacherClass]] = await Promise.all([
      db.select().from(schema.teacherTests).where(and(eq(schema.teacherTests.id, testId), eq(schema.teacherTests.ownerClerkId, user.userId))).limit(1),
      db.select().from(schema.teacherClasses).where(and(eq(schema.teacherClasses.id, classId), eq(schema.teacherClasses.ownerClerkId, user.userId))).limit(1),
    ])
    if (!test || !teacherClass) return res.status(404).json({ error: 'Тест или класс не найден.' })
    if (test.status !== 'published') return res.status(409).json({ error: 'Сначала опубликуйте тест.' })
    const [assignment] = await db.insert(schema.testAssignments).values({ testId, classId, ownerClerkId: user.userId })
      .onConflictDoUpdate({ target: [schema.testAssignments.testId, schema.testAssignments.classId], set: { active: true } }).returning()
    return res.status(200).json(assignment)
  }
  return res.status(400).json({ error: 'Неизвестное действие.' })
}
