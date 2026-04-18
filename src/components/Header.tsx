import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sections } from '../data/topics';
import { useAccessibility } from '../context/AccessibilityContext';
import { useQuizMode } from '../context/QuizModeContext';
import { useAuth } from '../context/AuthContext';
import AccessibilityPanel from './AccessibilityPanel';
import AuthModal from './auth/AuthModal';
import UserMenu from './auth/UserMenu';
import '../styles/header.css';
import '../styles/accessibility.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const menuTimeoutRef = useRef<number | null>(null);
  const a11yTimeoutRef = useRef<number | null>(null);
  const authTimeoutRef = useRef<number | null>(null);

  const { enabled, setEnabled } = useAccessibility();
  const { isQuizActive } = useQuizMode();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const visibleSections = sections.filter(section => section.title === "Физика Атомного ядра");

  // Burger menu handlers
  const openMenu = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    if (a11yTimeoutRef.current) {
      clearTimeout(a11yTimeoutRef.current);
      a11yTimeoutRef.current = null;
    }
    setIsA11yOpen(false);
    setIsAuthOpen(false);
    setIsMenuOpen(true);
  };

  const closeMenuWithDelay = () => {
    menuTimeoutRef.current = window.setTimeout(() => {
      setIsMenuOpen(false);
    }, 200);
  };

  // Accessibility panel handlers
  const openA11y = () => {
    if (a11yTimeoutRef.current) {
      clearTimeout(a11yTimeoutRef.current);
      a11yTimeoutRef.current = null;
    }
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    if (!enabled) setEnabled(true);
    setIsMenuOpen(false);
    setIsAuthOpen(false);
    setIsA11yOpen(true);
  };

  const closeA11yWithDelay = () => {
    a11yTimeoutRef.current = window.setTimeout(() => {
      setIsA11yOpen(false);
    }, 200);
  };

  const keepA11yOpen = () => {
    if (a11yTimeoutRef.current) {
      clearTimeout(a11yTimeoutRef.current);
      a11yTimeoutRef.current = null;
    }
  };

  // Auth menu handlers
  const openAuth = () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    if (a11yTimeoutRef.current) {
      clearTimeout(a11yTimeoutRef.current);
      a11yTimeoutRef.current = null;
    }
    setIsMenuOpen(false);
    setIsA11yOpen(false);
    setIsAuthOpen(true);
  };

  const closeAuthWithDelay = () => {
    authTimeoutRef.current = window.setTimeout(() => {
      setIsAuthOpen(false);
    }, 200);
  };

  const keepAuthOpen = () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
  };

  const handleLinkClick = (path: string) => {
    if (isQuizActive) return; // Блокируем навигацию во время теста
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Overlay for closing menu - outside header */}
      {isMenuOpen && (
        <div
          className="menu-overlay"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <header className="header" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsMenuOpen(false);
            setIsA11yOpen(false);
            setIsAuthOpen(false);
          }
        }}>
        <nav className="nav-container" onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMenuOpen(false);
              setIsA11yOpen(false);
              setIsAuthOpen(false);
            }
          }}>
          <Link to="/" className="logo"
            onClick={(e) => {
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
            <div
              className={`nav-menu ${isMenuOpen && !isQuizActive ? 'open' : ''}`}
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuWithDelay}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsMenuOpen(false);
                }
              }}
            >
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
              <button
                className="nav-quiz-btn"
                onClick={() => handleLinkClick('/nuclear/quiz')}
              >
                {t('header.finalTest')}
              </button>
            </div>

            {/* Порядок: Доступность -> Бургер -> Аккаунт */}
            <button
              className="a11y-header-btn"
              onClick={() => {
                if (!enabled) setEnabled(true);
                setIsMenuOpen(false);
                setIsAuthOpen(false);
                setIsA11yOpen(!isA11yOpen);
              }}
              onMouseEnter={openA11y}
              onMouseLeave={closeA11yWithDelay}
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
              onClick={() => {
                if (!isQuizActive) {
                  setIsA11yOpen(false);
                  setIsAuthOpen(false);
                  setIsMenuOpen(!isMenuOpen);
                }
              }}
              onMouseEnter={() => {
                if (!isQuizActive) {
                  openMenu();
                }
              }}
              onMouseLeave={closeMenuWithDelay}
              aria-label="Меню"
              style={isQuizActive ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {isLoading ? (
              <div className="auth-btn-skeleton" />
            ) : user ? (
              <button
                className="auth-user-btn"
                onClick={() => setIsAuthOpen(!isAuthOpen)}
                onMouseEnter={openAuth}
                onMouseLeave={closeAuthWithDelay}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </button>
            ) : (
              <button
                className="auth-login-btn"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Войти
              </button>
            )}
          </div>
        </nav>
      </header>
      <AccessibilityPanel
        isOpen={isA11yOpen}
        onClose={() => setIsA11yOpen(false)}
        onMouseEnter={keepA11yOpen}
        onMouseLeave={closeA11yWithDelay}
      />
      <UserMenu
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onMouseEnter={keepAuthOpen}
        onMouseLeave={closeAuthWithDelay}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
