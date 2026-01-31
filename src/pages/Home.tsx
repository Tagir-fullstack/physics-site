import { motion } from 'framer-motion';
import '../styles/page-layout.css';
import '../styles/hero.css';

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        minHeight: '100vh'
      }}
    >
      {/* Hero Section with Background */}
      <div className="hero-section" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        paddingTop: 'calc(6rem + 80px)',
        paddingBottom: '6rem',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Добро пожаловать на Physez
        </h1>
        <p style={{
          fontSize: '1.3rem',
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: '1.8',
          opacity: 0.95
        }}>
          Образовательная платформа для изучения физики с визуализациями и анимациями
        </p>
      </div>

      {/* Welcome Content */}
      <div className="page-content" style={{
        paddingTop: '4rem',
        paddingBottom: '4rem'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* О сайте */}
          <section style={{
            marginBottom: '3rem',
            backgroundColor: '#f8f9fa',
            padding: '2.5rem',
            borderRadius: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{
              fontSize: '2rem',
              color: '#000',
              marginBottom: '1.5rem',
              borderBottom: '3px solid #667eea',
              paddingBottom: '0.5rem',
              display: 'inline-block'
            }}>
              О проекте
            </h2>
            <p style={{
              fontSize: '1.1rem',
              lineHeight: '1.8',
              color: '#333',
              marginBottom: '1rem'
            }}>
              Данный сайт создан в рамках диссертационного исследования с целью повышения эффективности
              образовательного процесса при изучении сложных разделов физики — квантовой физики и физики атомного ядра.
            </p>
            <p style={{
              fontSize: '1.1rem',
              lineHeight: '1.8',
              color: '#333'
            }}>
              Я убежден, что современные технологии визуализации и интерактивные анимации способны сделать
              абстрактные физические концепции более понятными и доступными для учеников и преподавателей.
            </p>
          </section>

          {/* Цель */}
          <section style={{
            marginBottom: '3rem',
            backgroundColor: '#fff',
            padding: '2.5rem',
            borderRadius: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            border: '1px solid #e0e0e0'
          }}>
            <h2 style={{
              fontSize: '2rem',
              color: '#000',
              marginBottom: '1.5rem',
              borderBottom: '3px solid #764ba2',
              paddingBottom: '0.5rem',
              display: 'inline-block'
            }}>
              Моя цель
            </h2>
            <ul style={{
              fontSize: '1.1rem',
              lineHeight: '2',
              color: '#333',
              paddingLeft: '1.5rem'
            }}>
              <li>Предоставить качественные образовательные материалы по физике</li>
              <li>Использовать современные анимации для визуализации сложных процессов</li>
              <li>Создать интерактивную платформу для самостоятельного изучения</li>
              {/* <li>Поддержать преподавателей методическими пособиями</li> */}
            </ul>
          </section>

          {/* Нововведения */}
          <section style={{
            backgroundColor: '#fffbf0',
            padding: '2.5rem',
            borderRadius: '15px',
            border: '2px solid #f0e6d2'
          }}>
            <h2 style={{
              fontSize: '2rem',
              color: '#000',
              marginBottom: '1.5rem',
              borderBottom: '3px solid #ffa500',
              paddingBottom: '0.5rem',
              display: 'inline-block'
            }}>
              Ближайшие нововведения
            </h2>
            <div style={{
              fontSize: '1.1rem',
              lineHeight: '1.8',
              color: '#333'
            }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Видео-лекции:</strong> Профессиональные анимации, созданные на Python,
                для каждой темы курса
              </p>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Система комментариев:</strong> Возможность обсуждать материалы и задавать вопросы
              </p>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Методические пособия:</strong> Подробные руководства по использованию
                анимаций в образовательном процессе
              </p>
              <p>
                <strong>Тестирование:</strong> Интерактивные тесты для проверки знаний
              </p>
            </div>
          </section>
        </div>
      </div>
    </motion.main>
  );
}
