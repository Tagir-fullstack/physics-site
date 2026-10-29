import { useState } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StudentIdentityForm from '../components/StudentIdentityForm'
import GoogleRegistration from '../components/auth/GoogleRegistration'
import { studentRequest, useStudentProfile } from '../lib/studentProfile'
import '../styles/atwood.css'
import '../styles/student-profile.css'
export default function StudentProfilePage() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <main className="student-page"><section className="student-panel"><p role="status">Открываем ваш профиль…</p></section></main>
  if (user) return <Navigate to="/account" replace />
  return <GuestWorkProfile />
}

function GuestWorkProfile() {
  const [searchParams] = useSearchParams()
  const origins: Record<string, { path: string; label: string }> = {
    'clement-desormes': { path: '/labs/clement-desormes', label: 'Вернуться к Клеману—Дезорму' },
    oberbeck: { path: '/labs/oberbeck', label: 'Вернуться к маятнику Обербека' },
    atwood: { path: '/labs/atwood', label: 'Вернуться к машине Атвуда' },
    'ball-collision': { path: '/labs/ball-collision', label: 'Вернуться к соударению шаров' },
  }
  const from = searchParams.get('from') ?? ''
  const origin = Object.hasOwn(origins, from) ? origins[from] : { path: '/labs', label: 'Все лабораторные' }
  const { signOut } = useClerk()
  const { profile, loading, error, refresh, setProfile, authFetch } = useStudentProfile()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  return <main className="student-page guest-profile-page"><section className="student-panel guest-profile-panel"><div className="guest-profile-intro"><span className="atwood-eyebrow">PHYSEZ · ЛАБОРАТОРНЫЕ РАБОТЫ</span><h1>Профиль участника</h1><p>Имя и группа для ваших работ. Исправление данных сохраняет выданный вариант.</p>{profile?.variantNumber && <p className="guest-profile-variant">Постоянный вариант <strong>№ {profile.variantNumber}</strong></p>}<Link className="guest-profile-back" to={origin.path}>← {origin.label}</Link></div><div className="guest-profile-content">
    {loading ? <p role="status">Загружаем данные…</p> : error ? <><p role="alert">{error}</p><button onClick={() => void refresh()}>Повторить</button></> : <>
      <GoogleRegistration profile={profile} onLinked={setProfile} />
      <StudentIdentityForm key={profile?.id ?? 'new'} profile={profile} onComplete={p => { setProfile(p); setMessage('Данные сохранены.'); setCode('') }} />
      {profile && !profile.accountLinked && <details className="student-recovery"><summary>Доступ с другого устройства</summary><p>Сохраните личный код в надёжном месте. Он восстановит профиль и вариант после удаления cookies или смены устройства. Не отправляйте его преподавателю — для проверки достаточно номера варианта.</p><button className="atwood-secondary" onClick={() => { void studentRequest<{ code: string }>('/api/student-profile', { action: 'recoveryCode' }, authFetch).then(r => setCode(r.code)).catch(e => setMessage(e.message)) }}>Показать код восстановления</button>{code && <code className="student-secret">{code}</code>}</details>}
      {message && <p role="status">{message}</p>}
      {profile && <div className="student-recovery"><button className="atwood-secondary" onClick={() => {
        if (!window.confirm(profile.accountLinked ? 'Вы выйдете также из аккаунта Physez. Профиль и вариант останутся в базе. Выйти?' : 'Сохраните личный код восстановления перед выходом. Профиль и вариант останутся в базе, но браузер перестанет узнавать вас. Выйти?')) return
        void studentRequest('/api/student-profile', { action: 'logout' }, authFetch).then(async () => { if (profile.accountLinked) await signOut(); setProfile(null); setCode(''); setMessage('Вы вышли на этом устройстве. Данные и вариант сохранены.') }).catch(e => setMessage(e.message))
      }}>Выйти из профиля на этом устройстве</button></div>}
    </>}
  </div></section></main>
}
