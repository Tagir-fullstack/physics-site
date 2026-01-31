import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sections } from '../data/topics';
import '../styles/header.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const visibleSections = sections.filter(section => section.title === "Физика Атомного ядра");

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

        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          {visibleSections.map((section) => (
            <div key={section.title} className="nav-item">
              <span className="nav-title">{section.title}</span>
              <div className="dropdown">
                {section.topics.map((topic) => (
                  <Link
                    key={topic.path}
                    to={topic.path}
                    className="dropdown-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {topic.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}
