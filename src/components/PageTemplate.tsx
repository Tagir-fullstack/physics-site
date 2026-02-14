import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SpeakButton from './SpeakButton';
import '../styles/page-layout.css';

type AnimationStatus = 'red' | 'yellow' | 'green';

const statusConfig = {
  red: {
    color: '#ff4444',
    bgColor: 'rgba(255, 68, 68, 0.15)',
    borderColor: 'rgba(255, 68, 68, 0.4)',
    label: 'Не является верной',
    tooltip: 'Анимация будет переделана, есть неточности в природе процесса'
  },
  yellow: {
    color: '#ffbb33',
    bgColor: 'rgba(255, 187, 51, 0.15)',
    borderColor: 'rgba(255, 187, 51, 0.4)',
    label: 'Мелкие неточности',
    tooltip: 'На данный момент является корректной анимацией с мелкими неточностями в анимации'
  },
  green: {
    color: '#00C851',
    bgColor: 'rgba(0, 200, 81, 0.15)',
    borderColor: 'rgba(0, 200, 81, 0.4)',
    label: 'Утверждена',
    tooltip: 'Утверждённый вариант анимации'
  }
};

interface PageTemplateProps {
  title: string;
  section: string;
  videoSrc?: string;
  description?: string | React.ReactNode;
  prevLink?: { path: string; title: string };
  nextLink?: { path: string; title: string };
  animationStatus?: AnimationStatus;
}

export default function PageTemplate({ title, section, videoSrc, description, prevLink, nextLink, animationStatus }: PageTemplateProps) {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [showConstants, setShowConstants] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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
        padding: '1.25rem 1rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '1100px'
      }}>
        <div style={{
          marginBottom: '0.3rem',
          color: '#888',
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textAlign: 'center'
        }}>
          {section}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.75rem',
          position: 'relative',
          maxWidth: '1000px',
          margin: '0 auto 0.75rem',
          gap: isMobile ? '8px' : '0'
        }}>
          <h1 style={{
            fontFamily: "'CCUltimatum', Arial, sans-serif",
            fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
            color: '#ffffff',
            fontWeight: 'bold',
            textAlign: 'center',
            margin: 0
          }}>
            {title}
          </h1>
          {animationStatus && (
            <div style={{
              position: isMobile ? 'relative' : 'absolute',
              right: isMobile ? 'auto' : 0,
              top: isMobile ? 'auto' : '50%',
              transform: isMobile ? 'none' : 'translateY(-50%)'
            }}>
              <button
                onClick={() => setShowTooltip(!showTooltip)}
                onBlur={() => setShowTooltip(false)}
                style={{
                  backgroundColor: statusConfig[animationStatus].bgColor,
                  border: `1px solid ${statusConfig[animationStatus].borderColor}`,
                  borderRadius: '14px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, opacity 0.2s',
                  outline: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <span style={{
                  color: statusConfig[animationStatus].color,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  fontFamily: "'CCUltimatum', Arial, sans-serif"
                }}>
                  Status
                </span>
              </button>
              {showTooltip && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: isMobile ? 'auto' : 0,
                  left: isMobile ? '50%' : 'auto',
                  transform: isMobile ? 'translateX(-50%)' : 'none',
                  marginTop: '8px',
                  backgroundColor: '#1a1a1a',
                  border: `1px solid ${statusConfig[animationStatus].borderColor}`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  maxWidth: '300px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  zIndex: 100
                }}>
                  <div style={{
                    color: statusConfig[animationStatus].color,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '6px'
                  }}>
                    {statusConfig[animationStatus].label}
                  </div>
                  <div style={{
                    color: '#ccc',
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    marginBottom: '10px'
                  }}>
                    {statusConfig[animationStatus].tooltip}
                  </div>
                  <div style={{
                    color: '#888',
                    fontSize: '0.75rem',
                    lineHeight: 1.4,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '8px'
                  }}>
                    Заметили ошибку? Напишите на{' '}
                    <a href="mailto:tgr.aimurza@gmail.com" style={{ color: '#FC6255' }}>
                      tgr.aimurza@gmail.com
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Player with Side Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '1200px',
          margin: '0 auto 1.5rem',
          padding: isMobile ? '0' : '0'
        }}>
          {/* Left Button - Periodic Table (desktop only) */}
          {!isMobile && (
            <button
              onClick={() => setShowPeriodicTable(true)}
              style={{
                width: '36px',
                minHeight: '300px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              title="Таблица Менделеева"
            >
              <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>⊞</span>
            </button>
          )}

          {/* Video */}
          <div style={{ flex: 1, maxWidth: isMobile ? '100%' : '1000px', width: '100%' }}>
            {videoSrc && (
              <video
                controls
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: isMobile ? '0' : '10px',
                  backgroundColor: '#000'
                }}
              >
                <source src={videoSrc} type="video/mp4" />
                Ваш браузер не поддерживает видео
              </video>
            )}
          </div>

          {/* Right Button - Constants Table (desktop only) */}
          {!isMobile && (
            <button
              onClick={() => setShowConstants(true)}
              style={{
                width: '36px',
                minHeight: '300px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              title="Физические константы"
            >
              <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>≡</span>
            </button>
          )}

          {/* Mobile Buttons - Below Video */}
          {isMobile && (
            <div style={{
              display: 'flex',
              gap: '10px',
              width: '100%',
              padding: '0 10px'
            }}>
              <button
                onClick={() => setShowPeriodicTable(true)}
                style={{
                  flex: 1,
                  height: '44px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                title="Таблица Менделеева"
              >
                <span style={{ fontSize: '1rem', opacity: 0.6 }}>⊞</span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Таблица Менделеева</span>
              </button>
              <button
                onClick={() => setShowConstants(true)}
                style={{
                  flex: 1,
                  height: '44px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                title="Физические константы"
              >
                <span style={{ fontSize: '1rem', opacity: 0.6 }}>≡</span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Константы</span>
              </button>
            </div>
          )}
        </div>

        {/* Periodic Table Modal */}
        {showPeriodicTable && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.95)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              cursor: 'pointer'
            }}
            onClick={() => setShowPeriodicTable(false)}
          >
            <img
              src="/images/periodic-table.png"
              alt="Таблица Менделеева"
              style={{
                maxWidth: '95vw',
                maxHeight: '95vh',
                objectFit: 'contain',
                borderRadius: '10px'
              }}
            />
            <button
              onClick={() => setShowPeriodicTable(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontSize: '2rem',
                padding: '10px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Constants Modal */}
        {showConstants && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.95)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: '20px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && setShowConstants(false)}
          >
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '15px',
              padding: '30px',
              maxWidth: '900px',
              width: '100%',
              margin: '40px 0',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px'
              }}>
                <h2 style={{
                  color: '#ffffff',
                  margin: 0,
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  fontSize: '1.8rem'
                }}>
                  Физические константы атомной и ядерной физики
                </h2>
                <button
                  onClick={() => setShowConstants(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '1.8rem',
                    padding: '5px',
                    lineHeight: 1,
                    flexShrink: 0
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Fundamental Constants */}
              <h3 style={{ color: '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                Фундаментальные константы
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Величина</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Символ</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Значение</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#ccc' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Скорость света в вакууме</td>
                    <td style={{ padding: '10px', color: '#fff' }}>c</td>
                    <td style={{ padding: '10px' }}>2,998 × 10⁸ м/с</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Постоянная Планка</td>
                    <td style={{ padding: '10px', color: '#fff' }}>h</td>
                    <td style={{ padding: '10px' }}>6,626 × 10⁻³⁴ Дж·с</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Редуцированная постоянная Планка</td>
                    <td style={{ padding: '10px', color: '#fff' }}>ℏ = h/2π</td>
                    <td style={{ padding: '10px' }}>1,055 × 10⁻³⁴ Дж·с</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Элементарный заряд</td>
                    <td style={{ padding: '10px', color: '#fff' }}>e</td>
                    <td style={{ padding: '10px' }}>1,602 × 10⁻¹⁹ Кл</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Электрическая постоянная</td>
                    <td style={{ padding: '10px', color: '#fff' }}>ε₀</td>
                    <td style={{ padding: '10px' }}>8,854 × 10⁻¹² Ф/м</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Постоянная Кулона</td>
                    <td style={{ padding: '10px', color: '#fff' }}>k = 1/(4πε₀)</td>
                    <td style={{ padding: '10px' }}>8,988 × 10⁹ Н·м²/Кл²</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Число Авогадро</td>
                    <td style={{ padding: '10px', color: '#fff' }}>Nₐ</td>
                    <td style={{ padding: '10px' }}>6,022 × 10²³ моль⁻¹</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Постоянная Больцмана</td>
                    <td style={{ padding: '10px', color: '#fff' }}>kB</td>
                    <td style={{ padding: '10px' }}>1,381 × 10⁻²³ Дж/К</td>
                  </tr>
                </tbody>
              </table>

              {/* Particle Masses */}
              <h3 style={{ color: '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                Массы частиц
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Частица</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Символ</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Масса (кг)</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Масса (а.е.м.)</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Энергия (МэВ)</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#ccc' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Электрон</td>
                    <td style={{ padding: '10px', color: '#fff' }}>mₑ</td>
                    <td style={{ padding: '10px' }}>9,109 × 10⁻³¹</td>
                    <td style={{ padding: '10px' }}>0,000549</td>
                    <td style={{ padding: '10px' }}>0,511</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Протон</td>
                    <td style={{ padding: '10px', color: '#fff' }}>mₚ</td>
                    <td style={{ padding: '10px' }}>1,673 × 10⁻²⁷</td>
                    <td style={{ padding: '10px' }}>1,007276</td>
                    <td style={{ padding: '10px' }}>938,3</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Нейтрон</td>
                    <td style={{ padding: '10px', color: '#fff' }}>mₙ</td>
                    <td style={{ padding: '10px' }}>1,675 × 10⁻²⁷</td>
                    <td style={{ padding: '10px' }}>1,008665</td>
                    <td style={{ padding: '10px' }}>939,6</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Альфа-частица</td>
                    <td style={{ padding: '10px', color: '#fff' }}>mα</td>
                    <td style={{ padding: '10px' }}>6,645 × 10⁻²⁷</td>
                    <td style={{ padding: '10px' }}>4,001506</td>
                    <td style={{ padding: '10px' }}>3727,4</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Атомная единица массы</td>
                    <td style={{ padding: '10px', color: '#fff' }}>1 а.е.м.</td>
                    <td style={{ padding: '10px' }}>1,661 × 10⁻²⁷</td>
                    <td style={{ padding: '10px' }}>1,000000</td>
                    <td style={{ padding: '10px' }}>931,5</td>
                  </tr>
                </tbody>
              </table>

              {/* Atomic Constants */}
              <h3 style={{ color: '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                Атомные константы
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Величина</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Символ</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Значение</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#ccc' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Радиус Бора</td>
                    <td style={{ padding: '10px', color: '#fff' }}>a₀</td>
                    <td style={{ padding: '10px' }}>5,292 × 10⁻¹¹ м = 0,529 Å</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Постоянная Ридберга</td>
                    <td style={{ padding: '10px', color: '#fff' }}>R∞</td>
                    <td style={{ padding: '10px' }}>1,097 × 10⁷ м⁻¹</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Энергия ионизации водорода</td>
                    <td style={{ padding: '10px', color: '#fff' }}>E₁</td>
                    <td style={{ padding: '10px' }}>13,6 эВ</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Комптоновская длина волны электрона</td>
                    <td style={{ padding: '10px', color: '#fff' }}>λc = h/(mₑc)</td>
                    <td style={{ padding: '10px' }}>2,426 × 10⁻¹² м</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Магнетон Бора</td>
                    <td style={{ padding: '10px', color: '#fff' }}>μB</td>
                    <td style={{ padding: '10px' }}>9,274 × 10⁻²⁴ Дж/Тл</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Ядерный магнетон</td>
                    <td style={{ padding: '10px', color: '#fff' }}>μN</td>
                    <td style={{ padding: '10px' }}>5,051 × 10⁻²⁷ Дж/Тл</td>
                  </tr>
                </tbody>
              </table>

              {/* Nuclear Constants */}
              <h3 style={{ color: '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                Ядерные константы
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Величина</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Значение</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#ccc' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Радиус нуклона</td>
                    <td style={{ padding: '10px' }}>r₀ ≈ 1,2–1,3 × 10⁻¹⁵ м = 1,2–1,3 Фм</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Радиус ядра (эмпирическая формула)</td>
                    <td style={{ padding: '10px' }}>R = r₀ × A^(1/3), где A — массовое число</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Плотность ядерной материи</td>
                    <td style={{ padding: '10px' }}>ρ ≈ 2,3 × 10¹⁷ кг/м³</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Удельная энергия связи</td>
                    <td style={{ padding: '10px' }}>≈ 8 МэВ/нуклон (для средних ядер)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Энергия деления U-235</td>
                    <td style={{ padding: '10px' }}>≈ 200 МэВ на одно деление</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>Энергия синтеза D + T → He + n</td>
                    <td style={{ padding: '10px' }}>≈ 17,6 МэВ</td>
                  </tr>
                </tbody>
              </table>

              {/* Radiation */}
              <h3 style={{ color: '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                Характеристики излучения
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Тип</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Состав</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Заряд</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Пробег в воздухе</th>
                    <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Защита</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#ccc' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>α (альфа)</td>
                    <td style={{ padding: '10px' }}>⁴₂He</td>
                    <td style={{ padding: '10px' }}>+2e</td>
                    <td style={{ padding: '10px' }}>2–10 см</td>
                    <td style={{ padding: '10px' }}>Бумага, кожа</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>β⁻ (бета-минус)</td>
                    <td style={{ padding: '10px' }}>e⁻</td>
                    <td style={{ padding: '10px' }}>−e</td>
                    <td style={{ padding: '10px' }}>до нескольких м</td>
                    <td style={{ padding: '10px' }}>Алюминий (мм)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>β⁺ (бета-плюс)</td>
                    <td style={{ padding: '10px' }}>e⁺</td>
                    <td style={{ padding: '10px' }}>+e</td>
                    <td style={{ padding: '10px' }}>до нескольких м</td>
                    <td style={{ padding: '10px' }}>Алюминий (мм)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>γ (гамма)</td>
                    <td style={{ padding: '10px' }}>Фотон</td>
                    <td style={{ padding: '10px' }}>0</td>
                    <td style={{ padding: '10px' }}>сотни метров</td>
                    <td style={{ padding: '10px' }}>Свинец (см), бетон</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>n (нейтрон)</td>
                    <td style={{ padding: '10px' }}>Нейтрон</td>
                    <td style={{ padding: '10px' }}>0</td>
                    <td style={{ padding: '10px' }}>большой</td>
                    <td style={{ padding: '10px' }}>Вода, парафин, бетон</td>
                  </tr>
                </tbody>
              </table>

              {/* Energy Conversions */}
              <h3 style={{ color: '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                Единицы энергии
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody style={{ color: '#ccc' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>1 эВ (электронвольт)</td>
                    <td style={{ padding: '10px' }}>= 1,602 × 10⁻¹⁹ Дж</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>1 кэВ</td>
                    <td style={{ padding: '10px' }}>= 10³ эВ = 1,602 × 10⁻¹⁶ Дж</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>1 МэВ</td>
                    <td style={{ padding: '10px' }}>= 10⁶ эВ = 1,602 × 10⁻¹³ Дж</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px' }}>1 а.е.м. × c²</td>
                    <td style={{ padding: '10px' }}>= 931,5 МэВ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: 'clamp(1.25rem, 3vw, 2rem)',
            marginBottom: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            maxWidth: '1000px',
            margin: '0 auto 1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{
                fontSize: '1.3rem',
                color: '#ffffff',
                margin: 0
              }}>
                Описание
              </h3>
              <SpeakButton textRef={descriptionRef} />
            </div>
            <div ref={descriptionRef} className="description-content" style={{
              color: '#cccccc',
              fontSize: '1.1rem',
              lineHeight: '1.8'
            }}>
              {description}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '10px',
          padding: 'clamp(1.25rem, 3vw, 2rem)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.5rem',
          maxWidth: '1000px',
          margin: '0 auto 1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            marginBottom: '1rem',
            color: '#ffffff'
          }}>
            Как использовать видео
          </h3>
          <ol style={{
            color: '#cccccc',
            fontSize: '1.05rem',
            lineHeight: '1.9',
            paddingLeft: '1.2rem',
            margin: 0
          }}>
            <li>Сначала прочитайте описание видео выше</li>
            <li>Запустите видео и останавливайте в нужных местах</li>
            <li>Описывайте процесс на видео для интерактивности с учениками</li>
          </ol>
          <p style={{
            color: '#888',
            fontSize: '0.95rem',
            marginTop: '1rem',
            fontStyle: 'italic'
          }}>
            Все неточности в видео или пожелания можете написать на почту: <a href="mailto:tgr.aimurza@gmail.com" style={{ color: '#FC6255' }}>tgr.aimurza@gmail.com</a>
          </p>
        </div>

        {/* Navigation Buttons */}
        {(prevLink || nextLink) && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '1rem',
            flexWrap: 'wrap'
          }}>
            {prevLink && (
              <Link
                to={prevLink.path}
                className="prev-link-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#555',
                  color: 'white',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#444'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#555'}
              >
                <span style={{ fontSize: '1.2rem' }}>←</span>
                {prevLink.title}
              </Link>
            )}
            {nextLink && (
              <Link
                to={nextLink.path}
                className="next-link-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#FC6255',
                  color: 'white',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e04e43'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FC6255'}
              >
                Следующее: {nextLink.title}
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.main>
  );
}
