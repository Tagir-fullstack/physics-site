import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isEmailAdmin } from '../../lib/apiClient'
import { createPendulums, energy, G, impactResult, measure, PHYSICS_STEP, stepPendulums } from '../../lib/ballCollisionPhysics'
import type { CollisionMode, PhysicsConfig, Reading } from '../../lib/ballCollisionPhysics'
import '../../styles/collision.css'

type Trial = Reading & { id: number; mode: CollisionMode; angle: number; mass1: number; mass2: number; length: number; restitution: number; damping: number; noisy: boolean }

const PIVOT_Y = 48
const PIVOT_X = 350
const LENGTH_PX = 190
const BALL_RADIUS = 13
const BALL_SEPARATION = BALL_RADIUS
const PIVOT_1_X = PIVOT_X + BALL_SEPARATION
const PIVOT_2_X = PIVOT_X - BALL_SEPARATION
const SCALE_RADIUS = 218
// The real installation reads the stuck pair at their contact point. Its pointer is
// offset from either suspension centre, so the rendered travel is calibrated to
// the observed 7–8° scale reading for a 10° release.
const INELASTIC_CONTACT_SCALE = 1.44
const SCALE_TICKS = Array.from({ length: 16 }, (_, index) => index * 2)
const SCALE_LABELS = SCALE_TICKS.filter(degrees => degrees % 10 === 0)

function polarPoint(pivotX: number, radians: number, radius = SCALE_RADIUS) {
  return {
    x: pivotX + radius * Math.sin(radians),
    y: PIVOT_Y + radius * Math.cos(radians),
  }
}

function scalePoint(side: -1 | 1, degrees: number, radius = SCALE_RADIUS) {
  return polarPoint(side === 1 ? PIVOT_1_X : PIVOT_2_X, side * degrees * Math.PI / 180, radius)
}

function scalePath(side: -1 | 1) {
  return Array.from({ length: 31 }, (_, index) => {
    const degrees = side === -1 ? 30 - index : index
    const point = scalePoint(side, degrees)
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }).join(' ')
}

function contactScaleIntersection(angle: number) {
  const side: -1 | 1 = angle < 0 ? -1 : 1
  const scaleCentreX = side === -1 ? PIVOT_2_X : PIVOT_1_X
  const directionX = Math.sin(angle)
  const directionY = Math.cos(angle)
  const offsetX = PIVOT_X - scaleCentreX
  const projection = offsetX * directionX
  const distance = -projection + Math.sqrt(SCALE_RADIUS ** 2 - offsetX ** 2 + projection ** 2)
  return {
    x: PIVOT_X + distance * directionX,
    y: PIVOT_Y + distance * directionY,
  }
}

const SCALE_LEFT_PATH = scalePath(-1)
const SCALE_RIGHT_PATH = scalePath(1)
const SCALE_LEFT_END = scalePoint(-1, 30)
const SCALE_RIGHT_END = scalePoint(1, 30)

function pointerPath(pivotX: number, angle: number) {
  const start = polarPoint(pivotX, angle, LENGTH_PX + BALL_RADIUS - 1)
  const tip = polarPoint(pivotX, angle, SCALE_RADIUS - 2)
  const base = polarPoint(pivotX, angle, SCALE_RADIUS - 9)
  const perpendicularX = Math.cos(angle) * 3.2
  const perpendicularY = -Math.sin(angle) * 3.2
  return `M${start.x} ${start.y} L${tip.x} ${tip.y} M${tip.x} ${tip.y} L${base.x + perpendicularX} ${base.y + perpendicularY} L${base.x - perpendicularX} ${base.y - perpendicularY} Z`
}

function format(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}
function formatSigned(value: number, digits = 3) {
  return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}` : '—'
}
function normalizeNumberInput(value: string) {
  return value.replace(/^0+(?=\d)/, '')
}
function capNumberInput(value: string, maximum: number) {
  const normalized = normalizeNumberInput(value)
  const numericValue = Number(normalized)
  return normalized !== '' && Number.isFinite(numericValue) && numericValue > maximum
    ? String(maximum)
    : normalized
}
function selectZero(input: HTMLInputElement) {
  if (Number(input.value) === 0) input.select()
}
function replaceZeroOnDigit(event: KeyboardEvent<HTMLInputElement>, replace: (value: string) => void) {
  if (!/^\d$/.test(event.key) || !/^0+$/.test(event.currentTarget.value)) return
  event.preventDefault()
  replace(event.key)
}
export default function BallCollision() {
  const { user, isPremium, isLoading } = useAuth()
  const isPro = isPremium || isEmailAdmin(user?.email)
  const [mode, setMode] = useState<CollisionMode>('elastic')
  const [mass1Input, setMass1Input] = useState('123.5')
  const [mass2Input, setMass2Input] = useState('123.5')
  const [lengthInput, setLengthInput] = useState('370')
  const [angle, setAngle] = useState(10)
  const [realistic, setRealistic] = useState(true)
  const [restitution, setRestitution] = useState(.94)
  const [damping, setDamping] = useState(.4)
  const [errors, setErrors] = useState(true)
  const [slowMotion, setSlowMotion] = useState(false)
  const [running, setRunning] = useState(false)
  const [reading, setReading] = useState<Reading | null>(null)
  const [saved, setSaved] = useState(false)
  const [trials, setTrials] = useState<Trial[]>([])
  const [showTheory, setShowTheory] = useState(false)
  const mass1 = Math.max(.001, Math.min(.5, Number(mass1Input) / 1000 || .1235))
  const mass2 = Math.max(.001, Math.min(.5, Number(mass2Input) / 1000 || .1235))
  const length = Math.max(.1, Math.min(1, Number(lengthInput) / 1000 || .37))
  const isValid = Number(mass1Input) >= 1 && Number(mass1Input) <= 500
    && Number(mass2Input) >= 1 && Number(mass2Input) <= 500
    && Number(lengthInput) >= 100 && Number(lengthInput) <= 1000
    && Number.isFinite(angle) && angle >= 1 && angle <= 30
  const config = useMemo<PhysicsConfig>(() => ({
    mass1, mass2, length, angle: Math.max(1, Math.min(30, angle || 10)),
    restitution: mode === 'inelastic' ? 0 : realistic ? restitution : 1,
    damping: realistic ? damping : 0,
  }), [mass1, mass2, length, angle, mode, realistic, restitution, damping])
  const [motionState, setMotionState] = useState(() => createPendulums(config))
  const simulationRef = useRef(motionState)
  const runConfigRef = useRef(config)
  const readingRef = useRef<Reading | null>(null)
  const accumulatorRef = useRef(0)
  const activeState = motionState.time > 0 ? motionState : createPendulums(config)
  const { angle1, angle2 } = activeState
  const renderedAngle1 = mode === 'inelastic' && activeState.stuck ? angle1 * INELASTIC_CONTACT_SCALE : angle1
  const renderedAngle2 = mode === 'inelastic' && activeState.stuck ? angle2 * INELASTIC_CONTACT_SCALE : angle2
  const simTime = activeState.time
  const collision = mode === 'elastic' && !activeState.settled && activeState.collisions === 1 && simTime - activeState.lastImpactTime < .16
  const initialSpeed = -Math.sqrt(2 * G * length * (1 - Math.cos(config.angle * Math.PI / 180)))
  const calculation = activeState.firstImpact ?? impactResult(initialSpeed, 0, config)
  const currentEnergy = energy(activeState, config)
  const energyFraction = activeState.initialEnergy > 0 ? Math.min(1, currentEnergy.total / activeState.initialEnergy) : 0
  const ball1X = PIVOT_1_X + LENGTH_PX * Math.sin(renderedAngle1)
  const ball1Y = PIVOT_Y + LENGTH_PX * Math.cos(renderedAngle1)
  const ball2X = PIVOT_2_X + LENGTH_PX * Math.sin(renderedAngle2)
  const ball2Y = PIVOT_Y + LENGTH_PX * Math.cos(renderedAngle2)
  const displayedPeak = activeState.peak2
  const betaMarker = mode === 'elastic' && displayedPeak !== null ? scalePoint(-1, Math.min(displayedPeak, 30)) : null
  const contactX = (ball1X + ball2X) / 2
  const contactY = (ball1Y + ball2Y) / 2
  const contactGuideEnd = contactScaleIntersection(renderedAngle1)

  useEffect(() => {
    if (!running) return
    let frame = 0
    let lastTime: number | null = null
    const tick = (now: number) => {
      if (lastTime === null) lastTime = now
      // A hidden browser tab pauses wall-time catch-up; simulation time stays continuous.
      accumulatorRef.current += Math.min((now - lastTime) / 1000, .05) * (slowMotion ? .25 : 1)
      lastTime = now
      let state = simulationRef.current
      while (accumulatorRef.current >= PHYSICS_STEP && !state.settled) {
        state = stepPendulums(state, runConfigRef.current)
        accumulatorRef.current -= PHYSICS_STEP
        if (state.peak2 !== null && readingRef.current === null) {
          const measured = measure(state, runConfigRef.current, realistic && errors)!
          readingRef.current = measured
          setReading(measured)
          // Preserve the measured first rebound, then damp later free-version
          // oscillations more strongly so the demonstration does not run too long.
          if (!isPro && mode === 'elastic' && runConfigRef.current.damping > 0) {
            runConfigRef.current = { ...runConfigRef.current, damping: 1.2 }
          }
        }
      }
      simulationRef.current = state
      setMotionState(state)
      if (state.settled) {
        setRunning(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, slowMotion, realistic, errors, mode, isPro])

  const reset = () => {
    setRunning(false)
    const initial = createPendulums(config)
    simulationRef.current = initial
    setMotionState(initial)
    accumulatorRef.current = 0
    readingRef.current = null
    setReading(null)
    setSaved(false)
  }
  const changeMode = (nextMode: CollisionMode) => {
    setMode(nextMode)
    setMass1Input('123.5')
    setMass2Input(nextMode === 'inelastic' ? '20' : '123.5')
    reset()
  }
  const start = (restart = false) => {
    if (!isValid) return
    if (restart || simulationRef.current.time === 0 || simulationRef.current.settled) {
      // Small release-angle variation models repeatability; sensor errors never push the balls.
      const runConfig = { ...config, angle: config.angle + (realistic && errors ? (Math.random() * 2 - 1) * .15 : 0) }
      runConfigRef.current = runConfig
      const initial = createPendulums(runConfig)
      simulationRef.current = initial
      setMotionState(initial)
      accumulatorRef.current = 0
      readingRef.current = null
      setReading(null)
      setSaved(false)
    }
    setRunning(true)
  }
  const addTrial = () => {
    if (!isPro || !reading || saved) return
    setTrials(previous => [...previous, { ...reading, id: Date.now(), mode, angle, mass1, mass2, length,
      restitution: config.restitution, damping: config.damping, noisy: realistic && errors }])
    setSaved(true)
  }
  const series = trials.filter(trial => trial.mode === mode && trial.angle === angle
    && trial.mass1 === mass1 && trial.mass2 === mass2 && trial.length === length
    && trial.restitution === config.restitution && trial.damping === config.damping && trial.noisy === (realistic && errors))
  const meanBeta = series.length ? series.reduce((sum, trial) => sum + trial.beta, 0) / series.length : 0
  const spreadBeta = series.length > 1 ? Math.sqrt(series.reduce((sum, trial) => sum + (trial.beta - meanBeta) ** 2, 0) / (series.length - 1)) : 0

  return (
    <motion.main className="collision-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="collision-container">
        <header className="collision-header">
          <div className="collision-eyebrow">ИНТЕРАКТИВНАЯ ЛАБОРАТОРИЯ №3</div>
          <h1>Упругое и неупругое столкновения шаров</h1>
        </header>

        <section className="collision-grid">
          <div className="collision-card collision-simulation-card">
            <div className="collision-scene-heading"><div className="collision-card-title"><span>1</span> Схема установки</div></div>
            <svg className="collision-scene" viewBox="100 0 500 410" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Схема установки для исследования столкновения подвешенных шаров">
              <g transform="translate(350 30) scale(1.18) translate(-350 -30)">
              <g fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={`M${PIVOT_2_X} 30 V48 M${PIVOT_1_X} 30 V48 M322 16 H378 V30 H322 Z`} strokeWidth="3" />
                <circle cx={PIVOT_1_X} cy={PIVOT_Y} r="4" fill="var(--collision-scene-bg)" strokeWidth="2" />
                <circle cx={PIVOT_2_X} cy={PIVOT_Y} r="4" fill="var(--collision-scene-bg)" strokeWidth="2" />
                <path d={`M${PIVOT_1_X} ${PIVOT_Y} L${ball1X} ${ball1Y} M${PIVOT_2_X} ${PIVOT_Y} L${ball2X} ${ball2Y}`} strokeWidth="2" />
                <path d={SCALE_LEFT_PATH} opacity=".7" />
                <path d={SCALE_RIGHT_PATH} opacity=".7" />
                <path d={`M${PIVOT_2_X} ${PIVOT_Y + SCALE_RADIUS} V302 H${PIVOT_1_X} V${PIVOT_Y + SCALE_RADIUS}`} opacity=".35" />
                <path d={`M${SCALE_LEFT_END.x} ${SCALE_LEFT_END.y} V302 M${SCALE_RIGHT_END.x} ${SCALE_RIGHT_END.y} V302`} opacity=".25" />
                <path d="M248 330 H452 M232 345 H468" strokeWidth="2" opacity=".5" />
                <path d={`M${PIVOT_1_X} ${PIVOT_Y} L${PIVOT_1_X + LENGTH_PX * Math.sin(config.angle * Math.PI / 180)} ${PIVOT_Y + LENGTH_PX * Math.cos(config.angle * Math.PI / 180)}`} strokeDasharray="4 5" opacity=".35" />
              </g>
              <g className="collision-angle-scale" fill="currentColor" stroke="currentColor">
                {([-1, 1] as const).flatMap(side => SCALE_TICKS.map(degrees => {
                  const start = scalePoint(side, degrees)
                  const tickLength = degrees % 10 === 0 ? 12 : degrees % 4 === 0 ? 8 : 6
                  const end = scalePoint(side, degrees, SCALE_RADIUS + tickLength)
                  return <line className={degrees === 0 ? 'collision-center-mark' : undefined} key={`tick-${side}-${degrees}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
                }))}
                {([-1, 1] as const).flatMap(side => SCALE_LABELS.map(degrees => {
                  const label = degrees === 0 ? { x: side === -1 ? PIVOT_2_X - 3 : PIVOT_1_X + 3, y: 319 } : scalePoint(side, degrees, SCALE_RADIUS + 23)
                  return <text key={`label-${side}-${degrees}`} x={label.x} y={label.y}>{degrees}°</text>
                }))}
              </g>
              {isPro && betaMarker && <circle className="collision-beta-marker" cx={betaMarker.x} cy={betaMarker.y} r="4"><title>Максимальное отклонение: {format(displayedPeak ?? 0, 1)}°</title></circle>}
              <g className="collision-scene-labels" fill="currentColor">
                <text x={ball1X + 19} y={ball1Y + 5}>m₁</text>
                <text x={ball2X - 29} y={ball2Y + 5}>m₂</text>
              </g>
              <g className={collision ? 'collision-impact collision-impact--visible' : 'collision-impact'}>
                <circle cx={(ball1X + ball2X) / 2} cy={(ball1Y + ball2Y) / 2} r="20" fill="none" stroke="#f5a623" strokeWidth="2" strokeDasharray="4 4" />
                <path d={`M${(ball1X + ball2X) / 2 - 26} ${(ball1Y + ball2Y) / 2} H${(ball1X + ball2X) / 2 + 26}`} stroke="#f5a623" />
              </g>
              {activeState.stuck && <line x1={ball1X} y1={ball1Y} x2={ball2X} y2={ball2Y} stroke="#ff7166" strokeWidth="3" opacity=".8" />}
              <g className="collision-angle-pointers" fill="var(--collision-scene-fg)" stroke="var(--collision-scene-fg)" strokeWidth="1.2">
                {mode === 'elastic' ? <>
                  <path d={pointerPath(PIVOT_1_X, angle1)} />
                  <path d={pointerPath(PIVOT_2_X, angle2)} />
                </> : activeState.stuck && <line x1={contactX} y1={contactY} x2={contactGuideEnd.x} y2={contactGuideEnd.y} />}
              </g>
              <circle cx={ball1X} cy={ball1Y} r={BALL_RADIUS} fill="#c84d4a" stroke="#ff7166" strokeWidth="2" />
              <circle cx={ball2X} cy={ball2Y} r={BALL_RADIUS} fill={mode === 'inelastic' ? '#4b4a47' : '#8796a8'} stroke={mode === 'inelastic' ? '#77736c' : '#c3ced8'} strokeWidth="2"><title>{mode === 'inelastic' ? 'Матовый шар с неупругим покрытием' : 'Упругий металлический шар'}</title></circle>
              <circle cx={ball1X - 4} cy={ball1Y - 4} r="2.5" fill="#fff" opacity=".35" />
              {mode === 'elastic' && <circle cx={ball2X - 4} cy={ball2Y - 4} r="2.5" fill="#fff" opacity=".35" />}
              </g>
            </svg>
            {isPro && <>
            <div className="collision-live">
              <div><small>Скорость m₁</small><strong>{formatSigned(activeState.omega1 * length)} м/с</strong></div>
              <div><small>Скорость m₂</small><strong>{formatSigned(activeState.omega2 * length)} м/с</strong></div>
              <div><small>Столкновения</small><strong>{activeState.collisions}</strong></div>
            </div>
            <div className="collision-energy-label"><span>Механическая энергия</span><strong>{format(currentEnergy.total * 1000, 2)} мДж</strong></div>
            <div className="collision-energy-bar" role="meter" aria-label="Оставшаяся механическая энергия, %" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(energyFraction * 100)}>
              <span className="collision-energy-kinetic" style={{ width: `${activeState.initialEnergy ? currentEnergy.kinetic / activeState.initialEnergy * 100 : 0}%` }} />
              <span className="collision-energy-potential" style={{ width: `${activeState.initialEnergy ? currentEnergy.potential / activeState.initialEnergy * 100 : 0}%` }} />
            </div>
            <div className="collision-energy-legend"><span>● Кинетическая</span><span>● Потенциальная</span><span>Потери: {format((1 - energyFraction) * 100, 1)}%</span></div>
            </>}
          </div>

          <aside className="collision-card collision-controls">
            <div className="collision-card-title"><span>2</span> Параметры опыта</div>
            <div className="collision-mode-switch" role="group" aria-label="Режим столкновения">
              <button className={mode === 'elastic' ? 'collision-mode-active' : ''} type="button" onClick={() => changeMode('elastic')}>Упругий</button>
              <button className={mode === 'inelastic' ? 'collision-mode-active' : ''} type="button" onClick={() => changeMode('inelastic')}>Неупругий</button>
            </div>
            <div className="collision-input-grid">
              <label>Масса m₁, г<input type="number" min="1" max="500" step="0.1" value={mass1Input} onFocus={(e) => selectZero(e.currentTarget)} onKeyDown={(e) => replaceZeroOnDigit(e, (value) => { setMass1Input(value); reset() })} onChange={(e) => { setMass1Input(capNumberInput(e.target.value, 500)); reset() }} /></label>
              <label>Масса m₂, г<input type="number" min="1" max="500" step="0.1" value={mass2Input} onFocus={(e) => selectZero(e.currentTarget)} onKeyDown={(e) => replaceZeroOnDigit(e, (value) => { setMass2Input(value); reset() })} onChange={(e) => { setMass2Input(capNumberInput(e.target.value, 500)); reset() }} /></label>
            </div>
            <label>Длина нити l, мм<input type="number" min="100" max="1000" step="1" value={lengthInput} onFocus={(e) => selectZero(e.currentTarget)} onKeyDown={(e) => replaceZeroOnDigit(e, (value) => { setLengthInput(value); reset() })} onChange={(e) => { setLengthInput(capNumberInput(e.target.value, 1000)); reset() }} onBlur={(e) => { if (Number(e.target.value) < 100) { setLengthInput('100'); reset() } }} /></label>
            <label>Начальный угол α, °<input type="number" min="1" max="30" step="1" value={angle} onFocus={(e) => selectZero(e.currentTarget)} onKeyDown={(e) => replaceZeroOnDigit(e, (value) => { setAngle(Number(value)); reset() })} onChange={(e) => { setAngle(Math.min(30, Number(normalizeNumberInput(e.target.value)))); reset() }} /></label>
            <div className="collision-angle-presets"><span>Быстрый выбор:</span><button type="button" className={angle === 10 ? 'collision-preset-active' : ''} onClick={() => { setAngle(10); reset() }}>10°</button><button type="button" className={angle === 15 ? 'collision-preset-active' : ''} onClick={() => { setAngle(15); reset() }}>15°</button></div>
            <label className="collision-checkbox"><input type="checkbox" checked={slowMotion} onChange={e => setSlowMotion(e.target.checked)} />Замедление ×0,25</label>
            <div className="collision-control-buttons">
              <button className="collision-primary" type="button" onClick={running ? () => setRunning(false) : () => start()} disabled={!isValid}>{running ? 'Пауза' : activeState.settled ? 'Повторить' : simTime > 0 ? 'Продолжить' : 'Запустить'}</button>
              <button className="collision-secondary" type="button" onClick={reset}>Сбросить</button>
            </div>
            <div className="collision-time-row"><span>Время: <strong>{format(simTime, 3)} с</strong></span><span>Режим: <strong>{mode === 'elastic' ? 'упругий' : 'неупругий'}</strong></span></div>
            <div className="collision-scene-caption"><span>m₁ — металлический ударяющий шар</span><span>{mode === 'inelastic' ? 'm₂ — пластилиновый шарик, 20 г' : 'm₂ — второй металлический шар'}</span><span>Цена деления — 2°</span></div>
          </aside>
        </section>

        {isPro ? <>
        <div className="collision-pro-heading"><span className="collision-pro-badge">PRO</span><span>Анализ опыта и физическая модель</span></div>
        <section className="collision-results-grid">
          <div className="collision-card">
            <div className="collision-card-title"><span>3</span> Первый удар · расчёт модели</div>
            <div className="collision-constants"><span>h: <strong>{format(length * (1 - Math.cos(config.angle * Math.PI / 180)) * 1000, 1)} мм</strong></span><span>Период ≈ <strong>{format(2 * Math.PI * Math.sqrt(length / G), 2)} с</strong></span></div>
            <details className="collision-settings">
              <summary>Условия опыта · {realistic ? 'реальные' : 'идеальные'}</summary>
              <label className="collision-checkbox"><input type="checkbox" checked={realistic} onChange={e => { setRealistic(e.target.checked); reset() }} />Учитывать потери</label>
              {realistic && <>
                {mode === 'elastic' && <label>Восстановление e = {format(restitution, 2)}<input type="range" min=".7" max="1" step=".01" value={restitution} onChange={e => { setRestitution(Number(e.target.value)); reset() }} /></label>}
                <label>Затухание γ = {format(damping, 2)} с⁻¹<input type="range" min=".02" max="1.2" step=".01" value={damping} onChange={e => { setDamping(Number(e.target.value)); reset() }} /></label>
                <label className="collision-checkbox"><input type="checkbox" checked={errors} onChange={e => { setErrors(e.target.checked); reset() }} />Погрешности измерений и отпускания</label>
              </>}
              <p className="collision-hint">При e = 1 удар идеально упругий; при e = 0 шары сцепляются. γ задаёт сопротивление движению. Это настраиваемая учебная модель, не калибровка конкретной установки.</p>
            </details>
            <p className="collision-hint">{activeState.firstImpact ? 'Значения непосредственно до и после первого контакта.' : 'Предварительный расчёт без сопротивления до удара. После запуска будут показаны фактические значения модели.'}</p>
            <div className="collision-metrics">
              <div><small>Скорость до удара |v₁|</small><strong>{format(Math.abs(calculation.v1))} м/с</strong></div>
              <div><small>Скорость m₁ после удара</small><strong>{formatSigned(calculation.u1)} м/с</strong></div>
              <div><small>Скорость m₂ после удара</small><strong>{formatSigned(calculation.u2)} м/с</strong></div>
              <div><small>{mode === 'inelastic' ? 'Максимум точки контакта' : 'Первый максимум β₂'}</small><strong>{displayedPeak === null ? '—' : format(displayedPeak, 2) + '°'}</strong></div>
              <div><small>Импульс до удара</small><strong>{format(calculation.momentumBefore, 4)} кг·м/с</strong></div>
              <div><small>Импульс после удара</small><strong>{format(calculation.momentumAfter, 4)} кг·м/с</strong></div>
              <div><small>Потеря энергии при ударе</small><strong>{format(calculation.energyLoss * 1000, 2)} мДж</strong></div>
              <div><small>K = Eпосле / Eдо</small><strong>{format(calculation.k, 3)}</strong></div>
            </div>
            <div className="collision-reading">
              <h3>Показания виртуальных приборов</h3>
              <p className="collision-hint">{realistic && errors
                ? 'Транспортир: цена деления 2° и ошибка считывания ±1°. Датчик скорости: шаг 0,001 м/с, ошибка ±0,005 м/с. Таймер: шаг 0,001 с, ошибка ±0,001 с. Отпускание: разброс ±0,15°. Округление добавляет до половины шага.'
                : 'Погрешности выключены: показания совпадают с моделью.'}</p>
              {reading ? <>
                <div className="collision-metrics">
                  <div><small>Измеренный β₂</small><strong>{format(reading.beta, 1)}°</strong></div>
                  <div><small>Время до первого удара</small><strong>{format(reading.time)} с</strong></div>
                  <div><small>Измеренный K</small><strong>{format(reading.k)}</strong></div>
                  <div><small>Невязка импульса Δp</small><strong>{formatSigned(reading.momentumError * 1000, 2)} г·м/с</strong></div>
                </div>
                <p className="collision-hint">Показания фиксируются один раз за опыт. Погрешности могут дать K &gt; 1 или отрицательную измеренную потерю энергии — они не добавляют энергию движущимся шарам.</p>
              </> : <p className="collision-hint">Ожидаем первый максимум отклонения…</p>}
            </div>
            <button className="collision-secondary collision-add-trial" type="button" onClick={addTrial} disabled={!reading || saved}>{saved ? 'Результат записан' : 'Добавить результат в таблицу'}</button>
            <p className="collision-hint">Скорости со знаком: «−» влево, «+» вправо. Таблица содержит измерения первого удара; последующие удары не перезаписывают опыт.</p>
            {trials.length > 0 && <>
              <div className="collision-table-scroll"><table className="collision-table">
                <caption>Журнал опытов · измеренные значения</caption>
                <thead><tr><th>#</th><th>Удар</th><th>m₁ / m₂, г</th><th>l, мм</th><th>α, °</th><th>e / γ, с⁻¹</th><th>Погрешности</th><th>β₂, °</th><th>t, с</th><th>|v₁|, м/с</th><th>u₁, м/с</th><th>u₂, м/с</th><th>K</th><th>ΔE, мДж</th></tr></thead>
                <tbody>{trials.map((trial, index) => <tr key={trial.id}>
                  <td>{index + 1}</td><td>{trial.mode === 'elastic' ? 'упр.' : 'неупр.'}</td><td>{format(trial.mass1 * 1000, 1)} / {format(trial.mass2 * 1000, 1)}</td><td>{format(trial.length * 1000, 0)}</td><td>{format(trial.angle, 1)}</td><td>{format(trial.restitution, 2)} / {format(trial.damping, 2)}</td><td>{trial.noisy ? 'вкл.' : 'выкл.'}</td>
                  <td>{format(trial.beta, 1)}</td><td>{format(trial.time)}</td><td>{format(Math.abs(trial.v1))}</td><td>{formatSigned(trial.u1)}</td><td>{formatSigned(trial.u2)}</td><td>{format(trial.k)}</td><td>{format(trial.energyLoss * 1000, 2)}</td>
                </tr>)}</tbody>
              </table></div>
              <p className="collision-hint">{series.length >= 2
                ? `Серия при текущих настройках: n = ${series.length}; среднее β₂ = ${format(meanBeta, 2)}°; стандартное отклонение s = ${format(spreadBeta, 2)}°. Разброс серии не включает систематическую ошибку прибора.`
                : 'Повторите опыт с теми же параметрами и запишите результат, чтобы оценить среднее и разброс.'}</p>
            </>}
          </div>
          <div className="collision-card collision-theory">
            <div className="collision-card-title"><span>i</span> Физика опыта</div>
            <p>Шар отпускается без начальной скорости. Гравитация разгоняет его к нижней точке; инерция сохраняет движение после её прохождения. Чем длиннее нить, тем медленнее колебания.</p>
            <div className="collision-equation">I = ml²; θ″ = −(g/l) sin θ − γθ′</div>
            <p>Учитывается полный синус угла. Момент инерции относительно подвеса I₁ = {format(mass1 * length ** 2, 4)} и I₂ = {format(mass2 * length ** 2, 4)} кг·м². Собственное вращение шаров не моделируется.</p>
            <div className="collision-equation">m₁v₁ + m₂v₂ = m₁u₁ + m₂u₂<br />u₁ − u₂ = −e(v₁ − v₂)</div>
            <p>{mode === 'inelastic' ? 'При абсолютно неупругом ударе металлический шар сцепляется с пластилиновым шариком массой 20 г; e = 0, и после контакта они движутся вместе.'
              : `Коэффициент восстановления e = ${format(config.restitution, 2)} задаёт отскок. Только при e = 1 кинетическая энергия удара сохраняется полностью.`} Повторные контакты подчиняются тем же законам.</p>
            <p>При движении часть энергии рассеивается из-за сопротивления, при ударе — из-за деформации и нагрева. Полоса под схемой показывает обмен кинетической и потенциальной энергии и накопленные потери.</p>
            <button className="collision-text-button" type="button" aria-expanded={showTheory} onClick={() => setShowTheory(!showTheory)}>{showTheory ? 'Скрыть методику' : 'Показать методику'}</button>
            {showTheory && <div className="collision-derivation">
              <p>Задайте массы и угол 10° или 15°, запустите опыт. После первого максимума запишите измерение. Повторите не менее пяти раз с одинаковыми настройками; сравните среднее значение и разброс.</p>
              <p>Без сопротивления v₁ = √(2gl(1 − cos α)), а скорость после удара можно восстановить по максимуму: |u| = √(2gl(1 − cos β)). При затухании второй способ занижает скорость в момент удара.</p>
              <p>Сравните реальные условия с идеальными, выключив потери. В идеальном упругом режиме колебания продолжаются до нажатия «Пауза» или «Сбросить».</p>
              <p>Модель использует плоские маятники и мгновенный центральный удар. Общая точка подвеса на рисунке — схематическое изображение; деформация, вращение и движение вне плоскости не рассчитываются.</p>
            </div>}
          </div>
        </section>
        <section className="collision-card collision-conclusion">
          <div className="collision-card-title"><span>4</span> Наблюдение</div>
          <p>{!activeState.firstImpact ? 'Запустите опыт, чтобы сравнить импульс и энергию до и после удара.'
            : `При первом ударе сохранилось ${format(calculation.k * 100, 1)}% кинетической энергии. Импульс в модели сохраняется в момент контакта; сопротивление меняет движение между ударами.`}</p>
          {reading && <p>Измеренная невязка импульса: {formatSigned(reading.momentumError * 1000, 2)} г·м/с. {realistic && errors ? 'Сравните её в серии повторных опытов: ненулевая невязка показаний не означает нарушение закона сохранения.' : 'Погрешности измерений отключены.'}</p>}
        </section>
        </> : <section className="collision-card collision-pro-locked" aria-busy={isLoading}>
          <span className="collision-pro-badge">PRO</span>
          <div><h2>{isLoading ? 'Проверяем доступ…' : 'Больше возможностей для исследования'}</h2><p>Условия опыта, расчёты, показания приборов, таблица результатов и физическая модель доступны с подпиской Pro.</p></div>
          {!isLoading && <Link className="collision-secondary" to="/account">{user ? 'Моя подписка' : 'Войти в аккаунт'}</Link>}
        </section>}
      </div>
    </motion.main>
  )
}
