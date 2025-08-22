// ============================================================================
// OPTIMIZED LANGUAGE HOOKS
// ============================================================================
// Erweiterte und optimierte Sprach-Hooks

import { useContext, useCallback, useMemo } from 'react';
import { LanguageContext } from '@/contexts/LanguageContext';
import type { Language } from '@/contexts/LanguageContext';

// ============================================================================
// MAIN LANGUAGE HOOK
// ============================================================================

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
};

// ============================================================================
// TRANSLATION HOOK
// ============================================================================

export const useTranslation = () => {
  const { t, language } = useLanguage();
  
  const translate = useCallback((key: string, params?: Record<string, string | number>): string => {
    let translation = t(key);
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, String(value));
      });
    }
    
    return translation;
  }, [t]);
  
  const translatePlural = useCallback((
    key: string, 
    count: number, 
    params?: Record<string, string | number>
  ): string => {
    const pluralKey = count === 1 ? `${key}_singular` : `${key}_plural`;
    return translate(pluralKey, { ...params, count });
  }, [translate]);
  
  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    };
    
    return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', defaultOptions).format(dateObj);
  }, [language]);
  
  const formatNumber = useCallback((number: number, options?: Intl.NumberFormatOptions): string => {
    const defaultOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    };
    
    return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', defaultOptions).format(number);
  }, [language]);
  
  const formatCurrency = useCallback((amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }, [language]);
  
  return {
    t: translate,
    translate,
    translatePlural,
    formatDate,
    formatNumber,
    formatCurrency,
    currentLanguage: language,
  };
};

// ============================================================================
// LANGUAGE UTILITIES HOOK
// ============================================================================

export const useLanguageUtils = () => {
  const { language, setLanguage } = useLanguage();
  
  const availableLanguages = useMemo(() => [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
    { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  ], []);
  
  const currentLanguageInfo = useMemo(() => {
    return availableLanguages.find(lang => lang.code === language) || availableLanguages[0];
  }, [language, availableLanguages]);
  
  const switchLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    
    // Optional: Speichern in localStorage
    localStorage.setItem('preferred-language', newLanguage);
    
    // Optional: Dokument-Titel aktualisieren
    document.documentElement.lang = newLanguage;
  }, [setLanguage]);
  
  const detectUserLanguage = useCallback((): Language => {
    // Aus localStorage
    const saved = localStorage.getItem('preferred-language') as Language;
    if (saved && availableLanguages.some(lang => lang.code === saved)) {
      return saved;
    }
    
    // Aus Browser-Einstellungen
    const browserLang = navigator.language.split('-')[0] as Language;
    if (browserLang && availableLanguages.some(lang => lang.code === browserLang)) {
      return browserLang;
    }
    
    // Fallback
    return 'de';
  }, [availableLanguages]);
  
  const isRTL = useMemo(() => {
    // Für zukünftige RTL-Sprachen (z.B. Arabisch, Hebräisch)
    return false;
  }, []);
  
  return {
    availableLanguages,
    currentLanguageInfo,
    switchLanguage,
    detectUserLanguage,
    isRTL,
    language,
  };
};
