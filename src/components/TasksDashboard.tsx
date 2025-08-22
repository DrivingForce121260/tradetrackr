import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Plus, Eye, Edit, Trash2, Clock, User, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TasksDashboardProps } from '@/types';

const TasksDashboard: React.FC<TasksDashboardProps> = ({ onBack }) => {
  const { user, hasPermission } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check permissions
  const canViewTasks = hasPermission('view_tasks') || hasPermission('view_reports');
  const canManageTasks = hasPermission('create_task') || hasPermission('edit_task') || hasPermission('delete_task') || user?.role === 'auftraggeber';

  useEffect(() => {
    if (canViewTasks) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [canViewTasks]);

  const loadTasks = () => {
    // Load tasks from localStorage or generate demo data
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      // Generate demo tasks if none exist
      generateDemoTasks();
    }
    setLoading(false);
  };

  const generateDemoTasks = () => {
    const demoTasks = [
      // PRJ-2024-001: Bürogebö¤ude München
      {
        id: '1',
        taskNumber: 'TASK-2024-001-01',
        employee: 'Max Mustermann',
        customer: 'München Immobilien GmbH',
        projectNumber: 'PRJ-2024-001',
        workLocation: 'München, MaximilianstraöŸe 1',
        dueDate: '2024-02-15',
        priority: 'high',
        status: 'in-progress',
        title: 'Elektroinstallation im 2. Stock',
        description: 'Hauptverteiler erneuern und neue Steckdosen installieren'
      },
      {
        id: '2',
        taskNumber: 'TASK-2024-001-02',
        employee: 'Anna Schmidt',
        customer: 'München Immobilien GmbH',
        projectNumber: 'PRJ-2024-001',
        workLocation: 'München, MaximilianstraöŸe 1',
        dueDate: '2024-02-20',
        priority: 'medium',
        status: 'pending',
        title: 'Beleuchtungsanlage im Konferenzraum',
        description: 'LED-Beleuchtung installieren und dimmen'
      },
      {
        id: '3',
        taskNumber: 'TASK-2024-001-03',
        employee: 'Tom Weber',
        customer: 'München Immobilien GmbH',
        projectNumber: 'PRJ-2024-001',
        workLocation: 'München, MaximilianstraöŸe 1',
        dueDate: '2024-02-25',
        priority: 'low',
        status: 'pending',
        title: 'Smart Home System in Chefetage',
        description: 'KNX-System einrichten und konfigurieren'
      },
      // PRJ-2024-002: Wohnkomplex Hamburg
      {
        id: '4',
        taskNumber: 'TASK-2024-002-01',
        employee: 'Max Mustermann',
        customer: 'Hamburg Wohnbau AG',
        projectNumber: 'PRJ-2024-002',
        workLocation: 'Hamburg, Altonaer StraöŸe 15',
        dueDate: '2024-02-18',
        priority: 'high',
        status: 'completed',
        title: 'Sanitö¤rarbeiten in Wohnung 3A',
        description: 'Badezimmer komplett erneuern'
      },
      {
        id: '5',
        taskNumber: 'TASK-2024-002-02',
        employee: 'Anna Schmidt',
        customer: 'Hamburg Wohnbau AG',
        projectNumber: 'PRJ-2024-002',
        workLocation: 'Hamburg, Altonaer StraöŸe 15',
        dueDate: '2024-02-22',
        priority: 'medium',
        status: 'in-progress',
        title: 'Heizungsinstallation in Wohnung 5B',
        description: 'Heizkö¶rper tauschen und Thermostate installieren'
      }
    ];

    setTasks(demoTasks);
    localStorage.setItem('tasks', JSON.stringify(demoTasks));
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'default'
    } as const;
    return <Badge variant={variants[priority as keyof typeof variants] || 'default'}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      'in-progress': 'default',
      completed: 'default'
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };



  if (loading) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          <p className="mt-4 text-white text-lg">Lade Aufgaben...</p>
        </div>
      </div>
    );
  }

  if (!canViewTasks) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Zugriff verweigert: </strong>
            <span className="block sm:inline">Sie haben keine Berechtigung, Aufgaben anzuzeigen.</span>
          </div>
          <button
            onClick={onBack}
            className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Aufgaben Dashboard</h1>
              <p className="text-blue-100">Übersicht über alle Aufgaben</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {/* Navigate to tasks management */}}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Alle Aufgaben
            </Button>
            <Button
              onClick={() => {/* Navigate to new task */}}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neue Aufgabe
            </Button>
          </div>
        </div>



        {/* Tasks Table */}
        <Card className="bg-white/10 border-white/20 text-white">
          <CardHeader>
            <CardTitle>Alle Aufgaben</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white">Aufgabe</TableHead>
                    <TableHead className="text-white">Mitarbeiter</TableHead>
                    <TableHead className="text-white">Kunde</TableHead>
                    <TableHead className="text-white">Projekt</TableHead>
                    <TableHead className="text-white">Standort</TableHead>
                    <TableHead className="text-white">Fö¤llig</TableHead>
                    <TableHead className="text-white">Prioritö¤t</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="border-white/20">
                      <TableCell className="font-medium text-white">
                        <div>
                          <div className="font-semibold">{task.title}</div>
                          <div className="text-sm text-blue-200">{task.taskNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{task.employee}</TableCell>
                      <TableCell className="text-white">{task.customer}</TableCell>
                      <TableCell className="text-white">{task.projectNumber}</TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{task.workLocation}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{task.dueDate}</TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* View task */}}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {canManageTasks && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Edit task */}}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Delete task */}}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
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
            ) : (
              <div className="text-center py-8">
                <p className="text-blue-200 mb-4">Keine Aufgaben gefunden</p>
                <Button
                  onClick={() => {/* Navigate to new task */}}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Erste Aufgabe erstellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TasksDashboard;
