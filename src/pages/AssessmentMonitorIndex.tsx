import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApiClient } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import AssessmentCatalogRail from '../components/AssessmentCatalogRail'
import '../styles/assessment-monitor.css'

export type MonitorPeriod = { key: string; testId: string; name: string; active: boolean; attemptsCount: number; archivedAt: string | null; maxPointsTenths?: number }
export type MonitorCatalog = { tests: Array<{ id: string; name: string; description: string }>; periods: MonitorPeriod[]; periodsAvailable: boolean; error?: string }

export default function AssessmentMonitorIndex() {
  const { authFetch } = useApiClient()
  const { isLoading } = useAuth()
  const [catalog, setCatalog] = useState<MonitorCatalog | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (isLoading) return
    let cancelled = false
    void authFetch('/api/mechanics-assessment?view=catalog').then(async r => {
      const payload = await r.json() as MonitorCatalog
      if (!r.ok) throw new Error(payload.error || 'Не удалось загрузить список срезов.')
      if (!cancelled) setCatalog(payload)
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось загрузить список.') })
    return () => { cancelled = true }
  }, [authFetch, isLoading])
  return <main className="monitor-page monitor-page--narrow monitor-page--catalog"><div className="monitor-container">
    <header className="monitor-header"><div><span className="monitor-kicker">Панель администратора</span><h1>Контрольные срезы</h1><p>Выберите работу и учебный период для мониторинга.</p></div><Link className="monitor-export" to="/account">В кабинет</Link></header>
    {error && <div className="monitor-error">{error}</div>}
    {!catalog && !error && <p>Загружаем список срезов…</p>}
    {catalog && <AssessmentCatalogRail id="monitor-catalog-rail" label="Работы для мониторинга"><section className="monitor-test-card"><div className="monitor-test-heading"><div><span className="monitor-kicker">Лабораторная №3</span><h2>Маятник Обербека</h2><p>Индивидуальные варианты и ожидаемые таблицы.</p></div><Link className="monitor-export" to="/admin/oberbeck-variants">Открыть варианты →</Link></div></section>{catalog.tests.map(test => {
      const periods = catalog.periods.filter(p => p.testId === test.id)
      const active = periods.find(p => p.active)
      return <section className="monitor-test-card" key={test.id}><div className="monitor-test-heading"><div><span className="monitor-kicker">Контрольный срез</span><h2>{test.name}</h2><p>{test.description}</p></div>{active && <Link className="monitor-export" to={`/admin/assessment-monitor/${test.id}?period=${encodeURIComponent(active.key)}`}>Открыть мониторинг →</Link>}</div>
        <h3>Сохранённые периоды</h3><div className="monitor-period-list">{periods.map(p => <Link key={p.key} to={`/admin/assessment-monitor/${test.id}?period=${encodeURIComponent(p.key)}`}><span>{p.name} <small>{p.active ? 'Текущий' : 'Архив'}</small></span><span>{p.attemptsCount} работ →</span></Link>)}</div>
      </section>
    })}</AssessmentCatalogRail>}
    {catalog && <p className="monitor-catalog-hint">Результаты и разборы хранятся на сайте. Новый период создаётся в мониторинге — прежние работы не удаляются.</p>}
  </div></main>
}
