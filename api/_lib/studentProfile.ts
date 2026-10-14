import { createHash, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, eq, isNull, or } from 'drizzle-orm'
import { db, schema } from './db.js'
import { getClerkUser, type ClerkUser } from './auth.js'
export const PROFILE_COOKIE = 'physez_student'
export const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export function identityFrom(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const clean = (v: unknown) => typeof v === 'string' ? v.normalize('NFKC').trim().replace(/\s+/g, ' ') : ''
  const lastName = clean(raw.lastName), firstName = clean(raw.firstName), group = clean(raw.group)
  const name = /^[\p{L}\p{M} '’.-]+$/u
  if (![lastName, firstName].every(n => n.length >= 2 && n.length <= 60 && name.test(n)) || !group || group.length > 60 || /[\p{Cc}]/u.test(group)) return null
  return { lastName, firstName, group, identityKey: hash([lastName, firstName, group].map(v => v.toLocaleLowerCase('ru')).join('\0')) }
}
export async function bodyOf(req: VercelRequest): Promise<Record<string, unknown>> {
  let raw = req.body
  if (raw === undefined) { const chunks: Buffer[] = []; for await (const chunk of req) { chunks.push(Buffer.from(chunk)); if (chunks.reduce((n, c) => n + c.length, 0) > 8192) throw new Error('Request too large') } raw = Buffer.concat(chunks).toString() }
  const body = typeof raw === 'string' ? JSON.parse(raw) : raw
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}
export function sameOrigin(req: VercelRequest) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (!origin) return true // Non-browser clients still require the private session token.
  try { return new URL(origin).host === req.headers.host } catch { return false }
}
export async function profileForToken(token: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.[A-Za-z0-9_-]{32}$/.test(token)) return null
  const [id, secret] = token.split('.')
  const [profile] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.id, id)).limit(1)
  if (!profile || !timingSafeEqual(Buffer.from(profile.recoveryHash, 'hex'), Buffer.from(hash(secret), 'hex'))) return null
  return profile
}
export const tokenOf = (req: VercelRequest) => req.cookies?.[PROFILE_COOKIE]
export async function currentStudent(req: VercelRequest, account?: ClerkUser | null) {
  const user = account === undefined ? await getClerkUser(req) : account
  if (user) {
    const [linked] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.clerkId, user.userId)).limit(1)
    if (linked) return linked
  }
  const guest = await profileForToken(tokenOf(req))
  if (guest?.clerkId && user && guest.clerkId !== user.userId) return null
  return guest
}
export async function linkStudentAccount(id: string, clerkId: string) {
  const [linked] = await db.update(schema.studentProfiles).set({ clerkId, updatedAt: new Date() }).where(and(eq(schema.studentProfiles.id, id), or(isNull(schema.studentProfiles.clerkId), eq(schema.studentProfiles.clerkId, clerkId)))).returning()
  return linked ?? null
}
export function setProfileCookie(req: VercelRequest, res: VercelResponse, token: string) {
  const secure = process.env.VERCEL_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https'
  res.setHeader('Set-Cookie', `${PROFILE_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${secure ? '; Secure' : ''}`)
}
export const publicProfile = (p: NonNullable<Awaited<ReturnType<typeof currentStudent>>>) => ({ id: p.id, lastName: p.lastName, firstName: p.firstName, group: p.group, accountLinked: Boolean(p.clerkId) })
