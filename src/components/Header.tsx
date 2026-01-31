import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sections } from '../data/topics';
import '../styles/header.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const visibleSections = sections.filter(section => section.title === "Физика Атомного ядра");

  const handleLinkClick = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="header">
      <nav className="nav-container">
        <Link to="/" className="logo" onClick={() => setIsMenuOpen(false)}>
          Physez
        </Link>

        <button
          className={`burger ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Меню"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Overlay for closing menu */}
        {isMenuOpen && (
          <div
            className="menu-overlay"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
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
      </nav>
    </header>
  );
}
