import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SpeakButton from './SpeakButton';
import PreQuiz from './PreQuiz';
import { setPreQuizCompleted } from '../lib/supabase';
import { useAccessibility } from '../context/AccessibilityContext';
import { glossaryTerms, glossaryCategories, type GlossaryTerm } from '../data/glossary';
import { isotopes, isotopeCategories, type Isotope } from '../data/halfLifeTable';
import { scientists, scientistCategories } from '../data/scientists';
import '../styles/page-layout.css';

type AnimationStatus = 'red' | 'yellow' | 'green';

const getStatusConfig = (t: (key: string) => string) => ({
  red: {
    color: '#ff4444',
    bgColor: 'rgba(255, 68, 68, 0.15)',
    borderColor: 'rgba(255, 68, 68, 0.4)',
    label: t('pageTemplate.statusIncorrect'),
    tooltip: t('pageTemplate.statusIncorrectTooltip')
  },
  yellow: {
    color: '#ffbb33',
    bgColor: 'rgba(255, 187, 51, 0.15)',
    borderColor: 'rgba(255, 187, 51, 0.4)',
    label: t('pageTemplate.statusMinorIssues'),
    tooltip: t('pageTemplate.statusMinorTooltip')
  },
  green: {
    color: '#00C851',
    bgColor: 'rgba(0, 200, 81, 0.15)',
    borderColor: 'rgba(0, 200, 81, 0.4)',
    label: t('pageTemplate.statusApproved'),
    tooltip: t('pageTemplate.statusApprovedTooltip')
  }
});

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
  const { t } = useTranslation();
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [showConstants, setShowConstants] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryCategory, setGlossaryCategory] = useState('all');
  const [showHalfLife, setShowHalfLife] = useState(false);
  const [halfLifeSearch, setHalfLifeSearch] = useState('');
  const [halfLifeCategory, setHalfLifeCategory] = useState('all');
  const [halfLifeSort, setHalfLifeSort] = useState<'halfLife' | 'halfLifeDesc' | 'atomicNumber' | 'nameAsc' | 'nameDesc'>('atomicNumber');
  const [showDecayModeTooltip, setShowDecayModeTooltip] = useState(false);
  const [showDecayProductsTooltip, setShowDecayProductsTooltip] = useState(false);
  const [showScientists, setShowScientists] = useState(false);
  const [scientistsSearch, setScientistsSearch] = useState('');
  const [scientistsCategory, setScientistsCategory] = useState('all');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcN0, setCalcN0] = useState('100');
  const [calcHalfLife, setCalcHalfLife] = useState('');
  const [calcTime, setCalcTime] = useState('');
  const [calcTimeUnit, setCalcTimeUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days' | 'years'>('years');
  const [calcHalfLifeUnit, setCalcHalfLifeUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days' | 'years'>('years');
  const [selectedIsotope, setSelectedIsotope] = useState('');
  const [showReferencesMenu, setShowReferencesMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
    const [showPreQuiz, setShowPreQuiz] = useState(false);
  const [showPreQuizWithCode, setShowPreQuizWithCode] = useState(false); // Для повторного прохождения
  const { lightTheme, enabled: a11yEnabled } = useAccessibility();
  const isLightTheme = a11yEnabled && lightTheme;
  const statusConfig = getStatusConfig(t);

  // Входной тест теперь не показывается автоматически
  // Пользователь может пройти его вручную через кнопку

  const handlePreQuizComplete = () => {
    setPreQuizCompleted();
    setShowPreQuiz(false);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return (
    <>
      {/* Входной тест - показывается перед первым просмотром анимации */}
      {showPreQuiz && <PreQuiz onComplete={handlePreQuizComplete} />}

      {/* Входной тест с полем кода - для повторного прохождения */}
      {showPreQuizWithCode && (
        <PreQuiz
          onComplete={() => {
            setShowPreQuizWithCode(false);
          }}
          showCodeField={true}
          onClose={() => setShowPreQuizWithCode(false)}
        />
      )}

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
                    {t('pageTemplate.noticeError')}{' '}
                    <a href="mailto:tgr.aimurza@gmail.com" style={{ color: '#FC6255' }}>
                      tgr.aimurza@gmail.com
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Player with Buttons Below */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto 1.5rem'
        }}>
          {/* Video */}
          <div style={{ width: '100%' }}>
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
                {t('pageTemplate.videoNotSupported')}
              </video>
            )}
          </div>

          {/* Buttons - Below Video */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'stretch',
            gap: '10px',
            width: '100%',
            padding: isMobile ? '0 10px' : '0'
          }}>
            {/* Desktop: show all buttons */}
            {!isMobile && (
              <>
                <button
                  onClick={() => setShowPeriodicTable(true)}
                  style={{
                    flex: '1 1 0',
                    minHeight: '44px',
                    padding: '10px 12px',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                  }}
                  title={t('pageTemplate.periodicTable')}
                >
                  <span style={{ fontSize: '1rem', opacity: 0.6, color: isLightTheme ? '#333' : 'inherit', flexShrink: 0 }}>⊞</span>
                  <span style={{ fontSize: '0.9rem', color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('pageTemplate.periodicTable')}</span>
                </button>
                <button
                  onClick={() => setShowConstants(true)}
                  style={{
                    flex: '1 1 0',
                    minHeight: '44px',
                    padding: '10px 12px',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                  }}
                  title={t('pageTemplate.constants')}
                >
                  <span style={{ fontSize: '1rem', opacity: 0.6, color: isLightTheme ? '#333' : 'inherit', flexShrink: 0 }}>≡</span>
                  <span style={{ fontSize: '0.9rem', color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('pageTemplate.constants')}</span>
                </button>
                <button
                  onClick={() => setShowGlossary(true)}
                  style={{
                    flex: '1 1 0',
                    minHeight: '44px',
                    padding: '10px 12px',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                  }}
                  title={t('pageTemplate.glossary')}
                >
                  <span style={{ fontSize: '0.85rem', opacity: 0.6, color: isLightTheme ? '#333' : 'inherit', flexShrink: 0, fontWeight: 'bold' }}>Aa</span>
                  <span style={{ fontSize: '0.9rem', color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('pageTemplate.glossary')}</span>
                </button>
                <button
                  onClick={() => setShowHalfLife(true)}
                  style={{
                    flex: '1 1 0',
                    minHeight: '44px',
                    padding: '10px 12px',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                  }}
                  title={t('pageTemplate.halfLifeTable')}
                >
                  <span style={{ fontSize: '1rem', opacity: 0.6, color: isLightTheme ? '#333' : 'inherit', flexShrink: 0 }}>τ½</span>
                  <span style={{ fontSize: '0.9rem', color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('pageTemplate.halfLifeTable')}</span>
                </button>
                <button
                  onClick={() => setShowScientists(true)}
                  style={{
                    flex: '1 1 0',
                    minHeight: '44px',
                    padding: '10px 12px',
                    background: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                  }}
                  title={t('pageTemplate.scientists')}
                >
                  <span style={{ fontSize: '1rem', opacity: 0.6, color: isLightTheme ? '#333' : 'inherit', flexShrink: 0 }}>⚛</span>
                  <span style={{ fontSize: '0.9rem', color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('pageTemplate.scientists')}</span>
                </button>
                <button
                  onClick={() => setShowCalculator(true)}
                  style={{
                    flex: '1 1 0',
                    minHeight: '44px',
                    padding: '10px 12px',
                    background: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                  }}
                  title={t('pageTemplate.calculator')}
                >
                  <span style={{ fontSize: '1rem', opacity: 0.6, color: isLightTheme ? '#333' : 'inherit', flexShrink: 0 }}>∑</span>
                  <span style={{ fontSize: '0.9rem', color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('pageTemplate.calculator')}</span>
                </button>
              </>
            )}

            {/* Mobile: single "Справочники" button with dropdown */}
            {isMobile && (
              <div style={{ position: 'relative', width: '100%' }}>
                <button
                  onClick={() => setShowReferencesMenu(!showReferencesMenu)}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <span style={{ fontSize: '0.9rem', color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }}>
                    Справочники
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    color: isLightTheme ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                    transform: showReferencesMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}>▼</span>
                </button>

                {/* Dropdown menu */}
                {showReferencesMenu && (
                  <>
                    <div
                      onClick={() => setShowReferencesMenu(false)}
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: isLightTheme ? '#ffffff' : '#2a2a2a',
                        borderRadius: '8px',
                        border: `1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'}`,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        zIndex: 100,
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        onClick={() => { setShowPeriodicTable(true); setShowReferencesMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: isLightTheme ? '#333' : '#fff',
                          fontSize: '0.9rem',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>⊞</span>
                        {t('pageTemplate.periodicTable')}
                      </button>
                      <button
                        onClick={() => { setShowConstants(true); setShowReferencesMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: isLightTheme ? '#333' : '#fff',
                          fontSize: '0.9rem',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>≡</span>
                        {t('pageTemplate.constants')}
                      </button>
                      <button
                        onClick={() => { setShowGlossary(true); setShowReferencesMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: isLightTheme ? '#333' : '#fff',
                          fontSize: '0.9rem',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ opacity: 0.6, fontWeight: 'bold', fontSize: '0.85rem' }}>Aa</span>
                        {t('pageTemplate.glossary')}
                      </button>
                      <button
                        onClick={() => { setShowHalfLife(true); setShowReferencesMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: isLightTheme ? '#333' : '#fff',
                          fontSize: '0.9rem',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>τ½</span>
                        {t('pageTemplate.halfLifeTable')}
                      </button>
                      <button
                        onClick={() => { setShowScientists(true); setShowReferencesMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: isLightTheme ? '#333' : '#fff',
                          fontSize: '0.9rem',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>⚛</span>
                        {t('pageTemplate.scientists')}
                      </button>
                      <button
                        onClick={() => { setShowCalculator(true); setShowReferencesMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: isLightTheme ? '#333' : '#fff',
                          fontSize: '0.9rem',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>∑</span>
                        {t('pageTemplate.calculator')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
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
              backgroundColor: isLightTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.95)',
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
              alt={t('pageTemplate.periodicTable')}
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
            className="constants-modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isLightTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.95)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: isMobile ? '10px' : '20px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && setShowConstants(false)}
          >
            <div
              className="constants-modal-content"
              style={{
                backgroundColor: isLightTheme ? '#ffffff' : '#1a1a1a',
                borderRadius: '15px',
                padding: isMobile ? '20px 15px' : '30px',
                maxWidth: '900px',
                width: '100%',
                margin: isMobile ? '20px 0' : '40px 0',
                border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isLightTheme ? '0 4px 20px rgba(0,0,0,0.15)' : 'none'
              }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '25px',
                gap: '15px'
              }}>
                <h2 style={{
                  color: isLightTheme ? '#1a1a1a' : '#ffffff',
                  margin: 0,
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  fontSize: isMobile ? '1.3rem' : '1.8rem',
                  lineHeight: 1.3,
                  flex: 1
                }}>
                  {t('pageTemplate.physicsConstants')}
                </h2>
                <button
                  onClick={() => setShowConstants(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isLightTheme ? '#333' : 'white',
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
              <h3 style={{ color: isLightTheme ? '#1976d2' : '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                {t('pageTemplate.fundamentalConstants')}
              </h3>
              <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '500px' : 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Величина</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Символ</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Значение</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: isLightTheme ? '#333' : '#ccc' }}>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Скорость света в вакууме</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>c</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>2,998 × 10<sup>8</sup> <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}><span style={{ borderBottom: isLightTheme ? '1px solid #333' : '1px solid #ccc', paddingBottom: '1px' }}>м</span><span style={{ paddingTop: '1px' }}>с</span></span></td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Постоянная Планка</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>h</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>6,626 × 10<sup>−34</sup> Дж·с</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Редуцированная постоянная Планка</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
                        ℏ = <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}>
                          <span style={{ borderBottom: isLightTheme ? '1px solid #1a1a1a' : '1px solid #fff', paddingBottom: '2px' }}>h</span>
                          <span style={{ paddingTop: '2px' }}>2π</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,055 × 10<sup>−34</sup> Дж·с</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Элементарный заряд</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>e</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,602 × 10<sup>−19</sup> Кл</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Электрическая постоянная</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>ε<sub>0</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>8,854 × 10<sup>−12</sup> <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}><span style={{ borderBottom: isLightTheme ? '1px solid #333' : '1px solid #ccc', paddingBottom: '1px' }}>Ф</span><span style={{ paddingTop: '1px' }}>м</span></span></td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Постоянная Кулона</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
                        k = <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}>
                          <span style={{ borderBottom: isLightTheme ? '1px solid #1a1a1a' : '1px solid #fff', paddingBottom: '2px' }}>1</span>
                          <span style={{ paddingTop: '2px' }}>4πε<sub>0</sub></span>
                        </span>
                      </td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>8,988 × 10<sup>9</sup> <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}><span style={{ borderBottom: isLightTheme ? '1px solid #333' : '1px solid #ccc', paddingBottom: '1px' }}>Н·м<sup>2</sup></span><span style={{ paddingTop: '1px' }}>Кл<sup>2</sup></span></span></td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Число Авогадро</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>N<sub>A</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>6,022 × 10<sup>23</sup> моль<sup>−1</sup></td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Постоянная Больцмана</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>k<sub>B</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,381 × 10<sup>−23</sup> <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}><span style={{ borderBottom: isLightTheme ? '1px solid #333' : '1px solid #ccc', paddingBottom: '1px' }}>Дж</span><span style={{ paddingTop: '1px' }}>К</span></span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Particle Masses */}
              <h3 style={{ color: isLightTheme ? '#1976d2' : '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                {t('pageTemplate.particleMasses')}
              </h3>
              <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '600px' : 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Частица</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Символ</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Масса (кг)</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Масса (а.е.м.)</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Энергия (МэВ)</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: isLightTheme ? '#333' : '#ccc' }}>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Электрон</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>m<sub>e</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>9,109 × 10<sup>−31</sup></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>0,000549</td>
                      <td style={{ padding: '10px' }}>0,511</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Протон</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>m<sub>p</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,673 × 10<sup>−27</sup></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,007276</td>
                      <td style={{ padding: '10px' }}>938,3</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Нейтрон</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>m<sub>n</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,675 × 10<sup>−27</sup></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,008665</td>
                      <td style={{ padding: '10px' }}>939,6</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Альфа-частица</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>m<sub>α</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>6,645 × 10<sup>−27</sup></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>4,001506</td>
                      <td style={{ padding: '10px' }}>3727,4</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Атомная единица массы</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff', whiteSpace: 'nowrap' }}>1 а.е.м.</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,661 × 10<sup>−27</sup></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,000000</td>
                      <td style={{ padding: '10px' }}>931,5</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Atomic Constants */}
              <h3 style={{ color: isLightTheme ? '#1976d2' : '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                {t('pageTemplate.atomicConstants')}
              </h3>
              <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '500px' : 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Величина</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Символ</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Значение</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: isLightTheme ? '#333' : '#ccc' }}>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Радиус Бора</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>a<sub>0</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>5,292 × 10<sup>−11</sup> м = 0,529 Å</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Постоянная Ридберга</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>R<sub>∞</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1,097 × 10<sup>7</sup> м<sup>−1</sup></td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Энергия ионизации водорода</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>E<sub>1</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>13,6 эВ</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Комптоновская длина волны электрона</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
                        λ<sub>C</sub> = <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}>
                          <span style={{ borderBottom: isLightTheme ? '1px solid #1a1a1a' : '1px solid #fff', paddingBottom: '2px' }}>h</span>
                          <span style={{ paddingTop: '2px' }}>m<sub>e</sub>c</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>2,426 × 10<sup>−12</sup> м</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Магнетон Бора</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>μ<sub>B</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>9,274 × 10<sup>−24</sup> <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}><span style={{ borderBottom: isLightTheme ? '1px solid #333' : '1px solid #ccc', paddingBottom: '1px' }}>Дж</span><span style={{ paddingTop: '1px' }}>Тл</span></span></td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Ядерный магнетон</td>
                      <td style={{ padding: '10px', color: isLightTheme ? '#1a1a1a' : '#fff' }}>μ<sub>N</sub></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>5,051 × 10<sup>−27</sup> <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}><span style={{ borderBottom: isLightTheme ? '1px solid #333' : '1px solid #ccc', paddingBottom: '1px' }}>Дж</span><span style={{ paddingTop: '1px' }}>Тл</span></span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Nuclear Constants */}
              <h3 style={{ color: isLightTheme ? '#1976d2' : '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                {t('pageTemplate.nuclearConstants')}
              </h3>
              <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '500px' : 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Величина</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Значение</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: isLightTheme ? '#333' : '#ccc' }}>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Радиус нуклона</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>r<sub>0</sub> ≈ 1,2–1,3 × 10<sup>−15</sup> м = 1,2–1,3 Фм</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Радиус ядра (эмпирическая формула)</td>
                      <td style={{ padding: '10px' }}>R = r<sub>0</sub> · A<sup>1/3</sup>, где A — массовое число</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Плотность ядерной материи</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>ρ ≈ 2,3 × 10<sup>17</sup> <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em', lineHeight: 1.1 }}><span style={{ borderBottom: isLightTheme ? '1px solid #333' : '1px solid #ccc', paddingBottom: '1px' }}>кг</span><span style={{ paddingTop: '1px' }}>м<sup>3</sup></span></span></td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Удельная энергия связи</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>≈ 8 МэВ/нуклон (для средних ядер)</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Энергия деления <sup>235</sup>U</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>≈ 200 МэВ на одно деление</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>Энергия синтеза D + T → He + n</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>≈ 17,6 МэВ</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Radiation */}
              <h3 style={{ color: isLightTheme ? '#1976d2' : '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                {t('pageTemplate.radiationCharacteristics')}
              </h3>
              <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '600px' : 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Тип</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Состав</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Заряд</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Пробег в воздухе</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: isLightTheme ? '#666' : '#888' }}>Защита</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: isLightTheme ? '#333' : '#ccc' }}>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>α (альфа)</td>
                      <td style={{ padding: '10px' }}><sup>4</sup><sub>2</sub>He</td>
                      <td style={{ padding: '10px' }}>+2e</td>
                      <td style={{ padding: '10px' }}>2–10 см</td>
                      <td style={{ padding: '10px' }}>Бумага, кожа</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>β<sup>−</sup> (бета-минус)</td>
                      <td style={{ padding: '10px' }}>e<sup>−</sup></td>
                      <td style={{ padding: '10px' }}>−e</td>
                      <td style={{ padding: '10px' }}>до нескольких м</td>
                      <td style={{ padding: '10px' }}>Алюминий (мм)</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>β<sup>+</sup> (бета-плюс)</td>
                      <td style={{ padding: '10px' }}>e<sup>+</sup></td>
                      <td style={{ padding: '10px' }}>+e</td>
                      <td style={{ padding: '10px' }}>до нескольких м</td>
                      <td style={{ padding: '10px' }}>Алюминий (мм)</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>γ (гамма)</td>
                      <td style={{ padding: '10px' }}>Фотон</td>
                      <td style={{ padding: '10px' }}>0</td>
                      <td style={{ padding: '10px' }}>сотни метров</td>
                      <td style={{ padding: '10px' }}>Свинец (см), бетон</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px' }}>n (нейтрон)</td>
                      <td style={{ padding: '10px' }}>Нейтрон</td>
                      <td style={{ padding: '10px' }}>0</td>
                      <td style={{ padding: '10px' }}>большой</td>
                      <td style={{ padding: '10px' }}>Вода, парафин, бетон</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Energy Conversions */}
              <h3 style={{ color: isLightTheme ? '#1976d2' : '#42a5f5', marginBottom: '15px', fontSize: '1.2rem' }}>
                {t('pageTemplate.energyUnits')}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '400px' : 'auto' }}>
                  <tbody style={{ color: isLightTheme ? '#333' : '#ccc' }}>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1 эВ (электронвольт)</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>= 1,602 × 10<sup>−19</sup> Дж</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1 кэВ</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>= 10<sup>3</sup> эВ = 1,602 × 10<sup>−16</sup> Дж</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1 МэВ</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>= 10<sup>6</sup> эВ = 1,602 × 10<sup>−13</sup> Дж</td>
                    </tr>
                    <tr style={{ borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>1 а.е.м. × c<sup>2</sup></td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>= 931,5 МэВ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Glossary Modal */}
        {showGlossary && (
          <div
            className="glossary-modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isLightTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.95)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: isMobile ? '10px' : '20px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && setShowGlossary(false)}
          >
            <div
              className="glossary-modal-content"
              style={{
                backgroundColor: isLightTheme ? '#ffffff' : '#1a1a1a',
                borderRadius: '15px',
                padding: isMobile ? '20px 15px' : '30px',
                maxWidth: '800px',
                width: '100%',
                margin: isMobile ? '20px 0' : '40px 0',
                border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isLightTheme ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
              }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
                gap: '15px'
              }}>
                <h2 style={{
                  color: isLightTheme ? '#1a1a1a' : '#ffffff',
                  margin: 0,
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  fontSize: isMobile ? '1.3rem' : '1.8rem',
                  lineHeight: 1.3,
                  flex: 1
                }}>
                  {t('pageTemplate.glossaryTitle')}
                </h2>
                <button
                  onClick={() => setShowGlossary(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isLightTheme ? '#333' : 'white',
                    fontSize: '1.8rem',
                    padding: '5px',
                    lineHeight: 1,
                    flexShrink: 0
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Search and Filter */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <input
                  type="text"
                  placeholder={t('pageTemplate.glossarySearch')}
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: isLightTheme ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                    color: isLightTheme ? '#333' : '#fff',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                <select
                  value={glossaryCategory}
                  onChange={(e) => setGlossaryCategory(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: isLightTheme ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                    color: isLightTheme ? '#333' : '#fff',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: isMobile ? '100%' : '200px'
                  }}
                >
                  <option value="all">{t('pageTemplate.glossaryCategories.all')}</option>
                  <option value="nuclear">{t('pageTemplate.glossaryCategories.nuclear')}</option>
                  <option value="quantum">{t('pageTemplate.glossaryCategories.quantum')}</option>
                  <option value="general">{t('pageTemplate.glossaryCategories.general')}</option>
                  <option value="electromagnetism">{t('pageTemplate.glossaryCategories.electromagnetism')}</option>
                  <option value="optics">{t('pageTemplate.glossaryCategories.optics')}</option>
                </select>
              </div>

              {/* Terms List */}
              <div style={{
                overflowY: 'auto',
                flex: 1
              }}>
                {(() => {
                  const filteredTerms = glossaryTerms.filter((term: GlossaryTerm) => {
                    const matchesCategory = glossaryCategory === 'all' || term.category === glossaryCategory;
                    const matchesSearch = glossarySearch === '' ||
                      term.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                      term.definition.toLowerCase().includes(glossarySearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  });

                  if (filteredTerms.length === 0) {
                    return (
                      <p style={{
                        color: isLightTheme ? '#666' : '#888',
                        textAlign: 'center',
                        padding: '40px 20px'
                      }}>
                        {t('pageTemplate.glossaryEmpty')}
                      </p>
                    );
                  }

                  return filteredTerms.map((term: GlossaryTerm) => (
                    <div
                      key={term.id}
                      style={{
                        padding: '16px',
                        marginBottom: '12px',
                        backgroundColor: isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        border: isLightTheme ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px'
                      }}>
                        <h4 style={{
                          margin: 0,
                          color: isLightTheme ? '#1976d2' : '#42a5f5',
                          fontSize: '1.1rem',
                          fontWeight: 600
                        }}>
                          {term.term}
                        </h4>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                          color: isLightTheme ? '#666' : '#888'
                        }}>
                          {glossaryCategories[term.category as keyof typeof glossaryCategories]}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        color: isLightTheme ? '#333' : '#ccc',
                        fontSize: '0.95rem',
                        lineHeight: 1.6
                      }}>
                        {term.definition}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Half-Life Table Modal */}
        {showHalfLife && (
          <div
            className="halflife-modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isLightTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.95)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: isMobile ? '10px' : '20px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && setShowHalfLife(false)}
          >
            <div
              className="halflife-modal-content"
              style={{
                backgroundColor: isLightTheme ? '#ffffff' : '#1a1a1a',
                borderRadius: '15px',
                padding: isMobile ? '20px 15px' : '30px',
                maxWidth: '1000px',
                width: '100%',
                margin: isMobile ? '20px 0' : '40px 0',
                border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isLightTheme ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
              }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
                gap: '15px'
              }}>
                <h2 style={{
                  color: isLightTheme ? '#1a1a1a' : '#ffffff',
                  margin: 0,
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  fontSize: isMobile ? '1.3rem' : '1.8rem',
                  lineHeight: 1.3,
                  flex: 1
                }}>
                  {t('pageTemplate.halfLifeTitle')}
                </h2>
                <button
                  onClick={() => setShowHalfLife(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isLightTheme ? '#333' : 'white',
                    fontSize: '1.8rem',
                    padding: '5px',
                    lineHeight: 1,
                    flexShrink: 0
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Search, Filter and Sort */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap'
              }}>
                <input
                  type="text"
                  placeholder={t('pageTemplate.halfLifeSearch')}
                  value={halfLifeSearch}
                  onChange={(e) => setHalfLifeSearch(e.target.value)}
                  style={{
                    flex: isMobile ? 'none' : 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: isLightTheme ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                    color: isLightTheme ? '#333' : '#fff',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                <select
                  value={halfLifeCategory}
                  onChange={(e) => setHalfLifeCategory(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: isLightTheme ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                    color: isLightTheme ? '#333' : '#fff',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="all">{t('pageTemplate.halfLifeCategories.all')}</option>
                  <option value="natural">{t('pageTemplate.halfLifeCategories.natural')}</option>
                  <option value="medical">{t('pageTemplate.halfLifeCategories.medical')}</option>
                  <option value="industrial">{t('pageTemplate.halfLifeCategories.industrial')}</option>
                  <option value="weapons">{t('pageTemplate.halfLifeCategories.weapons')}</option>
                  <option value="research">{t('pageTemplate.halfLifeCategories.research')}</option>
                </select>
                <select
                  value={halfLifeSort}
                  onChange={(e) => setHalfLifeSort(e.target.value as 'halfLife' | 'halfLifeDesc' | 'atomicNumber')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: isLightTheme ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                    color: isLightTheme ? '#333' : '#fff',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="atomicNumber">{t('pageTemplate.halfLifeSortZ')}</option>
                  <option value="halfLife">T½ ↑</option>
                  <option value="halfLifeDesc">T½ ↓</option>
                  <option value="nameAsc">{t('pageTemplate.halfLifeSortNameAsc')}</option>
                  <option value="nameDesc">{t('pageTemplate.halfLifeSortNameDesc')}</option>
                </select>
              </div>

              {/* Table */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {(() => {
                  let filteredIsotopes = isotopes.filter((iso: Isotope) => {
                    const matchesCategory = halfLifeCategory === 'all' || iso.category === halfLifeCategory;
                    const matchesSearch = halfLifeSearch === '' ||
                      iso.name.toLowerCase().includes(halfLifeSearch.toLowerCase()) ||
                      iso.element.toLowerCase().includes(halfLifeSearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  });

                  // Sort
                  filteredIsotopes = [...filteredIsotopes].sort((a, b) => {
                    if (halfLifeSort === 'atomicNumber') return a.atomicNumber - b.atomicNumber;
                    if (halfLifeSort === 'halfLife') return a.halfLifeSeconds - b.halfLifeSeconds;
                    if (halfLifeSort === 'halfLifeDesc') return b.halfLifeSeconds - a.halfLifeSeconds;
                    if (halfLifeSort === 'nameAsc') return a.name.localeCompare(b.name, 'ru');
                    if (halfLifeSort === 'nameDesc') return b.name.localeCompare(a.name, 'ru');
                    return 0;
                  });

                  if (filteredIsotopes.length === 0) {
                    return (
                      <p style={{
                        color: isLightTheme ? '#666' : '#888',
                        textAlign: 'center',
                        padding: '40px 20px'
                      }}>
                        {t('pageTemplate.halfLifeEmpty')}
                      </p>
                    );
                  }

                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                          <tr style={{ borderBottom: isLightTheme ? '2px solid rgba(0,0,0,0.2)' : '2px solid rgba(255,255,255,0.2)' }}>
                            <th style={{ textAlign: 'left', padding: '12px 10px', color: isLightTheme ? '#666' : '#888', fontWeight: 600 }}>
                              {t('pageTemplate.halfLifeColumns.isotope')}
                            </th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', color: isLightTheme ? '#666' : '#888', fontWeight: 600 }}>
                              {t('pageTemplate.halfLifeColumns.halfLife')}
                            </th>
                            <th style={{ textAlign: 'center', padding: '12px 10px', color: isLightTheme ? '#666' : '#888', fontWeight: 600, position: 'relative' }}>
                              <span
                                style={{ cursor: 'help', borderBottom: '1px dashed currentColor' }}
                                onMouseEnter={() => setShowDecayModeTooltip(true)}
                                onMouseLeave={() => setShowDecayModeTooltip(false)}
                              >
                                {t('pageTemplate.halfLifeColumns.decayMode')}
                              </span>
                              {showDecayModeTooltip && (
                                <div className="decay-tooltip" style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  background: '#1a1a1a',
                                  color: '#ffffff',
                                  padding: '14px 18px',
                                  borderRadius: '10px',
                                  fontSize: '0.85rem',
                                  lineHeight: 1.6,
                                  width: '280px',
                                  zIndex: 1001,
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                  textAlign: 'left',
                                  fontWeight: 400,
                                  border: '1px solid #333'
                                }}>
                                  <div style={{ marginBottom: '10px', fontWeight: 600, color: '#64b5f6', fontSize: '0.9rem' }}>Типы распада:</div>
                                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '1rem', minWidth: '24px' }}>α</span><span style={{ color: '#fff' }}>— испускание ядра гелия</span></div>
                                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#64b5f6', fontWeight: 700, fontSize: '1rem', minWidth: '24px' }}>β⁻</span><span style={{ color: '#fff' }}>— испускание электрона</span></div>
                                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#64b5f6', fontWeight: 700, fontSize: '1rem', minWidth: '24px' }}>β⁺</span><span style={{ color: '#fff' }}>— испускание позитрона</span></div>
                                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#ce93d8', fontWeight: 700, fontSize: '1rem', minWidth: '24px' }}>γ</span><span style={{ color: '#fff' }}>— испускание фотона</span></div>
                                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#81c784', fontWeight: 700, fontSize: '1rem', minWidth: '24px' }}>EC</span><span style={{ color: '#fff' }}>— электронный захват</span></div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#ffb74d', fontWeight: 700, fontSize: '1rem', minWidth: '24px' }}>IT</span><span style={{ color: '#fff' }}>— изомерный переход</span></div>
                                </div>
                              )}
                            </th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', color: isLightTheme ? '#666' : '#888', fontWeight: 600, position: 'relative' }}>
                              <span
                                style={{ cursor: 'help', borderBottom: '1px dashed currentColor' }}
                                onMouseEnter={() => setShowDecayProductsTooltip(true)}
                                onMouseLeave={() => setShowDecayProductsTooltip(false)}
                              >
                                {t('pageTemplate.halfLifeColumns.decayProducts')}
                              </span>
                              {showDecayProductsTooltip && (
                                <div className="decay-tooltip" style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  background: '#1a1a1a',
                                  color: '#ffffff',
                                  padding: '14px 18px',
                                  borderRadius: '10px',
                                  fontSize: '0.85rem',
                                  lineHeight: 1.6,
                                  width: '260px',
                                  zIndex: 1001,
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                  textAlign: 'left',
                                  fontWeight: 400,
                                  border: '1px solid #333'
                                }}>
                                  <div style={{ marginBottom: '8px', fontWeight: 600, color: '#64b5f6' }}>Продукты распада</div>
                                  <div style={{ color: '#ddd' }}>Дочерние ядра, образующиеся в результате распада.</div>
                                  <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}>
                                    <span style={{ color: '#aaa' }}>Формат:</span> <span style={{ color: '#64b5f6' }}>A</span>-<span style={{ color: '#81c784' }}>X</span>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>A — массовое число, X — элемент</div>
                                  </div>
                                </div>
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredIsotopes.map((iso: Isotope) => (
                            <tr
                              key={iso.id}
                              style={{
                                borderBottom: isLightTheme ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                      color: isLightTheme ? '#1976d2' : '#42a5f5',
                                      fontWeight: 600,
                                      fontSize: '1.2rem'
                                    }}>
                                      <sup style={{ fontSize: '0.7em', verticalAlign: 'super' }}>{iso.massNumber}</sup>{iso.element}
                                    </span>
                                    <span style={{
                                      fontSize: '0.7rem',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                      color: isLightTheme ? '#666' : '#999'
                                    }}>
                                      {isotopeCategories[iso.category as keyof typeof isotopeCategories]}
                                    </span>
                                  </div>
                                  <span style={{
                                    color: isLightTheme ? '#333' : '#ccc',
                                    fontSize: '0.9rem'
                                  }}>
                                    {iso.name}
                                  </span>
                                  {iso.description && (
                                    <span style={{
                                      color: isLightTheme ? '#666' : '#888',
                                      fontSize: '0.9rem',
                                      lineHeight: 1.5
                                    }}>
                                      {iso.description}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{
                                padding: '12px 10px',
                                color: isLightTheme ? '#333' : '#fff',
                                fontFamily: 'monospace',
                                fontSize: '0.95rem',
                                whiteSpace: 'nowrap'
                              }}>
                                {iso.halfLife}
                              </td>
                              <td style={{
                                padding: '12px 10px',
                                textAlign: 'center'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  backgroundColor: iso.decayMode.includes('α')
                                    ? 'rgba(252, 98, 85, 0.2)'
                                    : iso.decayMode.includes('β')
                                      ? 'rgba(66, 165, 245, 0.2)'
                                      : iso.decayMode.includes('γ')
                                        ? 'rgba(156, 39, 176, 0.2)'
                                        : iso.decayMode.includes('EC')
                                          ? 'rgba(129, 199, 132, 0.2)'
                                          : 'rgba(255, 183, 77, 0.2)',
                                  color: iso.decayMode.includes('α')
                                    ? '#FC6255'
                                    : iso.decayMode.includes('β')
                                      ? '#42a5f5'
                                      : iso.decayMode.includes('γ')
                                        ? '#ba68c8'
                                        : iso.decayMode.includes('EC')
                                          ? '#66bb6a'
                                          : '#ffb74d',
                                  fontSize: '0.85rem',
                                  fontWeight: 500
                                }}>
                                  {iso.decayMode}
                                </span>
                              </td>
                              <td style={{
                                padding: '12px 10px',
                                color: isLightTheme ? '#555' : '#aaa',
                                fontSize: '0.9rem'
                              }}>
                                {iso.decayProducts}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Scientists Modal */}
        {showScientists && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowScientists(false)}
          >
            <div
              style={{
                backgroundColor: isLightTheme ? '#fff' : '#1a1a1a',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '800px',
                maxHeight: '85vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${isLightTheme ? '#eee' : '#333'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.4rem',
                  color: isLightTheme ? '#333' : '#fff'
                }}>
                  {t('pageTemplate.scientistsTitle')}
                </h2>
                <button
                  onClick={() => setShowScientists(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.8rem',
                    cursor: 'pointer',
                    color: isLightTheme ? '#666' : '#888',
                    padding: '0 8px'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Search and Filter */}
              <div style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${isLightTheme ? '#eee' : '#333'}`,
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <input
                  type="text"
                  placeholder={t('pageTemplate.scientistsSearch')}
                  value={scientistsSearch}
                  onChange={(e) => setScientistsSearch(e.target.value)}
                  style={{
                    flex: '1 1 200px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                    backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                    color: isLightTheme ? '#333' : '#fff',
                    fontSize: '0.95rem'
                  }}
                />
                <select
                  value={scientistsCategory}
                  onChange={(e) => setScientistsCategory(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                    backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                    color: isLightTheme ? '#333' : '#fff',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">{t('pageTemplate.allCategories')}</option>
                  {Object.entries(scientistCategories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Scientists List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 24px'
              }}>
                {(() => {
                  const filtered = scientists.filter(s => {
                    const matchesSearch = scientistsSearch === '' ||
                      s.name.toLowerCase().includes(scientistsSearch.toLowerCase()) ||
                      s.nameEn.toLowerCase().includes(scientistsSearch.toLowerCase()) ||
                      s.achievements.some(a => a.toLowerCase().includes(scientistsSearch.toLowerCase()));
                    const matchesCategory = scientistsCategory === 'all' || s.category === scientistsCategory;
                    return matchesSearch && matchesCategory;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: isLightTheme ? '#666' : '#888'
                      }}>
                        {t('pageTemplate.noResults')}
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {filtered.map((scientist) => (
                        <div
                          key={scientist.id}
                          style={{
                            padding: '20px',
                            backgroundColor: isLightTheme ? '#f8f8f8' : '#252525',
                            borderRadius: '12px',
                            border: `1px solid ${isLightTheme ? '#eee' : '#333'}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <h3 style={{
                                margin: 0,
                                fontSize: '1.2rem',
                                color: '#64b5f6',
                                marginBottom: '4px'
                              }}>
                                {scientist.name}
                              </h3>
                              <div style={{
                                fontSize: '0.85rem',
                                color: isLightTheme ? '#666' : '#888'
                              }}>
                                {scientist.nameEn} • {scientist.years} • {scientist.country}
                              </div>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              backgroundColor: isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              color: isLightTheme ? '#555' : '#aaa'
                            }}>
                              {scientistCategories[scientist.category]}
                            </span>
                          </div>

                          <ul style={{
                            margin: '0 0 12px 0',
                            paddingLeft: '20px',
                            color: isLightTheme ? '#444' : '#ccc',
                            fontSize: '0.95rem',
                            lineHeight: 1.6
                          }}>
                            {scientist.achievements.map((achievement, idx) => (
                              <li key={idx}>{achievement}</li>
                            ))}
                          </ul>

                          {scientist.nobelPrize && (
                            <div style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(255, 215, 0, 0.15)',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              color: '#ffd700',
                              marginBottom: '8px'
                            }}>
                              🏆 {scientist.nobelPrize}
                            </div>
                          )}

                          {scientist.famousQuote && (
                            <div style={{
                              padding: '12px 16px',
                              backgroundColor: isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                              borderLeft: '3px solid #64b5f6',
                              borderRadius: '0 8px 8px 0',
                              fontStyle: 'italic',
                              color: isLightTheme ? '#555' : '#aaa',
                              fontSize: '0.9rem'
                            }}>
                              «{scientist.famousQuote}»
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Decay Calculator Modal */}
        {showCalculator && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowCalculator(false)}
          >
            <div
              style={{
                backgroundColor: isLightTheme ? '#fff' : '#1a1a1a',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${isLightTheme ? '#eee' : '#333'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.4rem',
                  color: isLightTheme ? '#333' : '#fff'
                }}>
                  {t('pageTemplate.calculatorTitle')}
                </h2>
                <button
                  onClick={() => setShowCalculator(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.8rem',
                    cursor: 'pointer',
                    color: isLightTheme ? '#666' : '#888',
                    padding: '0 8px'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Calculator Content */}
              <div style={{ padding: '24px' }}>
                {/* Isotope Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: isLightTheme ? '#555' : '#aaa',
                    fontSize: '0.9rem'
                  }}>
                    {t('pageTemplate.calcSelectIsotope')}
                  </label>
                  <select
                    value={selectedIsotope}
                    onChange={(e) => {
                      setSelectedIsotope(e.target.value);
                      const iso = isotopes.find(i => i.id === e.target.value);
                      if (iso) {
                        // Convert halfLifeSeconds to appropriate unit
                        const seconds = iso.halfLifeSeconds;
                        if (seconds >= 365.25 * 24 * 3600) {
                          setCalcHalfLife(String(seconds / (365.25 * 24 * 3600)));
                          setCalcHalfLifeUnit('years');
                        } else if (seconds >= 24 * 3600) {
                          setCalcHalfLife(String(seconds / (24 * 3600)));
                          setCalcHalfLifeUnit('days');
                        } else if (seconds >= 3600) {
                          setCalcHalfLife(String(seconds / 3600));
                          setCalcHalfLifeUnit('hours');
                        } else if (seconds >= 60) {
                          setCalcHalfLife(String(seconds / 60));
                          setCalcHalfLifeUnit('minutes');
                        } else {
                          setCalcHalfLife(String(seconds));
                          setCalcHalfLifeUnit('seconds');
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                      backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                      color: isLightTheme ? '#333' : '#fff',
                      fontSize: '0.95rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">{t('pageTemplate.calcManualInput')}</option>
                    {[...isotopes].sort((a, b) => a.name.localeCompare(b.name, 'ru')).map(iso => (
                      <option key={iso.id} value={iso.id}>
                        {iso.name} (T½ = {iso.halfLife})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Initial Amount */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: isLightTheme ? '#555' : '#aaa',
                    fontSize: '0.9rem'
                  }}>
                    {t('pageTemplate.calcInitialAmount')} (N₀)
                  </label>
                  <input
                    type="number"
                    value={calcN0}
                    onChange={(e) => setCalcN0(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                      backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                      color: isLightTheme ? '#333' : '#fff',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Half-life */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: isLightTheme ? '#555' : '#aaa',
                    fontSize: '0.9rem'
                  }}>
                    {t('pageTemplate.calcHalfLife')} (T½)
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      value={calcHalfLife}
                      onChange={(e) => {
                        setCalcHalfLife(e.target.value);
                        setSelectedIsotope('');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                        backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                        color: isLightTheme ? '#333' : '#fff',
                        fontSize: '1rem'
                      }}
                    />
                    <select
                      value={calcHalfLifeUnit}
                      onChange={(e) => setCalcHalfLifeUnit(e.target.value as typeof calcHalfLifeUnit)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                        backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                        color: isLightTheme ? '#333' : '#fff',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="seconds">{t('pageTemplate.calcSeconds')}</option>
                      <option value="minutes">{t('pageTemplate.calcMinutes')}</option>
                      <option value="hours">{t('pageTemplate.calcHours')}</option>
                      <option value="days">{t('pageTemplate.calcDays')}</option>
                      <option value="years">{t('pageTemplate.calcYears')}</option>
                    </select>
                  </div>
                </div>

                {/* Time */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: isLightTheme ? '#555' : '#aaa',
                    fontSize: '0.9rem'
                  }}>
                    {t('pageTemplate.calcTime')} (t)
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      value={calcTime}
                      onChange={(e) => setCalcTime(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                        backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                        color: isLightTheme ? '#333' : '#fff',
                        fontSize: '1rem'
                      }}
                    />
                    <select
                      value={calcTimeUnit}
                      onChange={(e) => setCalcTimeUnit(e.target.value as typeof calcTimeUnit)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isLightTheme ? '#ddd' : '#444'}`,
                        backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                        color: isLightTheme ? '#333' : '#fff',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="seconds">{t('pageTemplate.calcSeconds')}</option>
                      <option value="minutes">{t('pageTemplate.calcMinutes')}</option>
                      <option value="hours">{t('pageTemplate.calcHours')}</option>
                      <option value="days">{t('pageTemplate.calcDays')}</option>
                      <option value="years">{t('pageTemplate.calcYears')}</option>
                    </select>
                  </div>
                </div>

                {/* Result */}
                {(() => {
                  const n0 = parseFloat(calcN0) || 0;
                  const halfLife = parseFloat(calcHalfLife) || 0;
                  const time = parseFloat(calcTime) || 0;

                  // Convert to same units (seconds)
                  const unitToSeconds = {
                    seconds: 1,
                    minutes: 60,
                    hours: 3600,
                    days: 86400,
                    years: 365.25 * 86400
                  };

                  const halfLifeSeconds = halfLife * unitToSeconds[calcHalfLifeUnit];
                  const timeSeconds = time * unitToSeconds[calcTimeUnit];

                  if (n0 > 0 && halfLifeSeconds > 0 && timeSeconds >= 0) {
                    const n = n0 * Math.pow(0.5, timeSeconds / halfLifeSeconds);
                    const decayed = n0 - n;
                    const percentRemaining = (n / n0) * 100;
                    const halfLives = timeSeconds / halfLifeSeconds;

                    return (
                      <div style={{
                        padding: '20px',
                        backgroundColor: isLightTheme ? '#f0f7ff' : '#1e3a5f',
                        borderRadius: '12px',
                        border: `1px solid ${isLightTheme ? '#cce0ff' : '#2d5a8c'}`
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          color: isLightTheme ? '#666' : '#aaa',
                          marginBottom: '12px'
                        }}>
                          {t('pageTemplate.calcFormula')}:
                          <span style={{ fontStyle: 'italic', marginLeft: '10px', display: 'inline-flex', alignItems: 'flex-start', fontSize: '1.4rem' }}>
                            <span style={{ marginTop: '0.4em' }}>N = N<sub>0</sub> · 2</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.6em', marginLeft: '2px' }}>
                              <span style={{ marginTop: '0.3em' }}>(</span>
                              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                                <span>−t</span>
                                <span style={{ borderTop: '1px solid currentColor', paddingTop: '1px' }}>T<sub style={{ fontSize: '0.75em' }}>1/2</sub></span>
                              </span>
                              <span style={{ marginTop: '0.3em' }}>)</span>
                            </span>
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div style={{
                          height: '24px',
                          backgroundColor: isLightTheme ? '#ddd' : '#333',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          marginBottom: '16px'
                        }}>
                          <div style={{
                            width: `${percentRemaining}%`,
                            height: '100%',
                            backgroundColor: percentRemaining > 50 ? '#4caf50' : percentRemaining > 25 ? '#ff9800' : '#f44336',
                            transition: 'width 0.3s ease',
                            borderRadius: '12px'
                          }} />
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: isLightTheme ? '#666' : '#888', marginBottom: '4px' }}>
                              {t('pageTemplate.calcRemaining')}
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#64b5f6' }}>
                              {n.toFixed(n < 0.01 ? 6 : 2)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: isLightTheme ? '#666' : '#888', marginBottom: '4px' }}>
                              {t('pageTemplate.calcDecayed')}
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#ff7043' }}>
                              {decayed.toFixed(decayed < 0.01 ? 6 : 2)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: isLightTheme ? '#666' : '#888', marginBottom: '4px' }}>
                              {t('pageTemplate.calcPercentRemaining')}
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 600, color: isLightTheme ? '#333' : '#fff' }}>
                              {percentRemaining.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: isLightTheme ? '#666' : '#888', marginBottom: '4px' }}>
                              {t('pageTemplate.calcHalfLivesPassed')}
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 600, color: isLightTheme ? '#333' : '#fff' }}>
                              {halfLives.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      padding: '20px',
                      backgroundColor: isLightTheme ? '#f5f5f5' : '#252525',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: isLightTheme ? '#666' : '#888'
                    }}>
                      {t('pageTemplate.calcEnterValues')}
                    </div>
                  );
                })()}
              </div>
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
                {t('pageTemplate.description')}
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
            {t('pageTemplate.howToUse')}
          </h3>
          <ol style={{
            color: '#cccccc',
            fontSize: '1.05rem',
            lineHeight: '1.9',
            paddingLeft: '1.2rem',
            margin: 0
          }}>
            <li>{t('pageTemplate.howToUseStep1')}</li>
            <li>{t('pageTemplate.howToUseStep2')}</li>
            <li>{t('pageTemplate.howToUseStep3')}</li>
          </ol>
          <p style={{
            color: '#888',
            fontSize: '0.95rem',
            marginTop: '1rem',
            fontStyle: 'italic'
          }}>
            {t('pageTemplate.feedbackNote')} <a href="mailto:tgr.aimurza@gmail.com" style={{ color: '#FC6255' }}>tgr.aimurza@gmail.com</a>
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
                  color: '#ffffff',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  border: 'none',
                  textDecoration: 'none',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  lineHeight: 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#444'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#555'}
              >
                ← {prevLink.title}
              </Link>
            )}
            {/* Кнопка входного среза - только на первой странице раздела */}
            {!prevLink && section === 'Физика Атомного ядра' && (
              <button
                onClick={() => setShowPreQuizWithCode(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#4a90e2',
                  color: 'white',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  border: 'none',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3a7bc8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4a90e2'}
              >
                {t('pageTemplate.passPreTest')}
              </button>
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
                  color: '#ffffff',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  border: 'none',
                  textDecoration: 'none',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  lineHeight: 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e04e43'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FC6255'}
              >
                Следующее: {nextLink.title} →
              </Link>
            )}
          </div>
        )}

      </div>
    </motion.main>
    </>
  );
}
