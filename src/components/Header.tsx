import { Link } from 'react-router-dom';
import { sections } from '../data/topics';
import '../styles/header.css';

export default function Header() {
  // Show only Nuclear Physics section for now (hide Quantum Physics)
  const visibleSections = sections.filter(section => section.title === "Физика Атомного ядра");

  return (
    <header className="header">
      <nav className="nav-container">
        <Link to="/" className="logo">
          Physez
        </Link>
        <div className="nav-menu">
          {visibleSections.map((section) => (
            <div key={section.title} className="nav-item">
              <span>{section.title}</span>
              <div className="dropdown">
                {section.topics.map((topic) => (
                  <Link
                    key={topic.path}
                    to={topic.path}
                    className="dropdown-item"
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
