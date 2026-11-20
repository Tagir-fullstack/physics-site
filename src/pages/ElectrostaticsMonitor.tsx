import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { studentRequest, type StudentProfile } from '../lib/studentProfile'
import { ELECTRO_STATUS, type ElectroMonitorRow, type ElectroSubmission } from '../lib/electrostaticsSubmission'
import { variantDescription } from '../lib/electrostatics'
import MonitorActionIcon from '../components/MonitorActionIcon'
import DeleteStudentButton from '../components/DeleteStudentButton'
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
  const [filters,setFilters]=useState({q:'',group:''}),[sort,setSort]=useState('name'),[retry,setRetry]=useState(0)
  const [issuing,setIssuing]=useState<string|null>(null),[recovery,setRecovery]=useState<{url:string;name:string;accountId:string}|null>(null),[copied,setCopied]=useState(false),[actionError,setActionError]=useState('')
  const search=useRef<HTMLInputElement>(null),issuingRef=useRef(false),accountRef=useRef(user?.id)
  useEffect(()=>{accountRef.current=user?.id},[user?.id])
  const [managerAccount,setManagerAccount]=useState<string|null>(null)
  const canManage=base.startsWith('/admin/')&&managerAccount===user?.id
  useEffect(()=>{
    if(isLoading||!user)return
    const controller=new AbortController()
    void studentRequest<{userId:string;role:string}>('/api/account',undefined,(path,init)=>authFetch(path,{...init,signal:controller.signal})).then(access=>{if(!controller.signal.aborted)setManagerAccount(access.userId===user.id&&['owner','admin'].includes(access.role)?user.id:null)}).catch(()=>{if(!controller.signal.aborted)setManagerAccount(null)})
    return()=>controller.abort()
  },[authFetch,isLoading,user])
  const [result,setResult]=useState<{key:string;data:List|Detail|null;error:string}|null>(null)
  const requestKey=JSON.stringify([user?.id,id,retry])
  const issueRecovery=async(student:StudentProfile)=>{
    if(issuingRef.current)return
    issuingRef.current=true;setIssuing(student.id);setActionError('');setRecovery(null);setCopied(false)
    const account=user?.id
    try{const issued=await studentRequest<{path:string}>('/api/student-profile',{action:'issueRecovery',studentId:student.id},authFetch);if(accountRef.current===account)setRecovery({url:new URL(issued.path,window.location.origin).href,name:`${student.lastName} ${student.firstName}`,accountId:account??''})}
    catch(error){if(accountRef.current===account)setActionError(error instanceof Error?error.message:'Не удалось выдать ссылку.')}
    finally{issuingRef.current=false;setIssuing(null)}
  }
  useEffect(()=>{
    if(isLoading||!user)return
    const controller=new AbortController()
    const load=async()=>{
      if(id)return studentRequest<Detail>(`${endpoint}&view=detail&id=${encodeURIComponent(id)}`,undefined,(path,init)=>authFetch(path,{...init,signal:controller.signal}))
      // The API keeps enforcing scope and paging; the sibling variants screen filters the full list locally.
      const students:ElectroMonitorRow[]=[]
      for(let page=0;page<=10000;page++){
        const next=await studentRequest<List>(`${endpoint}&view=list&page=${page}&sort=name&direction=asc`,undefined,(path,init)=>authFetch(path,{...init,signal:controller.signal}))
        students.push(...next.students)
        if(!next.hasMore)return{students,hasMore:false}
        if(controller.signal.aborted)throw new DOMException('Aborted','AbortError')
      }
      throw Error('Список слишком большой. Обратитесь к администратору.')
    }
    void load().then(data=>{if(!controller.signal.aborted)setResult({key:requestKey,data,error:''})}).catch(error=>{if(!controller.signal.aborted)setResult({key:requestKey,data:null,error:error instanceof Error?error.message:'Не удалось загрузить результаты.'})})
    return()=>controller.abort()
  },[authFetch,isLoading,user,requestKey,id])
  const ready=result?.key===requestKey,data=ready?result.data:null
  const students=data&&'students'in data?data.students:[]
  const query=filters.q.trim().toLocaleLowerCase('ru')
  const visible=students.filter(student=>(!filters.group||student.group===filters.group)&&`${student.lastName} ${student.firstName} ${student.group} ${student.variantNumber}`.toLocaleLowerCase('ru').includes(query)).sort((a,b)=>sort==='number'?(a.variantNumber??0)-(b.variantNumber??0):`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'ru'))
  const groups=[...new Set(students.map(student=>student.group))].sort()
  return <main className="monitor-page monitor-page--narrow monitor-page--variants es-monitor-page"><div className="monitor-container">
    <header className="monitor-header"><div><span className="monitor-kicker">Лабораторная №6</span><h1>Электростатические поля</h1><p>{id?'Измерения и ответы студента':'Индивидуальные условия и ожидаемые рисунки для проверки.'}</p></div><Link className="monitor-export" to={id?base:base.startsWith('/teacher')?'/teacher':'/admin/assessment-monitor'}>{id?'← Все студенты':'Выбрать работу'}</Link></header>
    {!isLoading&&!user?<p>Войдите в аккаунт для просмотра результатов.</p>:!ready?<p role="status">Загружаем результаты…</p>:result.error?<section className="monitor-panel"><p className="monitor-error" role="alert">{result.error}</p><button className="monitor-export" onClick={()=>setRetry(n=>n+1)}>Повторить</button></section>:null}
    {actionError&&<p className="monitor-error" role="alert">{actionError}</p>}
    {recovery&&recovery.accountId===user?.id&&<section className="monitor-panel"><h2>Восстановление: {recovery.name}</h2><p>Передайте ссылку только этому студенту. Она одноразовая и действует 24 часа; профиль и вариант сохранятся.</p><input aria-label="Личная ссылка восстановления" readOnly value={recovery.url} onFocus={event=>event.target.select()}/><button className="monitor-export" onClick={()=>{void navigator.clipboard.writeText(recovery.url).then(()=>setCopied(true)).catch(()=>setActionError('Скопируйте ссылку вручную из поля.'))}}>{copied?'Скопировано':'Копировать ссылку'}</button><button className="monitor-export" onClick={()=>setRecovery(null)}>Закрыть</button></section>}
    {!id&&<section className="monitor-panel">
      <p>Показаны зарегистрированные профили, не список выполненных опытов. Ожидаемый рисунок доступен для каждого варианта. Работу студенты оформляют на миллиметровой бумаге; ранее отправленные результаты доступны в архиве.</p>
      <div className="monitor-toolbar"><label className="monitor-search">Поиск<div className="es-monitor-search-field"><input ref={search} value={filters.q} onChange={event=>setFilters({...filters,q:event.target.value})} placeholder="ФИО, группа или номер"/>{filters.q&&<button type="button" className="es-monitor-clear" aria-label="Очистить поиск" onClick={()=>{setFilters({...filters,q:''});search.current?.focus()}}>×</button>}</div></label>
        <div className="monitor-table-tools"><label>Группа<select value={filters.group} onChange={event=>setFilters({...filters,group:event.target.value})}><option value="">Все группы</option>{groups.map(group=><option key={group}>{group}</option>)}</select></label><label>Порядок<select value={sort} onChange={event=>setSort(event.target.value)}><option value="name">По фамилии</option><option value="number">По варианту</option></select></label><span aria-live="polite">Найдено: {ready?visible.length:'…'} из {ready?students.length:'…'}</span></div>
      </div>
      <div className="monitor-table-scroll" aria-busy={!ready}><table className="monitor-table"><thead><tr><th>Студент</th><th>Группа</th><th>Вариант</th><th><span className="es-action-label">Действия</span></th></tr></thead><tbody>{visible.map(student=><tr key={student.id}><td>{student.lastName} {student.firstName}</td><td>{student.group}</td><td>{student.variantNumber}</td><td><div className="ob-variant-actions monitor-icon-actions"><Link className="monitor-row-open monitor-icon-action" aria-label="Ожидаемый рисунок" title="Ожидаемый рисунок" to={`${base}/expected/${student.id}`}><MonitorActionIcon action="preview"/></Link>{student.submissionId&&<Link className="monitor-row-open monitor-icon-action" aria-label="Работа студента" title="Работа студента" to={`${base}/${student.submissionId}`}><MonitorActionIcon action="archive"/></Link>}{canManage&&<><button type="button" className="monitor-row-open monitor-icon-action" aria-label={issuing===student.id?'Выдаём ссылку…':'Восстановить доступ'} title="Восстановить доступ" aria-busy={issuing===student.id} disabled={issuing!==null} onClick={()=>void issueRecovery(student)}><MonitorActionIcon action="recovery"/></button><DeleteStudentButton iconOnly student={student} onDeleted={studentId=>{setRecovery(null);setResult(current=>current?.key===requestKey&&current.data&&'students'in current.data?{...current,data:{...current.data,students:current.data.students.filter(row=>row.id!==studentId)}}:current)}}/></>}</div></td></tr>)}{!visible.length&&<tr><td colSpan={4}>{!ready?'Загружаем профили…':result?.error?'Список не загружен. Повторите попытку.':'Профили не найдены.'}</td></tr>}</tbody></table></div>
    </section>}
    {data&&'submission'in data&&<>
      <section className="monitor-panel"><h2>{data.student.lastName} {data.student.firstName} · {data.student.group}</h2><p>Вариант №{data.submission.variant.number} · {variantDescription(data.submission.variant)} · {data.submission.variant.voltage} В</p><p><b>{ELECTRO_STATUS[data.submission.status]}</b> · {new Date(data.submission.createdAt).toLocaleString('ru-RU')}</p><p>{data.submission.progress.lines}/{data.submission.progress.totalLines} линий · {data.submission.progress.calculations}/{data.submission.progress.pairs} расчётов · {data.submission.progress.answered}/9 ответов</p>{data.history&&data.history.length>1&&<label>Предыдущие отправки<select value={data.submission.id} onChange={e=>navigate(`${base}/${e.target.value}`)}>{data.history.map(h=><option key={h.id} value={h.id}>{new Date(h.createdAt).toLocaleString('ru-RU')} · {ELECTRO_STATUS[h.status]}</option>)}</select></label>}<button className="monitor-export" onClick={()=>setRetry(n=>n+1)}>Обновить работу</button></section>
      <Review key={`${data.submission.id}:${data.submission.reviewVersion}`} work={data.submission} onSaved={work=>setResult(current=>current?.key===requestKey?{...current,data:{...data,submission:work,history:data.history?.map(h=>h.id===work.id?{...h,status:work.status}:h)}}:current)}/>
      <ElectroResultsPreview key={data.submission.id} variant={data.submission.variant} notebook={data.submission.notebook}/>
    </>}
  </div></main>
}
