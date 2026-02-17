import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sections } from '../data/topics';
import { useAccessibility } from '../context/AccessibilityContext';
import { useQuizMode } from '../context/QuizModeContext';
import AccessibilityPanel from './AccessibilityPanel';
import '../styles/header.css';
import '../styles/accessibility.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const { enabled, setEnabled } = useAccessibility();
  const { isQuizActive } = useQuizMode();
  const navigate = useNavigate();
  const visibleSections = sections.filter(section => section.title === "Физика Атомного ядра");

  const handleLinkClick = (path: string) => {
    if (isQuizActive) return; // Блокируем навигацию во время теста
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <header className="header">
        <nav className="nav-container">
          <Link to="/" className="logo" onClick={(e) => {
            if (isQuizActive) {
              e.preventDefault();
              return;
            }
            setIsMenuOpen(false);
          }} style={isQuizActive ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
            <img src="/favicon1.png" alt="" className="logo-icon" />
            <span className="logo-phys">Phys</span>
            <span className="logo-ez">ez</span>
          </Link>

          <div className="nav-right">
            <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`} style={isQuizActive ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
              {visibleSections.map((section) => (
                <div key={section.title} className="nav-item">
                  <span className="nav-title">{section.title}</span>
                  <div className="dropdown">
                    {section.topics.map((topic) => (
                      <button
                        key={topic.path}
                        className="dropdown-item"
                        onClick={() => handleLinkClick(topic.path)}
                      >
                        {topic.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="a11y-header-btn"
              onClick={() => {
                if (!enabled) setEnabled(true);
                setIsA11yOpen(!isA11yOpen);
              }}
              aria-label="Режим доступности"
              title="Доступность"
            >
              <svg className="a11y-icon" viewBox="0 0 40 40" fill="currentColor">
                <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="20" cy="10" r="2.8" />
                <path d="M20 13.5l-7 2c-0.6 0.2-0.9 0.7-0.8 1.3 0.2 0.6 0.7 0.9 1.3 0.8L18 16v5l-3.5 6c-0.3 0.5-0.1 1.2 0.4 1.5 0.5 0.3 1.2 0.1 1.5-0.4L20 22l3.6 6.1c0.3 0.5 1 0.7 1.5 0.4 0.5-0.3 0.7-1 0.4-1.5L22 21v-5l4.5 1.6c0.6 0.2 1.1-0.2 1.3-0.8 0.2-0.6-0.2-1.1-0.8-1.3l-7-2z" />
              </svg>
            </button>

            <button
              className={`burger ${isMenuOpen ? 'active' : ''}`}
              onClick={() => !isQuizActive && setIsMenuOpen(!isMenuOpen)}
              aria-label="Меню"
              style={isQuizActive ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>

          {/* Overlay for closing menu */}
          {isMenuOpen && (
            <div
              className="menu-overlay"
              onClick={() => setIsMenuOpen(false)}
            />
          )}
        </nav>
      </header>
      <AccessibilityPanel isOpen={isA11yOpen} onClose={() => setIsA11yOpen(false)} />
    </>
  );
}
