import { Link } from 'react-router-dom';
import { SITE_VERSION } from '../config/version';
import '../styles/footer.css';

export default function Footer() {
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
              Образовательная платформа для изучения раздела физики атомного ядра
            </p>
          </div>

          {/* Контакты */}
          <div>
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              color: '#fff'
            }}>
              Контакты
            </h3>
            <div style={{
              fontSize: '0.9rem',
              lineHeight: '1.8',
              color: '#cccccc'
            }}>
              <p>📧 Email: tgr.aimurza@gmail.com</p>
              <p>🏛️ Организация: Farabi University КазНУ</p>
            </div>
          </div>

          {/* Диссертация */}
          <div>
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              color: '#fff'
            }}>
              Диссертационное исследование
            </h3>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#bbb'
            }}>
              Научный руководитель:<br />Амренова Асем Уахитовна
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
            <span>© {currentYear} Physez | Aimurza Tagir. Все права защищены.</span>
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
              Условия использования
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
