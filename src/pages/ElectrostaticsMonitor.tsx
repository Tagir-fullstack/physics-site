import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { studentRequest, type StudentProfile } from '../lib/studentProfile'
import { ELECTRO_STATUS, type ElectroMonitorRow, type ElectroSubmission } from '../lib/electrostaticsSubmission'
import { variantDescription } from '../lib/electrostatics'
import ElectroResultsPreview from '../components/ElectroResultsPreview'
import '../styles/assessment-monitor.css'
import '../styles/electrostatics.css'
const endpoint='/api/student-profile?lab=electrostatics'
type List={students:ElectroMonitorRow[];hasMore:boolean}
type Detail={student:StudentProfile;submission:ElectroSubmission;history?:Array<{id:string;createdAt:string;status:ElectroSubmission['status']}>}
function Review({work,onSaved}:{work:ElectroSubmission;onSaved:(work:ElectroSubmission)=>void}) {
  const {authFetch}=useApiClient()
  const [status,setStatus]=useState(work.status),[comment,setComment]=useState(work.comment),[busy,setBusy]=useState(false),[error,setError]=useState('')
  return <section className="monitor-panel"><h2>Проверка работы</h2><form className="es-review-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const result=await studentRequest<{submission:ElectroSubmission}>(endpoint,{action:'review',id:work.id,reviewVersion:work.reviewVersion,status,comment},authFetch);onSaved(result.submission)}catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить проверку.')}finally{setBusy(false)}}}>
    <label>Статус<select value={status} disabled={busy} onChange={e=>setStatus(e.target.value as ElectroSubmission['status'])}>{(['submitted','accepted','revision'] as const).map(value=><option key={value} value={value}>{ELECTRO_STATUS[value]}</option>)}</select></label>
    <label>Комментарий студенту<textarea value={comment} maxLength={5000} disabled={busy} onChange={e=>setComment(e.target.value)} required={status==='revision'}/></label>
    <button className="monitor-export" disabled={busy}>{busy?'Сохраняем…':'Сохранить проверку'}</button>{error&&<p className="monitor-error" role="alert">{error}</p>}
    {work.reviewedAt&&<p>Последняя проверка: {new Date(work.reviewedAt).toLocaleString('ru-RU')}</p>}
  </form></section>
}
export default function ElectrostaticsMonitor() {
  const {user,isLoading}=useAuth(),{authFetch}=useApiClient(),{id}=useParams(),location=useLocation(),navigate=useNavigate()
  const base=location.pathname.startsWith('/teacher/')?'/teacher/electrostatics-monitor':'/admin/electrostatics-monitor'
  const [filters,setFilters]=useState({q:'',group:'',status:''}),[draft,setDraft]=useState(filters),[page,setPage]=useState(0),[retry,setRetry]=useState(0)
  const [sorting,setSorting]=useState<{sort:'name'|'variant';direction:'asc'|'desc'}>({sort:'name',direction:'asc'})
  const sortBy=(sort:'name'|'variant')=>{setSorting(old=>({sort,direction:old.sort===sort&&old.direction==='asc'?'desc':'asc'}));setPage(0)}
  const [result,setResult]=useState<{key:string;data:List|Detail|null;error:string}|null>(null)
  const requestKey=JSON.stringify([user?.id,id,page,filters,sorting,retry])
  useEffect(()=>{
    if(isLoading||!user)return
    const controller=new AbortController(),params=new URLSearchParams(id?{view:'detail',id}:{view:'list',page:String(page),...filters,...sorting})
    authFetch(`${endpoint}&${params}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);if(!controller.signal.aborted)setResult({key:requestKey,data,error:''})}).catch(e=>{if(!controller.signal.aborted)setResult({key:requestKey,data:null,error:e instanceof Error?e.message:'Не удалось загрузить результаты.'})})
    return()=>controller.abort()
  },[authFetch,isLoading,user,requestKey,id,page,filters,sorting])
  const ready=result?.key===requestKey,data=ready?result.data:null
  return <main className="monitor-page monitor-page--narrow es-monitor-page"><div className="monitor-container">
    <header className="monitor-header"><div><span className="monitor-kicker">Лабораторная №6</span><h1>Электростатические поля</h1><p>{id?'Измерения и ответы студента':'Варианты студентов и архив результатов'}</p></div><Link className="monitor-export" to={id?base:base.startsWith('/teacher')?'/teacher':'/admin/assessment-monitor'}>{id?'← Все студенты':'← Выбрать работу'}</Link></header>
    {!isLoading&&!user?<p>Войдите в аккаунт для просмотра результатов.</p>:!ready?<p role="status">Загружаем результаты…</p>:result.error?<section className="monitor-panel"><p className="monitor-error" role="alert">{result.error}</p><button className="monitor-export" onClick={()=>setRetry(n=>n+1)}>Повторить</button></section>:null}
    {!id&&<form className="monitor-panel es-monitor-filters" onSubmit={e=>{e.preventDefault();setFilters({...draft});setPage(0)}}><label>Поиск<input value={draft.q} onChange={e=>setDraft({...draft,q:e.target.value})} placeholder="Фамилия, имя, номер"/></label><label>Группа<input value={draft.group} onChange={e=>setDraft({...draft,group:e.target.value})} placeholder="Например, B062"/></label><label>Статус<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="">Все</option>{Object.entries(ELECTRO_STATUS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="monitor-export">Найти</button><button type="button" className="monitor-export" onClick={()=>setRetry(n=>n+1)}>Обновить</button></form>}
    {data&&'students'in data&&<section className="monitor-panel"><p>Ожидаемый рисунок доступен для каждого варианта. Студенты оформляют работу на миллиметровой бумаге; отправка из лабораторной отключена. Ранее отправленные результаты доступны в архиве.</p><div className="monitor-table-scroll"><table className="monitor-table"><thead><tr><th aria-sort={sorting.sort==='name'?(sorting.direction==='asc'?'ascending':'descending'):'none'}><button className="es-sort-heading" onClick={()=>sortBy('name')}>Фамилия, имя {sorting.sort==='name'?(sorting.direction==='asc'?'↑':'↓'):'↕'}</button></th><th>Группа</th><th aria-sort={sorting.sort==='variant'?(sorting.direction==='asc'?'ascending':'descending'):'none'}><button className="es-sort-heading" onClick={()=>sortBy('variant')}>Вариант {sorting.sort==='variant'?(sorting.direction==='asc'?'↑':'↓'):'↕'}</button></th><th>Рисунок</th></tr></thead><tbody>{data.students.map(s=><tr key={s.id}><td>{s.lastName} {s.firstName}</td><td>{s.group}</td><td>{s.variantNumber}</td><td><div className="es-monitor-row-actions"><Link to={`${base}/expected/${s.id}`}>Ожидаемый рисунок</Link>{s.submissionId&&<Link to={`${base}/${s.submissionId}`}>Работа студента →</Link>}</div></td></tr>)}</tbody></table></div>{!data.students.length&&<p>Студенты по этим условиям не найдены.</p>}<div className="es-button-row"><button className="monitor-export" disabled={!page} onClick={()=>setPage(n=>n-1)}>← Назад</button><span>Страница {page+1}</span><button className="monitor-export" disabled={!data.hasMore} onClick={()=>setPage(n=>n+1)}>Далее →</button></div></section>}
    {data&&'submission'in data&&<>
      <section className="monitor-panel"><h2>{data.student.lastName} {data.student.firstName} · {data.student.group}</h2><p>Вариант №{data.submission.variant.number} · {variantDescription(data.submission.variant)} · {data.submission.variant.voltage} В</p><p><b>{ELECTRO_STATUS[data.submission.status]}</b> · {new Date(data.submission.createdAt).toLocaleString('ru-RU')}</p><p>{data.submission.progress.lines}/{data.submission.progress.totalLines} линий · {data.submission.progress.calculations}/{data.submission.progress.pairs} расчётов · {data.submission.progress.answered}/9 ответов</p>{data.history&&data.history.length>1&&<label>Предыдущие отправки<select value={data.submission.id} onChange={e=>navigate(`${base}/${e.target.value}`)}>{data.history.map(h=><option key={h.id} value={h.id}>{new Date(h.createdAt).toLocaleString('ru-RU')} · {ELECTRO_STATUS[h.status]}</option>)}</select></label>}<button className="monitor-export" onClick={()=>setRetry(n=>n+1)}>Обновить работу</button></section>
      <Review key={`${data.submission.id}:${data.submission.reviewVersion}`} work={data.submission} onSaved={work=>setResult(current=>current?.key===requestKey?{...current,data:{...data,submission:work,history:data.history?.map(h=>h.id===work.id?{...h,status:work.status}:h)}}:current)}/>
      <ElectroResultsPreview key={data.submission.id} variant={data.submission.variant} notebook={data.submission.notebook}/>
    </>}
  </div></main>
}
