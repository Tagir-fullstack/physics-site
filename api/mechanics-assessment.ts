import { createHash, randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, isNull, gt, sql } from 'drizzle-orm'
import { currentPeriod, periodCatalog, selectedPeriod, periodCondition, rotatePeriod } from './_lib/assessmentPeriods.js'
import { assessmentPenalty } from '../src/lib/assessmentPolicy.js'
import { db, hasDatabaseConfig, schema, databaseSql } from './_lib/db.js'
import { getClerkUser, hasPremiumAccess, isAdmin } from './_lib/auth.js'
import {
  ASSESSMENT_DURATION_MS,
  ASSESSMENT_KEY,
  createVariant,
  createVariantCode,
  gradeVariant,
  publicTasks,
  reviewVariant,
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

async function findAttempt(userId: string, assessmentKey = ASSESSMENT_KEY) {
  const [attempt] = await db
    .select()
    .from(schema.assessmentAttempts)
    .where(
      and(
        eq(schema.assessmentAttempts.clerkUserId, userId),
        eq(schema.assessmentAttempts.assessmentKey, assessmentKey)
      )
    )
    .limit(1)
  return attempt
}

function responseFor(
  attempt: NonNullable<Awaited<ReturnType<typeof findAttempt>>>,
  language: AssessmentLanguage = 'ru',
  canRestart = false
) {
  const variant = attempt.variantData as MechanicsVariant
  const base = {
    attemptId: attempt.id,
    variantCode: attempt.variantCode,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    serverNow: new Date().toISOString(),
    student: variant.student,
    ...assessmentPenalty(variant.penaltyPolicy, Array.isArray(attempt.violations) ? attempt.violations as Violation[] : [], attempt.submittedAt ? attempt.score ?? gradeVariant(variant, (attempt.answers ?? {}) as Answers).score : null),
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
      canRestart,
    }
  }
  return {
    status: 'active' as const,
    ...base,
    tasks: publicTasks(variant, language),
    answers: attempt.answers ?? {},
    violationsCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
  }
}

function answeredCount(value: unknown) {
  if (!value || typeof value !== 'object') return 0
  return Object.values(value as Record<string, unknown>).reduce<number>((total, task) => {
    if (!task || typeof task !== 'object') return total
    return total + Object.values(task as Record<string, unknown>)
      .filter((answer) => String(answer ?? '').trim().length > 0).length
  }, 0)
}

async function monitorResponse(key: string, active: boolean) {
  const attempts = await db
    .select()
    .from(schema.assessmentAttempts)
    .where(periodCondition(key))
    .orderBy(desc(schema.assessmentAttempts.startedAt))
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
        archived: !active || attempt.assessmentKey !== key,
        ...assessmentPenalty(variant.penaltyPolicy, Array.isArray(attempt.violations) ? attempt.violations as Violation[] : [], submitted ? attempt.score ?? result?.score ?? 0 : null),
      }
    }),
  }
}

async function monitorAttemptResponse(attemptId: string, language: AssessmentLanguage) {
  const [attempt] = await db
    .select()
    .from(schema.assessmentAttempts)
    .where(eq(schema.assessmentAttempts.id, attemptId))
    .limit(1)
  if (!attempt) return null
  const variant = attempt.variantData as MechanicsVariant
  const answers = (attempt.answers ?? {}) as Answers
  const review = reviewVariant(variant, answers, language)
  const result = gradeVariant(variant, answers)
  return {
    id: attempt.id,
    student: variant.student ?? null,
    variantCode: attempt.variantCode,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    score: attempt.score ?? (attempt.submittedAt ? result.score : null),
    maxScore: 3,
    answers,
    tasks: review.tasks,
    fields: review.fields,
    violations: Array.isArray(attempt.violations) ? attempt.violations : [],
    archived: attempt.assessmentKey !== (await currentPeriod()).key,
    ...assessmentPenalty(variant.penaltyPolicy, Array.isArray(attempt.violations) ? attempt.violations as Violation[] : [], attempt.submittedAt ? attempt.score ?? result.score : null),
  }
}

async function startAttempt(userId: string, student: StudentIdentity, period: Awaited<ReturnType<typeof currentPeriod>>) {
  const existing = await findAttempt(userId, period.key)
  if (existing) return existing

  for (let tries = 0; tries < 8; tries += 1) {
    const variant: MechanicsVariant = { ...createVariant(), student, penaltyPolicy: { version: 1 } }
    const startedAt = new Date()
    const expiresAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_MS)
    if (period.available) {
      await databaseSql.transaction([
        databaseSql`select pg_advisory_xact_lock(hashtext('assessment-period:mechanics'))`,
        databaseSql`with current_period as (select key from assessment_periods where key = ${period.key} and active = true)
        insert into assessment_attempts (assessment_key, clerk_user_id, variant_code, variant_fingerprint, variant_data, started_at, expires_at, violations)
        select key, ${userId}, ${createVariantCode()}, ${variantFingerprint(variant)}, ${JSON.stringify(variant)}::jsonb, ${startedAt.toISOString()}::timestamptz, ${expiresAt.toISOString()}::timestamptz, '[]'::jsonb from current_period
        on conflict do nothing`], { isolationLevel: 'ReadCommitted' })
      const created = await findAttempt(userId, period.key)
      if (created) return created
      if ((await currentPeriod()).key !== period.key) return null
      continue
    }
    const [created] = await db
      .insert(schema.assessmentAttempts)
      .values({
        assessmentKey: period.key,
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
    const raced = await findAttempt(userId, period.key)
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
    if (req.query.view === 'catalog') {
      if (!isAdmin(user)) return res.status(403).json({ error: 'Выбор среза доступен администратору.' })
      return res.status(200).json(await periodCatalog())
    }
    if (req.query.view === 'attempt') {
      if (!user) return res.status(401).json({ error: 'Сессия не распознана. Обновите страницу.' })
      if (!isAdmin(user)) return res.status(403).json({ error: 'Доступ разрешён только администратору.' })
      const attemptId = Array.isArray(req.query.attemptId) ? req.query.attemptId[0] : req.query.attemptId
      if (!attemptId) return res.status(400).json({ error: 'Не указана попытка.' })
      const detail = await monitorAttemptResponse(attemptId, queryLanguage)
      return detail ? res.status(200).json(detail) : res.status(404).json({ error: 'Попытка не найдена.' })
    }
    if (req.query.view === 'monitor') {
      if (!user) return res.status(401).json({ error: 'Сессия не распознана. Обновите страницу.' })
      if (!isAdmin(user)) return res.status(403).json({ error: 'Доступ разрешён только администратору.' })
      const key = Array.isArray(req.query.period) ? req.query.period[0] : req.query.period
      const period = await selectedPeriod(key)
      if (!period) return res.status(404).json({ error: 'Учебный период не найден.' })
      return res.status(200).json(await monitorResponse(period.key, period.active))
    }
    if (!user) return res.status(200).json({ status: 'ready' })
    const attempt = await findAttempt(user.userId, (await currentPeriod()).key)
    return res.status(200).json(attempt ? responseFor(attempt, queryLanguage, hasPremiumAccess(user)) : { status: 'ready' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = await bodyOf(req)
  if (body.action === 'newPeriod') {
    if (!isAdmin(user) || !req.headers.authorization?.startsWith('Bearer ')) return res.status(403).json({ error: 'Начать новый период может только администратор.' })
    const period = await currentPeriod()
    if (!period.available) return res.status(503).json({ error: 'Хранение учебных периодов ещё не подключено.' })
    const name = normalizePart(body.name, 120)
    if (name.length < 2 || body.currentKey !== period.key) return res.status(409).json({ error: 'Проверьте название и обновите список периодов.' })
    const key = `${ASSESSMENT_KEY}-p-${randomUUID().slice(0, 8)}`
    const changed = await rotatePeriod(period.key, key, name)
    if (!changed) return res.status(409).json({ error: 'Нельзя закрыть период: студенты ещё выполняют работу или другой администратор уже сменил период.' })
    return res.status(200).json({ ok: true, key })
  }
  if (body.action === 'waivePenalty') {
    if (!isAdmin(user) || !req.headers.authorization?.startsWith('Bearer ')) return res.status(403).json({ error: 'Отменять штрафы может только администратор с подтверждённой сессией.' })
    const reason = normalizePart(body.reason, 300)
    if (typeof body.attemptId !== 'string' || reason.length < 5) return res.status(400).json({ error: 'Укажите попытку и причину отмены (не менее 5 символов).' })
    const [target] = await db.select().from(schema.assessmentAttempts).where(eq(schema.assessmentAttempts.id, body.attemptId)).limit(1)
    if (!target) return res.status(404).json({ error: 'Попытка не найдена.' })
    const variant = target.variantData as MechanicsVariant
    if (variant.penaltyPolicy?.version !== 1) return res.status(409).json({ error: 'В этой попытке штрафы не применяются.' })
    // Only the waiver key is updated, leaving the event log and raw score intact.
    const waiver = JSON.stringify({ reason, at: new Date().toISOString(), actor: user!.userId })
    await db.update(schema.assessmentAttempts).set({ variantData: sql`jsonb_set(${schema.assessmentAttempts.variantData}, '{penaltyPolicy,waiver}', ${waiver}::jsonb)` }).where(eq(schema.assessmentAttempts.id, target.id))
    return res.status(200).json({ ok: true })
  }
  const language = languageOf(body.language)
  const student = studentFrom(body.student)
  const participantId = student ? studentUserId(student) : user?.userId
  const period = await currentPeriod()

  if (body.action === 'resume') {
    if (!student || !participantId) {
      return res.status(400).json({
        error: language === 'kk' ? 'Тегіңізді, атыңызды және тобыңызды енгізіңіз.' : 'Введите фамилию, имя и группу.',
      })
    }
    const attempt = await findAttempt(participantId, period.key)
    return res.status(200).json(attempt ? responseFor(attempt, language, hasPremiumAccess(user)) : { status: 'ready' })
  }

  if (body.action === 'start') {
    if (!student || !participantId) {
      return res.status(400).json({
        error: language === 'kk' ? 'Тегіңізді, атыңызды және тобыңызды тексеріңіз.' : 'Проверьте фамилию, имя и группу.',
      })
    }
    const attempt = await startAttempt(participantId, student, period)
    if (!attempt) return res.status(409).json({ error: 'Учебный период сменился. Обновите страницу перед началом работы.' })
    return res.status(200).json(responseFor(attempt, language, hasPremiumAccess(user)))
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
    const attempt = await findAttempt(participantId, period.key)
    if (!attempt) return res.status(200).json({ status: 'ready' })
    if (!attempt.submittedAt) {
      return res.status(409).json({
        error: language === 'kk' ? 'Алдымен ағымдағы жұмысты аяқтаңыз.' : 'Сначала завершите текущую попытку.',
      })
    }
    const archiveKey = `${period.key}-archive-${Date.now().toString(36)}-${attempt.variantCode}`
    await db
      .update(schema.assessmentAttempts)
      .set({ assessmentKey: archiveKey })
      .where(eq(schema.assessmentAttempts.id, attempt.id))
    return res.status(200).json({ status: 'ready' })
  }

  if (!participantId) return res.status(401).json({
    error: language === 'kk' ? 'Студент деректерін қайта енгізіңіз.' : 'Укажите данные студента заново.',
  })
  const attempt = await findAttempt(participantId, period.key)
  if (!attempt) return res.status(409).json({
    error: language === 'kk' ? 'Алдымен бақылау жұмысын бастаңыз.' : 'Сначала начните контрольный срез.',
  })
  if (attempt.submittedAt) return res.status(200).json(responseFor(attempt, language, hasPremiumAccess(user)))

  if (body.action === 'event') {
    const eventType = typeof body.eventType === 'string' ? body.eventType : ''
    if (!allowedEvents.has(eventType)) return res.status(400).json({ error: 'Unknown event' })
    const event = JSON.stringify([{ type: eventType, at: new Date().toISOString() }])
    // Atomic append prevents simultaneous visibility/fullscreen signals from
    // overwriting each other. Retain earlier warnings for stable scoring.
    const [updated] = await db
      .update(schema.assessmentAttempts)
      .set({ violations: sql`coalesce(${schema.assessmentAttempts.violations}, '[]'::jsonb) || ${event}::jsonb` })
      .where(and(eq(schema.assessmentAttempts.id, attempt.id), isNull(schema.assessmentAttempts.submittedAt), gt(schema.assessmentAttempts.expiresAt, new Date())))
      .returning()
    const saved = updated ?? await findAttempt(participantId, period.key)
    const violations = Array.isArray(saved?.violations) ? saved.violations as Violation[] : []
    const policy = (saved?.variantData as MechanicsVariant | undefined)?.penaltyPolicy
    return res.status(200).json({ ok: true, violationsCount: violations.length, ...assessmentPenalty(policy, violations, null) })
  }

  if (body.action === 'progress') {
    const answers = body.answers && typeof body.answers === 'object' ? body.answers as Answers : {}
    await db
      .update(schema.assessmentAttempts)
      .set({ answers })
      .where(and(eq(schema.assessmentAttempts.id, attempt.id), isNull(schema.assessmentAttempts.submittedAt), gt(schema.assessmentAttempts.expiresAt, new Date())))
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
      .where(and(eq(schema.assessmentAttempts.id, attempt.id), isNull(schema.assessmentAttempts.submittedAt)))
      .returning()
    const saved = updated ?? await findAttempt(participantId, period.key)
    if (!saved) throw new Error('Attempt disappeared during submission')
    return res.status(200).json(responseFor(saved, language, hasPremiumAccess(user)))
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
