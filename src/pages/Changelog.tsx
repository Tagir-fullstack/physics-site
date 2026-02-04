import { motion } from 'framer-motion';
import { SITE_VERSION } from '../config/version';
import '../styles/page-layout.css';

interface ChangelogEntry {
  date: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    date: '04.02.2026',
    changes: [
      'Обновили анимацию бета-распада',
      'Добавили иконку и двухцветное название в хедере',
    ],
  },
  {
    date: '03.02.2026',
    changes: [
      'Добавили систему версионирования',
    ],
  },
  {
    date: '02.02.2026',
    changes: [
      'Изменили анимацию капельной модели ядра',
      'Добавили иконку сайта',
    ],
  },
  {
    date: '01.02.2026',
    changes: [
      'Добавили страницу теста по ядерной физике с сохранением результатов в Supabase',
    ],
  },
];

export default function Changelog() {
  return (
    <motion.main
      className="page-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        marginTop: '120px',
        minHeight: 'calc(100vh - 120px)',
        paddingTop: '2rem',
        paddingBottom: '4rem',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            color: '#000',
            marginBottom: '0.5rem',
            textAlign: 'center',
          }}
        >
          История изменений
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: '#667eea',
            fontSize: '1.1rem',
            marginBottom: '2rem',
            fontWeight: 500,
          }}
        >
          Текущая версия: {SITE_VERSION}
        </p>

        <div
          style={{
            backgroundColor: '#fff',
            padding: '2.5rem',
            borderRadius: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            lineHeight: '1.8',
          }}
        >
          {changelog.map((entry, index) => (
            <section
              key={index}
              style={{
                marginBottom: index < changelog.length - 1 ? '2rem' : 0,
                paddingBottom: index < changelog.length - 1 ? '2rem' : 0,
                borderBottom:
                  index < changelog.length - 1
                    ? '1px solid #eee'
                    : 'none',
              }}
            >
              <h2
                style={{
                  fontSize: '1.3rem',
                  marginBottom: '0.75rem',
                  color: '#000',
                }}
              >
                {entry.date}
              </h2>
              <ul
                style={{
                  color: '#333',
                  paddingLeft: '1.5rem',
                  margin: 0,
                }}
              >
                {entry.changes.map((change, i) => (
                  <li key={i} style={{ marginBottom: '0.3rem' }}>
                    {change}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </motion.main>
  );
}
