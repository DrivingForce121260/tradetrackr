import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NavigationContextType {
  currentPage: string;
  navigationHistory: string[];
  navigateTo: (page: string) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  initialPage?: string;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  initialPage = 'dashboard',
}) => {
  const [currentPage, setCurrentPage] = useState<string>(initialPage);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(() => {
    // Lade Historie aus SessionStorage beim Start
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('tradetrackr_nav_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [initialPage];
        }
      }
    }
    return [initialPage];
  });

  const navigateTo = (page: string) => {
    setCurrentPage(page);
    setNavigationHistory((prev) => {
      // Entferne Duplikate und füge neue Seite hinzu
      const newHistory = [...prev.filter((p) => p !== page), page];
      // Speichere in SessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tradetrackr_nav_history', JSON.stringify(newHistory));
      }
      return newHistory;
    });
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousPage = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentPage(previousPage);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tradetrackr_nav_history', JSON.stringify(newHistory));
      }
    } else {
      setCurrentPage('dashboard');
    }
  };

  // Global navigation via custom event
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.page) {
        navigateTo(e.detail.page);
      }
    };
    window.addEventListener('tt:navigate', handler);
    return () => window.removeEventListener('tt:navigate', handler);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentPage,
        navigationHistory,
        navigateTo,
        goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};







