import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskItem, TaskPriority, TaskStatus, TaskChecklistItem } from '@/types/tasks';
import CommentBox from '@/components/tasks/CommentBox';
import { CheckSquare, Calendar, Users, Search, FolderOpen, Building2, MapPin } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import AutoCompleteInput from '@/components/AutoCompleteInput';
import { useAutocomplete } from '@/hooks/useAutocomplete';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<TaskItem>;
  presetProjectId?: string; // Optional: vorausgewähltes Projekt
  presetProject?: { id: string; projectNumber?: string; name?: string; title?: string }; // Optional: Projektinformationen für Anzeige
  onSave: (task: Partial<TaskItem>) => Promise<void>;
  onAddComment?: (text: string) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({ open, onOpenChange, initial, presetProjectId, presetProject, onSave, onAddComment }) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  React.useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [description]);
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(initial?.status || 'todo');
  const [assignees, setAssignees] = useState<string>((initial?.assigneeIds || []).join(','));
  const [dueAt, setDueAt] = useState<string>(initial?.dueAt ? initial!.dueAt!.slice(0,16) : '');
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(initial?.checklist || []);
  
  // Project selection
  const getInitialProjectId = (): string => {
    if (presetProjectId) return presetProjectId;
    if (initial?.id) return initial.projectId || '';
    return '';
  };
  const [projectId, setProjectId] = useState<string>(getInitialProjectId());
  const [projects, setProjects] = useState<any[]>([]);
  const [projectSearch, setProjectSearch] = useState<string>('');
  
  // Employee selection
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(initial?.assigneeIds || []);

  // Load projects and employees when dialog opens
  useEffect(() => {
    if (open && concernID) {
      const loadData = async () => {
        try {
          // Load projects
          const projectsRef = collection(db, 'projects');
          const projectsQuery = query(projectsRef, where('concernID', '==', concernID));
          const projectsSnapshot = await getDocs(projectsQuery);
          const projectsList = projectsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              projectNumber: data.projectNumber,
              title: data.title || data.name || '',
              name: data.name || data.title || '',
              customerName: data.customerName,
              workLocation: data.workLocation,
            };
          });
          setProjects(projectsList);

          // Load employees from users collection
          const usersRef = collection(db, 'users');
          const usersQuery = query(usersRef, where('concernID', '==', concernID));
          const usersSnapshot = await getDocs(usersQuery);
          
          console.log('📋 Users documents found:', usersSnapshot.size);
          
          const employeesList = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log('👤 User doc:', doc.id, data);
            
            const displayName = data.displayName || 
                               `${data.vorname || ''} ${data.nachname || ''}`.trim() ||
                               data.name ||
                               data.email ||
                               doc.id;
            
            return {
              id: doc.id,
              uid: doc.id,
              name: displayName,
              vorname: data.vorname,
              nachname: data.nachname,
              email: data.email,
              role: data.role,
              mitarbeiterID: data.mitarbeiterID,
              isActive: data.isActive !== false,
            };
          }).filter(emp => emp.isActive);
          
          console.log('✅ Filtered employees:', employeesList.length, employeesList);
          setEmployees(employeesList);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      loadData();
    }
  }, [open, concernID]);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || '');
      setDescription(initial?.description || '');
      setPriority(initial?.priority || 'medium');
      setStatus(initial?.status || 'todo');
      setSelectedEmployees(initial?.assigneeIds || []);
      setDueAt(initial?.dueAt ? initial!.dueAt!.slice(0,16) : '');
      setChecklist(initial?.checklist || []);
      // Only set projectId if editing existing task or presetProjectId is provided
      // For new tasks, leave it empty to show neutral state
      if (presetProjectId) {
        setProjectId(presetProjectId);
      } else if (initial?.id) {
        setProjectId(initial.projectId || '');
      } else {
        setProjectId('');
      }
      setProjectSearch('');
    }
  }, [open, initial, presetProjectId]);

  // Find selected project for display
  const selectedProject = useMemo(() => {
    // First try to use presetProject if provided (most reliable)
    if (presetProject) {
      return presetProject;
    }
    // Otherwise, find in loaded projects
    const projectIdToFind = presetProjectId || projectId;
    return projects.find(p => p.id === projectIdToFind);
  }, [projects, presetProjectId, projectId, presetProject]);

  const addChecklist = () => setChecklist(prev => [...prev, { label: '', checked: false }]);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const search = projectSearch.toLowerCase();
    return projects.filter(p => 
      p.projectNumber?.toLowerCase().includes(search) ||
      p.title?.toLowerCase().includes(search) ||
      p.name?.toLowerCase().includes(search) ||
      p.customerName?.toLowerCase().includes(search)
    );
  }, [projects, projectSearch]);

  // Hooks müssen immer aufgerufen werden, unabhängig von Bedingungen
  // Don't use storage for project autocomplete - always show projects in order
  const projectAutocomplete = useAutocomplete({
    data: projects,
    getLabel: (p) => `${p.projectNumber || ''} - ${p.name || p.title || 'Kein Titel'}`,
    getValue: (p) => p.id || '',
    getDescription: (p) => {
      const parts = [];
      if (p.customerName) parts.push(`👤 ${p.customerName}`);
      if (p.workLocation) parts.push(`📍 ${p.workLocation}`);
      return parts.length > 0 ? parts.join(' | ') : undefined;
    },
    storageKey: undefined, // Don't track usage - show projects in original order
    maxRecentItems: 0,
  });

  const employeeAutocomplete = useAutocomplete({
    data: employees,
    getLabel: (e) => e.name || '',
    getValue: (e) => e.uid || '',
    getDescription: (e) => e.email ? `📧 ${e.email}` : undefined,
    storageKey: 'task_employee',
    maxRecentItems: 5,
  });

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const save = async () => {
    if (!projectId && !presetProjectId) {
      alert('Bitte wählen Sie ein Projekt aus');
      return;
    }
    
    // Build task data object, only including dueAt if it has a value
    const taskData: any = {
      title, 
      description, 
      priority, 
      status,
      projectId: projectId || presetProjectId,
      assigneeIds: selectedEmployees,
      checklist,
    };
    
    // Only add dueAt if it's set
    if (dueAt) {
      taskData.dueAt = new Date(dueAt).toISOString();
    }
    
    await onSave(taskData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
          {/* Animated background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          
          <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
            <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
              {initial?.id ? '✏️' : '✨'}
            </div>
            <div className="flex-1">
              {initial?.id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
              <div className="text-xs font-normal text-white/80 mt-1">
                {initial?.id ? 'Ändern Sie die Aufgabendetails' : 'Erstellen Sie eine neue Aufgabe für Ihr Team'}
              </div>
              {selectedProject && (
                <div className="text-sm font-semibold text-white mt-2 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {selectedProject.projectNumber && (
                    <>
                      <span>{selectedProject.projectNumber}</span>
                      {(selectedProject.title || selectedProject.name) && <span>•</span>}
                    </>
                  )}
                  <span>{selectedProject.name || selectedProject.title || ''}</span>
                </div>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {initial?.id ? 'Dialog zum Bearbeiten einer Aufgabe' : 'Dialog zum Erstellen einer neuen Aufgabe'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 pt-2">
          {/* Projekt-Auswahl oder Info (nur wenn nicht preset) */}
          {!presetProjectId && (
            <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
              {!projectId ? (
                // Selection Mode with Autocomplete
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-[#058bc0]" />
                    Projekt auswählen *
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      ({projects.length} {projects.length === 1 ? 'Projekt verfügbar' : 'Projekte verfügbar'})
                    </span>
                  </Label>
                  <div className="relative">
                    <AutoCompleteInput
                      label=""
                      placeholder={projects.length > 0 ? `Projekt auswählen (${projects.length} verfügbar)...` : "Projektnummer oder Name eingeben..."}
                      value={projectSearch}
                      onChange={(value) => {
                        setProjectSearch(value);
                        // Try to find matching project
                        const matchingProject = projects.find(
                          p => p.projectNumber === value || p.title === value || p.name === value
                        );
                        if (matchingProject) {
                          setProjectId(matchingProject.id);
                          setProjectSearch('');
                        }
                      }}
                      onSelect={(option) => {
                        const selectedProject = projects.find(p => p.id === option.value);
                        if (selectedProject) {
                          setProjectId(selectedProject.id);
                          setProjectSearch('');
                        }
                      }}
                      options={projectAutocomplete.options}
                      filterFn={(option, searchTerm) => {
                        const project = projects.find(p => p.id === option.value);
                        if (!project) return false;
                        const search = searchTerm.toLowerCase();
                        return (
                          project.projectNumber?.toLowerCase().includes(search) ||
                          project.title?.toLowerCase().includes(search) ||
                          project.customerName?.toLowerCase().includes(search)
                        );
                      }}
                      showRecentFirst={false}
                      showUsageCount={false}
                      maxSuggestions={10}
                      icon={<FolderOpen className="h-4 w-4" />}
                      emptyMessage="Keine Projekte gefunden"
                    />
                    {projects.length > 10 && (
                      <div className="absolute -bottom-6 left-0 text-xs text-blue-600 font-medium flex items-center gap-1 mt-1">
                        <span>⬇️</span>
                        <span>Weitere {projects.length - 10} Projekte verfügbar - scrollen Sie nach unten</span>
                      </div>
                    )}
                  </div>
                  {projects.length > 0 && (
                    <div className="mt-3 p-2.5 bg-blue-100 rounded-md border border-blue-300">
                      <p className="text-xs text-blue-800 font-medium flex items-center gap-2">
                        <span>💡</span>
                        <span>Tipp: Klicken Sie auf das Feld, um alle {projects.length} Projekte zu sehen</span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Info Mode - Show selected project details
                <>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-[#058bc0]" />
                      Ausgewähltes Projekt
                    </Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setProjectId('');
                        setProjectSearch('');
                      }}
                      className="bg-white hover:bg-gray-50"
                    >
                      Ändern
                    </Button>
                  </div>
                  
                  {(() => {
                    const selectedProj = projects.find(p => p.id === projectId);
                    return selectedProj ? (
                      <div className="bg-white p-3 rounded-md border border-gray-300 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-lg font-bold text-[#058bc0]">{selectedProj.projectNumber}</div>
                            <div className="text-sm font-semibold text-gray-900 mt-1">{selectedProj.title}</div>
                          </div>
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            ✓ Aktiv
                          </div>
                        </div>
                        
                        {selectedProj.customerName && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 border-t pt-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">Kunde:</span>
                            <span>{selectedProj.customerName}</span>
                          </div>
                        )}
                        
                        {selectedProj.workLocation && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">Standort:</span>
                            <span>{selectedProj.workLocation}</span>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          )}

          {/* Titel */}
          <div className="space-y-1 p-2 bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg border-2 border-blue-300 shadow-md">
            <Label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">📝</span>
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Titel *
              </span>
            </Label>
            <Input 
              value={title} 
              onChange={e=>setTitle(e.target.value)} 
              placeholder="Aufgabentitel eingeben..."
              className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 text-gray-900 font-medium shadow-sm text-base h-9"
            />
          </div>

          {/* Beschreibung */}
          <div className="space-y-1 p-2 bg-gradient-to-br from-purple-100 via-purple-50 to-white rounded-lg border-2 border-purple-300 shadow-md">
            <Label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">📄</span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Beschreibung
              </span>
            </Label>
            <Textarea 
              ref={descriptionRef}
              value={description} 
              onChange={e=>setDescription(e.target.value)} 
              placeholder="Detaillierte Beschreibung (Markdown unterstützt)..."
              className="bg-white border-2 border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/30 text-gray-900 min-h-[60px] max-h-[300px] shadow-sm resize-none overflow-y-auto"
              rows={2}
            />
          </div>

          {/* Priorität, Status, Fälligkeitsdatum */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2 bg-gradient-to-br from-orange-100 via-orange-50 to-white rounded-lg border-2 border-orange-300 shadow-md">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-sm font-bold text-gray-900 flex items-center gap-1 h-6">
                <span className="text-lg">⚡</span>
                Priorität
              </Label>
              <Select value={priority} onValueChange={(v:any)=>setPriority(v)}>
                <SelectTrigger className="bg-white border-2 border-orange-300 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/30 text-gray-900 shadow-sm font-medium h-10 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-orange-300">
                  <SelectItem value="low" className="text-sm">🟢 Niedrig</SelectItem>
                  <SelectItem value="medium" className="text-sm">🟡 Mittel</SelectItem>
                  <SelectItem value="high" className="text-sm">🟠 Hoch</SelectItem>
                  <SelectItem value="critical" className="text-sm">🔴 Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label className="text-sm font-bold text-gray-900 flex items-center gap-1 h-6">
                <span className="text-lg">📊</span>
                Status
              </Label>
              <Select value={status} onValueChange={(v:any)=>setStatus(v)}>
                <SelectTrigger className="bg-white border-2 border-orange-300 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/30 text-gray-900 shadow-sm font-medium h-10 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-orange-300">
                  <SelectItem value="todo" className="text-sm">📋 To Do</SelectItem>
                  <SelectItem value="in_progress" className="text-sm">⚙️ In Arbeit</SelectItem>
                  <SelectItem value="done" className="text-sm">✅ Erledigt</SelectItem>
                  <SelectItem value="blocked" className="text-sm">🚫 Blockiert</SelectItem>
                  <SelectItem value="archived" className="text-sm">📦 Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label className="text-sm font-bold text-gray-900 flex items-center gap-1 h-6">
                <Calendar className="h-4 w-4 text-orange-600" />
                Fällig am
              </Label>
              <Input 
                type="datetime-local" 
                value={dueAt} 
                onChange={e=>setDueAt(e.target.value)}
                className="bg-white border-2 border-orange-300 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/30 text-gray-900 shadow-sm font-medium h-10 text-sm w-full"
              />
            </div>
          </div>

          {/* Zugewiesene Benutzer - Multi-Select with Autocomplete */}
          <div className="space-y-2 p-2 bg-gradient-to-br from-green-100 via-green-50 to-white rounded-lg border-2 border-green-300 shadow-md">
            <Label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="text-lg">👥</span>
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Zugewiesene Mitarbeiter
              </span>
              <span className="ml-1 text-xs text-gray-500 font-normal">
                (Auto-Vervollständigung verfügbar)
              </span>
            </Label>
            
            {/* Autocomplete for quick employee search */}
            <div className="mb-1">
              <AutoCompleteInput
                label=""
                placeholder="Mitarbeiter suchen und hinzufügen..."
                value=""
                onChange={() => {}}
                onSelect={(option) => {
                  const empId = option.value;
                  if (!selectedEmployees.includes(empId)) {
                    toggleEmployee(empId);
                    employeeAutocomplete.trackUsage(option.id);
                  }
                }}
                options={employeeAutocomplete.options.filter(
                  opt => !selectedEmployees.includes(opt.value)
                )}
                filterFn={employeeAutocomplete.filterFn}
                showRecentFirst={true}
                showUsageCount={true}
                maxSuggestions={5}
                icon={<Users className="h-4 w-4" />}
                emptyMessage="Keine Mitarbeiter gefunden"
              />
            </div>
            
            <div className="bg-white border-2 border-green-300 rounded-lg max-h-[150px] overflow-y-auto p-1 shadow-sm">
              {employees.length === 0 && (
                <p className="text-sm text-gray-500 text-center p-2">Keine Mitarbeiter verfügbar</p>
              )}
              {employees.map(emp => (
                <div
                  key={emp.uid}
                  onClick={() => toggleEmployee(emp.uid)}
                  className={`p-2 rounded cursor-pointer flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                    selectedEmployees.includes(emp.uid) ? 'bg-blue-100 border-l-4 border-l-[#058bc0]' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedEmployees.includes(emp.uid) 
                      ? 'bg-[#058bc0] border-[#058bc0]' 
                      : 'bg-white border-gray-300'
                  }`}>
                    {selectedEmployees.includes(emp.uid) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                    {emp.email && (
                      <div className="text-xs text-gray-500">{emp.email}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Selected employees summary */}
            {selectedEmployees.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-xs font-semibold text-green-900 mb-1">
                  ✓ {selectedEmployees.length} Mitarbeiter ausgewählt:
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedEmployees.map(empId => {
                    const emp = employees.find(e => e.uid === empId);
                    return emp ? (
                      <span key={empId} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs border border-green-300">
                        {emp.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmployee(empId);
                          }}
                          className="text-red-600 hover:text-red-800 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Checkliste */}
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                Checkliste
              </Label>
              <Button variant="outline" size="sm" onClick={addChecklist} className="bg-white h-7 text-xs px-2">
                + Hinzufügen
              </Button>
            </div>
            <div className="space-y-1">
              {checklist.length === 0 && (
                <p className="text-sm text-gray-500 italic">Keine Checklisten-Einträge</p>
              )}
              {checklist.map((c, i) => (
                <div key={i} className="flex gap-1 items-center bg-white p-1 rounded border border-gray-200">
                  <Input 
                    className="flex-1 border-gray-300 text-gray-900 text-sm h-7" 
                    value={c.label} 
                    onChange={e=>setChecklist(prev=>prev.map((it, idx)=> idx===i? { ...it, label: e.target.value }: it))} 
                    placeholder={`Schritt ${i + 1}`}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setChecklist(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-300">
            <Button 
              variant="outline" 
              onClick={()=>onOpenChange(false)}
              className="border-2 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-medium shadow-sm hover:shadow-md transition-all px-4 py-2 text-sm h-9"
            >
              <span className="text-base mr-1">❌</span> Abbrechen
            </Button>
            <Button 
              onClick={save}
              className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-medium shadow-md hover:shadow-lg transition-all px-5 py-2 text-sm border-2 border-[#047ba8] h-9"
              disabled={!title.trim() || (!projectId && !presetProjectId)}
            >
              <span className="text-base mr-1">{initial?.id ? '✅' : '✨'}</span>
              {initial?.id ? 'Aktualisieren' : 'Aufgabe erstellen'}
            </Button>
          </div>

          {/* Kommentare Section */}
          {onAddComment && initial?.id && (
            <div className="pt-6 border-t">
              <Label className="text-sm font-semibold text-gray-900 mb-3 block">Kommentare</Label>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <CommentBox comments={(initial as any)?.comments || []} onAdd={onAddComment} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;


