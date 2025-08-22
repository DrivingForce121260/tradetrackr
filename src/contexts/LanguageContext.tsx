import React, { createContext, useContext, useState, ReactNode } from 'react';
import { translations } from '@/translations';

export type Language = 'de';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Language names for display
export const languageNames: Record<Language, string> = {
  de: 'Deutsch'
};

// Language flags (using country codes)
export const languageFlags: Record<Language, string> = {
  de: 'ðŸ‡©ðŸ‡ª'
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('de'); // Default to German

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};



export default LanguageProvider; 
