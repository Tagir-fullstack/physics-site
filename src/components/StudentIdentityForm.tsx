import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useApiClient } from '../lib/apiClient'
import { studentRequest, type StudentProfile } from '../lib/studentProfile'
export default function StudentIdentityForm({ profile, onComplete, start = false }: { profile?: StudentProfile | null; onComplete: (profile: StudentProfile) => void | Promise<void>; start?: boolean }) {
  const { user, isLoaded } = useUser()
  const { authFetch } = useApiClient()
  const [initial] = useState(() => {
    if (profile) return profile
    if (user) return { lastName: user.lastName ?? '', firstName: user.firstName ?? '', group: '' }
    try { const saved = JSON.parse(localStorage.getItem('mechanics-assessment-student') || 'null'); return saved && typeof saved.lastName === 'string' && typeof saved.firstName === 'string' && typeof saved.group === 'string' ? saved as StudentProfile : null } catch { return null }
  })
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [group, setGroup] = useState(initial?.group ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (recover = false) => {
    if (recover && /^OB-/i.test(code.trim())) {
      setError('Это номер варианта, а не личный код. Откройте ссылку восстановления от преподавателя или войдите через ранее связанный аккаунт Google.')
      return
    }
    setBusy(true); setError('')
    try {
      const result = await studentRequest<{ profile: StudentProfile }>('/api/student-profile', recover ? { action: 'recover', code: code.trim() } : { action: profile ? 'update' : 'create', student: { lastName, firstName, group } }, authFetch)
      await onComplete(result.profile)
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить данные.') }
    finally { setBusy(false) }
  }
  return <div className="student-identity-form">
    <form onSubmit={e => { e.preventDefault(); void submit() }}>
      <label>Фамилия<input autoComplete="family-name" required minLength={2} maxLength={60} value={lastName} onChange={e => setLastName(e.target.value)} /></label>
      <label>Имя<input autoComplete="given-name" required minLength={2} maxLength={60} value={firstName} onChange={e => setFirstName(e.target.value)} /></label>
      <label>Группа<input required maxLength={60} placeholder="В062" value={group} onChange={e => setGroup(e.target.value)} /></label>
      <button className="atwood-primary" disabled={busy || !isLoaded}>{busy ? 'Сохраняем…' : profile ? 'Сохранить данные' : start ? 'Получить свой вариант' : 'Сохранить профиль'}</button>
    </form>
    {error && <p className="student-error" role="alert">{error}</p>}
    {!profile && <details className="student-recovery"><summary>Уже были здесь? Восстановить профиль</summary><p>Номер варианта OB-… нужен для проверки работы и не подходит для входа. Здесь нужен личный секретный код из профиля.</p><form onSubmit={e => { e.preventDefault(); void submit(true) }}><label>Личный код восстановления<input autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Не номер варианта OB-…" required value={code} onChange={e => setCode(e.target.value)} /></label><button className="atwood-secondary" disabled={busy}>Восстановить</button></form><p>Если код утерян, попросите преподавателя прислать личную ссылку восстановления и откройте её. Если профиль уже был связан с Google, войдите через тот же аккаунт. Не передавайте личный код другим.</p></details>}
  </div>
}
