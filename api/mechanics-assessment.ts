import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, like } from 'drizzle-orm'
import { db, hasDatabaseConfig, schema } from './_lib/db.js'
import { getClerkUser, hasPremiumAccess, isAdmin } from './_lib/auth.js'
import {
  ASSESSMENT_DURATION_MS,
  ASSESSMENT_KEY,
  createVariant,
  createVariantCode,
  gradeVariant,
  publicTasks,
  variantFingerprint,
  type AssessmentLanguage,
  type MechanicsVariant,
  type StudentIdentity,
} from './_lib/mechanicsAssessment.js'

type Answers = Record<string, Record<string, string | number>>
type Violation = { type: string; at: string }

function languageOf(value: unknown): AssessmentLanguage {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate === 'kk' ? 'kk' : 'ru'
}

const namePattern = /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі'’ -]+$/u

function normalizePart(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function studentFrom(value: unknown): StudentIdentity | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const lastName = normalizePart(raw.lastName, 60)
  const firstName = normalizePart(raw.firstName, 60)
  const group = normalizePart(raw.group, 32)
  if (
    lastName.length < 2 ||
    firstName.length < 2 ||
    group.length < 1 ||
    !namePattern.test(lastName) ||
    !namePattern.test(firstName)
  ) return null
  return { lastName, firstName, group }
}

function studentUserId(student: StudentIdentity) {
  const normalized = [student.lastName, student.firstName, student.group]
    .map((part) => part.toLocaleLowerCase('ru-RU'))
    .join('|')
  return `guest_${createHash('sha256').update(normalized).digest('hex').slice(0, 56)}`
}

const allowedEvents = new Set([
  'tab-hidden',
  'window-blur',
  'fullscreen-exit',
  'copy',
  'cut',
  'paste',
  'context-menu',
  'print-shortcut',
  'navigation-attempt',
])

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function bodyOf(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  const raw = await readRawBody(req)
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function findAttempt(userId: string) {
  const [attempt] = await db
    .select()
    .from(schema.assessmentAttempts)
    .where(
      and(
        eq(schema.assessmentAttempts.clerkUserId, userId),
        eq(schema.assessmentAttempts.assessmentKey, ASSESSMENT_KEY)
      )
    )
    .limit(1)
  return attempt
}

function responseFor(
  attempt: NonNullable<Awaited<ReturnType<typeof findAttempt>>>,
  language: AssessmentLanguage = 'ru'
) {
  const variant = attempt.variantData as MechanicsVariant
  const base = {
    attemptId: attempt.id,
    variantCode: attempt.variantCode,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    serverNow: new Date().toISOString(),
    student: variant.student,
  }
  if (attempt.submittedAt) {
    const result = gradeVariant(variant, (attempt.answers ?? {}) as Answers)
    const late = attempt.submittedAt.getTime() > attempt.expiresAt.getTime() + 30_000
    return {
      status: 'submitted' as const,
      ...base,
      score: attempt.score ?? result.score,
      maxScore: 3,
      correctness: late ? [false, false, false] : result.correctness,
      submittedAt: attempt.submittedAt.toISOString(),
      late,
      violationsCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
      sources: ['№ 1.1', '№ 2.6', '№ 2.41'],
    }
  }
  return {
    status: 'active' as const,
    ...base,
    tasks: publicTasks(variant, language),
    violationsCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
  }
}

function answeredCount(value: unknown) {
  if (!value || typeof value !== 'object') return 0
  return Object.values(value as Record<string, unknown>).reduce((total, task) => {
    if (!task || typeof task !== 'object') return total
    return total + Object.values(task as Record<string, unknown>)
      .filter((answer) => String(answer ?? '').trim().length > 0).length
  }, 0)
}

async function monitorResponse() {
  const attempts = await db
    .select()
    .from(schema.assessmentAttempts)
    .where(like(schema.assessmentAttempts.assessmentKey, `${ASSESSMENT_KEY}%`))
    .orderBy(desc(schema.assessmentAttempts.startedAt))
    .limit(250)
  const now = Date.now()
  return {
    serverNow: new Date(now).toISOString(),
    attempts: attempts.map((attempt) => {
      const variant = attempt.variantData as MechanicsVariant
      const submitted = Boolean(attempt.submittedAt)
      const expired = !submitted && attempt.expiresAt.getTime() < now
      const result = submitted ? gradeVariant(variant, (attempt.answers ?? {}) as Answers) : null
      const late = submitted && attempt.submittedAt!.getTime() > attempt.expiresAt.getTime() + 30_000
      return {
        id: attempt.id,
        student: variant.student ?? null,
        variantCode: attempt.variantCode,
        startedAt: attempt.startedAt.toISOString(),
        expiresAt: attempt.expiresAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        status: submitted ? 'submitted' : expired ? 'expired' : 'active',
        score: submitted ? (attempt.score ?? result?.score ?? 0) : null,
        maxScore: 3,
        correctness: late ? [false, false, false] : (result?.correctness ?? null),
        answeredFields: answeredCount(attempt.answers),
        totalFields: publicTasks(variant).reduce((sum, task) => sum + task.fields.length, 0),
        violationsCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
        archived: attempt.assessmentKey !== ASSESSMENT_KEY,
      }
    }),
  }
}

async function startAttempt(userId: string, student?: StudentIdentity) {
  const existing = await findAttempt(userId)
  if (existing) return existing

  for (let tries = 0; tries < 8; tries += 1) {
    const variant = { ...createVariant(), student }
    const startedAt = new Date()
    const expiresAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_MS)
    const [created] = await db
      .insert(schema.assessmentAttempts)
      .values({
        assessmentKey: ASSESSMENT_KEY,
        clerkUserId: userId,
        variantCode: createVariantCode(),
        variantFingerprint: variantFingerprint(variant),
        variantData: variant,
        startedAt,
        expiresAt,
        violations: [],
      })
      .onConflictDoNothing()
      .returning()
    if (created) return created
    const raced = await findAttempt(userId)
    if (raced) return raced
  }
  throw new Error('Could not create a unique assessment variant')
}

async function handleRequest(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const queryLanguage = languageOf(req.query.lang)
  if (!hasDatabaseConfig) {
    return res.status(503).json({
      error: queryLanguage === 'kk'
        ? 'Бақылау жұмысының дерекқоры Vercel жүйесіне қосылмаған (DATABASE_URL).'
        : 'База данных контрольного среза не подключена в Vercel (DATABASE_URL).',
    })
  }
  const user = await getClerkUser(req)

  if (req.method === 'GET') {
    if (req.query.view === 'monitor') {
      if (!user) return res.status(401).json({ error: 'Сессия не распознана. Обновите страницу.' })
      if (!isAdmin(user)) return res.status(403).json({ error: 'Доступ разрешён только администратору.' })
      return res.status(200).json(await monitorResponse())
    }
    if (!user) return res.status(200).json({ status: 'ready' })
    const attempt = await findAttempt(user.userId)
    return res.status(200).json(attempt ? responseFor(attempt, queryLanguage) : { status: 'ready' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = await bodyOf(req)
  const language = languageOf(body.language)
  const student = studentFrom(body.student)
  const participantId = student ? studentUserId(student) : user?.userId

  if (body.action === 'resume') {
    if (!student || !participantId) {
      return res.status(400).json({
        error: language === 'kk' ? 'Тегіңізді, атыңызды және тобыңызды енгізіңіз.' : 'Введите фамилию, имя и группу.',
      })
    }
    const attempt = await findAttempt(participantId)
    return res.status(200).json(attempt ? responseFor(attempt, language) : { status: 'ready' })
  }

  if (body.action === 'start') {
    if (!student || !participantId) {
      return res.status(400).json({
        error: language === 'kk' ? 'Тегіңізді, атыңызды және тобыңызды тексеріңіз.' : 'Проверьте фамилию, имя и группу.',
      })
    }
    const attempt = await startAttempt(participantId, student)
    return res.status(200).json(responseFor(attempt, language))
  }

  if (body.action === 'restart') {
    if (!hasPremiumAccess(user)) {
      return res.status(403).json({
        error: language === 'kk' ? 'Қайта өту тек PRO пайдаланушыларына қолжетімді.' : 'Повторный запуск доступен только пользователям PRO.',
      })
    }
    if (!student || !participantId) {
      return res.status(400).json({
        error: language === 'kk' ? 'Студент деректерін қайта енгізіңіз.' : 'Укажите данные студента заново.',
      })
    }
    const attempt = await findAttempt(participantId)
    if (!attempt) return res.status(200).json({ status: 'ready' })
    if (!attempt.submittedAt) {
      return res.status(409).json({
        error: language === 'kk' ? 'Алдымен ағымдағы жұмысты аяқтаңыз.' : 'Сначала завершите текущую попытку.',
      })
    }
    const archiveKey = `${ASSESSMENT_KEY}-archive-${Date.now().toString(36)}-${attempt.variantCode}`
    await db
      .update(schema.assessmentAttempts)
      .set({ assessmentKey: archiveKey })
      .where(eq(schema.assessmentAttempts.id, attempt.id))
    return res.status(200).json({ status: 'ready' })
  }

  if (!participantId) return res.status(401).json({
    error: language === 'kk' ? 'Студент деректерін қайта енгізіңіз.' : 'Укажите данные студента заново.',
  })
  const attempt = await findAttempt(participantId)
  if (!attempt) return res.status(409).json({
    error: language === 'kk' ? 'Алдымен бақылау жұмысын бастаңыз.' : 'Сначала начните контрольный срез.',
  })
  if (attempt.submittedAt) return res.status(200).json(responseFor(attempt, language))

  if (body.action === 'event') {
    const eventType = typeof body.eventType === 'string' ? body.eventType : ''
    if (!allowedEvents.has(eventType)) return res.status(400).json({ error: 'Unknown event' })
    const current = Array.isArray(attempt.violations) ? (attempt.violations as Violation[]) : []
    const violations = [...current.slice(-99), { type: eventType, at: new Date().toISOString() }]
    await db
      .update(schema.assessmentAttempts)
      .set({ violations })
      .where(eq(schema.assessmentAttempts.id, attempt.id))
    return res.status(200).json({ ok: true, violationsCount: violations.length })
  }

  if (body.action === 'progress') {
    const answers = body.answers && typeof body.answers === 'object' ? body.answers as Answers : {}
    await db
      .update(schema.assessmentAttempts)
      .set({ answers })
      .where(eq(schema.assessmentAttempts.id, attempt.id))
    return res.status(200).json({ ok: true })
  }

  if (body.action === 'submit') {
    const answers =
      body.answers && typeof body.answers === 'object' ? (body.answers as Answers) : ({} as Answers)
    const variant = attempt.variantData as MechanicsVariant
    const late = Date.now() > attempt.expiresAt.getTime() + 30_000
    const result = late
      ? { score: 0, correctness: [false, false, false] }
      : gradeVariant(variant, answers)
    const submittedAt = new Date()
    const [updated] = await db
      .update(schema.assessmentAttempts)
      .set({ answers, score: result.score, submittedAt })
      .where(eq(schema.assessmentAttempts.id, attempt.id))
      .returning()
    return res.status(200).json(responseFor(updated, language))
  }

  return res.status(400).json({ error: 'Unknown action' })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleRequest(req, res)
  } catch (error) {
    console.error('Mechanics assessment API error:', error)
    if (res.headersSent) return
    return res.status(500).json({
      error: 'Сервис контрольного среза временно недоступен. Попробуйте обновить страницу.',
    })
  }
}
