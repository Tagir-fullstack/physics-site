import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/apiClient'
import { studentRequest, type StudentProfile } from '../lib/studentProfile'
import '../styles/atwood.css'
import '../styles/student-profile.css'

type Preview = { profile: StudentProfile; variantCode: string | null; expiresAt: string }
export default function StudentRecovery() {
  const { isLoaded, userId } = useAuth()
  const { authFetch } = useApiClient()
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? ''
  const [lookup, setLookup] = useState<{ token: string; accountId: string | null; preview: Preview | null; error: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<{ token: string; message: string } | null>(null)
  const loading = !isLoaded || lookup?.token !== token || lookup?.accountId !== (userId ?? null)
  const preview = loading ? null : lookup?.preview ?? null
  const error = !loading ? actionError?.token === token ? actionError.message : lookup?.error ?? '' : ''
  useEffect(() => {
    if (!isLoaded) return
    let cancelled = false
    void studentRequest<Preview>('/api/student-profile', { action: 'previewRecovery', token }, authFetch).then(result => { if (!cancelled) setLookup({ token, accountId: userId ?? null, preview: result, error: '' }) }).catch(reason => { if (!cancelled) setLookup({ token, accountId: userId ?? null, preview: null, error: reason instanceof Error ? reason.message : 'Не удалось проверить ссылку.' }) })
    return () => { cancelled = true }
  }, [isLoaded, token, authFetch, userId])
  const restore = async () => {
    if (!preview || busy) return
    setBusy(true); setActionError(null)
    try {
      await studentRequest('/api/student-profile', { action: 'redeemRecovery', token }, authFetch)
      navigate('/labs/oberbeck', { replace: true })
    } catch (reason) { setActionError({ token, message: reason instanceof Error ? reason.message : 'Не удалось восстановить доступ.' }); setBusy(false) }
  }
  return <main className="student-page"><meta name="referrer" content="no-referrer"/><section className="student-panel student-recovery-panel">
    <span className="atwood-eyebrow">PHYSEZ · ДОСТУП К ЛАБОРАТОРНОЙ</span><h1>Восстановление доступа</h1>
    {!isLoaded || loading ? <p role="status">Проверяем личную ссылку…</p> : <>
      {preview && <><p>Преподаватель выдал ссылку для восстановления этого профиля:</p><div className="student-recovery-person"><strong>{preview.profile.lastName} {preview.profile.firstName}</strong><span>Группа {preview.profile.group}</span>{preview.variantCode && <span>Ваш вариант: {preview.variantCode}</span>}</div>
        <p>Продолжайте, только если это ваши данные. Вариант и его параметры не изменятся. Старый личный код и старые входы по нему перестанут работать.</p>
        <p>После входа сохраните новый личный код в профиле или свяжите профиль с Google для входа на других устройствах.</p>
        <button type="button" className="atwood-primary" disabled={busy} onClick={() => void restore()}>{busy ? 'Восстанавливаем…' : 'Это мои данные — восстановить доступ'}</button>
        <p>Ссылка одноразовая. Действует до {new Date(preview.expiresAt).toLocaleString('ru-RU')}.</p></>}
      {error && <p className="student-error" role="alert">{error}</p>}
      <Link className="atwood-secondary" to="/labs/oberbeck">К лабораторной работе →</Link>
    </>}
  </section></main>
}
