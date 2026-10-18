import { Link } from 'react-router-dom'
import { ASSESSMENT_CATALOG } from '../lib/assessmentCatalog'
import AssessmentCatalogRail from '../components/AssessmentCatalogRail'
import '../styles/assessment-monitor.css'

export default function AssessmentIndex() {
  return <main className="monitor-page monitor-page--narrow monitor-page--catalog" lang="ru"><div className="monitor-container">
    <header className="monitor-header"><div><span className="monitor-kicker">Проверка знаний</span><h1>Контрольные срезы</h1><p>Выберите работу, назначенную преподавателем.</p></div><Link className="monitor-export" to="/account">В кабинет</Link></header>
    <AssessmentCatalogRail id="assessment-catalog-rail" label="Контрольные работы">{ASSESSMENT_CATALOG.map(test => <section className="monitor-test-card" key={test.id}>
      <div className="monitor-test-heading"><div><span className="monitor-kicker">Контрольный срез</span><h2>{test.name}</h2><p>{test.description}</p></div><Link className="monitor-export" to={test.route}>Открыть →</Link></div>
    </section>)}</AssessmentCatalogRail>
  </div></main>
}
