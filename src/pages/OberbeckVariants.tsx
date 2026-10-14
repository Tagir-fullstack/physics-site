import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApiClient } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import type { OberbeckVariant, expectedOberbeckTables } from '../lib/oberbeckVariant'
import type { StudentProfile } from '../lib/studentProfile'
import '../styles/assessment-monitor.css'
type VariantRow = { id: string; code: string; student: StudentProfile; parameters: OberbeckVariant; createdAt: string }
type Detail = VariantRow & { expected: ReturnType<typeof expectedOberbeckTables> }
const f = (value: number, digits = 2) => value.toLocaleString('ru', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const range = (a: number, b: number, digits = 5) => `${f(Math.min(a, b), digits)}–${f(Math.max(a, b), digits)}`
export default function OberbeckVariants() {
  const { authFetch } = useApiClient()
  const { isLoading } = useAuth()
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [opening, setOpening] = useState(false)
  const detailRequest = useRef(0)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await authFetch('/api/oberbeck?view=list'); const result = await response.json(); if (!response.ok) throw Error(result.error); setVariants(result.variants) }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить список.') }
    finally { setLoading(false) }
  }, [authFetch])
  useEffect(() => { if (!isLoading) void load() }, [isLoading, load])
  const open = async (id: string) => {
    const request = ++detailRequest.current; setOpening(true); setDetail(null); setError('')
    try { const response = await authFetch(`/api/oberbeck?view=expected&id=${id}`); const result = await response.json(); if (!response.ok) throw Error(result.error); if (request === detailRequest.current) setDetail(result) }
    catch (e) { if (request === detailRequest.current) setError(e instanceof Error ? e.message : 'Не удалось открыть вариант.') }
    finally { if (request === detailRequest.current) setOpening(false) }
  }
  const close = () => { detailRequest.current++; setDetail(null); setOpening(false) }
  const visible = variants.filter(v => `${v.student.lastName} ${v.student.firstName} ${v.student.group} ${v.code}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')))
  const download = () => {
    if (!detail) return
    const rows: unknown[][] = [['Вариант', detail.code], ['Студент', `${detail.student.lastName} ${detail.student.firstName}`, detail.student.group], ['h, м', detail.parameters.height], ['Таблица', '№', 'R, мм', 'm, г', 'l, см', 't, с', 't min, с', 't max, с', 'M, Н·м', 'ε, рад/с²', 'l², см²', 'J, кг·м²']]
    ;[detail.expected.one, detail.expected.two].forEach((table, i) => table.forEach(r => rows.push([i + 2, r.index, r.radius * 1000, r.mass * 1000, r.length, r.time, r.minTime, r.maxTime, r.moment, r.epsilon, r.lengthSquared, r.inertia])))
    const csv = rows.map(row => row.map(v => { const text = String(v); return `"${(typeof v === 'string' && /^\s*[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"` }).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `${detail.code}-ожидаемые-таблицы.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <main className="monitor-page"><div className="monitor-container">
    <header className="monitor-header"><div><span className="monitor-kicker">Лабораторная №3</span><h1>Варианты Обербека</h1><p>Ожидаемые данные для проверки работ в тетрадях.</p></div><div className="monitor-header-actions"><button disabled={loading} onClick={() => void load()}>Обновить</button><Link to="/admin/assessment-monitor">Выбрать работу</Link></div></header>
    {error && <p className="monitor-error" role="alert">{error}</p>}
    <section className="monitor-panel"><div className="monitor-toolbar"><label className="monitor-search"><span>Поиск студента</span><input placeholder="ФИО, группа или вариант" value={query} onChange={e => setQuery(e.target.value)} /></label><span>{visible.length} вариантов</span></div>
      <div className="monitor-table-scroll"><table className="monitor-table"><thead><tr>{['Студент', 'Группа', 'Вариант', 'h, см', 'R₁ / R₂, мм', 'Платформа / малый / большой, г', ''].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{visible.map(v => <tr key={v.id}><td><button className="monitor-student-link" onClick={() => void open(v.id)}>{v.student.lastName} {v.student.firstName}</button></td><td>{v.student.group}</td><td>{v.code}</td><td>{f(v.parameters.height * 100, 1)}</td><td>{v.parameters.radii.map(r => f(r * 1000, 1)).join(' / ')}</td><td>{[v.parameters.base, v.parameters.small, v.parameters.large].map(m => f(m * 1000)).join(' / ')}</td><td><button className="monitor-row-open" onClick={() => void open(v.id)}>Открыть таблицы →</button></td></tr>)}{!visible.length && <tr><td colSpan={7}>{loading ? 'Загружаем…' : 'Вариантов пока нет.'}</td></tr>}</tbody></table></div>
    </section>
    {(detail || opening) && <div className="monitor-detail-backdrop" onMouseDown={close}><section className="monitor-detail ob-expected-detail" role="dialog" aria-modal="true" aria-label="Ожидаемые таблицы Обербека" onMouseDown={e => e.stopPropagation()}><header><div><span>{detail?.code}</span><h2>{detail?.student.lastName} {detail?.student.firstName}</h2><p>{detail?.student.group}</p></div><button className="monitor-detail-close" aria-label="Закрыть" onClick={close}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button></header>{opening ? <p>Загружаем таблицы…</p> : detail && <>
      <p>h = {f(detail.parameters.height, 3)} м · платформа {f(detail.parameters.base * 1000)} г · малый {f(detail.parameters.small * 1000)} г · большой {f(detail.parameters.large * 1000)} г.</p>
      <p className="monitor-policy-note">t — расчётное время без разброса. Диапазон учитывает ±0,5% и округление секундомера. Диапазоны M, ε и J ниже рассчитаны по этим границам времени; дополнительные инструментальные погрешности студент оценивает отдельно. Таблица 2: l = 10 см. Таблица 3: все грузы на R₂.</p>
      {([detail.expected.one, detail.expected.two]).map((rows, i) => <section key={i}><h3>Таблица {i + 2}</h3><div className="monitor-table-scroll"><table className="monitor-table"><thead><tr>{(i === 0 ? ['№', 'R, мм', 'm, г', 't, с / диапазон', 'M, Н·м', 'ε, рад/с²'] : ['№', 'l, см', 't, с / диапазон', 'l², см²', 'J, кг·м²']).map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.index}><td>{r.index}</td>{i === 0 ? <><td>{f(r.radius * 1000, 1)}</td><td>{f(r.mass * 1000)}</td></> : <td>{r.length}</td>}<td>{f(r.time)}<small>{range(r.minTime, r.maxTime, 2)}</small></td>{i === 0 ? <><td>{f(r.moment, 6)}<small>{range(r.bounds.minTime.moment, r.bounds.maxTime.moment, 6)}</small></td><td>{f(r.epsilon, 4)}<small>{range(r.bounds.minTime.epsilon, r.bounds.maxTime.epsilon, 4)}</small></td></> : <><td>{r.lengthSquared}</td><td>{f(r.inertia, 6)}<small>{range(r.bounds.minTime.inertia, r.bounds.maxTime.inertia, 6)}</small></td></>}</tr>)}</tbody></table></div></section>)}
      <p>Jкр = {f(detail.expected.crossInertia, 6)} кг·м² · масса одного цилиндра = {f(detail.expected.cylinderMass * 1000)} г.</p><button className="monitor-export" onClick={download}>Скачать ожидаемые таблицы CSV</button>
    </>}</section></div>}
  </div></main>
}
