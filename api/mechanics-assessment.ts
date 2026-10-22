import { createHash, randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, isNull, gt, sql } from 'drizzle-orm'
import { currentPeriod as getCurrentPeriod, periodCatalog, selectedPeriod as getSelectedPeriod, periodCondition, rotatePeriod as doRotatePeriod } from './_lib/assessmentPeriods.js'
import { assessmentPenalty as calculatePenalty } from '../src/lib/assessmentPolicy.js'
import { DEFAULT_MONITOR_GROUPS, normalizeMonitorGroup } from '../src/lib/monitorGrading.js'
import { db, hasDatabaseConfig, schema, databaseSql } from './_lib/db.js'
import { getClerkUser, isAdmin } from './_lib/auth.js'
import { handleSessionRequest, attemptRelease, finalizeExpiredSessionAttempts } from './_lib/assessmentSessions.js'
import { canRestartAssessment } from './_lib/assessmentAccess.js'
import { studentForWork, STUDENT_RECOVERY_REQUIRED } from './_lib/studentWorkIdentity.js'
import {
  ASSESSMENT_DURATION_MS as MECHANICS_DURATION,
  ASSESSMENT_KEY as MECHANICS_KEY,
  createVariant as createMechanics,
  createVariantCode,
  gradeVariant as gradeMechanics,
  publicTasks as mechanicsTasks,
  reviewVariant as reviewMechanics,
  variantFingerprint as mechanicsFingerprint,
  type AssessmentLanguage,
  type MechanicsVariant as LegacyVariant,
  type StudentIdentity,
} from './_lib/mechanicsAssessment.js'

import { createMidtermVariant, gradeMidterm, midtermTasks, reviewMidterm, midtermFingerprint, type MidtermVariant } from './_lib/midtermAssessment.js'

export function createAssessmentHandler(testId: 'mechanics' | 'midterm' = 'mechanics') {
const midterm = testId === 'midterm'
const ASSESSMENT_KEY = midterm ? 'midterm-cut-v1' : MECHANICS_KEY
const ASSESSMENT_DURATION_MS = midterm ? 50 * 60_000 : MECHANICS_DURATION
const maxScore = midterm ? 8 : 3
const scale = midterm ? 100 : 1
type MechanicsVariant = LegacyVariant | MidtermVariant
const isMidterm = (v: MechanicsVariant): v is MidtermVariant => 'kind' in v && v.kind === 'midterm-v1'
const createVariant = (): MechanicsVariant => midterm ? createMidtermVariant() : createMechanics()
const gradeVariant = (v: MechanicsVariant, a: Answers) => isMidterm(v) ? gradeMidterm(v, a) : gradeMechanics(v, a)
const publicTasks = (v: MechanicsVariant, l: AssessmentLanguage = 'ru') => isMidterm(v) ? midtermTasks(v, l) : mechanicsTasks(v, l)
const reviewVariant = (v: MechanicsVariant, a: Answers, l: AssessmentLanguage = 'ru') => isMidterm(v) ? reviewMidterm(v, a, l) : reviewMechanics(v, a, l)
const variantFingerprint = (v: MechanicsVariant) => isMidterm(v) ? midtermFingerprint(v) : mechanicsFingerprint(v)
const storedScore = (score: number | null) => score === null ? null : score / scale
const currentPeriod = () => getCurrentPeriod(testId)
const selectedPeriod = (key?: string) => getSelectedPeriod(key, testId)
const rotatePeriod = (previous: string, key: string, name: string) => doRotatePeriod(previous, key, name, testId)
const assessmentPenalty = (policy: LegacyVariant['penaltyPolicy'], events: Violation[], score: number | null) => calculatePenalty(policy, events, score, maxScore)
const emptyCorrectness = (variant: MechanicsVariant) => publicTasks(variant).map(() => false)

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

async function responseFor(
  attempt: NonNullable<Awaited<ReturnType<typeof findAttempt>>>,
  language: AssessmentLanguage = 'ru',
  canRestart = false,
  teacher = false
) {
  const variant = attempt.variantData as MechanicsVariant
  if (attempt.submittedAt && !teacher) {
    const release = await attemptRelease(attempt, testId)
    if (!release.released) return { status: 'sealed' as const, attemptId: attempt.id, student: variant.student, submittedAt: attempt.submittedAt.toISOString(), revealAt: release.revealAt?.toISOString() ?? null }
  }
  const base = {
    attemptId: attempt.id,
    variantCode: attempt.variantCode,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    serverNow: new Date().toISOString(),
    student: variant.student,
    ...assessmentPenalty(variant.penaltyPolicy, Array.isArray(attempt.violations) ? attempt.violations as Violation[] : [], attempt.submittedAt ? storedScore(attempt.score) ?? gradeVariant(variant, (attempt.answers ?? {}) as Answers).score : null),
  }
  if (attempt.submittedAt) {
    const result = gradeVariant(variant, (attempt.answers ?? {}) as Answers)
    const late = attempt.submittedAt.getTime() > attempt.expiresAt.getTime() + 30_000
    const weightedReview = isMidterm(variant) ? reviewMidterm(variant, (attempt.answers ?? {}) as Answers, language) : null
    const studentReview = weightedReview ?? reviewVariant(variant, (attempt.answers ?? {}) as Answers, language)
    return {
      status: 'submitted' as const,
      ...base,
      score: storedScore(attempt.score) ?? result.score,
      maxScore,
      correctness: late ? emptyCorrectness(variant) : result.correctness,
      // Answer keys are returned only after the attempt has been submitted.
      review: studentReview.tasks.map(task => ({
        id: task.id, title: task.title, text: task.text,
        fields: studentReview.fields.filter(field => field.taskId === task.id).map(field => ({
          id: field.fieldId, label: field.label, unit: field.unit,
          submitted: field.submitted, expected: field.expected, correct: field.correct,
        })),
      })),
      ...(weightedReview ? {
        taskScores: weightedReview.tasks.map(task => late ? 0 : Math.round(weightedReview.fields.filter(f => f.taskId === task.id).reduce((sum, f) => sum + (f.correct ? f.points : 0), 0) * 100) / 100),
        taskMaxScores: weightedReview.tasks.map(task => task.points),
        taskLabels: weightedReview.tasks.map(task => task.kind === 'multiple' ? `Теория ${task.order - 5}` : `${language === 'kk' ? 'Есеп' : 'Задача'} ${task.order}`),
      } : {}),
      submittedAt: attempt.submittedAt.toISOString(),
      late,
      violationsCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
      sources: midterm ? ['№ 1.19', isMidterm(variant) && 'mass' in variant.blocks ? '№ 2.5' : '№ 2.4', ...(isMidterm(variant) && variant.revision === 3 ? [] : ['№ 1.33']), '№ 2.34', '№ 3.5 (АБ₂); теория — лекции 1–6'] : ['№ 1.1', '№ 2.6', '№ 2.41'],
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
        score: submitted ? (storedScore(attempt.score) ?? result?.score ?? 0) : null,
        maxScore,
        correctness: late ? emptyCorrectness(variant) : (result?.correctness ?? null),
        answeredFields: answeredCount(attempt.answers),
        totalFields: publicTasks(variant).reduce((sum, task) => sum + task.fields.length, 0),
        violationsCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
        archived: !active || attempt.assessmentKey !== key,
        ...assessmentPenalty(variant.penaltyPolicy, Array.isArray(attempt.violations) ? attempt.violations as Violation[] : [], submitted ? storedScore(attempt.score) ?? result?.score ?? 0 : null),
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
  const selected = await selectedPeriod(attempt.assessmentKey.replace(/-archive-.+$/, '').replace(/-s-.+$/, ''))
  if (!selected) return null
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
    score: storedScore(attempt.score) ?? (attempt.submittedAt ? result.score : null),
    maxScore,
    answers,
    tasks: review.tasks,
    fields: review.fields,
    violations: Array.isArray(attempt.violations) ? attempt.violations : [],
    archived: attempt.assessmentKey !== (await currentPeriod()).key,
    ...assessmentPenalty(variant.penaltyPolicy, Array.isArray(attempt.violations) ? attempt.violations as Violation[] : [], attempt.submittedAt ? storedScore(attempt.score) ?? result.score : null),
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
        databaseSql`select pg_advisory_xact_lock(hashtext(${'assessment-period:' + testId}))`,
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
  const body = req.method === 'POST' ? await bodyOf(req) : {}
  if (await handleSessionRequest(req, res, body, testId, user, { create: createVariant, fingerprint: variantFingerprint, code: createVariantCode, grade: gradeVariant, scale, student: studentFrom, respond: (attempt, lang) => responseFor(attempt, lang, false, isAdmin(user)) })) return

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
      await finalizeExpiredSessionAttempts(period.key, { grade: gradeVariant, scale })
      return res.status(200).json(await monitorResponse(period.key, period.active))
    }
    if (!user) return res.status(200).json({ status: 'ready' })
    const attempt = await findAttempt(user.userId, (await currentPeriod()).key)
    return res.status(200).json(attempt ? await responseFor(attempt, queryLanguage, canRestartAssessment(testId, user), isAdmin(user)) : { status: 'ready' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (body.action === 'updateStudent' || body.action === 'setMaxPoints') {
    if (!isAdmin(user) || !req.headers.authorization?.startsWith('Bearer ')) return res.status(403).json({ error: 'Изменять данные может только администратор с подтверждённой сессией.' })
    if (typeof body.period !== 'string' || !body.period) return res.status(400).json({ error: 'Укажите учебный период.' })
    const period = await selectedPeriod(body.period)
    if (!period) return res.status(404).json({ error: 'Учебный период не найден.' })
    if (body.action === 'setMaxPoints') {
      const points = body.maxPoints
      if (typeof points !== 'number' || !Number.isFinite(points) || points < 0.1 || points > 1000 || Math.abs(points * 10 - Math.round(points * 10)) > 1e-8) return res.status(400).json({ error: 'Максимальный балл: от 0,1 до 1000, не более одного знака после запятой.' })
      const [updated] = await db.update(schema.assessmentPeriods).set({ maxPointsTenths: Math.round(points * 10) }).where(and(eq(schema.assessmentPeriods.key, period.key), eq(schema.assessmentPeriods.testId, testId))).returning({ key: schema.assessmentPeriods.key })
      if (!updated) return res.status(409).json({ error: 'Сначала подключите хранение учебных периодов.' })
      return res.status(200).json({ ok: true })
    }
    const student = studentFrom(body.student)
    if (!student || typeof body.attemptId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.attemptId)) return res.status(400).json({ error: 'Проверьте ФИО, группу и номер работы.' })
    const group = normalizeMonitorGroup(student.group)
    const rows = await db.select({ variant: schema.assessmentAttempts.variantData }).from(schema.assessmentAttempts).where(periodCondition(period.key))
    const groups = new Set([...DEFAULT_MONITOR_GROUPS, ...rows.map(row => normalizeMonitorGroup((row.variant as MechanicsVariant).student?.group ?? '')).filter(Boolean)])
    if (!group || !groups.has(group)) return res.status(400).json({ error: 'Выберите группу из списка.' })
    const value = JSON.stringify({ ...student, group })
    // Correct only the displayed identity: retain the guest access key, answers and original variant.
    const [updated] = await db.update(schema.assessmentAttempts).set({ variantData: sql`jsonb_set(${schema.assessmentAttempts.variantData}, '{student}', coalesce(${schema.assessmentAttempts.variantData}->'student', '{}'::jsonb) || ${value}::jsonb)` }).where(and(eq(schema.assessmentAttempts.id, body.attemptId), periodCondition(period.key))).returning({ id: schema.assessmentAttempts.id })
    if (!updated) return res.status(404).json({ error: 'Работа не найдена в выбранном периоде.' })
    return res.status(200).json({ ok: true, student: { ...student, group } })
  }
  if (body.action === 'deleteAttempt') {
    if (!isAdmin(user) || !req.headers.authorization?.startsWith('Bearer ')) return res.status(403).json({ error: 'Удалять работы может только администратор с подтверждённой сессией.' })
    if (typeof body.attemptId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.attemptId) || typeof body.period !== 'string' || !body.period) return res.status(400).json({ error: 'Укажите работу и учебный период.' })
    const period = await selectedPeriod(body.period)
    if (!period) return res.status(404).json({ error: 'Учебный период не найден.' })
    const [deleted] = await db.delete(schema.assessmentAttempts).where(and(eq(schema.assessmentAttempts.id, body.attemptId), periodCondition(period.key))).returning({ id: schema.assessmentAttempts.id })
    if (!deleted) return res.status(404).json({ error: 'Работа не найдена в выбранном периоде. Возможно, она уже удалена.' })
    return res.status(200).json({ ok: true, id: deleted.id })
  }
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
    if (!target || !await selectedPeriod(target.assessmentKey.replace(/-archive-.+$/, '').replace(/-s-.+$/, ''))) return res.status(404).json({ error: 'Попытка не найдена.' })
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
    return res.status(200).json(attempt ? await responseFor(attempt, language, canRestartAssessment(testId, user), isAdmin(user)) : { status: 'ready' })
  }

  if (body.action === 'start') {
    if (!student || !participantId) {
      return res.status(400).json({
        error: language === 'kk' ? 'Тегіңізді, атыңызды және тобыңызды тексеріңіз.' : 'Проверьте фамилию, имя и группу.',
      })
    }
    const saved = await findAttempt(participantId, period.key)
    if (saved) return res.status(200).json(await responseFor(saved, language, canRestartAssessment(testId, user), isAdmin(user)))
    const workStudent = await studentForWork(req, res, user, student)
    if (!workStudent) return res.status(409).json({ error: STUDENT_RECOVERY_REQUIRED })
    const attempt = await startAttempt(participantId, workStudent, period)
    if (!attempt) return res.status(409).json({ error: 'Учебный период сменился. Обновите страницу перед началом работы.' })
    return res.status(200).json(await responseFor(attempt, language, canRestartAssessment(testId, user), isAdmin(user)))
  }

  if (body.action === 'restart') {
    if (!canRestartAssessment(testId, user)) {
      return res.status(403).json({
        error: midterm
          ? (language === 'kk' ? 'Қайта өту тек әкімшіге қолжетімді.' : 'Повторный запуск рубежного среза доступен только администратору.')
          : (language === 'kk' ? 'Қайта өту тек PRO пайдаланушыларына қолжетімді.' : 'Повторный запуск доступен только пользователям PRO.'),
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
      .where(and(eq(schema.assessmentAttempts.id, attempt.id), eq(schema.assessmentAttempts.assessmentKey, period.key)))
    return res.status(200).json({ status: 'ready' })
  }

  if (!participantId) return res.status(401).json({
    error: language === 'kk' ? 'Студент деректерін қайта енгізіңіз.' : 'Укажите данные студента заново.',
  })
  const attempt = await findAttempt(participantId, period.key)
  if (!attempt) return res.status(409).json({
    error: language === 'kk' ? 'Алдымен бақылау жұмысын бастаңыз.' : 'Сначала начните контрольный срез.',
  })
  if (attempt.submittedAt) return res.status(200).json(await responseFor(attempt, language, canRestartAssessment(testId, user), isAdmin(user)))

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
      ? { score: 0, correctness: emptyCorrectness(variant) }
      : gradeVariant(variant, answers)
    const submittedAt = new Date()
    const [updated] = await db
      .update(schema.assessmentAttempts)
      .set({ answers, score: Math.round(result.score * scale), submittedAt })
      .where(and(eq(schema.assessmentAttempts.id, attempt.id), isNull(schema.assessmentAttempts.submittedAt)))
      .returning()
    const saved = updated ?? await findAttempt(participantId, period.key)
    if (!saved) throw new Error('Attempt disappeared during submission')
    return res.status(200).json(await responseFor(saved, language, canRestartAssessment(testId, user), isAdmin(user)))
  }

  return res.status(400).json({ error: 'Unknown action' })
}

return async function handler(req: VercelRequest, res: VercelResponse) {
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

}

export default createAssessmentHandler()
