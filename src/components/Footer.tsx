import '../styles/footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
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
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              color: '#fff'
            }}>
              Physez
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
              <p>📱 Телефон: +7 (XXX) XXX-XX-XX</p>
              <p>🏛️ Организация: Farabi University КазНУ</p>
            </div>
          </div>

          {/* Быстрые ссылки */}
          <div>
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              color: '#fff'
            }}>
              Разделы
            </h3>
            <div style={{
              fontSize: '0.9rem',
              lineHeight: '1.8',
              color: '#cccccc'
            }}>
              <p>• Физика Атомного ядра</p>
              {/* <p>• Квантовая физика</p>
              <p>• Методические материалы</p> */}
            </div>
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
          <p style={{ margin: 0 }}>
            © {currentYear} Physez | Aimurza Tagir. Все права защищены.
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
            Диссертационное исследование
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
            <a href="/terms" style={{
              color: '#667eea',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#667eea'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
            >
              Условия использования
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
