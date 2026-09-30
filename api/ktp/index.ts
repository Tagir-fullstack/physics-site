import type { VercelRequest, VercelResponse } from '@vercel/node'
import { desc } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getClerkUser, isAdmin } from '../_lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // For now, only admins can list КТП (subscription gating comes later).
  const user = await getClerkUser(req)
  if (!isAdmin(user)) return res.status(403).json({ error: 'Access denied' })

  const rows = await db
    .select({
      id: schema.ktp.id,
      grade: schema.ktp.grade,
      language: schema.ktp.language,
      academicYear: schema.ktp.academicYear,
      title: schema.ktp.title,
      hoursPerWeek: schema.ktp.hoursPerWeek,
      totalHours: schema.ktp.totalHours,
      createdAt: schema.ktp.createdAt,
    })
    .from(schema.ktp)
    .orderBy(desc(schema.ktp.createdAt))

  return res.status(200).json({ ktp: rows })
}
