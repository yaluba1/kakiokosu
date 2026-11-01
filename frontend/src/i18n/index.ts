import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { frontendLocales } from './locales';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../constants/languages';

const RTL_LANGUAGES = ['ar', 'he'];

export function updateDocumentDirection(lang: string) {
  const isRtl = RTL_LANGUAGES.includes(lang);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  const pageTitle = frontendLocales[lang]?.app?.pageTitle || frontendLocales[DEFAULT_LANGUAGE]?.app?.pageTitle;
  if (pageTitle) {
    document.title = pageTitle;
  }
}

// Determine initial UI language
export function getInitialLanguage(): string {
  const saved = localStorage.getItem('kakiokoshi_language') || localStorage.getItem('kakiokosu_language');
  if (saved && saved !== 'guess' && frontendLocales[saved]) {
    return saved;
  }
  // Try browser language
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  if (browserLang && frontendLocales[browserLang]) {
    return browserLang;
  }
  return DEFAULT_LANGUAGE;
}

const initialLang = getInitialLanguage();
updateDocumentDirection(initialLang);

const resources: Record<string, { translation: typeof frontendLocales['ja'] }> = {};
for (const [key, value] of Object.entries(frontendLocales)) {
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

