import { useCallback, useEffect, useState } from 'react'
import { useApiClient } from '../lib/apiClient'
import SessionDateTimeInput from './SessionDateTimeInput'
import '../styles/assessment-sessions.css'

type Participant = { id: string; student: { lastName: string; firstName: string; group: string }; status: string; submittedAt: string | null; joinedAt: string; expiresAt: string; extraSeconds: number; extensionReason: string | null }
type ExamSession = { id: string; name: string; code: string; opensAt: string; startsAt: string; endsAt: string; endedAt: string | null; durationMinutes: number; participants: Participant[] }
type Payload = { sessions: ExamSession[]; sessionsRequired: boolean; revealAt: string | null; serverNow: string; error?: string }
const localInput = (value: string | number) => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) }
const date = (value: string) => new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function AssessmentSessionManager({ endpoint, period, testId, active }: { endpoint: string; period: string; testId: string; active: boolean }) {
  const { authFetch } = useApiClient()
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingEntry, setEditingEntry] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    const response = await authFetch(`${endpoint}?view=sessions&period=${encodeURIComponent(period)}`)
    const payload = await response.json() as Payload
    if (!response.ok) throw Error(payload.error || 'Не удалось загрузить сеансы.')
    if (!Array.isArray(payload.sessions)) throw Error('Сервер не вернул список сеансов. Обновите страницу после обновления сервера.')
    setData(payload)
  }, [authFetch, endpoint, period])
  useEffect(() => {
    let live = true
    const update = () => { if (live) void load().catch(e => { if (live) setError(e instanceof Error ? e.message : 'Нет связи.') }) }
    update(); const timer = window.setInterval(update, 5000)
    return () => { live = false; window.clearInterval(timer) }
  }, [load])
  const action = async (body: Record<string, unknown>) => {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, period }) })
      const payload = await response.json() as { id?: string; error?: string }
      if (!response.ok) throw Error(payload.error || 'Не удалось сохранить.')
      if (body.action === 'createSession') { setSelected(payload.id ?? ''); setCreating(false) }
      if (body.action === 'updateEntryTime') { setEditingEntry(''); setNotice('Время открытия входа сохранено. Старт и длительность работы не изменились.') }
      if (body.action === 'revokeParticipant') setNotice('Допуск отозван. Студент больше не может открывать задания или отправлять ответы. Запись и сохранённые ответы не удалены.')
      if (body.action === 'restoreParticipant') setNotice('Допуск возвращён. Студент автоматически увидит зал ожидания или продолжит прежнюю работу на оставшееся время. Вариант, ответы и срок окончания сохранены.')
      if (body.action === 'shortenSessionCode') setNotice('Код заменён на 6 цифр. Старый код больше не работает. Уже зарегистрированные участники сохраняют допуск.')
      await load(); return true
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить.'); return false }
    finally { setBusy(false) }
  }
  const session = data?.sessions.find(s => s.id === selected) ?? data?.sessions[0]
  const now = data ? Date.parse(data.serverNow) : Date.now()
  const closed = !!session && (Boolean(session.endedAt) || Date.parse(session.endsAt) <= now)
  const started = !!session && Date.parse(session.startsAt) <= now
  const participants = [...(session?.participants ?? [])].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || `${a.student.lastName} ${a.student.firstName}`.localeCompare(`${b.student.lastName} ${b.student.firstName}`, 'ru'))
  return <section className="monitor-panel exam-session-manager" aria-label="Сеансы и зал ожидания">
    <div className="exam-session-heading"><div><h2>Сеансы и зал ожидания</h2><p>Один сеанс — один поток, независимо от ОП и группы. Данные обновляются каждые 5 секунд.</p></div><button className="monitor-export" disabled={!active || busy} onClick={() => setCreating(v => !v)}>{creating ? 'Закрыть форму' : 'Создать сеанс'}</button></div>
    {error && <p className="monitor-error" role="alert">{error}</p>}
    {notice && <p className="exam-session-success" role="status">{notice}</p>}
    {data && <form className="exam-reveal-form" onSubmit={event => {
      event.preventDefault(); const value = String(new FormData(event.currentTarget).get('revealAt') ?? '')
      void action({ action: 'saveReveal', revealAt: value ? new Date(value).toISOString() : null })
    }}><SessionDateTimeInput key={data.revealAt ?? 'closed'} label="Открыть студентам правильные ответы и разбор" name="revealAt" defaultValue={data.revealAt ? localInput(data.revealAt) : ''} /><button className="monitor-export" disabled={busy}>Сохранить дату</button><small>Итоговый балл виден сразу после сдачи. {data.revealAt ? `Ответы и разбор откроются всем потокам: ${date(data.revealAt)}` : 'Дата не задана — ответы и разбор закрыты. Задайте конец всей экзаменационной недели.'}</small></form>}
    {creating && <form className="exam-create-form" onSubmit={event => {
      event.preventDefault(); const fields = new FormData(event.currentTarget)
      void action({ action: 'createSession', name: String(fields.get('name')), opensAt: new Date(String(fields.get('opensAt'))).toISOString(), startsAt: new Date(String(fields.get('startsAt'))).toISOString(), durationMinutes: Number(fields.get('durationMinutes')) })
    }}><label>Название потока<input name="name" required minLength={2} maxLength={120} placeholder="Например: поток Физика · понедельник" /></label><SessionDateTimeInput label="Открыть вход в зал" name="opensAt" required defaultValue={localInput(Date.now())} shortcuts={[{ label: 'Сейчас', value: () => Date.now() }]} /><SessionDateTimeInput label="Общий старт" name="startsAt" required defaultValue={localInput(Date.now() + 10 * 60_000)} /><label>Длительность, минут<input name="durationMinutes" type="number" min={1} max={180} required defaultValue={testId === 'midterm' ? 50 : 30} /></label><p>Часовой пояс: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Старт произойдёт по расписанию; можно запустить раньше вручную. Опоздавшие попадут в очередь допуска.</p><button className="monitor-export" disabled={busy}>Создать сеанс и получить код</button></form>}
    {!data && <p>Загружаем сеансы…</p>}
    {data && !session && <p>{data.sessionsRequired ? 'Без созданного сеанса вход студентам закрыт.' : 'Сеансы пока не включены для этой работы. Создание первого сеанса включит вход по коду.'}</p>}
    {data && session && <>
      <div className="exam-session-toolbar"><label>Сеанс<select value={session.id} onChange={e => { setSelected(e.target.value); setNotice(''); setEditingEntry('') }}>{data.sessions.map(s => <option key={s.id} value={s.id}>{s.name} · {date(s.startsAt)}</option>)}</select></label><span className={`exam-session-status exam-session-status--${closed ? 'closed' : started ? 'active' : 'waiting'}`}>{closed ? 'Завершён' : started ? 'Идёт работа' : 'Ожидание старта'}</span></div>
      <div className="exam-session-summary"><div><span>Код для аудитории</span><strong className="exam-session-code">{session.code}</strong>{session.code.length > 6 && !started && !closed && active && <button type="button" className="exam-entry-edit exam-code-edit" disabled={busy} onClick={() => {
        if (window.confirm('Заменить код на 6 цифр? Старый код перестанет работать. Уже зарегистрированные студенты сохранят доступ.')) void action({ action: 'shortenSessionCode', sessionId: session.id })
      }}>Упростить код</button>}</div><div><span>Вход с</span><strong>{date(session.opensAt)}</strong>{!started && !closed && active && <button type="button" className="exam-entry-edit" disabled={busy} onClick={() => setEditingEntry(editingEntry === session.id ? '' : session.id)}>{editingEntry === session.id ? 'Отмена' : 'Изменить время'}</button>}</div><div><span>Общий старт</span><strong>{date(session.startsAt)}</strong></div><div><span>Общее окончание</span><strong>{date(session.endedAt ?? session.endsAt)}</strong></div></div>
      {editingEntry === session.id && !started && !closed && <form key={session.id} className="exam-entry-time-form" onSubmit={event => {
        event.preventDefault(); const value = String(new FormData(event.currentTarget).get('opensAt') ?? '')
        if (value) void action({ action: 'updateEntryTime', sessionId: session.id, opensAt: new Date(value).toISOString() })
      }}><SessionDateTimeInput label="Открыть вход в зал" name="opensAt" required max={localInput(session.startsAt)} defaultValue={localInput(session.opensAt)} shortcuts={[
        { label: 'Сейчас', value: () => Date.now() },
        { label: 'За 10 мин до старта', value: () => Date.parse(session.startsAt) - 10 * 60_000 },
        { label: 'За 15 мин до старта', value: () => Date.parse(session.startsAt) - 15 * 60_000 },
      ]} /><button className="monitor-export" disabled={busy}>Сохранить время входа</button><small>Часовой пояс: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Меняется только вход в зал — общий старт и окончание остаются прежними. Уже зарегистрированные участники сохраняют допуск.</small></form>}
      <div className="exam-session-toolbar"><span>Вошли: {participants.length} · допущены: {participants.filter(p => p.status === 'admitted').length} · ожидают допуска: {participants.filter(p => p.status === 'pending').length}</span>{!started && !closed && <button className="monitor-export" disabled={busy} onClick={() => { if (window.confirm(`Начать сеанс «${session.name}» сейчас? Вход без ручного допуска закроется. Длительность — ${session.durationMinutes} минут.`)) void action({ action: 'startSession', sessionId: session.id }) }}>Начать сейчас</button>}{!closed && <button className="monitor-export" disabled={busy} onClick={() => { if (window.confirm('Завершить работу для всех участников сейчас? Новые ответы больше не будут приниматься.')) void action({ action: 'endSession', sessionId: session.id }) }}>Завершить сеанс</button>}</div>
      <div className="monitor-table-scroll"><table className="exam-participants-table"><thead><tr><th>Студент / ОП</th><th>Вошёл</th><th>Допуск</th><th>Осталось</th><th>Действия</th></tr></thead><tbody>{participants.map(p => <tr key={p.id}><td>{p.student.lastName} {p.student.firstName}<small>{p.student.group}</small></td><td>{date(p.joinedAt)}</td><td>{p.submittedAt ? 'Работа сдана' : p.status === 'pending' ? 'Заявка опоздавшего' : p.status === 'rejected' ? 'Отклонён' : 'Допущен'}</td><td>{p.submittedAt || p.status !== 'admitted' ? '—' : `${Math.max(0, Math.ceil((Date.parse(p.expiresAt) - Math.max(now, Date.parse(session.startsAt))) / 60_000))} мин`}{p.extraSeconds > 0 && <small>+{p.extraSeconds / 60} мин · {p.extensionReason}</small>}</td><td>{p.status === 'pending' && !closed && <div className="exam-participant-actions"><button className="monitor-export" disabled={busy} onClick={() => void action({ action: 'decideParticipant', sessionId: session.id, participantId: p.id, admit: true })}>Допустить на оставшееся время</button><button className="monitor-export" disabled={busy} onClick={() => void action({ action: 'decideParticipant', sessionId: session.id, participantId: p.id, admit: false })}>Отклонить</button></div>}{p.status === 'admitted' && !p.submittedAt && !session.endedAt && <button className="monitor-export" disabled={busy} onClick={() => {
        const minutes = window.prompt(`Дополнительные минуты для ${p.student.lastName} ${p.student.firstName}`, '5'); if (minutes === null) return
        const reason = window.prompt('Причина продления (не менее 5 символов)'); if (reason === null) return
        void action({ action: 'extendParticipant', sessionId: session.id, participantId: p.id, minutes: Number(minutes), reason })
      }}>Добавить время</button>}{p.status === 'admitted' && !p.submittedAt && !session.endedAt && Date.parse(p.expiresAt) > now && <button className="monitor-export exam-revoke-button" disabled={busy} onClick={() => {
        if (window.confirm(`Отозвать допуск у ${p.student.lastName} ${p.student.firstName}? Студент потеряет доступ к заданиям и отправке ответов. Запись и сохранённая работа останутся в мониторинге.`)) void action({ action: 'revokeParticipant', sessionId: session.id, participantId: p.id })
      }}>Отозвать допуск</button>}{p.status === 'rejected' && !p.submittedAt && active && !session.endedAt && Date.parse(p.expiresAt) > now && <button className="monitor-export exam-restore-button" disabled={busy} onClick={() => {
        if (window.confirm(`Вернуть допуск студенту ${p.student.lastName} ${p.student.firstName}? До старта откроется зал ожидания, после старта — прежняя работа только на оставшееся время. Таймер не сбросится.`)) void action({ action: 'restoreParticipant', sessionId: session.id, participantId: p.id })
      }}>Вернуть допуск</button>}</td></tr>)}{!participants.length && <tr><td colSpan={5}>В зале пока нет участников.</td></tr>}</tbody></table></div>
    </>}
  </section>
}
