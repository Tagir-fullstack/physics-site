import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { ASSESSMENT_GROUPS } from '../lib/monitorGrading'
import { useStudentProfile } from '../lib/studentProfile'
import '../styles/assessment-sessions.css'

type Student = { lastName: string; firstName: string; group: string; variantNumber?: number }
type Entry = { mode: 'session' | 'legacy'; phase: 'code' | 'waiting' | 'pending' | 'rejected' | 'closed' | 'active'; canPractice: boolean; serverNow: string; revealAt: string | null; released: boolean; participantId?: string; student?: Student; session?: { id: string; name: string; startsAt: string; endsAt: string }; error?: string }
export type SessionRunnerProps = { practice?: boolean; participantStudent?: Student; sessionDeadline?: { expiresAt: string; serverNow: string } }
export default function AssessmentSessionGate({ endpoint, children }: { endpoint: string; children: (props: SessionRunnerProps) => ReactNode }) {
  const { isLoading } = useAuth()
  const { profile } = useStudentProfile()
  const { authFetch } = useApiClient()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [practice, setPractice] = useState(false)
  const [language, setLanguage] = useState<'ru' | 'kk'>(() => localStorage.getItem('mechanics-assessment-language') === 'kk' ? 'kk' : 'ru')
  const kk = language === 'kk'
  const load = useCallback(async () => {
    const response = await authFetch(`${endpoint}?view=entry`)
    const payload = await response.json() as Entry
    if (!response.ok) throw Error(payload.error || 'Не удалось проверить допуск.')
    return payload
  }, [authFetch, endpoint])
  useEffect(() => {
    if (isLoading || practice) return
    let live = true
    const update = () => { void load().then(payload => { if (live) { setEntry(previous => ({ ...payload, student: previous?.participantId === payload.participantId ? previous?.student ?? payload.student : payload.student })); setError('') } }).catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Нет связи.') }) }
    update(); const timer = window.setInterval(update, 3000)
    return () => { live = false; window.clearInterval(timer) }
  }, [load, isLoading, practice])
  const switchLanguage = (next: 'ru' | 'kk') => { localStorage.setItem('mechanics-assessment-language', next); setLanguage(next) }
  if (practice) return children({ practice: true })
  // Legacy mechanics and fixture previews retain their existing entry form.
  if (entry && entry.mode !== 'session') return children({})
  if (entry?.phase === 'active') return <div key={`${entry.participantId}:${entry.released}`}>{children({ participantStudent: entry.student, sessionDeadline: entry.session ? { expiresAt: entry.session.endsAt, serverNow: entry.serverNow } : undefined })}</div>
  const date = (value: string) => new Date(value).toLocaleString(kk ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return <main className="exam-entry-page"><section className="exam-entry-card" lang={kk ? 'kk' : 'ru'}>
    <div className="exam-entry-header">
      <span className="assessment-kicker">{kk ? 'Аралық бақылау' : 'Контрольный срез'}</span>
      <div className="exam-entry-language" role="group" aria-label={kk ? 'Тілді таңдау' : 'Выбор языка'}><button type="button" aria-pressed={!kk} onClick={() => switchLanguage('ru')}>Русский</button><button type="button" aria-pressed={kk} onClick={() => switchLanguage('kk')}>Қазақша</button></div>
    </div>
    <h1>{entry?.phase === 'pending' ? (kk ? 'Рұқсат күтілуде' : 'Ожидание допуска') : entry?.phase === 'waiting' ? (kk ? 'Күту залы' : 'Зал ожидания') : entry?.phase === 'closed' ? (kk ? 'Сеанс аяқталды' : 'Сеанс завершён') : entry?.phase === 'rejected' ? (kk ? 'Рұқсат берілмеді' : 'Допуск отклонён') : (kk ? 'Сеансқа кіру' : 'Вход в сеанс')}</h1>
    {error && <p className="exam-entry-notice" role="alert">{error}</p>}
    {!entry && !error && <p>{kk ? 'Кіру мүмкіндігі тексерілуде…' : 'Проверяем доступ…'}</p>}
    {entry?.student && <div className="exam-entry-student"><strong>{entry.student.lastName} {entry.student.firstName}</strong><span>{kk ? 'ОП / топ' : 'ОП / группа'}: {entry.student.group}</span></div>}
    {entry?.session && <section className="exam-entry-session" aria-label={kk ? 'Сеанс туралы' : 'О сеансе'}>
      <h2>{entry.session.name}</h2>
      <dl><div><dt>{kk ? 'Басталуы' : 'Начало'}</dt><dd><time dateTime={entry.session.startsAt}>{date(entry.session.startsAt)}</time></dd></div><div><dt>{kk ? 'Аяқталуы' : 'Окончание'}</dt><dd><time dateTime={entry.session.endsAt}>{date(entry.session.endsAt)}</time></dd></div></dl>
    </section>}
    {entry?.phase === 'waiting' && <p className="exam-entry-notice">{kk ? 'Сіз тіркелдіңіз. Тапсырмалар ортақ старт кезінде автоматты түрде ашылады. Бетті ашық ұстаңыз.' : 'Вы зарегистрированы. Задания откроются автоматически в момент общего старта. Оставьте страницу открытой.'}</p>}
    {entry?.phase === 'pending' && <p className="exam-entry-notice">{kk ? 'Сіз старттан кейін кірдіңіз. Өтінім оқытушыға жіберілді. Рұқсат берілсе, тек қалған уақыт беріледі.' : 'Вы вошли после старта. Заявка отправлена преподавателю. При допуске будет доступно только оставшееся время.'}</p>}
    {entry?.phase === 'closed' && <p className="exam-entry-notice">{kk ? 'Бұл сеансқа жаңа қатысушылар қабылданбайды. Оқытушыға хабарласыңыз.' : 'Приём новых участников завершён. Обратитесь к преподавателю.'}</p>}
    {entry?.phase === 'rejected' && <div className="exam-entry-notice exam-entry-notice--rejected"><h2>{kk ? 'Не істеу керек?' : 'Что делать дальше?'}</h2><p>{kk ? 'Оқытушы бұл сеансқа кіруге рұқсат бермеді. Тапсырмалар қолжетімсіз. Егер бұл қате болса, оқытушыға хабарласыңыз.' : 'Преподаватель отклонил или отозвал допуск к этому сеансу. Задания недоступны. Если это ошибка, обратитесь к преподавателю.'}</p></div>}
    {entry?.phase === 'code' && <><p>{kk ? 'Аудиториядағы оқытушыдан сеанс кодын алыңыз. Стартқа дейін тапсырмалар көрсетілмейді. ОП/топ қатысушыларды бөлу үшін қолданылмайды.' : 'Получите код сеанса у преподавателя в аудитории. До старта задания скрыты. В одном сеансе могут участвовать студенты разных ОП и групп.'}</p>
      <form onSubmit={async event => {
        event.preventDefault(); if (busy) return
        const fields = new FormData(event.currentTarget), student = { lastName: String(fields.get('lastName')), firstName: String(fields.get('firstName')), group: String(fields.get('group')) }
        setBusy(true); setError('')
        try {
          const response = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'joinSession', code: String(fields.get('code')), student, language }) })
          const payload = await response.json() as Entry
          if (!response.ok) throw Error(payload.error || 'Не удалось войти.')
          localStorage.setItem('mechanics-assessment-student', JSON.stringify(student)); setEntry(payload)
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось войти.') }
        finally { setBusy(false) }
      }}><label>{kk ? 'Сеанс коды' : 'Код сеанса'}<input name="code" required minLength={6} maxLength={20} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder={kk ? 'Мысалы: 482915' : 'Например: 482915'} /></label><label>{kk ? 'Тегі' : 'Фамилия'}<input name="lastName" defaultValue={profile?.lastName} readOnly={!!profile} required minLength={2} maxLength={60} autoComplete="family-name" /></label><label>{kk ? 'Аты' : 'Имя'}<input name="firstName" defaultValue={profile?.firstName} readOnly={!!profile} required minLength={2} maxLength={60} autoComplete="given-name" /></label><label>{kk ? 'ОП / топ' : 'ОП / группа'}<select key={profile?.group ?? 'empty'} name="group" disabled={!!profile} required defaultValue={profile?.group ?? ''}><option value="" disabled>{kk ? 'ОП таңдаңыз' : 'Выберите ОП'}</option>{ASSESSMENT_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}</select>{profile && <input type="hidden" name="group" value={profile.group} />}</label><button disabled={busy}>{busy ? '…' : (kk ? 'Кіру / рұқсат сұрау' : 'Войти / запросить допуск')}</button></form></>}
    <div className="exam-entry-release"><h2>{kk ? 'Нәтижелер мен дұрыс жауаптар' : 'Результаты и правильные ответы'}</h2><p>{kk ? 'Барлық ағындар аяқталғаннан кейін ашылады.' : 'Откроются после завершения всех потоков.'}</p>{entry?.revealAt ? <time dateTime={entry.revealAt}>{date(entry.revealAt)}</time> : <p>{kk ? 'Оқытушы ашылатын күнді кейінірек белгілейді.' : 'Дату открытия назначит преподаватель.'}</p>}</div>
    {entry?.canPractice && <button type="button" className="exam-entry-practice" onClick={() => setPractice(true)}>{kk ? 'Әкімшінің тест режимі' : 'Тестовый запуск администратора'}</button>}
  </section></main>
}
