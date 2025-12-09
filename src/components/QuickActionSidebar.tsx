/**
 * Quick Action Sidebar - Vertical navigation on the left side
 * Shows only 5 main category icons, each with submenu navigation
 * Inspired by the Administration button structure
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, 
  CheckSquare, 
  User, 
  Building2, 
  ClipboardList, 
  Package, 
  FileText, 
  Plus, 
  Archive,
  Settings,
  Shield,
  Clock,
  Zap,
  Database,
  Calendar,
  Users,
  Euro,
  Activity,
  Briefcase,
  Box
} from 'lucide-react';

interface QuickActionSidebarProps {
  onNavigate: (page: string) => void;
  hasPermission: (permission: string) => boolean;
  currentPage?: string;
}

interface SubMenuItem {
  id: string;
  label: string;
  permission?: string;
  plusAction?: string;
  plusPermission?: string;
}

interface ActionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBgColor: string;
  subItems: SubMenuItem[];
}

const QuickActionSidebar: React.FC<QuickActionSidebarProps> = ({ 
  onNavigate, 
  hasPermission, 
  currentPage 
}) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [pinnedButton, setPinnedButton] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close pinned menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pinnedButton && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setPinnedButton(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pinnedButton]);
  
  // Dashboard button (always visible at top, separate from categories)
  const dashboardButton = {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <FolderOpen className="h-6 w-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    hoverBgColor: 'hover:bg-blue-100'
  };

  // Consolidated 5 main categories
  const actionButtons: ActionButton[] = [
    {
      id: 'projects-tasks',
      label: 'Projekte & Aufgaben',
      icon: <Briefcase className="h-6 w-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      hoverBgColor: 'hover:bg-purple-100',
      subItems: [
        { 
          id: 'projects', 
          label: 'Projekte',
          plusAction: 'new-project',
          plusPermission: 'create_project'
        },
        { 
          id: 'tasks', 
          label: 'Aufgaben',
          plusAction: 'new-task',
          plusPermission: 'create_task'
        },
        { 
          id: 'project-info', 
          label: 'Projektinfos',
          permission: 'create_project_info',
          plusAction: 'new-project-info'
        },
        { 
          id: 'reports', 
          label: 'Berichte',
          permission: 'view_reports',
          plusAction: 'new-report',
          plusPermission: 'create_report'
        }
      ]
    },
    {
      id: 'crm-sales',
      label: 'CRM & Vertrieb',
      icon: <Building2 className="h-6 w-6" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      hoverBgColor: 'hover:bg-indigo-100',
      subItems: [
        { 
          id: 'crm', 
          label: 'CRM',
          permission: 'view_crm'
        },
        { 
          id: 'customers', 
          label: 'Kunden',
          permission: 'create_customer',
          plusAction: 'new-customer'
        },
        { 
          id: 'smart-inbox', 
          label: 'Smart Inbox'
        },
        { 
          id: 'invoicing', 
          label: 'Angebote & Rechnungen'
        }
      ]
    },
    {
      id: 'resources',
      label: 'Ressourcen',
      icon: <Box className="h-6 w-6" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-300',
      hoverBgColor: 'hover:bg-teal-100',
      subItems: [
        { 
          id: 'categories', 
          label: 'Kategorien',
          permission: 'view_categories',
          plusAction: 'new-category',
          plusPermission: 'create_category'
        },
        { 
          id: 'materials', 
          label: 'Materialien',
          permission: 'create_material',
          plusAction: 'new-material'
        },
        { 
          id: 'documents', 
          label: 'Dokumente',
          permission: 'create_document',
          plusAction: 'upload-document'
        }
      ]
    },
    {
      id: 'personnel',
      label: 'Personal',
      icon: <Users className="h-6 w-6" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
      hoverBgColor: 'hover:bg-emerald-100',
      subItems: [
        { 
          id: 'personnel', 
          label: 'Personalübersicht'
        },
        { 
          id: 'scheduling', 
          label: 'Personaleinsatzplan',
          permission: undefined // No permission required, always visible
        },
        { 
          id: 'time-ops-live', 
          label: 'Zeit Operations'
        }
      ]
    },
    {
      id: 'administration',
      label: 'Administration',
      icon: <Shield className="h-6 w-6" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      hoverBgColor: 'hover:bg-red-100',
      subItems: [
        { id: 'automation', label: 'Automation', permission: 'admin' },
        { id: 'users', label: 'Benutzer', permission: 'view_users' },
        { id: 'concern-management', label: 'Concern-Verwaltung', permission: 'admin' },
        { id: 'settings', label: 'Einstellungen' },
        { id: 'system-logs', label: 'System Logs', permission: 'admin' },
        { id: 'time-admin', label: 'Zeit Administration', permission: 'admin' }
      ]
    }
  ];

  // Filter visible buttons - show if any subitems are accessible
  const visibleButtons = actionButtons.filter(button => {
    const hasAccessibleSubItems = button.subItems.some(sub => 
      !sub.permission || hasPermission(sub.permission)
    );
    return hasAccessibleSubItems;
  });

  return (
    <div ref={sidebarRef} className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
      <div className="flex flex-col gap-3">
        {/* Dashboard Button - Always visible at top */}
        {currentPage !== 'dashboard' && (
          <div 
            className="relative group pb-2 border-b-2 border-gray-300"
            onMouseEnter={() => setHoveredButton('dashboard')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('dashboard')}
              className={`
                w-14 h-14 p-0 
                ${dashboardButton.bgColor} ${dashboardButton.borderColor} ${dashboardButton.hoverBgColor}
                border-2 rounded-xl shadow-lg hover:shadow-2xl
                transition-all duration-300
                hover:scale-110 hover:-translate-x-1
                backdrop-blur-sm
              `}
            >
              <div className={dashboardButton.color}>
                {dashboardButton.icon}
              </div>
            </Button>

            {/* Dashboard Label on Hover */}
            {hoveredButton === 'dashboard' && (
              <div 
                className={`
                  absolute left-16 top-1/2 -translate-y-1/2
                  ${dashboardButton.bgColor} ${dashboardButton.borderColor}
                  border-2 rounded-lg shadow-2xl
                  px-4 py-2
                  whitespace-nowrap
                  animate-in slide-in-from-left-2 fade-in
                  duration-200
                  pointer-events-none
                `}
              >
                <span className={`font-semibold ${dashboardButton.color}`}>
                  {dashboardButton.label}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Main Category Buttons */}
        {visibleButtons.map((button) => {
          // Check if any sub-item is the current page
          const hasCurrentPage = button.subItems.some(sub => sub.id === currentPage);
          
          return (
            <div 
              key={button.id}
              className="relative group"
              onMouseEnter={() => setHoveredButton(button.id)}
              onMouseLeave={(e) => {
                // Don't close if moving to the submenu
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (relatedTarget && relatedTarget.closest('.submenu-container')) {
                  return;
                }
                setHoveredButton(null);
              }}
            >
              {/* Main Icon Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle pinned state
                  setPinnedButton(pinnedButton === button.id ? null : button.id);
                }}
                className={`
                  w-14 h-14 p-0 
                  ${button.bgColor} ${button.borderColor} ${button.hoverBgColor}
                  border-2 rounded-xl shadow-lg hover:shadow-2xl
                  transition-all duration-300
                  hover:scale-110 hover:-translate-x-1
                  backdrop-blur-sm
                  ${hasCurrentPage ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                `}
              >
                <div className={button.color}>
                  {button.icon}
                </div>
              </Button>

              {/* Submenu Card */}
              {(hoveredButton === button.id || pinnedButton === button.id) && (
                <div 
                  className={`
                    submenu-container
                    absolute left-16 top-1/2 -translate-y-1/2
                    bg-white border-2 ${button.borderColor}
                    rounded-lg shadow-2xl
                    py-2
                    min-w-[240px]
                    animate-in slide-in-from-left-2 fade-in
                    duration-200
                    ${pinnedButton === button.id ? 'ring-2 ring-blue-400' : ''}
                  `}
                  onMouseEnter={() => setHoveredButton(button.id)}
                  onMouseLeave={() => {
                    // Only clear hover, not pinned
                    if (!pinnedButton) {
                      setHoveredButton(null);
                    }
                  }}
                >
                  {/* Header */}
                  <div className={`px-3 py-2 font-bold ${button.color} border-b-2 ${button.borderColor} mb-1`}>
                    {button.label}
                  </div>
                  
                  {/* Sub Items */}
                  {button.subItems
                    .filter(sub => sub.permission === undefined || hasPermission(sub.permission))
                    .map((subItem) => (
                      <div 
                        key={subItem.id}
                        className="relative group/subitem"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(subItem.id);
                            setHoveredButton(null);
                            setPinnedButton(null);
                          }}
                          className={`
                            w-full text-left px-3 py-2 text-sm
                            ${currentPage === subItem.id ? 'bg-blue-100 font-semibold text-blue-700' : 'hover:bg-gray-100 text-gray-700'}
                            transition-colors duration-150
                            flex items-center justify-between
                          `}
                        >
                          <span>{subItem.label}</span>
                          
                          {/* Plus Button for sub-items with plusAction */}
                          {subItem.plusAction && (!subItem.plusPermission || hasPermission(subItem.plusPermission)) && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(subItem.plusAction!);
                                setHoveredButton(null);
                                setPinnedButton(null);
                              }}
                              className={`
                                h-5 w-5 rounded-full cursor-pointer
                                ${button.color.replace('text-', 'bg-')} text-white
                                hover:scale-110 shadow-sm hover:shadow-md
                                transition-all duration-200
                                flex items-center justify-center
                                opacity-0 group-hover/subitem:opacity-100
                              `}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onNavigate(subItem.plusAction!);
                                  setHoveredButton(null);
                                  setPinnedButton(null);
                                }
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionSidebar;
