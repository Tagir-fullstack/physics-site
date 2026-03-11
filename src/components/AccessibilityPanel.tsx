import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../context/AccessibilityContext';
// TODO: LANGUAGE_SWITCHER - Раскомментировать когда будет готов полный перевод сайта
// import LanguageSwitcher from './LanguageSwitcher';
import '../styles/accessibility.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function AccessibilityPanel({ isOpen, onClose, onMouseEnter, onMouseLeave }: Props) {
  const { t } = useTranslation();
  const {
    fontSize, setFontSize,
    highContrast, setHighContrast,
    lightTheme, setLightTheme,
    speechRate, setSpeechRate,
    resetAll,
  } = useAccessibility();

  return (
    <>
      {isOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 900 }} onClick={onClose} />}
      <div
        className={`a11y-panel ${isOpen ? 'a11y-panel--open' : ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="a11y-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="a11y-panel__title">{t('accessibility.title')}</h2>
          {/* TODO: LANGUAGE_SWITCHER - Раскомментировать когда будет готов полный перевод сайта */}
          {/* <LanguageSwitcher compact /> */}
        </div>

        <div className="a11y-panel__content">
          {/* Font Size */}
          <div className="a11y-section">
            <span className="a11y-section__label">{t('accessibility.fontSize')}</span>
            <div className="a11y-font-buttons">
              <button
                className={`a11y-font-btn ${fontSize === 'normal' ? 'a11y-font-btn--active' : ''}`}
                onClick={() => setFontSize('normal')}
              >
                А
              </button>
              <button
                className={`a11y-font-btn a11y-font-btn--large ${fontSize === 'large' ? 'a11y-font-btn--active' : ''}`}
                onClick={() => setFontSize('large')}
              >
                А+
              </button>
              <button
                className={`a11y-font-btn a11y-font-btn--xlarge ${fontSize === 'xlarge' ? 'a11y-font-btn--active' : ''}`}
                onClick={() => setFontSize('xlarge')}
              >
                А++
              </button>
            </div>
          </div>

          {/* Light Theme */}
          <div className="a11y-section">
            <span className="a11y-section__label">{t('accessibility.lightTheme')}</span>
            <button
              className={`a11y-toggle ${lightTheme ? 'a11y-toggle--on' : ''}`}
              onClick={() => setLightTheme(!lightTheme)}
              role="switch"
              aria-checked={lightTheme}
            >
              <span className="a11y-toggle__thumb" />
            </button>
          </div>

          {/* High Contrast */}
          <div className="a11y-section">
            <span className="a11y-section__label">{t('accessibility.highContrast')}</span>
            <button
              className={`a11y-toggle ${highContrast ? 'a11y-toggle--on' : ''}`}
              onClick={() => setHighContrast(!highContrast)}
              role="switch"
              aria-checked={highContrast}
            >
              <span className="a11y-toggle__thumb" />
            </button>
          </div>


          {/* Speech Rate */}
          <div className="a11y-section" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="a11y-section__label">{t('accessibility.speechRate')}</span>
              <span className="a11y-section__label" style={{ fontSize: '0.85rem' }}>×{speechRate.toFixed(1)}</span>
            </div>
            <input
              type="range"
              className="a11y-range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#999' }}>
              <span>{t('accessibility.slow')}</span>
              <span>{t('accessibility.fast')}</span>
            </div>
          </div>

          {/* Reset */}
          <button className="a11y-reset-btn" onClick={resetAll}>
            {t('accessibility.resetAll')}
          </button>
        </div>
      </div>
    </>
  );
}
