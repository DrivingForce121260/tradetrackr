/**
 * Mobile Navigation Component
 * Hamburger menu for mobile devices with slide-out navigation drawer
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu, 
  X, 
  FolderOpen,
  Briefcase,
  ClipboardList,
  FileText,
  Users,
  Shield,
  Home,
  ChevronRight
} from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileNavigationProps {
  currentPage?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  children?: NavigationItem[];
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  currentPage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { navigateTo, currentPage: navCurrentPage } = useNavigation();
  const { user, hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const activePage = currentPage || navCurrentPage;

  // Close menu when navigating
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [activePage]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
    },
    {
      id: 'projects-tasks',
      label: 'Projekte & Aufgaben',
      icon: <Briefcase className="h-5 w-5" />,
      children: [
        { id: 'projects', label: 'Projekte' },
        { id: 'tasks', label: 'Aufgaben' },
        { id: 'work-orders', label: 'Arbeitsaufträge' },
      ]
    },
    {
      id: 'documents-reports',
      label: 'Dokumente & Berichte',
      icon: <FileText className="h-5 w-5" />,
      children: [
        { id: 'documents', label: 'Dokumente' },
        { id: 'reports', label: 'Berichte' },
        { id: 'reports-list', label: 'Berichtsliste' },
        { id: 'reports-builder', label: 'Bericht erstellen' },
      ]
    },
    {
      id: 'personnel',
      label: 'Personal',
      icon: <Users className="h-5 w-5" />,
      children: [
        { id: 'personnel', label: 'Personalübersicht' },
        { id: 'scheduling', label: 'Personaleinsatzplan' },
        { id: 'vacations', label: 'Urlaubskalender' },
        { id: 'time-ops-live', label: 'Zeit Operations' },
      ]
    },
    {
      id: 'administration',
      label: 'Administration',
      icon: <Shield className="h-5 w-5" />,
      permission: 'admin',
      children: [
        { id: 'automation', label: 'Automation', permission: 'admin' },
        { id: 'users', label: 'Benutzer', permission: 'view_users' },
        { id: 'concern-management', label: 'Concern-Verwaltung', permission: 'admin' },
        { id: 'settings', label: 'Einstellungen' },
        { id: 'system-logs', label: 'System Logs', permission: 'admin' },
        { id: 'time-admin', label: 'Zeit Administration', permission: 'admin' },
      ]
    },
  ];

  const handleNavigate = (pageId: string) => {
    navigateTo(pageId);
    setIsOpen(false);
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    // Check permissions
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const isActive = activePage === item.id;
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      const visibleChildren = item.children!.filter(child => 
        !child.permission || hasPermission(child.permission)
      );

      if (visibleChildren.length === 0) {
        return null;
      }

      const isExpanded = expandedItems.includes(item.id);

      return (
        <div key={item.id} className="border-b border-gray-200 last:border-b-0">
          <button
            onClick={() => toggleExpand(item.id)}
            className={`
              w-full flex items-center justify-between px-4 py-4 text-left
              ${isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}
              transition-colors duration-150
            `}
            aria-label={`${item.label} ${isExpanded ? 'ausklappen' : 'einklappen'}`}
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-3">
              <div className={isActive ? 'text-blue-600' : 'text-gray-600'}>
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronRight 
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`} 
            />
          </button>
          
          {isExpanded && (
            <div className="bg-gray-50 border-t border-gray-200">
              {visibleChildren.map(child => (
                <button
                  key={child.id}
                  onClick={() => handleNavigate(child.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 pl-12 text-left
                    ${activePage === child.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}
                    transition-colors duration-150
                  `}
                  aria-label={child.label}
                >
                  <span>{child.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handleNavigate(item.id)}
        className={`
          w-full flex items-center gap-3 px-4 py-4 text-left border-b border-gray-200 last:border-b-0
          ${isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}
          transition-colors duration-150
        `}
        aria-label={item.label}
      >
        <div className={isActive ? 'text-blue-600' : 'text-gray-600'}>
          {item.icon}
        </div>
        <span className="font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-white hover:bg-white/20 border-2 border-white/30 hover:border-white/60 transition-all hover:scale-105 shadow-md flex-shrink-0 min-h-[44px] min-w-[44px]"
          aria-label="Hauptmenü öffnen"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 overflow-y-auto">
        <SheetHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white px-6 py-4 border-b-4 border-[#046a90]">
          <SheetTitle className="flex items-center gap-3 text-xl font-bold">
            <FolderOpen className="h-6 w-6" />
            <span>Navigation</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-2">
          {navigationItems.map(item => renderNavigationItem(item))}
        </div>

        {/* Footer with user info */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 border-t-2 border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {user.vorname?.[0]}{user.nachname?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.vorname} {user.nachname}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigation;

