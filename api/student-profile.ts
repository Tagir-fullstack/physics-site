import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from './_lib/db.js'
import { bodyOf, currentStudent, hash, identityFrom, profileForToken, publicProfile, sameOrigin, setProfileCookie, tokenOf, PROFILE_COOKIE, linkStudentAccount } from './_lib/studentProfile.js'
import { getClerkUser } from './_lib/auth.js'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const account = await getClerkUser(req)
    const profile = await currentStudent(req, account)
    if (req.method === 'GET') { if (profile && (await profileForToken(tokenOf(req)))?.id === profile.id) setProfileCookie(req, res, tokenOf(req)); return res.status(200).json({ profile: profile ? publicProfile(profile) : null }) }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Запрос с другого сайта запрещён.' })
    const body = await bodyOf(req)
    if (body.action === 'linkAccount') {
      if (!profile || !account || !req.headers.authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Сначала войдите в аккаунт и откройте свой профиль студента.' })
      const linked = await linkStudentAccount(profile.id, account.userId)
      if (!linked) return res.status(409).json({ error: 'Профиль уже связан с другим аккаунтом.' })
      return res.status(200).json({ profile: publicProfile(linked) })
    }
    if (body.action === 'logout') {
      res.setHeader('Set-Cookie', `${PROFILE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${process.env.VERCEL_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`)
      return res.status(200).json({ ok: true })
    }
    if (body.action === 'recover') {
      const recovered = await profileForToken(body.code)
      if (!recovered) return res.status(401).json({ error: 'Код восстановления не подходит.' })
      if (account && (recovered.clerkId && recovered.clerkId !== account.userId || profile?.clerkId === account.userId && profile.id !== recovered.id)) return res.status(409).json({ error: 'Этот профиль относится к другому аккаунту. Выйдите из текущего аккаунта перед восстановлением.' })
      setProfileCookie(req, res, body.code as string)
      return res.status(200).json({ profile: publicProfile(recovered) })
    }
    if (body.action === 'recoveryCode') { if (!profile || (await profileForToken(tokenOf(req)))?.id !== profile.id) return res.status(401).json({ error: 'Для профиля с аккаунтом используйте вход через Google на другом устройстве.' }); return res.status(200).json({ code: tokenOf(req) }) }
    const identity = identityFrom(body.student)
    if (!identity) return res.status(400).json({ error: 'Проверьте фамилию, имя и группу.' })
    if (body.action === 'update') {
      if (!profile) return res.status(401).json({ error: 'Сначала войдите в свой профиль.' })
      const [updated] = await db.update(schema.studentProfiles).set({ ...identity, updatedAt: new Date() }).where(eq(schema.studentProfiles.id, profile.id)).returning()
      return res.status(200).json({ profile: publicProfile(updated) })
    }
    if (body.action !== 'create') return res.status(400).json({ error: 'Неизвестное действие.' })
    if (profile) return res.status(200).json({ profile: publicProfile(profile) })
    const secret = randomBytes(24).toString('base64url')
    const [created] = await db.insert(schema.studentProfiles).values({ ...identity, clerkId: account?.userId ?? null, recoveryHash: hash(secret) }).onConflictDoNothing().returning()
    if (!created) return res.status(409).json({ error: 'Такой профиль уже сохранён. Восстановите его по личному коду; не создавайте новый вариант.' })
    setProfileCookie(req, res, `${created.id}.${secret}`)
    return res.status(201).json({ profile: publicProfile(created), code: `${created.id}.${secret}` })
  } catch (error) {
    const duplicate = (e: unknown): boolean => !!e && typeof e === 'object' && ('code' in e && e.code === '23505' || 'cause' in e && duplicate(e.cause))
    return res.status(duplicate(error) ? 409 : 503).json({ error: duplicate(error) ? 'Такое ФИО и группа уже используются другим профилем.' : 'Не удалось сохранить профиль. Повторите позже.' })
  }
}
