import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClerkClient } from '@clerk/backend'
import { getClerkUser, hasPremiumAccess, isAdmin, isOwner } from './_lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const user = await getClerkUser(req)
    if (!user) return res.status(401).json({ error: 'Войдите в аккаунт.' })
    if (req.method === 'GET') return res.status(200).json({
      userId: user.userId,
      role: isOwner(user) ? 'owner' : isAdmin(user) ? 'admin' : 'user',
      isPremium: hasPremiumAccess(user),
      paymentsEnabled: false,
    })
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!isOwner(user)) return res.status(403).json({ error: 'Назначать администраторов может только владелец сайта.' })
    // Only explicit Bearer requests may mutate privileged account settings.
    if (!req.headers.authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Обновите сессию перед изменением прав.' })
    let raw = req.body
    if (raw === undefined) {
      const chunks = []
      for await (const chunk of req) chunks.push(Buffer.from(chunk))
      raw = Buffer.concat(chunks).toString('utf8')
    }
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!body || !/^user_[A-Za-z0-9]+$/.test(body.userId || '') || !['admin', 'user'].includes(body.role)) {
      return res.status(400).json({ error: 'Укажите полный Clerk User ID и роль.' })
    }
    if (isOwner({ ...user, userId: body.userId })) return res.status(409).json({ error: 'Права владельца нельзя изменить через эту форму.' })
    const secret = process.env.CLERK_SECRET_KEY || ''
    if (process.env.VERCEL_ENV === 'production' && !secret.startsWith('sk_live_')) {
      return res.status(503).json({ error: 'Управление администраторами ожидает подключения Production Clerk на сервере.' })
    }
    const clerk = createClerkClient({ secretKey: secret })
    const target = await clerk.users.getUser(body.userId)
    await clerk.users.updateUserMetadata(target.id, {
      publicMetadata: { ...target.publicMetadata, accessRole: body.role },
    })
    console.info('Account role changed', { actor: user.userId, target: target.id, role: body.role })
    return res.status(200).json({ ok: true, userId: target.id, role: body.role })
  } catch {
    return res.status(503).json({ error: 'Не удалось обновить данные аккаунта. Повторите позже.' })
  }
}
