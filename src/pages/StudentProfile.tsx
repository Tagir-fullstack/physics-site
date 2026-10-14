import { useState } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import StudentIdentityForm from '../components/StudentIdentityForm'
import GoogleRegistration from '../components/auth/GoogleRegistration'
import { studentRequest, useStudentProfile } from '../lib/studentProfile'
import '../styles/atwood.css'
import '../styles/student-profile.css'
export default function StudentProfilePage() {
  const { signOut } = useClerk()
  const { profile, loading, error, refresh, setProfile, authFetch } = useStudentProfile()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  return <main className="student-page"><section className="student-panel"><span className="atwood-eyebrow">PHYSEZ · СТУДЕНТ</span><h1>Ваш профиль</h1>
    {loading ? <p role="status">Загружаем данные…</p> : error ? <><p role="alert">{error}</p><button onClick={() => void refresh()}>Повторить</button></> : <>
      <p>ФИО и группа сохраняются в базе. Исправления не меняют уже выданный вариант.</p>
      <GoogleRegistration profile={profile} onLinked={setProfile} />
      <StudentIdentityForm key={profile?.id ?? 'new'} profile={profile} onComplete={p => { setProfile(p); setMessage('Данные сохранены.'); setCode('') }} />
      {profile && !profile.accountLinked && <div className="student-recovery"><h2>Доступ с другого устройства</h2><p>Сохраните личный код в надёжном месте. Он восстановит профиль и вариант после удаления cookies или смены устройства. Не отправляйте его преподавателю — для проверки достаточно номера варианта.</p><button className="atwood-secondary" onClick={() => { void studentRequest<{ code: string }>('/api/student-profile', { action: 'recoveryCode' }, authFetch).then(r => setCode(r.code)).catch(e => setMessage(e.message)) }}>Показать код восстановления</button>{code && <code className="student-secret">{code}</code>}</div>}
      {message && <p role="status">{message}</p>}
      <Link className="atwood-secondary" to="/labs/oberbeck">Перейти к маятнику Обербека →</Link>
      {profile && <div className="student-recovery"><button className="atwood-secondary" onClick={() => {
        if (!window.confirm(profile.accountLinked ? 'Вы выйдете также из аккаунта Physez. Профиль и вариант останутся в базе. Выйти?' : 'Сохраните личный код восстановления перед выходом. Профиль и вариант останутся в базе, но браузер перестанет узнавать вас. Выйти?')) return
        void studentRequest('/api/student-profile', { action: 'logout' }, authFetch).then(async () => { if (profile.accountLinked) await signOut(); setProfile(null); setCode(''); setMessage('Вы вышли на этом устройстве. Данные и вариант сохранены.') }).catch(e => setMessage(e.message))
      }}>Выйти из профиля на этом устройстве</button></div>}
    </>}
  </section></main>
}
