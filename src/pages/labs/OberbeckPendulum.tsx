import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApiClient } from '../../lib/apiClient'
import { G, experiment, numberFrom, sampleTimeFactor, timeErrorBound } from './oberbeckModel'
import { referenceVariant, type OberbeckVariant } from '../../lib/oberbeckVariant'
import type { StudentProfile } from '../../lib/studentProfile'
import OberbeckManualControls from '../../components/OberbeckManualControls'
import { OBERBECK_SPEEDS, type ManualOberbeckSetup } from '../../lib/oberbeckManual'
import { variantFingerprint } from '../../lib/oberbeckVariant'
import '../../styles/atwood.css'
import '../../styles/oberbeck.css'

type Reading = { mass: number; radius: number; length: number; time: number }
type Row = { reading?: Reading; first: string; second: string }
type Notebook = { one: Row[]; two: Row[]; conclusion1: string; conclusion2: string; slope1: string; slope2: string; intercept2: string }
const KEY = 'physez-oberbeck-notebook-v2'
const blank = (n: number): Row[] => Array.from({ length: n }, () => ({ first: '', second: '' }))
const fresh = (): Notebook => ({ one: blank(8), two: blank(7), conclusion1: '', conclusion2: '', slope1: '', slope2: '', intercept2: '' })
const f = (n: number, digits = 2) => n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
function load(key = KEY): Notebook {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null') as Notebook
    const valid = (rows: Row[], n: number) => Array.isArray(rows) && rows.length === n && rows.every(r => r && typeof r.first === 'string' && typeof r.second === 'string' && (!r.reading || [r.reading.mass, r.reading.radius, r.reading.length, r.reading.time].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0)))
    if (value && valid(value.one, 8) && valid(value.two, 7) && typeof value.conclusion1 === 'string' && typeof value.conclusion2 === 'string') return { ...value, slope1: typeof value.slope1 === 'string' ? value.slope1 : '', slope2: typeof value.slope2 === 'string' ? value.slope2 : '', intercept2: typeof value.intercept2 === 'string' ? value.intercept2 : '' }
  } catch { /* A new notebook is still usable when storage is unavailable. */ }
  return fresh()
}

function Plot({ rows, task, slope, intercept, smallRadius }: { rows: Row[]; task: 1 | 2; slope: string; intercept: string; smallRadius: number }) {
  const points = rows.flatMap((r, i) => {
    const x = numberFrom(r.first) / (task === 2 ? 10000 : 1)
    const y = numberFrom(r.second)
    return r.reading && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 ? [{ x, y, i, radius: r.reading.radius }] : []
  })
  const xmax = Math.max(.0001, ...points.map(p => p.x)) * 1.15
  const ymax = Math.max(.0001, ...points.map(p => p.y)) * 1.15
  const k = numberFrom(slope)
  const b = task === 1 ? 0 : numberFrom(intercept)
  return <div className="ob-graph"><svg viewBox="0 0 560 270" role="img" aria-label={task === 1 ? 'График ε от M по вашим расчётам' : 'График J от l² по вашим расчётам'}>
    <defs><clipPath id={`ob-plot-clip-${task}`}><rect x="78" y="28" width="447" height="197"/></clipPath></defs>
    {[0, 1, 2, 3, 4].map(i => <g key={i}><path d={`M78 ${225 - i * 46} H525`} stroke="currentColor" opacity=".12"/><text x="70" y={230 - i * 46} textAnchor="end">{f(ymax * i / 4, task === 1 ? 2 : 4)}</text><text x={78 + i * 110} y="247" textAnchor="middle">{f(xmax * i / 4, 4)}</text></g>)}
    <path d="M78 28 V225 H530" fill="none" stroke="currentColor"/>
    <text x="78" y="18">{task === 1 ? 'ε, рад/с²' : 'J, кг·м²'}</text><text x="525" y="268" textAnchor="end">{task === 1 ? 'M, Н·м' : 'l², м²'}</text>
    {points.length > 1 && Number.isFinite(k) && Number.isFinite(b) && <path d={`M78 ${225 - b / ymax * 184} L518 ${225 - (b + k * xmax) / ymax * 184}`} clipPath={`url(#ob-plot-clip-${task})`} fill="none" stroke="#4a90e2" strokeWidth="1.5" strokeDasharray="5 4"/>}
    {points.map(p => <circle key={p.i} cx={78 + p.x / xmax * 440} cy={225 - p.y / ymax * 184} r="5" fill={p.radius === smallRadius ? '#fc6255' : '#4a90e2'}><title>Опыт {p.i + 1}: {p.x}; {p.y}</title></circle>)}
  </svg><p className="atwood-hint">{points.length ? 'Точки построены по вашим значениям. R₁ — красные, R₂ — синие. Определите наклон прямой самостоятельно.' : 'Заполните расчётные столбцы — здесь появятся ваши точки.'}</p></div>
}

export default function OberbeckPendulum({ variant = referenceVariant, variantCode, student }: { variant?: OberbeckVariant; variantCode?: string; student?: StudentProfile }) {
  const { user, isLoading } = useAuth()
  const { authFetch } = useApiClient()
  const [access, setAccess] = useState<{ userId: string; allowed: boolean; error: string } | null>(null)
  const [accessAttempt, setAccessAttempt] = useState(0)
  const [manual, setManual] = useState<{ userId: string; setup: ManualOberbeckSetup } | null>(null)
  const [revision, setRevision] = useState(0)
  const userId = user?.id
  useEffect(() => {
    if (isLoading || !userId) return
    let live = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    void authFetch('/api/account', { signal: controller.signal }).then(async response => {
      const body = await response.json() as { userId?: string; role?: string; isPremium?: boolean }
      if (!response.ok || body.userId !== userId) throw Error('Не удалось проверить доступ PRO. Повторите проверку.')
      if (live) setAccess({ userId, allowed: body.isPremium === true || body.role === 'admin' || body.role === 'owner', error: '' })
    }).catch(() => { if (live) setAccess({ userId, allowed: false, error: 'Не удалось проверить доступ PRO. Повторите проверку.' }) }).finally(() => window.clearTimeout(timeout))
    return () => { live = false; controller.abort(); window.clearTimeout(timeout) }
  }, [authFetch, isLoading, userId, accessAttempt])
  const verified = !isLoading && !!userId && access?.userId === userId
  const isPro = Boolean(verified && access?.allowed)
  const custom = isPro && manual && manual.userId === userId ? manual.setup : null
  const current = custom ?? { variant, length: 10 }
  const manualKey = custom ? `manual:${userId}:${variantFingerprint(custom.variant)}:${custom.length}` : undefined
  const controls = isPro ? <OberbeckManualControls setup={current} custom={!!custom} onApply={setup => { setManual({ userId: userId!, setup }); setRevision(n => n + 1) }} onReset={() => { setManual(null); setRevision(n => n + 1) }} /> : verified && access?.error ? <p className="ob-access-error" role="alert">{access.error} <button type="button" onClick={() => setAccessAttempt(n => n + 1)}>Повторить</button></p> : null
  return <OberbeckSimulation key={`${manualKey ?? 'assigned'}:${revision}`} variant={current.variant} variantCode={variantCode} student={student} isPro={isPro} accessLoading={isLoading || Boolean(userId && !verified)} advancedControls={controls} custom={!!custom} initialLength={current.length} manualNotebookKey={manualKey} />
}

function OberbeckSimulation({ variant, variantCode, student, isPro, accessLoading: isLoading, advancedControls, custom, initialLength, manualNotebookKey }: { variant: OberbeckVariant; variantCode?: string; student?: StudentProfile; isPro: boolean; accessLoading: boolean; advancedControls: ReactNode; custom: boolean; initialLength: number; manualNotebookKey?: string }) {
  const { user } = useAuth()
  const { height: HEIGHT, base: BASE, small: SMALL, large: LARGE, radii: RADII } = variant
  const TOTAL = BASE + SMALL + LARGE
  const notebookKey = manualNotebookKey ? `${KEY}:${manualNotebookKey}` : variantCode ? `${KEY}:${student?.id}:${variantCode}` : KEY
  const [small, setSmall] = useState(false)
  const [large, setLarge] = useState(false)
  const [radius, setRadius] = useState<number>(RADII[0])
  const [length, setLength] = useState(initialLength)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [time, setTime] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timeFactor, setTimeFactor] = useState(1)
  const [book, setBook] = useState<Notebook>(() => load(notebookKey))
  const [message, setMessage] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [feedback, setFeedback] = useState<{ task: number; text: string } | null>(null)
  const elapsed = useRef(0)
  const sampled = useRef(false)
  const mass = BASE + (small ? SMALL : 0) + (large ? LARGE : 0)
  const { acceleration, duration } = experiment(mass, radius, length / 100, timeFactor, HEIGHT)
  const travel = Math.min(HEIGHT, acceleration * time ** 2 / 2)
  const angle = (travel / radius * 180 / Math.PI) % 360
  const largePulleyRadius = Math.min(50, 15 * RADII[1] / RADII[0])
  const pulleyTop = 196 - (radius === RADII[0] ? 15 : largePulleyRadius)
  const platformY = 237 + travel / HEIGHT * 173
  const locked = running || time > 0
  useEffect(() => {
    try { localStorage.setItem(notebookKey, JSON.stringify(book)) } catch { setStorageError(true) }
  }, [book, notebookKey])
  useEffect(() => {
    if (!running) return
    let frame = 0
    let previous: number | null = null
    const tick = (now: number) => {
      if (previous !== null) elapsed.current = Math.min(duration, elapsed.current + (now - previous) / 1000 * (isPro ? playbackSpeed : 1))
      previous = now
      setTime(elapsed.current)
      if (elapsed.current >= duration) { setRunning(false); setFinished(true); return }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, duration, playbackSpeed, isPro])
  const reset = () => { setRunning(false); setFinished(false); setTime(0); elapsed.current = 0; sampled.current = false }
  const toggleRun = () => {
    if (!running && !sampled.current) { setTimeFactor(sampleTimeFactor()); sampled.current = true }
    setRunning(r => !r)
  }
  const record = (task: 1 | 2, index: number) => {
    if (!isPro || !finished) return
    const notify = (text: string) => { setMessage(text); setFeedback({ task, text }) }
    const rows = task === 1 ? book.one : book.two
    const expectedMass = task === 1 ? [BASE, BASE + SMALL, BASE + LARGE, TOTAL][index % 4] : TOTAL
    const other = rows.find(r => r.reading)?.reading
    if (Math.abs(mass - expectedMass) > 1e-8 || (task === 1 && (radius !== RADII[index < 4 ? 0 : 1] || length !== 10)) || (task === 2 && (length !== 10 + index * 2 || radius !== RADII[1]))) {
      notify('Настройка не соответствует выбранной строке. Проверьте состав груза, шкив и расстояние по заданию.'); return
    }
    if (other && ((task === 1 && other.length !== length) || (task === 2 && other.radius !== radius))) {
      notify(task === 1 ? 'В таблице 2 расстояние l должно оставаться одинаковым во всех опытах.' : 'В таблице 3 используйте один и тот же шкив во всех опытах.'); return
    }
    const key = task === 1 ? 'one' : 'two'
    setBook(b => ({ ...b, [key]: b[key].map((r, i) => i === index ? { first: '', second: '', reading: { mass, radius, length, time: Math.round(time * 100) / 100 } } : r) }))
    notify(`Измерение записано: таблица ${task + 1}, опыт ${index + 1}. Расчётные столбцы заполните самостоятельно.`)
  }
  const update = (task: 1 | 2, index: number, field: 'first' | 'second', value: string) => {
    if (!isPro) return
    const key = task === 1 ? 'one' : 'two'
    setBook(b => ({ ...b, [key]: b[key].map((r, i) => i === index ? { ...r, [field]: value } : r) }))
  }
  const check = (task: 1 | 2) => {
    if (!isPro) return
    const rows = task === 1 ? book.one : book.two
    let correct = 0
    let entered = 0
    rows.forEach(r => {
      if (!r.reading) return
      const { mass: m, radius: R, time: t, length: l } = r.reading
      const a = 2 * HEIGHT / t ** 2
      const targets = task === 1 ? [m * R * (G - a), a / R] : [l ** 2, m * R ** 2 * (G * t ** 2 / (2 * HEIGHT) - 1)]
      ;[r.first, r.second].forEach((s, i) => { if (s.trim()) { entered++; if (Number.isFinite(numberFrom(s)) && Math.abs(numberFrom(s) - targets[i]) <= Math.max(Math.abs(targets[i]) * .03, .000005)) correct++ } })
    })
    setFeedback({ task, text: entered ? `Верно ${correct} из ${entered} заполненных расчётов (допуск 3%). Всего в задании ${rows.length * 2} расчётных ячеек. Проверьте единицы: массы в кг, радиусы в м; l² в таблице — в см².` : 'Сначала запишите измерения и заполните расчётные столбцы.' })
  }
  const download = () => {
    if (!isPro) return
    const quote = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
    const lines: unknown[][] = [['Таблица', '№', 'm, г', 'R, мм', 'l, см', 'h, м', 't, с', 'M, Н·м / l², см²', 'ε, рад/с² / J, кг·м²']]
    if (student?.variantNumber) lines.push(['Постоянный вариант студента', student.variantNumber], ['Код работы', variantCode ?? ''])
    ;[book.one, book.two].forEach((rows, task) => rows.forEach((r, i) => lines.push([task + 2, i + 1, r.reading ? f(r.reading.mass * 1000) : '', r.reading ? r.reading.radius * 1000 : '', r.reading?.length ?? '', HEIGHT, r.reading?.time ?? '', r.first, r.second])))
    lines.push(['Наклон k, задание 1', book.slope1], ['Наклон k, задание 2', book.slope2], ['Jкр, кг·м²', book.intercept2], ['Вывод 1', book.conclusion1], ['Вывод 2', book.conclusion2])
    lines.push(['Учебные предельные погрешности (не паспортные)', 'Δh = 1 мм; ΔR = 0,1 мм; Δm = 0,01 г; Δl = 1 мм; Δt = 0,01 с + 0,005t'], ['Разброс времени модели', 'до ±0,5%; независимый при каждом новом запуске'])
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.map(row => row.map(quote).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'Обербек-лабораторная.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const runButtons = <div className="atwood-control-buttons"><button className="atwood-primary" disabled={finished} onClick={toggleRun}>{running ? 'Пауза' : time > 0 ? 'Продолжить' : 'Запустить'}</button><button className="atwood-secondary" onClick={reset}>Сбросить</button></div>
  const timeReadout = <div className="atwood-time-row"><span>Время: <strong>{time.toFixed(4)} с</strong></span><span>Путь: <strong>{(travel * 100).toFixed(1)} см</strong></span></div>

  return <main className="atwood-page oberbeck-page"><div className="atwood-container">
    <header className="atwood-header"><div className="atwood-eyebrow">ИНТЕРАКТИВНАЯ ЛАБОРАТОРИЯ №3</div><h1>Маятник Обербека</h1></header>
    {student && <div className="ob-student-heading"><span>{student.lastName} {student.firstName} · {student.group}</span><strong title={variantCode ? `Код работы: ${variantCode}` : undefined}>Вариант {student.variantNumber ? `№ ${student.variantNumber}` : variantCode}</strong><Link to={user ? '/account' : '/student/profile?from=oberbeck'}>Мой профиль</Link></div>}
    {custom && <p className="ob-manual-notice" role="status">Ручной режим сверки. Показаны введённые параметры; сохранённый вариант студента не изменён. Схема условная, не в масштабе.</p>}
    <section className="atwood-grid">
      <div className="atwood-card atwood-simulation-card"><div className="atwood-scene-heading"><h2 className="atwood-card-title"><span>1</span> Схема установки</h2><span className="atwood-state">{running ? 'Опыт идёт' : finished ? 'Опыт завершён' : time > 0 ? 'Пауза' : 'Готово к запуску'}</span></div>
        <svg className="atwood-scene ob-scene" viewBox="0 0 640 470" role="img" aria-label={`Маятник: шкив ${radius === RADII[0] ? 'R₁' : 'R₂'}, цилиндры на расстоянии ${length} см, подвешено ${f(mass * 1000)} г`}>
          <g transform="translate(32 23) scale(.9)">
            <path d="M256 196 V430 M264 196 V430 M208 430 H545 M192 438 H560" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>
            <g transform={`rotate(${angle} 260 196)`} stroke="currentColor"><path d="M94 196 H426 M260 30 V362" strokeWidth="2"/>{[0,90,180,270].map(deg => <g key={deg} transform={`rotate(${deg} 260 196)`}><rect x={260 + Math.min(length, 22) / 22 * 145 - 7} y="184" width="14" height="24" fill="#8796a8" stroke="#c3ced8" strokeWidth="1.5"/></g>)}</g>
            <circle className={`ob-pulley-groove${radius === RADII[1] ? ' active' : ''}`} cx="260" cy="196" r={largePulleyRadius} fill="var(--ob-scene-bg)" stroke="currentColor" strokeWidth="1.5"/>
            <circle className={`ob-pulley-groove${radius === RADII[0] ? ' active' : ''}`} cx="260" cy="196" r="15" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="260" cy="196" r="4" fill="var(--ob-scene-bg)" stroke="currentColor" strokeWidth="1.5"/>
            <path d={`M260 ${pulleyTop} H485 A12 12 0 0 1 497 ${pulleyTop + 12} V${platformY + 12}`} fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="485" cy={pulleyTop + 12} r="12" fill="var(--ob-scene-bg)" stroke="currentColor" strokeWidth="1.5"/>
            <g transform={`translate(497 ${platformY})`}><path d="M-23 12 H23 V20 H-23 Z" fill="#8796a8" stroke="#c3ced8" strokeWidth="1.5"/>{large && <rect x="-18" y="3" width="36" height="9" fill="#c84d4a" stroke="#ff7166" strokeWidth="1.5"/>}{small && <rect x="-13" y={large ? -4 : 5} width="26" height="7" fill="#4a90c9" stroke="#8ebee8" strokeWidth="1.5"/>}</g>
            <path d="M523 257 H568 M523 430 H568" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" opacity=".5"/>
            <path d="M568 257 V430 M560 257 H576 M560 430 H576" stroke="currentColor" strokeWidth="1.5" opacity=".6" fill="none"/>
            <g className="atwood-diagram-labels" fill="currentColor"><text x="581" y="346">h = {f(HEIGHT * 100, 1)} см</text><text x="527" y={platformY + 16}>m</text></g>
          </g>
        </svg>
        <div className="ob-mobile-run-controls">{runButtons}{timeReadout}</div>
      </div>
      <aside className="atwood-card atwood-controls"><h2 className="atwood-card-title"><span>2</span> Параметры опыта</h2><fieldset disabled={locked}><legend className="ob-control-caption">Радиус шкива</legend><div className="ob-pulleys">{RADII.map((r, i) => <button key={r} aria-pressed={radius === r} onClick={() => setRadius(r)} className={radius === r ? 'selected' : ''}><span className={`ob-pulley-icon ob-pulley-${i}`}/><strong>{i === 0 ? 'Малый R₁' : 'Большой R₂'}</strong><small>{f(r * 1000, 1)} мм</small></button>)}</div>
        <div className="ob-control-caption">Подвешенный груз</div><div className="ob-base">Платформа <strong>{f(BASE * 1000)} г</strong></div><label className="ob-weight ob-weight-small"><input type="checkbox" checked={small} onChange={e => setSmall(e.target.checked)}/>Малый груз <strong>{f(SMALL * 1000)} г</strong></label><label className="ob-weight ob-weight-large"><input type="checkbox" checked={large} onChange={e => setLarge(e.target.checked)}/>Большой груз <strong>{f(LARGE * 1000)} г</strong></label><div className="ob-total">Общая масса m <strong>{f(mass * 1000)} г</strong></div>
        <div className="ob-distance"><label htmlFor="ob-distance">Расстояние цилиндров от оси</label><div className="ob-stepper"><button aria-label="Приблизить цилиндры на 2 см" disabled={length <= 10} onClick={() => setLength(l => l - 2)}>−</button><strong>{length} см</strong><button aria-label="Отдалить цилиндры на 2 см" disabled={length >= 22} onClick={() => setLength(l => l + 2)}>+</button></div><input id="ob-distance" aria-label="Расстояние цилиндров, см" type="range" min={custom ? Math.min(10, length) : 10} max={custom ? Math.max(22, length) : 22} step={custom ? 'any' : 2} value={length} onChange={e => setLength(Number(e.target.value))}/></div></fieldset>
        <div className="atwood-constants atwood-pulley-constants"><span>h: <strong>{f(HEIGHT * 100, 1)} см</strong></span><span>R: <strong>{f(radius * 1000, 1)} мм</strong></span></div>
        <div className="ob-desktop-run-controls">{runButtons}</div>
        <div className="atwood-progress" role="progressbar" aria-label="Пройденный путь" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(travel / HEIGHT * 100)}><div style={{ transform: `scaleX(${travel / HEIGHT})` }}/></div>
        <div className="ob-desktop-run-controls">{timeReadout}</div>
      </aside>
    </section>
    {!isPro && <div className="atwood-pro-heading"><span className="atwood-pro-badge">PRO</span><span>Инструменты работы</span></div>}
    {!isPro && advancedControls}
    {!isPro && <section className="atwood-card atwood-pro-locked" aria-busy={isLoading}><span className="atwood-pro-badge">PRO</span><div><h2>{isLoading ? 'Проверяем доступ…' : 'Полная лабораторная с PRO'}</h2><p>Задания, таблицы, графики, обработка погрешностей и скачивание работы доступны по подписке PRO. Установка доступна всем.</p></div>{!isLoading && <Link className="atwood-secondary" to="/account">Моя подписка</Link>}</section>}
    {isPro && <>
    <section className="atwood-card ob-advanced-tools" aria-label="Настройки и сверка опыта">
      {advancedControls}
        <div className="ob-playback-controls"><label>Скорость анимации<select aria-label="Скорость анимации" value={playbackSpeed} onChange={event => { const value = Number(event.target.value); if (OBERBECK_SPEEDS.some(speed => speed === value)) setPlaybackSpeed(value) }}>{OBERBECK_SPEEDS.map(speed => <option key={speed} value={speed}>×{speed}</option>)}</select></label></div>
    </section>
    <div className="atwood-pro-heading"><span className="atwood-pro-badge">PRO</span><span>Инструменты работы</span></div>
    {message && <div className="ob-notice" role="status">{message}</div>}
    {([1, 2] as const).map(task => { const rows = task === 1 ? book.one : book.two; const firstReading = rows.find(r => r.reading)?.reading; return <section id={`ob-task${task}`} className="atwood-card ob-task" key={task}>
      <div className="ob-task-heading"><div><div className="atwood-eyebrow">ЗАДАНИЕ {task} · ТАБЛИЦА {task + 1}</div><h2>{task === 1 ? 'Закон вращения маятника' : 'Момент инерции крестовины'}</h2></div><span>{rows.filter(r => r.reading).length} / {rows.length} опытов</span></div>
      <p>{task === 1 ? 'Сохраните l = 10 см. На малом шкиве измерьте время для платформы, платформы с малым грузом, с большим грузом и со всеми грузами. Повторите четыре опыта на большом шкиве.' : 'Подвесьте все грузы и выберите большой шкив для всей серии. Начните с l = 10 см. Проведите семь опытов, каждый раз отдаляя все четыре цилиндра на 2 см: до 22 см.'}</p>
      <div className="ob-table-meta">h = {f(HEIGHT, 3)} м <span>{task === 1 ? `l = ${firstReading?.length ?? '10'} см · постоянно` : `m = ${f(TOTAL, 5)} кг · R = ${f(RADII[1] * 1000, 1)} мм · постоянно`}</span></div>
      <div className="atwood-table-scroll"><table className="atwood-table ob-table"><thead><tr>{(task === 1 ? ['R, мм', '№', 'm, г', 't, с', 'M, Н·м', 'ε, рад/с²', 'Измерение'] : ['№', 'l, см', 't, с', 'l², см²', 'J, кг·м²', 'Измерение']).map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{task === 1 && i % 4 === 0 && <td rowSpan={4} className="ob-radius-cell">{i === 0 ? 'R₁' : 'R₂'}<br/>{f(RADII[i === 0 ? 0 : 1] * 1000, 1)}</td>}<td>{i + 1}</td><td>{row.reading ? task === 1 ? f(row.reading.mass * 1000) : row.reading.length : '—'}</td><td>{row.reading ? f(row.reading.time) : '—'}</td>{(['first', 'second'] as const).map((field, c) => <td key={field}><input aria-label={`Таблица ${task + 1}, строка ${i + 1}, ${task === 1 ? c === 0 ? 'момент силы' : 'угловое ускорение' : c === 0 ? 'квадрат расстояния' : 'момент инерции'}`} inputMode="decimal" placeholder="Ваш расчёт" value={row[field]} onChange={e => update(task, i, field, e.target.value)}/></td>)}<td><button disabled={!finished || !!row.reading} onClick={() => record(task, i)}>Записать</button>{row.reading && <button aria-label={`Очистить опыт ${i + 1} таблицы ${task + 1}`} onClick={() => { const key = task === 1 ? 'one' : 'two'; setBook(b => ({ ...b, [key]: b[key].map((r, j) => j === i ? { first: '', second: '' } : r) })) }}>×</button>}</td></tr>)}</tbody></table></div>
      <details className="ob-uncertainty"><summary>Погрешность измерений</summary>
        <p>Повторные опыты дают небольшой разброс времени (до ±0,5%). Для этой учебной модели примите предельные погрешности: Δh = 1 мм; ΔR = 0,1 мм; Δm = 0,01 г; Δl = 1 мм; Δt = 0,01 с + 0,005t. Это допущения модели, а не паспортные характеристики установки.</p>
        {firstReading && <p>Для первого записанного опыта t = {f(firstReading.time)} с: Δt ≈ {f(timeErrorBound(firstReading.time), 3)} с. Оцените остальные строки самостоятельно.</p>}
        <p>Здесь δx = Δx / |x| — относительная погрешность; Δx — абсолютная. Ниже приведены оценки первого порядка по сумме вкладов, не доверительные интервалы.</p>
        {task === 1 ? <p>δa = Δh/h + 2Δt/t; δε = δa + ΔR/R; δM = Δm/m + ΔR/R + aδa/(g − a). Найдите Δε = |ε|δε и ΔM = |M|δM для каждой точки.</p> : <p>Обозначьте q = gt²/(2h). Тогда δJ = Δm/m + 2ΔR/R + q(2Δt/t + Δh/h)/(q − 1); ΔJ = |J|δJ; Δ(l²) = 2|l|Δl. Для расчётов используйте СИ.</p>}
        <p>Повторите несколько опытов с одинаковой настройкой, сравните времена и найдите среднее. На графике оцените диапазон наклона прямой с учётом погрешностей точек: Δk = (kmax − kmin)/2. {task === 1 ? 'Для J = 1/k: ΔJ/|J| ≈ Δk/|k|.' : 'Для m₀ = k/4: Δm₀ = Δk/4. Погрешность Jкр оцените отдельно по диапазону пересечений прямых с осью J.'} В выводе запишите результат как значение ± абсолютная погрешность с единицами.</p>
      </details>
      <div className="ob-analysis"><div><details><summary>Формулы и обработка</summary><p>{task === 1 ? 'a = 2h/t²; M = mR(g − a); ε = a/R. Используйте СИ и g = 9,81 м/с². Постройте ε = f(M), определите k = Δε/ΔM и J = 1/k.' : 'J = mR²(gt²/(2h) − 1). В таблице l² укажите в см², на графике — в м². Определите k = ΔJ/Δ(l²), Jкр — пересечение прямой с осью J, m₀ = k/4.'}</p></details><button className="atwood-secondary" onClick={() => check(task)}>Проверить расчёты</button>{feedback?.task === task && <p className="ob-feedback" role="status">{feedback.text}</p>}<div className="ob-fit-fields"><label>Ваш наклон k<input inputMode="decimal" placeholder="Δy / Δx" value={task === 1 ? book.slope1 : book.slope2} onChange={e => setBook(b => ({ ...b, [task === 1 ? 'slope1' : 'slope2']: e.target.value }))}/></label>{task === 2 && <label>Ваш Jкр, кг·м²<input inputMode="decimal" placeholder="Пересечение с осью J" value={book.intercept2} onChange={e => setBook(b => ({ ...b, intercept2: e.target.value }))}/></label>}</div><label className="ob-conclusion">{task === 1 ? 'Ваш результат: J и вывод' : 'Ваш результат: m₀ и вывод'}<textarea rows={3} value={task === 1 ? book.conclusion1 : book.conclusion2} onChange={e => setBook(b => ({ ...b, [task === 1 ? 'conclusion1' : 'conclusion2']: e.target.value }))} placeholder="Результат ± погрешность, единицы и ваш вывод…"/></label></div><Plot smallRadius={RADII[0]} rows={rows} task={task} slope={task === 1 ? book.slope1 : book.slope2} intercept={book.intercept2}/></div>
    </section> })}
    <details className="atwood-card ob-model"><summary>О модели установки</summary><p>Высота, радиусы и массы подвешенных грузов соответствуют вашему индивидуальному варианту. Инерция установки одинакова для вариантов и оценена по двум исходным измерениям: 18,5 с для платформы 92,7 г на радиусе 10 мм при высоте 0,5 м (принято l = 10 см) и 6,7 с для массы 245,93 г на радиусе 17,5 мм при l = 12 см. Масса цилиндров и инерция крестовины оценены по этим точкам, а не измерены на приборе. Трение и проскальзывание отдельно не моделируются. Каждый запуск получает независимое случайное отклонение времени до ±0,5% вокруг расчётного значения (треугольное распределение). Это учебная имитация разброса, а не воспроизведение всех ошибок реального прибора. Запись времени в таблицу округляется до 0,01 с; дополнительные цифры секундомера не означают большую точность.</p></details>
    <footer className="ob-footer"><span>{storageError ? 'Автосохранение недоступно. Сохраните свои результаты перед закрытием.' : 'Черновик сохраняется в этом браузере на данном устройстве.'}</span>{isPro && <button className="atwood-secondary" onClick={download}>Скачать работу ↓</button>}</footer>
    </>}
  </div></main>
}
