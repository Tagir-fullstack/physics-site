import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { studentRequest, type StudentProfile } from '../lib/studentProfile'
import type { ClementVariant, clementExpected } from '../lib/clementDesormes'
import '../styles/assessment-monitor.css'
import '../styles/clement-desormes.css'

type Detail = { student: StudentProfile; variant: ClementVariant; expected: ReturnType<typeof clementExpected> }
const f = (n: number, digits = 3) => n.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits })
export default function ClementVariants() {
  const { isLoading } = useAuth()
  const { authFetch } = useApiClient()
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [sort, setSort] = useState('name')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [opening, setOpening] = useState(false)
  const sequence = useRef<symbol | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    if (!detail || !node) return
    node.showModal()
    return () => node.close()
  }, [detail])
  useEffect(() => {
    if (isLoading) return
    let live = true
    void studentRequest<{ students: StudentProfile[] }>('/api/student-profile?lab=clement-desormes&view=list', undefined, authFetch).then(r => { if (live) setStudents(r.students) }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Не удалось загрузить список.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false; sequence.current = null }
  }, [authFetch, isLoading])
  const open = async (id: string) => {
    const current = Symbol(); sequence.current = current; setOpening(true); setError(''); setDetail(null)
    try { const result = await studentRequest<Detail>(`/api/student-profile?lab=clement-desormes&view=expected&id=${encodeURIComponent(id)}`, undefined, authFetch); if (sequence.current === current) setDetail(result) }
    catch (e) { if (sequence.current === current) setError(e instanceof Error ? e.message : 'Не удалось открыть условия.') }
    finally { if (sequence.current === current) setOpening(false) }
  }
  const normalized = query.trim().toLocaleLowerCase('ru')
  const visible = students.filter(s => (!group || s.group === group) && `${s.lastName} ${s.firstName} ${s.group} ${s.variantNumber}`.toLocaleLowerCase('ru').includes(normalized)).sort((a, b) => sort === 'number' ? (a.variantNumber ?? 0) - (b.variantNumber ?? 0) : `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'ru'))
  const groups = [...new Set(students.map(s => s.group))].sort()
  return <main className="monitor-page monitor-page--narrow"><div className="monitor-container">
    <header className="monitor-header"><div><span className="monitor-kicker">Лабораторная №5</span><h1>Метод Клемана—Дезорма</h1><p>Индивидуальные условия и ожидаемые показания для проверки.</p></div><Link className="monitor-export" to="/admin/assessment-monitor">Выбрать работу</Link></header>
    {error && <p className="monitor-error" role="alert">{error}</p>}
    <section className="monitor-panel"><p>Показаны зарегистрированные профили, не список выполненных опытов. Условия определяются постоянным номером; черновики студенты ведут в своих браузерах и выгружают в CSV.</p><div className="monitor-toolbar"><label className="monitor-search">Поиск<input value={query} onChange={e => setQuery(e.target.value)} placeholder="ФИО, группа или номер"/></label><div className="monitor-table-tools"><label>Группа<select value={group} onChange={e => setGroup(e.target.value)}><option value="">Все группы</option>{groups.map(g => <option key={g}>{g}</option>)}</select></label><label>Порядок<select value={sort} onChange={e => setSort(e.target.value)}><option value="name">По фамилии</option><option value="number">По варианту</option></select></label><span>Найдено: {visible.length} из {students.length}</span></div></div><div className="monitor-table-scroll"><table className="monitor-table"><thead><tr>{['Студент', 'Группа', 'Вариант', ''].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{visible.map(s => <tr key={s.id}><td>{s.lastName} {s.firstName}</td><td>{s.group}</td><td>{s.variantNumber}</td><td><button type="button" className="monitor-row-open" onClick={() => void open(s.id)}>Ожидаемые измерения →</button></td></tr>)}{!visible.length && <tr><td colSpan={4}>{loading ? 'Загружаем профили…' : 'Профили не найдены.'}</td></tr>}</tbody></table></div></section>
    {opening && <p role="status">Загружаем ожидаемые измерения…</p>}
    {detail && <dialog ref={dialog} className="cd-expected-dialog" aria-label="Ожидаемые измерения" onCancel={() => setDetail(null)} onClick={e => { if (e.target === e.currentTarget) setDetail(null) }}><div><header><h2>{detail.student.lastName} {detail.student.firstName} · вариант № {detail.variant.number}</h2><button type="button" className="monitor-export" onClick={() => setDetail(null)} aria-label="Закрыть измерения">Закрыть</button></header><p>H = {detail.variant.targetHead} мм воды · T₀ = {f(detail.variant.ambientK - 273.15, 1)} °C · p₀ = {f(detail.variant.pressurePa / 1000, 2)} кПа · a = {f(detail.variant.heatLeak)} с⁻¹</p><p>Это эталон без округления и погрешности отсчёта. В опытах учитывайте фактическое время и разрешение манометра: h′ = h · exp(−at). Отсчёты уровней округляются до 0,5 мм; моделируемое отклонение разности до ±1 мм перед округлением. С учётом округления расхождение с эталоном не превышает 1,5 мм. Поправка стабильна при чтении и меняется при повторном опыте.</p><div className="monitor-table-scroll"><table className="monitor-table"><thead><tr><th>t, с</th><th>h′, мм</th><th>ln h′</th></tr></thead><tbody>{detail.expected.trials.map(r => <tr key={r.time}><td>{r.time}</td><td>{f(r.head)}</td><td>{f(r.log, 5)}</td></tr>)}</tbody></table></div><p>Наклон = {f(detail.expected.slope)} с⁻¹ · ln h = {f(detail.expected.intercept, 5)} · h = {f(detail.expected.idealHead)} мм · γ = {f(detail.expected.gamma, 2)}</p><p>Процесс 1 → 2: приближённо адиабатическое расширение оставшейся массы газа, охлаждение; p₁ &gt; p₀, T₁ = T₀; p₂ = p₀, T₂ &lt; T₀. Процесс 2 → 3: изохорное нагревание, p₃ &gt; p₀, T₃ = T₀. При длительном открытии К₀ теплообмен нарушает идеальную адиабатичность — поэтому нужна экстраполяция к t = 0.</p></div></dialog>}
  </div></main>
}
