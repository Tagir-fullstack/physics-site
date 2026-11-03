import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navigate, useSearchParams } from 'react-router-dom'
import { ASSESSMENT_GROUPS } from '../lib/monitorGrading'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { UNIVERSITIES } from '../data/universities'
import { validateEducation, type DirectoryTeacher, type EducationDraft, type EducationProfile } from '../lib/education'
import '../styles/register.css'
import AuthBackground from '../components/auth/AuthBackground'

const draftKey = 'physez-registration-draft'
const empty: EducationDraft = { role: 'student', universityId: '', institution: '', firstName: '', lastName: '', group: '', teacherId: '' }
export default function EducationSetup() {
  const { user, isLoading, updateProfile } = useAuth()
  const { authFetch } = useApiClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/account'
  const returnTo = /^\/(labs\/(atwood|oberbeck|clement-desormes|ball-collision)|account|student\/tests)$/.test(next) ? next : '/account'
  const userId = user?.id
  const [draft, setDraft] = useState(empty)
  const [query, setQuery] = useState('')
  const [savedProfile, setSavedProfile] = useState<EducationProfile | null>(null)
  const [loadedUser, setLoadedUser] = useState('')
  const [profileError, setProfileError] = useState('')
  const [directory, setDirectory] = useState<{ key: string; teachers: DirectoryTeacher[]; error?: string }>({ key: '', teachers: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const directoryKey = draft.universityId + ':' + (draft.universityId === 'other' ? draft.institution.trim() : '')
  const needsDirectory = draft.role === 'student' && Boolean(draft.universityId) && (draft.universityId !== 'other' || draft.institution.trim().length >= 3)
  const directoryReady = !needsDirectory || directory.key === directoryKey
  const teachers = directory.key === directoryKey ? directory.teachers : []
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    authFetch('/api/account?education=profile', { signal: controller.signal }).then(async r => {
      const data = await r.json()
      if (!r.ok) throw Error(data.error)
      if (controller.signal.aborted) return
      setSavedProfile(data.profile)
      if (data.profile) setDraft(data.profile)
      else setDraft(current => ({ ...current, lastName: current.lastName || user?.fullName?.split(' ').slice(-1).join(' ') || '', firstName: current.firstName || user?.fullName?.split(' ').slice(0,-1).join(' ') || '' }))
      setLoadedUser(userId)
    }).catch(e => { if (!controller.signal.aborted) setProfileError(e instanceof Error ? e.message : 'Не удалось загрузить профиль.') })
    return () => controller.abort()
  }, [userId, user?.fullName, authFetch])
  useEffect(() => {
    if (!needsDirectory) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch('/api/account?education=directory&universityId=' + encodeURIComponent(draft.universityId) + '&institution=' + encodeURIComponent(draft.institution), { signal: controller.signal }).then(async r => {
        const data = await r.json()
        if (!r.ok) throw Error(data.error)
        if (!controller.signal.aborted) setDirectory({ key: directoryKey, teachers: data.teachers })
      }).catch(() => { if (!controller.signal.aborted) setDirectory({ key: directoryKey, teachers: [], error: 'Не удалось загрузить преподавателей. Обновите страницу.' }) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [draft.universityId, draft.institution, needsDirectory, directoryKey])
  const change = (patch: Partial<EducationDraft>) => { setDraft(current => ({ ...current, ...patch })); setError('') }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    let details: EducationDraft
    try {
      details = validateEducation(draft as unknown as Record<string, unknown>)
      if (!directoryReady || (needsDirectory && directory.error)) throw Error('Дождитесь загрузки списка преподавателей.')
      if (details.role === 'student' && teachers.length && !details.teacherId) throw Error('Выберите преподавателя.')
    } catch (e) { setError((e as Error).message); return }
    if (!user) {
      return
    }
    setBusy(true)
    try {
      const response = await authFetch('/api/account?education=profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) })
      const result = await response.json()
      if (!response.ok) throw Error(result.error)
      // Educational access is already persisted by the server. Clerk metadata is display-only.
      try { await updateProfile({ role: details.role === 'teacher' ? 'lecturer' : 'student', institution: details.institution, first_name: details.firstName, last_name: details.lastName, full_name: details.lastName + ' ' + details.firstName, profile_completed: true }) } catch { /* Account remains linked if Clerk is temporarily unavailable. */ }
      sessionStorage.removeItem(draftKey)
      if (details.role === 'student') {
        sessionStorage.setItem('physez-student-draft', JSON.stringify(details))
        // Existing profiles are reused only through the current account/cookie.
        const currentResponse = await authFetch('/api/student-profile')
        const current = await currentResponse.json()
        if (!currentResponse.ok) throw Error(current.error)
        const savedResponse = await authFetch('/api/student-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: current.profile ? 'update' : 'create', student: details }) })
        if (!savedResponse.ok && savedResponse.status !== 409) { const issue = await savedResponse.json(); throw Error(issue.error) }
        if (savedResponse.ok && current.profile && !current.profile.accountLinked) await authFetch('/api/student-profile', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'linkAccount',profileId:current.profile.id}) })
      }
      navigate(returnTo, { replace: true })
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить профиль.') } finally { setBusy(false) }
  }
  const search = query.toLocaleLowerCase('ru')
  const filtered = UNIVERSITIES.filter(u => u.id === draft.universityId || (u.name + ' ' + u.city + (u.id === 'enu' ? ' ЕНУ ENU' : u.id === 'satbayev' ? ' Сатпаев Satbayev' : '')).toLocaleLowerCase('ru').includes(search))
  const profileLoading = Boolean(user && loadedUser !== user.id)
  if (!isLoading && !user) return <Navigate to={'/sign-in?redirect=' + encodeURIComponent('/education?next=' + returnTo)} replace />
  return <main className="registration-page">
    <AuthBackground />
    <div className="registration-shell">
    <aside className="registration-intro"><span className="registration-eyebrow">PHYSEZ / ВАШЕ ОБУЧЕНИЕ</span><h1>{'Ваше место\nв Physez'}</h1><p>{'Выберите вуз, образовательную программу и преподавателя. Настройку достаточно выполнить один раз.'}</p><div className="registration-benefits"><span>Анимации и виртуальные опыты</span><span>Работы вашего преподавателя</span><span>Результаты в личном кабинете</span></div></aside>
    <section className="registration-card" aria-labelledby="registration-title">
      <>
        <div className="registration-card-top"><span>{savedProfile ? 'УЧЕБНЫЙ ПРОФИЛЬ' : '01 / ЗНАКОМСТВО'}</span>{!user && <Link to="/sign-in">Уже есть аккаунт</Link>}</div><h2 id="registration-title">{user ? 'Остался один шаг' : 'Как вы будете учиться?'}</h2>
        {profileError ? <div role="alert" className="registration-error">{profileError} <button onClick={() => window.location.reload()}>Повторить</button></div> : isLoading || profileLoading ? <p role="status">Загружаем профиль…</p> : <form className="registration-details-form" onSubmit={submit}>
          <fieldset className="registration-roles" disabled={Boolean(savedProfile)}><legend>Ваша роль</legend>{(['student', 'teacher'] as const).map(role => <label key={role} className={draft.role === role ? 'selected' : ''}><input type="radio" name="role" value={role} checked={draft.role === role} onChange={() => change({ role, teacherId: '' })}/><strong>{role === 'student' ? 'Студент' : 'Преподаватель'}</strong><span>{role === 'student' ? 'Учусь и выполняю работы' : 'Обучаю и создаю задания'}</span></label>)}</fieldset>
          <div className="registration-fields"><label>Фамилия<input autoComplete="family-name" required minLength={2} maxLength={60} value={draft.lastName} onChange={e => change({ lastName: e.target.value })}/></label><label>Имя и отчество<input autoComplete="given-name" required minLength={2} maxLength={60} value={draft.firstName} onChange={e => change({ firstName: e.target.value })}/></label></div>
          <label className="registration-university">Ваш вуз<input type="search" aria-label="Поиск вуза" placeholder="Название или город" value={query} onChange={e => setQuery(e.target.value)}/><select required aria-label="Ваш вуз" value={draft.universityId} onChange={e => change({ universityId: e.target.value, institution: '', teacherId: '' })}><option value="">Выберите учебное заведение</option>{filtered.map(u => <option key={u.id} value={u.id}>{u.name} · {u.city}</option>)}<option value="other">Другой вуз / учебное заведение</option></select></label>
          {draft.universityId === 'other' && <label>Название учебного заведения<input required minLength={3} maxLength={255} value={draft.institution} onChange={e => change({ institution: e.target.value, teacherId: '' })}/></label>}
          {draft.role === 'student' && <><label>Образовательная программа<select required value={draft.group} onChange={e => change({ group: e.target.value })}><option value="">Выберите ОП</option>{ASSESSMENT_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}</select></label>{needsDirectory && <label>Ваш преподаватель<select required={teachers.length > 0} disabled={!directoryReady || Boolean(directory.error)} value={draft.teacherId} onChange={e => change({ teacherId: e.target.value })}><option value="">{!directoryReady ? 'Загружаем преподавателей…' : teachers.length ? 'Выберите преподавателя' : 'Пока нет зарегистрированных преподавателей'}</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{directory.error ? <span className="registration-error" role="alert">{directory.error}</span> : directoryReady && !teachers.length && <span className="registration-hint">Можно продолжить и выбрать преподавателя позже в учебном профиле.</span>}</label>}</>}
          {draft.role === 'teacher' && <><label>Кафедра / подразделение<input required minLength={3} maxLength={160} value={draft.department || ''} onChange={e => change({ department: e.target.value })}/></label>{savedProfile?.teacherStatus && <p role="status">{savedProfile.teacherStatus === 'approved' ? 'Преподаватель подтверждён' : savedProfile.teacherStatus === 'rejected' ? `Заявка отклонена: ${savedProfile.verificationNote || 'Обратитесь к администратору.'}` : 'Заявка ожидает подтверждения администратором'}</p>}</>}
          <p className="registration-hint">{draft.role === 'teacher' ? 'Сначала администратор подтверждает, что вы преподаватель. После одобрения студенты смогут выбрать вас; создание тестов и мониторинг требуют PRO.' : 'Ваши работы и результаты будут связаны с выбранным преподавателем.'}</p>
          {error && <p className="registration-error" role="alert">{error}</p>}
          <button className="registration-submit" disabled={busy || !directoryReady || (needsDirectory && Boolean(directory.error))}>{busy ? 'Сохраняем…' : draft.role === 'teacher' && savedProfile?.teacherStatus !== 'approved' ? 'Отправить заявку' : 'Сохранить и продолжить'}</button>
          <p className="registration-legal">Продолжая, вы принимаете <Link to="/terms">условия использования</Link> и <Link to="/privacy">политику конфиденциальности</Link>.</p>
        </form>}
      </>
    </section>
  </div></main>
}
