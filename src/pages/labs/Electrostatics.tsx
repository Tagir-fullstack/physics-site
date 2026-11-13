import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useStudentProfile, type StudentProfile } from '../../lib/studentProfile'
import StudentIdentityForm from '../../components/StudentIdentityForm'
import Electrodes from '../../components/Electrodes'
import ElectroCoordinates from '../../components/ElectroCoordinates'
import AxisPlot from '../../components/ElectroAxisPlot'
import ElectroVariantControls from '../../components/ElectroVariantControls'
import { activeElectroPractice, type ElectroPracticeSelection } from '../../lib/electrostaticsSelection'
import { variantDescription, axisOrigin, electrodes, toDisplayPoint, toModelPoint, electroVariant, electrodeAt, potentialLevels, electricField, voltmeter, contourPath, fieldLines, fieldEstimate, type FieldGrid, type ElectroVariant, type Point } from '../../lib/electrostatics'
import { measuredNeighborEdges } from '../../lib/electrostaticsNeighbors'
import { emptyElectroNotebook, validElectroNotebook, ELECTRO_QUESTIONS as questions, type ElectroNotebook } from '../../lib/electrostaticsNotebook'
import '../../styles/electrostatics.css'

const fmt = (n: number, digits = 1) => n.toLocaleString('ru-RU', { maximumFractionDigits: digits })
const colours = ['#2c78b5', '#9a59ab', '#2b9467', '#c07827', '#c64c56']
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a')
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function SectionTitle({ step, children, id }: { step: string; children: ReactNode; id?: string }) {
  return <h2 id={id} className="es-section-title"><span aria-hidden="true">{step}</span>{children}</h2>
}
function Workspace({ children }: { children: (toggle: ReactNode) => ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expanded || !root.current) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const siblings = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== root.current)
    const previousInert = siblings.map(element => element.inert)
    siblings.forEach(element => { element.inert = true })
    root.current.querySelector<HTMLButtonElement>('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setExpanded(false) }
      if (event.key !== 'Tab') return
      const focusable = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0)
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      siblings.forEach((element, i) => { element.inert = previousInert[i] })
      document.removeEventListener('keydown', keydown)
      requestAnimationFrame(() => document.getElementById('es-workspace-toggle')?.focus({ preventScroll: true }))
    }
  }, [expanded])
  const workspace = <div ref={root} id="es-workspace" className={expanded ? 'es-page es-immersive' : 'es-workspace'} role={expanded ? 'dialog' : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? 'Исследование электростатических полей. Рабочее окно' : undefined}>
    {children(<button id="es-workspace-toggle" className="es-expand-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Свернуть · Esc' : 'На весь экран'}</button>)}
  </div>
  return expanded ? createPortal(workspace, document.body) : workspace
}
function Meter({ value, on, digital }: { value: number; on: boolean; digital: boolean }) {
  const angle = -65 + value / 15 * 130, x = 110 + Math.sin(angle * Math.PI / 180) * 68, y = 97 - Math.cos(angle * Math.PI / 180) * 68
  return <div className={`es-meter${digital ? '' : ' es-meter-analog'}`}><svg viewBox="0 0 220 125" role="img" aria-label="Стрелочный вольтметр, шкала от 0 до 15 В"><path d="M32 62A86 86 0 0 1 188 62" fill="none" stroke="currentColor" opacity=".4"/>{Array.from({ length: 16 }, (_, i) => { const a = (-65 + i / 15 * 130) * Math.PI / 180; return <g key={i}><path d={`M${110 + Math.sin(a) * 79} ${97 - Math.cos(a) * 79}L${110 + Math.sin(a) * 85} ${97 - Math.cos(a) * 85}`} stroke="currentColor"/>{i % 5 === 0 && <text x={110 + Math.sin(a) * 65} y={100 - Math.cos(a) * 65} textAnchor="middle">{i}</text>}</g> })}<path d={`M110 97L${on ? x : 48} ${on ? y : 68}`} stroke="#c94f43" strokeWidth="2"/><circle cx="110" cy="97" r="4" fill="currentColor"/><text x="110" y="116" textAnchor="middle">V · 0–15</text></svg>{digital && <output aria-live="off"><span>{on ? fmt(value) : '—'}</span><small>В</small></output>}<span>Относительно электрода 0 В</span></div>
}
function Experiment({ variant: v, student, practice, variantControls }: { variant: ElectroVariant; student: StudentProfile; practice: boolean; variantControls: ReactNode }) {
  const { user, isPremium } = useAuth()
  const key = `physez-electrostatics-${v.revision === 3 ? 'v3' : v.layout && v.layout !== 'classic' ? 'v2' : 'v1'}:${user?.id}:${student.id}:${practice ? 'practice' : 'assigned'}:${v.number}`
  const [notebook, setNotebook] = useState<ElectroNotebook>(() => { if (!isPremium) return emptyElectroNotebook(); try { const data: unknown = JSON.parse(localStorage.getItem(key) || 'null'); return validElectroNotebook(data, v) ? data : emptyElectroNotebook() } catch { return emptyElectroNotebook() } })
  const [saveError, setSaveError] = useState(''), [notice, setNotice] = useState(''), [power, setPower] = useState(false)
  const [probe, setProbe] = useState<Point>({ x: 90, y: 120 }), [level, setLevel] = useState(potentialLevels(v)[0])
  const [grid, setGrid] = useState<FieldGrid | null>(null), [error, setError] = useState('')
  const [reference, setReference] = useState(false), [showField, setShowField] = useState(false), [join, setJoin] = useState(false)
  const [checks, setChecks] = useState<number[]>([]), [pairA, setPairA] = useState(''), [pairB, setPairB] = useState('')
  const map = useRef<SVGSVGElement>(null)
  const levels = useMemo(() => potentialLevels(v), [v])
  useEffect(() => { if (!isPremium) return; const timer = window.setTimeout(() => { try { localStorage.setItem(key, JSON.stringify(notebook)); setSaveError('') } catch { setSaveError('Черновик не сохранён: хранилище браузера недоступно. Скачайте отчёт перед уходом.') } }, 0); return () => window.clearTimeout(timer) }, [key, notebook, isPremium])
  useEffect(() => {
    const worker = new Worker(new URL('../../workers/electrostatics.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ grid?: FieldGrid; error?: string }>) => { if (e.data.grid?.converged) setGrid(e.data.grid); else setError(e.data.error || 'Расчёт не сошёлся. Перезагрузите страницу.') }
    worker.onerror = () => setError('Не удалось запустить расчёт поля. Перезагрузите страницу.')
    worker.postMessage(v); return () => worker.terminate()
  }, [v])
  const contours = useMemo(() => isPremium && grid && reference ? levels.map(l => contourPath(grid, l)) : [], [grid, reference, levels, isPremium])
  const measuredEdges = useMemo(() => isPremium && grid && join ? levels.map(level => measuredNeighborEdges(grid, level, notebook.points.filter(p => p.level === level))) : [], [grid, join, levels, notebook.points, isPremium])
  const lines = useMemo(() => isPremium && grid && showField ? fieldLines(grid, v) : [], [grid, showField, v, isPremium])
  if (!grid) return <section className="es-panel"><p role={error ? 'alert' : 'status'}>{error || 'Рассчитываем поле выбранной пластины…'}</p></section>
  const reading = voltmeter(grid, v, probe), onElectrode = electrodeAt(v, probe), selected = notebook.points.filter(p => p.level === level)
  const ready = power && checks.includes(0) && checks.includes(1)
  const tolerance = .1
  const move = (p: Point) => {
    const next = { x: Math.max(0, Math.min(180, Math.round(p.x * 2) / 2)), y: Math.max(0, Math.min(240, Math.round(p.y * 2) / 2)) }; setProbe(next)
    if (power) { const e = electrodeAt(v, next); if (e !== null) setChecks(old => old.includes(e) ? old : [...old, e]) }
  }
  const pointer = (event: PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget, matrix = svg.getScreenCTM(); if (!matrix) return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()); move({ x: point.y, y: point.x })
  }
  const record = () => {
    if (!isPremium) return
    if (!power) { setNotice('Включите питание перед записью точки.'); return }
    if (onElectrode !== null) { setNotice('Ищите точки в проводящем слое, вне электродов.'); return }
    if (Math.abs(reading - level) > tolerance + 1e-8) { setNotice(`Найдите ${fmt(level)} В с допуском ±${fmt(tolerance)} В.`); return }
    if (selected.some(p => Math.hypot(p.x - probe.x, p.y - probe.y) < 3)) { setNotice('Эта точка уже записана или слишком близка к другой. Распределяйте точки по всей линии.'); return }
    if (notebook.points.length >= 200) { setNotice('Достигнут предел 200 точек. Удалите лишние.'); return }
    setNotebook(n => ({ ...n, points: [...n.points, { ...probe, potential: reading, level }] })); setNotice(`Точка ${selected.length + 1} для ${fmt(level)} В записана.`)
  }
  const axisRecord = () => {
    if (!power || Math.abs(probe.x - 90) > .5) { setNotice('Для графика установите y = 0 мм и включите питание.'); return }
    if (notebook.axis.length >= 100 || notebook.axis.some(p => Math.abs(p.y - probe.y) < 1)) { setNotice('Такая точка оси уже есть или достигнут предел 100 отсчётов.'); return }
    setNotebook(n => ({ ...n, axis: [...n.axis, { ...probe, potential: reading }] })); setNotice('Отсчёт добавлен в график φ(r).')
  }
  const addPair = () => {
    const a = notebook.points[Number(pairA)], b = notebook.points[Number(pairB)]
    if (pairA === '' || pairB === '' || !a || !b || Math.abs(Math.abs(a.level - b.level) - v.interval) > 1e-8) { setNotice('Выберите две точки с соседних эквипотенциальных линий.'); return }
    const estimate = fieldEstimate(a, b), e = electricField(grid, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    if (!estimate || e.magnitude < .01) { setNotice('Выберите две разные точки в области ненулевого поля.'); return }
    const alignment = Math.abs((b.x - a.x) * e.x + (b.y - a.y) * e.y) / (estimate.distanceMm * e.magnitude)
    if (alignment < .95) { setNotice('Отрезок заметно отклонён от нормали. Выберите более близкие точки вдоль силовой линии, иначе отношение даёт лишь проекцию E.'); return }
    if (notebook.pairs.length >= 40) { setNotice('Достигнут предел 40 участков.'); return }
    setNotebook(n => ({ ...n, pairs: [...n.pairs, { a: { ...a }, b: { ...b }, answer: '' }] })); setNotice('Участок записан. Рассчитайте E, переведя миллиметры в метры.')
  }
  const exportReport = () => {
    const cell = (value: unknown) => { const text = typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? "'" + value : String(value ?? ''); return '"' + text.replace(/"/g, '""') + '"' }
    const rows: unknown[][] = [['Исследование электростатических полей'], [`${student.lastName} ${student.firstName}`, student.group, `Вариант ${v.number}`, practice ? 'Учебный режим' : 'Назначенный вариант'], [variantDescription(v), 'U, В', v.voltage, 'Шаг, В', v.interval], ['Электроды', 'x, мм', 'y, мм', 'Потенциал, В', 'Форма', 'Радиус, мм', 'Длина, мм', 'Угол к оси x, градусы'], ...electrodes(v).map((e, i) => [i + 1, toDisplayPoint(e).x, toDisplayPoint(e).y, e.potential * v.voltage, e.shape === 'disc' ? 'Диск' : 'Пластина', e.shape === 'disc' ? e.radius : '', e.shape === 'plate' ? e.length : '', e.shape === 'plate' ? (e.angle + 90) % 180 : '']), ['Точки эквипотенциалей'], ['Уровень, В', 'x, мм', 'y, мм', 'Измерено, В'], ...notebook.points.map(p => [p.level, toDisplayPoint(p).x, toDisplayPoint(p).y, p.potential]), ['График φ(r)'], ['r, мм', 'φ, В'], ...notebook.axis.map(p => [axisOrigin(v) - p.y, p.potential]), ['Напряжённость'], ['φA, В', 'φB, В', 'Δl, мм', 'E введённое, В/м'], ...notebook.pairs.map(p => [p.a.potential, p.b.potential, fieldEstimate(p.a, p.b)?.distanceMm, p.answer]), ['Вывод', notebook.conclusion], ...questions.map((q, i) => [q, notebook.answers[i]])]
    download(`electrostatics-${v.number}.csv`, '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n'), 'text/csv;charset=utf-8')
  }
  const exportMap = () => {
    if (!map.current) return
    const svg = map.current.cloneNode(true) as SVGSVGElement
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '264mm'); svg.setAttribute('height', '204mm')
    svg.insertAdjacentHTML('afterbegin', '<style>text{font:4px Arial;fill:#27313b}.es-sheet-bg{fill:white;stroke:#b9c3cd}.es-probe{fill:none;stroke:#222;stroke-width:.5}.es-electrode{fill:#9faab4;stroke:#515e6b;stroke-width:.5}.es-positive{fill:#d87965;stroke:#9c4134}.es-ground{fill:#7194ba;stroke:#355978}.es-positive text,.es-ground text{stroke:none;fill:#27313b}.es-coordinate-axis{fill:none;stroke:#7d90a4;stroke-width:.4}.es-grid{stroke:#b9c3cd;stroke-width:.2}.es-contour{fill:none;stroke-width:.6;stroke-dasharray:2 1}.es-field-line{fill:none;stroke:#52765c;stroke-width:.5}</style><rect x="-12" y="-12" width="264" height="204" fill="white"/>')
    download(`electrostatics-map-${v.number}.svg`, new XMLSerializer().serializeToString(svg), 'image/svg+xml')
  }
  return <>
    <Workspace>{toggle => <div className="es-layout"><section className="es-panel es-bench" aria-labelledby="es-bench-title"><div className="es-panel-heading"><SectionTitle step="1" id="es-bench-title">Схема установки</SectionTitle>{toggle}</div>
      <div className="es-map-stage"><svg ref={map} className="es-sheet" viewBox="-12 -12 264 204" role="group" aria-label="Пластина 240 на 180 мм. Кликните для установки зонда; стрелки перемещают зонд на 0,5 мм, Shift — на 5 мм." tabIndex={0}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pointer(e) }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pointer(e) }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); record(); return } const directions: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } }; const d = directions[e.key]; if (d) { e.preventDefault(); const step = e.shiftKey ? 5 : .5; move({ x: probe.x + d.y * step, y: probe.y + d.x * step }) } }}>
        <defs><marker id="es-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6" fill="var(--es-field-colour,#52765c)"/></marker></defs>
        <g transform="matrix(0 1 1 0 0 0)"><rect width="180" height="240" rx="1" className="es-sheet-bg"/>
        {Array.from({ length: 37 }, (_, i) => <path className="es-grid" key={`x${i}`} d={`M${i * 5} 0V240`}/>)}{Array.from({ length: 49 }, (_, i) => <path className="es-grid" key={`y${i}`} d={`M0 ${i * 5}H180`}/>)}
        {power && contours.map((d, i) => <path key={i} className="es-contour" d={d} stroke={colours[i % colours.length]}/>)}{power && lines.map((d, i) => <path key={i} className="es-field-line" d={d} markerEnd="url(#es-arrow)"/>)}
        </g><ElectroCoordinates/><g transform="matrix(0 1 1 0 0 0)">
        <Electrodes variant={v}/>
        {isPremium && levels.map((l, i) => { const ps = notebook.points.filter(p => p.level === l); return <g key={l} fill={colours[i % colours.length]}>{join && measuredEdges[i]?.map(([a, b], edge) => <line key={edge} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colours[i % colours.length]} strokeWidth=".7"/>)}{ps.map((p, n) => <circle key={n} cx={p.x} cy={p.y} r="1.4"><title>{fmt(l)} В; ({fmt(toDisplayPoint(p).x)}; {fmt(toDisplayPoint(p).y)}) мм</title></circle>)}{ps[0] && <text transform="matrix(0 1 1 0 0 0)" x={ps[0].y + 2} y={ps[0].x - 2}>{fmt(l)} В</text>}</g> })}
        <g className="es-probe" pointerEvents="none"><circle cx={probe.x} cy={probe.y} r="3"/><path d={`M${probe.x - 5} ${probe.y}H${probe.x + 5}M${probe.x} ${probe.y - 5}V${probe.y + 5}`}/></g>
        </g>
      </svg></div>
      <div className={`es-map-readout${isPremium ? '' : ' es-map-readout-basic'}`}>{isPremium && <span className="es-probe-coordinates">Зонд: x = <span>{fmt(toDisplayPoint(probe).x)}</span> · y = <span>{fmt(toDisplayPoint(probe).y)}</span> мм</span>}{isPremium && <output>{power ? fmt(reading) + ' В' : 'Питание выключено'}</output>}<span>Сетка 5 мм</span></div>
      <p className="es-hint es-orientation-hint">На телефоне удобнее работать в альбомной ориентации.</p>
    </section>
    <aside className="es-panel es-controls" aria-label="Параметры опыта"><SectionTitle step="2">Параметры опыта</SectionTitle>
      <div className="es-assignment"><strong>{practice ? 'Тренировка' : 'Вариант'} № {v.number}</strong><span>{variantDescription(v)}</span><small>{student.lastName} {student.firstName} · {student.group}</small></div>{variantControls}
      <button className={power ? 'es-primary' : ''} onClick={() => { setPower(!power); if (!power) { const e = electrodeAt(v, probe); if (e !== null) setChecks(old => old.includes(e) ? old : [...old, e]) } }}>Сеть: {power ? 'включена' : 'выключена'}</button>
      <Meter value={reading} on={power} digital={isPremium}/><div className="es-parameter-summary"><span>Источник <strong>{v.voltage} В</strong></span><span>Шаг Δφ <strong>2 В</strong></span></div>
      {isPremium && <div className="es-coordinates">{(['x', 'y'] as const).map(axis => <label key={axis}>{axis}, мм<input type="number" step="0.5" min={axis === 'x' ? -120 : -90} max={axis === 'x' ? 120 : 90} value={toDisplayPoint(probe)[axis]} onChange={e => { if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) move(toModelPoint({ ...toDisplayPoint(probe), [axis]: e.target.valueAsNumber })) }}/></label>)}</div>}
      {isPremium && <>
      <label>Искомый потенциал<select value={level} onChange={e => setLevel(Number(e.target.value))}>{levels.map(l => <option key={l} value={l}>{fmt(l)} В · {notebook.points.filter(p => p.level === l).length}/7 точек</option>)}</select></label>
      <div className="es-line-progress"><span>{Math.min(selected.length, 7)} из 7 точек для {fmt(level)} В</span><progress max="7" value={Math.min(selected.length, 7)} aria-label={`Точек для линии ${level} В`}/></div><button className="es-primary" onClick={record} disabled={!power}>Записать точку {fmt(level)} В</button>
      <p className="es-notice" role="status">{notice || (!power ? 'Включите питание, затем проверьте потенциалы электродов.' : ready ? 'Найдите точки выбранного потенциала.' : 'Проверьте электроды 0 В и U.')}</p>
      <p className="es-hint">Допуск ±0,1 В. На одной линии нужно не меньше 7 разнесённых точек.</p>
      <div className="es-button-row"><button onClick={() => move({ x: 90, y: probe.y })}>Зонд на ось y = 0</button><button onClick={axisRecord} disabled={!power}>В график φ(r)</button></div>
      <details className="es-display-options"><summary>Отображение поля</summary>      <div className="es-options"><label><input type="checkbox" checked={join} onChange={e => setJoin(e.target.checked)}/> Соединить соседние измеренные точки</label><label><input type="checkbox" checked={reference} onChange={e => setReference(e.target.checked)}/> Эталонные эквипотенциали</label><label><input type="checkbox" checked={showField} onChange={e => setShowField(e.target.checked)}/> Эталонные силовые линии</label></div>
      {(reference || showField) && <p className="es-hint">Справочная численная модель — не ваши измерения. При экспорте карты эти линии тоже попадут в рисунок.</p>}
</details>
      </>}
    </aside></div>}</Workspace>
    {isPremium && <>
    <details className="es-panel es-method" id="es-method"><summary>Методика · как выполнить работу</summary><ol className="es-steps"><li>Проверьте потенциалы электродов 0 В и U и запишите U = {v.voltage} В.</li><li>Для каждого уровня {levels.join('; ')} В найдите минимум 7 точек. Располагайте их вдоль всей линии, а не рядом друг с другом.</li><li>На первой и последней линии найдите ещё 2–3 точки за пределами области между электродами. Если линия замкнута, исследуйте её продолжение вокруг электрода.</li><li>Соединяйте точки последовательно вдоль эквипотенциали. Постройте перпендикулярные им силовые линии со стрелками от большего φ к меньшему.</li><li>На оси y = 0 мм снимите не меньше 7 отсчётов для графика φ(r). Затем выберите точки соседних линий вдоль нормали и рассчитайте E.</li></ol><p className="es-hint">Пластина 240 × 180 мм — размеры виртуальной модели. На экспортируемой SVG-карте 1 мм координат соответствует 1 мм при печати в масштабе 100%. Внешние края модели изолированы.</p></details>
    <details className="es-panel es-measurements" id="es-measurements"><summary className="es-panel-heading"><SectionTitle step="3">Измерения эквипотенциалей</SectionTitle><span>{notebook.points.length} точек · {levels.filter(l => notebook.points.filter(p => p.level === l).length >= 7).length}/{levels.length} линий измерено</span></summary><div className="es-table-wrap es-measurements-scroll"><table><thead><tr><th>φ заданное, В</th><th>x, мм</th><th>y, мм</th><th>φ измеренное, В</th><th><span className="es-action-label">Удалить</span></th></tr></thead><tbody>{notebook.points.map((p, i) => <tr key={i}><td>{fmt(p.level)}</td><td>{fmt(toDisplayPoint(p).x)}</td><td>{fmt(toDisplayPoint(p).y)}</td><td>{fmt(p.potential)}</td><td><button className="es-delete-point" title="Удалить точку" aria-label={`Удалить точку ${i + 1}`} onClick={() => { setNotebook(n => ({ ...n, points: n.points.filter((_, k) => k !== i), pairs: n.pairs.filter(pair => ![pair.a,pair.b].some(point => point.x === p.x && point.y === p.y && point.level === p.level)) })); setPairA(''); setPairB('') }}>×</button></td></tr>)}</tbody></table></div>{!notebook.points.length && <p className="es-hint">Здесь появятся точки, которые вы запишете зондом.</p>}</details>
    <section className="es-panel" id="es-graph"><div className="es-panel-heading"><SectionTitle step="4">График φ(r)</SectionTitle><span>{notebook.axis.length} отсчётов на центральной оси</span></div><AxisPlot notebook={notebook} variant={v}/><div className="es-table-wrap"><table><thead><tr><th>r, мм</th><th>φ, В</th><th>Действие</th></tr></thead><tbody>{notebook.axis.map((p, i) => <tr key={i}><td>{fmt(axisOrigin(v) - p.y)}</td><td>{fmt(p.potential)}</td><td><button onClick={() => setNotebook(n => ({ ...n, axis: n.axis.filter((_, k) => k !== i) }))}>Удалить</button></td></tr>)}</tbody></table></div><p className="es-hint">r отсчитывается влево от проекции центра нулевого электрода на горизонтальную ось y = 0 мм. Более крутой участок графика соответствует большей напряжённости.</p></section>
    <section className="es-panel" id="es-field"><SectionTitle step="5">Напряжённость поля</SectionTitle><p>E ≈ |φ₂ − φ₁| / Δl. Расстояние измеряют по нормали между соседними линиями; 1 мм = 0,001 м.</p><div className="es-pair-controls">{[{ name: 'Точка A', value: pairA, set: setPairA }, { name: 'Точка B', value: pairB, set: setPairB }].map(control => <label key={control.name}>{control.name}<select value={control.value} onChange={e => control.set(e.target.value)}><option value="">Выберите точку</option>{notebook.points.map((p, i) => <option key={i} value={i}>№{i + 1}: {p.level} В; ({fmt(toDisplayPoint(p).x)}; {fmt(toDisplayPoint(p).y)}) мм</option>)}</select></label>)}<button onClick={addPair}>Добавить участок</button></div><div className="es-table-wrap"><table><thead><tr><th>φA → φB, В</th><th>Δl, мм</th><th>Ваше E, В/м</th><th>Проверка расчёта</th><th>Действие</th></tr></thead><tbody>{notebook.pairs.map((p, i) => { const expected = fieldEstimate(p.a, p.b)!, answer = Number(p.answer.replace(',', '.')); return <tr key={i}><td>{fmt(p.a.potential)} → {fmt(p.b.potential)}</td><td>{fmt(expected.distanceMm, 2)}</td><td><input aria-label={`Напряжённость на участке ${i + 1}, В на метр`} inputMode="decimal" maxLength={30} value={p.answer} onChange={e => setNotebook(n => ({ ...n, pairs: n.pairs.map((q, k) => k === i ? { ...q, answer: e.target.value } : q) }))}/></td><td>{!p.answer.trim() ? 'Введите результат' : Number.isFinite(answer) && Math.abs(answer - expected.field) <= Math.max(1, expected.field * .05) ? 'Расчёт верен (±5%)' : 'Проверьте формулу и единицы'}</td><td><button onClick={() => setNotebook(n => ({ ...n, pairs: n.pairs.filter((_, k) => k !== i) }))}>Удалить</button></td></tr> })}</tbody></table></div><p className="es-hint">Это средняя оценка E на участке. Для неоднородного поля используйте близкие линии и короткий участок, почти прямой. Проверка расчёта не заменяет оценку правильности выбора точек.</p></section>
    <section className="es-panel"><SectionTitle step="6">Вывод и контрольные вопросы</SectionTitle><label>Где поле сильнее и как это видно по линиям и графику?<textarea maxLength={10000} value={notebook.conclusion} onChange={e => setNotebook(n => ({ ...n, conclusion: e.target.value }))}/></label><details><summary>Контрольные вопросы из методички</summary>{questions.map((q, i) => <label key={q}>{i + 1}. {q}<textarea maxLength={3000} value={notebook.answers[i]} onChange={e => setNotebook(n => ({ ...n, answers: n.answers.map((a, k) => k === i ? e.target.value : a) }))}/></label>)}</details></section>
    <section className="es-panel" id="es-export"><SectionTitle step="7">Сохранение и материалы</SectionTitle><p role="status">{saveError || 'Черновик сохраняется только в этом браузере. Работу оформляйте на миллиметровой бумаге.'}</p><div className="es-button-row"><button onClick={exportReport}>Скачать отчёт CSV</button><button onClick={exportMap}>Скачать карту SVG · масштаб 1:1</button><button onClick={() => { if (window.confirm('Удалить все измерения и ответы текущего варианта из этого браузера?')) { setNotebook(emptyElectroNotebook()); setNotice('Черновик очищен.'); setPairA(''); setPairB('') } }}>Очистить черновик</button></div><details><summary>Теория и ограничения модели</summary><p>φ — потенциал относительно нулевого электрода. E = −grad φ: поле направлено в сторону убывания потенциала и перпендикулярно эквипотенциалям. Работа вдоль эквипотенциали равна нулю.</p><p>Как в методичке, используется аналогия со слабопроводящей пластиной. Виртуальная модель решает двумерное уравнение Лапласа при постоянных потенциалах электродов и нулевом нормальном токе на внешнем крае. Сетка расчёта — 2 мм, координатная сетка — 5 мм. Это не модель двух точечных зарядов в свободном трёхмерном пространстве.</p><p>Отсчёт округляется до 0,1 В; случайный шум не добавляется. Поле вблизи границ электродов чувствительно к разрешению сетки. В методичке встречается опечатка в определении grad φ; здесь применяется стандартное E = −grad φ.</p></details></section>
    </>}
  </>
}
export default function Electrostatics() {
  const { profile, loading, error, refresh, setProfile } = useStudentProfile()
  const { user, isPremium } = useAuth()
  const [selection, setSelection] = useState<ElectroPracticeSelection | null>(null)
  const [revision, setRevision] = useState(0)
  const practiceNumber = activeElectroPractice(selection, user?.id ?? null, profile?.id ?? null, isPremium)
  const controls = profile && user && isPremium ? <ElectroVariantControls number={practiceNumber ?? profile.variantNumber ?? 1} custom={practiceNumber !== null} onApply={number => { if (!isPremium) return; setSelection({ userId: user.id, studentId: profile.id, number }); setRevision(n => n + 1) }} onReset={() => { setSelection(null); setRevision(n => n + 1) }}/> : null
  const assignedNumber = profile?.variantNumber
  const variant = useMemo(() => electroVariant(practiceNumber ?? assignedNumber ?? 1, profile?.id), [practiceNumber, assignedNumber, profile?.id])
  return <main className="es-page"><div className="es-container"><header className="es-heading"><span>ИНТЕРАКТИВНАЯ ЛАБОРАТОРИЯ №6</span><h1>Исследование электростатических полей</h1></header>

    {loading ? <section className="es-panel" role="status">Загружаем профиль…</section> : error ? <section className="es-panel"><p role="alert">{error}</p><button onClick={() => void refresh()}>Повторить</button></section> : !profile ? <section className="es-panel"><h2>Ваши данные для лабораторной</h2><StudentIdentityForm start onComplete={setProfile}/></section> : !assignedNumber ? <section className="es-panel"><p>У профиля ещё нет постоянного номера варианта. Обновите профиль перед началом работы.</p><button onClick={() => void refresh()}>Обновить профиль</button></section> : <>
      <Experiment key={`${profile.id}:${variant.number}:geometry-${variant.revision ?? 'legacy'}:${practiceNumber === null ? 'assigned' : 'practice'}:${revision}:${isPremium ? 'pro' : 'basic'}`} variant={variant} student={profile} practice={practiceNumber !== null} variantControls={controls}/>
      {isPremium && <section className="es-panel" id="es-instructions"><div className="es-panel-heading"><h2>{practiceNumber === null ? 'Ваш вариант' : 'Учебный режим'} № {variant.number}</h2><span>{profile.lastName} {profile.firstName} · {profile.group}</span></div><p>{variantDescription(variant)} · U = {variant.voltage} В · шаг Δφ = {variant.interval} В · расстояние между основными электродами {fmt(Math.hypot(electrodes(variant)[0].x - electrodes(variant)[1].x, electrodes(variant)[0].y - electrodes(variant)[1].y))} мм{variant.revision !== 3 && variant.geometry !== 'plates' && <> · радиус {variant.radius} мм</>}{variant.revision !== 3 && variant.geometry !== 'discs' && <> · длина пластины {electrodes(variant).find(e => e.shape === 'plate')?.length} мм</>}</p><p className="es-hint">Назначенный номер {assignedNumber} связан с вашим профилем. Учебный режим не меняет назначение, его записи хранятся отдельно.</p></section>}

    </>}
  </div></main>
}
