import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, CheckSquare, User, Building2, ClipboardList, Package, FileText, Plus, Archive } from 'lucide-react';

interface QuickActionButtonsProps {
  onNavigate: (page: string) => void;
  hasPermission: (permission: string) => boolean;
  currentPage?: string; // Neue Prop für die aktuelle Seite
}

const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({ onNavigate, hasPermission, currentPage }) => {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center gap-4">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('dashboard')}
              className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-transparent hover:bg-white/10 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/30 hover:border-white/50 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
            >
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <span>Dashboard</span>
            </Button>
          </div>
          
          {/* Aufgaben-Button nur anzeigen wenn NICHT auf der Aufgabenverwaltung-Seite */}
          {currentPage !== 'tasks' && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('tasks')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-green-50/30 hover:bg-green-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green-300/60 hover:border-green-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <CheckSquare className="h-5 w-5 text-green-600" />
                <span>Aufgaben</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('new-task')}
                className="absolute top-1 right-1 h-5 w-5 p-0 bg-green-600 text-white hover:bg-green-700"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Projekte-Button nur anzeigen wenn NICHT auf der Projektverwaltung-Seite */}
          {currentPage !== 'projects' && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('projects')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-blue-50/30 hover:bg-blue-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-300/60 hover:border-blue-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <span>Projekte</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('new-project')}
                className="absolute top-1 right-1 h-5 w-5 p-0 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Benutzer-Button nur anzeigen wenn NICHT auf der Benutzerverwaltung-Seite */}
          {currentPage !== 'users' && hasPermission('view_users') && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('users')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-gray-50/30 hover:bg-gray-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-300/60 hover:border-gray-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <User className="h-5 w-5 text-gray-600" />
                <span>Benutzer</span>
              </Button>
              {/* Plus-Button nur anzeigen wenn Benutzer erstellen darf */}
              {hasPermission('create_user') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('new-user')}
                  className="absolute top-1 right-1 h-5 w-5 p-0 bg-gray-600 text-white hover:bg-gray-700"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          
          {/* Kunden-Button nur anzeigen wenn NICHT auf der Kundenverwaltung-Seite */}
          {currentPage !== 'customers' && hasPermission('create_customer') && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('customers')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-indigo-50/30 hover:bg-indigo-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-indigo-300/60 hover:border-indigo-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <Building2 className="h-5 w-5 text-indigo-600" />
                <span>Kunden</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('new-customer')}
                className="absolute top-1 right-1 h-5 w-5 p-0 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Kategorien-Button nur anzeigen wenn NICHT auf der Kategorien-Seite */}
          {currentPage !== 'categories' && hasPermission('view_categories') && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('categories')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-pink-50/30 hover:bg-pink-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-pink-300/60 hover:border-pink-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <ClipboardList className="h-5 w-5 text-pink-600" />
                <span>Kategorien</span>
              </Button>
              {/* Plus-Button nur anzeigen wenn Kategorien erstellen darf */}
              {hasPermission('create_category') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('new-category')}
                  className="absolute top-1 right-1 h-5 w-5 p-0 bg-pink-600 text-white hover:bg-pink-700"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          
          {/* Materialien-Button nur anzeigen wenn NICHT auf der Materialverwaltung-Seite */}
          {currentPage !== 'materials' && hasPermission('create_material') && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('materials')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-teal-50/30 hover:bg-teal-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-teal-300/60 hover:border-teal-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <Package className="h-5 w-5 text-teal-600" />
                <span>Materialien</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('new-material')}
                className="absolute top-1 right-1 h-5 w-5 p-0 bg-teal-600 text-white hover:bg-teal-700"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Projektinfos-Button nur anzeigen wenn NICHT auf der Projektinfos-Seite */}
          {currentPage !== 'project-info' && hasPermission('create_project_info') && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('project-info')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-purple-50/30 hover:bg-purple-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-purple-300/60 hover:border-purple-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <FileText className="h-5 w-5 text-purple-600" />
                <span>Projektinfos</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('new-project-info')}
                className="absolute top-1 right-1 h-5 w-5 p-0 bg-purple-600 text-white hover:bg-purple-700"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Berichte-Button nur anzeigen wenn NICHT auf der Berichtsverwaltung-Seite */}
          {currentPage !== 'reports' && hasPermission('view_reports') && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('reports')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-yellow-50/30 hover:bg-yellow-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-yellow-300/60 hover:border-yellow-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <FileText className="h-5 w-5 text-yellow-600" />
                <span>Berichte</span>
              </Button>
              {/* Plus-Button nur anzeigen wenn Berichte erstellen darf */}
              {hasPermission('create_report') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('new-report')}
                  className="absolute top-1 right-1 h-5 w-5 p-0 bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          
          {/* Dokumente-Button nur anzeigen wenn NICHT auf der Dokumentverwaltung-Seite */}
          {currentPage !== 'documents' && hasPermission('create_document') && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('documents')}
                className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-orange-50/30 hover:bg-orange-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-orange-300/60 hover:border-orange-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
              >
                <Archive className="h-5 w-5 text-orange-600" />
                <span>Dokumente</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('upload-document')}
                className="absolute top-1 right-1 h-5 w-5 p-0 bg-orange-600 text-white hover:bg-orange-700"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickActionButtons;

