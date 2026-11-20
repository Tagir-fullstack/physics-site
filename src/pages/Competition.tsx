import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import AccessibilityPanel from '../components/AccessibilityPanel'
import LabIllustration from '../components/LabIllustration'
import ElectroExpectedField from '../components/ElectroExpectedField'
import { useAccessibility } from '../context/AccessibilityContext'
import { electroVariant } from '../lib/electrostatics'
import { LABS } from '../data/labs'
import '../styles/thesis.css'
import '../styles/header.css'
import '../styles/competition.css'
const chapters = ['Итоги двух месяцев', 'Что получает студент', 'Индивидуальный эксперимент', 'Пять лабораторий', 'Работа преподавателя', 'Удобство для студента', 'Результат и следующий шаг']
const notes = [
  'За два месяца работы в филиале я развивал Physez как практический инструмент преподавания физики. Главная задача — сделать эксперимент доступным между занятиями: студент может изменить условия, увидеть результат, провести измерения и объяснить физическую закономерность. Здесь я показываю реализованные возможности платформы.',
  'Я выстраиваю работу вокруг действий студента. Он получает свой вариант, запускает установку, снимает показания и оформляет результат. В базовом режиме измерения переносятся в тетрадь или на миллиметровую бумагу. Расширенные электронные инструменты помогают строить графики и обрабатывать данные. Физический смысл измерений остаётся центральной частью задания.',
  'Индивидуализация затрагивает сами условия опыта. Например, в электростатике различаются количество электродов, координаты, размеры и наклоны. Схема воспроизводится для конкретного профиля, а преподаватель может открыть её эталон. На демонстрации показаны условные профили с одним номером: у них получаются разные картины поля.',
  'На платформе доступны пять виртуальных установок: механика, вращательное движение, термодинамика и электричество. В каждой студент управляет физическими параметрами. Например, у Обербека исследует влияние положения грузов, а в опыте Клемана—Дезорма управляет кранами и читает шкалу манометра.',
  'Для преподавателя предусмотрены два направления проверки. Первое — индивидуальные условия лабораторных и ожидаемые результаты. Второе — контрольные срезы, собственные тесты и классы. Преподаватель может подготовить вопросы по шаблону XLSX, назначить работу группе и просматривать результаты. Доступ к данным ограничивается правами пользователя.',
  'Отдельная часть работы — удобство повседневного использования. Установка работает в браузере, интерфейс адаптируется под телефон и компьютер. Есть темы, увеличение текста и уменьшение движения. Зонд можно перемещать клавиатурой, манометр — увеличивать, опыт — повторять. Эти детали помогают сосредоточиться на самом эксперименте.',
  'Результат двух месяцев — развиваемая среда для самостоятельного эксперимента, индивидуальных заданий и преподавательской проверки. Следующий этап — педагогическая апробация с обратной связью и оценкой качества выполнения работ. Техническая готовность уже позволяет использовать платформу для подготовки к лабораторным и самостоятельной работы студентов.',
]
const transitions: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: 80 * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: -80 * direction }),
}
const goals = ['Силы и ускорение', 'Импульс и энергия', 'Вращение и момент инерции', 'Термодинамические процессы', 'Потенциал и напряжённость']
function Heading({ kicker, children }: { kicker: string; children: ReactNode }) {
  return <><span className="section-kicker">{kicker}</span><h1>{children}</h1></>
}
function Points({ items }: { items: Array<[string, string]> }) {
  return <div className="konkurs-cards">{items.map(([title, text], i) => <article className="counter-card" key={title}><span className="label">{String(i + 1).padStart(2, '0')}</span><h2>{title}</h2><p>{text}</p></article>)}</div>
}
function PersonalField() {
  const [profile, setProfile] = useState(0)
  const variant = useMemo(() => electroVariant(24, `competition-example-${profile}`), [profile])
  return <div className="konkurs-field"><div className="konkurs-demo-tabs" aria-label="Условный профиль">{['А', 'Б', 'В'].map((name, i) => <button key={name} type="button" aria-pressed={profile === i} onClick={() => setProfile(i)}>Студент {name}</button>)}<span>Один номер — разные условия</span></div><ElectroExpectedField key={profile} variant={variant}/><p className="konkurs-caption">Демонстрационные профили · без данных реальных студентов</p></div>
}
function SlideContent({ index, print = false }: { index: number; print?: boolean }) {
  switch (index) {
    case 0: return <><span className="section-kicker">Итоги двух месяцев работы</span><h1 className="title-main">Physez:<br/><span className="accent">физика в действии</span></h1><div className="title-meta"><div className="title-meta-block"><div className="label">Автор</div><div className="name">Тагир Аймурза</div></div><div className="title-meta-block"><div className="label">Satbayev University</div><div className="name">Филиал в Астане</div></div></div><div className="counter-grid konkurs-title-facts"><div className="counter-card"><div className="value">2 месяца</div><div className="sub">развития платформы</div></div><div className="counter-card"><div className="value">{LABS.length} лабораторий</div><div className="sub">от механики до электричества</div></div><div className="counter-card"><div className="value">В браузере</div><div className="sub">на компьютере и телефоне</div></div></div></>
    case 1: return <><Heading kicker="Самостоятельная работа">Студент исследует сам</Heading><Points items={[
      ['Проводит опыт', 'Меняет условия, запускает установку, повторяет эксперимент.'],
      ['Измеряет', 'Считывает шкалу, время и потенциал. Записывает свои данные.'],
      ['Объясняет', 'Строит зависимости, выполняет расчёты и делает вывод.'],
    ]}/><div className="konkurs-format"><span><strong>Basic</strong> — опыт и оформление на бумаге</span><span><strong>PRO</strong> — электронные таблицы, графики и обработка</span></div></>
    case 2: return <><Heading kicker="Индивидуальные условия">У каждого — своя картина поля</Heading><div className="konkurs-demo-layout"><div className="konkurs-key-facts"><div><strong>2–4</strong><span>электрода: разные позиции, размеры и наклоны</span></div><div><strong>12–15 В</strong><span>источник напряжения, шаг потенциала — 1 В</span></div><div><strong>Свой эталон</strong><span>условия сохраняются и доступны для проверки</span></div></div>{print ? <div className="konkurs-print-diagram"><LabIllustration id="electrostatics"/><p>Персональная геометрия электродов</p></div> : <PersonalField/>}</div></>
    case 3: return <><Heading kicker="Реализовано на платформе">Пять виртуальных лабораторий</Heading><div className="konkurs-labs">{LABS.map((lab, i) => <div className="konkurs-lab" key={lab.id}><span className="konkurs-lab-number">{String(i + 1).padStart(2, '0')}</span><div className="konkurs-lab-image"><LabIllustration id={lab.id}/></div><div><h2>{lab.title}</h2><p>{goals[i]}</p></div><Link to={lab.route} target="_blank" rel="noreferrer" aria-label={`Открыть: ${lab.title}`}>↗</Link></div>)}</div></>
    case 4: return <><Heading kicker="Организация и проверка">Преподаватель видит результат</Heading><Points items={[
      ['Личные условия', 'Индивидуальные варианты и поиск по студенту или группе.'],
      ['Эталоны', 'Ожидаемые таблицы измерений и картины поля.'],
      ['Тесты и классы', 'Коды подключения, задания по шаблону XLSX и мониторинг.'],
    ]}/><p className="konkurs-one-line">Класс <span>→</span> Задание <span>→</span> Результаты</p><p className="konkurs-caption">Инструменты проверки — по правам доступа.</p></>
    case 5: return <><Heading kicker="Удобство в каждом опыте">Меньше лишних действий</Heading><div className="konkurs-comfort">{[
      ['Компьютер и телефон', 'Адаптивное управление'],
      ['Светлая и тёмная темы', 'Настройки доступности'],
      ['Запуск и повторение', 'Свой темп работы'],
      ['Зонд и манометр', 'Точное управление и увеличение'],
      ['Ускорение до ×20', 'Клеман—Дезорм · PRO'],
      ['Черновики и экспорт', 'Электронная обработка · PRO'],
    ].map(([title, text]) => <article className="counter-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</div><p className="konkurs-one-line">Без установки программ. В одном браузере.</p></>
    default: return <><Heading kicker="Результат двух месяцев">Инструмент для ежедневного обучения</Heading><div className="konkurs-result"><span>Самостоятельность</span><span>Индивидуальный подход</span><span>Понятная проверка</span></div><p className="konkurs-final">Следующий шаг — апробация и обратная связь студентов и преподавателей.</p><div className="konkurs-links"><Link to="/labs" target="_blank" rel="noreferrer">Открыть лаборатории ↗</Link><Link to="/changelog" target="_blank" rel="noreferrer">История развития ↗</Link></div></>
  }
}
export default function Competition() {
  const [params, setParams] = useSearchParams()
  const parsed = Number(params.get('slide') || 1)
  const index = Number.isInteger(parsed) ? Math.max(0, Math.min(chapters.length - 1, parsed - 1)) : 0
  const [direction, setDirection] = useState(1)
  const [navOpen, setNavOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [a11yOpen, setA11yOpen] = useState(false)
  const [message, setMessage] = useState('')
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const a11y = useAccessibility()
  const theme = a11y.enabled && a11y.lightTheme ? 'light' : 'dark'
  const goTo = useCallback((next: number) => {
    const slide = Math.max(0, Math.min(chapters.length - 1, next))
    setDirection(slide >= index ? 1 : -1)
    setParams(previous => { const updated = new URLSearchParams(previous); updated.delete('mode'); updated.set('slide', String(slide + 1)); return updated }, { replace: true })
    setNavOpen(false)
  }, [index, setParams])
  const fullscreen = useCallback(async () => {
    try { setMessage(''); if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() }
    catch { setMessage('Полноэкранный режим недоступен в этом окне.') }
  }, [])
  const toggleTheme = useCallback(() => { a11y.setEnabled(true); a11y.setLightTheme(!(a11y.enabled && a11y.lightTheme)) }, [a11y])
  useEffect(() => {
    const oldTitle = document.title
    document.title = 'Конкурс · Итоги двух месяцев работы · Physez'
    document.body.classList.add('contest-presenting')
    return () => { document.title = oldTitle; document.body.classList.remove('contest-presenting'); if (navTimer.current) clearTimeout(navTimer.current) }
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (event.altKey || event.ctrlKey || event.metaKey || target?.closest('input,select,textarea,summary,[contenteditable=true]')) return
      if (event.key === 'Escape') { setNotesOpen(false); setNavOpen(false); setA11yOpen(false); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); return }
      const down = ['ArrowDown', 'PageDown', ' '].includes(event.key), up = ['ArrowUp', 'PageUp'].includes(event.key)
      if (event.key === ' ' && target?.closest('button,a')) return
      if (down || up) {
        const area = scroll.current
        if (area && (down ? area.scrollTop + area.clientHeight < area.scrollHeight - 2 : area.scrollTop > 2)) { event.preventDefault(); area.scrollBy({ top: area.clientHeight * (down ? .8 : -.8), behavior: a11y.reducedMotion ? 'auto' : 'smooth' }); return }
      }
      if (['ArrowRight', 'PageDown', 'ArrowDown', ' '].includes(event.key)) { event.preventDefault(); goTo(index + 1) }
      else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(event.key)) { event.preventDefault(); goTo(index - 1) }
      else if (event.key === 'Home') { event.preventDefault(); goTo(0) }
      else if (event.key === 'End') { event.preventDefault(); goTo(chapters.length - 1) }
      else if (event.code === 'KeyT' || event.key.toLowerCase() === 'е') { event.preventDefault(); toggleTheme() }
      else if (event.code === 'KeyF' || event.key === 'F5') { event.preventDefault(); void fullscreen() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, goTo, a11y.reducedMotion, toggleTheme, fullscreen])
  const openNav = () => { if (navTimer.current) clearTimeout(navTimer.current); setNavOpen(true) }
  const closeNav = () => { navTimer.current = setTimeout(() => setNavOpen(false), 180) }
  return <main className="thesis-root konkurs-root" data-theme={theme} lang="ru">
    <div className="thesis-bg"/><div className="thesis-grain"/>
    <div className="thesis-progress"><div className="thesis-progress-fill" style={{ width: `${(index + 1) / chapters.length * 100}%` }}/></div>
    <Link to="/" className="thesis-logo" aria-label="На главную"><img src="/favicon1.png" alt="" className="logo-icon"/><span className="logo-phys">Phys</span><span className="logo-ez">ez</span><span className="logo-tld">.com</span></Link>
    <button className="a11y-header-btn thesis-a11y-btn" onClick={() => { if (!a11y.enabled) a11y.setEnabled(true); setA11yOpen(value => !value) }} aria-label="Режим доступности" title="Доступность"><svg className="a11y-icon" viewBox="0 0 40 40" fill="currentColor"><circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="20" cy="10" r="2.8"/><path d="M20 13.5l-7 2c-0.6 0.2-0.9 0.7-0.8 1.3 0.2 0.6 0.7 0.9 1.3 0.8L18 16v5l-3.5 6c-0.3 0.5-0.1 1.2 0.4 1.5 0.5 0.3 1.2 0.5 1.5-0.4L20 22l3.6 6.1c0.3 0.5 1 0.7 1.5 0.4 0.5-0.3 0.7-1 0.4-1.5L22 21v-5l4.5 1.6c0.6 0.2 1.1-0.2 1.3-0.8 0.2-0.6-0.1-1.1-0.8-1.3l-7-2z"/></svg></button>
    <AccessibilityPanel isOpen={a11yOpen} onClose={() => setA11yOpen(false)}/>
    <div className="thesis-stage"><AnimatePresence custom={direction} initial={false} mode="wait"><motion.div key={index} custom={direction} variants={transitions} initial="enter" animate="center" exit="exit" transition={{ duration:a11y.reducedMotion ? 0 : .35, ease:'easeOut' }} className="konkurs-stage-frame" data-slide={index + 1}><div ref={scroll} className={`thesis-slide konkurs-slide thesis-scrollable${index === 0 ? ' title-slide' : ''}`}><SlideContent index={index}/></div></motion.div></AnimatePresence></div>
    <div className="thesis-controls" onMouseEnter={openNav} onMouseLeave={closeNav}>
      {navOpen && <div className="thesis-nav-anchor"><div className="thesis-nav-strip"><div className="thesis-nav-strip__scroll">{chapters.map((title, i) => <button key={title} type="button" className={`thesis-nav-num${index === i ? ' is-current' : ''}`} onClick={() => goTo(i)} aria-label={`Слайд ${i + 1}: ${title}`}>{i + 1}<span className="thesis-nav-tip" role="tooltip"><span className="thesis-nav-tip__title">{title}</span></span></button>)}</div></div></div>}
      <button onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Предыдущий слайд"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 6 9 12 15 18"/></svg></button>
      <button className="thesis-counter" aria-live="polite" aria-expanded={navOpen} aria-label="Выбрать слайд" onClick={() => setNavOpen(value => !value)}>{index + 1} / {chapters.length}</button>
      <button onClick={() => goTo(index + 1)} disabled={index === chapters.length - 1} aria-label="Следующий слайд"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg></button>
    </div>
    <div className="konkurs-tools"><button onClick={() => setNotesOpen(value => !value)} aria-pressed={notesOpen}>Заметки</button><button onClick={toggleTheme} aria-label="Переключить тему">{theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}</button><button onClick={() => void fullscreen()} aria-label="Полноэкранный режим">⛶</button><button onClick={() => window.print()}>PDF</button></div>
    {message && <p className="konkurs-message" role="status">{message}</p>}
    {notesOpen && <aside className="konkurs-notes" aria-label="Заметки докладчика"><button onClick={() => setNotesOpen(false)} aria-label="Закрыть заметки">×</button><strong>{chapters[index]}</strong><p>{notes[index]}</p></aside>}
    <div className="konkurs-print">{chapters.map((title, i) => <section className={`thesis-slide${i === 0 ? ' title-slide' : ''}`} aria-label={title} key={title}><SlideContent index={i} print/></section>)}</div>
  </main>
}
