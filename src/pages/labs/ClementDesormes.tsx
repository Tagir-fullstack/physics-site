import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentIdentityForm from '../../components/StudentIdentityForm'
import { useAuth } from '../../context/AuthContext'
import { studentRequest, useStudentProfile, type StudentProfile } from '../../lib/studentProfile'
import { AIR_GAMMA, CLEMENT_TIMES, STABILIZATION_SECONDS, WATER_HEAD_PA, clementAction, clementGamma, clementReading, freshClement, stepClement, type ClementAction, type ClementState, type ClementVariant } from '../../lib/clementDesormes'
import '../../styles/student-profile.css'
import '../../styles/atwood.css'
import '../../styles/clement-desormes.css'

const f = (n: number, digits = 1) => n.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits })
const num = (s: string) => s.trim() ? Number(s.replace(',', '.')) : NaN
type Measurement = { initialHead: number; initialLeft: number; initialRight: number; time: number; left: number; right: number }
type Row = { reading?: Measurement; head: string; final: string; log: string }
type Notebook = { revision: 1; rows: Row[]; processes: string[]; slope: string; intercept: string; extrapolated: string; gamma: string; error: string; conclusion: string }
const blank = (): Notebook => ({ revision: 1, rows: CLEMENT_TIMES.map(() => ({ head: '', final: '', log: '' })), processes: ['', '', '', ''], slope: '', intercept: '', extrapolated: '', gamma: '', error: '', conclusion: '' })
function loadNotebook(key: string): Notebook {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null') as Notebook | null
    if (value?.revision === 1 && Array.isArray(value.rows) && value.rows.length === 5 && value.rows.every(r => r && ['head', 'final', 'log'].every(k => typeof r[k as keyof Row] === 'string') && (!r.reading || ['initialHead', 'initialLeft', 'initialRight', 'time', 'left', 'right'].every(k => Number.isFinite(r.reading![k as keyof Measurement])))) && Array.isArray(value.processes) && value.processes.length === 4 && value.processes.every(s => typeof s === 'string') && ['slope', 'intercept', 'extrapolated', 'gamma', 'error', 'conclusion'].every(k => typeof value[k as keyof Notebook] === 'string')) return value
  } catch { /* An unreadable draft never blocks the lab. */ }
  return blank()
}
const phaseLabels = { idle: 'Подготовка установки', pumping: 'Накачивание воздуха', settling: 'Установление температуры', ready: 'Состояние 1 · готово к выпуску', venting: 'Выпуск воздуха · состояние 1 → 2', warming: 'Изохорное нагревание · 2 → 3', complete: 'Состояние 3 · снимите показания' }

function Apparatus({ state, variant, act, zoom, showReadings }: { state: ClementState; variant: ClementVariant; act: (action: ClementAction) => void; zoom: boolean; showReadings: boolean }) {
  const reading = clementReading(variant, state), y = (mm: number) => 440 - mm * .65
  const zoomScale = Math.min(840 / 280, 530 / (Math.abs(y(reading.right) - y(reading.left)) + 60))
  const zoomTransform = zoom ? `translate(420 265) scale(${zoomScale}) translate(-615 ${-(y(reading.left) + y(reading.right)) / 2})` : undefined
  const inletEnabled = !state.outletOpen && ['idle', 'pumping'].includes(state.phase)
  const outletEnabled = state.phase === 'ready' || state.phase === 'venting' && state.ventTime >= 1
  return <svg className={`cd-apparatus${zoom ? ' cd-apparatus--zoom' : ''}`} viewBox={zoom ? '0 0 840 530' : '0 25 820 500'} role="img" aria-label={zoom ? 'Рабочая область манометра: шкала и оба уровня воды' : 'Схема по методичке: баллон Б, компрессор Н, краны К и К₀, водяной манометр М'}>
    <defs><marker id="cd-dimension-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="currentColor"/></marker></defs>
    <g className="cd-apparatus-content" transform={zoomTransform}>
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round">
      <path className="cd-vessel" d="M302 132H338V160H382Q412 160 412 190V432Q412 450 394 450H246Q228 450 228 432V190Q228 160 258 160H302Z"/>
      <rect x="535" y="98" width="150" height="392"/>
      <path d="M70 80H540Q560 80 560 100V430C560 458 582 480 610 480S660 458 660 430V100M170 80V230M320 80V118" strokeWidth="10"/>
      <path d="M70 80H540Q560 80 560 100V430C560 458 582 480 610 480S660 458 660 430V100M170 80V230M320 80V118" strokeWidth="6" className="cd-tube-interior"/>
      <path d={`M560 ${y(reading.left)}V430C560 458 582 480 610 480S660 458 660 430V${y(reading.right)}`} stroke="#4b9cdf" strokeWidth="5"/>
      <path className="cd-water-guide" d={`M568 ${y(reading.left)}H616M616 ${y(reading.right)}H652`} stroke="#4b9cdf" strokeWidth=".8" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity=".75"/>
      <path className="cd-water-meniscus" d={`M552 ${y(reading.left) - 1}Q560 ${y(reading.left) + 1} 568 ${y(reading.left) - 1}M652 ${y(reading.right) - 1}Q660 ${y(reading.right) + 1} 668 ${y(reading.right) - 1}`} stroke="#4b9cdf" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
      <rect x="285" y="119" width="70" height="13" className="cd-apparatus-solid"/>
      <rect x="145" y="230" width="50" height="85" className="cd-apparatus-solid"/>
      {Array.from({ length: 251 }, (_, i) => { const mm = i * 2; return <path className="cd-scale-tick" key={mm} d={`M${mm % 50 === 0 ? 594 : mm % 10 === 0 ? 600 : 607} ${y(mm)}H616`} strokeWidth={mm % 10 === 0 ? 1 : .7} opacity={mm % 10 === 0 ? .75 : .45}/> })}
    </g>
    <g className="cd-svg-labels" fill="currentColor">
      <text x="320" y="235" textAnchor="middle">Воздух</text><text x="320" y="266" textAnchor="middle">{f(state.temperatureK - 273.15)} °C</text>
      {showReadings && <text x="320" y="295" textAnchor="middle">p − p₀ = {f(state.head * WATER_HEAD_PA, 0)} Па</text>}
      <text x="320" y="430" textAnchor="middle" className="cd-apparatus-letter">Б</text><text x="170" y="282" textAnchor="middle" className="cd-apparatus-letter"><title>Компрессор Н</title>Н</text>
      <text x="70" y="48" textAnchor="middle">Атмосфера</text><text x="610" y="72" textAnchor="middle">Вода · мм</text><text x="610" y="515" textAnchor="middle" className="cd-apparatus-letter">М</text>
      {showReadings && <g className="cd-digital-levels"><text x="530" y={y(reading.left) - 9} textAnchor="end">{f(reading.left)}</text><text x="700" y={y(reading.right) - 9}>{f(reading.right)}</text></g>}
      {Array.from({ length: 11 }, (_, i) => i * 50).map(mm => <text key={mm} x="641" y={y(mm) + 4} textAnchor="end" className="cd-scale-label">{mm}</text>)}
    </g>
    {!zoom && reading.difference >= 5 && <g className="cd-head-dimension" stroke="currentColor" fill="none" strokeWidth="1.2">
      <path d={`M670 ${y(reading.right)}H786M670 ${y(reading.left)}H786`} strokeDasharray="4 4" opacity=".5"/>
      <path d={`M775 ${y(reading.right) + 4}V${y(reading.left) - 4}`} markerStart="url(#cd-dimension-arrow)" markerEnd="url(#cd-dimension-arrow)"/>
      <text x="790" y={(y(reading.left) + y(reading.right)) / 2 + 5} fill="currentColor" stroke="none">{['warming', 'complete'].includes(state.phase) ? 'h′' : 'H'}</text>
    </g>}
    <g role="button" tabIndex={inletEnabled ? 0 : -1} aria-disabled={!inletEnabled} aria-label={`Кран К: ${state.inletOpen ? 'открыт' : 'закрыт'}`} onClick={() => act('inlet')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act('inlet') } }} className={`cd-valve${state.inletOpen ? ' is-open' : ''}`}>
      <rect x="143" y="132" width="75" height="65" fill="transparent"/>
      <path d="M160 152H180L177 176H163Z" className="cd-stopcock-body"/>
      <path d={state.inletOpen ? 'M181 164H204M204 155V173' : 'M190 144V184M181 164H190'} strokeWidth="3"/>
      <text x="210" y="147">К</text>
    </g>
    <g role="button" tabIndex={outletEnabled ? 0 : -1} aria-disabled={!outletEnabled} aria-label={`Кран К₀: ${state.outletOpen ? 'открыт' : 'закрыт'}`} onClick={() => act('outlet')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act('outlet') } }} className={`cd-valve${state.outletOpen ? ' is-open' : ''}`}>
      <rect x="80" y="42" width="65" height="65" fill="transparent"/>
      <path d="M97 66H113L109 95H101Z" className="cd-stopcock-body"/>
      <path d={state.outletOpen ? 'M105 40V67' : 'M91 54H119M105 54V67'} strokeWidth="3"/><text x="123" y="57">К₀</text>
    </g>
    {state.outletOpen && <path className="cd-flow" d="M85 80H52M59 73L52 80L59 87" fill="none" stroke="#69b8eb" strokeWidth="2"/>}
    </g>
  </svg>
}

function ResultsPlot({ notebook }: { notebook: Notebook }) {
  const points = notebook.rows.flatMap(row => row.reading && Number.isFinite(num(row.log)) ? [{ time: row.reading.time, log: num(row.log) }] : [])
  const slope = num(notebook.slope), intercept = num(notebook.intercept)
  const values = [...points.map(p => p.log), ...(Number.isFinite(intercept) ? [intercept] : [])]
  const ymin = Math.min(2, ...values) - .2, ymax = Math.max(4.5, ...values) + .2
  const x = (t: number) => 65 + t / 30 * 450, y = (log: number) => 240 - (log - ymin) / (ymax - ymin) * 200
  return <svg viewBox="0 0 560 290" className="cd-plot" role="img" aria-label="График ln h′ от времени открытия крана по введённым данным">
    <defs><clipPath id="cd-plot-clip"><rect x="65" y="25" width="450" height="215"/></clipPath></defs>
    {[0, 5, 10, 15, 20, 25, 30].map(t => <g key={t}><path d={`M${x(t)} 35V240`} stroke="currentColor" opacity=".1"/><text x={x(t)} y="261" textAnchor="middle">{t}</text></g>)}
    {[0, 1, 2, 3, 4].map(i => { const log = ymin + (ymax - ymin) * i / 4; return <g key={i}><path d={`M65 ${y(log)}H515`} stroke="currentColor" opacity=".1"/><text x="56" y={y(log) + 4} textAnchor="end">{f(log)}</text></g> })}
    <path d="M65 25V240H525" fill="none" stroke="currentColor"/><text x="66" y="17">ln(h′ / мм)</text><text x="515" y="283" textAnchor="end">t, с</text>
    <g clipPath="url(#cd-plot-clip)">{Number.isFinite(slope) && Number.isFinite(intercept) && <path d={`M${x(0)} ${y(intercept)}L${x(30)} ${y(intercept + 30 * slope)}`} fill="none" stroke="#4b9cdf" strokeWidth="2" strokeDasharray="6 4"/>}{points.map((p, i) => <circle key={i} cx={x(p.time)} cy={y(p.log)} r="5" fill="#ef7868"><title>{f(p.time, 2)} с; {f(p.log, 4)}</title></circle>)}</g>
  </svg>
}

function Experiment({ variant, student, canMonitor, canUsePro }: { variant: ClementVariant; student: StudentProfile; canMonitor: boolean; canUsePro: boolean }) {
  const { user } = useAuth()
  const storageKey = `physez-clement-v1:${student.id}:${variant.number}`
  const [state, setState] = useState(() => freshClement(variant))
  const live = useRef(state)
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia('(max-width: 960px)').matches)
  const [speed, setSpeed] = useState(1)
  const [zoom, setZoom] = useState(false)
  const [rowIndex, setRowIndex] = useState(0)
  const [notebook, setNotebook] = useState(() => loadNotebook(storageKey))
  const [storageError, setStorageError] = useState('')
  const [notice, setNotice] = useState('')
  const pumpHold = useRef<{ element: HTMLButtonElement; pointerId: number } | null>(null)
  const stopPump = useCallback(() => {
    const held = pumpHold.current
    pumpHold.current = null
    if (held?.element.hasPointerCapture(held.pointerId)) held.element.releasePointerCapture(held.pointerId)
    if (live.current.pumping) {
      const next = clementAction(variant, live.current, 'pump-off')
      live.current = next; setState(next)
    }
  }, [variant])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)')
    const changed = () => { stopPump(); setMobileLayout(media.matches) }
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [stopPump])
  const updateState = (next: ClementState) => { live.current = next; setState(next) }
  const act = (action: ClementAction) => {
    if (action === 'reset' || action === 'inlet' && live.current.inletOpen || action === 'pump-off') stopPump()
    if (action === 'outlet' && !live.current.outletOpen && live.current.phase === 'ready') {
      if (Math.abs(live.current.head - variant.targetHead) > 1) { setNotice('Начальная разность уровней не достигла задания. Сбросьте опыт и накачайте до ограничителя.'); return }
      setSpeed(1)
    }
    const next = clementAction(variant, live.current, action)
    updateState(next)
  }
  useEffect(() => {
    let frame: number, previous = performance.now()
    const tick = (now: number) => {
      const multiplier = live.current.phase === 'venting' ? 1 : canUsePro ? speed : Math.min(speed, 2)
      const next = stepClement(variant, live.current, (now - previous) / 1000 * multiplier)
      previous = now; live.current = next; setState(next); frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [variant, speed, canUsePro])
  useEffect(() => {
    const released = (event: PointerEvent) => { if (pumpHold.current?.pointerId === event.pointerId) stopPump() }
    const hidden = () => { if (document.hidden) stopPump() }
    window.addEventListener('pointerup', released, true)
    window.addEventListener('pointercancel', released, true)
    window.addEventListener('blur', stopPump)
    window.addEventListener('pagehide', stopPump)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pointerup', released, true)
      window.removeEventListener('pointercancel', released, true)
      window.removeEventListener('blur', stopPump)
      window.removeEventListener('pagehide', stopPump)
      document.removeEventListener('visibilitychange', hidden)
      const held = pumpHold.current
      pumpHold.current = null
      if (held?.element.hasPointerCapture(held.pointerId)) held.element.releasePointerCapture(held.pointerId)
    }
  }, [stopPump])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(notebook)); setStorageError('') }
      catch { setStorageError('Не удалось сохранить черновик в браузере. Перепишите результаты в тетрадь; с PRO их также можно скачать в CSV.') }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [notebook, storageKey])
  const reading = clementReading(variant, state)
  const waiting = state.phase === 'settling' || state.phase === 'warming'
  const targetTime = CLEMENT_TIMES[rowIndex]
  const phaseLabel = canUsePro ? phaseLabels[state.phase] : ({
    idle: 'Подготовка установки', pumping: 'Накачивание воздуха', settling: 'Дождитесь стабилизации',
    ready: 'Снимите начальные показания', venting: 'Кран К₀ открыт', warming: 'Дождитесь стабилизации', complete: 'Снимите показания',
  })[state.phase]
  const basicHint = ({
    idle: mobileLayout ? 'Откройте К и включите компрессор.' : 'Откройте К и удерживайте компрессор.',
    pumping: 'Накачайте до ограничителя, затем закройте К.',
    settling: 'Подождите 80 с. Затем определите начальную разность уровней по шкале.',
    ready: 'Запишите начальные уровни и откройте К₀.',
    venting: `Закройте К₀ примерно на ${targetTime}-й секунде.`,
    warming: 'Подождите 80 с, затем снимите показания.',
    complete: 'Считайте оба уровня и перепишите их в тетрадь.',
  })[state.phase]
  const phaseHint = state.phase === 'idle' ? 'Откройте кран К и удерживайте «Компрессор».' : state.phase === 'pumping' ? state.equilibriumHead >= variant.targetHead ? 'Ограничитель достигнут. Отпустите компрессор и закройте К.' : 'Накачайте до ограничителя, затем закройте К.' : state.phase === 'settling' ? 'Дождитесь теплового равновесия. При закрытых кранах давление остаётся выше атмосферного.' : state.phase === 'ready' ? 'Запишите начальные уровни. Откройте К₀ — секундомер запустится автоматически.' : state.phase === 'venting' ? `Закройте К₀ примерно на ${targetTime}-й секунде. Учитывается фактическое время.` : state.phase === 'warming' ? 'Воздух нагревается при постоянном объёме; давление растёт.' : 'Считайте оба уровня манометра и сохраните измерение в выбранную строку.'
  const patch = (key: 'slope' | 'intercept' | 'extrapolated' | 'gamma' | 'error' | 'conclusion', value: string) => setNotebook(n => ({ ...n, [key]: value }))
  const patchRow = (i: number, key: 'head' | 'final' | 'log', value: string) => setNotebook(n => ({ ...n, rows: n.rows.map((r, index) => index === i ? { ...r, [key]: value } : r) }))
  const record = () => {
    if (!canUsePro || state.phase !== 'complete') return
    if (Math.abs(state.ventTime - targetTime) > 1) { setNotice(`Для строки ${targetTime} с допустимо отклонение до 1 с. Сбросьте опыт и повторите; сейчас ${f(state.ventTime, 2)} с.`); return }
    if (notebook.rows[rowIndex].reading && !window.confirm('Заменить измерение в этой строке? Введённые расчёты строки и параметры прямой будут очищены.')) return
    const initial = clementReading(variant, { ...state, phase: 'ready', head: state.initialHead })
    setNotebook(n => ({ ...n, rows: n.rows.map((r, i) => i === rowIndex ? { head: '', final: '', log: '', reading: { initialHead: state.initialHead, initialLeft: initial.left, initialRight: initial.right, time: Math.round(state.ventTime * 100) / 100, left: reading.left, right: reading.right } } : r), slope: '', intercept: '', extrapolated: '', gamma: '', error: '' }))
    setNotice(`Опыт ${targetTime} с сохранён. Заполните H, h′ и ln h′ по отсчётам.`)
  }
  const reset = () => { act('reset'); setSpeed(1); setNotice('Установка сброшена; записи в таблицах сохранены.') }
  const download = () => {
    if (!canUsePro) return
    const lines = [['Метод Клемана—Дезорма', `Вариант ${variant.number}`, `${student.lastName} ${student.firstName}`, student.group], ['t заданное, с', 't факт, с', 'начальный левый, мм', 'начальный правый, мм', 'конечный левый, мм', 'конечный правый, мм', 'H, мм (студент)', 'h′, мм (студент)', 'ln h′ (студент)'], ...notebook.rows.map((r, i) => [CLEMENT_TIMES[i], r.reading?.time ?? '', r.reading?.initialLeft ?? '', r.reading?.initialRight ?? '', r.reading?.left ?? '', r.reading?.right ?? '', r.head, r.final, r.log]), ['Наклон', notebook.slope], ['Пересечение ln h', notebook.intercept], ['h, мм', notebook.extrapolated], ['γ', notebook.gamma], ['ε, %', notebook.error], ...notebook.processes.map((p, i) => [`Процессы: поле ${i + 1}`, p]), ['Вывод', notebook.conclusion]]
    const blob = new Blob(['\ufeff' + lines.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `clement-variant-${variant.number}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const computedGamma = clementGamma(num(notebook.rows[0].head), num(notebook.extrapolated))
  const liveControls = <div className="cd-live-controls" aria-label="Управление установкой">
        <div className="cd-clock"><span>{state.phase === 'venting' || state.ventTime ? 'Кран открыт' : 'Ожидание'}</span><strong>{f(state.phase === 'venting' || state.ventTime ? state.ventTime : waiting ? Math.min(80, state.elapsed) : 0, 2)} с</strong></div>
        <label className="cd-speed"><span>Скорость</span><select aria-label="Скорость показа" value={canUsePro ? speed : Math.min(speed, 2)} disabled={state.phase === 'venting' || state.pumping} onChange={e => { const next = Number(e.target.value); if ([1, 2, ...(canUsePro ? [5, 10] : [])].includes(next)) setSpeed(next) }}>{[1, 2, 5, 10].map(s => <option key={s} value={s} disabled={!canUsePro && s > 2}>×{s}{s > 2 ? ' · PRO' : ''}</option>)}</select></label>
        <div className="cd-valve-buttons"><button type="button" aria-pressed={state.inletOpen} disabled={state.outletOpen || !['idle', 'pumping'].includes(state.phase)} onClick={() => act('inlet')}>К · {state.inletOpen ? 'открыт' : 'закрыт'}</button><button type="button" aria-pressed={state.outletOpen} disabled={state.phase !== 'ready' && !(state.phase === 'venting' && state.ventTime >= 1)} onClick={() => act('outlet')}>К₀ · {state.outletOpen ? 'открыт' : 'закрыт'}</button></div>
        <button type="button" className={`cd-primary cd-pump${state.pumping ? ' is-pumping' : ''}`} disabled={!state.inletOpen || state.outletOpen || !['idle', 'pumping'].includes(state.phase)} onPointerDown={e => {
          if (mobileLayout || !e.isPrimary || e.button !== 0) return
          stopPump()
          pumpHold.current = { element: e.currentTarget, pointerId: e.pointerId }
          e.currentTarget.setPointerCapture(e.pointerId)
          act('pump-on')
        }} onPointerUp={() => { if (!mobileLayout) stopPump() }} onPointerCancel={() => { if (!mobileLayout) stopPump() }} onLostPointerCapture={() => { if (!mobileLayout) stopPump() }} onClick={() => { if (mobileLayout) act(live.current.pumping ? 'pump-off' : 'pump-on') }} aria-pressed={mobileLayout ? state.pumping : undefined} onBlur={() => { if (!mobileLayout) stopPump() }} onContextMenu={e => e.preventDefault()} onKeyDown={e => { if (!mobileLayout && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (!e.repeat) act('pump-on') } }} onKeyUp={e => { if (!mobileLayout && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); stopPump() } }}>{mobileLayout ? state.pumping ? 'Остановить компрессор' : 'Включить компрессор' : 'Удерживайте · Компрессор'}</button>
        <div className="cd-pump-status" style={{ visibility: state.phase === 'pumping' || waiting ? 'visible' : 'hidden' }}>
          <progress max={state.phase === 'pumping' ? variant.targetHead : STABILIZATION_SECONDS} value={state.phase === 'pumping' ? state.equilibriumHead : Math.min(STABILIZATION_SECONDS, state.elapsed)} aria-label={state.phase === 'pumping' ? 'Накачивание до ограничителя' : 'Установление теплового равновесия'}/>
          <small>{state.phase === 'pumping' ? `Накачано: ${f(state.equilibriumHead / variant.targetHead * 100, 0)}%${state.equilibriumHead >= variant.targetHead ? ' · Закройте К' : ''}` : `Ожидание: ${f(Math.min(STABILIZATION_SECONDS, state.elapsed), 0)} / ${STABILIZATION_SECONDS} с`}</small>
        </div>
        <div className="cd-actions"><button type="button" className="cd-primary" disabled={!canUsePro || state.phase !== 'complete'} title={!canUsePro ? 'Запись в электронную таблицу доступна с PRO. Отсчёты можно переписать в тетрадь.' : undefined} onClick={record}>Записать отсчёты <span className="atwood-pro-badge">PRO</span></button><button type="button" onClick={reset}>Сбросить</button></div>
      </div>
  return <main className="atwood-page cd-page"><div className="atwood-container cd-container">
    <header className="atwood-header cd-header"><div className="atwood-eyebrow">ИНТЕРАКТИВНАЯ ЛАБОРАТОРИЯ №5</div><h1>Метод Клемана—Дезорма</h1></header>
    <div className="atwood-grid cd-experiment-grid">
      <section className="atwood-card atwood-simulation-card cd-panel cd-apparatus-panel"><div className="atwood-scene-heading cd-panel-title"><h2 className="atwood-card-title"><span>1</span> Схема установки</h2><button type="button" className="cd-zoom" onClick={() => setZoom(z => !z)} aria-pressed={zoom}>{zoom ? 'Вся установка' : 'Увеличить манометр'}</button></div><Apparatus state={state} variant={variant} act={act} zoom={zoom} showReadings={canUsePro}/>{canUsePro && <div className="cd-levels"><span>Левое колено: <b>{f(reading.left)} мм</b></span><span>Правое колено: <b>{f(reading.right)} мм</b></span></div>}{mobileLayout && liveControls}</section>
      <section className="atwood-card cd-panel cd-controls"><h2 className="atwood-card-title"><span>2</span> Параметры опыта</h2><div className="cd-participant"><span>{student.lastName} {student.firstName} · {student.group}</span><b>Вариант № {variant.number}</b><Link to={user ? '/account' : '/student/profile?from=clement-desormes'}>Мой профиль →</Link></div><div className="cd-conditions"><span>В комнате <b>{f(variant.ambientK - 273.15)} °C</b></span><span>Атмосфера <b>{f(variant.pressurePa / 1000, 2)} кПа</b></span></div>
        <label>Опыт: время открытия К₀<select value={rowIndex} disabled={state.phase !== 'idle'} onChange={e => { setRowIndex(Number(e.target.value)); setNotice('') }}>{CLEMENT_TIMES.map((t, i) => <option value={i} key={t}>{t} с{notebook.rows[i].reading ? ' · записан' : ''}</option>)}</select></label>

        {!mobileLayout && liveControls}
        <div className="cd-status" role="status"><b>{phaseLabel}</b><p>{canUsePro ? mobileLayout ? phaseHint.replace('удерживайте «Компрессор»', 'включите компрессор').replace('Отпустите компрессор', 'Остановите компрессор') : phaseHint : basicHint}</p></div>

{canUsePro ? <small className="cd-muted">При выпуске воздуха автоматически ×1. Секундомер показывает время опыта.</small> : <Link className="cd-pro-link" to="/account">Ускорение ×5 и ×10 доступно с PRO →</Link>}
        {notice && <p className="cd-notice" role="status">{notice}</p>}
      </section>
    </div>
    {canUsePro ? <>
    <div className="atwood-pro-heading cd-pro-heading"><span className="atwood-pro-badge">PRO</span> Теория, обработка и оформление работы</div>
    <section className="atwood-card cd-panel cd-theory"><h2>Что исследуем</h2><p>После быстрого выпуска воздух охлаждается. После закрытия К₀ он нагревается при постоянном объёме. Чем дольше кран открыт, тем сильнее влияние теплообмена и тем меньше конечная разность уровней h′.</p><p><b>h′ = h · e<sup>−at</sup></b> → <b>ln(h′ / мм) = ln(h / мм) − at</b>. Постройте прямую по пяти опытам и продолжите её до t = 0. Значение h из пересечения используйте в <b>γ = H / (H − h)</b>.</p><details><summary>Порядок работы и допущения модели</summary><ol><li>Для каждого опыта начинайте с одинаковой разности H: накачайте воздух до ограничителя и закройте К.</li><li>Подождите 80 с, затем откройте К₀ на 5, 10, 15, 20 или 25 с. Первую секунду давление выравнивается; не закрывайте кран раньше.</li><li>Закройте К₀, подождите ещё 80 с и запишите уровни. Вычислите H и h′ как разности отсчётов.</li><li>Введите ln h′, постройте прямую, найдите ln h и h. Для логарифма используйте числовое значение высоты в миллиметрах.</li></ol><p>Учебная модель малого избыточного давления: γ воздуха = 1,4; влияние длительности выпуска описано эмпирической экспонентой из методички, установление температуры — экспоненциальной релаксацией. Сосуд жёсткий, а при выпуске меняется масса газа, не объём сосуда. После 80 с равновесие считается достигнутым. Компрессор ограничивает накачивание до заданного равновесного H.</p><p>Погрешность прибора моделируется поправкой до ±1 мм к разности уровней; каждый отсчёт округляется до 0,5 мм. Суммарное отклонение разности от идеальной модели не превышает 1,5 мм. Показания стабильны при чтении, а повторный опыт получает другую поправку. Используйте измеренные уровни для расчётов; отклонение γ от 1,4 занесите в поле ε.</p><p>Основа: методические указания КазНИТУ, лабораторная №5 «Определение показателя адиабаты для воздуха методом Клемана и Дезорма», задания 1 и 2, таблицы 3 и 4. Ошибочные упоминания ртутного столба и изохорного сжатия заменены на миллиметры воды и изохорное нагревание.</p></details></section>
    <section className="cd-panel"><h2>Задание 1 · Изопроцессы</h2><p className="cd-muted">Опишите переходы 1 → 2 и 2 → 3; сравните p и T с атмосферными p₀ и T₀.</p><div className="cd-process-grid">{['1 → 2 · Название процесса и изменение температуры', '1 → 2 · Соотношения p₁, T₁ и p₂, T₂ с p₀, T₀', '2 → 3 · Название процесса и изменение температуры', '2 → 3 · Соотношения p₂, T₂ и p₃, T₃ с p₀, T₀'].map((label, i) => <label key={label}>{label}<textarea value={notebook.processes[i]} onChange={e => setNotebook(n => ({ ...n, processes: n.processes.map((s, j) => i === j ? e.target.value : s) }))}/></label>)}</div></section>
    <section className="cd-panel"><h2>Задание 2 · Измерения</h2><p className="cd-muted">Сохраните пять опытов кнопкой «Записать отсчёты». Расчётные ячейки заполните самостоятельно. Начальные H во всех опытах должны совпадать.</p><div className="cd-table-scroll"><table className="cd-table"><thead><tr>{['t зад., с', 't факт., с', 'Начальные уровни лев. / прав., мм', 'Конечные уровни лев. / прав., мм', 'H, мм', 'h′, мм', 'ln h′'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{notebook.rows.map((r, i) => <tr key={i}><th>{CLEMENT_TIMES[i]}</th><td>{r.reading ? f(r.reading.time, 2) : '—'}</td><td>{r.reading ? `${f(r.reading.initialLeft)} / ${f(r.reading.initialRight)}` : '—'}</td><td>{r.reading ? `${f(r.reading.left)} / ${f(r.reading.right)}` : '—'}</td>{(['head', 'final', 'log'] as const).map(key => <td key={key}><input aria-label={`${key === 'head' ? 'H' : key === 'final' ? 'h′' : 'ln h′'}, опыт ${CLEMENT_TIMES[i]} с`} inputMode="decimal" value={r[key]} onChange={e => patchRow(i, key, e.target.value)} disabled={!r.reading}/></td>)}</tr>)}</tbody></table></div></section>
    <section className="cd-panel"><h2>График и обработка</h2><div className="cd-analysis-grid"><div><ResultsPlot notebook={notebook}/><p className="cd-muted">Точки строятся по вашим ln h′ и фактическому времени. Введите наклон и пересечение, чтобы провести свою прямую.</p></div><div className="cd-result-inputs">{([['slope', 'Наклон прямой (−a), с⁻¹'], ['intercept', 'Пересечение при t = 0: ln h'], ['extrapolated', 'h = exp(ln h), мм'], ['gamma', 'Экспериментальный γ'], ['error', 'Отклонение ε, %']] as const).map(([key, label]) => <label key={key}>{label}<input inputMode="decimal" value={notebook[key]} onChange={e => patch(key, e.target.value)}/></label>)}<p className="cd-muted">γ<sub>теор</sub> = (5 + 2) / 5 = {f(AIR_GAMMA)}.<br/>ε = |γ<sub>э</sub> − γ<sub>теор</sub>| / γ<sub>теор</sub> · 100%.</p>{notebook.extrapolated && !computedGamma && <p className="cd-notice">Проверьте исходные значения: должно быть 0 &lt; h &lt; H.</p>}</div></div><label>Вывод<textarea rows={3} value={notebook.conclusion} onChange={e => patch('conclusion', e.target.value)} placeholder="Объясните влияние времени открытия крана и сравните результат с теорией."/></label></section>
    </> : <section className="atwood-card cd-panel cd-pro-locked" aria-label="Обработка работы доступна с PRO"><span className="atwood-pro-badge">PRO</span><div><h2>Теория и обработка результатов</h2><p>Описание процессов, электронные таблицы, запись отсчётов, график, расчёты, вывод и выгрузка CSV доступны с PRO.</p><p>Бесплатно можно проводить опыты и переписывать показания манометра в тетрадь. Существующие черновики сохраняются.</p></div><Link className="cd-pro-link" to="/account">Подробнее о PRO →</Link></section>}
    <section className="atwood-card cd-panel cd-footer" aria-label="Сохранение результатов и навигация">
      {canUsePro && <div className="cd-save-row"><div><h2>Сохранение результатов</h2><p className="cd-muted">Черновик хранится в этом браузере и не переносится на другие устройства. Условия варианта сохранятся — скачайте результаты перед переходом.</p></div><button type="button" className="cd-primary cd-export" onClick={download} aria-label="Скачать результаты CSV">Скачать CSV <span aria-hidden="true">↓</span><span className="atwood-pro-badge">PRO</span></button></div>}
      {canUsePro && storageError && <p className="cd-notice" role="alert">{storageError}</p>}
      <nav className="cd-footer-nav" aria-label="Навигация по лабораторным"><Link to="/labs">← Все лабораторные</Link>{canMonitor && <Link to="/admin/clement-variants">Ожидаемые измерения студентов →</Link>}</nav>
    </section>
  </div></main>
}

export default function ClementDesormes() {
  const { user } = useAuth()
  const { profile, loading, error: profileError, refresh, setProfile, authFetch } = useStudentProfile()
  const [assignment, setAssignment] = useState<{ profile: StudentProfile; variant: ClementVariant; canMonitor: boolean; canUsePro: boolean } | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const id = profile?.id
  useEffect(() => {
    if (!id) return
    let live = true
    void studentRequest<{ profile: StudentProfile; variant: ClementVariant; canMonitor: boolean; canUsePro: boolean }>('/api/student-profile?lab=clement-desormes', undefined, authFetch).then(result => { if (live) { setAssignment(result); setError('') } }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Не удалось загрузить условия.') })
    return () => { live = false }
  }, [id, retry, authFetch])
  if (loading) return <main className="student-page"><section className="student-panel"><p role="status">Загружаем профиль…</p></section></main>
  if (profile && assignment?.profile.id === profile.id) return <Experiment key={profile.id} variant={assignment.variant} student={profile} canMonitor={assignment.canMonitor} canUsePro={assignment.canUsePro === true}/>
  return <main className="student-page"><section className="student-panel"><span className="cd-eyebrow">ЛАБОРАТОРНАЯ РАБОТА №5</span><h1>Метод Клемана—Дезорма</h1><p>Управляйте компрессором и кранами, снимите показания манометра в пяти опытах и определите показатель адиабаты воздуха по графику.</p><p>Используется ваш постоянный номер варианта. Если профиль уже создан, восстановите его вместо повторной регистрации.</p><Link to={user ? '/account' : '/student/profile?from=clement-desormes'}>Мой профиль и восстановление →</Link>{(error || profileError) && <p role="alert" className="student-error">{error || profileError}</p>}{profileError ? <button type="button" onClick={() => void refresh()}>Повторить загрузку профиля</button> : profile ? <><p role="status">{error ? 'Условия не загружены.' : 'Загружаем индивидуальную установку…'}</p>{error && <button type="button" onClick={() => setRetry(n => n + 1)}>Повторить загрузку условий</button>}</> : <StudentIdentityForm start onComplete={setProfile}/>}</section></main>
}
