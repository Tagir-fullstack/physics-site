import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApiClient } from '../lib/apiClient'
import type { EducationProfile } from '../lib/education'

export default function EducationAccount({ userId }: { userId: string }) {
  const { authFetch } = useApiClient()
  const [result, setResult] = useState<{ userId: string; profile: EducationProfile | null; error?: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    authFetch('/api/account?education=profile', { signal: controller.signal }).then(async r => {
      const data = await r.json()
      if (!r.ok) throw Error(data.error)
      if (!controller.signal.aborted) setResult({ userId, profile: data.profile })
    }).catch(() => { if (!controller.signal.aborted) setResult({ userId, profile: null, error: 'Учебный профиль временно недоступен.' }) })
    return () => controller.abort()
  }, [userId, authFetch])
  if (!result || result.userId !== userId) return null
  const profile = result.profile
  return <section className="account-section education-account"><div className="account-section-heading"><div><span>Ваше обучение</span><h2 className="account-section-title">{profile?.role === 'teacher' ? 'Студенты и задания' : 'Вуз и преподаватель'}</h2></div><Link to="/education">{profile ? 'Изменить' : 'Настроить'}</Link></div>
    {result.error ? <p role="status">{result.error}</p> : profile ? <><p>{profile.institution}</p><p>{profile.role === 'teacher' ? profile.teacherStatus === 'approved' ? 'Вы подтверждены как преподаватель. Студенты могут выбрать вас при входе в лабораторную.' : profile.teacherStatus === 'rejected' ? `Заявка отклонена: ${profile.verificationNote || 'Обратитесь к администратору.'}` : 'Заявка преподавателя ожидает подтверждения администратором.' : profile.teacherName ? `Преподаватель: ${profile.teacherName}` : 'Выберите преподавателя, когда он зарегистрируется на платформе.'}</p><Link className="education-account-action" to={profile.role === 'teacher' ? '/teacher/tests' : '/student/tests'}>{profile.role === 'teacher' ? 'Тесты, классы и мониторинг' : 'Мои задания'}</Link></> : <p>Выберите вуз и преподавателя, чтобы видеть свои задания и результаты.</p>}
  </section>
}
