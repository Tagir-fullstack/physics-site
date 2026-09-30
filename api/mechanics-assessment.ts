import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, eq } from 'drizzle-orm'
import { db, schema } from './_lib/db'
import { getClerkUser } from './_lib/auth'
import {
  ASSESSMENT_DURATION_MS,
  ASSESSMENT_KEY,
  createVariant,
  createVariantCode,
  gradeVariant,
  publicTasks,
  variantFingerprint,
  type MechanicsVariant,
} from './_lib/mechanicsAssessment'

type Answers = Record<string, Record<string, string | number>>
type Violation = { type: string; at: string }

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

function bodyOf(req: VercelRequest): Record<string, unknown> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
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

function responseFor(attempt: NonNullable<Awaited<ReturnType<typeof findAttempt>>>) {
  const variant = attempt.variantData as MechanicsVariant
  const base = {
    attemptId: attempt.id,
    variantCode: attempt.variantCode,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    serverNow: new Date().toISOString(),
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
    tasks: publicTasks(variant),
    violationsCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
  }
}

async function startAttempt(userId: string) {
  const existing = await findAttempt(userId)
  if (existing) return existing

  for (let tries = 0; tries < 8; tries += 1) {
    const variant = createVariant()
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const user = await getClerkUser(req)
  if (!user) return res.status(401).json({ error: 'Войдите в аккаунт, чтобы пройти срез.' })

  if (req.method === 'GET') {
    const attempt = await findAttempt(user.userId)
    return res.status(200).json(attempt ? responseFor(attempt) : { status: 'ready' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = bodyOf(req)

  if (body.action === 'start') {
    const attempt = await startAttempt(user.userId)
    return res.status(200).json(responseFor(attempt))
  }

  const attempt = await findAttempt(user.userId)
  if (!attempt) return res.status(409).json({ error: 'Сначала начните контрольный срез.' })
  if (attempt.submittedAt) return res.status(200).json(responseFor(attempt))

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
    return res.status(200).json(responseFor(updated))
  }

  return res.status(400).json({ error: 'Unknown action' })
}
