import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { isAssessmentGroup } from '../lib/monitorGrading'
import type { EducationProfile } from '../lib/education'
import '../styles/student-profile.css'

export default function LabAccessGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const { authFetch } = useApiClient()
  const { pathname } = useLocation()
  const [result, setResult] = useState<{ userId: string; profile: EducationProfile | null; error?: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const id = user?.id
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    authFetch('/api/account?education=profile', { signal: controller.signal }).then(async r => { const data = await r.json(); if (!r.ok) throw Error(data.error); if (!controller.signal.aborted) setResult({ userId: id, profile: data.profile }) }).catch(e => { if (!controller.signal.aborted) setResult({ userId: id, profile: null, error: e instanceof Error ? e.message : 'Не удалось открыть учебный профиль.' }) })
    return () => controller.abort()
  }, [id, pathname, authFetch, retry])
  if (isLoading) return <main className="student-page"><section className="student-panel"><p role="status">Проверяем вход…</p></section></main>
  if (!user) return <Navigate to={'/sign-in?redirect=' + encodeURIComponent(pathname)} replace />
  if (!result || result.userId !== user.id) return <main className="student-page"><section className="student-panel"><p role="status">Загружаем учебный профиль…</p></section></main>
  if (result.error) return <main className="student-page"><section className="student-panel"><p role="alert">{result.error}</p><button onClick={() => setRetry(n => n + 1)}>Повторить</button><Link to="/account">Личный кабинет</Link></section></main>
  if (!result.profile || result.profile.role === 'student' && (!isAssessmentGroup(result.profile.group) || result.profile.needsTeacher)) return <Navigate to={'/education?next=' + encodeURIComponent(pathname)} replace />
  return children
}
