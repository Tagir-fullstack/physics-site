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
      const token = await getToken()
      const headers = new Headers(init.headers || {})
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(input, { ...init, headers })
    },
    [getToken]
  )

  return { authFetch }
}
