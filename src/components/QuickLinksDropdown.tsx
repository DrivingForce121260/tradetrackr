import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Star,
  FolderOpen,
  CheckSquare,
  FileText,
  Users,
  Package,
  Building2,
  Settings,
  Zap,
  History,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickLinksDropdownProps {
  className?: string;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projekte',
  tasks: 'Aufgaben',
  'project-info': 'Projektinfos',
  reports: 'Berichte',
  customers: 'Kunden',
  crm: 'CRM',
  'smart-inbox': 'Smart Inbox',
  invoicing: 'Angebote & Rechnungen',
  categories: 'Kategorien',
  materials: 'Materialien',
  documents: 'Dokumente',
  personnel: 'Personal',
  users: 'Benutzer',
  'concern-management': 'Concern-Verwaltung',
  automation: 'Automation',
  'time-admin': 'Zeit | Admin',
  'time-ops-live': 'Zeit | Ops',
  settings: 'Einstellungen',
  templates: 'Vorlagen',
};

const PAGE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <FolderOpen className="h-4 w-4" />,
  projects: <FolderOpen className="h-4 w-4" />,
  tasks: <CheckSquare className="h-4 w-4" />,
  'project-info': <FileText className="h-4 w-4" />,
  reports: <FileText className="h-4 w-4" />,
  customers: <Users className="h-4 w-4" />,
  crm: <Building2 className="h-4 w-4" />,
  'smart-inbox': <FileText className="h-4 w-4" />,
  invoicing: <FileText className="h-4 w-4" />,
  categories: <Package className="h-4 w-4" />,
  materials: <Package className="h-4 w-4" />,
  documents: <FileText className="h-4 w-4" />,
  personnel: <Users className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  'concern-management': <Settings className="h-4 w-4" />,
  automation: <Zap className="h-4 w-4" />,
  'time-admin': <Clock className="h-4 w-4" />,
  'time-ops-live': <Clock className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  templates: <FileText className="h-4 w-4" />,
};

// Häufig verwendete Funktionen (können später personalisiert werden)
const FREQUENT_PAGES = [
  'dashboard',
  'projects',
  'tasks',
  'reports',
  'customers',
  'documents',
];

const QuickLinksDropdown: React.FC<QuickLinksDropdownProps> = ({ className }) => {
  const { navigateTo, navigationHistory } = useNavigation();
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const [favoritePages, setFavoritePages] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tradetrackr_favorites');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    // Zuletzt besuchte Seiten (ohne Dashboard, max. 5)
    const recent = navigationHistory
      .filter((page) => page !== 'dashboard')
      .slice(-5)
      .reverse();
    setRecentPages(recent);
  }, [navigationHistory]);

  const toggleFavorite = (pageId: string) => {
    setFavoritePages((prev) => {
      const newFavorites = prev.includes(pageId)
        ? prev.filter((p) => p !== pageId)
        : [...prev, pageId];
      localStorage.setItem('tradetrackr_favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const handleNavigate = (pageId: string) => {
    navigateTo(pageId);
  };

  const getPageLabel = (pageId: string) => {
    return PAGE_LABELS[pageId] || pageId;
  };

  const getPageIcon = (pageId: string) => {
    return PAGE_ICONS[pageId] || <FolderOpen className="h-4 w-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/60 font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 backdrop-blur-sm',
            className
          )}
          aria-label="Quick Links öffnen"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          <span className="hidden lg:inline">Quick Links</span>
          <span className="lg:hidden">Links</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[600px] overflow-y-auto"
      >
        {/* Favoriten */}
        {favoritePages.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              Favoriten
            </DropdownMenuLabel>
            {favoritePages.map((pageId) => (
              <DropdownMenuItem
                key={pageId}
                onClick={() => handleNavigate(pageId)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {getPageIcon(pageId)}
                <span className="flex-1">{getPageLabel(pageId)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(pageId);
                  }}
                  aria-label={`${getPageLabel(pageId)} aus Favoriten entfernen`}
                >
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Zuletzt besucht */}
        {recentPages.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <History className="h-4 w-4 text-blue-500" />
              Zuletzt besucht
            </DropdownMenuLabel>
            {recentPages.map((pageId) => (
              <DropdownMenuItem
                key={pageId}
                onClick={() => handleNavigate(pageId)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {getPageIcon(pageId)}
                <span className="flex-1">{getPageLabel(pageId)}</span>
                {!favoritePages.includes(pageId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(pageId);
                    }}
                    aria-label={`${getPageLabel(pageId)} zu Favoriten hinzufügen`}
                  >
                    <Star className="h-3 w-3 text-gray-400 hover:text-yellow-500" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Häufig verwendet */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Häufig verwendet
        </DropdownMenuLabel>
        {FREQUENT_PAGES.filter((pageId) => !recentPages.includes(pageId) && !favoritePages.includes(pageId)).map((pageId) => (
          <DropdownMenuItem
            key={pageId}
            onClick={() => handleNavigate(pageId)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {getPageIcon(pageId)}
            <span className="flex-1">{getPageLabel(pageId)}</span>
            {!favoritePages.includes(pageId) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(pageId);
                }}
                aria-label={`${getPageLabel(pageId)} zu Favoriten hinzufügen`}
              >
                <Star className="h-3 w-3 text-gray-400 hover:text-yellow-500" />
              </Button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QuickLinksDropdown;







