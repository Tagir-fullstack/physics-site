import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db, databaseSql, hasDatabaseConfig, schema } from './db.js'
import { getClerkUser, isAdmin, type ClerkUser } from './auth.js'
import { educationOwner } from './educationOwner.js'
import { validateEducation } from '../../src/lib/education.js'

const clean = (v: unknown) => typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, 255) : ''
const classIdFor = (userId: string) => {
  const hex = createHash('sha256').update('physez-education:' + userId).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
async function directory(universityId: string, institution: string) {
  return db.select({ id: schema.educationProfiles.userId, name: schema.educationProfiles.displayName })
    .from(schema.educationProfiles)
    .innerJoin(schema.teacherClasses, and(eq(schema.educationProfiles.defaultClassId, schema.teacherClasses.id), eq(schema.teacherClasses.ownerClerkId, schema.educationProfiles.userId), eq(schema.teacherClasses.archived, false)))
    .where(and(
      isNull(schema.educationProfiles.mergedIntoUserId), eq(schema.educationProfiles.role, 'teacher'), eq(schema.educationProfiles.teacherStatus, 'approved'), eq(schema.educationProfiles.universityId, universityId),
      universityId === 'other' ? sql`lower(${schema.educationProfiles.institution}) = lower(${institution})` : undefined,
    )).orderBy(schema.educationProfiles.displayName)
}
export async function handleEducation(req: VercelRequest, res: VercelResponse) {
  if (!hasDatabaseConfig) return res.status(503).json({ error: 'База данных недоступна. Попробуйте позже.' })
  try {
    if (req.method === 'GET' && req.query.education === 'directory') {
      const universityId = clean(req.query.universityId), institution = clean(req.query.institution)
      if (!universityId || (universityId === 'other' && institution.length < 3)) return res.status(200).json({ teachers: [] })
      return res.status(200).json({ teachers: await directory(universityId, institution) })
    }
    const session = await getClerkUser(req)
    const user = session ? await educationOwner(session) : null
    if (!user) return res.status(401).json({ error: 'Сначала создайте аккаунт или войдите.' })
    if (req.query.education === 'reviews') {
      if (!isAdmin(user)) return res.status(403).json({ error: 'Подтверждение преподавателей доступно только администратору.' })
      const page = Math.floor(Math.max(0, Math.min(10000, Number(req.query.page) || 0)))
      const status = ['pending','approved','rejected'].includes(String(req.query.status)) ? String(req.query.status) : 'pending'
      const requests = await db.select().from(schema.educationProfiles).where(and(eq(schema.educationProfiles.role, 'teacher'), eq(schema.educationProfiles.teacherStatus, status))).orderBy(desc(schema.educationProfiles.updatedAt)).limit(51).offset(page * 50)
      return res.status(200).json({ requests: requests.slice(0,50), hasMore: requests.length > 50 })
    }
    const [existing] = await db.select().from(schema.educationProfiles).where(eq(schema.educationProfiles.userId, user.userId)).limit(1)
    if (req.method === 'GET') {
      if (!existing) return res.status(200).json({ profile: null })
      const available = existing.role === 'student' ? await directory(existing.universityId, existing.institution) : []
      const teacher = available.find(t => t.id === existing.teacherUserId)
      return res.status(200).json({ profile: { userId: user.userId, role: existing.role, universityId: existing.universityId, institution: existing.institution, firstName: existing.firstName, lastName: existing.lastName, displayName: existing.displayName, group: existing.groupName || '', teacherId: existing.teacherUserId || '', teacherName: teacher?.name, teacherStatus: existing.teacherStatus, department: existing.department || '', verificationNote: existing.verificationNote || '', needsTeacher: existing.role === 'student' && available.length > 0 && !teacher } })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!req.headers.authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Обновите сессию.' })
    let raw = req.body
    if (raw === undefined) { const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); raw = Buffer.concat(chunks).toString('utf8') }
    let input: Record<string, unknown>
    try { input = typeof raw === 'string' ? JSON.parse(raw) : raw; if (!input || typeof input !== 'object') throw Error() } catch { return res.status(400).json({ error: 'Неверный формат данных.' }) }
    if (input.action === 'reviewTeacher') {
      if (!isAdmin(user)) return res.status(403).json({ error: 'Подтверждать преподавателей может только администратор.' })
      if (!['approved','rejected'].includes(String(input.status)) || typeof input.userId !== 'string') return res.status(400).json({ error: 'Выберите заявку и решение.' })
      const note = clean(input.note).slice(0,500)
      if (input.status === 'rejected' && note.length < 3) return res.status(400).json({ error: 'Укажите причину отклонения.' })
      const [reviewed] = await db.update(schema.educationProfiles).set({ teacherStatus: String(input.status), verificationNote: note, reviewedBy: user.userId, reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(schema.educationProfiles.userId, input.userId), eq(schema.educationProfiles.role, 'teacher'), eq(schema.educationProfiles.teacherStatus, 'pending'))).returning({ userId: schema.educationProfiles.userId })
      if (!reviewed) return res.status(409).json({ error: 'Заявка уже рассмотрена или не найдена. Обновите список.' })
      return res.status(200).json({ ok: true })
    }
    let draft
    try { draft = validateEducation(input) } catch (e) { return res.status(400).json({ error: (e as Error).message }) }
    if (existing && existing.role !== draft.role) return res.status(409).json({ error: 'Роль уже сохранена. Для её изменения обратитесь в поддержку.' })
    const name = `${draft.lastName} ${draft.firstName}`
    if (draft.role === 'teacher') {
      const department = draft.department || (isAdmin(user) ? 'Администрация' : '')
      const status = isAdmin(user) ? 'approved' : 'pending'
      const classId = existing?.defaultClassId || classIdFor(user.userId)
      // One transaction: a class can never exist without its teacher profile.
      await databaseSql.transaction([
        databaseSql`insert into teacher_classes(id,owner_clerk_id,name,subject,invite_code) values(${classId},${user.userId},${'Студенты · ' + name},'Физика',${randomBytes(6).toString('hex').toUpperCase()}) on conflict(id) do nothing`,
        databaseSql`insert into education_profiles(user_id,role,university_id,institution,display_name,first_name,last_name,default_class_id,department,teacher_status) values(${user.userId},'teacher',${draft.universityId},${draft.institution},${name},${draft.firstName},${draft.lastName},${classId},${department},${status}) on conflict(user_id) do update set university_id=excluded.university_id,institution=excluded.institution,display_name=excluded.display_name,first_name=excluded.first_name,last_name=excluded.last_name,default_class_id=excluded.default_class_id,department=excluded.department,teacher_status=case when ${isAdmin(user)} then 'approved' when education_profiles.teacher_status='rejected' then 'pending' when education_profiles.university_id=excluded.university_id and education_profiles.institution=excluded.institution and education_profiles.display_name=excluded.display_name and coalesce(education_profiles.department,'')=excluded.department then education_profiles.teacher_status else 'pending' end,updated_at=now()`,
      ])
    } else {
      const teachers = await directory(draft.universityId, draft.institution)
      if (teachers.length && !draft.teacherId) return res.status(400).json({ error: 'Выберите своего преподавателя.' })
      if (draft.teacherId && !teachers.some(t => t.id === draft.teacherId)) return res.status(400).json({ error: 'Преподаватель не найден в выбранном вузе.' })
      const [teacher] = draft.teacherId ? await db.select().from(schema.educationProfiles).where(and(eq(schema.educationProfiles.userId, draft.teacherId), eq(schema.educationProfiles.role, 'teacher'), eq(schema.educationProfiles.universityId, draft.universityId), draft.universityId === 'other' ? sql`lower(${schema.educationProfiles.institution}) = lower(${draft.institution})` : undefined)).limit(1) : []
      if (draft.teacherId && !teacher) return res.status(409).json({ error: 'Список преподавателей изменился. Выберите преподавателя заново.' })
      if (teacher && !teacher.defaultClassId) return res.status(409).json({ error: 'Преподаватель ещё не открыл регистрацию студентов.' })
      // Binding is stored on the server; names or client metadata never grant access.
      const identity = 'account|' + user.userId
      const tokenHash = createHash('sha256').update(randomBytes(32)).digest('hex')
      const classId = teacher?.defaultClassId || null
      const queries = classId ? [databaseSql`insert into class_students(id,class_id,last_name,first_name,group_name,normalized_identity,join_token_hash) values(${randomUUID()},${classId},${draft.lastName},${draft.firstName},${draft.group},${identity},${tokenHash}) on conflict(class_id,normalized_identity) do update set last_name=excluded.last_name,first_name=excluded.first_name,group_name=excluded.group_name,last_seen_at=now(),active=true`] : []
      queries.push(databaseSql`insert into education_profiles(user_id,role,university_id,institution,display_name,first_name,last_name,group_name,teacher_user_id,class_student_id) values(${user.userId},'student',${draft.universityId},${draft.institution},${name},${draft.firstName},${draft.lastName},${draft.group},${draft.teacherId || null},(select id from class_students where class_id=${classId} and normalized_identity=${identity})) on conflict(user_id) do update set university_id=excluded.university_id,institution=excluded.institution,display_name=excluded.display_name,first_name=excluded.first_name,last_name=excluded.last_name,group_name=excluded.group_name,teacher_user_id=excluded.teacher_user_id,class_student_id=excluded.class_student_id,updated_at=now()`)
      await databaseSql.transaction(queries)
    }
    return res.status(200).json({ ok: true, role: draft.role, linked: Boolean(draft.teacherId) })
  } catch (e) {
    console.error('Education profile request failed', e instanceof Error ? e.name : 'UnknownError')
    return res.status(503).json({ error: 'Не удалось сохранить учебный профиль. Попробуйте ещё раз.' })
  }
}

export async function isRegisteredStudent(userId: string) {
  const [profile] = await db.select({ role: schema.educationProfiles.role }).from(schema.educationProfiles).where(eq(schema.educationProfiles.userId, userId)).limit(1)
  return profile?.role === 'student'
}

export async function canTeach(user: ClerkUser) {
  if (isAdmin(user)) return true
  user = await educationOwner(user)
  const [profile] = await db.select({ role: schema.educationProfiles.role, status: schema.educationProfiles.teacherStatus }).from(schema.educationProfiles).where(eq(schema.educationProfiles.userId, user.userId)).limit(1)
  return profile?.role === 'teacher' && profile.status === 'approved'
}
