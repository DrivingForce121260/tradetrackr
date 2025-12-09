import React, { useState, useEffect, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuickAction } from '@/contexts/QuickActionContext';
import AppHeader from './AppHeader';
import { LoadingSpinner, TableSkeleton, InlineLoading } from '@/components/ui/loading';
import { showSuccessToast } from '@/components/ui/toast-helpers';
import { useResponsiveViewMode } from '@/hooks/use-responsive-view-mode';
import { useFormValidation, validationRules } from '@/hooks/use-form-validation';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-input';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { BulkSelect, BulkActions } from '@/components/ui/bulk-select';
import { Checkbox } from '@/components/ui/checkbox';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  Package,
  FolderOpen,
  BarChart3,
  Building2,
  ClipboardList,
  Archive
} from 'lucide-react';

import { Task, TaskManagementProps } from '@/types';

const TaskManagement: React.FC<TaskManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { toast, toastSuccess } = useToast();
  const { isQuickAction, quickActionType } = useQuickAction();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode, isMobile] = useResponsiveViewMode('table');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  
  // Infinite scroll state
  const [displayedTasksCount, setDisplayedTasksCount] = useState(20);
  const itemsPerPage = 20;
  
  // Tablet layout
  const { isTablet, isTwoColumn } = useTabletLayout();
  
  // Pull-to-refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Reload tasks
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks);
      }
      
      // Reload from Firestore if available
      if (user?.concernID) {
        try {
          const { taskService } = await import('@/services/firestoreService');
          const firestoreTasks = await taskService.getAll(user.concernID);
          
          if (firestoreTasks && firestoreTasks.length > 0) {
            const formattedTasks = firestoreTasks.map((task: any) => ({
              id: task.uid || task.id || '',
              projectId: '',
              projectNumber: task.projectNumber || '',
              title: task.title || '',
              description: task.description || '',
              assignedTo: task.assignedTo || '',
              dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
              priority: task.priority || 'medium',
              status: task.status || 'pending',
              createdAt: task.dateCreated ? new Date(task.dateCreated).toISOString() : new Date().toISOString(),
              createdBy: task.createdBy || user?.uid || '',
              concernID: task.concernID || user?.concernID || '',
              firestoreId: task.uid || task.id || '',
              customer: task.customer || '',
              workLocation: task.workLocation || '',
              hours: task.hours || 0,
              category: task.category || 'general'
            }));
            
            setTasks(formattedTasks);
            localStorage.setItem('tasks', JSON.stringify(formattedTasks));
          }
        } catch (firestoreError) {
          console.log('Firestore reload error:', firestoreError);
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const { isRefreshing, pullDistance, canRefresh, containerProps } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: isMobile,
  });
  
  // Infinite scroll will be initialized after sortedTasks is defined

  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Form validation hook
  const {
    values: validationValues,
    errors: validationErrors,
    touched: validationTouched,
    isValid: isFormValid,
    allErrors: formAllErrors,
    getFieldProps,
    handleSubmit: handleFormSubmit,
    reset: resetValidation,
    setValues: setValidationValues,
  } = useFormValidation({
    initialValues: formData,
    validationRules: {
      projectId: [validationRules.required('Bitte wählen Sie ein Projekt aus')],
      title: [
        validationRules.required('Der Aufgabentitel ist erforderlich'),
        validationRules.minLength(3, 'Der Titel muss mindestens 3 Zeichen lang sein'),
        validationRules.maxLength(100, 'Der Titel darf maximal 100 Zeichen lang sein'),
      ],
      description: [
        validationRules.maxLength(500, 'Die Beschreibung darf maximal 500 Zeichen lang sein'),
      ],
      assignedTo: [validationRules.required('Bitte wählen Sie einen Mitarbeiter aus')],
      dueDate: [validationRules.required('Bitte wählen Sie ein Fälligkeitsdatum aus')],
      priority: [validationRules.required('Bitte wählen Sie eine Priorität aus')],
    },
    onSubmit: async (values) => {
      // Use the existing handleSubmit logic
      await handleSubmit(new Event('submit') as any);
    },
    validateOnBlur: true,
    validateOnChange: false,
  });

  // Sync formData with validation values
  useEffect(() => {
    setValidationValues(formData);
  }, [formData, setValidationValues]);

  // State for employees
  const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Load projects function
  const loadProjects = async () => {
    try {
      // Try to load from localStorage first
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
        console.log('📋 [TASK MANAGEMENT] Loaded projects from localStorage:', parsedProjects.length);
      }
      
      // Also try to load from Firestore if available
      if (user?.concernID) {
        try {
          const { projectService } = await import('@/services/firestoreService');
          const firestoreProjects = await projectService.getAll(user.concernID);
          const formattedProjects = firestoreProjects.map((project: any) => ({
            id: project.uid || project.id || '',
            projectNumber: project.projectNumber || '',
            name: project.title || project.name || project.projectNumber || ''
          }));
          
          if (formattedProjects.length > 0) {
            setProjects(formattedProjects);
            console.log('📋 [TASK MANAGEMENT] Loaded projects from Firestore:', formattedProjects.length);
          }
        } catch (firestoreError) {
          console.log('📋 [TASK MANAGEMENT] Firestore not available, using localStorage projects');
        }
      }
    } catch (error) {
      console.error('📋 [TASK MANAGEMENT] Error loading projects:', error);
    }
  };

  // Load employees function
  const loadEmployees = async () => {
    if (!user?.concernID) return;
    
    setIsLoadingEmployees(true);
    try {
      // Try to load from localStorage first
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const parsedEmployees = JSON.parse(savedEmployees);
        const formattedEmployees = parsedEmployees.map((emp: any) => ({
          id: emp.uid || emp.id || '',
          name: `${emp.vorname || emp.firstName || ''} ${emp.nachname || emp.lastName || ''}`.trim() || 'Unbekannt'
        })).filter((emp: any) => emp.name !== 'Unbekannt');
        
        setEmployees(formattedEmployees);
        console.log('👥 [TASK MANAGEMENT] Loaded employees from localStorage:', formattedEmployees);
      }
      
      // Also try to load from Firestore if available
      try {
        const { userService } = await import('@/services/firestoreService');
        const firestoreUsers = await userService.getUsersByConcern(user.concernID);
        const firestoreEmployees = firestoreUsers.map((user: any) => ({
          id: user.uid || user.id || '',
          name: `${user.vorname || user.firstName || ''} ${user.nachname || user.lastName || ''}`.trim() || 'Unbekannt'
        })).filter((user: any) => user.name !== 'Unbekannt');
        
        if (firestoreEmployees.length > 0) {
          setEmployees(firestoreEmployees);
          console.log('👥 [TASK MANAGEMENT] Loaded employees from Firestore:', firestoreEmployees);
        }
      } catch (firestoreError) {
        console.log('👥 [TASK MANAGEMENT] Firestore not available, using localStorage employees');
      }
    } catch (error) {
      console.error('👥 [TASK MANAGEMENT] Error loading employees:', error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Load tasks, projects and employees from localStorage
  useEffect(() => {
    const loadTasks = async () => {
      try {
        // Try to load from localStorage first (for quick display)
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          setTasks(parsedTasks);
          console.log('📋 [TASK MANAGEMENT] Loaded tasks from localStorage:', parsedTasks.length);
        }
        
        // Load from Firestore if available
        if (user?.concernID) {
          try {
            const { taskService } = await import('@/services/firestoreService');
            const firestoreTasks = await taskService.getAll(user.concernID);
            
            if (firestoreTasks && firestoreTasks.length > 0) {
              // Convert Firestore tasks to local format
              const formattedTasks = firestoreTasks.map((task: any) => ({
                id: task.uid || task.id || '',
                projectId: '', // Will be set based on projectNumber
                projectNumber: task.projectNumber || '',
                title: task.title || '',
                description: task.description || '',
                assignedTo: task.assignedTo || '',
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                priority: task.priority || 'medium',
                status: task.status || 'pending',
                createdAt: task.dateCreated ? new Date(task.dateCreated).toISOString() : new Date().toISOString(),
                createdBy: task.createdBy || user?.uid || '',
                concernID: task.concernID || user?.concernID || '',
                firestoreId: task.uid || task.id || '',
                customer: task.customer || '',
                workLocation: task.workLocation || '',
                hours: task.hours || 0,
                category: task.category || 'general'
              }));
              
              // Update local state and localStorage
              setTasks(formattedTasks);
              localStorage.setItem('tasks', JSON.stringify(formattedTasks));
              console.log('📋 [TASK MANAGEMENT] Loaded tasks from Firestore:', formattedTasks.length);
            }
          } catch (firestoreError) {
            console.log('📋 [TASK MANAGEMENT] Firestore not available, using localStorage tasks');
          }
        }
      } catch (error) {
        console.error('📋 [TASK MANAGEMENT] Error loading tasks:', error);
      }
    };

    const loadData = async () => {
      await loadProjects();
      await loadEmployees();
      setIsLoading(false);
    };

    loadTasks();
    loadData();
  }, [user?.concernID]);

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'task') {
      setShowCreateForm(true);
    }
  }, [isQuickAction, quickActionType]);

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: {
        className: 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-800 border-2 border-yellow-300 font-semibold shadow-sm',
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      'in-progress': {
        className: 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-800 border-2 border-blue-300 font-semibold shadow-sm',
        icon: <AlertCircle className="h-3 w-3 mr-1" />
      },
      completed: {
        className: 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-300 font-semibold shadow-sm',
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      }
    };
    const labels = {
      pending: 'Ausstehend',
      'in-progress': 'In Bearbeitung',
      completed: 'Abgeschlossen'
    };
    
    const config = configs[status as keyof typeof configs] || configs.pending;
    
    return (
      <Badge className={`${config.className} flex items-center w-fit`}>
        {config.icon}
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      low: {
        className: 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-300 font-semibold shadow-sm',
        icon: <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
      },
      medium: {
        className: 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-800 border-2 border-yellow-300 font-semibold shadow-sm',
        icon: <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
      },
      high: {
        className: 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-2 border-red-300 font-semibold shadow-sm',
        icon: <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
      }
    };
    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch'
    };
    
    const config = configs[priority as keyof typeof configs] || configs.medium;
    
    return (
      <Badge className={`${config.className} flex items-center w-fit`}>
        {config.icon}
        {labels[priority as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredTasks = tasks.filter(task => {
    // Für Feldarbeiter: Nur eigene Aufgaben anzeigen
    if (hasPermission('view_own_tasks') && !hasPermission('create_task') && task.assignedTo !== `${user?.vorname || ''} ${user?.nachname || ''}`.trim()) {
      return false;
    }
    
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesProject = projectFilter === 'all' || task.projectId === projectFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'projectNumber':
        aValue = a.projectNumber.toLowerCase();
        bValue = b.projectNumber.toLowerCase();
        break;
      case 'assignedTo':
        aValue = a.assignedTo.toLowerCase();
        bValue = b.assignedTo.toLowerCase();
        break;
      case 'dueDate':
        aValue = new Date(a.dueDate).getTime();
        bValue = new Date(b.dueDate).getTime();
        break;
      case 'priority':
        const priorityOrder = { low: 1, medium: 2, high: 3 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'status':
        const statusOrder = { pending: 1, 'in-progress': 2, completed: 3 };
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
        break;
      default:
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Infinite scroll - initialized after sortedTasks
  const hasMoreTasks = displayedTasksCount < sortedTasks.length;
  const { isLoadingMore, sentinelRef } = useInfiniteScroll({
    hasMore: hasMoreTasks,
    loading: isLoading,
    onLoadMore: async () => {
      setDisplayedTasksCount(prev => Math.min(prev + itemsPerPage, sortedTasks.length));
    },
    enabled: isMobile || isTablet,
  });
  
  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedTasksCount(itemsPerPage);
  }, [searchTerm, statusFilter, priorityFilter, projectFilter, sortBy, sortOrder]);
  
  // Get displayed tasks
  const displayedTasks = sortedTasks.slice(0, displayedTasksCount);

  const handleSortColumn = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-5 w-5 text-gray-400" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-5 w-5 text-blue-600" /> : <ArrowDown className="h-5 w-5 text-blue-600" />;
  };

  // Handle task deletion
  // Funktion zum Senden von Task-Benachrichtigungen über das Messaging-System
  const sendTaskNotification = async (taskId: string, taskData: any) => {
    try {
      console.log('📢 [TASK MANAGEMENT] Sending task notification...', { taskId, assignedTo: taskData.assignedTo });
      
      // Messaging-Service importieren
      const { MessagingService } = await import('@/services/messagingService');
      
      if (!user?.concernID) {
        console.error('❌ [TASK MANAGEMENT] No concernID for notification');
        return;
      }
      
      // Messaging-Service initialisieren
      const messagingService = new MessagingService(user, user.concernID);
      
      // Direkten Chat mit dem zugewiesenen Mitarbeiter erstellen oder finden
      const chatId = await messagingService.createDirectChat(taskData.assignedTo);
      console.log('✅ [TASK MANAGEMENT] Chat created/found for notification:', chatId);
      
      // Nachricht mit Task-Details und Navigationslink erstellen
      const notificationText = `🔔 **Neue Aufgabe zugewiesen**
      
**Aufgabe:** ${taskData.title}
**Projekt:** ${taskData.projectNumber}
**Priorität:** ${getPriorityText(taskData.priority)}
**Fälligkeitsdatum:** ${new Date(taskData.dueDate).toLocaleDateString('de-DE')}
**Erstellt von:** ${taskData.createdByName}

${taskData.description ? `**Beschreibung:** ${taskData.description}` : ''}

📋 **Direkt zur Aufgabe:** 
Klicken Sie hier, um die Aufgabe zu öffnen: /tasks/${taskId}

🔗 **Link:** ${window.location.origin}/tasks/${taskId}`;
      
      // Nachricht als Controlling-Message senden (erfordert Aktion)
      const messageId = await messagingService.sendControllingMessage(
        chatId, 
        notificationText, 
        true, // requiresAction
        taskData.priority === 'high' ? 'high' : 'medium', // priority
        new Date(taskData.dueDate) // deadline
      );
      console.log('✅ [TASK MANAGEMENT] Task notification sent successfully as controlling message:', messageId);
      
      // Erfolgs-Toast anzeigen
      toast({
        title: 'Benachrichtigung gesendet',
        description: `Der zugewiesene Mitarbeiter wurde über die neue Aufgabe informiert.`,
      });
      
    } catch (error) {
      console.error('❌ [TASK MANAGEMENT] Failed to send task notification:', error);
      // Fehler nicht an den Benutzer weitergeben, da die Aufgabe bereits erstellt wurde
    }
  };

  // Hilfsfunktion für Prioritäts-Text
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴 Hoch';
      case 'medium': return '🟡 Mittel';
      case 'low': return '🟢 Niedrig';
      default: return priority;
    }
  };

  const deleteSingleTask = async (task: Task) => {
    try {
      // Delete from Firestore if available
      if (task.firestoreId) {
        try {
          const { taskService } = await import('@/services/firestoreService');
          await taskService.delete(task.firestoreId);
          console.log('✅ [TASK MANAGEMENT] Task deleted from Firestore:', task.firestoreId);
        } catch (firestoreError) {
          console.error('❌ [TASK MANAGEMENT] Firestore delete failed:', firestoreError);
        }
      }
      
      // Remove from local state
      const updatedTasks = tasks.filter(t => t.id !== task.id);
      setTasks(updatedTasks);
      
      // Update localStorage
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    // Speichere die Aufgabe für Rückgängig
    const deletedTask = taskToDelete;
    const taskIndex = tasks.findIndex(t => t.id === deletedTask.id);
    
    try {
      // Delete from Firestore if available
      if (taskToDelete.firestoreId) {
        try {
          const { taskService } = await import('@/services/firestoreService');
          await taskService.delete(taskToDelete.firestoreId);
          console.log('✅ [TASK MANAGEMENT] Task deleted from Firestore:', taskToDelete.firestoreId);
        } catch (firestoreError) {
          console.error('❌ [TASK MANAGEMENT] Firestore delete failed:', firestoreError);
          toast({
            title: 'Warnung',
            description: 'Aufgabe konnte nicht aus der Cloud gelöscht werden.',
            variant: 'destructive',
          });
        }
      }
      
      // Remove from local state
      const updatedTasks = tasks.filter(task => task.id !== taskToDelete.id);
      setTasks(updatedTasks);
      
      // Update localStorage
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      
      // Show success message with undo option
      showSuccessToast(
        {
          title: 'Aufgabe gelöscht',
          description: `Aufgabe "${taskToDelete.title}" wurde erfolgreich gelöscht.`,
          onUndo: async () => {
            // Restore task
            const restoredTasks = [...updatedTasks];
            restoredTasks.splice(taskIndex, 0, deletedTask);
            setTasks(restoredTasks);
            localStorage.setItem('tasks', JSON.stringify(restoredTasks));
            
            // Try to restore in Firestore
            if (deletedTask.firestoreId) {
              try {
                const { taskService } = await import('@/services/firestoreService');
                // Recreate task in Firestore
                const taskData = {
                  concernID: user?.concernID || '',
                  title: deletedTask.title,
                  description: deletedTask.description || '',
                  // ... other fields
                };
                await taskService.create(taskData as any);
              } catch (error) {
                console.error('Failed to restore in Firestore:', error);
              }
            }
            
            toastSuccess({
              title: 'Wiederhergestellt',
              description: 'Die Aufgabe wurde wiederhergestellt.',
            });
          },
          undoLabel: 'Rückgängig',
        },
        toastSuccess
      );
      
      // Close modal and reset
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
      
      console.log('✅ [TASK MANAGEMENT] Task deleted locally:', taskToDelete.id);
    } catch (error) {
      console.error('❌ [TASK MANAGEMENT] Error deleting task:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Löschen der Aufgabe.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.projectId || !formData.title || !formData.assignedTo || !formData.dueDate) {
      toast({
        title: 'Fehler',
        description: 'Bitte füllen Sie alle erforderlichen Felder aus.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check user authentication and concernID
      if (!user?.concernID) {
        console.error('❌ [TASK MANAGEMENT] No user or concernID found:', { user, concernID: user?.concernID });
        toast({
          title: 'Fehler',
          description: 'Benutzer nicht authentifiziert oder keine Unternehmens-ID gefunden.',
          variant: 'destructive',
        });
        return;
      }

      // Get project information
      const selectedProject = projects.find(p => p.id === formData.projectId);
      if (!selectedProject) {
        toast({
          title: 'Fehler',
          description: 'Ausgewähltes Projekt konnte nicht gefunden werden.',
          variant: 'destructive',
        });
        return;
      }

      // Create task data for Firestore - ensure it matches the Task interface
      const taskData = {
        concernID: user?.concernID || '',
        dateCreated: editingTask ? new Date(editingTask.createdAt) : new Date(),
        lastModified: new Date(),
        taskNumber: editingTask ? editingTask.firestoreId || `TASK-${Date.now()}` : `TASK-${Date.now()}`,
        title: formData.title,
        description: formData.description || '',
        projectNumber: String(selectedProject.projectNumber || ''),
        assignedTo: formData.assignedTo,
        customer: selectedProject.customerName || '',
        workLocation: selectedProject.workLocation || '',
        dueDate: new Date(formData.dueDate),
        priority: formData.priority,
        status: editingTask ? editingTask.status : 'pending',
        hours: editingTask ? editingTask.hours || 0 : 0,
        category: editingTask ? editingTask.category || 'general' : 'general',
        // Neue Felder für erweiterte Aufgabenverwaltung
        createdBy: user?.uid || '',
        createdByName: user?.displayName || `${user?.vorname || ''} ${user?.nachname || ''}`.trim() || user?.email || 'Unbekannt',
        assignedToName: employees.find(emp => emp.id === formData.assignedTo)?.name || 'Unbekannt',
        taskType: 'standard',
        estimatedHours: 0,
        actualHours: 0,
        completionNotes: '',
        attachments: [],
        tags: [],
        // Controlling-Felder
        requiresApproval: false,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null
      };

      // Clean the data for Firestore (remove undefined values, convert empty strings)
      const cleanTaskData = Object.fromEntries(
        Object.entries(taskData).map(([key, value]) => [
          key, 
          value === undefined ? null : 
          value === '' ? null : 
          value instanceof Date ? value : 
          value
        ])
      );

      // Save to Firestore first
      let firestoreTaskId = '';
      try {
        console.log('🔍 [TASK MANAGEMENT] Attempting to save task to Firestore...');
        console.log('🔍 [TASK MANAGEMENT] Original task data:', taskData);
        console.log('🔍 [TASK MANAGEMENT] Cleaned task data:', cleanTaskData);
        console.log('🔍 [TASK MANAGEMENT] User concernID:', user?.concernID);
        
        const { taskService } = await import('@/services/firestoreService');
        console.log('🔍 [TASK MANAGEMENT] taskService imported successfully');
        
        if (editingTask && editingTask.firestoreId) {
          // Update existing task
          console.log('🔍 [TASK MANAGEMENT] Updating existing task with ID:', editingTask.firestoreId);
          await taskService.update(editingTask.firestoreId, cleanTaskData);
          firestoreTaskId = editingTask.firestoreId;
          console.log('✅ [TASK MANAGEMENT] Task updated in Firestore:', firestoreTaskId);
        } else {
          // Create new task
          console.log('🔍 [TASK MANAGEMENT] Creating new task...');
          firestoreTaskId = await taskService.create(cleanTaskData);
          console.log('✅ [TASK MANAGEMENT] Task saved to Firestore with ID:', firestoreTaskId);
          
          // Nach der erfolgreichen Task-Erstellung: Benachrichtigung senden
          if (firestoreTaskId && !editingTask) {
            await sendTaskNotification(firestoreTaskId, cleanTaskData);
          }
        }
      } catch (firestoreError) {
        console.error('❌ [TASK MANAGEMENT] Firestore save failed:', firestoreError);
        console.error('❌ [TASK MANAGEMENT] Error details:', {
          message: firestoreError.message,
          code: firestoreError.code,
          stack: firestoreError.stack
        });
        toast({
          title: 'Warnung',
          description: 'Aufgabe konnte nicht in der Cloud gespeichert werden, wird nur lokal gespeichert.',
          variant: 'destructive',
        });
      }

      // Create or update local task object
      const taskObject = {
        id: firestoreTaskId || Date.now().toString(),
        projectId: formData.projectId,
        projectNumber: selectedProject.projectNumber || '',
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: editingTask ? editingTask.status : 'pending',
        createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
        createdBy: user?.uid || '',
        concernID: user?.concernID || '',
        firestoreId: firestoreTaskId, // Store Firestore ID for future updates
        customer: selectedProject.customerName || '',
        workLocation: selectedProject.workLocation || '',
        hours: editingTask ? editingTask.hours || 0 : 0,
        category: editingTask ? editingTask.category || 'general' : 'general',
        // Neue Felder für erweiterte Aufgabenverwaltung
        createdByName: user?.displayName || `${user?.vorname || ''} ${user?.nachname || ''}`.trim() || user?.email || 'Unbekannt',
        assignedToName: employees.find(emp => emp.id === formData.assignedTo)?.name || 'Unbekannt',
        taskType: 'standard',
        estimatedHours: 0,
        actualHours: 0,
        completionNotes: '',
        attachments: [],
        tags: [],
        requiresApproval: false,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null
      };

      // Update tasks array
      let updatedTasks;
      if (editingTask) {
        // Update existing task
        updatedTasks = tasks.map(task => 
          task.id === editingTask.id ? taskObject : task
        );
      } else {
        // Add new task
        updatedTasks = [...tasks, taskObject];
      }
      setTasks(updatedTasks);

      // Save to localStorage as backup
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));

      // Show success message
      toast({
        title: editingTask ? 'Aufgabe aktualisiert' : 'Aufgabe erstellt',
        description: `Aufgabe "${formData.title}" wurde erfolgreich ${editingTask ? 'aktualisiert' : 'erstellt'}${firestoreTaskId ? ' und in der Cloud gespeichert' : ' (nur lokal)'}.`,
      });

      // Reset form and close dialog
      resetForm();
      setShowCreateForm(false);
      setEditingTask(null); // Clear editing state

      console.log('✅ [TASK MANAGEMENT] Task saved:', taskObject);
    } catch (error) {
      console.error('❌ [TASK MANAGEMENT] Error creating task:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Erstellen der Aufgabe.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      title: '',
      description: '',
      assignedTo: '',
      dueDate: '',
      priority: 'medium'
    });
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Aufgabenverwaltung"
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          {hasPermission('view_own_tasks') && !hasPermission('create_task') && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <Eye className="h-5 w-5 inline mr-1" />
                Sie haben nur Lesezugriff auf Aufgaben.
              </p>
            </div>
          )}
          <div className="flex-1"></div>
          {hasPermission('create_task') && (
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#035c80] hover:to-[#0470a0] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden group"
              aria-label="Neue Aufgabe erstellen"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <Plus className="h-5 w-5 mr-2 relative z-10 animate-pulse group-hover:animate-none" />
              <span className="relative z-10">✨ Neue Aufgabe</span>
            </Button>
          )}
        </div>

        {/* Filters Card */}
        <Card className="tradetrackr-card mb-6 border-2 border-gray-200 shadow-lg bg-gradient-to-br from-gray-50 to-white">
            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#058bc0] to-[#0470a0] rounded-lg text-white shadow-md">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    Filter & Suche
                    <div className="text-sm font-normal text-gray-600 mt-1">
                      {filteredTasks.length} von {tasks.length} Aufgaben
                    </div>
                  </div>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isMobile ? (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>Mobile Ansicht</span>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={`transition-all duration-300 ${
                          viewMode === 'table' 
                            ? 'bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white shadow-md hover:shadow-lg' 
                            : 'border-2 hover:border-[#058bc0]'
                        }`}
                      >
                        <TableIcon className="h-4 w-4 mr-1" />
                        Tabelle
                      </Button>
                      <Button
                        variant={viewMode === 'cards' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('cards')}
                        className={`transition-all duration-300 ${
                          viewMode === 'cards' 
                            ? 'bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white shadow-md hover:shadow-lg' 
                            : 'border-2 hover:border-[#058bc0]'
                        }`}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Karten
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-[#058bc0]" />
                    Projekt
                  </Label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white h-11">
                      <SelectValue placeholder="Projekt auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Projekte</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.projectNumber} - {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Search className="h-4 w-4 text-[#058bc0]" />
                    Suche
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Aufgaben durchsuchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[#058bc0]" />
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white h-11">
                      <SelectValue placeholder="Status auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Ausstehend
                        </div>
                      </SelectItem>
                      <SelectItem value="in-progress">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          In Bearbeitung
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Abgeschlossen
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#058bc0]" />
                    Priorität
                  </Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white h-11">
                      <SelectValue placeholder="Priorität auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Prioritäten</SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Niedrig
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Mittel
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Hoch
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Tasks Table/Cards */}
        {isLoading ? (
          <Card className="tradetrackr-card border-2 border-gray-200 shadow-xl overflow-hidden">
            <CardContent className="p-6">
              <TableSkeleton rows={5} columns={6} />
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <>
            {/* Bulk Select */}
            {filteredTasks.length > 0 && (
              <BulkSelect
                items={filteredTasks}
                selectedItems={selectedTasks}
                onSelectionChange={setSelectedTasks}
                getItemId={(task) => task.id}
                getItemLabel={(task) => task.title}
                className="mb-4"
              />
            )}
            
            {/* Bulk Actions */}
            {selectedTasks.size > 0 && (
              <BulkActions
                selectedCount={selectedTasks.size}
                onBulkDelete={async () => {
                  if (window.confirm(`Möchten Sie wirklich ${selectedTasks.size} Aufgabe(n) löschen?`)) {
                    const tasksToDelete = filteredTasks.filter(task => selectedTasks.has(task.id));
                    for (const task of tasksToDelete) {
                      await deleteSingleTask(task);
                    }
                    showSuccessToast(`${tasksToDelete.length} Aufgabe(n) gelöscht`);
                    setSelectedTasks(new Set());
                  }
                }}
                onBulkEdit={() => {
                  setShowBulkEdit(true);
                }}
                onBulkStatusChange={async (status) => {
                  const tasksToUpdate = filteredTasks.filter(task => selectedTasks.has(task.id));
                  for (const task of tasksToUpdate) {
                    try {
                      const { taskService } = await import('@/services/firestoreService');
                      if (task.firestoreId) {
                        await taskService.update(task.firestoreId, { status });
                      }
                      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t));
                    } catch (error) {
                      console.error('Error updating task:', error);
                    }
                  }
                  showSuccessToast(`${tasksToUpdate.length} Aufgabe(n) Status aktualisiert`);
                  setSelectedTasks(new Set());
                }}
                className="mb-4"
              />
            )}
            
            <Card className="tradetrackr-card border-2 border-gray-200 shadow-xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:bg-gradient-to-r hover:from-[#0470a0] hover:via-[#035c80] hover:to-[#0470a0]">
                      <TableHead className="text-white font-bold w-12">
                        <Checkbox
                          checked={sortedTasks.length > 0 && sortedTasks.every(task => selectedTasks.has(task.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTasks(new Set(sortedTasks.map(task => task.id)));
                            } else {
                              setSelectedTasks(new Set());
                            }
                          }}
                          aria-label="Alle Aufgaben auswählen"
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('title')}
                      >
                        <div className="flex items-center gap-2">
                          Titel
                          {getSortIcon('title')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('projectNumber')}
                      >
                        <div className="flex items-center gap-2">
                          Projekt
                          {getSortIcon('projectNumber')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('assignedTo')}
                      >
                        <div className="flex items-center gap-2">
                          Zugewiesen an
                          {getSortIcon('assignedTo')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('dueDate')}
                      >
                        <div className="flex items-center gap-2">
                          Fälligkeitsdatum
                          {getSortIcon('dueDate')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('priority')}
                      >
                        <div className="flex items-center gap-2">
                          Priorität
                          {getSortIcon('priority')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('createdByName')}
                      >
                        <div className="flex items-center gap-2">
                          Erstellt von
                          {getSortIcon('createdByName')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-white/20 text-white font-bold"
                        onClick={() => handleSortColumn('createdAt')}
                      >
                        <div className="flex items-center gap-2">
                          Erstellt am
                          {getSortIcon('createdAt')}
                        </div>
                      </TableHead>
                      <TableHead className="text-white font-bold">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-blue-50/50 transition-colors duration-200">
                        <TableCell>
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTasks);
                              if (checked) {
                                newSelected.add(task.id);
                              } else {
                                newSelected.delete(task.id);
                              }
                              setSelectedTasks(newSelected);
                            }}
                            aria-label={`Aufgabe "${task.title}" auswählen`}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">{task.title}</TableCell>
                        <TableCell className="text-gray-700">{task.projectNumber}</TableCell>
                        <TableCell className="text-gray-700">{task.assignedToName || task.assignedTo}</TableCell>
                        <TableCell className="text-gray-700">{new Date(task.dueDate).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="text-gray-700">{task.createdByName || 'Unbekannt'}</TableCell>
                        <TableCell className="text-gray-700">{new Date(task.createdAt).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingTask(task)}
                              className="border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-500 transition-all"
                              title="Details anzeigen"
                              aria-label={`Aufgabe "${task.title}" anzeigen`}
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                            {hasPermission('create_task') && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setFormData({
                                      projectId: task.projectId || '',
                                      title: task.title,
                                      description: task.description,
                                      assignedTo: task.assignedTo,
                                      dueDate: task.dueDate,
                                      priority: task.priority as 'low' | 'medium' | 'high'
                                    });
                                    setShowCreateForm(true);
                                  }}
                                  className="border-2 border-green-300 hover:bg-green-50 hover:border-green-500 transition-all"
                                  title="Bearbeiten"
                                  aria-label={`Aufgabe "${task.title}" bearbeiten`}
                                >
                                  <Edit className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTaskToDelete(task);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="border-2 border-red-300 hover:bg-red-50 hover:border-red-500 transition-all"
                                  title="Löschen"
                                  aria-label={`Aufgabe "${task.title}" löschen`}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <div 
            {...(isMobile ? containerProps : {})}
            className={cn(
              "grid gap-6",
              isTwoColumn ? "grid-cols-2" : isTablet ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {isMobile && (
              <PullToRefreshIndicator
                pullDistance={pullDistance}
                threshold={80}
                isRefreshing={isRefreshing}
                canRefresh={canRefresh}
              />
            )}
              {displayedTasks.map((task) => (
                <Card key={task.id} className="tradetrackr-card border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <CardTitle className="text-lg font-bold text-gray-900">{task.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FolderOpen className="h-4 w-4 text-[#058bc0]" />
                          <span className="font-semibold">{task.projectNumber}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingTask(task)}
                          className="border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-500 transition-all"
                          title="Details anzeigen"
                          aria-label={`Aufgabe "${task.title}" anzeigen`}
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                        {hasPermission('create_task') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTask(task);
                                setFormData({
                                  projectId: task.projectId || '',
                                  title: task.title,
                                  description: task.description,
                                  assignedTo: task.assignedTo,
                                  dueDate: task.dueDate,
                                  priority: task.priority as 'low' | 'medium' | 'high'
                                });
                                setShowCreateForm(true);
                              }}
                              className="border-2 border-green-300 hover:bg-green-50 hover:border-green-500 transition-all"
                              title="Bearbeiten"
                              aria-label={`Aufgabe "${task.title}" bearbeiten`}
                            >
                              <Edit className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTaskToDelete(task);
                                setShowDeleteConfirm(true);
                              }}
                              className="border-2 border-red-300 hover:bg-red-50 hover:border-red-500 transition-all"
                              title="Löschen"
                              aria-label={`Aufgabe "${task.title}" löschen`}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="flex items-center justify-between text-sm p-2 bg-blue-50 rounded-lg">
                      <span className="text-gray-600 font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-[#058bc0]" />
                        Zugewiesen an:
                      </span>
                      <span className="font-bold text-gray-900">{task.assignedToName || task.assignedTo}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 bg-yellow-50 rounded-lg">
                      <span className="text-gray-600 font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        Fälligkeitsdatum:
                      </span>
                      <span className="font-bold text-gray-900">{new Date(task.dueDate).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">Priorität:</span>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">Status:</span>
                      {getStatusBadge(task.status)}
                    </div>
                    {task.description && (
                      <div className="pt-2 border-t-2 border-gray-200">
                        <p className="text-sm text-gray-700 line-clamp-2">{task.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {/* Infinite Scroll Sentinel */}
              {(isMobile || isTablet) && (
                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm">Lade weitere Aufgaben...</span>
                    </div>
                  )}
                  {!hasMoreTasks && displayedTasks.length > 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Alle Aufgaben geladen ({displayedTasks.length} von {sortedTasks.length})
                    </p>
                  )}
                </div>
              )}
            </div>
        )}

        {/* Create/Edit Task Modal */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent 
          className="sm:max-w-3xl tradetrackr-dialog border-4 border-[#058bc0] shadow-2xl bg-gradient-to-br from-blue-50 via-white to-cyan-50"
          onEscape={() => {
            resetForm();
            setShowCreateForm(false);
            setEditingTask(null);
            resetValidation();
          }}
          trapFocus={true}
        >
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden rounded-t-lg">
            {/* Animated background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
            
            <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
              <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30 animate-bounce">
                {editingTask ? '✏️' : '✨'}
              </div>
              <div className="flex-1">
                {editingTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
                <div className="text-sm font-normal text-white/90 mt-1 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {editingTask ? 'Ändern Sie die Aufgabendetails' : 'Erstellen Sie eine neue Aufgabe für Ihr Team'}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-2 relative z-10">
              {editingTask ? 'Bearbeiten Sie die Details der Aufgabe' : 'Füllen Sie alle Felder aus, um eine neue Aufgabe zu erstellen'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-6 pt-2">
            {/* Error Summary */}
            {formAllErrors.length > 0 && (
              <FormErrorSummary
                errors={formAllErrors}
                title="Bitte korrigieren Sie die folgenden Fehler:"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect
                label="Projekt"
                tooltip="Wählen Sie das Projekt aus, zu dem diese Aufgabe gehört. Die Aufgabe wird diesem Projekt zugeordnet und kann später im Projekt-Dashboard angezeigt werden."
                options={projects.map((project) => ({
                  value: project.id,
                  label: `${project.projectNumber} - ${project.name}`,
                }))}
                value={formData.projectId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, projectId: value }));
                  getFieldProps('projectId').onChange(value);
                }}
                {...getFieldProps('projectId')}
                placeholder="Projekt auswählen"
                helperText="Wählen Sie das zugehörige Projekt aus"
              />
              
              <FormInput
                label="Aufgabentitel"
                tooltip="Geben Sie einen aussagekräftigen Titel für die Aufgabe ein. Der Titel sollte zwischen 3 und 100 Zeichen lang sein und klar beschreiben, was zu tun ist. Beispiel: 'Heizungsinstallation in Wohnung 5B'"
                placeholder="z.B. Heizungsinstallation in Wohnung 5B"
                maxLength={100}
                showCharCount={true}
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  getFieldProps('title').onChange(e.target.value);
                }}
                onBlur={getFieldProps('title').onBlur}
                {...getFieldProps('title')}
                helperText="Ein aussagekräftiger Titel hilft bei der Identifikation der Aufgabe"
              />

              <FormSelect
                label="Zugewiesen an"
                tooltip="Wählen Sie den Mitarbeiter aus, der diese Aufgabe bearbeiten soll. Der ausgewählte Mitarbeiter erhält eine Benachrichtigung über die neue Aufgabe."
                options={
                  isLoadingEmployees
                    ? [{ value: 'loading', label: 'Lade Mitarbeiter...' }]
                    : employees.length > 0
                    ? employees.map((employee) => ({
                        value: employee.name,
                        label: employee.name,
                      }))
                    : [{ value: 'no-employees', label: 'Keine Mitarbeiter verfügbar' }]
                }
                value={formData.assignedTo}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, assignedTo: value }));
                  getFieldProps('assignedTo').onChange(value);
                }}
                {...getFieldProps('assignedTo')}
                placeholder={isLoadingEmployees ? "Lade Mitarbeiter..." : "Mitarbeiter auswählen"}
                helperText="Der zugewiesene Mitarbeiter erhält eine Benachrichtigung"
              />

              <FormInput
                label="Fälligkeitsdatum"
                type="date"
                tooltip="Wählen Sie das Datum aus, bis zu dem die Aufgabe erledigt sein sollte. Das Fälligkeitsdatum hilft bei der Priorisierung und Planung der Aufgaben."
                value={formData.dueDate}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, dueDate: e.target.value }));
                  getFieldProps('dueDate').onChange(e.target.value);
                }}
                onBlur={getFieldProps('dueDate').onBlur}
                {...getFieldProps('dueDate')}
                helperText="Bis wann sollte die Aufgabe erledigt sein?"
              />
              <FormSelect
                label="Priorität"
                tooltip="Wählen Sie die Priorität der Aufgabe. Niedrig bedeutet normale Priorität, Mittel bedeutet erhöhte Aufmerksamkeit, Hoch bedeutet dringend und sollte zuerst bearbeitet werden."
                options={[
                  { value: 'low', label: '🟢 Niedrig' },
                  { value: 'medium', label: '🟡 Mittel' },
                  { value: 'high', label: '🔴 Hoch' },
                ]}
                value={formData.priority}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }));
                  getFieldProps('priority').onChange(value);
                }}
                {...getFieldProps('priority')}
                placeholder="Priorität auswählen"
                helperText="Die Priorität bestimmt die Wichtigkeit der Aufgabe"
              />
            </div>
            
            <FormTextarea
              label="Beschreibung"
              tooltip="Geben Sie eine detaillierte Beschreibung der Aufgabe ein. Beschreiben Sie, was genau zu tun ist, welche Materialien benötigt werden und welche besonderen Anforderungen es gibt. Die Beschreibung darf maximal 500 Zeichen lang sein."
              placeholder="Beschreiben Sie die Aufgabe im Detail..."
              rows={5}
              maxLength={500}
              showCharCount={true}
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                getFieldProps('description').onChange(e.target.value);
              }}
              onBlur={getFieldProps('description').onBlur}
              {...getFieldProps('description')}
              helperText="Eine detaillierte Beschreibung hilft bei der Umsetzung der Aufgabe"
            />
            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                  setEditingTask(null);
                  resetValidation();
                }}
                className="border-2 border-gray-300 hover:bg-gray-50 font-semibold px-6"
              >
                ❌ Abbrechen
              </Button>
              <Button 
                type="submit"
                disabled={!isFormValid}
                className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#035c80] hover:to-[#0470a0] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10 flex items-center gap-2">
                  {editingTask ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Aufgabe aktualisieren
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      ✨ Aufgabe erstellen
                    </>
                  )}
                </span>
              </Button>
            </div>
          </form>
        </DialogContent>
        </Dialog>

        {/* View Task Modal */}
        <Dialog open={!!viewingTask} onOpenChange={() => setViewingTask(null)}>
        <DialogContent className="sm:max-w-2xl tradetrackr-dialog">
          <DialogHeader>
            <DialogTitle>Aufgabendetails</DialogTitle>
          </DialogHeader>
          {viewingTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Aufgabentitel</Label>
                  <p className="text-gray-900">{viewingTask.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Projekt</Label>
                  <p className="text-gray-900">{viewingTask.projectNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Zugewiesen an</Label>
                  <p className="text-gray-900">{viewingTask.assignedToName || viewingTask.assignedTo}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Fälligkeitsdatum</Label>
                  <p className="text-gray-900">{new Date(viewingTask.dueDate).toLocaleDateString('de-DE')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Priorität</Label>
                  <div className="mt-1">{getPriorityBadge(viewingTask.priority)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">{getStatusBadge(viewingTask.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Erstellt von</Label>
                  <p className="text-gray-900">{viewingTask.createdByName || 'Unbekannt'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Erstellt am</Label>
                  <p className="text-gray-900">{new Date(viewingTask.createdAt).toLocaleDateString('de-DE')}</p>
                </div>
              </div>
              {viewingTask.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Beschreibung</Label>
                  <p className="text-gray-900 mt-1">{viewingTask.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="tradetrackr-dialog">
          <DialogHeader>
            <DialogTitle>Aufgabe löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Aufgabe löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="tradetrackr-button-outline">
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} className="tradetrackr-button-destructive">
              Löschen
            </Button>
          </div>
        </DialogContent>
        </Dialog>
      </div>

      {/* Quick Action Sidebar */}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(TaskManagement);
