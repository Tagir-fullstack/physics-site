import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, asc } from 'drizzle-orm'
import { db, schema } from '../_lib/db'
import { getClerkUser, isAdmin } from '../_lib/auth'

type LessonInput = {
  orderNo?: number
  quarter?: number | null
  section?: string | null
  topic?: string | null
  objectives?: string | null
  hours?: number | null
  plannedDate?: string | null
  notes?: string | null
}

type MetaInput = {
  grade?: number
  language?: 'ru' | 'kk'
  academicYear?: string | null
  title?: string
  hoursPerWeek?: number | null
  totalHours?: number | null
}

function readBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer | string) => {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function parseJson(req: VercelRequest): Promise<unknown> {
  if (req.body && typeof req.body === 'object') return req.body
  const raw = await readBody(req)
  if (raw.length === 0) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    return {}
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' })

  const user = await getClerkUser(req)
  if (!isAdmin(user)) return res.status(403).json({ error: 'Access denied' })

  if (req.method === 'GET') {
    const [row] = await db.select().from(schema.ktp).where(eq(schema.ktp.id, id)).limit(1)
    if (!row) return res.status(404).json({ error: 'Not found' })
    const lessons = await db
      .select()
      .from(schema.ktpLessons)
      .where(eq(schema.ktpLessons.ktpId, id))
      .orderBy(asc(schema.ktpLessons.orderNo))
    return res.status(200).json({ ktp: row, lessons })
  }

  if (req.method === 'PATCH') {
    const [existing] = await db.select().from(schema.ktp).where(eq(schema.ktp.id, id)).limit(1)
    if (!existing) return res.status(404).json({ error: 'Not found' })

    const body = (await parseJson(req)) as { meta?: MetaInput; lessons?: LessonInput[] }

    if (body.meta && typeof body.meta === 'object') {
      const m = body.meta
      const update: Partial<typeof schema.ktp.$inferInsert> = { updatedAt: new Date() }
      if (typeof m.grade === 'number' && m.grade >= 7 && m.grade <= 11) update.grade = m.grade
      if (m.language === 'ru' || m.language === 'kk') update.language = m.language
      if (m.academicYear === null || typeof m.academicYear === 'string')
        update.academicYear = m.academicYear
      if (typeof m.title === 'string' && m.title.trim().length > 0) update.title = m.title.trim()
      if (m.hoursPerWeek === null || typeof m.hoursPerWeek === 'number')
        update.hoursPerWeek = m.hoursPerWeek
      if (m.totalHours === null || typeof m.totalHours === 'number')
        update.totalHours = m.totalHours
      await db.update(schema.ktp).set(update).where(eq(schema.ktp.id, id))
    }

    if (Array.isArray(body.lessons)) {
      await db.delete(schema.ktpLessons).where(eq(schema.ktpLessons.ktpId, id))
      const rows = body.lessons.map((l, i) => ({
        ktpId: id,
        orderNo: typeof l.orderNo === 'number' && l.orderNo > 0 ? l.orderNo : i + 1,
        quarter: typeof l.quarter === 'number' ? l.quarter : null,
        section: typeof l.section === 'string' && l.section.length > 0 ? l.section : null,
        topic: typeof l.topic === 'string' && l.topic.length > 0 ? l.topic : null,
        objectives:
          typeof l.objectives === 'string' && l.objectives.length > 0 ? l.objectives : null,
        hours: typeof l.hours === 'number' ? l.hours : null,
        plannedDate:
          typeof l.plannedDate === 'string' && l.plannedDate.length > 0 ? l.plannedDate : null,
        notes: typeof l.notes === 'string' && l.notes.length > 0 ? l.notes : null,
      }))
      if (rows.length > 0) {
        await db.insert(schema.ktpLessons).values(rows)
      }
    }

    const [updated] = await db.select().from(schema.ktp).where(eq(schema.ktp.id, id)).limit(1)
    const lessons = await db
      .select()
      .from(schema.ktpLessons)
      .where(eq(schema.ktpLessons.ktpId, id))
      .orderBy(asc(schema.ktpLessons.orderNo))
    return res.status(200).json({ ktp: updated, lessons })
  }

  if (req.method === 'DELETE') {
    await db.delete(schema.ktp).where(eq(schema.ktp.id, id))
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
