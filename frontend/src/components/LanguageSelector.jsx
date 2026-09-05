import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector = ({ variant = 'light', style = {} }) => {
  const { language, setLanguage, languages } = useLanguage();

  const isDark = variant === 'dark';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: isDark ? 'rgba(255, 255, 255, 0.18)' : '#f1f5f9',
        backdropFilter: isDark ? 'blur(8px)' : 'none',
        borderRadius: '30px',
        padding: '3px',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #e2e8f0',
        boxShadow: isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
          : '0 1px 3px rgba(0, 0, 0, 0.05)',
        ...style,
      }}
      role="group"
      aria-label="Language selector"
    >
      <span
        style={{
          fontSize: '14px',
          marginLeft: '8px',
          marginRight: '4px',
          color: isDark ? '#ffffff' : '#64748b',
          userSelect: 'none',
        }}
        title="Select Language"
      >
        🌐
      </span>
      {languages.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: isActive ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isActive
                ? isDark
                  ? '#ffffff'
                  : '#667eea'
                : 'transparent',
              color: isActive
                ? isDark
                  ? '#2d3748'
                  : '#ffffff'
                : isDark
                ? '#f8fafc'
                : '#475569',
              boxShadow: isActive
                ? isDark
                  ? '0 2px 6px rgba(0,0,0,0.2)'
                  : '0 2px 6px rgba(102, 126, 234, 0.4)'
                : 'none',
            }}
          >
            <span style={{ fontSize: '14px' }}>{lang.flag}</span>
            <span>{lang.nativeName}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSelector;
