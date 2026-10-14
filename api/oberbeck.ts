import { randomBytes, randomInt } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { desc, eq } from 'drizzle-orm'
import { db, schema } from './_lib/db.js'
import { getClerkUser, isAdmin } from './_lib/auth.js'
import { bodyOf, currentStudent, publicProfile, sameOrigin } from './_lib/studentProfile.js'
import { createOberbeckVariant, expectedOberbeckTables, variantFingerprint, type OberbeckVariant } from '../src/lib/oberbeckVariant.js'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'GET' && ['list', 'expected'].includes(String(req.query.view))) {
      if (!isAdmin(await getClerkUser(req))) return res.status(403).json({ error: 'Доступ к вариантам разрешён только администратору.' })
      const query = db.select({ variant: schema.oberbeckVariants, student: schema.studentProfiles }).from(schema.oberbeckVariants).innerJoin(schema.studentProfiles, eq(schema.oberbeckVariants.studentId, schema.studentProfiles.id))
      if (req.query.view === 'expected') {
        const id = typeof req.query.id === 'string' && /^[a-f0-9-]{36}$/.test(req.query.id) ? req.query.id : ''
        if (!id) return res.status(400).json({ error: 'Не указан вариант.' })
        const [row] = await query.where(eq(schema.oberbeckVariants.id, id)).limit(1)
        if (!row) return res.status(404).json({ error: 'Вариант не найден.' })
        return res.status(200).json({ id: row.variant.id, code: row.variant.code, student: publicProfile(row.student), parameters: row.variant.parameters, expected: expectedOberbeckTables(row.variant.parameters as OberbeckVariant) })
      }
      const rows = await query.orderBy(desc(schema.oberbeckVariants.createdAt))
      return res.status(200).json({ variants: rows.map(r => ({ id: r.variant.id, code: r.variant.code, student: publicProfile(r.student), parameters: r.variant.parameters, createdAt: r.variant.createdAt })) })
    }
    const profile = await currentStudent(req)
    if (!profile) return res.status(401).json({ error: 'Укажите ФИО и группу перед началом лабораторной.' })
    const find = async () => (await db.select().from(schema.oberbeckVariants).where(eq(schema.oberbeckVariants.studentId, profile.id)).limit(1))[0]
    let variant = await find()
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return res.status(403).json({ error: 'Запрос с другого сайта запрещён.' })
      if ((await bodyOf(req)).action !== 'start') return res.status(400).json({ error: 'Неизвестное действие.' })
      for (let i = 0; !variant && i < 12; i++) {
        const parameters = createOberbeckVariant(() => randomInt(0, 1_000_000) / 1_000_000)
        await db.insert(schema.oberbeckVariants).values({ studentId: profile.id, code: `OB-${randomBytes(5).toString('hex').toUpperCase()}`, parameters, fingerprint: variantFingerprint(parameters) }).onConflictDoNothing()
        variant = await find()
      }
      if (!variant) throw new Error('Variant allocation failed')
    } else if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    return res.status(200).json({ variant: variant ? { id: variant.id, code: variant.code, parameters: variant.parameters } : null, profile: publicProfile(profile) })
  } catch { return res.status(503).json({ error: 'Не удалось загрузить варианты. Повторите позже.' }) }
}
