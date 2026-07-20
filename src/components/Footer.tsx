import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SITE_VERSION } from '../config/version';
import { useQuizMode } from '../context/QuizModeContext';
import '../styles/footer.css';

export default function Footer() {
  const { t } = useTranslation();
  const { isQuizActive } = useQuizMode();
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  // Скрываем футер во время теста и на странице презентации
  if (isQuizActive || location.pathname === '/thesis') {
    return null;
  }

  return (
    <footer style={{
      backgroundColor: '#0a0a0a',
      color: '#cccccc',
      borderTop: '1px solid #222',
      paddingTop: '1.5rem',
      paddingBottom: '1rem',
      marginTop: 'auto'
    }}>
      <div className="footer-content" style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 2rem'
      }}>
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          marginBottom: '1rem'
        }}>
          {/* О сайте */}
          <div style={{ textAlign: 'center' }}>
            <h3 className="logo" style={{
              fontSize: '1.1rem',
              marginBottom: '0.5rem',
              fontFamily: "'CCUltimatum', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0'
            }}>
              <span style={{ color: '#c05348' }}>Phys</span>
              <span style={{ color: '#bbb' }}>ez</span>
            </h3>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#888'
            }}>
              {t('footer.about')}
            </p>
          </div>

          {/* Контакты */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{
              fontSize: '1.1rem',
              marginBottom: '0.5rem',
              color: '#bbb'
            }}>
              {t('footer.contacts')}
            </h3>
            <div style={{
              fontSize: '0.9rem',
              lineHeight: '1.8',
              color: '#888'
            }}>
              <p>Email: tgr.aimurza@gmail.com</p>
            </div>
          </div>

          {/* Награда */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{
              fontSize: '1.1rem',
              marginBottom: '0.5rem',
              color: '#bbb'
            }}>
              Награда
            </h3>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#c05348',
              textShadow: '0 0 8px rgba(192, 83, 72, 0.2)'
            }}>
              Диплом III степени
            </p>
            <p style={{
              fontSize: '0.82rem',
              lineHeight: '1.5',
              color: '#888',
              marginTop: '0.25rem'
            }}>
              Министерство Просвещения РК
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          borderTop: '1px solid #222',
          paddingTop: '1rem',
          textAlign: 'center',
          color: '#777',
          fontSize: '0.85rem'
        }}>
          <p style={{
            margin: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span className="footer-copyright-text">© {currentYear} Physez | Aimurza Tagir. {t('footer.copyright')}</span>
            <span className="footer-sep" style={{ color: '#444' }}>|</span>
            <a href="/terms" style={{
              color: '#c05348',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#c05348'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
            >
              {t('footer.terms')}
            </a>
            <span className="footer-sep" style={{ color: '#444' }}>|</span>
            <Link to="/privacy" style={{
              color: '#c05348',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#c05348'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
            >
              Конфиденциальность
            </Link>
            <Link to="/changelog" style={{
              color: '#666',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.3s ease',
              fontSize: '0.85rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#666'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
            >
              {SITE_VERSION}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
