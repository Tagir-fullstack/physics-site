import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import '../styles/page-layout.css';

export default function Teacher() {
  const { user, profile, isLoading } = useAuth();
  const { enabled: a11yEnabled, lightTheme } = useAccessibility();
  const isLight = a11yEnabled && lightTheme;
  const navigate = useNavigate();

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

        <div style={{ backgroundColor: cardBg, border: cardBorder, borderRadius: 16, padding: '2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛠</div>
          <h2 style={{ color: textPrimary, marginTop: 0, marginBottom: '0.75rem', fontSize: '1.3rem' }}>
            Классы и КТП/КСП — в разработке
          </h2>
          <p style={{ color: textMuted, marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Мы переезжаем на новую инфраструктуру. Скоро здесь появится создание классов,
            хранилище КТП/КСП/СОР/СОЧ и авто‑генерация конспектов по расписанию.
          </p>
          <p style={{ color: textMuted, marginTop: 0, marginBottom: 0, fontSize: '0.85rem' }}>
            Следите за обновлениями в <Link to="/changelog" style={{ color: '#4a90e2' }}>changelog</Link>.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
