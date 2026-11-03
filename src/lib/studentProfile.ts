import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useApiClient } from './apiClient'
export type StudentProfile = { id: string; lastName: string; firstName: string; group: string; variantNumber?: number; accountLinked?: boolean }
export class StudentRequestError extends Error {
  code?: string
  constructor(message: string, code?: string) { super(message); this.name = 'StudentRequestError'; this.code = code }
}
export const PENDING_STUDENT_LINK = 'physez-pending-student-link'
export async function studentRequest<T>(path: string, body?: unknown, transport: (input: string, init: RequestInit) => Promise<Response> = fetch): Promise<T> {
  const response = await transport(path, { credentials: 'include', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  if (!response.ok) throw new StudentRequestError(data.error || 'Не удалось загрузить данные.', data.code)
  return data as T
}
export function useStudentProfile() {
  const { authFetch } = useApiClient()
  const { isLoaded, userId } = useAuth()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [resolvedAccount, setResolvedAccount] = useState<string | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const result = await studentRequest<{ profile: StudentProfile | null }>('/api/student-profile', undefined, authFetch)
    let pending: string | null = null
    try { pending = sessionStorage.getItem(PENDING_STUDENT_LINK) } catch { /* Storage may be unavailable. */ }
    if (userId && pending) {
      try { sessionStorage.removeItem(PENDING_STUDENT_LINK) } catch { /* No persistent marker is required. */ }
      if (result.profile?.id !== pending) throw new Error('Аккаунт открыт, но прежний профиль не найден на этом устройстве. Восстановите его по личному коду или ссылке преподавателя перед привязкой.')
      if (!result.profile.accountLinked) return studentRequest<{ profile: StudentProfile }>('/api/student-profile', { action: 'linkAccount', profileId: pending }, authFetch)
    }
    return result
  }, [authFetch, userId])
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await load(); setProfile(result.profile); setResolvedAccount(userId ?? null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Ошибка загрузки.') }
    finally { setLoading(false); setResolvedAccount(userId ?? null) }
  }, [load, userId])
  useEffect(() => { if (!isLoaded) return; let cancelled = false; void load().then(r => { if (!cancelled) { setProfile(r.profile); setError('') } }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки.') }).finally(() => { if (!cancelled) { setLoading(false); setResolvedAccount(userId ?? null) } }); return () => { cancelled = true } }, [load, isLoaded, userId])
  const ready = resolvedAccount === (userId ?? null)
  return { profile: ready ? profile : null, loading: loading || !isLoaded || !ready, error: ready ? error : '', refresh, setProfile, authFetch }
}
