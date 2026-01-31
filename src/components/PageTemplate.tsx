import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../styles/page-layout.css';

interface PageTemplateProps {
  title: string;
  section: string;
  videoSrc?: string;
  description?: string;
  nextLink?: { path: string; title: string };
}

export default function PageTemplate({ title, section, videoSrc, description, nextLink }: PageTemplateProps) {
  return (
    <motion.main
      className="page-content"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      style={{
        marginTop: '80px',
        minHeight: 'calc(100vh - 80px)',
        padding: '1.5rem 1rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '900px'
      }}>
        <div style={{
          marginBottom: '0.5rem',
          color: '#666',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textAlign: 'center'
        }}>
          {section}
        </div>

        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
          color: '#000',
          marginBottom: '1.5rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {title}
        </h1>

        {/* Video Player - Centered */}
        <div style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto 1.5rem'
        }}>
          {videoSrc && (
            <video
              controls
              style={{
                width: '100%',
                borderRadius: '10px',
                backgroundColor: '#000'
              }}
            >
              <source src={videoSrc} type="video/mp4" />
              Ваш браузер не поддерживает видео
            </video>
          )}
        </div>

        {/* Description */}
        {description && (
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            padding: 'clamp(1rem, 3vw, 1.5rem)',
            marginBottom: '1.5rem',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '0.75rem',
              color: '#333'
            }}>
              Описание
            </h3>
            <p style={{
              color: '#444',
              fontSize: '1rem',
              lineHeight: '1.7'
            }}>
              {description}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          backgroundColor: '#fffbf0',
          borderRadius: '10px',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          border: '2px solid #f0e6d2',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            marginBottom: '0.75rem',
            color: '#333'
          }}>
            Как использовать видео
          </h3>
          <ol style={{
            color: '#555',
            fontSize: '0.95rem',
            lineHeight: '1.8',
            paddingLeft: '1.2rem',
            margin: 0
          }}>
            <li>Сначала прочитайте описание видео выше</li>
            <li>Запустите видео и останавливайте в нужных местах</li>
            <li>Описывайте процесс на видео для интерактивности с учениками</li>
          </ol>
          <p style={{
            color: '#666',
            fontSize: '0.9rem',
            marginTop: '1rem',
            fontStyle: 'italic'
          }}>
            Все неточности в видео или пожелания можете написать на почту: <a href="mailto:tagir@example.com" style={{ color: '#667eea' }}>tagir@example.com</a>
          </p>
        </div>

        {/* Next Video Button */}
        {nextLink && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '1rem'
          }}>
            <Link
              to={nextLink.path}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#667eea',
                color: 'white',
                padding: '0.875rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6fd6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
            >
              Следующее: {nextLink.title}
              <span style={{ fontSize: '1.2rem' }}>→</span>
            </Link>
          </div>
        )}
      </div>
    </motion.main>
  );
}
