import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SITE_VERSION } from '../config/version';
import '../styles/footer.css';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      borderTop: '1px solid #333',
      paddingTop: '3rem',
      paddingBottom: '2rem',
      marginTop: 'auto'
    }}>
      <div className="footer-content" style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* О сайте */}
          <div>
            <h3 className="logo" style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              fontFamily: "'CCUltimatum', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '0'
            }}>
              <span style={{ color: '#FC6255' }}>Phys</span>
              <span style={{ color: '#fff' }}>ez</span>
            </h3>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#cccccc'
            }}>
              {t('footer.about')}
            </p>
          </div>

          {/* Контакты */}
          <div>
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              color: '#fff'
            }}>
              {t('footer.contacts')}
            </h3>
            <div style={{
              fontSize: '0.9rem',
              lineHeight: '1.8',
              color: '#cccccc'
            }}>
              <p>Email: tgr.aimurza@gmail.com</p>
              <p>{t('footer.organization')}: Farabi University КазНУ</p>
            </div>
          </div>

          {/* Научный руководитель */}
          <div>
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              color: '#fff'
            }}>
              {t('footer.supervisorTitle')}
            </h3>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#bbb'
            }}>
              Амренова Асем Уахитовна
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          borderTop: '1px solid #333',
          paddingTop: '1.5rem',
          textAlign: 'center',
          color: '#999',
          fontSize: '0.9rem'
        }}>
          <p style={{
            margin: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span>© {currentYear} Physez | Aimurza Tagir. {t('footer.copyright')}</span>
            <span style={{ color: '#666' }}>|</span>
            <a href="/terms" style={{
              color: '#FC6255',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#FC6255'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
            >
              {t('footer.terms')}
            </a>
            <Link to="/changelog" style={{
              color: '#888',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.3s ease',
              fontSize: '0.85rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#888'}
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
