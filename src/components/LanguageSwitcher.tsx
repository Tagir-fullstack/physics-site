import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'ru', label: 'РУС', flag: '🇷🇺' },
  { code: 'kk', label: 'ҚАЗ', flag: '🇰🇿' },
  { code: 'en', label: 'ENG', flag: '🇬🇧' },
];

interface Props {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.slice(0, 2) || 'ru';

  const handleChange = (langCode: string) => {
    localStorage.setItem('physez-lang', langCode);
    i18n.changeLanguage(langCode);
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentLang === lang.code ? '#4a90e2' : 'rgba(255, 255, 255, 0.1)',
              color: currentLang === lang.code ? '#fff' : '#999',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: currentLang === lang.code ? '2px solid #4a90e2' : '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: currentLang === lang.code ? 'rgba(74, 144, 226, 0.15)' : 'transparent',
            color: currentLang === lang.code ? '#4a90e2' : '#ccc',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
