import { useAccessibility } from '../context/AccessibilityContext';
import '../styles/accessibility.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessibilityPanel({ isOpen, onClose }: Props) {
  const {
    fontSize, setFontSize,
    highContrast, setHighContrast,
    reducedMotion, setReducedMotion,
    lightTheme, setLightTheme,
    resetAll,
  } = useAccessibility();

  return (
    <>
      {isOpen && <div className="a11y-overlay" onClick={onClose} />}
      <div className={`a11y-panel ${isOpen ? 'a11y-panel--open' : ''}`}>
        <div className="a11y-panel__header">
          <h2 className="a11y-panel__title">Доступность</h2>
          <button className="a11y-panel__close" onClick={onClose} aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="a11y-panel__content">
          {/* Font Size */}
          <div className="a11y-section">
            <span className="a11y-section__label">Размер шрифта</span>
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
            <span className="a11y-section__label">Светлая тема</span>
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
            <span className="a11y-section__label">Высокий контраст</span>
            <button
              className={`a11y-toggle ${highContrast ? 'a11y-toggle--on' : ''}`}
              onClick={() => setHighContrast(!highContrast)}
              role="switch"
              aria-checked={highContrast}
            >
              <span className="a11y-toggle__thumb" />
            </button>
          </div>

          {/* Reduced Motion */}
          <div className="a11y-section">
            <span className="a11y-section__label">Без анимаций</span>
            <button
              className={`a11y-toggle ${reducedMotion ? 'a11y-toggle--on' : ''}`}
              onClick={() => setReducedMotion(!reducedMotion)}
              role="switch"
              aria-checked={reducedMotion}
            >
              <span className="a11y-toggle__thumb" />
            </button>
          </div>

          {/* Reset */}
          <button className="a11y-reset-btn" onClick={resetAll}>
            Сбросить все
          </button>
        </div>
      </div>
    </>
  );
}
