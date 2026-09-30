import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { isEmailAdmin, useApiClient } from '../../lib/apiClient'
import '../../styles/ktp.css'

type KtpRow = {
  id: string
  grade: number
  language: 'ru' | 'kk'
  academicYear: string | null
  title: string
  totalHours: number | null
  createdAt: string
}

export default function KtpList() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const { authFetch } = useApiClient()
  const [items, setItems] = useState<KtpRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      navigate('/')
      return
    }
    if (!isEmailAdmin(user.email)) {
      navigate('/account')
      return
    }
    authFetch('/api/ktp')
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        const j = await r.json()
        setItems(j.ktp)
      })
      .catch((e) => setError(e.message))
  }, [user, isLoading, navigate, authFetch])

  if (isLoading || !user) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="ktp-page"
    >
      <div className="ktp-container">
        <div className="ktp-header">
          <h1 className="ktp-title">Мои КТП</h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/teacher" className="ktp-back-link">← В кабинет</Link>
            <Link to="/teacher/ktp/new" className="ktp-primary-btn">+ Загрузить КТП</Link>
          </div>
        </div>

        {error && <p className="ktp-form-error">{error}</p>}

        {items === null && !error && <p style={{ color: '#888' }}>Загрузка…</p>}

        {items && items.length === 0 && (
          <div className="ktp-empty">
            Пока ни одного КТП не загружено. Нажмите «Загрузить КТП», чтобы начать.
          </div>
        )}

        {items && items.length > 0 && (() => {
          const sorted = [...items].sort((a, b) => a.grade - b.grade)
          const ru = sorted.filter((k) => k.language !== 'kk')
          const kk = sorted.filter((k) => k.language === 'kk')
          return (
            <div className="ktp-lang-columns">
              <KtpLangColumn title="Русский" empty="Нет КТП на русском" items={ru} />
              <KtpLangColumn title="Қазақша" empty="Қазақ тіліндегі КТП жоқ" items={kk} />
            </div>
          )
        })()}
      </div>
    </motion.div>
  )
}

function KtpLangColumn({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: KtpRow[]
}) {
  return (
    <section className="ktp-lang-column">
      <h2 className="ktp-lang-heading">{title}</h2>
      {items.length === 0 ? (
        <div className="ktp-lang-empty">{empty}</div>
      ) : (
        <div className="ktp-list">
          {items.map((k) => (
            <div key={k.id} className="ktp-card ktp-list-item">
              <Link to={`/teacher/ktp/${k.id}`}>
                <span className="ktp-card-grade">{k.grade} класс</span>
                <span className="ktp-card-title">{k.title}</span>
                <span className="ktp-card-meta">
                  {k.academicYear ?? ''}
                  {k.academicYear && k.totalHours ? ' · ' : ''}
                  {k.totalHours ? `${k.totalHours} ч` : ''}
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
