import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { isEmailAdmin, useApiClient } from '../../lib/apiClient'
import '../../styles/ktp.css'

export default function KtpNew() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const { authFetch } = useApiClient()

  const [grade, setGrade] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [title, setTitle] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState('2')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const yearOptions = academicYearOptions()

  useEffect(() => {
    if (isLoading) return
    if (!user || !isEmailAdmin(user.email)) navigate('/')
  }, [user, isLoading, navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grade) { setError('Выберите класс'); return }
    if (!academicYear) { setError('Выберите учебный год'); return }
    if (!hoursPerWeek) { setError('Укажите часов в неделю'); return }
    if (!file) { setError('Выберите файл .docx'); return }
    setError(null)
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('grade', grade)
      fd.append('academicYear', academicYear)
      fd.append('title', title || `КТП ${grade} класс`)
      fd.append('hoursPerWeek', hoursPerWeek)
      fd.append('file', file, file.name)
      const r = await authFetch('/api/ktp/upload', { method: 'POST', body: fd })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error([j.error, j.detail].filter(Boolean).join(': ') || `HTTP ${r.status}`)
      }
      const j = await r.json()
      navigate(`/teacher/ktp/${j.id}`)
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

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
          <h1 className="ktp-title">Загрузка КТП</h1>
          <Link to="/teacher/ktp" className="ktp-back-link">← К списку</Link>
        </div>

        <form className="ktp-form" onSubmit={submit}>
          <label>
            Класс
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="ktp-form-select--compact"
            >
              <option value="" disabled>Выберите класс</option>
              {[7, 8, 9, 10, 11].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>

          <label>
            Учебный год
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="ktp-form-select--compact"
            >
              <option value="" disabled>Выберите год</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <label>
            Название (необязательно — по умолчанию «КТП N класс»)
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="" />
          </label>

          <label>
            Часов в неделю
            <input
              type="number"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              min={1}
              max={10}
              placeholder="например, 2"
            />
          </label>

          <label>
            Файл .docx
            <input type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          {error && <p className="ktp-form-error">{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="ktp-primary-btn" disabled={submitting}>
              {submitting ? 'Загрузка…' : 'Загрузить и разобрать'}
            </button>
            <Link to="/teacher/ktp" className="ktp-secondary-btn">Отмена</Link>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

function academicYearOptions(now: Date = new Date()): string[] {
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return [`${y}-${y + 1}`, `${y + 1}-${y + 2}`, `${y + 2}-${y + 3}`]
}
