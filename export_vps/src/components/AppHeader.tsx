import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { concernService } from '@/services/firestoreService';
import { LogOut, ArrowLeft, MessageSquare, User } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { UserDetailsDialog } from './UserDetailsDialog';
import { WuenschDirWasButton } from './WuenschDirWasButton';
import BreadcrumbNavigation, { createBreadcrumbsFromHistory, BreadcrumbItem } from './BreadcrumbNavigation';
import MobileNavigation from './MobileNavigation';
import QuickLinksDropdown from './QuickLinksDropdown';
import ThemeToggle from './ThemeToggle';
import OfflineStatusIndicator from './OfflineStatusIndicator';
import { useLocation } from 'react-router-dom';

// Mapping von Seiten-IDs zu Anzeigenamen (aus BreadcrumbNavigation übernommen)
const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projekte',
  'project-info': 'Projektinformationen',
  tasks: 'Aufgaben',
  reports: 'Berichte',
  'reports-list': 'Berichtsliste',
  'reports-builder': 'Bericht erstellen',
  'reports-scheduler': 'Berichte planen',
  customers: 'Kunden',
  materials: 'Materialien',
  categories: 'Kategorien',
  users: 'Benutzer',
  crm: 'CRM',
  personnel: 'Personal',
  'employee:': 'Mitarbeiter',
  vacations: 'Urlaubskalender',
  'notification-settings': 'Benachrichtigungen',
  'system-logs': 'System-Logs',
  settings: 'Einstellungen',
  invoicing: 'Rechnungen',
  scheduling: 'Terminplanung',
  documents: 'Dokumente',
  'upload-document': 'Dokument hochladen',
  templates: 'Vorlagen',
  automation: 'Automatisierung',
  'work-orders:': 'Arbeitsaufträge',
  'smart-inbox': 'Smart Inbox',
  'time-admin': 'Zeit-Administration',
  'time-admin-approvals': 'Genehmigungen',
  'time-admin-timesheets': 'Stundenzettel',
  'time-admin-exports': 'Exporte',
  'time-ops-live': 'Live-Ansicht',
  'time-ops-exceptions': 'Ausnahmen',
  'time-ops-reports': 'Berichte',
  'new-task': 'Neue Aufgabe',
  'new-report': 'Neuer Bericht',
  'new-user': 'Neuer Benutzer',
  'new-customer': 'Neuer Kunde',
  'new-category': 'Neue Kategorie',
  'new-material': 'Neues Material',
  'new-project': 'Neues Projekt',
  'new-project-info': 'Neue Projektinformation',
};

// Funktion zum Abrufen des Seitenname aus currentPage
const getPageLabel = (page: string): string => {
  const basePage = page.split(':')[0];
  return PAGE_LABELS[basePage] || PAGE_LABELS[page] || page;
};

interface AppHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  children?: React.ReactNode;
  onOpenMessaging?: () => void;
  // Optional: Überschreibe Navigation-Context falls nötig
  currentPage?: string;
  navigationHistory?: string[];
  onNavigate?: (page: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  showBackButton = false, 
  onBack, 
  title,
  children,
  onOpenMessaging,
  currentPage: propCurrentPage,
  navigationHistory: propNavigationHistory,
  onNavigate: propOnNavigate
}) => {
  // Verwende Navigation-Context, falls verfügbar, sonst Props
  let navigationContext;
  try {
    navigationContext = useNavigation();
  } catch {
    navigationContext = null;
  }

  const currentPage = propCurrentPage || navigationContext?.currentPage || 'dashboard';
  const navigationHistory = propNavigationHistory || navigationContext?.navigationHistory || ['dashboard'];
  const onNavigate = propOnNavigate || navigationContext?.navigateTo;
  const { user, logout, canUseMessaging } = useAuth();
  const { unreadCount } = useMessaging();
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [isLoadingConcernData, setIsLoadingConcernData] = useState(false);
  const [concernData, setConcernData] = useState<any>(null);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([]);
  const [isLoadingBreadcrumbs, setIsLoadingBreadcrumbs] = useState(false);
  const location = useLocation();
  
  // Extract module from pathname (e.g., /projects/123 -> "projects")
  const getModuleFromPath = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    return pathParts[0] || undefined;
  };

  // Concern-Daten aus Firestore laden
  useEffect(() => {
    const loadConcernData = async () => {
      if (!user?.concernID) return;
      
      try {
        setIsLoadingConcernData(true);

        
        const concern = await concernService.get(user.concernID);
        
        if (concern) {

          setConcernData(concern);
        } else {

          setConcernData(null);
        }
      } catch (error) {

        setConcernData(null);
      } finally {
        setIsLoadingConcernData(false);
      }
    };

    loadConcernData();
  }, [user?.concernID]);

  // Lade Breadcrumbs asynchron
  useEffect(() => {
    const loadBreadcrumbs = async () => {
      if (currentPage === 'dashboard' || navigationHistory.length === 0) {
        setBreadcrumbItems([]);
        return;
      }
      
      setIsLoadingBreadcrumbs(true);
      try {
        const items = await createBreadcrumbsFromHistory(navigationHistory, currentPage);
        setBreadcrumbItems(items);
      } catch (error) {
        console.error('Fehler beim Laden der Breadcrumbs:', error);
        // Fallback: Erstelle Breadcrumbs ohne Namen
        const fallbackItems: BreadcrumbItem[] = [
          {
            id: 'dashboard',
            label: PAGE_LABELS.dashboard || 'Dashboard',
            page: 'dashboard',
          }
        ];
        if (currentPage !== 'dashboard') {
          const basePage = currentPage.split(':')[0];
          fallbackItems.push({
            id: currentPage,
            label: PAGE_LABELS[basePage] || currentPage,
            page: currentPage,
          });
        }
        setBreadcrumbItems(fallbackItems);
      } finally {
        setIsLoadingBreadcrumbs(false);
      }
    };
    
    loadBreadcrumbs();
  }, [currentPage, navigationHistory]);

  const handleLogout = () => {
    logout();
    // Automatischer Refresh um das Nachrichtenfenster zu schließen
    window.location.reload();
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'Benutzer',
      field_worker: 'Außendienst-Mitarbeiter',
      auftraggeber: 'Auftraggeber',
      employee: 'Mitarbeiter'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Nicht angegeben';
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString('de-DE');
      }
      return new Date(date).toLocaleDateString('de-DE');
    } catch {
      return String(date);
    }
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return 'Nicht angegeben';
    try {
      if (date instanceof Date) {
        return date.toLocaleString('de-DE');
      }
      return new Date(date).toLocaleString('de-DE');
    } catch {
      return String(date);
    }
  };

  const getPermissionLevel = (rechte: number) => {
    if (rechte >= 10) return { level: 'Vollzugriff', color: 'bg-red-100 text-red-800' };
    if (rechte >= 7) return { level: 'Erweiterte Rechte', color: 'bg-orange-100 text-orange-800' };
    if (rechte >= 5) return { level: 'Standardrechte', color: 'bg-blue-100 text-blue-800' };
    if (rechte >= 3) return { level: 'Eingeschränkte Rechte', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Minimale Rechte', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] shadow-xl border-b-4 border-[#046a90]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Top row: Logo/Title and Right buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-3 sm:py-4 gap-3">
            {/* Left side - Logo and navigation */}
            <div className="flex items-center space-x-4 flex-shrink-0 min-w-0">
              {/* Mobile Navigation Hamburger Menu */}
              <MobileNavigation currentPage={currentPage} />
              
              {/* Back Button - nur auf Mobile (Desktop hat Sidebar) */}
              {showBackButton && onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="lg:hidden mr-2 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/60 transition-all hover:scale-105 shadow-md flex-shrink-0"
                  aria-label="Zurück"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span className="font-semibold hidden sm:inline">Zurück</span>
                </Button>
              )}
              
              <div className="flex items-center space-x-3 min-w-0">
                {/* Brand name and page title */}
                <div className="flex flex-col min-w-0">
                  <button
                    onClick={() => onNavigate && onNavigate('dashboard')}
                    className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight drop-shadow-lg bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent whitespace-nowrap hover:from-orange-300 hover:to-orange-400 transition-all cursor-pointer text-left"
                    title="Zum Haupt-Dashboard"
                  >
                    TradeTrackr
                  </button>
                  {(title || (currentPage !== 'dashboard' && currentPage)) && (
                    <span className="text-xs sm:text-sm text-white/90 leading-tight font-semibold drop-shadow-md flex items-center gap-1 truncate">
                      <span className="text-yellow-300">▸</span> <span className="truncate">{title || getPageLabel(currentPage)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

                        {/* Right side - Quick links and user actions */}
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full lg:w-auto justify-end">
                          {/* Offline Status Indicator */}
                          <OfflineStatusIndicator className="flex-shrink-0" />
                          
                          {/* Theme Toggle */}
                          {user && (
                            <ThemeToggle className="flex-shrink-0" />
                          )}
                          
                          {/* Notifications */}
                          <div className="hover:scale-110 transition-transform flex-shrink-0">
                            <NotificationBell />
                          </div>
              
              {/* Quick Links Dropdown - nur auf Mobile (Desktop hat Sidebar) */}
              {user && (
                <div className="lg:hidden">
                  <QuickLinksDropdown />
                </div>
              )}
              
              {/* Wünsch-dir-was Button */}
              {user && (
                <WuenschDirWasButton
                  module={getModuleFromPath()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 border-white/30 text-white hover:from-purple-600 hover:to-pink-600 hover:border-white/60 font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 backdrop-blur-sm flex-shrink-0"
                />
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ev = new CustomEvent('tt:navigate', { detail: { page: 'tasks' } });
                  window.dispatchEvent(ev);
                }}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/60 font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 backdrop-blur-sm flex-shrink-0"
              >
                <span className="hidden lg:inline">📋 Alle Aufgaben</span>
                <span className="lg:hidden">📋 Aufgaben</span>
              </Button>
              {user && (
                <>
                  {/* Clickable User Info */}
                  <div 
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-white/20 px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition-all hover:scale-105 border-2 border-white/30 hover:border-white/60 shadow-md backdrop-blur-sm min-w-0 flex-shrink-0"
                    onClick={() => setShowUserDetails(true)}
                    title="Klicken Sie für Benutzerdetails"
                  >
                    {user.photoURL || user.photoUrl ? (
                      <img 
                        src={user.photoURL || user.photoUrl} 
                        alt="Profilfoto"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/50 object-cover shadow-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                    )}
                    <div className="text-right flex-1 min-w-0 hidden lg:block">
                      <p className="text-sm font-bold text-white drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
                        {`${user.vorname} ${user.nachname}`}
                      </p>
                      <p className="text-xs text-white/80 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                        {getRoleDisplayName(user.role || '')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Messaging Button */}
                  {onOpenMessaging && canUseMessaging() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenMessaging}
                      className="bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300 relative flex-shrink-0"
                      title="Messaging öffnen"
                    >
                      <MessageSquare className="h-4 w-4 sm:mr-1" />
                      <span className="hidden lg:inline">Messaging</span>
                      <span className="lg:hidden">Nachrichten</span>
                      
                      {/* Unread Messages Badge */}
                      {unreadCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {unreadCount}
                        </div>
                      )}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="bg-gradient-to-r from-red-500 to-red-600 border-2 border-red-300 text-white hover:from-red-600 hover:to-red-700 hover:border-red-200 shadow-lg hover:shadow-xl transition-all hover:scale-105 font-semibold flex-shrink-0"
                  >
                    <LogOut className="h-4 w-4 sm:mr-1" />
                    <span className="hidden lg:inline">🚪 Abmelden</span>
                    <span className="lg:hidden">Abmelden</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Breadcrumb Navigation Row */}
          {currentPage !== 'dashboard' && breadcrumbItems.length > 0 && (
            <div className="pb-2 border-t border-white/20 pt-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                {isLoadingBreadcrumbs ? (
                  <div className="flex items-center gap-2 text-white">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">Lade...</span>
                  </div>
                ) : (
                  <BreadcrumbNavigation
                    items={breadcrumbItems}
                    onNavigate={onNavigate}
                    className="text-white"
                  />
                )}
              </div>
            </div>
          )}

          {/* Bottom row: Center content (for search, actions, etc.) */}
          {children && (
            <div className="pb-3 sm:pb-4 border-t border-white/20 pt-3">
              <div className="flex flex-wrap items-center gap-2 w-full">
                {children}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* User Details Modal */}
      <UserDetailsDialog 
        open={showUserDetails} 
        onOpenChange={setShowUserDetails}
        user={user}
      />
    </>
  );
};

export default AppHeader;
