import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { StudentRequestError, studentRequest, type StudentProfile } from '../lib/studentProfile'
import GoogleRegistration from './auth/GoogleRegistration'
import { ASSESSMENT_GROUPS, normalizeMonitorGroup } from '../lib/monitorGrading'
import { Link } from 'react-router-dom'
export default function StudentIdentityForm({ profile, onComplete, start = false }: { profile?: StudentProfile | null; onComplete: (profile: StudentProfile) => void | Promise<void>; start?: boolean }) {
  const { user, isLoaded } = useUser()
  const { profile: accountProfile } = useAuth()
  const { authFetch } = useApiClient()
  const [initial] = useState(() => {
    if (profile) return profile
    try { const draft = JSON.parse(sessionStorage.getItem('physez-student-draft') || 'null'); if (draft && ['lastName', 'firstName', 'group'].every(key => typeof draft[key] === 'string')) return draft as StudentProfile } catch { /* Use account details instead. */ }
    if (user) return { lastName: accountProfile?.last_name ?? user.lastName ?? '', firstName: accountProfile?.first_name ?? user.firstName ?? '', group: '' }
    try { const saved = JSON.parse(localStorage.getItem('mechanics-assessment-student') || 'null'); return saved && typeof saved.lastName === 'string' && typeof saved.firstName === 'string' && typeof saved.group === 'string' ? saved as StudentProfile : null } catch { return null }
  })
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [group, setGroup] = useState(() => { const value = normalizeMonitorGroup(initial?.group || '')?.replace('В', 'B') || ''; return ASSESSMENT_GROUPS.includes(value as typeof ASSESSMENT_GROUPS[number]) ? value : '' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recoveryRequired, setRecoveryRequired] = useState(false)
  const [createdGuest, setCreatedGuest] = useState<{ profile: StudentProfile; code: string } | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (profile) return
    try { sessionStorage.setItem('physez-student-draft', JSON.stringify({ lastName, firstName, group })) } catch { /* The form also works without storage. */ }
  }, [lastName, firstName, group, profile])
  const submit = async (recover = false) => {
    if (recover && /^OB-/i.test(code.trim())) {
      setError('Это номер варианта, а не личный код. Откройте ссылку восстановления от преподавателя или войдите через ранее связанный аккаунт Google.')
      return
    }
    setBusy(true); setError('')
    try {
      const result = await studentRequest<{ profile: StudentProfile; code?: string }>('/api/student-profile', recover ? { action: 'recover', code: code.trim() } : { action: profile ? 'update' : 'create', student: { lastName, firstName, group } }, authFetch)
      if (result.code && !result.profile.accountLinked) { setCreatedGuest({ profile: result.profile, code: result.code }); return }
      await onComplete(result.profile)
      try { sessionStorage.removeItem('physez-student-draft') } catch { /* Storage is optional. */ }
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить данные.'); if (e instanceof StudentRequestError && e.code === 'STUDENT_RECOVERY_REQUIRED') setRecoveryRequired(true) }
    finally { setBusy(false) }
  }
  if (createdGuest) return <div className="student-identity-form">
    <h2>Сохраните доступ к своему варианту</h2>
    <GoogleRegistration profile={createdGuest.profile} onLinked={p => { void onComplete(p) }} />
    <p>Если продолжаете без Google, сохраните этот личный код. Он восстановит профиль на другом устройстве и после удаления cookies. Номер варианта его не заменяет.</p>
    <code className="student-secret">{createdGuest.code}</code>
    <button type="button" className="atwood-secondary" onClick={() => { void navigator.clipboard.writeText(createdGuest.code).then(() => setCopied(true)).catch(() => setError('Выделите код и скопируйте его вручную.')) }}>{copied ? 'Код скопирован' : 'Копировать личный код'}</button>
    <p>Не передавайте код другим: он открывает ваш профиль.</p>
    <button type="button" className="atwood-primary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await onComplete(createdGuest.profile) } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось продолжить.') } finally { setBusy(false) } }}>{busy ? 'Открываем…' : 'Код сохранён — продолжить'}</button>
    {error && <p className="student-error" role="alert">{error}</p>}
  </div>
  return <div className="student-identity-form">
    {!profile && <GoogleRegistration />}
    {!profile && !user && <p>Без аккаунта доступ сохраняется только в этом браузере. Для другого устройства понадобится личный код или ссылка восстановления от преподавателя.</p>}
    {(user || profile) && <form onSubmit={e => { e.preventDefault(); void submit() }}>
      <label>Фамилия<input autoComplete="family-name" required minLength={2} maxLength={60} value={lastName} onChange={e => setLastName(e.target.value)} /></label>
      <label>Имя<input autoComplete="given-name" required minLength={2} maxLength={60} value={firstName} onChange={e => setFirstName(e.target.value)} /></label>
      <label>Образовательная программа<select required value={group} onChange={e => setGroup(e.target.value)}><option value="">Выберите ОП</option>{ASSESSMENT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select></label>
      <button className="atwood-primary" disabled={busy || !isLoaded}>{busy ? 'Сохраняем…' : profile ? 'Сохранить данные' : start ? 'Получить свой вариант' : 'Сохранить профиль'}</button>
    </form>}
    {!user && !profile && <Link to="/sign-in">Войти или зарегистрироваться по почте →</Link>}
    {error && <p className="student-error" role="alert">{error}</p>}
    {!profile && <details key={recoveryRequired ? 'required' : 'optional'} open={recoveryRequired || undefined} className="student-recovery"><summary>Уже были здесь? Восстановить профиль</summary><p>Номер варианта OB-… нужен для проверки работы и не подходит для входа. Здесь нужен личный секретный код из профиля.</p><form onSubmit={e => { e.preventDefault(); void submit(true) }}><label>Личный код восстановления<input autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Не номер варианта OB-…" required value={code} onChange={e => setCode(e.target.value)} /></label><button className="atwood-secondary" disabled={busy}>Восстановить</button></form><p>Нет личного кода? Попросите преподавателя найти вас в списке студентов и нажать «Восстановить доступ». Откройте полученную личную ссылку. Если профиль уже был связан с Google, войдите через тот же аккаунт. Не передавайте личный код другим.</p></details>}
  </div>
}
