import { useEffect, useState } from 'react'
import { useApiClient } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import '../styles/assessment-monitor.css'
type Request = { userId: string; displayName: string; institution: string; department: string; teacherStatus: string; verificationNote?: string }
export default function TeacherReviews() {
  const { user, isLoading } = useAuth()
  const { authFetch } = useApiClient()
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(0)
  const [requests, setRequests] = useState<Request[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string,string>>({})
  useEffect(() => {
    if (isLoading) return
    const controller = new AbortController()
    authFetch(`/api/account?education=reviews&status=${status}&page=${page}`, { signal: controller.signal }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error); if (!controller.signal.aborted) { setRequests(d.requests); setHasMore(d.hasMore); setError('') } }).catch(e => { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Не удалось загрузить заявки.'); setRequests([]) } }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [authFetch, isLoading, user?.id, status, page, reload])
  const review = async (request: Request, decision: string) => {
    const note = notes[request.userId] || ''
    if (decision === 'rejected' && note.trim().length < 3) { setError('Напишите причину отклонения в поле заявки.'); return }
    setBusy(request.userId); setError('')
    try {
      const r = await authFetch('/api/account?education=profile', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'reviewTeacher',userId:request.userId,status:decision,note}) })
      const d = await r.json(); if (!r.ok) throw Error(d.error)
      setReload(n => n + 1)
    } catch(e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить решение.') }
    finally { setBusy('') }
  }
  return <main className="monitor-page monitor-page--narrow"><div className="monitor-container"><header className="monitor-header"><div><span className="monitor-kicker">PHYSEZ · АДМИНИСТРАТОР</span><h1>Заявки преподавателей</h1><p>Проверьте принадлежность к вузу и кафедре перед одобрением. Подтверждение роли не выдаёт PRO.</p></div><Link className="monitor-export" to="/account">Личный кабинет</Link></header>
    <section className="monitor-panel"><label>Статус <select value={status} onChange={e => {setStatus(e.target.value);setPage(0)}}><option value="pending">Ожидают</option><option value="approved">Одобрены</option><option value="rejected">Отклонены</option></select></label>{error && <p className="monitor-error" role="alert">{error}</p>}{loading ? <p role="status">Загружаем заявки…</p> : !requests.length && !error ? <p>Заявок нет.</p> : requests.map(r => <article className="teacher-review" key={r.userId}><h2>{r.displayName}</h2><p>{r.institution}</p><p>Кафедра: {r.department || 'Не указана'}</p>{r.verificationNote && <p>{r.verificationNote}</p>}{status === 'pending' && <><label>Комментарий / причина отклонения<input maxLength={500} value={notes[r.userId] || ''} onChange={e => setNotes(n => ({...n,[r.userId]:e.target.value}))}/></label><div><button disabled={!!busy} className="monitor-export" onClick={() => void review(r,'approved')}>Одобрить</button><button disabled={!!busy} className="monitor-export" onClick={() => void review(r,'rejected')}>Отклонить</button></div></>}</article>)}<div className="passwordless-actions"><button disabled={page === 0} onClick={() => setPage(n=>n-1)}>Назад</button><span>Страница {page+1}</span><button disabled={!hasMore} onClick={()=>setPage(n=>n+1)}>Далее</button></div></section>
  </div></main>
}
