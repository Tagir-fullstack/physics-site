import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import {
  createClass,
  deleteClass,
  getTeacherClasses,
  getClassStudents,
  type ClassRow,
  type ClassStudentRow,
} from '../lib/supabase';
import '../styles/page-layout.css';

function fmtPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function buildJoinUrl(code: string): string {
  return `${window.location.origin}/?class=${code}`;
}

export default function Teacher() {
  const { user, profile, isLoading } = useAuth();
  const { enabled: a11yEnabled, lightTheme } = useAccessibility();
  const isLight = a11yEnabled && lightTheme;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSchool, setFormSchool] = useState('');
  const [formGrade, setFormGrade] = useState('');

  const selectedId = searchParams.get('id');
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedId) || null, [classes, selectedId]);

  const [students, setStudents] = useState<ClassStudentRow[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  // Гард: только учителя
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (profile && profile.role !== 'teacher') {
      navigate('/account');
    }
  }, [user, profile, isLoading, navigate]);

  // Загрузка классов
  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      setIsLoadingClasses(true);
      const rows = await getTeacherClasses(profile.id);
      setClasses(rows);
      setIsLoadingClasses(false);
    }
    load();
  }, [profile?.id]);

  // Загрузка учеников выбранного класса
  useEffect(() => {
    async function load() {
      if (!selectedClass) {
        setStudents([]);
        return;
      }
      setIsLoadingStudents(true);
      const rows = await getClassStudents(selectedClass.id);
      setStudents(rows);
      setIsLoadingStudents(false);
    }
    load();
  }, [selectedClass]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !formName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createClass({
        teacher_id: profile.id,
        name: formName.trim(),
        school: formSchool.trim() || undefined,
        grade: formGrade.trim() || undefined,
      });
      if (created) {
        setClasses(prev => [created, ...prev]);
        setFormName('');
        setFormSchool('');
        setFormGrade('');
      }
    } catch (err) {
      console.error(err);
      setCreateError('Не удалось создать класс. Попробуйте ещё раз.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить класс? Результаты учеников останутся, но потеряют привязку.')) return;
    const ok = await deleteClass(id);
    if (ok) {
      setClasses(prev => prev.filter(c => c.id !== id));
      if (selectedId === id) setSearchParams({});
    }
  };

  const copyCode = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(label);
      setTimeout(() => setCopyMsg(null), 1500);
    } catch {
      /* ignore */
    }
  };

  if (isLoading || !user) {
    return null;
  }

  // ===== СТИЛИ =====
  const pageBg = isLight ? '#f5f5f5' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#141414';
  const cardBorder = isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1a1a1a' : '#ffffff';
  const textMuted = isLight ? '#555' : '#bbb';
  const inputBg = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';
  const inputBorder = isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.1)';

  // ===== АГРЕГАТЫ =====
  const preScores = students.map(s => s.pre_percentage).filter((v): v is number => v !== null);
  const postScores = students.map(s => s.post_percentage).filter((v): v is number => v !== null);
  const avgPre = avg(preScores);
  const avgPost = avg(postScores);
  const studentsWithBoth = students.filter(s => s.pre_percentage !== null && s.post_percentage !== null);
  const gains = studentsWithBoth.map(s => (s.post_percentage as number) - (s.pre_percentage as number));
  const avgGain = avg(gains);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ minHeight: 'calc(100vh - 200px)', backgroundColor: pageBg, padding: '2.5rem 1rem' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <h1 style={{ color: textPrimary, margin: 0, fontSize: '2rem', fontFamily: "'CCUltimatum', sans-serif" }}>
            Кабинет учителя
          </h1>
          <Link to="/account" style={{ color: '#FC6255', textDecoration: 'none', fontSize: '0.95rem' }}>
            ← В личный кабинет
          </Link>
        </div>

        {!selectedClass && (
          <>
            {/* Форма создания класса */}
            <div style={{ backgroundColor: cardBg, border: cardBorder, borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ color: textPrimary, marginTop: 0, marginBottom: '0.75rem', fontSize: '1.2rem' }}>Создать класс</h2>
              <p style={{ color: textMuted, marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem' }}>
                После создания вы получите 6-символьный код. Раздайте его ученикам — они вводят код перед тестом, и их результаты автоматически попадают сюда.
              </p>
              <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', color: textMuted, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Название *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="11Б, физика"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: inputBorder, backgroundColor: inputBg, color: textPrimary, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: textMuted, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Школа</label>
                  <input
                    type="text"
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    placeholder="Например: НИШ Астана"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: inputBorder, backgroundColor: inputBg, color: textPrimary, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: textMuted, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Параллель</label>
                  <input
                    type="text"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    placeholder="11"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: inputBorder, backgroundColor: inputBg, color: textPrimary, outline: 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !formName.trim()}
                  style={{
                    padding: '0.65rem 1.2rem',
                    backgroundColor: '#FC6255',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 50,
                    fontWeight: 700,
                    cursor: creating || !formName.trim() ? 'not-allowed' : 'pointer',
                    opacity: creating || !formName.trim() ? 0.6 : 1,
                    height: 'fit-content'
                  }}
                >
                  {creating ? '...' : 'Создать'}
                </button>
              </form>
              {createError && (
                <div style={{ color: '#FC6255', marginTop: '0.5rem', fontSize: '0.85rem' }}>{createError}</div>
              )}
            </div>

            {/* Список классов */}
            <div style={{ backgroundColor: cardBg, border: cardBorder, borderRadius: 16, padding: '1.5rem' }}>
              <h2 style={{ color: textPrimary, marginTop: 0, marginBottom: '1rem', fontSize: '1.2rem' }}>Мои классы</h2>
              {isLoadingClasses ? (
                <div style={{ color: textMuted }}>Загрузка…</div>
              ) : classes.length === 0 ? (
                <div style={{ color: textMuted }}>Пока нет классов. Создайте первый выше.</div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {classes.map(cls => (
                    <div key={cls.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.85rem 1rem',
                      borderRadius: 10,
                      backgroundColor: inputBg,
                      border: inputBorder,
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div>
                        <div style={{ color: textPrimary, fontWeight: 600 }}>{cls.name}</div>
                        <div style={{ color: textMuted, fontSize: '0.85rem' }}>
                          {[cls.school, cls.grade].filter(Boolean).join(' · ') || 'без школы'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <code style={{
                          padding: '0.35rem 0.7rem',
                          backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                          color: textPrimary,
                          borderRadius: 6,
                          letterSpacing: '0.1em',
                          fontFamily: 'monospace',
                          fontSize: '0.95rem'
                        }}>
                          {cls.join_code}
                        </code>
                        <button
                          onClick={() => setSearchParams({ id: cls.id })}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#4a90e2',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 50,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          Открыть
                        </button>
                        <button
                          onClick={() => handleDelete(cls.id)}
                          style={{
                            padding: '0.5rem 0.85rem',
                            backgroundColor: 'transparent',
                            color: textMuted,
                            border: inputBorder,
                            borderRadius: 50,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {selectedClass && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setSearchParams({})}
                style={{ background: 'none', border: 'none', color: '#FC6255', cursor: 'pointer', fontSize: '0.95rem', padding: 0 }}
              >
                ← Все классы
              </button>
            </div>

            <div style={{ backgroundColor: cardBg, border: cardBorder, borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ color: textPrimary, margin: 0, fontSize: '1.4rem' }}>{selectedClass.name}</h2>
                  <div style={{ color: textMuted, marginTop: '0.25rem', fontSize: '0.9rem' }}>
                    {[selectedClass.school, selectedClass.grade].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ color: textMuted, fontSize: '0.85rem' }}>Код:</div>
                  <code style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                    color: textPrimary,
                    borderRadius: 6,
                    letterSpacing: '0.1em',
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}>
                    {selectedClass.join_code}
                  </code>
                  <button
                    onClick={() => copyCode(selectedClass.join_code, 'Код скопирован')}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: inputBorder, backgroundColor: 'transparent', color: textPrimary, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Копировать
                  </button>
                  <button
                    onClick={() => copyCode(buildJoinUrl(selectedClass.join_code), 'Ссылка скопирована')}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: inputBorder, backgroundColor: 'transparent', color: textPrimary, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Скопировать ссылку
                  </button>
                  {copyMsg && (
                    <span style={{ color: '#4a90e2', fontSize: '0.85rem' }}>{copyMsg}</span>
                  )}
                </div>
              </div>

              {/* Сводка */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <StatCard label="Учеников" value={String(students.length)} bg={inputBg} border={inputBorder} textPrimary={textPrimary} textMuted={textMuted} />
                <StatCard label="Средний pre" value={fmtPct(avgPre)} bg={inputBg} border={inputBorder} textPrimary={textPrimary} textMuted={textMuted} />
                <StatCard label="Средний post" value={fmtPct(avgPost)} bg={inputBg} border={inputBorder} textPrimary={textPrimary} textMuted={textMuted} />
                <StatCard
                  label="Прирост (Δpp)"
                  value={avgGain === null ? '—' : `${avgGain > 0 ? '+' : ''}${Math.round(avgGain)}`}
                  bg={inputBg}
                  border={inputBorder}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  accent={avgGain === null ? undefined : avgGain >= 0 ? '#4caf50' : '#FC6255'}
                />
              </div>
            </div>

            <div style={{ backgroundColor: cardBg, border: cardBorder, borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ color: textPrimary, margin: '0 0 1rem', fontSize: '1.1rem' }}>Ученики</h3>
              {isLoadingStudents ? (
                <div style={{ color: textMuted }}>Загрузка…</div>
              ) : students.length === 0 ? (
                <div style={{ color: textMuted }}>
                  Пока никто не прошёл тест с этим кодом. Раздайте код или ссылку выше — результаты появятся здесь автоматически.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: textMuted, fontSize: '0.85rem' }}>
                        <th style={{ padding: '0.5rem 0.6rem' }}>Ученик</th>
                        <th style={{ padding: '0.5rem 0.6rem' }}>Код</th>
                        <th style={{ padding: '0.5rem 0.6rem' }}>Pre</th>
                        <th style={{ padding: '0.5rem 0.6rem' }}>Post</th>
                        <th style={{ padding: '0.5rem 0.6rem' }}>Прирост</th>
                        <th style={{ padding: '0.5rem 0.6rem' }}>Оценка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => {
                        const gain = (s.pre_percentage !== null && s.post_percentage !== null)
                          ? s.post_percentage - s.pre_percentage
                          : null;
                        return (
                          <tr key={s.user_code} style={{ borderTop: cardBorder, color: textPrimary }}>
                            <td style={{ padding: '0.6rem' }}>{s.student_name || <span style={{ color: textMuted }}>—</span>}</td>
                            <td style={{ padding: '0.6rem', color: textMuted, fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.user_code}</td>
                            <td style={{ padding: '0.6rem' }}>{fmtPct(s.pre_percentage)}</td>
                            <td style={{ padding: '0.6rem' }}>{fmtPct(s.post_percentage)}</td>
                            <td style={{ padding: '0.6rem', color: gain === null ? textMuted : gain >= 0 ? '#4caf50' : '#FC6255' }}>
                              {gain === null ? '—' : `${gain > 0 ? '+' : ''}${Math.round(gain)}`}
                            </td>
                            <td style={{ padding: '0.6rem', color: textMuted }}>{s.post_grade || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, bg, border, textPrimary, textMuted, accent }: {
  label: string;
  value: string;
  bg: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  accent?: string;
}) {
  return (
    <div style={{ padding: '0.85rem 1rem', borderRadius: 12, backgroundColor: bg, border }}>
      <div style={{ color: textMuted, fontSize: '0.8rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ color: accent || textPrimary, fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
