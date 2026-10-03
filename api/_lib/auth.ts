import './env.js'
import { createPublicKey } from 'node:crypto'
import { createClerkClient, verifyToken } from '@clerk/backend'
import type { VercelRequest } from '@vercel/node'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY
const clerk = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null

const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const adminUserIds = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const adminUserIdSuffixes = (process.env.ADMIN_USER_ID_SUFFIXES || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const clerkFrontendHost = (() => {
  if (!CLERK_PUBLISHABLE_KEY) return ''
  try {
    return Buffer.from(
      CLERK_PUBLISHABLE_KEY.replace(/^pk_(?:test|live)_/, ''),
      'base64'
    ).toString('utf8').replace(/\$+$/, '')
  } catch {
    return ''
  }
})()

let cachedJwtKey: { kid: string; pem: string; expiresAt: number } | null = null

function tokenKid(token: string) {
  try {
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')) as Record<string, unknown>
    return header.alg === 'RS256' && typeof header.kid === 'string' ? header.kid : ''
  } catch {
    return ''
  }
}

async function jwtKeyFor(token: string) {
  const kid = tokenKid(token)
  if (!kid || !clerkFrontendHost) return ''
  if (cachedJwtKey?.kid === kid && cachedJwtKey.expiresAt > Date.now()) return cachedJwtKey.pem

  const response = await fetch(`https://${clerkFrontendHost}/.well-known/jwks.json`)
  if (!response.ok) throw new Error('Could not load Clerk JWKS')
  const body = await response.json() as { keys?: Array<JsonWebKey & { kid?: string; kty?: string }> }
  const jwk = body.keys?.find((key) => key.kid === kid && key.kty === 'RSA')
  if (!jwk) throw new Error('Clerk signing key not found')
  const pem = createPublicKey({ key: jwk as import('node:crypto').JsonWebKey, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' })
    .toString()
  cachedJwtKey = { kid, pem, expiresAt: Date.now() + 60 * 60 * 1000 }
  return pem
}

async function verifyClerkToken(token: string) {
  if (clerkFrontendHost) {
    const jwtKey = await jwtKeyFor(token)
    if (!jwtKey) throw new Error('Invalid Clerk token header')
    const payload = await verifyToken(token, {
        jwtKey,
        authorizedParties: process.env.VERCEL_ENV === 'production'
          ? ['https://physez.com', 'https://www.physez.com'] : undefined,
      })
    if (payload.iss !== `https://${clerkFrontendHost}`) throw new Error('Unexpected Clerk issuer')
    return payload
  }
  if (!CLERK_SECRET_KEY) throw new Error('Clerk verification is not configured')
  return verifyToken(token, { secretKey: CLERK_SECRET_KEY })
}

export type ClerkUser = {
  userId: string
  email: string
  isPremium: boolean
  accessRole?: 'admin' | 'user'
}

export function isOwner(user: ClerkUser | null): boolean {
  return Boolean(user && (process.env.OWNER_USER_IDS || '').split(',').map(id => id.trim()).includes(user.userId))
}

function premiumFromMetadata(...sources: Array<Record<string, unknown> | null | undefined>) {
  const metadata = Object.assign({}, ...sources.filter(Boolean)) as Record<string, unknown>
  const subscription = metadata.subscription
  const subscriptionData = subscription && typeof subscription === 'object'
    ? subscription as Record<string, unknown>
    : null
  const plan = String(metadata.plan ?? subscriptionData?.plan ?? '').toLowerCase()
  const status = String(metadata.subscriptionStatus ?? subscriptionData?.status ?? 'active').toLowerCase()
  return ['pro', 'premium', 'teacher'].includes(plan) && !['cancelled', 'expired', 'inactive'].includes(status)
}

export async function getClerkUser(req: VercelRequest): Promise<ClerkUser | null> {
  const auth = req.headers.authorization
  const bearerToken = auth?.startsWith('Bearer ') ? auth.slice(7) : ''
  const cookieToken = typeof req.cookies?.__session === 'string' ? req.cookies.__session : ''
  const token = bearerToken || cookieToken
  if (!token) return null

  let userId = ''
  try {
    const payload = await verifyClerkToken(token)
    userId = payload.sub as string
    if (!userId) return null
  } catch {
    return null
  }

  if (
    adminUserIds.includes(userId) ||
    adminUserIdSuffixes.some((suffix) => userId.endsWith(suffix))
  ) {
    return { userId, email: '', isPremium: true }
  }

  if (!clerk) return { userId, email: '', isPremium: false }

  try {
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    return {
      userId,
      email: (email || '').toLowerCase(),
      isPremium: premiumFromMetadata(user.publicMetadata, user.privateMetadata),
      accessRole: user.publicMetadata.accessRole === 'admin' ? 'admin' : 'user',
    }
  } catch {
    // A verified session must remain usable if Clerk's user API is temporarily unavailable.
    return { userId, email: '', isPremium: false }
  }
}

export function isAdmin(user: ClerkUser | null): boolean {
  if (!user) return false
  return isOwner(user) || user.accessRole === 'admin' || adminUserIds.includes(user.userId) ||
    adminUserIdSuffixes.some((suffix) => user.userId.endsWith(suffix)) || (
    Boolean(user.email) && adminEmails.includes(user.email.toLowerCase())
  )
}

export function hasPremiumAccess(user: ClerkUser | null): boolean {
  return isAdmin(user) || Boolean(user?.isPremium)
}

export async function requireAdmin(req: VercelRequest) {
  const user = await getClerkUser(req)
  if (!user) return { user: null, error: { status: 401, message: 'Not authenticated' } as const }
  if (!isAdmin(user)) return { user, error: { status: 403, message: 'Admin only' } as const }
  return { user, error: null }
}
