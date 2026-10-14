import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useApiClient } from './apiClient'
export type StudentProfile = { id: string; lastName: string; firstName: string; group: string; accountLinked?: boolean }
export async function studentRequest<T>(path: string, body?: unknown, transport: (input: string, init: RequestInit) => Promise<Response> = fetch): Promise<T> {
  const response = await transport(path, { credentials: 'include', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Не удалось загрузить данные.')
  return data as T
}
export function useStudentProfile() {
  const { authFetch } = useApiClient()
  const { isLoaded, userId } = useAuth()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [resolvedAccount, setResolvedAccount] = useState<string | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await studentRequest<{ profile: StudentProfile | null }>('/api/student-profile', undefined, authFetch); setProfile(result.profile); setResolvedAccount(userId ?? null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Ошибка загрузки.') }
    finally { setLoading(false); setResolvedAccount(userId ?? null) }
  }, [authFetch, userId])
  useEffect(() => { if (!isLoaded) return; let cancelled = false; void studentRequest<{ profile: StudentProfile | null }>('/api/student-profile', undefined, authFetch).then(r => { if (!cancelled) { setProfile(r.profile); setError('') } }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки.') }).finally(() => { if (!cancelled) { setLoading(false); setResolvedAccount(userId ?? null) } }); return () => { cancelled = true } }, [authFetch, isLoaded, userId])
  const ready = resolvedAccount === (userId ?? null)
  return { profile: ready ? profile : null, loading: loading || !isLoaded || !ready, error: ready ? error : '', refresh, setProfile, authFetch }
}
