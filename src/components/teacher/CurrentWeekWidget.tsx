import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApiClient } from '../../lib/apiClient'
import {
  computeWeeklyBuckets,
  getCurrentWeekIndex,
  isWeekendUpcoming,
  type WeekBucket,
} from '../../lib/ktpWeeks'

type KtpMeta = {
  id: string
  grade: number
  language: 'ru' | 'kk'
  academicYear: string | null
  title: string
  hoursPerWeek: number | null
  totalHours: number | null
}

type Lesson = {
  id: string
  orderNo: number
  quarter: number | null
  section: string | null
  topic: string | null
  objectives: string | null
  hours: number | null
}

type Cache = {
  ktp: KtpMeta
  buckets: WeekBucket[]
  currentWeek: number
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'no-ktps' }
  | { kind: 'ready'; items: Cache[] }

type Props = {
  isLight: boolean
}

const visibilityStorageKey = 'physez:teacher-week-visibility'

type VisibilityPreferences = {
  enabled: boolean
  hiddenGrades: number[]
}

function readVisibilityPreferences(): VisibilityPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(visibilityStorageKey) || '{}')
    return {
      enabled: saved.enabled !== false,
      hiddenGrades: Array.isArray(saved.hiddenGrades) ? saved.hiddenGrades : [],
    }
  } catch {
    return { enabled: true, hiddenGrades: [] }
  }
}

export default function CurrentWeekWidget({ isLight }: Props) {
  const { authFetch } = useApiClient()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [preferences, setPreferences] = useState(readVisibilityPreferences)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(visibilityStorageKey, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await authFetch('/api/ktp')
        if (!r.ok) {
          if (!cancelled)
            setState({ kind: 'error', message: `GET /api/ktp → ${r.status}` })
          return
        }
        const j = await r.json()
        const ktps: KtpMeta[] = j.ktp || []
        if (ktps.length === 0) {
          if (!cancelled) setState({ kind: 'no-ktps' })
          return
        }
        const results: Cache[] = []
        for (const meta of ktps) {
          const rr = await authFetch(`/api/ktp/${meta.id}`)
          if (!rr.ok) continue
          const jj = await rr.json()
          const lessons: Lesson[] = jj.lessons || []
          const hpw = meta.hoursPerWeek && meta.hoursPerWeek > 0 ? meta.hoursPerWeek : 2
          const buckets = computeWeeklyBuckets(lessons, hpw)
          const currentWeek = getCurrentWeekIndex(meta.academicYear)
          results.push({ ktp: meta, buckets, currentWeek })
        }
        if (!cancelled) setState({ kind: 'ready', items: results })
      } catch (e) {
        if (!cancelled)
          setState({ kind: 'error', message: (e as Error).message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authFetch])

  const upcoming = isWeekendUpcoming()
  const cardBg = isLight ? '#ffffff' : '#141414'
  const cardBorder = isLight
    ? '1px solid rgba(0,0,0,0.08)'
    : '1px solid rgba(255,255,255,0.08)'
  const divider = isLight
    ? '1px solid rgba(0,0,0,0.06)'
    : '1px solid rgba(255,255,255,0.06)'
  const textPrimary = isLight ? '#1a1a1a' : '#ffffff'
  const textMuted = isLight ? '#555' : '#bbb'
  const textFaint = isLight ? '#888' : '#888'
  const accent = '#4a90e2'
  const warn = '#e0a34a'

  const shell = (children: React.ReactNode, showSettings = true) => (
    <div
      style={{
        backgroundColor: cardBg,
        border: cardBorder,
        borderRadius: 16,
        padding: '1.25rem 1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <div
          style={{
            color: accent,
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            marginBottom: '0.4rem',
          }}
        >
          {upcoming ? 'Предстоящая неделя' : 'Эта неделя'}
        </div>
        {showSettings && (
          <button
            type="button"
            onClick={() => setSettingsOpen((value) => !value)}
            aria-expanded={settingsOpen}
            style={{
              border: 0,
              padding: 0,
              background: 'transparent',
              color: textMuted,
              cursor: 'pointer',
              font: 'inherit',
              fontSize: '0.82rem',
            }}
          >
            {settingsOpen ? 'Готово' : 'Настроить'}
          </button>
        )}
      </div>
      {children}
    </div>
  )

  if (!preferences.enabled) {
    return shell(
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <span style={{ color: textMuted, fontSize: '0.9rem' }}>Школьные классы скрыты</span>
        <button
          type="button"
          onClick={() => setPreferences((value) => ({ ...value, enabled: true }))}
          style={{
            border: cardBorder,
            borderRadius: 8,
            padding: '0.45rem 0.7rem',
            background: 'transparent',
            color: accent,
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.82rem',
          }}
        >
          Показать
        </button>
      </div>,
      false
    )
  }

  if (state.kind === 'loading') {
    return shell(<div style={{ color: textMuted, fontSize: '0.9rem' }}>Загрузка…</div>)
  }
  if (state.kind === 'error') {
    return shell(
      <div style={{ color: warn, fontSize: '0.9rem' }}>
        Не удалось загрузить КТП: {state.message}
      </div>
    )
  }
  if (state.kind === 'no-ktps') {
    return shell(
      <div style={{ color: textMuted, fontSize: '0.9rem' }}>
        Пока нет ни одной КТП. <Link to="/teacher/ktp/new" style={{ color: accent }}>Загрузить</Link>
      </div>
    )
  }

  const gradeGroups = [...new Set(state.items.map((item) => item.ktp.grade))]
    .sort((a, b) => a - b)
    .map((grade) => ({ grade, items: state.items.filter((item) => item.ktp.grade === grade) }))
  const visibleGroups = gradeGroups.filter((group) => !preferences.hiddenGrades.includes(group.grade))

  const toggleGrade = (grade: number) => {
    setPreferences((value) => ({
      ...value,
      hiddenGrades: value.hiddenGrades.includes(grade)
        ? value.hiddenGrades.filter((savedGrade) => savedGrade !== grade)
        : [...value.hiddenGrades, grade],
    }))
  }

  return shell(
    <>
      {settingsOpen && (
        <div
          style={{
            borderTop: divider,
            borderBottom: divider,
            padding: '0.8rem 0',
            margin: '0.35rem 0 1rem',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              color: textPrimary,
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginBottom: '0.65rem',
            }}
          >
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(event) =>
                setPreferences((value) => ({ ...value, enabled: event.target.checked }))
              }
            />
            Показывать школьные классы
          </label>
          <div style={{ display: 'grid', gap: '0.45rem', paddingLeft: '1.45rem' }}>
            {gradeGroups.map((group) => (
              <label
                key={group.grade}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  color: textMuted,
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={!preferences.hiddenGrades.includes(group.grade)}
                  onChange={() => toggleGrade(group.grade)}
                />
                {group.grade} класс
                {group.items.length > 1 ? ` · ${group.items.length} КТП` : ''}
              </label>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          color: textPrimary,
          fontSize: '1.1rem',
          fontWeight: 500,
          marginBottom: '0.35rem',
        }}
      >
        Ознакомьтесь с темами
      </div>
      <div
        style={{
          color: textFaint,
          fontSize: '0.8rem',
          marginBottom: '0.4rem',
        }}
      >
        Расчёт без учёта каникул. Проверьте у себя в расписании.
      </div>

      {visibleGroups.length === 0 && (
        <div style={{ borderTop: divider, paddingTop: '0.85rem', marginTop: '0.85rem', color: textMuted, fontSize: '0.9rem' }}>
          Все классы скрыты. Нажмите «Настроить», чтобы выбрать нужные.
        </div>
      )}

      {visibleGroups.map((group) => {
        const primary = group.items[0]
        const weekIdx = upcoming ? primary.currentWeek + 1 : primary.currentWeek
        const displayWeek = weekIdx + 1
        const totalHoursPerWeek = group.items.reduce(
          (sum, item) => sum + (item.ktp.hoursPerWeek ?? 2),
          0
        )
        const academicYears = [...new Set(group.items.map((item) => item.ktp.academicYear).filter(Boolean))]
        return (
          <div
            key={group.grade}
            style={{
              borderTop: divider,
              paddingTop: '0.85rem',
              marginTop: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '0.5rem',
                marginBottom: '0.4rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: accent, fontWeight: 500 }}>
                {group.grade} класс
                {academicYears.length === 1 ? ` · ${academicYears[0]}` : ''}
              </span>
              <span style={{ color: textMuted, fontSize: '0.82rem' }}>
                неделя {displayWeek} · {totalHoursPerWeek} ч/нед
              </span>
            </div>

            {(['kk', 'ru'] as const).map((language) => {
              const languageItems = group.items.filter((item) => item.ktp.language === language)
              if (languageItems.length === 0) return null
              const languageHours = languageItems.reduce(
                (sum, item) => sum + (item.ktp.hoursPerWeek ?? 2),
                0
              )
              return (
                <div
                  key={language}
                  style={{
                    marginTop: '0.7rem',
                    padding: '0.7rem 0.8rem',
                    borderRadius: 10,
                    background: isLight ? 'rgba(74, 144, 226, 0.045)' : 'rgba(74, 144, 226, 0.07)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      color: textMuted,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginBottom: '0.3rem',
                    }}
                  >
                    <span>{language === 'kk' ? 'Қазақша' : 'Русский'}</span>
                    <span>{languageHours} ч/нед</span>
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.1rem',
                      color: textPrimary,
                      fontSize: '0.95rem',
                      lineHeight: 1.65,
                    }}
                  >
                    {languageItems.flatMap((item) => {
                      const itemWeekIdx = upcoming ? item.currentWeek + 1 : item.currentWeek
                      const safeWeekIdx = Math.min(itemWeekIdx, Math.max(item.buckets.length - 1, 0))
                      const bucket = item.buckets[safeWeekIdx]
                      return (bucket?.entries || []).map((entry, index) => (
                        <li key={`${item.ktp.id}-${itemWeekIdx}-${index}`}>
                          {entry.topic || <em style={{ color: textMuted }}>без темы</em>}
                          <span style={{ color: textMuted, fontSize: '0.82rem', marginLeft: '0.4rem' }}>
                            {formatSlice(entry)}
                          </span>
                          {languageItems.length > 1 && (
                            <Link
                              to={`/teacher/ktp/${item.ktp.id}`}
                              style={{ color: textFaint, fontSize: '0.75rem', marginLeft: '0.45rem' }}
                            >
                              КТП
                            </Link>
                          )}
                        </li>
                      ))
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

function formatSlice(e: {
  isStart: boolean
  isEnd: boolean
  hoursThisWeek: number
  fullHours: number
}): string {
  if (e.isStart && e.isEnd) return `${e.hoursThisWeek} ч`
  if (e.isStart) return `начало · ${e.hoursThisWeek} ч из ${e.fullHours}`
  if (e.isEnd) return `окончание · ${e.hoursThisWeek} ч из ${e.fullHours}`
  return `продолжение · ${e.hoursThisWeek} ч из ${e.fullHours}`
}
