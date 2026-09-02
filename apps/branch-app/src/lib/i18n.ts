import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Lang } from '@mucho-loco/types';
import es from './locales/es.json';
import en from './locales/en.json';

const STORAGE_KEY = 'ml_lang';

function initialLanguage(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: initialLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: Lang) {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage throws in private/incognito browsing — safe to no-op.
  }
}

export default i18n;
