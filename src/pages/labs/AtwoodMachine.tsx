import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isEmailAdmin } from '../../lib/apiClient'
import '../../styles/atwood.css'

type Trial = {
  id: number
  rings1: number
  rings2: number
  m1: number
  m2: number
  distance: number
  measured: number
  theoretical: number
  error: number | null
}

const G = 9.81
const BASE_MASS = 0.1135
const RING_MASS = 0.0025
const MAX_RINGS = 20
const PULLEY_RADIUS = 0.033
const PULLEY_INERTIA = 1.27e-4
// Fit the mean friction torque to the measured descent; inertia stays nominal.
const CALIBRATION = { rings: 2, distance: 0.565, time: 3.51 }
const calibrationDeltaMass = CALIBRATION.rings * RING_MASS
const calibrationAcceleration = 2 * CALIBRATION.distance / CALIBRATION.time ** 2
const FRICTION_TORQUE = (
  G * calibrationDeltaMass - calibrationAcceleration *
  (2 * BASE_MASS + calibrationDeltaMass + PULLEY_INERTIA / PULLEY_RADIUS ** 2)
) * PULLEY_RADIUS
const FRICTION_VARIATION = 0.05
const DEFAULT_DISTANCE = 1.5
const MAX_TRAVEL = 2.5
const MASS_HEIGHT = 28
// Half of the mass outline (2) plus half of the platform stroke (1.5).
const PLATFORM_CONTACT_OFFSET = 1.75
const UPPER_MASS_Y = 145 - PLATFORM_CONTACT_OFFSET
const BASE_Y = 356
const LOWER_MASS_Y = BASE_Y - MASS_HEIGHT - PLATFORM_CONTACT_OFFSET

function format(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

function ringWord(count: number) {
  const lastTwo = count % 100
  if (lastTwo >= 11 && lastTwo <= 14) return 'колец'
  const last = count % 10
  if (last === 1) return 'кольцо'
  if (last >= 2 && last <= 4) return 'кольца'
  return 'колец'
}

function getAcceleration(deltaMass: number, totalMass: number, frictionFactor = 1) {
  return Math.max(0, (G * Math.abs(deltaMass) - FRICTION_TORQUE * frictionFactor / PULLEY_RADIUS) /
    (totalMass + PULLEY_INERTIA / PULLEY_RADIUS ** 2))
}

export default function AtwoodMachine() {
  const { user, isPremium, isLoading } = useAuth()
  const isPro = isPremium || isEmailAdmin(user?.email)
  const [ringCount1, setRingCount1] = useState(0)
  const [ringCount2, setRingCount2] = useState(4)
  const [distance, setDistance] = useState(DEFAULT_DISTANCE)
  const [distanceInput, setDistanceInput] = useState(String(DEFAULT_DISTANCE * 100))
  const [simTime, setSimTime] = useState(0)
  const [running, setRunning] = useState(false)
  const [frictionFactor, setFrictionFactor] = useState<number | null>(null)
  const [measuredTime, setMeasuredTime] = useState<number | null>(null)
  const [trials, setTrials] = useState<Trial[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showTheory, setShowTheory] = useState(false)
  const frameRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  const m1 = BASE_MASS + ringCount1 * RING_MASS
  const m2 = BASE_MASS + ringCount2 * RING_MASS
  const deltaMass = m2 - m1
  const totalMass = m1 + m2
  const acceleration = useMemo(() => {
    return getAcceleration(deltaMass, totalMass)
  }, [deltaMass, totalMass])
  const theoreticalTime = acceleration > 0 ? Math.sqrt(2 * distance / acceleration) : null
  const runAcceleration = getAcceleration(deltaMass, totalMass, frictionFactor ?? 1)
  const runTime = runAcceleration > 0 ? Math.sqrt(2 * distance / runAcceleration) : null
  const travel = measuredTime !== null ? distance : Math.min(0.5 * runAcceleration * simTime * simTime, distance)
  const progress = travel / distance

  useEffect(() => {
    if (!running) return
    const tick = (now: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = now
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05)
      lastFrameRef.current = now
      const next = elapsedRef.current + dt
      elapsedRef.current = Math.min(next, runTime ?? next)
      setSimTime(elapsedRef.current)
      if (runTime !== null && next >= runTime) {
        setRunning(false)
        setMeasuredTime(runTime)
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      lastFrameRef.current = null
    }
  }, [running, runTime])

  const reset = () => {
    elapsedRef.current = 0
    setRunning(false)
    setSimTime(0)
    setMeasuredTime(null)
    setFrictionFactor(null)
  }

  const updateRingCount = (side: 'm1' | 'm2', rawValue: string) => {
    const value = Number(rawValue)
    if (!Number.isInteger(value) || value < 0 || value > MAX_RINGS) return
    if (side === 'm1') setRingCount1(value)
    else setRingCount2(value)
    reset()
  }

  const transferRing = (from: 'm1' | 'm2') => {
    if (from === 'm1' && ringCount1 > 0 && ringCount2 < MAX_RINGS) {
      setRingCount1((count) => count - 1)
      setRingCount2((count) => count + 1)
      reset()
    }
    if (from === 'm2' && ringCount2 > 0 && ringCount1 < MAX_RINGS) {
      setRingCount2((count) => count - 1)
      setRingCount1((count) => count + 1)
      reset()
    }
  }

  const start = () => {
    if (acceleration <= 0) return
    if (frictionFactor === null || measuredTime !== null) {
      // Triangular scatter, fixed for the whole run and retained on pause/resume.
      setFrictionFactor(1 + (Math.random() + Math.random() - 1) * FRICTION_VARIATION)
    }
    if (measuredTime !== null) {
      elapsedRef.current = 0
      setSimTime(0)
    }
    setMeasuredTime(null)
    lastFrameRef.current = null
    setRunning(true)
  }

  const addTrial = () => {
    if (!isPro || measuredTime === null) return
    const error = theoreticalTime ? Math.abs(measuredTime - theoreticalTime) / theoreticalTime * 100 : null
    setTrials((previous) => [
      ...previous,
      { id: Date.now(), rings1: ringCount1, rings2: ringCount2, m1, m2, distance, measured: measuredTime, theoretical: theoreticalTime || 0, error },
    ])
  }

  const questions = [
    {
      question: 'Как изменится ускорение, если разность масс увеличить?',
      options: ['Увеличится', 'Уменьшится', 'Не изменится'],
      correct: 0,
    },
    {
      question: 'Что произойдёт при m₁ = m₂, если грузы изначально покоятся?',
      options: ['Грузы ускоряются вверх', 'Система остаётся в покое', 'Ускорение станет 9,81 м/с²'],
      correct: 1,
    },
    {
      question: 'Какая величина измеряется экспериментально?',
      options: ['Время движения', 'Масса Земли', 'Радиус Земли'],
      correct: 0,
    },
  ]

  const correctAnswers = questions.reduce((sum, item, index) => sum + (answers[index] === item.correct ? 1 : 0), 0)
  // The selected distance spans the full descent to the base in this schematic.
  const visualTravel = progress * (LOWER_MASS_Y - UPPER_MASS_Y)
  const m1StartsAbove = deltaMass < 0
  const m1Y = (m1StartsAbove ? UPPER_MASS_Y : LOWER_MASS_Y) + (m1StartsAbove ? visualTravel : -visualTravel)
  const m2Y = (m1StartsAbove ? LOWER_MASS_Y : UPPER_MASS_Y) + (m1StartsAbove ? -visualTravel : visualTravel)
  const ringSpacing1 = ringCount1 > 8 ? 2.2 : 4
  const ringSpacing2 = ringCount2 > 8 ? 2.2 : 4

  return (
    <motion.main className="atwood-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="atwood-container">
        <header className="atwood-header">
          <div className="atwood-eyebrow">ИНТЕРАКТИВНАЯ ЛАБОРАТОРИЯ</div>
          <h1>Машина Атвуда</h1>
        </header>

        <section className="atwood-grid">
          <div className="atwood-card atwood-simulation-card">
            <div className="atwood-scene-heading"><div className="atwood-card-title"><span>1</span> Схема установки</div><span className="atwood-state" aria-live="polite">{running ? 'Опыт идёт' : measuredTime !== null ? 'Опыт завершён' : simTime > 0 ? 'Пауза' : 'Готово к запуску'}</span></div>
            <svg className="atwood-scene" viewBox="0 0 700 390" role="img" aria-label="Схема машины Атвуда с кольцами-перегрузками">
              <g fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M346 82 V356 M354 82 V356 M260 356 H440 M240 364 H460" opacity=".35" />
                <circle cx="350" cy="74" r="62" />
                <circle cx="350" cy="74" r="7" />
                <path d={`M288 ${m1Y} V74 A62 62 0 0 1 412 74 V${m2Y}`} strokeWidth="2.5" />
                <g transform={`rotate(${travel / PULLEY_RADIUS * 180 / Math.PI} 350 74)`} opacity=".3">
                  <path d="M350 22 V59 M350 89 V126 M298 74 H335 M365 74 H402" />
                </g>
                <path d={`M480 ${UPPER_MASS_Y + MASS_HEIGHT} H498 M489 ${UPPER_MASS_Y + MASS_HEIGHT} V${BASE_Y} M480 ${BASE_Y} H498`} opacity=".65" />
                <path d={`M435 ${UPPER_MASS_Y + MASS_HEIGHT} H478 M435 ${BASE_Y} H478`} strokeDasharray="4 5" opacity=".45" />
                <path d="M425 48 H470" opacity=".45" />
              </g>
              <g className="atwood-diagram-labels" fill="currentColor">
                <text x="480" y="52">Блок</text>
                <text x="506" y="269">s = {format(distance * 100, 1)} см</text>
                <text x="241" y={m1Y + 19} textAnchor="end">m₁</text>
                <text x="453" y={m2Y + 19}>m₂</text>
              </g>
              <g transform={`translate(288 ${m1Y})`}>
                {Array.from({ length: ringCount1 }).map((_, index) => <ellipse key={index} cx="0" cy={-5 - index * ringSpacing1} rx="17" ry="2" fill="none" stroke="currentColor" strokeWidth="1.5" />)}
                <rect x="-22" y="0" width="44" height="28" fill="#8796a8" stroke="#c3ced8" strokeWidth="2" />
              </g>
              <g transform={`translate(412 ${m2Y})`}>
                {Array.from({ length: ringCount2 }).map((_, index) => <ellipse key={index} cx="0" cy={-5 - index * ringSpacing2} rx="17" ry="2" fill="none" stroke="currentColor" strokeWidth="1.5" />)}
                <rect x="-22" y="0" width="44" height="28" fill="#c84d4a" stroke="#ff7166" strokeWidth="2" />
              </g>
            </svg>
            <div className="atwood-scene-caption"><span>m₁ — груз + {ringCount1} {ringWord(ringCount1)}</span><span>m₂ — груз + {ringCount2} {ringWord(ringCount2)}</span></div>
          </div>

          <aside className="atwood-card atwood-controls">
            <div className="atwood-card-title"><span>2</span> Параметры опыта</div>
            <label>Масса груза без колец, г<input type="number" value={BASE_MASS * 1000} readOnly /></label>
            <div className="atwood-ring-inputs">
              <label htmlFor="atwood-rings-m1">Кольца на грузе m₁, шт.<input id="atwood-rings-m1" aria-describedby={acceleration <= 0 ? 'atwood-ring-warning' : undefined} type="number" min="0" max={MAX_RINGS} step="1" value={ringCount1} onChange={(e) => updateRingCount('m1', e.target.value)} /></label>
              <label htmlFor="atwood-rings-m2">Кольца на грузе m₂, шт.<input id="atwood-rings-m2" aria-describedby={acceleration <= 0 ? 'atwood-ring-warning' : undefined} type="number" min="0" max={MAX_RINGS} step="1" value={ringCount2} onChange={(e) => updateRingCount('m2', e.target.value)} /></label>
            </div>
            <div className="atwood-ring-transfer" aria-label="Перенос колец между грузами">
              <button className="atwood-secondary" type="button" onClick={() => transferRing('m2')} disabled={ringCount2 === 0 || ringCount1 === MAX_RINGS} aria-label="Перенести одно кольцо с m₂ на m₁">← на m₁</button>
              <span>Перенести кольцо</span>
              <button className="atwood-secondary" type="button" onClick={() => transferRing('m1')} disabled={ringCount1 === 0 || ringCount2 === MAX_RINGS} aria-label="Перенести одно кольцо с m₁ на m₂">на m₂ →</button>
            </div>
            <div id="atwood-ring-warning" className="atwood-warning" style={{ visibility: acceleration <= 0 ? 'visible' : 'hidden' }} aria-hidden={acceleration > 0}>Массы равны — движения нет.</div>
            <div className="atwood-constants atwood-mass-constants"><span>m₁: <strong>{(m1 * 1000).toFixed(1)} г</strong></span><span>m₂: <strong>{(m2 * 1000).toFixed(1)} г</strong></span><span title="Разность масс: m₂ − m₁">Δm: <strong>{format(deltaMass * 1000, 1)} г</strong></span><span>Кольцо: <strong>{(RING_MASS * 1000).toFixed(1)} г</strong></span></div>
            <label>Путь s, см<input type="number" inputMode="decimal" min="20" max={MAX_TRAVEL * 100} step="0.1" value={distanceInput} onChange={(e) => { setDistanceInput(e.target.value); const centimeters = Number(e.target.value); if (centimeters >= 20 && centimeters <= MAX_TRAVEL * 100) { setDistance(centimeters / 100); reset() } }} onBlur={() => setDistanceInput(String(Number((distance * 100).toFixed(10))))} /></label>
            <div className="atwood-constants atwood-pulley-constants"><span>Jᵣ: <strong>1,27·10⁻⁴ кг·м²</strong></span><span>R: <strong>33 мм</strong></span></div>
            <div className="atwood-control-buttons">
              <button className="atwood-primary" onClick={running ? () => setRunning(false) : start} disabled={acceleration <= 0}>{running ? 'Пауза' : measuredTime !== null ? 'Повторить' : 'Запустить'}</button>
              <button className="atwood-secondary" onClick={reset}>Сбросить</button>
            </div>
            <div className="atwood-progress" role="progressbar" aria-label="Пройденный путь" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><div style={{ transform: `scaleX(${progress})` }} /></div>
            <div className="atwood-time-row"><span>Время: <strong>{format(simTime, 4)} с</strong></span><span>Путь: <strong>{format(travel * 100, 1)} см</strong></span></div>
          </aside>
        </section>

        {isPro ? <>
        <div className="atwood-pro-heading"><span className="atwood-pro-badge">PRO</span><span>Анализ опыта и проверка знаний</span></div>
        <section className="atwood-results-grid">
          <div className="atwood-card">
            <div className="atwood-card-title"><span>3</span> Результаты</div>
            <div className="atwood-metrics">
              <div><small>Теоретическое ускорение</small><strong>{format(acceleration)} м/с²</strong></div>
              <div><small>Теоретическое время</small><strong>{theoreticalTime ? `${format(theoreticalTime, 4)} с` : '—'}</strong></div>
              <div><small>Измеренное время</small><strong>{measuredTime ? `${format(measuredTime, 4)} с` : '—'}</strong></div>
              <div><small>Погрешность</small><strong>{measuredTime && theoreticalTime ? `${format(Math.abs(measuredTime - theoreticalTime) / theoreticalTime * 100, 2)}%` : '—'}</strong></div>
            </div>
            <button className="atwood-secondary atwood-add-trial" onClick={addTrial} disabled={measuredTime === null}>Добавить результат в таблицу</button>
            <p className="atwood-hint">В каждом новом опыте моделируется небольшой разброс трения (до ±5%). Погрешность — отклонение времени от расчёта при среднем трении. Четыре знака на таймере — формат отображения, а не точность реального прибора.</p>
            {trials.length > 0 && <div className="atwood-table-scroll"><table className="atwood-table"><thead><tr><th>#</th><th>Кольца m₁</th><th>Кольца m₂</th><th>Δm, г</th><th>s, см</th><th>t опыта</th><th>t теор.</th><th>ε</th></tr></thead><tbody>{trials.map((trial, i) => <tr key={trial.id}><td>{i + 1}</td><td>{trial.rings1}</td><td>{trial.rings2}</td><td>{format((trial.m2 - trial.m1) * 1000, 1)}</td><td>{format(trial.distance * 100, 1)}</td><td>{format(trial.measured, 4)} с</td><td>{format(trial.theoretical, 4)} с</td><td>{trial.error === null ? '—' : `${format(trial.error, 2)}%`}</td></tr>)}</tbody></table></div>}
          </div>
          <div className="atwood-card atwood-theory">
            <div className="atwood-card-title"><span>i</span> Теория</div>
            <p>Машина Атвуда состоит из двух грузов, соединённых нитью, перекинутой через блок. При m₂ ≠ m₁ система движется равноускоренно.</p>
            <div className="atwood-equation">a = (|Δm|·g − Mтр/R) / (m₁ + m₂ + Jᵣ/R²)</div>
            <p className="atwood-hint">Момент инерции блока Jᵣ = 1,27·10⁻⁴ кг·м². Средний момент трения Mтр ≈ {format(FRICTION_TORQUE * 1e4, 3)}·10⁻⁴ Н·м подобран по замеру: 2 кольца, 56,5 см за 3,51 с. Трение немного меняется между опытами, но постоянно в течение одного спуска, поэтому движение равноускоренное. Если m₁ &gt; m₂, первым опускается m₁. Разброс задан для учебной симуляции и не измерен на реальной установке.</p>
            <button className="atwood-text-button" aria-expanded={showTheory} onClick={() => setShowTheory(!showTheory)}>{showTheory ? 'Скрыть вывод' : 'Показать вывод формулы'}</button>
            {showTheory && <div className="atwood-derivation"><p>Для тяжёлого груза сила тяжести направлена вниз, для лёгкого — вверх; натяжения нити и момент трения создают сопротивление движению.</p><p>После сложения уравнений для грузов и блока получаем |Δm|·g − Mтр/R = (m₁ + m₂ + Jᵣ/R²)a.</p><p>Из движения без начальной скорости: t = √(2s/a). Если движущая сила не превышает сопротивление, грузы остаются в покое.</p></div>}
          </div>
        </section>

        <section className="atwood-card atwood-questions">
          <div className="atwood-card-title"><span>4</span> Проверьте понимание</div>
          <div className="atwood-question-grid">{questions.map((item, index) => <fieldset key={item.question}><legend>{index + 1}. {item.question}</legend>{item.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((previous) => ({ ...previous, [index]: optionIndex }))} />{option}</label>)}{answers[index] !== undefined && <p className="atwood-answer-feedback">{answers[index] === item.correct ? 'Верно' : 'Попробуйте ещё раз — обратитесь к теории.'}</p>}</fieldset>)}</div>
          {Object.keys(answers).length === questions.length && <div className="atwood-score">Результат: {correctAnswers} из {questions.length}</div>}
        </section>
        </> : <section className="atwood-card atwood-pro-locked" aria-busy={isLoading}>
          <span className="atwood-pro-badge">PRO</span>
          <div><h2>{isLoading ? 'Проверяем доступ…' : 'Больше возможностей для исследования'}</h2><p>Результаты и таблица опытов, теория с выводом формулы и проверка понимания доступны с подпиской Pro.</p></div>
          {!isLoading && <Link className="atwood-secondary" to="/account">{user ? 'Моя подписка' : 'Войти в аккаунт'}</Link>}
        </section>}
      </div>
    </motion.main>
  )
}
