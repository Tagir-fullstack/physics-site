import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, isNull, sql as drizzleSql } from 'drizzle-orm'
import { db, databaseSql as sql, schema } from './db.js'
import { isAdmin, type ClerkUser } from './auth.js'
import { sameOrigin } from './studentProfile.js'
import { currentPeriod, selectedPeriod } from './assessmentPeriods.js'
import type { AssessmentLanguage, StudentIdentity } from './mechanicsAssessment.js'
import { isAssessmentGroup } from '../../src/lib/monitorGrading.js'

type TestId = 'mechanics' | 'midterm'
type Session = typeof schema.assessmentSessions.$inferSelect
type Member = typeof schema.assessmentParticipants.$inferSelect
type Attempt = typeof schema.assessmentAttempts.$inferSelect
type Answers = Record<string, Record<string, string | number>>
type Engine = {
  create: () => object; fingerprint: (variant: never) => string; code: () => string
  grade: (variant: never, answers: Answers) => { score: number }; scale: number
  respond: (attempt: Attempt, language: AssessmentLanguage) => Promise<unknown>
  student: (value: unknown) => StudentIdentity | null
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const cookieName = (testId: TestId) => `physez_exam_${testId}`
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)
const sessionKey = (s: Session) => `${s.periodKey}-s-${s.id}`
export const sessionDeadline = (s: Session, member: Member) => new Date(Math.min(s.endsAt.getTime() + member.extraSeconds * 1000, s.endedAt?.getTime() ?? Infinity))
const identityHash = (student: StudentIdentity) => hash([student.lastName, student.firstName, student.group].map(v => v.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru')).join('|'))
function setCookie(res: VercelResponse, testId: TestId, id: string, secret: string) {
  res.setHeader('Set-Cookie', `${cookieName(testId)}=${id}.${secret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.VERCEL_ENV === 'production' ? '; Secure' : ''}`)
}
export async function accessSettings(periodKey: string, testId: TestId) {
  const [row] = await db.select().from(schema.assessmentAccessSettings).where(eq(schema.assessmentAccessSettings.periodKey, periodKey)).limit(1)
  return { sessionsRequired: row?.sessionsRequired ?? testId === 'midterm', revealAt: row?.revealAt ?? null }
}
export async function attemptRelease(attempt: Attempt, testId: TestId) {
  const key = attempt.assessmentKey.replace(/-archive-.+$/, '').replace(/-s-.+$/, '')
  const policy = await accessSettings(key, testId)
  return { ...policy, released: !policy.sessionsRequired || Boolean(policy.revealAt && policy.revealAt.getTime() <= Date.now()) }
}
export async function finalizeExpiredSessionAttempts(periodKey: string, engine: Pick<Engine, 'grade' | 'scale'>) {
  const rows = await db.select({ attempt: schema.assessmentAttempts, session: schema.assessmentSessions, member: schema.assessmentParticipants })
    .from(schema.assessmentAttempts)
    .innerJoin(schema.assessmentParticipants, drizzleSql`${schema.assessmentAttempts.clerkUserId}='session_'||${schema.assessmentParticipants.id}::text`)
    .innerJoin(schema.assessmentSessions, and(eq(schema.assessmentParticipants.sessionId, schema.assessmentSessions.id), drizzleSql`${schema.assessmentAttempts.assessmentKey}=${schema.assessmentSessions.periodKey}||'-s-'||${schema.assessmentSessions.id}::text`))
    .where(and(eq(schema.assessmentSessions.periodKey, periodKey), isNull(schema.assessmentAttempts.submittedAt), drizzleSql`now()>=least(${schema.assessmentSessions.endsAt}+${schema.assessmentParticipants.extraSeconds}*interval '1 second',coalesce(${schema.assessmentSessions.endedAt},'infinity'::timestamptz))`))
  for (const { attempt, session, member } of rows) {
    const answers = (attempt.answers ?? {}) as Answers
    const score = Math.round(engine.grade(attempt.variantData as never, answers).score * engine.scale)
    // Serialize against extensions, early termination and in-flight autosaves.
    await sql.transaction([
      sql`select id from assessment_sessions where id=${session.id}::uuid for update`,
      sql`update assessment_attempts a set score=${score},submitted_at=least(s.ends_at+p.extra_seconds*interval '1 second',coalesce(s.ended_at,'infinity'::timestamptz)),expires_at=least(s.ends_at+p.extra_seconds*interval '1 second',coalesce(s.ended_at,'infinity'::timestamptz))
        from assessment_participants p join assessment_sessions s on s.id=p.session_id
        where a.id=${attempt.id}::uuid and a.submitted_at is null and coalesce(a.answers,'{}'::jsonb)=${JSON.stringify(answers)}::jsonb
        and p.id=${member.id}::uuid and now()>=least(s.ends_at+p.extra_seconds*interval '1 second',coalesce(s.ended_at,'infinity'::timestamptz))`,
    ], { isolationLevel: 'ReadCommitted' })
  }
}
async function participant(req: VercelRequest, testId: TestId, user: ClerkUser | null) {
  const token = req.cookies?.[cookieName(testId)]
  if (typeof token !== 'string' || !/^[a-f0-9-]{36}\.[A-Za-z0-9_-]{32}$/.test(token)) return null
  const [id, secret] = token.split('.')
  if (!uuid(id)) return null
  const [found] = await db.select({ member: schema.assessmentParticipants, session: schema.assessmentSessions }).from(schema.assessmentParticipants)
    .innerJoin(schema.assessmentSessions, eq(schema.assessmentParticipants.sessionId, schema.assessmentSessions.id))
    .where(and(eq(schema.assessmentParticipants.id, id), eq(schema.assessmentSessions.testId, testId))).limit(1)
  if (!found || !timingSafeEqual(Buffer.from(found.member.tokenHash, 'hex'), Buffer.from(hash(secret), 'hex'))) return null
  if (user && found.member.clerkUserId && user.userId !== found.member.clerkUserId) return null
  return found
}
async function existingAttempt(s: Session, m: Member) {
  const [attempt] = await db.select().from(schema.assessmentAttempts).where(and(eq(schema.assessmentAttempts.assessmentKey, sessionKey(s)), eq(schema.assessmentAttempts.clerkUserId, `session_${m.id}`))).limit(1)
  return attempt
}
async function entry(req: VercelRequest, testId: TestId, user: ClerkUser | null) {
  const context = await participant(req, testId, user)
  const period = await currentPeriod(testId)
  const policy = await accessSettings(context?.session.periodKey ?? period.key, testId)
  const base = { mode: policy.sessionsRequired ? 'session' : 'legacy', canPractice: isAdmin(user), serverNow: new Date().toISOString(), revealAt: policy.revealAt?.toISOString() ?? null,
    released: !policy.sessionsRequired || Boolean(policy.revealAt && policy.revealAt.getTime() <= Date.now()) }
  if (!context) return { ...base, phase: 'code' }
  const { session: s, member: m } = context
  const deadline = sessionDeadline(s, m)
  const attempt = await existingAttempt(s, m)
  const phase = m.status === 'rejected' ? 'rejected' : s.endedAt || Date.now() >= deadline.getTime()
    ? (m.status === 'admitted' && attempt ? 'active' : 'closed')
    : m.status === 'pending' ? 'pending' : Date.now() < s.startsAt.getTime() ? 'waiting' : 'active'
  return { ...base, mode: 'session', phase, participantId: m.id, student: m.student, session: { id: s.id, name: s.name, startsAt: s.startsAt.toISOString(), endsAt: deadline.toISOString() } }
}
function validDate(value: unknown) { if (typeof value !== 'string') return null; const d = new Date(value); return Number.isFinite(d.getTime()) ? d : null }
const clean = (value: unknown, length: number) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, length) : ''

async function adminAction(body: Record<string, unknown>, testId: TestId, user: ClerkUser, res: VercelResponse) {
  const period = await selectedPeriod(typeof body.period === 'string' ? body.period : undefined, testId)
  if (!period) return res.status(404).json({ error: 'Учебный период не найден.' })
  if (body.action === 'saveReveal') {
    const date = body.revealAt === null || body.revealAt === '' ? null : validDate(body.revealAt)
    if (body.revealAt && !date) return res.status(400).json({ error: 'Проверьте дату открытия результатов.' })
    const [, saved] = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'assessment-session-policy:' + period.key}))`,
      sql`insert into assessment_access_settings(period_key,sessions_required,reveal_at) select ${period.key},true,${date?.toISOString() ?? null}::timestamptz
        where ${date?.toISOString() ?? null}::timestamptz is null or not exists (
          select 1 from assessment_sessions s left join assessment_participants p on p.session_id=s.id where s.period_key=${period.key}
          and least(s.ends_at + coalesce(p.extra_seconds,0)*interval '1 second',coalesce(s.ended_at,'infinity'::timestamptz)) > ${date?.toISOString() ?? null}::timestamptz)
        on conflict(period_key) do update set reveal_at=excluded.reveal_at,sessions_required=true,updated_at=now() returning period_key`,
    ])
    return saved.length ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Разбор нельзя открыть раньше завершения всех сеансов и индивидуальных допусков.' })
  }
  if (body.action === 'createSession') {
    if (!period.active) return res.status(409).json({ error: 'В архивном периоде нельзя создавать сеанс.' })
    const opens = validDate(body.opensAt), starts = validDate(body.startsAt), minutes = Number(body.durationMinutes), name = clean(body.name, 120)
    if (!opens || !starts || opens > starts || starts.getTime() <= Date.now() || !Number.isInteger(minutes) || minutes < 1 || minutes > 180 || name.length < 2) return res.status(400).json({ error: 'Укажите название, время входа и будущего старта, длительность 1–180 минут.' })
    const ends = new Date(starts.getTime() + minutes * 60_000), id = randomUUID()
    for (let tries = 0; tries < 8; tries++) {
      const code = String(randomInt(100000, 1000000))
      const [, , , saved] = await sql.transaction([
        sql`select pg_advisory_xact_lock(hashtext('assessment-session-short-code'))`,
        sql`select pg_advisory_xact_lock(hashtext(${'assessment-session-policy:' + period.key}))`,
        sql`insert into assessment_access_settings(period_key,sessions_required) values(${period.key},true) on conflict(period_key) do update set sessions_required=true`,
        sql`insert into assessment_sessions(id,period_key,test_id,name,code,opens_at,starts_at,ends_at,duration_minutes,created_by)
          select ${id}::uuid,${period.key},${testId},${name},${code},${opens.toISOString()}::timestamptz,${starts.toISOString()}::timestamptz,${ends.toISOString()}::timestamptz,${minutes},${user.userId}
          where not exists(select 1 from assessment_access_settings where period_key=${period.key} and reveal_at is not null and reveal_at < ${ends.toISOString()}::timestamptz) on conflict(code) do nothing returning id`,
      ], { isolationLevel: 'ReadCommitted' })
      if (saved.length) return res.status(201).json({ ok: true, id, code })
      const [collision] = await db.select({ id: schema.assessmentSessions.id }).from(schema.assessmentSessions).where(eq(schema.assessmentSessions.code, code)).limit(1)
      if (!collision) return res.status(409).json({ error: 'Сначала перенесите открытие результатов на время после окончания нового сеанса.' })
    }
    return res.status(409).json({ error: 'Не удалось подобрать свободный код. Попробуйте ещё раз.' })
  }
  if (!uuid(body.sessionId)) return res.status(400).json({ error: 'Укажите сеанс.' })
  const [s] = await db.select().from(schema.assessmentSessions).where(and(eq(schema.assessmentSessions.id, body.sessionId), eq(schema.assessmentSessions.periodKey, period.key), eq(schema.assessmentSessions.testId, testId))).limit(1)
  if (!s) return res.status(404).json({ error: 'Сеанс не найден в выбранном периоде.' })
  if (body.action === 'shortenSessionCode') {
    if (!period.active) return res.status(409).json({ error: 'Архивный сеанс нельзя менять.' })
    for (let tries = 0; tries < 8; tries++) {
      const code = String(randomInt(100000, 1000000))
      const [, , rows] = await sql.transaction([
        sql`select pg_advisory_xact_lock(hashtext('assessment-session-short-code'))`,
        sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
        sql`update assessment_sessions set code=${code} where id=${s.id}::uuid and starts_at>now() and ended_at is null and length(code)>6
          and not exists(select 1 from assessment_sessions where code=${code}) returning code`,
      ], { isolationLevel: 'ReadCommitted' })
      if (rows.length) return res.status(200).json({ ok: true, code })
      const [collision] = await db.select({ id: schema.assessmentSessions.id }).from(schema.assessmentSessions).where(eq(schema.assessmentSessions.code, code)).limit(1)
      if (!collision) return res.status(409).json({ error: 'Код уже короткий или сеанс начался/завершился.' })
    }
    return res.status(409).json({ error: 'Не удалось подобрать свободный код. Попробуйте ещё раз.' })
  }
  if (body.action === 'updateEntryTime') {
    const opens = validDate(body.opensAt)
    if (!opens) return res.status(400).json({ error: 'Укажите корректное время открытия входа.' })
    if (!period.active) return res.status(409).json({ error: 'В архивном периоде нельзя менять время входа.' })
    const [, rows] = await sql.transaction([
      sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
      sql`update assessment_sessions set opens_at=${opens.toISOString()}::timestamptz
        where id=${s.id}::uuid and ended_at is null and starts_at>now() and ${opens.toISOString()}::timestamptz<=starts_at returning id`,
    ], { isolationLevel: 'ReadCommitted' })
    return rows.length ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Время входа нельзя установить позже старта или изменить в уже начатом/завершённом сеансе.' })
  }
  if (body.action === 'startSession') {
    const [, , rows] = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'assessment-session-policy:' + period.key}))`,
      sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
      sql`update assessment_sessions set opens_at=least(opens_at,now()),starts_at=now(),ends_at=now()+duration_minutes*interval '1 minute'
        where id=${s.id}::uuid and ended_at is null and starts_at>now()
        and not exists(select 1 from assessment_access_settings where period_key=${period.key} and reveal_at is not null and reveal_at<now()+${s.durationMinutes}*interval '1 minute') returning id`,
    ])
    return rows.length ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Сеанс уже начат/завершён или дата открытия результатов слишком ранняя.' })
  }
  if (body.action === 'endSession') {
    const [, rows] = await sql.transaction([sql`select id from assessment_sessions where id=${s.id}::uuid for update`, sql`update assessment_sessions set ended_at=now() where id=${s.id}::uuid and ended_at is null returning id`])
    return res.status(200).json({ ok: true, changed: rows.length > 0 })
  }
  if (!uuid(body.participantId)) return res.status(400).json({ error: 'Укажите студента.' })
  if (body.action === 'restoreParticipant') {
    if (!period.active) return res.status(409).json({ error: 'Нельзя вернуть допуск в архивном периоде.' })
    const [, rows] = await sql.transaction([
      sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
      sql`update assessment_participants p set status='admitted',decided_at=now(),decided_by=${user.userId}
        from assessment_sessions s where p.id=${body.participantId}::uuid and p.session_id=s.id and s.id=${s.id}::uuid
        and p.status='rejected' and s.ended_at is null and s.ends_at+p.extra_seconds*interval '1 second'>now()
        and not exists(select 1 from assessment_attempts a where a.assessment_key=${sessionKey(s)} and a.clerk_user_id='session_'||p.id::text and a.submitted_at is not null)
        returning p.id`,
    ], { isolationLevel: 'ReadCommitted' })
    return rows.length ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Допуск уже изменён, работа сдана или время участия истекло. Завершённый сеанс нельзя открыть заново.' })
  }
  if (body.action === 'revokeParticipant') {
    const [, rows] = await sql.transaction([
      sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
      sql`update assessment_participants p set status='rejected',decided_at=now(),decided_by=${user.userId}
        from assessment_sessions s where p.id=${body.participantId}::uuid and p.session_id=s.id and s.id=${s.id}::uuid
        and p.status='admitted' and s.ended_at is null and s.ends_at+p.extra_seconds*interval '1 second'>now()
        and not exists(select 1 from assessment_attempts a where a.assessment_key=${sessionKey(s)} and a.clerk_user_id='session_'||p.id::text and a.submitted_at is not null)
        returning p.id`,
    ], { isolationLevel: 'ReadCommitted' })
    return rows.length ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Допуск уже отозван, работа сдана или время участия истекло.' })
  }
  if (body.action === 'decideParticipant') {
    const status = body.admit === true ? 'admitted' : 'rejected'
    const [, rows] = await sql.transaction([
      sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
      sql`update assessment_participants p set status=${status},decided_at=now(),decided_by=${user.userId}
        from assessment_sessions s where p.id=${body.participantId}::uuid and p.session_id=s.id and s.id=${s.id}::uuid and p.status='pending'
        and s.ended_at is null and s.ends_at>now() returning p.id`,
    ])
    return rows.length ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Заявка уже обработана или сеанс завершён.' })
  }
  if (body.action === 'extendParticipant') {
    const minutes = Number(body.minutes), reason = clean(body.reason, 300)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180 || reason.length < 5) return res.status(400).json({ error: 'Укажите 1–180 дополнительных минут и причину (не менее 5 символов).' })
    const [, , rows] = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'assessment-session-policy:' + period.key}))`,
      sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
      sql`update assessment_participants p set extra_seconds=extra_seconds+${minutes * 60},extension_reason=${reason},decided_at=now(),decided_by=${user.userId}
        from assessment_sessions s where p.id=${body.participantId}::uuid and p.session_id=s.id and s.id=${s.id}::uuid and p.status='admitted' and s.ended_at is null and extra_seconds+${minutes * 60}<=10800
        and not exists(select 1 from assessment_attempts where assessment_key=${sessionKey(s)} and clerk_user_id='session_'||p.id::text and submitted_at is not null)
        and not exists(select 1 from assessment_access_settings where period_key=${period.key} and reveal_at is not null and reveal_at<s.ends_at+(p.extra_seconds+${minutes * 60})*interval '1 second') returning p.id`,
      sql`update assessment_attempts a set expires_at=s.ends_at+p.extra_seconds*interval '1 second' from assessment_participants p join assessment_sessions s on s.id=p.session_id
        where p.id=${body.participantId}::uuid and s.id=${s.id}::uuid and a.assessment_key=${sessionKey(s)} and a.clerk_user_id='session_'||p.id::text and a.submitted_at is null`,
    ])
    return rows.length ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Работа уже сдана, сеанс завершён, превышен лимит или продление выходит за дату открытия результатов.' })
  }
  return res.status(400).json({ error: 'Неизвестное действие сеанса.' })
}

const adminActions = new Set(['createSession', 'saveReveal', 'updateEntryTime', 'shortenSessionCode', 'startSession', 'endSession', 'decideParticipant', 'revokeParticipant', 'restoreParticipant', 'extendParticipant'])
export async function handleSessionRequest(req: VercelRequest, res: VercelResponse, body: Record<string, unknown>, testId: TestId, user: ClerkUser | null, engine: Engine): Promise<boolean> {
  if (req.method !== 'GET' && req.method !== 'POST') return false
  const language: AssessmentLanguage = body.language === 'kk' || req.query.lang === 'kk' ? 'kk' : 'ru'
  const kk = language === 'kk'
  if (req.method === 'GET' && req.query.view === 'sessions') {
    if (!isAdmin(user)) { res.status(403).json({ error: 'Сеансы доступны только администратору.' }); return true }
    const period = await selectedPeriod(typeof req.query.period === 'string' ? req.query.period : undefined, testId)
    if (!period) { res.status(404).json({ error: 'Период не найден.' }); return true }
    await finalizeExpiredSessionAttempts(period.key, engine)
    const sessions = await db.select().from(schema.assessmentSessions).where(eq(schema.assessmentSessions.periodKey, period.key)).orderBy(desc(schema.assessmentSessions.createdAt))
    const members = await db.select({ member: schema.assessmentParticipants, submittedAt: schema.assessmentAttempts.submittedAt }).from(schema.assessmentParticipants).innerJoin(schema.assessmentSessions, eq(schema.assessmentParticipants.sessionId, schema.assessmentSessions.id)).leftJoin(schema.assessmentAttempts, drizzleSql`${schema.assessmentAttempts.clerkUserId}='session_'||${schema.assessmentParticipants.id}::text and ${schema.assessmentAttempts.assessmentKey}=${schema.assessmentSessions.periodKey}||'-s-'||${schema.assessmentSessions.id}::text`).where(eq(schema.assessmentSessions.periodKey, period.key))
    res.status(200).json({ serverNow: new Date().toISOString(), ...(await accessSettings(period.key, testId)), sessions: sessions.map(s => ({ ...s, participants: members.filter(m => m.member.sessionId === s.id).map(({ member: m, submittedAt }) => ({ id: m.id, student: m.student, status: m.status, submittedAt, joinedAt: m.joinedAt, extraSeconds: m.extraSeconds, extensionReason: m.extensionReason, expiresAt: sessionDeadline(s, m) })) })) }); return true
  }
  if (req.method === 'POST' && adminActions.has(String(body.action))) {
    if (!isAdmin(user) || !req.headers.authorization?.startsWith('Bearer ') || !sameOrigin(req)) { res.status(403).json({ error: 'Нужна подтверждённая сессия администратора.' }); return true }
    await adminAction(body, testId, user!, res); return true
  }
  if (req.method === 'GET' && req.query.view === 'entry') { res.status(200).json(await entry(req, testId, user)); return true }
  if (req.method === 'GET' && req.query.view || req.method === 'POST' && !['joinSession', 'resume', 'start', 'progress', 'submit', 'event', 'restart'].includes(String(body.action))) return false
  const context = await participant(req, testId, user)
  if (isAdmin(user) && (body.practice === true || req.query.practice === '1' || !context && body.action !== 'joinSession')) return false
  const current = await currentPeriod(testId)
  const policy = await accessSettings(context?.session.periodKey ?? current.key, testId)
  if (!policy.sessionsRequired && body.action !== 'joinSession') return false
  if (req.method === 'POST' && !sameOrigin(req)) { res.status(403).json({ error: 'Origin mismatch' }); return true }
  if (req.method === 'POST' && body.action === 'joinSession') {
    const code = clean(body.code, 20).replace(/\s/g, '').toUpperCase(), student = engine.student(body.student)
    if (!student || !/^(?:\d{6}|[A-F0-9]{12})$/.test(code)) { res.status(400).json({ error: kk ? 'Деректер мен сеанс кодын тексеріңіз.' : 'Проверьте ФИО, группу и код сеанса (6 цифр; прежние 12-значные коды тоже работают).' }); return true }
    if (!isAssessmentGroup(student.group)) { res.status(400).json({ error: kk ? 'Тізімнен ОП таңдаңыз: B062, B063, B064, B076 немесе B057.' : 'Выберите ОП из списка: B062, B063, B064, B076 или B057.' }); return true }
    const [s] = await db.select().from(schema.assessmentSessions).where(and(eq(schema.assessmentSessions.code, code), eq(schema.assessmentSessions.testId, testId), eq(schema.assessmentSessions.periodKey, current.key))).limit(1)
    if (!s) { res.status(404).json({ error: kk ? 'Сеанс табылмады.' : 'Сеанс с таким кодом не найден.' }); return true }
    const secret = randomBytes(24).toString('base64url'), id = randomUUID()
    if (context?.session.id === s.id) { res.status(200).json(await entry(req, testId, user)); return true }
    const [, rows] = await sql.transaction([
      sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
      sql`insert into assessment_participants(id,session_id,student,identity_hash,clerk_user_id,token_hash,status)
        select ${id}::uuid,id,${JSON.stringify(student)}::jsonb,${identityHash(student)},${user?.userId ?? null},${hash(secret)},case when now()<starts_at then 'admitted' else 'pending' end
        from assessment_sessions where id=${s.id}::uuid and now()>=opens_at and now()<ends_at and ended_at is null
        on conflict do nothing returning id`,
    ])
    let memberId = rows[0]?.id as string | undefined
    if (!memberId && user) {
      const [restored] = await db.update(schema.assessmentParticipants).set({ tokenHash: hash(secret) }).where(and(eq(schema.assessmentParticipants.sessionId, s.id), eq(schema.assessmentParticipants.clerkUserId, user.userId))).returning({ id: schema.assessmentParticipants.id })
      memberId = restored?.id
    }
    if (!memberId) { res.status(409).json({ error: kk ? 'Кіру әлі ашылмаған, аяқталған немесе бұл қатысушы тіркелген. Бұрынғы браузерді пайдаланыңыз не оқытушыға хабарласыңыз.' : 'Вход ещё не открыт, уже закрыт или такой участник зарегистрирован. Используйте прежний браузер либо обратитесь к преподавателю.' }); return true }
    setCookie(res, testId, memberId, secret)
    req.cookies = { ...req.cookies, [cookieName(testId)]: `${memberId}.${secret}` }
    res.status(200).json(await entry(req, testId, user)); return true
  }
  if (!context) { res.status(req.method === 'GET' || body.action === 'resume' ? 200 : 403).json(req.method === 'GET' || body.action === 'resume' ? { status: 'locked' } : { error: kk ? 'Алдымен сеанс кодымен күту залына кіріңіз.' : 'Сначала войдите в зал ожидания по коду сеанса.' }); return true }
  const { session: s, member: m } = context
  if (m.status !== 'admitted' || Date.now() < s.startsAt.getTime()) { res.status(200).json({ status: 'locked' }); return true }
  const deadline = sessionDeadline(s, m)
  let attempt = await existingAttempt(s, m)
  if (!attempt && Date.now() < deadline.getTime()) {
    for (let tries = 0; tries < 8 && !attempt; tries++) {
      const variant = { ...engine.create(), student: m.student, penaltyPolicy: { version: 1 }, examSessionId: s.id, examParticipantId: m.id }
      await sql.transaction([
        sql`select id from assessment_sessions where id=${s.id}::uuid for update`,
        sql`insert into assessment_attempts(assessment_key,clerk_user_id,variant_code,variant_fingerprint,variant_data,started_at,expires_at,violations)
          select ${sessionKey(s)},${'session_' + m.id},${engine.code()},${engine.fingerprint(variant as never)},${JSON.stringify(variant)}::jsonb,s.starts_at,s.ends_at+p.extra_seconds*interval '1 second','[]'::jsonb
          from assessment_sessions s join assessment_participants p on p.session_id=s.id where s.id=${s.id}::uuid and p.id=${m.id}::uuid and p.status='admitted' and now()>=s.starts_at and now()<s.ends_at+p.extra_seconds*interval '1 second' and s.ended_at is null
          on conflict do nothing`,
      ])
      attempt = await existingAttempt(s, m)
    }
  }
  if (!attempt) { res.status(200).json({ status: 'locked' }); return true }
  if (body.action === 'restart') { res.status(403).json({ error: 'В учебном сеансе нельзя начать работу заново. Тестовый режим администратора открывается отдельно.' }); return true }
  // The server deadline, not the browser clock or the supplied identity, controls every write.
  if (!attempt.submittedAt && Date.now() >= deadline.getTime()) {
    await finalizeExpiredSessionAttempts(s.periodKey, engine)
    attempt = await existingAttempt(s, m) ?? attempt
  }
  if (attempt.submittedAt || req.method === 'GET' || ['resume', 'start'].includes(String(body.action))) { res.status(200).json(await engine.respond(attempt, language)); return true }
  const writeGuard = sql`id=${attempt.id}::uuid and submitted_at is null and exists(select 1 from assessment_sessions s join assessment_participants p on p.session_id=s.id where s.id=${s.id}::uuid and p.id=${m.id}::uuid and p.status='admitted' and s.ended_at is null and now()<s.ends_at+p.extra_seconds*interval '1 second')`
  if (body.action === 'progress' || body.action === 'submit') {
    const answers = body.answers && typeof body.answers === 'object' ? body.answers as Answers : {}
    const score = body.action === 'submit' ? Math.round(engine.grade(attempt.variantData as never, answers).score * engine.scale) : null
    await sql.transaction([sql`select id from assessment_sessions where id=${s.id}::uuid for update`, sql`update assessment_attempts set answers=${JSON.stringify(answers)}::jsonb,score=coalesce(${score}::smallint,score),submitted_at=case when ${body.action === 'submit'} then now() else submitted_at end where ${writeGuard}`], { isolationLevel: 'ReadCommitted' })
  } else if (body.action === 'event') {
    const allowed = ['tab-hidden','fullscreen-exit','copy','cut','paste','context-menu','print-shortcut','navigation-attempt']
    if (typeof body.eventType !== 'string' || !allowed.includes(body.eventType)) { res.status(400).json({ error: 'Unknown event' }); return true }
    await sql.transaction([sql`select id from assessment_sessions where id=${s.id}::uuid for update`, sql`update assessment_attempts set violations=coalesce(violations,'[]'::jsonb)||${JSON.stringify([{ type: body.eventType, at: new Date().toISOString() }])}::jsonb where ${writeGuard}`], { isolationLevel: 'ReadCommitted' })
  }
  const saved = await existingAttempt(s, m)
  if (body.action === 'event') {
    const response = await engine.respond(saved ?? attempt, language) as Record<string, unknown>
    res.status(200).json({ ok: true, penaltyPoints: response.penaltyPoints, violationsCount: response.violationsCount, expiresAt: deadline.toISOString(), serverNow: new Date().toISOString() }); return true
  }
  res.status(200).json(body.action === 'submit' ? await engine.respond(saved ?? attempt, language) : { ok: true, expiresAt: deadline.toISOString(), serverNow: new Date().toISOString() }); return true
}
