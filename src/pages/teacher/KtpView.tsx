import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { isEmailAdmin, useApiClient } from '../../lib/apiClient'
import '../../styles/ktp.css'

type Ktp = {
  id: string
  grade: number
  language: 'ru' | 'kk'
  academicYear: string | null
  title: string
  hoursPerWeek: number | null
  totalHours: number | null
  sourceUrl: string | null
  sourceFilename: string | null
}

type Lesson = {
  id: string
  orderNo: number
  quarter: number | null
  section: string | null
  topic: string | null
  objectives: string | null
  hours: number | null
  plannedDate: string | null
  notes: string | null
}

type LessonDraft = Omit<Lesson, 'id'> & { id: string | null; uiKey: string }
type Snap = { ktp: Ktp; lessons: LessonDraft[] }

function makeUiKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `k${Math.random().toString(36).slice(2)}${Date.now()}`
}

function findChangedUiKey(a: LessonDraft[], b: LessonDraft[]): string | null {
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    const av = a[i]?.uiKey
    const bv = b[i]?.uiKey
    if (av !== bv) return bv ?? av ?? null
  }
  return null
}

function flashRow(uiKey: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLTableRowElement>(`tr[data-row-key="${uiKey}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el.querySelectorAll('td').forEach((td) => {
      td.animate(
        [
          { backgroundColor: 'rgba(74, 144, 226, 0.28)' },
          { backgroundColor: 'rgba(74, 144, 226, 0.10)', offset: 0.5 },
          { backgroundColor: 'transparent' },
        ],
        { duration: 1600, easing: 'ease-out' }
      )
    })
  })
}

const HEAD_RU = {
  section: 'Раздел',
  topic: 'Тема',
  objectives: 'Цели обучения',
  hours: 'ч',
  date: 'Дата',
  notes: 'Примечание',
  quarter: 'Кв',
}
const HEAD_KK = {
  section: 'Бөлім',
  topic: 'Тақырыбы',
  objectives: 'Мақсаттары',
  hours: 'сағ',
  date: 'Мерзімі',
  notes: 'Ескерту',
  quarter: 'Тоқ',
}
const HISTORY_LIMIT = 50

function emptyLesson(orderNo: number): LessonDraft {
  return {
    id: null,
    uiKey: makeUiKey(),
    orderNo,
    quarter: null,
    section: null,
    topic: null,
    objectives: null,
    hours: null,
    plannedDate: null,
    notes: null,
  }
}

export default function KtpView() {
  const { id } = useParams<{ id: string }>()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const { authFetch } = useApiClient()

  const [ktp, setKtp] = useState<Ktp | null>(null)
  const [lessons, setLessons] = useState<LessonDraft[]>([])
  const [initialSnapshot, setInitialSnapshot] = useState<string>('')
  const [past, setPast] = useState<Snap[]>([])
  const [future, setFuture] = useState<Snap[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const originalRef = useRef<Snap | null>(null)
  const beforeEditRef = useRef<Snap | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user || !isEmailAdmin(user.email)) {
      navigate('/')
      return
    }
    if (!id) return
    authFetch(`/api/ktp/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        const d = await r.json()
        setKtp(d.ktp)
        const drafts: LessonDraft[] = (d.lessons as Lesson[]).map((l) => ({ ...l, uiKey: l.id }))
        setLessons(drafts)
        setInitialSnapshot(snapshot(d.ktp, drafts))
        originalRef.current = { ktp: d.ktp, lessons: drafts }
        setPast([])
        setFuture([])
      })
      .catch((e) => setError(e.message))
  }, [user, isLoading, navigate, authFetch, id])

  const currentSnapshot = useMemo(() => (ktp ? snapshot(ktp, lessons) : ''), [ktp, lessons])
  const dirty = currentSnapshot !== '' && currentSnapshot !== initialSnapshot

  const takeSnap = useCallback((): Snap | null => (ktp ? { ktp, lessons } : null), [ktp, lessons])

  const pushHistory = useCallback(() => {
    const s = takeSnap()
    if (!s) return
    setPast((p) => [...p, s].slice(-HISTORY_LIMIT))
    setFuture([])
  }, [takeSnap])

  const undo = useCallback(() => {
    if (past.length === 0) return
    const prev = past[past.length - 1]
    const curr = ktp ? { ktp, lessons } : null
    const changed = findChangedUiKey(lessons, prev.lessons)
    if (curr) setFuture((f) => [...f, curr].slice(-HISTORY_LIMIT))
    setPast(past.slice(0, -1))
    setKtp(prev.ktp)
    setLessons(prev.lessons)
    if (changed) flashRow(changed)
  }, [past, ktp, lessons])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const next = future[future.length - 1]
    const curr = ktp ? { ktp, lessons } : null
    const changed = findChangedUiKey(lessons, next.lessons)
    if (curr) setPast((p) => [...p, curr].slice(-HISTORY_LIMIT))
    setFuture(future.slice(0, -1))
    setKtp(next.ktp)
    setLessons(next.lessons)
    if (changed) flashRow(changed)
  }, [future, ktp, lessons])

  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, editing])

  const updateKtp = <K extends keyof Ktp>(key: K, value: Ktp[K]) => {
    setKtp((prev) => (prev ? { ...prev, [key]: value } : prev))
  }
  const updateLesson = <K extends keyof LessonDraft>(index: number, key: K, value: LessonDraft[K]) => {
    setLessons((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)))
  }

  const deleteLesson = (index: number) => {
    pushHistory()
    setLessons((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, orderNo: i + 1 })))
  }
  const addLesson = () => {
    pushHistory()
    const created = emptyLesson(lessons.length + 1)
    setLessons((prev) => [...prev, created])
    flashRow(created.uiKey)
  }
  const moveLesson = (index: number, delta: number) => {
    const j = index + delta
    if (j < 0 || j >= lessons.length) return
    pushHistory()
    const movedKey = lessons[index].uiKey
    setLessons((prev) => {
      const next = [...prev]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next.map((l, i) => ({ ...l, orderNo: i + 1 }))
    })
    flashRow(movedKey)
  }
  const changeQuarter = (index: number, value: number | null) => {
    pushHistory()
    updateLesson(index, 'quarter', value)
  }
  const changeHours = (index: number, value: number | null) => {
    pushHistory()
    updateLesson(index, 'hours', value)
  }
  const changeGrade = (value: number) => {
    pushHistory()
    updateKtp('grade', value)
  }
  const changeLanguage = (value: 'ru' | 'kk') => {
    pushHistory()
    updateKtp('language', value)
  }

  // Coalesce a whole typing session (from focus to blur) into a single undo step.
  const handleTextFocus = () => {
    beforeEditRef.current = takeSnap()
  }
  const handleTextBlur = () => {
    const before = beforeEditRef.current
    beforeEditRef.current = null
    if (!before || !ktp) return
    const beforeStr = snapshot(before.ktp, before.lessons)
    const nowStr = snapshot(ktp, lessons)
    if (beforeStr !== nowStr) {
      setPast((p) => [...p, before].slice(-HISTORY_LIMIT))
      setFuture([])
    }
  }

  const save = async () => {
    if (!id || !ktp) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        meta: {
          grade: ktp.grade,
          language: ktp.language,
          academicYear: ktp.academicYear,
          title: ktp.title,
          hoursPerWeek: ktp.hoursPerWeek,
          totalHours: ktp.totalHours,
        },
        lessons: lessons.map((l, i) => ({
          orderNo: i + 1,
          quarter: l.quarter,
          section: l.section,
          topic: l.topic,
          objectives: l.objectives,
          hours: l.hours,
          plannedDate: l.plannedDate,
          notes: l.notes,
        })),
      }
      const r = await authFetch(`/api/ktp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(await r.text())
      const d = await r.json()
      setKtp(d.ktp)
      const drafts: LessonDraft[] = (d.lessons as Lesson[]).map((l) => ({ ...l, uiKey: l.id }))
      setLessons(drafts)
      setInitialSnapshot(snapshot(d.ktp, drafts))
      originalRef.current = { ktp: d.ktp, lessons: drafts }
      setPast([])
      setFuture([])
      setLastSaved(Date.now())
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('Удалить это КТП полностью?')) return
    const r = await authFetch(`/api/ktp/${id}`, { method: 'DELETE' })
    if (r.ok) navigate('/teacher/ktp')
  }

  const startEdit = () => {
    setEditing(true)
  }
  const exitEdit = () => {
    if (dirty) {
      if (!confirm('Отменить несохранённые изменения?')) return
      const orig = originalRef.current
      if (orig) {
        setKtp(orig.ktp)
        setLessons(orig.lessons)
      }
      setPast([])
      setFuture([])
    }
    setEditing(false)
  }

  if (isLoading || !user) return null

  const heads = ktp?.language === 'kk' ? HEAD_KK : HEAD_RU
  const canUndo = past.length > 0
  const canRedo = future.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="ktp-page"
    >
      <div className="ktp-container">
        <div className="ktp-header">
          <h1 className="ktp-title" style={{ marginRight: 'auto' }}>
            {ktp && editing ? (
              <EditableText
                value={ktp.title}
                onChange={(v) => updateKtp('title', v)}
                onFocus={handleTextFocus}
                onBlur={handleTextBlur}
                as="span"
                minWidth={200}
              />
            ) : (
              ktp?.title ?? 'КТП'
            )}
          </h1>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {editing && (
              <>
                <button
                  onClick={undo}
                  className="ktp-secondary-btn ktp-icon-only-btn"
                  disabled={!canUndo}
                  title={`Отменить (${isMac() ? '⌘Z' : 'Ctrl+Z'})`}
                  aria-label="Отменить"
                >
                  <UndoIcon />
                </button>
                <button
                  onClick={redo}
                  className="ktp-secondary-btn ktp-icon-only-btn"
                  disabled={!canRedo}
                  title={`Повторить (${isMac() ? '⌘⇧Z' : 'Ctrl+Shift+Z'})`}
                  aria-label="Повторить"
                >
                  <RedoIcon />
                </button>
              </>
            )}
            <Link to="/teacher/ktp" className="ktp-back-link" style={{ margin: '0 0.4rem' }}>← К списку</Link>
            {!editing && ktp && (
              <button onClick={startEdit} className="ktp-primary-btn" title="Редактировать КТП">
                Редактировать
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={save}
                  className="ktp-primary-btn"
                  disabled={!dirty || saving}
                  title={dirty ? 'Сохранить все изменения' : 'Нет изменений'}
                  style={{ minWidth: 150, textAlign: 'center' }}
                >
                  {saving ? 'Сохранение…' : dirty ? 'Сохранить' : lastSaved ? 'Сохранено' : 'Без изменений'}
                </button>
                <button
                  onClick={exitEdit}
                  className="ktp-secondary-btn"
                  title="Выйти из режима редактирования"
                >
                  Готово
                </button>
                {ktp && (
                  <button
                    onClick={handleDelete}
                    className="ktp-secondary-btn ktp-icon-only-btn"
                    style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}
                    title="Удалить КТП"
                    aria-label="Удалить КТП"
                  >
                    <TrashIcon />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && <p className="ktp-form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

        {ktp && (
          <>
            <MetaBar
              ktp={ktp}
              editing={editing}
              onChange={updateKtp}
              onChangeGrade={changeGrade}
              onChangeLanguage={changeLanguage}
              onFocus={handleTextFocus}
              onBlur={handleTextBlur}
            />

            <div className="ktp-table-wrap">
              <table className={`ktp-table${editing ? ' ktp-table--editable' : ''}`}>
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>№</th>
                    {editing && <th style={{ width: 52 }}>{heads.quarter}</th>}
                    <th>{heads.section}</th>
                    <th>{heads.topic}</th>
                    <th>{heads.objectives}</th>
                    <th style={{ width: 58 }}>{heads.hours}</th>
                    <th style={{ width: 130 }}>{heads.date}</th>
                    <th>{heads.notes}</th>
                    {editing && <th style={{ width: 84 }}>&nbsp;</th>}
                  </tr>
                </thead>
                <tbody>
                  {buildRows(lessons).map((row) => {
                    if (row.kind === 'quarter') {
                      return (
                        <tr key={`q-${row.q}-${row.at}`} className="ktp-quarter-row">
                          <td colSpan={editing ? 9 : 7}>{romanQuarter(row.q)} четверть</td>
                        </tr>
                      )
                    }
                    const { l, i } = row
                    return (
                    <tr key={l.uiKey} data-row-key={l.uiKey}>
                      <td style={{ color: '#888', textAlign: 'center', fontSize: '0.85rem' }}>
                        {i + 1}
                      </td>
                      {editing && (
                        <td>
                          <select
                            value={l.quarter ?? ''}
                            onChange={(e) =>
                              changeQuarter(i, e.target.value ? parseInt(e.target.value, 10) : null)
                            }
                            className="ktp-cell-select"
                          >
                            <option value="">—</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                          </select>
                        </td>
                      )}
                      <td>
                        {editing ? (
                          <CellTextarea
                            value={l.section ?? ''}
                            onChange={(v) => updateLesson(i, 'section', v || null)}
                            onFocus={handleTextFocus}
                            onBlur={handleTextBlur}
                          />
                        ) : (
                          <ReadCell value={l.section} />
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <CellTextarea
                            value={l.topic ?? ''}
                            onChange={(v) => updateLesson(i, 'topic', v || null)}
                            onFocus={handleTextFocus}
                            onBlur={handleTextBlur}
                          />
                        ) : (
                          <ReadCell value={l.topic} />
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <CellTextarea
                            value={l.objectives ?? ''}
                            onChange={(v) => updateLesson(i, 'objectives', v || null)}
                            onFocus={handleTextFocus}
                            onBlur={handleTextBlur}
                          />
                        ) : (
                          <ObjectivesCell value={l.objectives} />
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={l.hours ?? ''}
                            onChange={(e) =>
                              changeHours(i, e.target.value ? parseInt(e.target.value, 10) : null)
                            }
                            className="ktp-cell-input"
                          />
                        ) : (
                          <span>{l.hours ?? '—'}</span>
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <CellTextarea
                            value={l.plannedDate ?? ''}
                            onChange={(v) => updateLesson(i, 'plannedDate', v || null)}
                            onFocus={handleTextFocus}
                            onBlur={handleTextBlur}
                          />
                        ) : (
                          <ReadCell value={l.plannedDate} />
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <CellTextarea
                            value={l.notes ?? ''}
                            onChange={(v) => updateLesson(i, 'notes', v || null)}
                            onFocus={handleTextFocus}
                            onBlur={handleTextBlur}
                          />
                        ) : (
                          <ReadCell value={l.notes} />
                        )}
                      </td>
                      {editing && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => moveLesson(i, -1)}
                            disabled={i === 0}
                            className="ktp-icon-btn"
                            title="Вверх"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLesson(i, 1)}
                            disabled={i === lessons.length - 1}
                            className="ktp-icon-btn"
                            title="Вниз"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLesson(i)}
                            className="ktp-icon-btn"
                            title="Удалить строку"
                            style={{ color: '#ff8080' }}
                          >
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {editing && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" onClick={addLesson} className="ktp-secondary-btn">
                  + Добавить строку
                </button>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  строк: {lessons.length}
                  {ktp.hoursPerWeek && lessons.length > 0 && (
                    <> · всего часов: {lessons.reduce((s, l) => s + (l.hours ?? 0), 0)}</>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

function snapshot(k: Ktp, ls: LessonDraft[]): string {
  return JSON.stringify({
    m: {
      g: k.grade,
      l: k.language,
      y: k.academicYear,
      t: k.title,
      hpw: k.hoursPerWeek,
      th: k.totalHours,
    },
    lessons: ls.map((l) => ({
      q: l.quarter,
      s: l.section,
      t: l.topic,
      o: l.objectives,
      h: l.hours,
      d: l.plannedDate,
      n: l.notes,
    })),
  })
}

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
}

type TableRow =
  | { kind: 'quarter'; q: number; at: number }
  | { kind: 'lesson'; l: LessonDraft; i: number }

function buildRows(lessons: LessonDraft[]): TableRow[] {
  const rows: TableRow[] = []
  let currentQ: number | null = null
  lessons.forEach((l, i) => {
    if (l.quarter && l.quarter !== currentQ) {
      currentQ = l.quarter
      rows.push({ kind: 'quarter', q: l.quarter, at: i })
    }
    rows.push({ kind: 'lesson', l, i })
  })
  return rows
}

const ROMAN = ['', 'I', 'II', 'III', 'IV']
function romanQuarter(q: number): string {
  return ROMAN[q] ?? String(q)
}

function MetaBar({
  ktp,
  editing,
  onChange,
  onChangeGrade,
  onChangeLanguage,
  onFocus,
  onBlur,
}: {
  ktp: Ktp
  editing: boolean
  onChange: <K extends keyof Ktp>(k: K, v: Ktp[K]) => void
  onChangeGrade: (v: number) => void
  onChangeLanguage: (v: 'ru' | 'kk') => void
  onFocus: () => void
  onBlur: () => void
}) {
  if (!editing) {
    const lang = ktp.language === 'kk' ? 'қазақша' : 'русский'
    return (
      <div className="ktp-meta-bar">
        <span>Класс: <strong>{ktp.grade}</strong></span>
        <span>Язык: <strong>{lang}</strong></span>
        {ktp.academicYear && <span>Учебный год: <strong>{ktp.academicYear}</strong></span>}
        {ktp.hoursPerWeek != null && <span>ч/нед: <strong>{ktp.hoursPerWeek}</strong></span>}
        {ktp.totalHours != null && <span>Всего ч: <strong>{ktp.totalHours}</strong></span>}
        {ktp.sourceFilename && <span title={ktp.sourceFilename}>исходник: {ktp.sourceFilename}</span>}
      </div>
    )
  }
  return (
    <div className="ktp-meta-bar ktp-meta-bar--editable">
      <label>
        Класс:{' '}
        <select
          value={ktp.grade}
          onChange={(e) => onChangeGrade(parseInt(e.target.value, 10))}
          className="ktp-cell-select"
        >
          {[7, 8, 9, 10, 11].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <label>
        Язык:{' '}
        <select
          value={ktp.language}
          onChange={(e) => onChangeLanguage(e.target.value as 'ru' | 'kk')}
          className="ktp-cell-select"
        >
          <option value="ru">русский</option>
          <option value="kk">қазақша</option>
        </select>
      </label>
      <label>
        Учебный год:{' '}
        <input
          type="text"
          value={ktp.academicYear ?? ''}
          onChange={(e) => onChange('academicYear', e.target.value || null)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="2026-2027"
          className="ktp-cell-input"
          style={{ width: 100 }}
        />
      </label>
      <label>
        ч/нед:{' '}
        <input
          type="number"
          min={1}
          max={10}
          value={ktp.hoursPerWeek ?? ''}
          onChange={(e) => onChange('hoursPerWeek', e.target.value ? parseInt(e.target.value, 10) : null)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="ktp-cell-input"
          style={{ width: 60 }}
        />
      </label>
      <label>
        Всего ч:{' '}
        <input
          type="number"
          min={1}
          max={200}
          value={ktp.totalHours ?? ''}
          onChange={(e) => onChange('totalHours', e.target.value ? parseInt(e.target.value, 10) : null)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="ktp-cell-input"
          style={{ width: 68 }}
        />
      </label>
      {ktp.sourceFilename && (
        <span style={{ color: '#666', fontSize: '0.85rem' }} title={ktp.sourceFilename}>
          исходник: {ktp.sourceFilename}
        </span>
      )}
    </div>
  )
}

function EditableText({
  value,
  onChange,
  onFocus,
  onBlur,
  as = 'span',
  minWidth,
}: {
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
  as?: 'span' | 'div'
  minWidth?: number
}) {
  const Tag = as
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={onFocus}
      onBlur={(e) => {
        const t = e.currentTarget.textContent ?? ''
        if (t !== value) onChange(t)
        onBlur?.()
      }}
      style={{
        outline: 'none',
        display: 'inline-block',
        minWidth,
        borderBottom: '1px dashed rgba(255,255,255,0.15)',
      }}
    >
      {value}
    </Tag>
  )
}

function ReadCell({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: '#666' }}>—</span>
  return <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
}

function ObjectivesCell({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: '#666' }}>—</span>
  const parts = splitObjectives(value)
  if (parts.length === 0) return <span style={{ color: '#666' }}>—</span>
  if (parts.length === 1) return <span style={{ whiteSpace: 'pre-wrap' }}>{parts[0]}</span>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {parts.map((p, i) => (
        <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{p}</div>
      ))}
    </div>
  )
}

function splitObjectives(value: string): string[] {
  // Strip standalone-digit lines (per-item hour counts that leaked from an
  // adjacent docx column). Line-based only — never touches inline digits.
  const cleaned = value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\d{1,3}$/.test(l))
    .join('\n')
  // Objectives are separated by "; " or a newline, then a curriculum code
  // like "11.4.2.1 -". The trailing " -" / " –" prevents matching mid-code
  // (e.g. "11.4.2.1" wouldn't be re-split as "1" + "1.4.2.1").
  return cleaned
    .split(/(?:;\s+|\n+)(?=\d+\.\d+\.\d+\.\d+\s*[-–])/g)
    .map((c) => c.trim())
    .filter(Boolean)
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
    </svg>
  )
}

function CellTextarea({
  value,
  onChange,
  onFocus,
  onBlur,
}: {
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      rows={1}
      className="ktp-cell-textarea"
    />
  )
}
