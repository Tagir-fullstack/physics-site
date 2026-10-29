import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import OberbeckPendulum from './OberbeckPendulum'
import StudentIdentityForm from '../../components/StudentIdentityForm'
import GoogleRegistration from '../../components/auth/GoogleRegistration'
import { studentRequest, useStudentProfile, type StudentProfile } from '../../lib/studentProfile'
import type { OberbeckVariant } from '../../lib/oberbeckVariant'
import '../../styles/atwood.css'
import '../../styles/student-profile.css'
type Assignment = { id: string; code: string; parameters: OberbeckVariant }
export default function OberbeckEntry() {
  const { user } = useAuth()
  const { profile, loading, error: profileError, setProfile, refresh, authFetch } = useStudentProfile()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loadedFor, setLoadedFor] = useState('')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const id = profile?.id
  const load = useCallback(async () => {
    if (!id) return
    const result = await studentRequest<{ variant: Assignment | null }>('/api/oberbeck', undefined, authFetch)
    setAssignment(result.variant); setLoadedFor(id)
  }, [id, authFetch])
  useEffect(() => { let disposed = false; if (id) void studentRequest<{ variant: Assignment | null }>('/api/oberbeck', undefined, authFetch).then(r => { if (!disposed) { setAssignment(r.variant); setLoadedFor(id) } }).catch(e => { if (!disposed) { setError(e.message); setLoadedFor(id) } }); return () => { disposed = true } }, [id, authFetch])
  const start = async (student: StudentProfile) => {
    setStarting(true); setError('')
    try { const result = await studentRequest<{ variant: Assignment }>('/api/oberbeck', { action: 'start' }, authFetch); setProfile(student); setAssignment(result.variant); setLoadedFor(student.id) }
    catch (e) { setProfile(student); setError(e instanceof Error ? e.message : 'Не удалось выдать вариант.'); setLoadedFor(student.id) }
    finally { setStarting(false) }
  }
  if (loading || id && loadedFor !== id) return <main className="student-page"><section className="student-panel"><p role="status">Загружаем ваш профиль и вариант…</p></section></main>
  if (assignment && profile && loadedFor === profile.id) return <OberbeckPendulum key={assignment.id} variant={assignment.parameters} variantCode={assignment.code} student={profile} />
  return <main className="student-page"><section className="student-panel ob-variant-intro"><div><span className="atwood-eyebrow">ЛАБОРАТОРНАЯ РАБОТА №3</span><h1>Маятник Обербека</h1><p>Одна установка · два исследования</p><p>У каждого студента — свой набор высоты, радиусов и масс.</p><p>Вариант сохраняется в базе и не меняется при повторном входе. Сохраните код восстановления в профиле для другого устройства.</p><Link to={user ? '/account' : '/student/profile?from=oberbeck'}>Ваш профиль →</Link></div><div>
    {(profileError || error) && <p className="student-error" role="alert">{profileError || error}</p>}
    <GoogleRegistration profile={profile} onLinked={setProfile} />
    {profileError ? <button onClick={() => void refresh()}>Повторить загрузку профиля</button> : profile ? <><h2>{profile.lastName} {profile.firstName}</h2><p>Группа {profile.group}</p><div className="ob-entry-actions"><button className="atwood-primary" disabled={starting} onClick={() => void start(profile)}>{starting ? 'Выдаём вариант…' : 'Получить свой вариант'}</button>{error && <button className="atwood-secondary" onClick={() => void load().catch(e => setError(e.message))}>Проверить сохранённый вариант</button>}</div></> : <StudentIdentityForm start onComplete={start} />}
  </div></section></main>
}
