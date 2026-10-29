import type { VercelRequest, VercelResponse } from '@vercel/node'
import { desc, eq } from 'drizzle-orm'
import { db, schema } from './db.js'
import { getClerkUser, isAdmin, type ClerkUser } from './auth.js'
import { currentStudent, publicProfile } from './studentProfile.js'
import { clementVariant, clementExpected } from '../../src/lib/clementDesormes.js'

export function clementAccess(account: ClerkUser | null) {
  const canMonitor = isAdmin(account)
  return { canMonitor, canUsePro: canMonitor || account?.isPremium === true }
}

// Served through the existing profile endpoint: no additional serverless function or schema migration.
export async function clementLab(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const account = await getClerkUser(req)
  if (req.query.view === 'list' || req.query.view === 'expected') {
    if (!isAdmin(account)) return res.status(403).json({ error: 'Ожидаемые измерения доступны только администратору.' })
    if (req.query.view === 'expected') {
      if (typeof req.query.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(req.query.id)) return res.status(400).json({ error: 'Выберите профиль.' })
      const [student] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.id, req.query.id)).limit(1)
      if (!student) return res.status(404).json({ error: 'Профиль не найден.' })
      const variant = clementVariant(student.variantNumber)
      return res.status(200).json({ student: publicProfile(student), variant, expected: clementExpected(variant) })
    }
    const students = await db.select({ id: schema.studentProfiles.id, lastName: schema.studentProfiles.lastName, firstName: schema.studentProfiles.firstName, group: schema.studentProfiles.group, variantNumber: schema.studentProfiles.variantNumber }).from(schema.studentProfiles).orderBy(desc(schema.studentProfiles.createdAt))
    return res.status(200).json({ students })
  }
  if (req.query.view) return res.status(400).json({ error: 'Неизвестный вид данных.' })
  const profile = await currentStudent(req, account)
  if (!profile) return res.status(401).json({ error: 'Войдите в профиль или восстановите доступ перед началом лабораторной.' })
  return res.status(200).json({ profile: publicProfile(profile), variant: clementVariant(profile.variantNumber), ...clementAccess(account) })
}
