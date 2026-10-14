import { useState } from 'react'
import { useSignIn, useUser } from '@clerk/clerk-react'
import { useApiClient } from '../../lib/apiClient'
import { studentRequest, type StudentProfile } from '../../lib/studentProfile'

export default function GoogleRegistration({ profile, onLinked }: { profile?: StudentProfile | null; onLinked?: (profile: StudentProfile) => void }) {
  const { isLoaded, user } = useUser()
  const { signIn } = useSignIn()
  const { authFetch } = useApiClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const start = async () => {
    if (!signIn) return
    setBusy(true); setError('')
    try { await signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: '/auth/sso-callback', redirectUrlComplete: '/labs/oberbeck' }) }
    catch { setBusy(false); setError('Не удалось открыть вход через Google. Попробуйте ещё раз.') }
  }
  const link = async () => {
    setBusy(true); setError('')
    try { const result = await studentRequest<{ profile: StudentProfile }>('/api/student-profile', { action: 'linkAccount' }, authFetch); onLinked?.(result.profile) }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось связать профиль.') }
    finally { setBusy(false) }
  }
  return <div className="student-google-registration">
    {isLoaded && user ? <>
      <p>Вы вошли: <strong>{user.primaryEmailAddress?.emailAddress || user.fullName}</strong></p>
      {profile && !profile.accountLinked ? <><p>Свяжите именно этот профиль с вашим аккаунтом. Вариант останется прежним.</p><button className="student-google-button" disabled={busy} onClick={() => void link()}>{busy ? 'Связываем…' : 'Связать мой профиль с аккаунтом'}</button></> : <p>{profile ? 'Профиль связан с аккаунтом: войдите в него на другом устройстве, чтобы открыть свой вариант.' : 'Проверьте ФИО и укажите группу. Профиль и вариант будут сохранены за аккаунтом.'}</p>}
    </> : <>
      <button className="student-google-button" type="button" disabled={!isLoaded || !signIn || busy} onClick={() => void start()}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.7a6 6 0 0 1 0-3.4V7.6H2.9a10 10 0 0 0 0 8.8l3.4-2.7Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.6l3.4 2.7A6 6 0 0 1 12 6.1Z"/></svg>
        {busy ? 'Открываем Google…' : 'Продолжить с Google'}
      </button>
      <p>Вход или регистрация без пароля. Можно также продолжить по ФИО и группе ниже.</p>
    </>}
    {error && <p className="student-error" role="alert">{error}</p>}
  </div>
}
