import React, { useState, useEffect } from 'react';
import { ChevronRight, Home, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface BreadcrumbItem {
  id: string;
  label: string;
  page?: string;
  onClick?: () => void;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  onNavigate?: (page: string) => void;
  className?: string;
}

// Mapping von Seiten-IDs zu Anzeigenamen
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

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  items,
  onNavigate,
  className = '',
}) => {
  // Responsive Detection für Mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Zeige nichts wenn nur Dashboard vorhanden
  if (items.length <= 1) {
    return null;
  }
  
  const handleClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.page && onNavigate) {
      onNavigate(item.page);
    }
  };

  // Alle Breadcrumbs in brillantem Weiß für maximalen Kontrast
  const textColor = 'text-white font-bold';
  const hoverColor = 'hover:text-yellow-200 hover:bg-white/20';
  const chevronColor = 'text-white';
  const lastItemColor = 'text-white font-bold'; // Gleiche Farbe und Schriftstärke wie andere Items

  // Mobile Ansicht: Erste und letzte Items + Dropdown für Rest
  if (isMobile && items.length > 3) {
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    const middleItems = items.slice(1, -1);

    return (
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center gap-2 text-lg ${className}`}
      >
        {/* Dashboard/Home */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleClick(firstItem)}
          className={`h-10 px-3 ${textColor} ${hoverColor}`}
          aria-label={firstItem.label}
        >
          <Home className="h-6 w-6 text-white" />
        </Button>

        <ChevronRight className={`h-6 w-6 ${chevronColor}`} />

        {/* Dropdown für mittlere Items */}
        {middleItems.length > 0 && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-10 px-3 ${textColor} ${hoverColor}`}
                >
                  <span className="truncate max-w-[100px] text-white font-bold text-lg">...</span>
                  <ChevronDown className="h-5 w-5 ml-1 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                {middleItems.map((item, index) => (
                  <DropdownMenuItem
                    key={`${item.id}-${index}`}
                    onClick={() => handleClick(item)}
                    className="cursor-pointer"
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ChevronRight className={`h-6 w-6 ${chevronColor}`} />
          </>
        )}

        {/* Letztes Item */}
        <span className={`${textColor} truncate max-w-[150px] text-lg`}>
          {lastItem.label}
        </span>
      </nav>
    );
  }

  // Desktop Ansicht: Alle Items anzeigen (maximal 5 Ebenen)
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-lg flex-wrap ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;
        const isEllipsis = item.id === 'ellipsis';

        return (
          <React.Fragment key={`${item.id}-${index}`}>
            {isFirst ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClick(item)}
                className={`h-10 px-3 ${textColor} ${hoverColor}`}
                aria-label={item.label}
              >
                <Home className="h-6 w-6 text-white" />
              </Button>
            ) : isEllipsis ? (
              <span className={`h-10 px-3 flex items-center ${textColor} text-lg`}>
                {item.label}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClick(item)}
                className={`h-10 px-3 ${
                  isLast
                    ? `${textColor} cursor-default`
                    : `${textColor} ${hoverColor}`
                }`}
                disabled={isLast}
              >
                <span className="truncate max-w-[200px] text-lg">{item.label}</span>
              </Button>
            )}

            {!isLast && (
              <ChevronRight className={`h-6 w-6 ${chevronColor} flex-shrink-0`} />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Helper-Funktion zum Laden des Mitarbeiternamens
const loadEmployeeName = async (empId: string): Promise<string> => {
  try {
    const userDocRef = doc(db, 'users', empId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const displayName = `${data.vorname || ''} ${data.nachname || ''}`.trim() || 
                         data.displayName || 
                         data.email || 
                         empId;
      return displayName;
    }
  } catch (error) {
    console.error('Fehler beim Laden des Mitarbeiternamens:', error);
  }
  return empId; // Fallback zur ID
};

// Helper-Funktion zum Erstellen von Breadcrumb-Items aus Navigation-Historie
export const createBreadcrumbsFromHistory = async (
  history: string[],
  currentPage: string,
  pageParams?: Record<string, any>
): Promise<BreadcrumbItem[]> => {
  const MAX_BREADCRUMB_LEVELS = 5; // Maximal 5 Ebenen (Dashboard + 4 weitere)
  const items: BreadcrumbItem[] = [];

  // Dashboard immer als erstes Item
  items.push({
    id: 'dashboard',
    label: PAGE_LABELS.dashboard || 'Dashboard',
    page: 'dashboard',
  });

  // Navigation-Historie durchgehen (ohne Dashboard, da bereits hinzugefügt)
  const historyWithoutDashboard = history.filter((page) => page !== 'dashboard');
  
  // Sammle alle Seiten (Historie + aktuelle Seite)
  const allPages: string[] = [...historyWithoutDashboard];
  if (!history.includes(currentPage) && currentPage !== 'dashboard') {
    allPages.push(currentPage);
  }

  // Begrenze auf maximal MAX_BREADCRUMB_LEVELS - 1 zusätzliche Ebenen (Dashboard ist bereits hinzugefügt)
  const maxAdditionalLevels = MAX_BREADCRUMB_LEVELS - 1; // 4 zusätzliche Ebenen nach Dashboard
  let pagesToShow: string[];

  if (allPages.length <= maxAdditionalLevels) {
    // Alle Seiten passen, zeige alle
    pagesToShow = allPages;
  } else {
    // Zu viele Seiten: Zeige Dashboard + "..." + letzte 4 Seiten = 5 Ebenen total
    // Nimm die letzten maxAdditionalLevels Seiten
    pagesToShow = [
      '...', // Marker für übersprungene Seiten
      ...allPages.slice(-maxAdditionalLevels) // Letzte 4 Seiten
    ];
  }

  // Erstelle Breadcrumb-Items
  for (const page of pagesToShow) {
    // Handle "..." Marker
    if (page === '...') {
      items.push({
        id: 'ellipsis',
        label: '...',
        page: undefined, // Nicht klickbar
      });
      continue;
    }

    // Extrahiere Basis-Seite (ohne Parameter)
    const basePage = page.split(':')[0];
    let label = PAGE_LABELS[basePage] || PAGE_LABELS[page] || page;

    // Spezielle Behandlung für parametrisierte Seiten
    if (page.startsWith('employee:')) {
      const empId = page.split(':')[1];
      // Lade den Namen des Mitarbeiters
      const employeeName = await loadEmployeeName(empId);
      label = employeeName;
    } else if (page.startsWith('work-orders:')) {
      const projectId = page.split(':')[1];
      label = `Arbeitsaufträge (Projekt ${projectId})`;
    } else if (page.startsWith('reports-builder:')) {
      const templateId = page.split(':')[1];
      label = `Bericht erstellen (Vorlage ${templateId})`;
    }

    items.push({
      id: page,
      label,
      page,
    });
  }

  return items;
};

export default BreadcrumbNavigation;

