import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { variantDescription, type ElectroVariant } from '../lib/electrostatics'
import type { StudentProfile } from '../lib/studentProfile'
import ElectroExpectedField from '../components/ElectroExpectedField'
import '../styles/assessment-monitor.css'
type Expected={student:StudentProfile;variant:ElectroVariant}
export default function ElectrostaticsExpected() {
  const {studentId}=useParams(),{user,isLoading}=useAuth(),{authFetch}=useApiClient(),location=useLocation()
  const base=location.pathname.startsWith('/teacher/')?'/teacher/electrostatics-monitor':'/admin/electrostatics-monitor'
  const [retry,setRetry]=useState(0),[result,setResult]=useState<{key:string;data?:Expected;error?:string}|null>(null)
  const key=JSON.stringify([user?.id,studentId,retry])
  useEffect(()=>{
    if(isLoading||!user||!studentId)return
    const controller=new AbortController()
    authFetch(`/api/student-profile?lab=electrostatics&view=expected&id=${encodeURIComponent(studentId)}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);if(!controller.signal.aborted)setResult({key,data})}).catch(e=>{if(!controller.signal.aborted)setResult({key,error:e instanceof Error?e.message:'Не удалось открыть вариант.'})})
    return()=>controller.abort()
  },[authFetch,isLoading,user,studentId,retry,key])
  const current=result?.key===key?result:null
  return <main className="monitor-page monitor-page--narrow es-monitor-page"><div className="monitor-container">
    <header className="monitor-header"><div><span className="monitor-kicker">Лабораторная №6 · Эталон</span><h1>Ожидаемый рисунок</h1></div><Link className="monitor-export" to={base}>← Все студенты</Link></header>
    {!isLoading&&!user?<p>Войдите в аккаунт.</p>:!current?<p role="status">Загружаем вариант…</p>:current.error?<section className="monitor-panel"><p className="monitor-error" role="alert">{current.error}</p><button className="monitor-export" onClick={()=>setRetry(n=>n+1)}>Повторить</button></section>:current.data&&<>
      <section className="monitor-panel"><h2>{current.data.student.lastName} {current.data.student.firstName} · {current.data.student.group}</h2><p>Вариант №{current.data.variant.number} · {variantDescription(current.data.variant)} · {current.data.variant.voltage} В · Δφ = {current.data.variant.interval} В</p></section>
      <ElectroExpectedField key={key} variant={current.data.variant}/>
    </>}
  </div></main>
}
