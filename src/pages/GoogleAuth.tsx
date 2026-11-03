import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import '../styles/student-profile.css'
import Register from './Register'
export function GoogleAuthCallback() {
  return <main className="student-page"><section className="student-panel"><p role="status">Завершаем вход и возвращаемся к лабораторной…</p><AuthenticateWithRedirectCallback signInUrl="/labs/oberbeck/sign-in" signUpUrl="/labs/oberbeck/sign-up" signInFallbackRedirectUrl="/labs/oberbeck" signUpFallbackRedirectUrl="/labs/oberbeck" /><div id="clerk-captcha" /></section></main>
}
export function GoogleAuthRequirements() { return <Register /> }
