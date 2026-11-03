import { useEffect, useState, type FormEvent } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import GoogleRegistration from './GoogleRegistration'

const message = (error: unknown) => {
  const code = (error as { errors?: { code?: string }[] })?.errors?.[0]?.code || ''
  if (code.includes('verification') || code.includes('code_incorrect')) return 'Код неверен или истёк. Проверьте письмо или запросите новый.'
  if (code.includes('rate_limit') || code.includes('too_many')) return 'Слишком много попыток. Подождите немного и повторите.'
  if (code.includes('password')) return 'Выберите более надёжный пароль: длинный, уникальный, без распространённых слов и последовательностей.'
  return 'Не удалось продолжить вход. Попробуйте ещё раз или используйте Google.'
}
export default function AccountAuth({ returnTo = '/account' }: { returnTo?: string }) {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { signUp } = useSignUp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [flow, setFlow] = useState<'signIn' | 'signUp' | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => { if (!cooldown) return; const timer = window.setTimeout(() => setCooldown(n => n - 1), 1000); return () => clearTimeout(timer) }, [cooldown])
  const sendCode = async () => {
    if (!signIn || !signUp || busy) return
    if (needsPassword && password !== confirmation) { setError('Пароли не совпадают.'); return }
    setBusy(true); setError('')
    try {
      let next: 'signIn' | 'signUp' = 'signIn'
      if (needsPassword || flow === 'signUp') {
        next = 'signUp'
        if (needsPassword) await signUp.create({ emailAddress: email.trim(), password })
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      } else {
        try {
          const attempt = await signIn.create({ identifier: email.trim() })
          const factor = attempt.supportedFirstFactors?.find(f => f.strategy === 'email_code')
          if (!factor || factor.strategy !== 'email_code') throw Error('email_code_unavailable')
          await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId })
        } catch (reason) {
          const missing = (reason as { errors?: { code?: string }[] })?.errors?.some(e => e.code === 'form_identifier_not_found')
          if (!missing) throw reason
          setNeedsPassword(true); return
        }
      }
      setFlow(next); setNeedsPassword(false); setPassword(''); setConfirmation(''); setCode(''); setCooldown(30)
    } catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }
  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!signIn || !signUp || !setActive || busy) return
    setBusy(true); setError('')
    try {
      const attempt = flow === 'signUp' ? await signUp.attemptEmailAddressVerification({ code }) : await signIn.attemptFirstFactor({ strategy: 'email_code', code })
      if (attempt.status !== 'complete' || !attempt.createdSessionId) throw Error('additional_requirements')
      await setActive({ session: attempt.createdSessionId })
      navigate(returnTo, { replace: true })
    } catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }
  return <div className="passwordless-auth">
    <h2>{flow ? 'Проверьте почту' : needsPassword ? 'Создайте пароль' : 'Войти или зарегистрироваться'}</h2>
    {needsPassword ? <>
      <p>Новый аккаунт: <strong>{email}</strong></p>
      <form onSubmit={e => { e.preventDefault(); void sendCode() }}><label>Пароль<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}/></label><label>Повторите пароль<input type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label><button className="registration-submit" disabled={busy}>{busy ? 'Отправляем код…' : 'Подтвердить почту'}</button></form>
      <div className="passwordless-actions"><button type="button" disabled={busy} onClick={() => {setNeedsPassword(false);setPassword('');setConfirmation('');setError('')}}>Изменить почту</button></div>
    </> : !flow ? <>
      <p>Один аккаунт для лабораторных, заданий и результатов.</p>
      <GoogleRegistration returnTo={returnTo} />
      <div className="passwordless-divider"><span>или</span></div>
      <form onSubmit={e => { e.preventDefault(); void sendCode() }}><label>Электронная почта<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/></label><button className="registration-submit" disabled={!isLoaded || !signUp || busy}>{busy ? 'Отправляем код…' : 'Продолжить'}</button></form>
      <p className="registration-hint">Отправим код на почту. Для нового аккаунта потребуется создать пароль.</p>
    </> : <>
      <p>Код отправлен на <strong>{email}</strong></p>
      <form onSubmit={verify}><label>Код из письма<input autoFocus inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}/></label><button className="registration-submit" disabled={busy}>{busy ? 'Проверяем…' : 'Подтвердить и войти'}</button></form>
      <div className="passwordless-actions"><button type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown ? `Отправить повторно через ${cooldown} с` : 'Отправить код ещё раз'}</button><button type="button" disabled={busy} onClick={() => { setFlow(null); setError('') }}>Изменить почту</button></div>
    </>}
    {error && <p className="registration-error" role="alert">{error}</p>}
    <div id="clerk-captcha"/>
  </div>
}
