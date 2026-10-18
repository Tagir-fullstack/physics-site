import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, databaseSql, schema } from './db.js'
import { hash } from './studentProfile.js'

const TOKEN_PATTERN = /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.([A-Za-z0-9_-]{32})$/
export const RECOVERY_LIFETIME_MS = 24 * 60 * 60 * 1000

export async function issueStudentRecovery(studentId: string, issuedBy: string) {
  const id = randomUUID(), secret = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + RECOVERY_LIFETIME_MS)
  const tokenHash = hash(secret)
  await databaseSql.transaction([
    // Serialize issuance with redemption for this profile, including on other devices.
    databaseSql`select id from student_profiles where id = ${studentId}::uuid for update`,
    databaseSql`update student_recovery_links set revoked_at = now() where student_id = ${studentId}::uuid and redeemed_at is null and revoked_at is null`,
    databaseSql`insert into student_recovery_links (id, student_id, token_hash, issued_by, expires_at) values (${id}::uuid, ${studentId}::uuid, ${tokenHash}, ${issuedBy}, ${expiresAt.toISOString()}::timestamptz)`,
  ])
  return { token: `${id}.${secret}`, expiresAt: expiresAt.toISOString() }
}

export async function findStudentRecovery(token: unknown) {
  if (typeof token !== 'string') return null
  const match = TOKEN_PATTERN.exec(token)
  if (!match) return null
  const [row] = await db.select({ link: schema.studentRecoveryLinks, student: schema.studentProfiles }).from(schema.studentRecoveryLinks).innerJoin(schema.studentProfiles, eq(schema.studentRecoveryLinks.studentId, schema.studentProfiles.id)).where(eq(schema.studentRecoveryLinks.id, match[1])).limit(1)
  if (!row || row.link.redeemedAt || row.link.revokedAt || row.link.expiresAt.getTime() <= Date.now()) return null
  if (!timingSafeEqual(Buffer.from(row.link.tokenHash, 'hex'), Buffer.from(hash(match[2]), 'hex'))) return null
  return row
}

export async function redeemStudentRecovery(token: unknown, accountId?: string) {
  const row = await findStudentRecovery(token)
  if (!row) return null
  const secret = randomBytes(24).toString('base64url')
  const newHash = hash(secret)
  const [, rows] = await databaseSql.transaction([
    databaseSql`select id from student_profiles where id = ${row.student.id}::uuid for update`,
    databaseSql`with consumed as (
      update student_recovery_links set redeemed_at = now()
      where id = ${row.link.id}::uuid and token_hash = ${row.link.tokenHash}
        and redeemed_at is null and revoked_at is null and expires_at > now()
        and exists (select 1 from student_profiles where id = ${row.student.id}::uuid
          and (${accountId ?? null}::text is null or clerk_id is null or clerk_id = ${accountId ?? null}))
      returning student_id
    ) update student_profiles set recovery_hash = ${newHash}, updated_at = now()
      where id in (select student_id from consumed) returning id`,
  ])
  return rows.length ? { studentId: row.student.id, sessionToken: `${row.student.id}.${secret}` } : null
}
