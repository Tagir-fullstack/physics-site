import { motion } from 'framer-motion';
import { SITE_VERSION } from '../config/version';
import '../styles/page-layout.css';

interface ChangelogEntry {
  date: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    date: '09.02.2026',
    changes: [
      'Новая возможность: режим доступности (инклюзивный режим)',
      'Кнопка доступности в хедере — открывает панель настроек',
      'Увеличение шрифта: А / А+ / А++ (масштабирование всего сайта)',
      'Светлая тема: полное переключение на светлый фон и тёмный текст',
      'Высокий контраст: усиленные границы и подчёркнутые заголовки',
      'Отключение анимаций для комфортного восприятия',
      'Кнопка озвучки текста (Web Speech API) на страницах видео и в тесте',
      'Все настройки доступности сохраняются в localStorage',
      'Адаптивное отображение иконки доступности на мобильных устройствах',
      'Уменьшен размер кнопки «Следующее» на мобильных устройствах',
      'Формат версии изменён на трёхзначный (vX.Y.Z)',
    ],
  },
  {
    date: '08.02.2026',
    changes: [
      'Модель Зоммерфельда: 5 разноцветных эллиптических орбит (n=5) с физически верными пропорциями',
      'Новый блок «Субатомные частицы» — карточки протона, нейтрона и электрона с характеристиками и историей открытия',
      'Иконки частиц в стиле видео-анимаций (Manim)',
      'Свечение заголовка «АНИМАЦИИ»',
      'Исправлена мобильная версия: хедер, модели атомов, карточки, футер',
      'Адаптивная сетка карточек и футера на средних и малых экранах',
      'Тест по ядерной физике: тёмная тема, основной шрифт, валидация на русском языке',
      'Случайный порядок вопросов и вариантов ответов в тесте',
      'Фиксированная высота карточки вопроса — кнопки больше не прыгают',
      'Основной шрифт для заголовков на страницах видео',
    ],
  },
  {
    date: '07.02.2026',
    changes: [
      'Полный редизайн сайта: новый шрифт, обновлённая цветовая схема',
      'Добавили чередующиеся модели атомов',
      'Обновили дизайн футера: чёрный фон, логотип Physez, новая компоновка',
      'Перенесли информацию о диссертации в футер',
      'Обновили страницу «Условия использования» — тёмная тема',
      'Обновили страницу «История изменений» — тёмная тема',
    ],
  },
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
            color: '#fff',
            marginBottom: '0.5rem',
            textAlign: 'center',
          }}
        >
          История изменений
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: '#FC6255',
            fontSize: '1.1rem',
            marginBottom: '2rem',
            fontWeight: 500,
          }}
        >
          Текущая версия: {SITE_VERSION}
        </p>

        <div
          style={{
            backgroundColor: '#111',
            padding: '2.5rem',
            borderRadius: '15px',
            border: '1px solid #222',
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
                    ? '1px solid #333'
                    : 'none',
              }}
            >
              <h2
                style={{
                  fontSize: '1.3rem',
                  marginBottom: '0.75rem',
                  color: '#fff',
                }}
              >
                {entry.date}
              </h2>
              <ul
                style={{
                  color: '#ccc',
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
