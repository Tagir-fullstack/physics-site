import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, databaseSql as sql, schema } from './db.js'
import { deleteStudentLogin, isAdmin, type ClerkUser } from './auth.js'
import { isAccountRevoked, revokeAccount } from './accountRevocation.js'
import { sameOrigin } from './studentProfile.js'

export async function deleteStudent(req: VercelRequest, res: VercelResponse, account: ClerkUser | null, body: Record<string, unknown>) {
  if (!isAdmin(account) || !req.headers.authorization?.startsWith('Bearer ')) return res.status(403).json({ error: 'Удалять студентов может только администратор с подтверждённой сессией.' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Запрос с другого сайта запрещён.' })
  if (typeof body.studentId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.studentId)) return res.status(400).json({ error: 'Выберите студента.' })
  const [student] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.id, body.studentId)).limit(1)
  if (!student) return res.status(404).json({ error: 'Профиль уже удалён или не найден.' })
  if (body.confirmation !== `УДАЛИТЬ ${student.variantNumber}`) return res.status(400).json({ error: 'Введите подтверждение с номером выбранного студента.' })
  const userId = student.clerkId
  if (userId) {
    if (userId === account!.userId || isAdmin({ userId, email: '', isPremium: false })) return res.status(403).json({ error: 'Свой аккаунт и аккаунты администраторов удалять здесь нельзя.' })
    const [education] = await db.select().from(schema.educationProfiles).where(eq(schema.educationProfiles.userId, userId)).limit(1)
    const [user] = await db.select().from(schema.users).where(eq(schema.users.clerkId, userId)).limit(1)
    if (education?.role === 'teacher' || user?.role === 'teacher' || user?.role === 'admin') return res.status(403).json({ error: 'Преподавателя или администратора нельзя удалить из списка студентов.' })
    const [billing] = await sql`select exists(select 1 from billing_orders where user_id=${userId} and status in ('created','pending','dispatching','unknown','requires_action')) as busy`
    if (billing.busy) return res.status(409).json({ error: 'Сначала дождитесь завершения текущего платежа студента.' })
    // Disable renewal before removing the login. A retry also handles an already deleted Clerk user.
    try { await deleteStudentLogin(userId, () => sql`update billing_subscriptions set auto_renew=false, card_cipher=null, cancel_version=cancel_version+1 where user_id=${userId}`, await isAccountRevoked(userId)); await revokeAccount(userId) }
    catch { return res.status(503).json({ error: 'Не удалось удалить связанный аккаунт входа. Профиль сохранён; повторите позже. Защищённые аккаунты здесь не удаляются.' }) }
  }
  // Exact account keys only: never infer ownership from a matching surname or group.
  try { await sql.transaction([
    ...(userId ? [
      sql`delete from assessment_attempts where clerk_user_id=${userId}`,
      sql`delete from assessment_participants where clerk_user_id=${userId}`,
      sql`delete from class_students where normalized_identity=${'account|' + userId} or id in (select class_student_id from education_profiles where user_id=${userId})`,
      sql`delete from education_profiles where user_id=${userId}`,
      sql`delete from users where clerk_id=${userId}`,
      sql`delete from billing_orders where user_id=${userId}`,
      sql`delete from billing_subscriptions where user_id=${userId}`,
    ] : []),
    sql`delete from student_recovery_links where student_id=${student.id}::uuid`,
    sql`delete from oberbeck_variants where student_id=${student.id}::uuid`,
    sql`delete from student_profiles where id=${student.id}::uuid`,
  ]) } catch { return res.status(503).json({ error: userId ? 'Аккаунт входа удалён, но очистка данных не завершена. Повторите удаление этого же студента.' : 'Не удалось удалить профиль. Повторите позже.' }) }
  return res.status(200).json({ deletedStudentId: student.id, accountDeleted: !!userId })
}
