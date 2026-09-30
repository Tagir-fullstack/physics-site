import './env.js'
import { createClerkClient, verifyToken } from '@clerk/backend'
import type { VercelRequest } from '@vercel/node'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is not set')
}

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })

const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export type ClerkUser = {
  userId: string
  email: string
}

export async function getClerkUser(req: VercelRequest): Promise<ClerkUser | null> {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)

  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY })
    const userId = payload.sub as string
    if (!userId) return null
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    return { userId, email: (email || '').toLowerCase() }
  } catch {
    return null
  }
}

export function isAdmin(user: ClerkUser | null): boolean {
  if (!user?.email) return false
  return adminEmails.includes(user.email.toLowerCase())
}

export async function requireAdmin(req: VercelRequest) {
  const user = await getClerkUser(req)
  if (!user) return { user: null, error: { status: 401, message: 'Not authenticated' } as const }
  if (!isAdmin(user)) return { user, error: { status: 403, message: 'Admin only' } as const }
  return { user, error: null }
}
