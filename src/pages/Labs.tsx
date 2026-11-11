import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAccessibility } from '../context/AccessibilityContext'
import { useMotionPreference } from '../lib/useMotionPreference'
import { LABS } from '../data/labs'
import LabIllustration from '../components/LabIllustration'
import '../styles/labs-catalog.css'

export default function Labs() {
  const { user } = useAuth()
  const reduced = useMotionPreference()
  const accessibility = useAccessibility()
  const motionRestricted = reduced || accessibility.enabled && accessibility.reducedMotion
  const [animations, setAnimations] = useState(() => {
    try { const saved = localStorage.getItem('physez-labs-animations'); if (saved !== null) return saved === 'true' } catch { /* Use device preference. */ }
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const toggleAnimations = () => {
    const next = !animations; setAnimations(next)
    try { localStorage.setItem('physez-labs-animations', String(next)) } catch { /* Works for this visit. */ }
  }
  return <main className="labs-catalog-page" data-animations={animations && !motionRestricted ? 'on' : 'off'}><div className="labs-catalog-container">
    <section className="labs-catalog-hero" aria-labelledby="labs-title">
      <div className="labs-catalog-welcome">
        <span className="labs-catalog-eyebrow"><i aria-hidden="true" /> PHYSEZ / ВИРТУАЛЬНАЯ ЛАБОРАТОРИЯ</span>
        <h1 id="labs-title">Добро пожаловать<br />в лабораторию<span>.</span></h1>
        <p>Физика становится понятнее, когда её можно увидеть. Собирайте опыты, меняйте условия и находите закономерности — прямо в браузере.</p>
        <div className="labs-catalog-actions"><button className="labs-motion-toggle" type="button" aria-pressed={animations && !motionRestricted} disabled={motionRestricted} title={motionRestricted ? 'Анимации отключены в настройках доступности или устройства.' : 'Включить или приостановить анимации установок'} onClick={toggleAnimations}>Анимации: {animations && !motionRestricted ? 'включены' : 'выключены'}</button><a href="#lab-catalog" className="labs-catalog-primary">Выбрать опыт <span aria-hidden="true">↓</span></a><Link to={user ? '/account' : '/student/profile'}>Мой профиль <span aria-hidden="true">↗</span></Link></div>
        <div className="labs-catalog-facts"><span><strong>{String(LABS.length).padStart(2, '0')}</strong> установки</span><span>Механика, термодинамика и электричество</span><span>Без установки программ</span></div>
      </div>
      <div className="labs-hero-apparatus" aria-hidden="true"><div className="labs-apparatus-caption"><span>НАБЛЮДАЙТЕ. ИССЛЕДУЙТЕ.</span><span>↗</span></div><LabIllustration id="oberbeck" /><div className="labs-apparatus-footer"><span>От наблюдения<br />к пониманию</span><b>F → a</b></div></div>
    </section>

    <section id="lab-catalog" className="labs-catalog-list" aria-labelledby="labs-list-title">
      <header className="labs-catalog-list-heading"><div><span className="labs-catalog-eyebrow">ВАШ СЛЕДУЮЩИЙ ЭКСПЕРИМЕНТ</span><h2 id="labs-list-title">Выберите лабораторную</h2></div><span className="labs-catalog-free">Установки доступны бесплатно</span></header>
      <div className="labs-catalog-cards">{LABS.map(lab => <article className={`labs-catalog-card labs-accent-${lab.accent}`} key={lab.id}>
        <div className="labs-card-art"><LabIllustration id={lab.id} /></div>
        <div className="labs-card-copy"><span className="labs-card-topic">{lab.topic}</span><h3>{lab.title}</h3><p>{lab.description}</p><Link to={lab.route} aria-label={`Открыть лабораторную «${lab.title}»`}>Начать эксперимент <span aria-hidden="true">↗</span></Link></div>
      </article>)}</div>
    </section>

    <section className="labs-catalog-guide" aria-label="Как начать"><div><span className="labs-catalog-eyebrow">ВСЁ ГОТОВО К ОПЫТУ</span><h2>Ваша очередь исследовать</h2><p>Начните с установки. Дополнительные инструменты обработки результатов доступны с PRO.</p></div><ol><li><span>1</span>Выберите опыт</li><li><span>2</span>Настройте параметры</li><li><span>3</span>Запустите и наблюдайте</li></ol></section>
  </div></main>
}
