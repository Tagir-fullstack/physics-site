import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, schema } from './db.js'
import type { ClerkUser } from './auth.js'
import type { StudentIdentity } from './mechanicsAssessment.js'
import { currentStudent, hash, identityFrom, sameOrigin, setProfileCookie } from './studentProfile.js'

// A public variant number never authenticates a student. Reuse only a verified
// account/private cookie; a name collision must go through account recovery.
export async function studentForWork(req: VercelRequest, res: VercelResponse, account: ClerkUser | null, identity: StudentIdentity): Promise<StudentIdentity | null> {
  if (!sameOrigin(req)) return null
  let profile = await currentStudent(req, account)
  if (!profile) {
    const parsed = identityFrom(identity)
    if (!parsed) return null
    const secret = randomBytes(24).toString('base64url')
    const [created] = await db.insert(schema.studentProfiles).values({ ...parsed, clerkId: account?.userId ?? null, recoveryHash: hash(secret) }).onConflictDoNothing().returning()
    if (!created) return null
    profile = created
    setProfileCookie(req, res, `${created.id}.${secret}`)
  }
  return { lastName: profile.lastName, firstName: profile.firstName, group: profile.group, studentProfileId: profile.id, variantNumber: profile.variantNumber }
}

export const STUDENT_RECOVERY_REQUIRED = 'Профиль с такими данными уже существует. Войдите в связанный аккаунт или восстановите профиль по личному коду либо ссылке преподавателя.'
