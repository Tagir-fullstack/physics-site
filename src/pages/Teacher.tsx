import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { isEmailAdmin } from '../lib/apiClient';
import CurrentWeekWidget from '../components/teacher/CurrentWeekWidget';
import '../styles/page-layout.css';

const teacherRoles = new Set([
  'teacher',
  'lecturer',
  'assistant',
  'professor',
  'associate_professor',
  'lab_assistant',
]);

export default function Teacher() {
  const { user, profile, isLoading } = useAuth();
  const { enabled: a11yEnabled, lightTheme } = useAccessibility();
  const isLight = a11yEnabled && lightTheme;
  const navigate = useNavigate();
  const isAdmin = isEmailAdmin(user?.email);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (!isAdmin && profile && !teacherRoles.has(profile.role)) {
      navigate('/account');
    }
  }, [user, profile, isLoading, isAdmin, navigate]);

  if (isLoading || !user) return null;

  const pageBg = isLight ? '#f5f5f5' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#141414';
  const cardBorder = isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1a1a1a' : '#ffffff';
  const textMuted = isLight ? '#555' : '#bbb';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ minHeight: 'calc(100vh - 200px)', backgroundColor: pageBg, padding: '6.5rem 1rem 2.5rem' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <h1 style={{ color: textPrimary, margin: 0, fontSize: '2rem', fontFamily: "'CCUltimatum', sans-serif" }}>
            Кабинет учителя
          </h1>
          <Link to="/account" style={{ color: '#FC6255', textDecoration: 'none', fontSize: '0.95rem' }}>
            ← В личный кабинет
          </Link>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {isAdmin && <CurrentWeekWidget isLight={isLight} />}

          <Link
            to="/teacher/tests"
            style={{
              display: 'block',
              background: isLight ? 'linear-gradient(135deg, #fff, #eef5ff)' : 'linear-gradient(135deg, #141414, #111d2b)',
              border: isLight ? '1px solid rgba(74,144,226,.22)' : '1px solid rgba(74,144,226,.3)',
              borderRadius: 16,
              padding: '1.35rem 1.25rem',
              textDecoration: 'none',
              color: textPrimary,
            }}
          >
            <div style={{ color: '#4a90e2', fontSize: '.75rem', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.35rem' }}>Новое · PRO</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.3rem' }}>Тесты и классы →</div>
            <div style={{ color: textMuted, fontSize: '0.9rem' }}>
              Шаблоны XLSX, коды для учеников, назначение работ и мониторинг результатов.
            </div>
          </Link>

          {isAdmin && (
            <Link
              to="/teacher/ktp"
              style={{
                display: 'block',
                backgroundColor: cardBg,
                border: cardBorder,
                borderRadius: 16,
                padding: '1.25rem 1.25rem',
                textDecoration: 'none',
                color: textPrimary,
              }}
            >
              <div style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '0.25rem' }}>Мои КТП →</div>
              <div style={{ color: textMuted, fontSize: '0.9rem' }}>
                Загрузка docx и просмотр календарно-тематических планов.
              </div>
            </Link>
          )}

          <div style={{ backgroundColor: cardBg, border: cardBorder, borderRadius: 16, padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛠</div>
            <h2 style={{ color: textPrimary, marginTop: 0, marginBottom: '0.75rem', fontSize: '1.3rem' }}>
              Классы, расписание, СОР/СОЧ — в разработке
            </h2>
            <p style={{ color: textMuted, marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              КТП уже доступно. Скоро — классы, расписание, СОР/СОЧ и авто-генерация конспектов.
            </p>
            <p style={{ color: textMuted, marginTop: 0, marginBottom: 0, fontSize: '0.85rem' }}>
              Следите за обновлениями в <Link to="/changelog" style={{ color: '#4a90e2' }}>changelog</Link>.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
