import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClerkUser, hasPremiumAccess } from './_lib/auth.js'
import { createTestTemplate } from './_lib/testWorkbook.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const user = await getClerkUser(req)
  if (!user) return res.status(401).json({ error: 'Войдите в аккаунт преподавателя.' })
  if (!hasPremiumAccess(user)) return res.status(403).json({ error: 'Шаблоны тестов доступны преподавателям с PRO.' })
  const file = await createTestTemplate()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="physez-test-template.xlsx"')
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).send(file)
}
