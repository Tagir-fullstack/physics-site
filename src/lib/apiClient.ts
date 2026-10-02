import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean)

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails.includes(email.toLowerCase())
}

export function useApiClient() {
  const { getToken } = useAuth()

  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}): Promise<Response> => {
      const request = async (token: string | null) => {
        const headers = new Headers(init.headers || {})
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return fetch(input, { ...init, credentials: 'include', headers })
      }

      const response = await request(await getToken())
      if (response.status !== 401 && response.status !== 403) return response

      // Clerk may briefly return a stale cached token after session/metadata changes.
      const freshToken = await getToken({ skipCache: true })
      return freshToken ? request(freshToken) : response
    },
    [getToken]
  )

  return { authFetch }
}
