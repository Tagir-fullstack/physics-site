import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import VideoPlaceholder from './VideoPlaceholder';
import '../styles/page-layout.css';

interface PageTemplateProps {
  title: string;
  section: string;
  videoSrc?: string;
  children?: ReactNode;
}

export default function PageTemplate({ title, section, videoSrc, children }: PageTemplateProps) {
  return (
    <motion.main
      className="page-content"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      style={{
        marginTop: '100px',
        minHeight: 'calc(100vh - 100px)',
        paddingTop: '2rem',
        paddingBottom: '2rem',
        margin: '100px auto 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{
        width: '100%'
      }}>
        <div style={{
          marginBottom: '1rem',
          color: '#666',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textAlign: 'center'
        }}>
          {section}
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          color: '#000',
          marginBottom: '2rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {title}
        </h1>

        {/* Video and Comments Section */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {/* Video Player */}
          <div style={{ flex: '1 1 600px', minWidth: '300px' }}>
            {videoSrc ? (
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
            ) : children || (
              <VideoPlaceholder
                title={title}
                description="Видео будет создано в Manim"
              />
            )}
          </div>

          {/* Comments Section */}
          <div style={{
            flex: '0 1 350px',
            minWidth: '300px',
            backgroundColor: '#f5f5f5',
            borderRadius: '10px',
            padding: '1.5rem',
            maxHeight: '500px',
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              marginBottom: '1rem',
              color: '#333'
            }}>
              Комментарии
            </h3>
            <p style={{
              color: '#999',
              fontSize: '0.9rem',
              fontStyle: 'italic'
            }}>
              Здесь будут комментарии пользователей
            </p>
          </div>
        </div>

        {/* Methodological Guide Section */}
        <div style={{
          backgroundColor: '#fffbf0',
          borderRadius: '10px',
          padding: '2rem',
          border: '2px solid #f0e6d2',
          width: '100%'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            marginBottom: '1rem',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            Методическое пособие
          </h3>
          <p style={{
            color: '#999',
            fontSize: '0.95rem',
            fontStyle: 'italic',
            lineHeight: '1.6'
          }}>
            Здесь будет размещено методическое пособие по применению данной анимации в образовательном процессе
          </p>
        </div>
      </div>
    </motion.main>
  );
}
