import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import translations from '../i18n/translations.json';
import storage from '../utils/storage';

// Same language set as the Flask app: LANGUAGES = ['en', 'hi', 'ml']
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ml', label: 'മലയാളം' },
];

const STORAGE_KEY = 'user_lang';
const LanguageContext = createContext(null);

const isSupported = (code) => LANGUAGES.some((l) => l.code === code);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = storage.get(STORAGE_KEY, 'en');
    return isSupported(saved) ? saved : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    const next = isSupported(code) ? code : 'en';
    storage.set(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  // t('English msgid') -> translated string (falls back to the English text, like gettext).
  const t = useCallback(
    (msgid) => translations[lang]?.[msgid] || msgid,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
