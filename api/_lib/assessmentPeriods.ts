import { desc, eq, like, or, sql } from 'drizzle-orm'
import { db, schema, databaseSql } from './db.js'
import { ASSESSMENT_KEY } from './mechanicsAssessment.js'
import { ASSESSMENT_CATALOG } from '../../src/lib/assessmentCatalog.js'

export type Period = { key: string; testId: string; name: string; active: boolean; maxPointsTenths: number; createdAt: string | null; archivedAt: string | null }
const legacyPeriod: Period = { key: ASSESSMENT_KEY, testId: 'mechanics', name: '2026–2027', active: true, maxPointsTenths: 20, createdAt: null, archivedAt: null }
function missingTable(error: unknown): boolean { return !!error && typeof error === 'object' && ('code' in error && error.code === '42P01' || 'cause' in error && missingTable(error.cause)) }
export const periodCondition = (key: string) => or(eq(schema.assessmentAttempts.assessmentKey, key), like(schema.assessmentAttempts.assessmentKey, `${key}-archive-%`), like(schema.assessmentAttempts.assessmentKey, `${key}-s-%`))!

export async function periods() {
  try {
    const rows = await db.select().from(schema.assessmentPeriods).orderBy(desc(schema.assessmentPeriods.createdAt))
    return { available: true, periods: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), archivedAt: r.archivedAt?.toISOString() ?? null })) as Period[] }
  } catch (error) {
    if (!missingTable(error)) throw error
    return { available: false, periods: [legacyPeriod] }
  }
}

export async function currentPeriod(testId = 'mechanics') {
  const result = await periods()
  const current = result.periods.find(p => p.testId === testId && p.active)
  if (!current) throw new Error('No active mechanics period configured')
  return { ...current, available: result.available }
}

export async function periodCatalog() {
  const result = await periods()
  const counts = await db.select({ key: schema.assessmentAttempts.assessmentKey, count: sql<number>`count(*)::int` }).from(schema.assessmentAttempts).groupBy(schema.assessmentAttempts.assessmentKey)
  return { tests: ASSESSMENT_CATALOG, periodsAvailable: result.available, periods: result.periods.map(p => ({ ...p, attemptsCount: counts.filter(c => c.key === p.key || c.key.startsWith(`${p.key}-archive-`) || c.key.startsWith(`${p.key}-s-`)).reduce((sum, c) => sum + c.count, 0) })) }
}

export async function selectedPeriod(key?: string, testId = 'mechanics') {
  if (!key) return currentPeriod(testId)
  const result = await periods()
  return result.periods.find(p => p.key === key && p.testId === testId) ?? null
}

export async function rotatePeriod(expectedKey: string, key: string, name: string, testId = 'mechanics') {
  // Both starting a student attempt and rotating a period take this lock.
  // The second statement gets a fresh ReadCommitted snapshot after waiting,
  // so a concurrent student start cannot slip into an archived period.
  const [, result] = await databaseSql.transaction([
    databaseSql`select pg_advisory_xact_lock(hashtext(${'assessment-period:' + testId}))`,
    rotationQuery(expectedKey, key, name, testId),
  ], { isolationLevel: 'ReadCommitted' })
  return result.length > 0
}

export const rotationQuery = (expectedKey: string, key: string, name: string, testId = 'mechanics') => databaseSql`
    with previous as (
      update assessment_periods set active = false, archived_at = now()
      where key = ${expectedKey} and test_id = ${testId} and active = true
        and not exists (select 1 from assessment_attempts where (assessment_key = ${expectedKey} or assessment_key like ${expectedKey + '-s-%'}) and submitted_at is null and expires_at > now())
        and not exists (select 1 from assessment_sessions s left join assessment_participants p on p.session_id=s.id where s.period_key=${expectedKey} and s.ended_at is null and s.ends_at+coalesce(p.extra_seconds,0)*interval '1 second'>now())
      returning key
    )
    insert into assessment_periods (key, test_id, name, active, max_points_tenths)
    select ${key}, ${testId}, ${name}, true, ${testId === 'midterm' ? 80 : 20} from previous returning key
  `
