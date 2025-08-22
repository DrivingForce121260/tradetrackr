import React, { useState, useEffect } from 'react';
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
import QuickActionButtons from './QuickActionButtons';
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
  const { toast } = useToast();
  const { isQuickAction, quickActionType } = useQuickAction();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Mock employees
  const employees = [
    { id: 'emp1', name: 'Max Mustermann' },
    { id: 'emp2', name: 'Anna Schmidt' },
    { id: 'emp3', name: 'Tom Weber' },
    { id: 'emp4', name: 'Lisa Müller' }
  ];

  // Load tasks and projects from localStorage
  useEffect(() => {
    const loadTasks = () => {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    };

    const loadProjects = () => {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    };

    loadTasks();
    loadProjects();
    setIsLoading(false);
  }, []);

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'task') {
      setShowCreateForm(true);
    }
  }, [isQuickAction, quickActionType]);

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    const labels = {
      pending: 'Ausstehend',
      'in-progress': 'In Bearbeitung',
      completed: 'Abgeschlossen'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch'
    };
    
    return (
      <Badge className={colors[priority as keyof typeof colors]}>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission

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
    <div className="min-h-screen tradetrackr-gradient-blue flex flex-col">
      <AppHeader 
        title={hasPermission('view_own_tasks') && !hasPermission('create_task') ? 'Meine Aufgaben' : 'Aufgabenverwaltung'} 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-0">
                  Aufgabenverwaltung
                </h1>
                <p className="text-gray-600 mb-0">
                  Verwalten Sie Aufgaben, weisen Sie sie zu und verfolgen Sie den Fortschritt
                </p>
                {hasPermission('view_own_tasks') && !hasPermission('create_task') && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <Eye className="h-5 w-5 inline mr-1" />
                      Sie haben nur Lesezugriff auf Aufgaben.
                    </p>
                  </div>
                )}
              </div>
              {hasPermission('create_task') && (
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Neue Aufgabe
                </Button>
              )}
            </div>
          </div>



          {/* Controls Card */}
          <Card className="tradetrackr-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Aufgaben ({filteredTasks.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 px-3"
                  >
                    <TableIcon className="h-5 w-5 mr-1" />
                    Tabelle
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="h-8 px-3"
                  >
                    <Package className="h-5 w-5 mr-1" />
                    Karten
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt auswö¤hlen" />
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Aufgaben durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="pending">Ausstehend</SelectItem>
                    <SelectItem value="in-progress">In Bearbeitung</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioritö¤t auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Prioritö¤ten</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Table/Cards */}
          {viewMode === 'table' ? (
            <Card className="tradetrackr-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSortColumn('title')}
                      >
                        <div className="flex items-center gap-2">
                          Titel
                          {getSortIcon('title')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSortColumn('projectNumber')}
                      >
                        <div className="flex items-center gap-2">
                          Projekt
                          {getSortIcon('projectNumber')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSortColumn('assignedTo')}
                      >
                        <div className="flex items-center gap-2">
                          Zugewiesen an
                          {getSortIcon('assignedTo')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSortColumn('dueDate')}
                      >
                        <div className="flex items-center gap-2">
                          Fö¤lligkeitsdatum
                          {getSortIcon('dueDate')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSortColumn('priority')}
                      >
                        <div className="flex items-center gap-2">
                          Prioritö¤t
                          {getSortIcon('priority')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSortColumn('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.projectNumber}</TableCell>
                        <TableCell>{task.assignedTo}</TableCell>
                        <TableCell>{new Date(task.dueDate).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingTask(task)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {hasPermission('create_task') && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {/* Edit task */}}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {/* Delete task */}}
                                >
                                  <Trash2 className="w-3 h-3" />
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTasks.map((task) => (
                <Card key={task.id} className="tradetrackr-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <CardTitle className="text-sm text-gray-600">{task.projectNumber}</CardTitle>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingTask(task)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {hasPermission('create_task') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {/* Edit task */}}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {/* Delete task */}}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Zugewiesen an:</span>
                      <span className="font-medium">{task.assignedTo}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Fö¤lligkeitsdatum:</span>
                      <span className="font-medium">{new Date(task.dueDate).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prioritö¤t:</span>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="tasks" />

      {/* Create/Edit Task Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-2xl tradetrackr-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
            </DialogTitle>
            <DialogDescription>
              Füllen Sie alle erforderlichen Felder aus, um eine neue Aufgabe zu erstellen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Projekt</Label>
                <Select value={formData.projectId} onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Aufgabentitel</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Aufgabentitel eingeben"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Zugewiesen an</Label>
                <Select value={formData.assignedTo} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.name}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Fö¤lligkeitsdatum</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioritö¤t</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Aufgabenbeschreibung eingeben"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="tradetrackr-button-outline"
              >
                Abbrechen
              </Button>
              <Button type="submit" className="tradetrackr-button">
                {editingTask ? 'Aktualisieren' : 'Aufgabe erstellen'}
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
                  <p className="text-gray-900">{viewingTask.assignedTo}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Fö¤lligkeitsdatum</Label>
                  <p className="text-gray-900">{new Date(viewingTask.dueDate).toLocaleDateString('de-DE')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Prioritö¤t</Label>
                  <div className="mt-1">{getPriorityBadge(viewingTask.priority)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">{getStatusBadge(viewingTask.status)}</div>
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
            <DialogTitle>Aufgabe lö¶schen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Aufgabe lö¶schen mö¶chten? Diese Aktion kann nicht rückgö¤ngig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="tradetrackr-button-outline">
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={() => {/* Handle delete */}} className="tradetrackr-button-destructive">
              Lö¶schen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
