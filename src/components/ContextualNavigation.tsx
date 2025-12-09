import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  FileText,
  FolderOpen,
  Users,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { taskService, reportService, projectService } from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ContextualNavigationProps {
  type: 'project' | 'task' | 'employee' | 'report';
  entityId: string;
  entityName?: string;
  className?: string;
}

interface RelatedItem {
  id: string;
  label: string;
  count?: number;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
}

const ContextualNavigation: React.FC<ContextualNavigationProps> = ({
  type,
  entityId,
  entityName,
  className,
}) => {
  const { navigateTo } = useNavigation();
  const { user } = useAuth();
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRelatedItems();
  }, [type, entityId, user?.concernID]);

  const loadRelatedItems = async () => {
    if (!user?.concernID) return;
    
    setIsLoading(true);
    try {
      const items: RelatedItem[] = [];

      switch (type) {
        case 'project': {
          // Von Projekten zu zugehörigen Aufgaben
          const tasks = await taskService.getAll(user.concernID);
          const project = await projectService.get(entityId);
          const projectTasks = tasks.filter((task: any) => 
            task.projectNumber === project?.projectNumber?.toString() || task.projectId === entityId
          );
          
          if (projectTasks.length > 0) {
            items.push({
              id: 'tasks',
              label: 'Zugehörige Aufgaben',
              count: projectTasks.length,
              onClick: () => {
                localStorage.setItem('filterProjectId', entityId);
                navigateTo('tasks');
              },
              icon: <CheckSquare className="h-4 w-4" />,
              color: 'text-blue-600 bg-blue-50',
            });
          }

          // Von Projekten zu zugehörigen Berichten
          const reports = await reportService.getReportsByConcern(user.concernID);
          const projectReports = reports.filter((report: any) => 
            report.projectNumber === project?.projectNumber?.toString() || 
            report.projectReportNumber === project?.projectNumber?.toString()
          );
          
          if (projectReports.length > 0) {
            items.push({
              id: 'reports',
              label: 'Zugehörige Berichte',
              count: projectReports.length,
              onClick: () => {
                localStorage.setItem('filterProjectId', entityId);
                navigateTo('reports');
              },
              icon: <FileText className="h-4 w-4" />,
              color: 'text-green-600 bg-green-50',
            });
          }
          break;
        }

        case 'task': {
          // Von Aufgaben zu zugehörigen Berichten
          const task = await taskService.get(entityId);
          if (task?.projectNumber) {
            const reports = await reportService.getReportsByConcern(user.concernID);
            const taskReports = reports.filter((report: any) => 
              report.projectNumber === task.projectNumber || 
              report.projectReportNumber === task.projectNumber
            );
            
            if (taskReports.length > 0) {
              items.push({
                id: 'reports',
                label: 'Zugehörige Berichte',
                count: taskReports.length,
                onClick: () => {
                  localStorage.setItem('filterProjectNumber', task.projectNumber);
                  navigateTo('reports');
                },
                icon: <FileText className="h-4 w-4" />,
                color: 'text-green-600 bg-green-50',
              });
            }

            // Von Aufgaben zum zugehörigen Projekt
            const projects = await projectService.getAll(user.concernID);
            const project = projects.find((p: any) => p.projectNumber?.toString() === task.projectNumber);
            if (project) {
              items.push({
                id: 'project',
                label: 'Zugehöriges Projekt',
                onClick: () => {
                  navigateTo('projects');
                },
                icon: <FolderOpen className="h-4 w-4" />,
                color: 'text-purple-600 bg-purple-50',
              });
            }
          }
          break;
        }

        case 'employee': {
          // Von Mitarbeitern zu deren Projekten
          const projects = await projectService.getAll(user.concernID);
          const employeeProjects = projects.filter((project: any) => 
            project.mitarbeiterID === entityId || 
            project.assignedEmployees?.includes(entityId)
          );
          
          if (employeeProjects.length > 0) {
            items.push({
              id: 'projects',
              label: 'Zugeordnete Projekte',
              count: employeeProjects.length,
              onClick: () => {
                localStorage.setItem('filterEmployeeId', entityId);
                navigateTo('projects');
              },
              icon: <FolderOpen className="h-4 w-4" />,
              color: 'text-purple-600 bg-purple-50',
            });
          }

          // Von Mitarbeitern zu deren Aufgaben
          const tasks = await taskService.getAll(user.concernID);
          const employeeTasks = tasks.filter((task: any) => 
            task.assignedTo === entityId || task.employee === entityId
          );
          
          if (employeeTasks.length > 0) {
            items.push({
              id: 'tasks',
              label: 'Zugeordnete Aufgaben',
              count: employeeTasks.length,
              onClick: () => {
                localStorage.setItem('filterEmployeeId', entityId);
                navigateTo('tasks');
              },
              icon: <CheckSquare className="h-4 w-4" />,
              color: 'text-blue-600 bg-blue-50',
            });
          }

          // Von Mitarbeitern zu deren Berichten
          const reports = await reportService.getReportsByConcern(user.concernID);
          const employeeReports = reports.filter((report: any) => 
            report.mitarbeiterID === entityId || report.employee === entityId
          );
          
          if (employeeReports.length > 0) {
            items.push({
              id: 'reports',
              label: 'Erstellte Berichte',
              count: employeeReports.length,
              onClick: () => {
                localStorage.setItem('filterEmployeeId', entityId);
                navigateTo('reports');
              },
              icon: <FileText className="h-4 w-4" />,
              color: 'text-green-600 bg-green-50',
            });
          }
          break;
        }

        case 'report': {
          // Von Berichten zum zugehörigen Projekt
          const report = await reportService.getReportById(entityId);
          if (report?.projectNumber) {
            const projects = await projectService.getAll(user.concernID);
            const project = projects.find((p: any) => 
              p.projectNumber?.toString() === report.projectNumber
            );
            if (project) {
              items.push({
                id: 'project',
                label: 'Zugehöriges Projekt',
                onClick: () => {
                  navigateTo('projects');
                },
                icon: <FolderOpen className="h-4 w-4" />,
                color: 'text-purple-600 bg-purple-50',
              });
            }
          }

          // Von Berichten zum zugehörigen Mitarbeiter
          if (report?.mitarbeiterID) {
            items.push({
              id: 'employee',
              label: 'Erstellt von',
              onClick: () => {
                navigateTo('users');
              },
              icon: <Users className="h-4 w-4" />,
              color: 'text-orange-600 bg-orange-50',
            });
          }
          break;
        }
      }

      setRelatedItems(items);
    } catch (error) {
      console.error('Error loading related items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || relatedItems.length === 0) {
    return null;
  }

  return (
    <Card className={cn('border-2 border-[#058bc0]/20 shadow-lg bg-gradient-to-br from-white to-blue-50/30', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-[#058bc0]/10 to-transparent border-b-2 border-[#058bc0]/20">
        <CardTitle className="text-sm font-bold text-[#058bc0] flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Verwandte Elemente
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {relatedItems.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              onClick={item.onClick}
              className={cn(
                'w-full justify-between h-auto py-3 px-4 hover:shadow-md transition-all duration-200 hover:scale-[1.02]',
                item.color,
                'border-2 hover:border-[#058bc0]'
              )}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={cn('p-2 rounded-lg', item.color)}>
                  {item.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">{item.label}</div>
                  {entityName && (
                    <div className="text-xs opacity-70 mt-0.5">{entityName}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.count !== undefined && (
                  <Badge className="bg-[#058bc0] text-white font-bold">
                    {item.count}
                  </Badge>
                )}
                <ArrowRight className="h-4 w-4" />
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContextualNavigation;

