import { useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RandomAtomModel from '../components/RandomAtomModel'
import StaticDeBroglie from '../components/StaticDeBroglie'
import StaticRutherford from '../components/StaticRutherford'
import StaticSchrodinger from '../components/StaticSchrodinger'
import StaticNucleus from '../components/StaticNucleus'
import LabIllustration from '../components/LabIllustration'
import { useShowcase } from '../components/useShowcase'
import { sections } from '../data/topics'
import { LABS } from '../data/labs'
import { useAuth } from '../context/AuthContext'
import '../styles/home.css'

const topicAccents: Record<string, [string, string]> = {
  '/nuclear/rutherford': ['#ff8c82', '#b83930'],
  '/nuclear/alpha': ['#f5a623', '#925b00'],
  '/nuclear/beta': ['#79afea', '#2169b5'],
  '/nuclear/gamma': ['#bb86e8', '#8042b0'],
  '/nuclear/halflife': ['#7cbd70', '#38752d'],
  '/nuclear/interactions': ['#e87998', '#aa315a'],
  '/nuclear/droplet': ['#65c6ce', '#237780'],
  '/nuclear/decay': ['#ed9262', '#a4471c'],
  '/nuclear/chain': ['#f5a623', '#925b00'],
}

function SlideControls({ labels, accents, active, select, duration, playing, cycle, progressLabel }: {
  labels: string[]; active: number; select: (n: number) => void
  accents?: [string, string][]
  duration: number; playing: boolean; cycle: number; progressLabel: string
}) {
  const accent = accents?.[active]
  const style = accent ? {
    '--home-slide-color': accent[0], '--home-slide-light-color': accent[1],
  } as CSSProperties : undefined
  return <div className="home-slide-controls" style={style} role="group" aria-label={progressLabel}>
    <div className="home-slide-navigation"><div className="home-slide-dots">{labels.map((label, i) => <button type="button" key={label} aria-label={label} aria-current={active === i ? 'true' : undefined} style={accents?.[i] ? { '--home-dot-color': accents[i][0], '--home-dot-light-color': accents[i][1] } as CSSProperties : undefined} onClick={event => { select(i); if (event.detail > 0) event.currentTarget.blur() }}><span aria-hidden="true">{active === i && <i key={active + ':' + cycle} className="home-slide-fill" style={{ animationDuration: duration + 'ms', animationPlayState: playing ? 'running' : 'paused' }} />}</span></button>)}</div>
    </div>
  </div>
}

function CourseTopics() {
  const { t } = useTranslation()
  const topics = sections[0].topics
  const slides = useShowcase(topics.length)
  const titleFor = (topic: typeof topics[number]) => t('topics.' + topic.path.split('/').pop() + '.title', { defaultValue: topic.title })
  return <section className="home-section home-course" id="course-topics" aria-labelledby="home-topics-title">
    <div className="home-course-backdrop"><StaticDeBroglie /></div>
    <div className="home-topic-layout" {...slides.visibility}>
      <div className="home-topic-deck">
        <div className="home-topic-image home-crossfade" tabIndex={0} {...slides.interaction}>
          {topics.map((topic, i) => <img key={topic.path} data-active={i === slides.active} aria-hidden={i !== slides.active} src={topic.image} alt={titleFor(topic)} loading="lazy" decoding="async" />)}
        </div>
        <SlideControls accents={topics.map(item => topicAccents[item.path])} progressLabel={t('showcase.topicCounter', { current: slides.active + 1, total: topics.length })} labels={topics.map(titleFor)} {...slides} />
      </div>
      <div className="home-crossfade home-topic-copies">
        {topics.map((topic, i) => <div className="home-topic-copy" key={topic.path} data-active={i === slides.active} aria-hidden={i !== slides.active} inert={i !== slides.active}>
          <h2 className="home-topic-label" id={i === slides.active ? 'home-topics-title' : undefined}>{t('home.topicsTitle')} {t('home.topicsHighlight')}</h2>
          <h3>{titleFor(topic)}</h3>
          <p>{t('topics.' + topic.path.split('/').pop() + '.description', { defaultValue: topic.description })}</p>
          <Link className="home-cta" to={topic.path}>{t('common.watch')}</Link>
        </div>)}
      </div>
    </div>
  </section>
}

function LabShowcase() {
  const { t } = useTranslation()
  const slides = useShowcase(LABS.length)
  return <section className="home-section home-feature home-feature-blue home-labs" aria-labelledby="home-labs-title">
    <div className="home-labs-backdrop"><StaticRutherford /></div>
    <div className="home-feature-copy">
      <span className="home-eyebrow">{t('showcase.experiment')}</span>
      <h2 id="home-labs-title">{t('showcase.labsTitle')}</h2>
      <p className="home-feature-description">{t('showcase.labsDescription')}</p>
      <Link className="home-cta" to="/labs">{t('showcase.chooseLab')}</Link>
    </div>
    <div className="home-lab-preview" {...slides.visibility}>
      <div className="home-lab-art home-crossfade" tabIndex={0} {...slides.interaction}>
        {LABS.map((lab, i) => <div key={lab.id} data-active={i === slides.active} aria-hidden={i !== slides.active}><LabIllustration id={lab.id} ballColor="blue" /></div>)}
      </div>
      <div className="home-crossfade">
        {LABS.map((lab, i) => <div key={lab.id} className="home-preview-caption" data-active={i === slides.active} aria-hidden={i !== slides.active} inert={i !== slides.active}><Link to={lab.route}>{t('showcase.labNames.' + lab.id, { defaultValue: lab.title })}</Link><p>{t('showcase.labTopics.' + lab.id, { defaultValue: lab.topic })}</p></div>)}
      </div>
      <SlideControls progressLabel={t('showcase.labCounter', { current: slides.active + 1, total: LABS.length })} labels={LABS.map(item => t('showcase.labNames.' + item.id, { defaultValue: item.title }))} {...slides} />
    </div>
  </section>
}

function ResultsPreview() {
  const { t } = useTranslation()
  return <div className="home-results-preview">
    <div className="home-preview-topline"><span>{t('showcase.resultsExample')}</span><span>B062</span></div>
    <div className="home-result-summary"><strong>24<span> / 30</span></strong><span>{t('showcase.submitted')}</span></div>
    <div className="home-chart" aria-hidden="true">{[42, 58, 51, 73, 64, 86, 79, 94, 83, 68, 88, 98].map((height, i) => <i key={i} style={{ height: height + '%' }} />)}</div>
    <div className="home-result-row"><span>{t('showcase.resultsColumns.student')}</span><span>{t('showcase.resultsColumns.score')}</span><span>{t('showcase.resultsColumns.state')}</span></div>
    {[['01', '84'], ['02', '92'], ['03', '76']].map(([id, score]) => <div className="home-result-row" key={id}><span>{t('showcase.participant')} {id}</span><strong>{score}%</strong><span className="home-result-done">{t('showcase.done')}</span></div>)}
  </div>
}

function PlanningPreview() {
  const { t } = useTranslation()
  return <div className="home-planning-preview">
    <div className="home-plan-sheet"><div className="home-preview-topline"><span>PHYSEZ / {t('showcase.ktp')}</span><span>01 — 04</span></div><h3>{t('showcase.planSubject')}</h3><p>{t('showcase.planCaption')}</p><div className="home-plan-table"><div><span>№</span><span>{t('showcase.planTopic')}</span><span>{t('showcase.planHours')}</span></div>{['motion', 'forces', 'energy', 'momentum'].map((key, i) => <div key={key}><span>0{i + 1}</span><span>{t('showcase.planTopics.' + key)}</span><span>2</span></div>)}</div><div className="home-plan-footer"><span>DOCX · {t('showcase.ktp')}</span><span>{t('showcase.planStatus')}</span></div></div>
    <div className="home-ksp-label">{t('showcase.kspSoon')}</div>
  </div>
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const cancelScroll = useRef<(() => void) | null>(null)
  useEffect(() => () => cancelScroll.current?.(), [])
  const scrollToTopics = () => {
    cancelScroll.current?.()
    const target = document.getElementById('course-topics')
    if (!target) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('a11y-reduced-motion')
    if (reduced) { target.scrollIntoView({ behavior: 'instant', block: 'center' }); return }
    const from = window.scrollY
    const bounds = target.getBoundingClientRect()
    const headerHeight = document.querySelector('.header')?.getBoundingClientRect().height || 0
    const destination = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, from + bounds.top + bounds.height / 2 - (window.innerHeight + headerHeight) / 2))
    const started = performance.now()
    let frame = 0
    const stop = () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('keydown', onKey)
      cancelScroll.current = null
    }
    const onKey = (event: KeyboardEvent) => {
      if (['Escape', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stop()
    }
    const animate = (now: number) => {
      const progress = Math.min(1, (now - started) / 2400)
      const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10)
      window.scrollTo({ top: from + (destination - from) * eased, behavior: 'instant' })
      if (progress < 1) frame = requestAnimationFrame(animate)
      else stop()
    }
    cancelScroll.current = stop
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('keydown', onKey)
    frame = requestAnimationFrame(animate)
  }
  return <main className="home-page" lang={i18n.resolvedLanguage}>
    <section className="home-section home-hero home-feature" aria-labelledby="home-title">
      <div className="home-feature-copy"><span className="home-eyebrow">{t('showcase.heroEyebrow')}</span><h1 id="home-title">{t('showcase.heroTitle')}</h1><p className="home-hero-subtitle">{t('showcase.heroDescription')}</p><a className="home-cta" href="#course-topics" onClick={event => {
        event.preventDefault()
        scrollToTopics()
      }}>{t('common.startLearning')}</a></div>
      <div className="home-atom"><RandomAtomModel /></div>
    </section>
    <CourseTopics />
    <LabShowcase />
    <section className="home-section home-feature home-feature-green home-results" aria-labelledby="home-results-title">
      <div className="home-results-backdrop"><StaticSchrodinger /></div>
      <div className="home-feature-copy"><span className="home-eyebrow">{t('showcase.teacher')}</span><h2 id="home-results-title">{t('showcase.resultsTitle')}</h2><p className="home-feature-description">{t('showcase.resultsDescription')}</p><Link className="home-cta home-pro-cta" to={user ? '/account' : '/register'}>{t('showcase.openAccount')}<span className="home-pro-badge">PRO</span></Link></div>
      <ResultsPreview />
    </section>
    <section className="home-section home-feature home-feature-yellow" aria-labelledby="home-plan-title">
      <div className="home-feature-copy"><span className="home-eyebrow">{t('showcase.planning')}</span><h2 id="home-plan-title">{t('showcase.planningTitle')}</h2><p className="home-feature-description">{t('showcase.planningDescription')}</p><Link className="home-cta home-pro-cta" to={user ? '/account' : '/register'}><span className="home-pro-badge">PRO</span>{t('showcase.openAccount')}</Link></div>
      <PlanningPreview />
    </section>
    <section className="home-section home-about"><span className="home-about-backdrop" aria-hidden="true"><StaticNucleus /></span><div><span className="home-eyebrow home-about-brand"><span>PHYS</span><span>EZ</span></span><h2>{t('home.aboutTitle')} {t('home.aboutHighlight')}</h2></div><div><p>{t('home.aboutText1')}</p><p>{t('home.aboutText1_2')}</p></div></section>
  </main>
}
