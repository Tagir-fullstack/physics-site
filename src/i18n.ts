import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru.json';
import en from './locales/en.json';
import kk from './locales/kk.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
  kk: { translation: kk },
};

// Получаем сохранённый язык или используем русский по умолчанию
const storedLang = localStorage.getItem('physez-lang') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: storedLang,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
