import { AuthenticateWithRedirectCallback, SignIn, SignUp } from '@clerk/clerk-react'
import '../styles/student-profile.css'
export function GoogleAuthCallback() {
  return <main className="student-page"><section className="student-panel"><p role="status">Завершаем вход и возвращаемся к лабораторной…</p><AuthenticateWithRedirectCallback signInUrl="/labs/oberbeck/sign-in" signUpUrl="/labs/oberbeck/sign-up" signInFallbackRedirectUrl="/labs/oberbeck" signUpFallbackRedirectUrl="/labs/oberbeck" /><div id="clerk-captcha" /></section></main>
}
export function GoogleAuthRequirements({ signup = false }: { signup?: boolean }) {
  return <main className="student-page"><section className="student-panel">{signup ? <SignUp routing="path" path="/labs/oberbeck/sign-up" signInUrl="/labs/oberbeck/sign-in" forceRedirectUrl="/labs/oberbeck" /> : <SignIn routing="path" path="/labs/oberbeck/sign-in" signUpUrl="/labs/oberbeck/sign-up" forceRedirectUrl="/labs/oberbeck" />}</section></main>
}
