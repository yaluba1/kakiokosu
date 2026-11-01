import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readerLocales } from './locales';
import { DEFAULT_LANGUAGE } from '../constants/languages';

const RTL_LANGUAGES = ['ar', 'he'];

export function updateDocumentDirection(lang: string) {
  const isRtl = RTL_LANGUAGES.includes(lang);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  const pageTitle = readerLocales[lang]?.app?.pageTitle || readerLocales[DEFAULT_LANGUAGE]?.app?.pageTitle;
  if (pageTitle) {
    document.title = pageTitle;
  }
}

export function getInitialLanguage(): string {
  const saved = localStorage.getItem('kakiokoshi_language') || localStorage.getItem('kakiokosu_language');
  if (saved && saved !== 'guess' && readerLocales[saved]) {
    return saved;
  }
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  if (browserLang && readerLocales[browserLang]) {
    return browserLang;
  }
  return DEFAULT_LANGUAGE;
}

const initialLang = getInitialLanguage();
updateDocumentDirection(initialLang);

const resources: Record<string, { translation: typeof readerLocales['ja'] }> = {};
for (const [key, value] of Object.entries(readerLocales)) {
  resources[key] = { translation: value };
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lang) => {
  updateDocumentDirection(lang);
});

export default i18n;

