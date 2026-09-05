import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, languages } from '../i18n/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('kisanflow_lang') || 'en';
  });

  const setLanguage = (langCode) => {
    if (translations[langCode]) {
      setLanguageState(langCode);
      localStorage.setItem('kisanflow_lang', langCode);
    }
  };

  useEffect(() => {
    // Keep html lang attribute in sync
    document.documentElement.lang = language;
  }, [language]);

  /**
   * Translate helper:
   * Usage: t('auth.loginTitle') or t('common.welcome', { name: 'Ramesh' })
   */
  const t = (path, params = {}) => {
    const keys = path.split('.');
    let current = translations[language];

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English
        let fallback = translations.en;
        for (const fbKey of keys) {
          if (fallback && fallback[fbKey] !== undefined) {
            fallback = fallback[fbKey];
          } else {
            return path; // Key not found
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return current || path;
    }

    // Interpolate {key} parameters
    return current.replace(/\{(\w+)\}/g, (_, key) => {
      return params[key] !== undefined ? params[key] : `{${key}}`;
    });
  };

  /**
   * Helper to translate crop names
   */
  const tCrop = (cropName) => {
    if (!cropName) return '';
    const localized = translations[language]?.crops?.[cropName];
    return localized || cropName;
  };

  /**
   * Helper to translate status codes
   */
  const tStatus = (statusCode) => {
    if (!statusCode) return '';
    const normalized = String(statusCode).toUpperCase().replace(/\s+/g, '_');
    const localized = translations[language]?.statuses?.[normalized];
    return localized || statusCode;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tCrop,
        tStatus,
        languages,
        currentLanguageMeta: languages.find((l) => l.code === language) || languages[0],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
