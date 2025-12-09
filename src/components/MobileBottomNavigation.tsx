/**
 * Mobile Bottom Navigation Component
 * Fixed bottom navigation bar for frequently used functions on mobile devices
 */

import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Home, 
  Briefcase, 
  ClipboardList, 
  FileText,
  User
} from 'lucide-react';

const MobileBottomNavigation: React.FC = () => {
  const { navigateTo, currentPage } = useNavigation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      page: 'dashboard',
    },
    {
      id: 'projects',
      label: 'Projekte',
      icon: Briefcase,
      page: 'projects',
    },
    {
      id: 'tasks',
      label: 'Aufgaben',
      icon: ClipboardList,
      page: 'tasks',
    },
    {
      id: 'documents',
      label: 'Dokumente',
      icon: FileText,
      page: 'documents',
    },
    {
      id: 'users',
      label: 'Benutzer',
      icon: User,
      page: 'users',
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl lg:hidden"
      aria-label="Hauptnavigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.page)}
              className={`
                flex flex-col items-center justify-center gap-1
                flex-1 h-full min-h-[44px] min-w-[44px]
                transition-all duration-200
                ${isActive 
                  ? 'text-[#058bc0] font-semibold' 
                  : 'text-gray-600 hover:text-[#058bc0]'
                }
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#058bc0] rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNavigation;







