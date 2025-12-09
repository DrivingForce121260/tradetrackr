import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  FileText,
  Users,
  Package,
  Building2,
  ClipboardList,
  Settings,
  Shield,
  Clock,
  Zap,
  Calendar,
  Euro,
  Activity,
  Briefcase,
  Box,
  Database,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesktopSidebarProps {
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
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

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ className }) => {
  const { currentPage, navigateTo } = useNavigation();
  const { hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tradetrackr_sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('tradetrackr_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const navGroups: NavGroup[] = [
    {
      id: 'main',
      label: 'Hauptnavigation',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
      ],
    },
    {
      id: 'projects-tasks',
      label: 'Projekte & Aufgaben',
      items: [
        {
          id: 'projects',
          label: 'Projekte',
          icon: <FolderOpen className="h-5 w-5" />,
          permission: 'view_projects',
        },
        {
          id: 'tasks',
          label: 'Aufgaben',
          icon: <CheckSquare className="h-5 w-5" />,
          permission: 'view_tasks',
        },
        {
          id: 'project-info',
          label: 'Projektinfos',
          icon: <Briefcase className="h-5 w-5" />,
          permission: 'view_project_info',
        },
        {
          id: 'reports',
          label: 'Berichte',
          icon: <FileText className="h-5 w-5" />,
          permission: 'view_reports',
        },
      ],
    },
    {
      id: 'crm-sales',
      label: 'CRM & Vertrieb',
      items: [
        {
          id: 'crm',
          label: 'CRM',
          icon: <Building2 className="h-5 w-5" />,
          permission: 'view_crm',
        },
        {
          id: 'customers',
          label: 'Kunden',
          icon: <Users className="h-5 w-5" />,
          permission: 'view_customers',
        },
        {
          id: 'smart-inbox',
          label: 'Smart Inbox',
          icon: <Mail className="h-5 w-5" />,
        },
        {
          id: 'invoicing',
          label: 'Angebote & Rechnungen',
          icon: <Euro className="h-5 w-5" />,
        },
      ],
    },
    {
      id: 'resources',
      label: 'Ressourcen',
      items: [
        {
          id: 'categories',
          label: 'Kategorien',
          icon: <ClipboardList className="h-5 w-5" />,
          permission: 'view_categories',
        },
        {
          id: 'materials',
          label: 'Materialien',
          icon: <Package className="h-5 w-5" />,
          permission: 'view_materials',
        },
        {
          id: 'documents',
          label: 'Dokumente',
          icon: <FileText className="h-5 w-5" />,
          permission: 'view_documents',
        },
      ],
    },
    {
      id: 'personnel',
      label: 'Personal',
      items: [
        {
          id: 'personnel',
          label: 'Personalübersicht',
          icon: <Users className="h-5 w-5" />,
        },
        {
          id: 'users',
          label: 'Benutzer',
          icon: <Users className="h-5 w-5" />,
          permission: 'view_users',
        },
        {
          id: 'vacations',
          label: 'Urlaubskalender',
          icon: <Calendar className="h-5 w-5" />,
        },
      ],
    },
    {
      id: 'time',
      label: 'Zeit',
      items: [
        {
          id: 'time-admin',
          label: 'Zeit | Admin',
          icon: <Clock className="h-5 w-5" />,
          permission: 'admin',
        },
        {
          id: 'time-ops-live',
          label: 'Zeit | Ops',
          icon: <Activity className="h-5 w-5" />,
          permission: 'supervisor',
        },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        {
          id: 'automation',
          label: 'Automation',
          icon: <Zap className="h-5 w-5" />,
          permission: 'admin',
        },
        {
          id: 'concern-management',
          label: 'Concern-Verwaltung',
          icon: <Shield className="h-5 w-5" />,
          permission: 'admin',
        },
        {
          id: 'settings',
          label: 'Einstellungen',
          icon: <Settings className="h-5 w-5" />,
        },
        {
          id: 'templates',
          label: 'Vorlagen',
          icon: <Database className="h-5 w-5" />,
        },
      ],
    },
  ];

  const handleNavClick = (pageId: string) => {
    navigateTo(pageId);
  };

  // Icon color mapping based on page ID
  const getIconColor = (pageId: string, isActive: boolean): string => {
    if (isActive) return 'text-white';
    
    const colorMap: Record<string, string> = {
      'dashboard': 'text-blue-600',
      'projects': 'text-blue-600',
      'tasks': 'text-green-600',
      'project-info': 'text-purple-600',
      'reports': 'text-indigo-600',
      'crm': 'text-cyan-600',
      'customers': 'text-teal-600',
      'smart-inbox': 'text-pink-600',
      'invoicing': 'text-emerald-600',
      'categories': 'text-orange-600',
      'materials': 'text-amber-600',
      'documents': 'text-sky-600',
      'personnel': 'text-violet-600',
      'users': 'text-rose-600',
      'vacations': 'text-lime-600',
      'time-admin': 'text-red-600',
      'time-ops-live': 'text-yellow-600',
      'automation': 'text-fuchsia-600',
      'concern-management': 'text-slate-600',
      'settings': 'text-gray-600',
      'templates': 'text-blue-700',
    };
    
    return colorMap[pageId] || 'text-gray-600';
  };

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || hasPermission(item.permission)
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-white via-blue-50/30 to-white border-r-4 border-[#058bc0]/20 shadow-2xl transition-all duration-300 backdrop-blur-sm',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
      aria-label="Hauptnavigation"
    >
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#058bc0]/5 via-transparent to-[#0470a0]/5 pointer-events-none"></div>
      
      {/* Collapse Toggle Button */}
      <div className="relative flex items-center justify-end p-3 border-b-2 border-[#058bc0]/20 bg-gradient-to-r from-transparent via-blue-50/50 to-transparent">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-9 w-9 p-0 hover:bg-gradient-to-r hover:from-[#058bc0]/10 hover:to-[#0470a0]/10 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md"
          aria-label={collapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-[#058bc0] transition-transform duration-200" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-[#058bc0] transition-transform duration-200" />
          )}
        </Button>
      </div>

      {/* Logo/Brand */}
      {!collapsed && (
        <div className="relative p-5 border-b-2 border-[#058bc0]/20 bg-gradient-to-r from-[#058bc0]/10 via-blue-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#058bc0] to-[#0470a0] rounded-xl blur-sm opacity-50"></div>
              <div className="relative w-12 h-12 bg-white rounded-xl p-1.5 shadow-lg border-2 border-[#058bc0]/30 flex items-center justify-center">
                <img 
                  src="/TTroundLogo.jpg" 
                  alt="TradeTrackr Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl bg-gradient-to-r from-[#058bc0] to-[#0470a0] bg-clip-text text-transparent leading-tight">
                TradeTrackr
              </span>
              <span className="text-xs text-gray-500 font-medium">Navigation</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Collapsed Logo */}
      {collapsed && (
        <div className="relative p-3 border-b-2 border-[#058bc0]/20 bg-gradient-to-r from-[#058bc0]/10 via-blue-50/50 to-transparent flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#058bc0] to-[#0470a0] rounded-lg blur-sm opacity-50"></div>
            <div className="relative w-10 h-10 bg-white rounded-lg p-1 shadow-lg border-2 border-[#058bc0]/30 flex items-center justify-center">
              <img 
                src="/TTroundLogo.jpg" 
                alt="TradeTrackr Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <nav className="p-3 space-y-1 relative z-10">
          {filteredGroups.map((group) => (
            <div key={group.id} className="mb-5">
              {!collapsed && (
                <div className="px-3 py-2.5 mb-2 text-xs font-bold text-[#058bc0] uppercase tracking-widest bg-gradient-to-r from-[#058bc0]/10 to-transparent rounded-md border-l-4 border-[#058bc0]">
                  {group.label}
                </div>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300',
                        'focus:outline-none focus:ring-2 focus:ring-[#058bc0] focus:ring-offset-2',
                        isActive
                          ? 'bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white shadow-lg shadow-[#058bc0]/30 scale-[1.02]'
                          : 'text-gray-700 hover:text-[#058bc0] hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100/50 hover:shadow-md hover:scale-[1.01]',
                        collapsed && 'justify-center'
                      )}
                      aria-label={collapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Active Indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                      )}
                      
                      {/* Icon Container */}
                      <span className={cn(
                        'relative flex-shrink-0 transition-all duration-300',
                        isActive 
                          ? 'text-white scale-110' 
                          : `${getIconColor(item.id, false)} group-hover:scale-110`,
                        !isActive && 'group-hover:bg-white/50 rounded-lg p-1'
                      )}>
                        {React.cloneElement(item.icon as React.ReactElement, {
                          className: cn(
                            (item.icon as React.ReactElement).props?.className,
                            isActive ? 'text-white' : getIconColor(item.id, false)
                          )
                        })}
                      </span>
                      
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full px-2 py-0.5 font-bold shadow-md animate-pulse">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      
                      {/* Hover Shimmer Effect */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-xl"></div>
                      )}
                    </button>
                  );
                })}
              </div>
              {group.id !== filteredGroups[filteredGroups.length - 1].id && (
                <Separator className="my-5 bg-gradient-to-r from-transparent via-[#058bc0]/20 to-transparent" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
};

export default DesktopSidebar;

