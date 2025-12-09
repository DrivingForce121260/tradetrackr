import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { TaskService } from '@/services/taskService';
import { TaskItem, TaskPriority, TaskStatus } from '@/types/tasks';
import TaskModal from '@/components/tasks/TaskModal';
import { isOverdue } from '@/services/taskUtils';

const STATUSES: TaskStatus[] = ['todo','in_progress','done','blocked','archived'];

// Sortable Task Card Component
interface SortableTaskCardProps {
  task: TaskItem;
  onClick: () => void;
  projectNumber?: string;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ task, onClick, projectNumber }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showHoverInfo, setShowHoverInfo] = React.useState(false);
  const [hoverPosition, setHoverPosition] = React.useState<{ x: number; y: number } | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const now = new Date();
  const overdue = due ? isOverdue(now, due, task.status) : false;
  const isToday = due ? due.toDateString() === now.toDateString() : false;

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    // Calculate position - ensure it's visible on screen
    const boxWidth = 288; // w-72 = 18rem = 288px
    const x = rect.right + 8;
    const y = rect.top;
    
    // Adjust if box would go off screen
    const adjustedX = x + boxWidth > window.innerWidth 
      ? rect.left - boxWidth - 8  // Show on left side instead
      : x;
    
    const position = {
      x: adjustedX,
      y: Math.max(8, y) // Ensure at least 8px from top
    };
    
    console.log('Hover enter - setting position:', position, 'Window size:', window.innerWidth, window.innerHeight);
    setHoverPosition(position);
    setShowHoverInfo(true);
    console.log('State set - showHoverInfo:', true, 'hoverPosition:', position);
  };

  const handleMouseLeave = () => {
    // Delay hiding to allow moving to hover box
    hoverTimeoutRef.current = setTimeout(() => {
      console.log('Hover leave - hiding box');
      setShowHoverInfo(false);
      setHoverPosition(null);
    }, 200);
  };

  return (
    <div 
      ref={cardRef}
      className="relative group"
      style={{ zIndex: showHoverInfo ? 1000 : 'auto' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`p-1 rounded-lg border-2 bg-white cursor-move shadow-md hover:shadow-xl transition-all duration-300 w-full ${
          task.priority === 'critical' 
            ? 'border-red-500 hover:border-red-600 bg-red-50' 
            : 'border-gray-300 hover:border-[#058bc0]'
        } ${isDragging ? 'ring-2 ring-blue-500' : ''}`}
        onClick={onClick}
        aria-label={`Aufgabe "${task.title}" verschieben`}
      >
        {projectNumber && (
          <div className="text-[10px] text-gray-600 mb-1 font-medium">📁 {projectNumber}</div>
        )}
        <div className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 leading-tight">{task.title}</div>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shadow-sm ${
            task.priority === 'high' 
              ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800' 
              : task.priority === 'critical' 
              ? 'bg-gradient-to-r from-red-200 to-red-300 text-red-900 animate-pulse' 
              : task.priority === 'medium' 
              ? 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
          }`}>
            {task.priority === 'critical' ? '🔥' : task.priority === 'high' ? '⚠️' : task.priority === 'medium' ? '📌' : '📎'}
          </div>
        </div>
        {due && (
          <div className={`text-[10px] mt-1 px-1.5 py-0.5 rounded-md inline-block font-medium ${
            overdue 
              ? 'bg-red-100 text-red-700' 
              : isToday 
              ? 'bg-amber-100 text-amber-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {overdue ? '⏰' : isToday ? '📅' : '🗓️'} {due.toLocaleDateString('de-DE')}
          </div>
        )}
      </div>
      
      {/* Hover Info Box - rendered with portal to ensure it's above everything */}
      {showHoverInfo && hoverPosition && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed w-72 p-3 bg-white border-2 border-[#058bc0] rounded-lg shadow-2xl max-h-96 overflow-y-auto"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            zIndex: 99999,
            pointerEvents: 'auto',
            backgroundColor: 'white',
            position: 'fixed',
            display: 'block',
            visibility: 'visible',
            opacity: 1,
          }}
          data-testid="hover-info-box"
          onMouseEnter={(e) => {
            console.log('Hover box enter', e, 'Position:', hoverPosition);
            e.stopPropagation();
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setShowHoverInfo(true);
          }}
          onMouseLeave={(e) => {
            console.log('Hover box leave', e);
            e.stopPropagation();
            handleMouseLeave();
          }}
        >
          <div className="text-sm font-bold text-gray-900 mb-2">{task.title}</div>
          {projectNumber && (
            <div className="text-xs text-gray-600 mb-2">
              <span className="font-semibold">Projekt:</span> {projectNumber}
            </div>
          )}
          {task.description && (
            <div className="text-xs text-gray-700 mb-2">
              <span className="font-semibold">Beschreibung:</span> {task.description}
            </div>
          )}
          <div className="text-xs text-gray-600 mb-1">
            <span className="font-semibold">Status:</span> {task.status === 'todo' ? 'To Do' : task.status === 'in_progress' ? 'In Arbeit' : task.status === 'done' ? 'Fertig' : task.status === 'blocked' ? 'Blockiert' : 'Archiviert'}
          </div>
          <div className="text-xs text-gray-600 mb-1">
            <span className="font-semibold">Priorität:</span> {task.priority}
          </div>
          {due && (
            <div className="text-xs text-gray-600 mb-1">
              <span className="font-semibold">Fällig:</span> {due.toLocaleDateString('de-DE')} {due.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              {overdue && <span className="text-red-600 ml-1">(Überfällig)</span>}
            </div>
          )}
          {task.assigneeIds && task.assigneeIds.length > 0 && (
            <div className="text-xs text-gray-600 mb-1">
              <span className="font-semibold">Zugewiesen an:</span> {task.assigneeIds.length} {task.assigneeIds.length === 1 ? 'Person' : 'Personen'}
            </div>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <div className="text-xs text-gray-600 mb-1">
              <span className="font-semibold">Checkliste:</span> {task.checklist.filter(c => c.checked).length}/{task.checklist.length} erledigt
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export const TaskBoard: React.FC<{ onBack?: () => void; onNavigate?: (page: string) => void; onOpenMessaging?: () => void }>= ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const [service, setService] = useState<TaskService | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<'all'|TaskPriority>('all');
  const [assignee, setAssignee] = useState('');
  const [project, setProject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board'|'list'>('board');
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => { if (concernID && user?.uid) setService(new TaskService(concernID, user.uid)); }, [concernID, user?.uid]);
  
  // Load projects and employees
  useEffect(() => {
    const loadFilters = async () => {
      if (!concernID) return;
      
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');
        
        // Load projects
        const projectsRef = collection(db, 'projects');
        const projectsQuery = query(projectsRef, where('concernID', '==', concernID));
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectsList = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsList);
        
        // Load employees
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('concernID', '==', concernID));
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          uid: doc.id,
          ...doc.data()
        }));
        setEmployees(usersList);
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };
    
    loadFilters();
  }, [concernID]);
  
  const load = async () => {
    if (!service) return;
    const list = await service.list({ projectId: project || undefined, assigneeId: assignee || undefined, priority: priority==='all'? undefined : priority });
    setTasks(list);
  };
  useEffect(() => { load(); }, [service, project, assignee, priority]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter(t => !q || t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q));
  }, [tasks, search]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = { todo: [], in_progress: [], done: [], blocked: [], archived: [] };
    filtered.forEach(t => {
      const status = (t.status && (STATUSES as string[]).includes(t.status as any) ? t.status : 'todo') as TaskStatus;
      map[status].push(t);
    });
    return map;
  }, [filtered]);

  const openNew = () => { setEditing(null); setShowModal(true); };

  const saveTask = async (partial: Partial<TaskItem>) => {
    if (!service) return;
    if (editing) {
      await service.update(editing.id, partial as TaskItem);
    } else {
      // Build task data, only include dueAt if it has a value
      // Don't pass id, concernID, createdAt, updatedAt, createdBy - let service handle them
      const taskData: any = {
        projectId: project || partial.projectId || '',
        title: partial.title || '',
        description: partial.description || '',
        assigneeIds: partial.assigneeIds || [],
        status: (partial.status as TaskStatus) || 'todo',
        priority: (partial.priority as TaskPriority) || 'medium',
        checklist: partial.checklist || [],
        attachments: [],
        watchers: [],
      };
      
      // Only add dueAt if it exists
      if (partial.dueAt) {
        taskData.dueAt = partial.dueAt;
      }
      
      await service.create(taskData);
    }
    await load();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDraggingId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeStatus = getTaskStatus(active.id as string);
    const overStatus = over.id.toString().startsWith('column-') 
      ? (over.id.toString().replace('column-', '') as TaskStatus)
      : getTaskStatus(over.id as string);

    if (activeStatus !== overStatus) {
      // Update task status immediately for better UX
      const task = tasks.find(t => t.id === active.id);
      if (task && service) {
        service.update(task.id, { status: overStatus }).then(() => {
          load();
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !service) {
      setActiveId(null);
      setDraggingId(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id.toString();
    
    // Check if dropped on a column
    if (overId.startsWith('column-')) {
      const newStatus = overId.replace('column-', '') as TaskStatus;
      const task = tasks.find(t => t.id === taskId);
      
      if (task && task.status !== newStatus) {
        await service.update(taskId, { status: newStatus });
        await load();
      }
    } else {
      // Dropped on another task - swap positions or move within same column
      const targetTask = tasks.find(t => t.id === overId);
      const sourceTask = tasks.find(t => t.id === taskId);
      
      if (targetTask && sourceTask && targetTask.status !== sourceTask.status) {
        await service.update(taskId, { status: targetTask.status });
        await load();
      }
    }

    setActiveId(null);
    setDraggingId(null);
  };

  const getTaskStatus = (taskId: string): TaskStatus => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status || 'todo';
  };

  const addComment = async (text: string) => {
    if (!service || !editing) return;
    await service.addComment(editing.id, text);
    await load();
    const updated = (await service.list({})).find(t => t.id === editing.id) || editing;
    setEditing(updated);
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader title="Aufgaben – Kanban" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging}>
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
            className="border-2 border-gray-300 hover:border-[#058bc0] hover:bg-blue-50 transition-all"
          >
            {viewMode === 'board' ? '📋 Liste' : '📊 Kanban'}
          </Button>
          <Button 
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105" 
            size="sm" 
            onClick={openNew}
          >
            ✨ Neue Aufgabe
          </Button>
        </div>
      </AppHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Card */}
        <Card className="tradetrackr-card mb-6 border-2 border-[#058bc0] shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              Filter & Suche
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                <Input 
                  placeholder="Suchen..." 
                  value={search} 
                  onChange={e=>setSearch(e.target.value)} 
                  className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📁</div>
                <Select value={project || 'all'} onValueChange={(val) => setProject(val === 'all' ? '' : val)}>
                  <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                    <SelectValue placeholder="Alle Projekte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Projekte</SelectItem>
                    {projects.map((proj: any) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.projectNumber} - {proj.projectTitle || proj.projectName || 'Unbenannt'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">👤</div>
                <Select value={assignee || 'all'} onValueChange={(val) => setAssignee(val === 'all' ? '' : val)}>
                  <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                    <SelectValue placeholder="Alle Mitarbeiter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.uid} value={emp.uid}>
                        {emp.vorname} {emp.nachname} {emp.mitarbeiterID ? `(${emp.mitarbeiterID})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">⚡</div>
                <Select value={priority} onValueChange={(v:any)=>setPriority(v)}>
                  <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                    <SelectValue placeholder="Priorität" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🎯 Alle</SelectItem>
                    <SelectItem value="low">📎 Niedrig</SelectItem>
                    <SelectItem value="medium">📌 Mittel</SelectItem>
                    <SelectItem value="high">⚠️ Hoch</SelectItem>
                    <SelectItem value="critical">🔥 Kritisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board / List View */}
        {viewMode==='board' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0.5">
              {STATUSES.map(col => {
                const columnConfig = {
                  todo: { icon: '📝', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600' },
                  in_progress: { icon: '⚡', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', headerBg: 'bg-gradient-to-r from-amber-500 to-orange-600' },
                  done: { icon: '✅', bgColor: 'bg-green-50', borderColor: 'border-green-200', headerBg: 'bg-gradient-to-r from-green-500 to-emerald-600' },
                  blocked: { icon: '🚫', bgColor: 'bg-red-50', borderColor: 'border-red-200', headerBg: 'bg-gradient-to-r from-red-500 to-rose-600' },
                  archived: { icon: '📦', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', headerBg: 'bg-gradient-to-r from-gray-500 to-gray-600' }
                }[col];
                const label = col === 'todo' ? 'To Do' : col === 'in_progress' ? 'In Arbeit' : col === 'done' ? 'Fertig' : col === 'blocked' ? 'Blockiert' : 'Archiviert';
                
                return (
                  <Card 
                    key={col} 
                    id={`column-${col}`}
                    className={`tradetrackr-card border-2 ${columnConfig?.borderColor} shadow-lg overflow-hidden`}
                    data-column-id={col}
                  >
                    <CardHeader className={`pb-3 ${columnConfig?.headerBg} text-white px-6 pt-4 mb-4`}>
                      <CardTitle className="text-base font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{columnConfig?.icon}</span>
                          <div>
                            <div>{label}</div>
                            <div className="text-xs text-white/80 mt-1 font-normal">{byStatus[col].length} Aufgaben</div>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SortableContext 
                        items={byStatus[col].map(t => t.id)} 
                        strategy={verticalListSortingStrategy}
                        id={`column-${col}`}
                      >
                        <div className={`space-y-1 min-h-[400px] p-0.5 rounded-lg ${columnConfig?.bgColor}`}>
                          {byStatus[col].map(t => {
                            const project = projects.find((p: any) => p.id === t.projectId);
                            const projectNumber = project?.projectNumber || project?.projectTitle || t.projectId || '';
                            return (
                              <SortableTaskCard
                                key={t.id}
                                task={t}
                                projectNumber={projectNumber}
                                onClick={() => { setEditing(t); setShowModal(true); }}
                              />
                            );
                          })}
                          {byStatus[col].length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                              <div className="text-4xl mb-2">{columnConfig?.icon}</div>
                              <div className="text-sm">Keine Aufgaben</div>
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <DragOverlay>
              {activeId ? (
                <div className="p-4 rounded-xl border-2 bg-white shadow-2xl rotate-3 opacity-90">
                  <div className="font-semibold text-gray-900 mb-2">
                    {tasks.find(t => t.id === activeId)?.title || 'Aufgabe'}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <Card className="tradetrackr-card">
            <CardHeader>
              <CardTitle>Alle Aufgaben</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Titel</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Priorität</th>
                      <th className="py-2 pr-4">Fällig</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => {
                      const due = t.dueAt ? new Date(t.dueAt) : null;
                      const overdue = due ? isOverdue(new Date(), due, t.status) : false;
                      return (
                        <tr key={t.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>{ setEditing(t); setShowModal(true); }}>
                          <td className="py-2 pr-4 max-w-[320px] truncate">{t.title}</td>
                          <td className="py-2 pr-4 capitalize">{t.status.replace('_',' ')}</td>
                          <td className="py-2 pr-4">{t.priority}</td>
                          <td className={`py-2 pr-4 ${overdue?'text-red-600':''}`}>{due ? due.toLocaleString('de-DE') : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editor - ohne presetProjectId, zeigt Projekt-Dropdown */}
        <TaskModal 
          open={showModal} 
          onOpenChange={setShowModal} 
          initial={editing || undefined} 
          presetProjectId={project || undefined}
          onSave={saveTask} 
          onAddComment={addComment} 
        />
      </div>

      {/* Quick Action Sidebar */}
    </div>
  );
};

export default TaskBoard;


