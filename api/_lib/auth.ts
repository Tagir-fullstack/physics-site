import './env.js'
import { createClerkClient, verifyToken } from '@clerk/backend'
import type { VercelRequest } from '@vercel/node'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const clerk = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null

const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const adminUserIds = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export type ClerkUser = {
  userId: string
  email: string
  isPremium: boolean
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
  if (!CLERK_SECRET_KEY || !clerk) return null
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)

  let userId = ''
  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY })
    userId = payload.sub as string
    if (!userId) return null
  } catch {
    return null
  }

  if (adminUserIds.includes(userId)) {
    return { userId, email: '', isPremium: true }
  }

  try {
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    return {
      userId,
      email: (email || '').toLowerCase(),
      isPremium: premiumFromMetadata(user.publicMetadata, user.privateMetadata, user.unsafeMetadata),
    }
  } catch {
    // A verified session must remain usable if Clerk's user API is temporarily unavailable.
    return { userId, email: '', isPremium: false }
  }
}

export function isAdmin(user: ClerkUser | null): boolean {
  if (!user) return false
  return adminUserIds.includes(user.userId) || (
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
