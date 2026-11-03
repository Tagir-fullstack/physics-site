import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ParticleLibrary from '../components/ParticleLibrary'
import { sections } from '../data/topics'
import '../styles/animations-library.css'

export default function Animations() {
  const { t } = useTranslation()
  return <main className="animations-library"><div className="animations-library-container">
    <header className="animations-library-heading"><span>PHYSEZ / {t('showcase.free')}</span><h1>{t('showcase.libraryTitle')}</h1><p>{t('showcase.libraryDescription')}</p></header>
    <div className="animations-topic-grid">{sections[0].topics.map((topic, i) => {
      const key = topic.path.split('/').pop()
      const title = t('topics.' + key + '.title', { defaultValue: topic.title })
      return <Link className="animations-topic" to={topic.path} key={topic.path}><img src={topic.image} alt="" loading="lazy" decoding="async" /><div><span>{String(i + 1).padStart(2, '0')}</span><h2>{title}</h2></div></Link>
    })}</div>
    <ParticleLibrary />
  </div></main>
}
