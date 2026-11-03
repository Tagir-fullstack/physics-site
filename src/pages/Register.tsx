import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AccountAuth from '../components/auth/AccountAuth'
import '../styles/register.css'
import AuthBackground from '../components/auth/AuthBackground'

export default function Register() {
  const { user, isLoading } = useAuth()
  const [params] = useSearchParams()
  const requested = params.get('redirect') || '/account'
  const returnTo = requested.startsWith('/') && !requested.startsWith('//') && !/[\\\r\n]/.test(requested) ? requested : '/account'
  if (!isLoading && user) return <Navigate to={returnTo} replace />
  return <main className="registration-page registration-page--auth">
    <AuthBackground />
    <div className="registration-shell"><aside className="registration-intro"><span className="registration-eyebrow">PHYSEZ / ВАШЕ ОБУЧЕНИЕ</span><h1>Начинается{'\n'}с интереса</h1><p>Войдите за один шаг. Вуз и преподавателя выберете перед началом лабораторной.</p><div className="registration-benefits"><span>Один аккаунт на всех устройствах</span><span>Ваш постоянный вариант</span><span>Работы вашего преподавателя</span></div></aside>
      <section className="registration-card"><AccountAuth returnTo={returnTo}/><p className="registration-legal">Продолжая, вы принимаете <Link to="/terms">условия использования</Link> и <Link to="/privacy">политику конфиденциальности</Link>.</p></section>
    </div>
  </main>
}
