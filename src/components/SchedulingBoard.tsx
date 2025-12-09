import React, { useEffect, useMemo, useState, useRef } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimePicker } from '@/components/ui/time-picker';
import { useAuth } from '@/contexts/AuthContext';
import { SchedulingService } from '@/services/schedulingService';
import { ScheduleSlot } from '@/types/scheduling';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface SchedulingBoardProps {
  onBack?: () => void;
  onOpenMessaging?: () => void;
  onNavigate?: (page: string) => void;
}

type ViewMode = 'week' | 'month';

export const SchedulingBoard: React.FC<SchedulingBoardProps> = ({ onBack, onOpenMessaging, onNavigate }) => {
  const { user, hasPermission } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const [service, setService] = useState<SchedulingService | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all'|'planned'|'confirmed'|'completed'>('all');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (concernID && user?.uid) setService(new SchedulingService(concernID, user.uid));
  }, [concernID, user?.uid]);

  // Load user display names for lanes
  useEffect(() => {
    const loadNames = async () => {
      if (!concernID) return;
      try {
        // Versuche beide Varianten: ConcernID und concernID
        const q1 = query(collection(db, 'users'), where('ConcernID', '==', concernID));
        const q2 = query(collection(db, 'users'), where('concernID', '==', concernID));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const map: Record<string, string> = {};
        const empList: any[] = [];
        const processedIds = new Set<string>();
        
        // Verarbeite beide Ergebnisse, aber verhindere Duplikate
        [...snap1.docs, ...snap2.docs].forEach(d => {
          if (processedIds.has(d.id)) return;
          processedIds.add(d.id);
          
          const data: any = d.data();
          const displayName = `${data.vorname || ''} ${data.nachname || ''}`.trim() || data.displayName || data.email || d.id;
          map[d.id] = displayName;
          empList.push({
            uid: d.id,
            ...data
          });
        });
        
        console.log('👥 Loaded employees:', empList.length, empList);
        setUserNames(map);
        setEmployees(empList);
        
        // Load projects
        const projectsRef = collection(db, 'projects');
        const projectsQuery = query(projectsRef, where('concernID', '==', concernID));
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectsList = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsList);
        
        // Create project names map
        const projectMap: Record<string, string> = {};
        projectsList.forEach(proj => {
          // Versuche verschiedene Felder für Projekt-Titel
          const title = proj.projectTitle || proj.projectName || proj.name || proj.title || '';
          const number = proj.projectNumber || proj.projectnumber || '';
          
          const name = number && title
            ? `${number} - ${title}`
            : (number || title || 'Unbenanntes Projekt');
          
          projectMap[proj.id] = name;
        });
        console.log('📋 Loaded project names:', projectMap);
        console.log('📋 Projects data:', projectsList);
        setProjectNames(projectMap);
      } catch {
        setUserNames({});
        setEmployees([]);
        setProjects([]);
      }
    };
    loadNames();
  }, [concernID]);

  useEffect(() => {
    const load = async () => {
      if (!service) return;
      // Load schedule slots
      const list = await service.list(projectFilter || undefined);
      
      // Also load tasks and convert them to schedule slots
      try {
        const { TaskService } = await import('@/services/taskService');
        if (concernID && user?.uid) {
          const taskServiceInstance = new TaskService(concernID, user.uid);
          const tasks = await taskServiceInstance.list();
          
          // Convert tasks with time information (dueAt) to schedule slots
          const taskSlots: ScheduleSlot[] = tasks
            .filter((task: any) => task.dueAt && task.projectId)
            .map((task: any) => {
              // Use dueAt as end date, start date is 1 day before (or use createdAt)
              const endDate = new Date(task.dueAt);
              const startDate = task.createdAt ? new Date(task.createdAt) : new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
              
              return {
                id: `task-${task.id || Math.random().toString(36).substr(2, 9)}`,
                concernID: task.concernID || concernID || '',
                projectId: task.projectId || '',
                assigneeIds: task.assigneeIds || [],
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6',
                note: task.title || task.description || '',
                status: task.status === 'completed' || task.status === 'done' ? 'completed' : task.status === 'in-progress' || task.status === 'in_progress' ? 'confirmed' : 'planned',
                createdBy: task.createdBy || '',
                createdAt: task.createdAt || new Date().toISOString(),
                updatedAt: task.updatedAt || new Date().toISOString(),
              } as ScheduleSlot;
            });
          
          // Merge schedule slots and task slots
          const merged = [...list, ...taskSlots];
          const filtered = merged.filter(s => 
            (!resourceFilter || s.assigneeIds.includes(resourceFilter)) && 
            (statusFilter==='all' || s.status===statusFilter) &&
            (!projectFilter || s.projectId === projectFilter)
          );
          setSlots(filtered);
          return;
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        // Fallback to just schedule slots
        const filtered = list.filter(s => (!resourceFilter || s.assigneeIds.includes(resourceFilter)) && (statusFilter==='all' || s.status===statusFilter));
        setSlots(filtered);
      }
    };
    load();
  }, [service, projectFilter, resourceFilter, statusFilter, concernID]);

  const conflicts = useMemo(() => service ? service.findConflicts(slots) : [], [service, slots]);

  const startOfWeek = () => {
    const d = new Date();
    const day = d.getDay() || 7; // 1-7
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - (day - 1));
    return d;
  };

  // Deutsche Feiertage berechnen
  const getGermanHolidays = (year: number): Date[] => {
    const holidays: Date[] = [];
    
    // Feste Feiertage
    holidays.push(new Date(year, 0, 1));   // Neujahr
    holidays.push(new Date(year, 4, 1));   // Tag der Arbeit
    holidays.push(new Date(year, 9, 3));   // Tag der Deutschen Einheit
    holidays.push(new Date(year, 11, 25)); // 1. Weihnachtstag
    holidays.push(new Date(year, 11, 26)); // 2. Weihnachtstag
    
    // Ostersonntag berechnen (Gauss-Algorithmus)
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(year, month, day);
    
    // Variable Feiertage basierend auf Ostern
    const karfreitag = new Date(easter);
    karfreitag.setDate(easter.getDate() - 2);
    holidays.push(karfreitag); // Karfreitag
    
    holidays.push(easter); // Ostersonntag
    
    const ostermontag = new Date(easter);
    ostermontag.setDate(easter.getDate() + 1);
    holidays.push(ostermontag); // Ostermontag
    
    const christiHimmelfahrt = new Date(easter);
    christiHimmelfahrt.setDate(easter.getDate() + 39);
    holidays.push(christiHimmelfahrt); // Christi Himmelfahrt
    
    const pfingstsonntag = new Date(easter);
    pfingstsonntag.setDate(easter.getDate() + 49);
    holidays.push(pfingstsonntag); // Pfingstsonntag
    
    const pfingstmontag = new Date(easter);
    pfingstmontag.setDate(easter.getDate() + 50);
    holidays.push(pfingstmontag); // Pfingstmontag
    
    return holidays;
  };

  const isNonWorkingDay = (date: Date): boolean => {
    const day = date.getDay();
    // Nur Sonntag (0) - Samstag ist Arbeitstag im Handwerk!
    if (day === 0) return true;
    
    // Feiertage prüfen
    const year = date.getFullYear();
    const holidays = getGermanHolidays(year);
    
    return holidays.some(holiday => 
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
    );
  };

  // Berechne nur Arbeitstage zwischen zwei Daten
  const getWorkingDaysBetween = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    while (current <= end) {
      if (!isNonWorkingDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  // Finde den nächsten Arbeitstag
  const getNextWorkingDay = (date: Date): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    while (isNonWorkingDay(next)) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  };

  // Erstelle Segmente für Balken, die nur über Arbeitstage gehen
  const createWorkingDaySegments = (startIso: string, endIso: string): Array<{ start: Date; end: Date }> => {
    const segments: Array<{ start: Date; end: Date }> = [];
    const start = new Date(startIso);
    const end = new Date(endIso);
    
    let currentSegmentStart: Date | null = null;
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    
    while (current <= endDate) {
      const isWorking = !isNonWorkingDay(current);
      
      if (isWorking) {
        // Starte ein neues Segment oder erweitere das aktuelle
        if (!currentSegmentStart) {
          currentSegmentStart = new Date(current);
        }
      } else {
        // Nicht-Arbeitstag: Schließe das aktuelle Segment ab
        if (currentSegmentStart) {
          const segmentEnd = new Date(current);
          segmentEnd.setDate(segmentEnd.getDate() - 1);
          segmentEnd.setHours(23, 59, 59, 999);
          segments.push({ start: currentSegmentStart, end: segmentEnd });
          currentSegmentStart = null;
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Schließe das letzte Segment ab
    if (currentSegmentStart) {
      segments.push({ start: currentSegmentStart, end: new Date(end) });
    }
    
    console.log(`📊 Segmente für ${startIso} - ${endIso}:`, segments.map(s => `${s.start.toLocaleDateString('de-DE')} - ${s.end.toLocaleDateString('de-DE')}`));
    
    return segments;
  };

  const range = useMemo(() => {
    // Erweiterte Ansicht: 30 Tage Vergangenheit + Heute + 180 Tage Zukunft = 211 Tage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30); // 30 Tage zurück
    
    const totalDays = 30 + 180 + 1; // Vergangenheit + Zukunft + Heute = 211 Tage
    return Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, []);

  // Gruppierung: Projekte mit Mitarbeiter-Unterzeilen
  const projectStructure = useMemo(() => {
    const structure: Array<{
      type: 'project' | 'employee';
      projectId: string;
      projectName: string;
      employeeId?: string;
      employeeName?: string;
      slots: ScheduleSlot[];
      projectStart?: string;
      projectEnd?: string;
    }> = [];

    // Gruppiere Slots nach Projekt
    const slotsByProject = new Map<string, ScheduleSlot[]>();
    for (const s of slots) {
      if (!slotsByProject.has(s.projectId)) slotsByProject.set(s.projectId, []);
      slotsByProject.get(s.projectId)!.push(s);
    }

    // Für jedes Projekt: Haupt-Zeile + Mitarbeiter-Zeilen
    slotsByProject.forEach((projectSlots, projectId) => {
      const projectName = projectNames[projectId] || `Projekt ${projectId}`;
      
      // Berechne Projekt-Start und -Ende aus allen Slots
      const allDates = projectSlots.flatMap(s => [new Date(s.start), new Date(s.end)]);
      const projectStart = new Date(Math.min(...allDates.map(d => d.getTime()))).toISOString();
      const projectEnd = new Date(Math.max(...allDates.map(d => d.getTime()))).toISOString();

      // Haupt-Zeile: Projekt-Übersicht
      structure.push({
        type: 'project',
        projectId,
        projectName,
        slots: projectSlots,
        projectStart,
        projectEnd
      });

      // Unterzeilen: Mitarbeiter
      const employeeSlots = new Map<string, ScheduleSlot[]>();
      for (const slot of projectSlots) {
        for (const empId of slot.assigneeIds) {
          if (!employeeSlots.has(empId)) employeeSlots.set(empId, []);
          employeeSlots.get(empId)!.push(slot);
        }
      }

      employeeSlots.forEach((empSlots, empId) => {
        // Versuche den Namen aus verschiedenen Quellen zu laden
        let employeeName = userNames[empId];
        
        // Fallback: Suche in der employees Liste
        if (!employeeName) {
          const emp = employees.find(e => e.uid === empId);
          if (emp) {
            employeeName = `${emp.vorname || ''} ${emp.nachname || ''}`.trim() || emp.displayName || emp.email;
          }
        }
        
        // Letzter Fallback: Verwende die ID mit Präfix
        if (!employeeName) {
          employeeName = `Mitarbeiter ${empId.substring(0, 8)}`;
          console.warn('⚠️ Mitarbeiter nicht gefunden:', empId);
        }
        
        structure.push({
          type: 'employee',
          projectId,
          projectName,
          employeeId: empId,
          employeeName,
          slots: empSlots
        });
      });
    });

    return structure;
  }, [slots, projectNames, userNames, employees]);

  const onCreateQuick = () => {
    // Öffne Dialog mit vorausgefüllten Daten
    const now = new Date();
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    setQuickCreateData({
      projectId: projectFilter || (projects.length > 0 ? projects[0].id : ''),
      assigneeIds: [user!.uid],
      startDate: now.toISOString().split('T')[0],
      startTime: now.toTimeString().slice(0, 5),
      endDate: end.toISOString().split('T')[0],
      endTime: end.toTimeString().slice(0, 5),
      note: 'Arbeitseinsatz',
      color: '#058bc0'
    });
    
    setQuickCreateOpen(true);
  };

  const saveQuickCreate = async () => {
    if (!service) return;
    
    if (!quickCreateData.assigneeIds.length) {
      alert('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }
    
    const startDateTime = new Date(`${quickCreateData.startDate}T${quickCreateData.startTime}:00`);
    const endDateTime = new Date(`${quickCreateData.endDate}T${quickCreateData.endTime}:00`);
    
    // Erstelle einen Slot für jeden ausgewählten Mitarbeiter
    for (const assigneeId of quickCreateData.assigneeIds) {
      await service.create({
        projectId: quickCreateData.projectId,
        assigneeIds: [assigneeId],
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        color: quickCreateData.color,
        note: quickCreateData.note
      });
    }
    
    const list = await service.list(projectFilter || undefined);
    setSlots(list);
    setQuickCreateOpen(false);
    setQuickCreateData({
      projectId: '',
      assigneeIds: [],
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      note: '',
      color: '#058bc0'
    });
  };

  const openEditSlot = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    
    setEditSlotData({
      projectId: slot.projectId,
      assigneeIds: slot.assigneeIds || [],
      startDate: start.toISOString().split('T')[0],
      startTime: start.toTimeString().slice(0, 5),
      endDate: end.toISOString().split('T')[0],
      endTime: end.toTimeString().slice(0, 5),
      note: slot.note || '',
      color: slot.color || '#058bc0'
    });
    
    setEditSlotOpen(true);
  };

  const saveEditSlot = async () => {
    if (!service || !editingSlot) return;
    
    if (!editSlotData.assigneeIds.length) {
      alert('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }
    
    const startDateTime = new Date(`${editSlotData.startDate}T${editSlotData.startTime}:00`);
    const endDateTime = new Date(`${editSlotData.endDate}T${editSlotData.endTime}:00`);
    
    await service.update(editingSlot.id, {
      projectId: editSlotData.projectId,
      assigneeIds: editSlotData.assigneeIds,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      color: editSlotData.color,
      note: editSlotData.note
    });
    
    const list = await service.list(projectFilter || undefined);
    setSlots(list);
    setEditSlotOpen(false);
    setEditingSlot(null);
  };

  const deleteEditSlot = async () => {
    if (!service || !editingSlot) return;
    
    if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) return;
    
    await service.delete(editingSlot.id);
    
    const list = await service.list(projectFilter || undefined);
    setSlots(list);
    setEditSlotOpen(false);
    setEditingSlot(null);
  };

  const onExportICS = () => {
    if (!service) return;
    const ics = service.generateICS(slots);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'schedule.ics'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  // DnD enhanced board
  const [dragId, setDragId] = useState<string | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState<number>(0);
  const [history, setHistory] = useState<ScheduleSlot[][]>([]);
  const [future, setFuture] = useState<ScheduleSlot[][]>([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateData, setQuickCreateData] = useState({
    projectId: '',
    assigneeIds: [] as string[],
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    note: '',
    color: '#058bc0'
  });
  
  const [editSlotOpen, setEditSlotOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editSlotData, setEditSlotData] = useState({
    projectId: '',
    assigneeIds: [] as string[],
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    note: '',
    color: '#058bc0'
  });


  const renderBars = () => {
    const onMouseDownBar = (e: React.MouseEvent, slot: ScheduleSlot) => {
      const dayWidth = 100;
      e.preventDefault();
      e.stopPropagation();
      
      const container = e.currentTarget.parentElement as HTMLElement;
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const slotStartPx = parseFloat((e.currentTarget as HTMLElement).style.left || '0');
      setDragOffsetDays(Math.floor((clickX - slotStartPx) / dayWidth));
      setDragId(slot.id);
      
      // History speichern
      setHistory(prev => [...prev, slots]);
      setFuture([]);
    };

    const onMouseDownResize = (e: React.MouseEvent, slot: ScheduleSlot) => {
      e.preventDefault();
      e.stopPropagation();
      setResizeId(slot.id);
      
      // History speichern
      setHistory(prev => [...prev, slots]);
      setFuture([]);
    };

    const onMouseMove = async (e: React.MouseEvent) => {
      if (!dragId && !resizeId) return;
      
      const dayWidth = 100;
      const container = e.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - 250; // 250px = labelWidth
      const dayIndex = Math.floor(mouseX / dayWidth);
      
      const slot = slots.find(s => s.id === (dragId || resizeId));
      if (!slot) return;

      if (dragId) {
        // Drag: Verschiebe den ganzen Slot
        let newDayIndex = Math.max(0, Math.min(range.length - 1, dayIndex - dragOffsetDays));
        
        // Überspringe Wochenenden und Feiertage
        while (newDayIndex < range.length && isNonWorkingDay(range[newDayIndex])) {
          newDayIndex++;
        }
        
        // Falls kein Arbeitstag gefunden, nicht verschieben
        if (newDayIndex >= range.length || isNonWorkingDay(range[newDayIndex])) {
          return;
        }
        
        const currentStart = new Date(slot.start);
        const currentEnd = new Date(slot.end);
        const durationMs = currentEnd.getTime() - currentStart.getTime();
        
        const newStart = new Date(range[newDayIndex]);
        newStart.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0);
        const newEnd = new Date(newStart.getTime() + durationMs);
        
        setSlots(prev => prev.map(s => 
          s.id === slot.id 
            ? { ...s, start: newStart.toISOString(), end: newEnd.toISOString() } 
            : s
        ));
      } else if (resizeId) {
        // Resize: Ändere nur das Ende
        const newDayIndex = Math.max(0, Math.min(range.length - 1, dayIndex));
        const startDate = new Date(slot.start);
        const startDayIndex = Math.floor((startDate.getTime() - range[0].getTime()) / (24 * 3600 * 1000));
        
        if (newDayIndex >= startDayIndex) {
          const newEnd = new Date(range[newDayIndex]);
          newEnd.setHours(23, 59, 59, 999);
          
          setSlots(prev => prev.map(s => 
            s.id === slot.id 
              ? { ...s, end: newEnd.toISOString() } 
              : s
          ));
        }
      }
    };

    const onMouseUp = async () => {
      if (!service) { 
        setDragId(null); 
        setResizeId(null); 
        return; 
      }
      
      const editedId = dragId || resizeId;
      if (editedId) {
        const slot = slots.find(s => s.id === editedId);
        if (slot) {
          try {
            await service.update(slot.id, { start: slot.start, end: slot.end });
          } catch (error) {
            console.error('Failed to update slot:', error);
          }
        }
      }
      
      setDragId(null); 
      setResizeId(null);
    };

    const laneHeight = 48;
    const labelWidth = 250;
    const dayWidth = 100; // Breite pro Tag in Pixel
    const totalWidth = range.length * dayWidth;
    
    return (
      <div className="relative w-full">
        {/* Gesamter Scroll-Container mit sichtbarer Scrollbar */}
        <div 
          className="border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-white shadow-sm"
          style={{ 
            overflowX: 'scroll',
            overflowY: 'hidden',
            width: '100%',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div style={{ width: `${totalWidth + labelWidth}px` }}>
            {/* Header mit Datum-Spalten */}
            <div className="flex bg-white border-b-2 border-gray-300">
              {/* Feste Label-Spalte - sticky */}
              <div className="flex-shrink-0 border-r-2 border-gray-300 bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-center font-bold text-gray-700 sticky left-0 z-30" style={{ width: `${labelWidth}px`, height: '50px' }}>
                Projekt
              </div>
              {/* Datum-Spalten */}
              <div className="flex">
                {range.map((d, idx) => {
                  const isNonWorking = isNonWorkingDay(d);
                  return (
                    <div key={d.toISOString()} className={`flex-shrink-0 border-r-2 border-gray-400 text-center py-2 ${isNonWorking ? 'bg-yellow-200' : 'bg-gradient-to-b from-gray-50 to-white'}`} style={{ width: `${dayWidth}px` }}>
                      <div className={`text-sm font-bold ${isNonWorking ? 'text-gray-800' : 'text-gray-700'}`}>{d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</div>
                      <div className={`text-xs ${isNonWorking ? 'text-gray-700' : 'text-gray-500'}`}>{d.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ressourcen-Zeilen */}
            <div className="relative" style={{ height: `${Math.max(300, projectStructure.length * (laneHeight + 4))}px` }} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
          {projectStructure.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📅</div>
                <div>Keine Einträge vorhanden</div>
              </div>
            </div>
          ) : (
            projectStructure.map((row, rowIdx) => {
              const isProjectRow = row.type === 'project';
              
              return (
                <div key={`${row.projectId}-${row.employeeId || 'main'}`} className={`absolute left-0 right-0 border-b-2 border-gray-300 transition-colors`} style={{ top: `${rowIdx * (laneHeight + 4)}px`, height: `${laneHeight}px` }}>
                  {/* Label-Spalte - sticky - vollflächig und undurchsichtig */}
                  <div className={`absolute left-0 top-0 h-full border-r-2 border-gray-300 flex items-center px-3 text-sm overflow-hidden sticky z-20 ${isProjectRow ? 'bg-blue-100 font-bold' : 'bg-white font-medium pl-6'}`} style={{ width: `${labelWidth}px`, left: 0 }}>
                    {isProjectRow ? (
                      <>
                        <span className="truncate text-gray-800" title={row.projectName}>{row.projectName}</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate text-gray-700" title={row.employeeName}>{row.employeeName}</span>
                        <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{row.slots.length}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Timeline-Bereich */}
                  <div className="absolute top-0 bottom-0" style={{ left: `${labelWidth}px`, width: `${totalWidth}px` }}>
                    {/* Tages-Raster */}
                    {range.map((d, idx) => {
                      const isNonWorking = isNonWorkingDay(d);
                      return (
                        <div key={d.toISOString()} className={`absolute top-0 bottom-0 border-r-2 border-gray-300 ${isNonWorking ? 'bg-yellow-100' : ''}`} style={{ left: `${idx * dayWidth}px`, width: `${dayWidth}px` }} />
                      );
                    })}
                    
                    {/* Slots oder Projekt-Balken */}
                    {isProjectRow && row.projectStart && row.projectEnd ? (
                      // Projekt-Haupt-Balken (nur über Arbeitstage)
                      (() => {
                        const segments = createWorkingDaySegments(row.projectStart, row.projectEnd);
                        console.log(`📋 Projekt ${row.projectName}:`, segments.length, 'Segmente');
                        
                        return segments.map((segment, segIdx) => {
                          const rangeStart = range[0];
                          rangeStart.setHours(0, 0, 0, 0);
                          
                          const segStart = new Date(segment.start);
                          segStart.setHours(0, 0, 0, 0);
                          const segEnd = new Date(segment.end);
                          segEnd.setHours(0, 0, 0, 0);
                          
                          const startDayOffset = Math.floor((segStart.getTime() - rangeStart.getTime()) / (24 * 3600 * 1000));
                          const endDayOffset = Math.floor((segEnd.getTime() - rangeStart.getTime()) / (24 * 3600 * 1000));
                          const durationDays = endDayOffset - startDayOffset + 1; // +1 weil beide Tage inklusiv
                          
                          const leftPx = startDayOffset * dayWidth;
                          const widthPx = durationDays * dayWidth;
                          
                          console.log(`  Segment ${segIdx}: ${segment.start.toLocaleDateString('de-DE')} - ${segment.end.toLocaleDateString('de-DE')} → Start-Tag: ${startDayOffset}, End-Tag: ${endDayOffset}, Dauer: ${durationDays} Tage, Position: ${leftPx}px, Breite: ${widthPx}px`);
                          
                          return (
                            <div
                              key={`${row.projectId}-segment-${segIdx}`}
                              className="absolute top-1 bottom-1 rounded-md border-2 border-purple-500 flex items-center overflow-hidden cursor-pointer hover:opacity-100 transition-all"
                              style={{ 
                                left: `${leftPx}px`, 
                                width: `${widthPx}px`, 
                                background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                                opacity: 0.7
                              }}
                              title={`${row.projectName}\n${segment.start.toLocaleDateString('de-DE')} - ${segment.end.toLocaleDateString('de-DE')}\nKlicken zum Anzeigen aller Projekt-Slots`}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Öffne den ersten Slot dieses Projekts zum Bearbeiten
                                const firstSlot = row.slots[0];
                                if (firstSlot) {
                                  openEditSlot(firstSlot);
                                }
                              }}
                            >
                              <div className="flex-1 px-2 text-white text-xs font-bold truncate text-center">
                                Projektdauer
                              </div>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      // Mitarbeiter-Slots (nur über Arbeitstage)
                      row.slots.flatMap(s => {
                        const hasConflict = conflicts.some(c => c.slotAId === s.id || c.slotBId === s.id);
                        const rangeStart = range[0];
                        rangeStart.setHours(0, 0, 0, 0);
                        
                        // Erstelle Segmente für jeden Slot (nur Arbeitstage)
                        return createWorkingDaySegments(s.start, s.end).map((segment, segIdx) => {
                          const segStart = new Date(segment.start);
                          segStart.setHours(0, 0, 0, 0);
                          const segEnd = new Date(segment.end);
                          segEnd.setHours(0, 0, 0, 0);
                          
                          const startDayOffset = Math.floor((segStart.getTime() - rangeStart.getTime()) / (24 * 3600 * 1000));
                          const endDayOffset = Math.floor((segEnd.getTime() - rangeStart.getTime()) / (24 * 3600 * 1000));
                          const durationDays = endDayOffset - startDayOffset + 1; // +1 weil beide Tage inklusiv
                          
                          const leftPx = startDayOffset * dayWidth;
                          const widthPx = durationDays * dayWidth;
                          
                          return (
                            <div key={`${s.id}-segment-${segIdx}`}
                              className={`absolute top-1 bottom-1 rounded-md shadow-sm border-2 flex items-center overflow-hidden cursor-pointer hover:shadow-lg transition-all ${hasConflict ? 'border-red-500 ring-2 ring-red-200' : 'border-white'}`}
                              style={{ 
                                left: `${leftPx}px`, 
                                width: `${widthPx}px`, 
                                background: hasConflict 
                                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                  : `linear-gradient(135deg, ${s.color || '#3b82f6'} 0%, ${s.color ? s.color + 'dd' : '#2563eb'} 100%)`
                              }}
                              title={`${row.employeeName}\n${segment.start.toLocaleDateString('de-DE')} - ${segment.end.toLocaleDateString('de-DE')}\n${s.note || 'Arbeit'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditSlot(s);
                              }}
                              onMouseDown={(e) => {
                                // Nur Drag starten, wenn nicht auf den Resize-Handle geklickt wurde
                                const target = e.target as HTMLElement;
                                if (!target.classList.contains('cursor-ew-resize')) {
                                  onMouseDownBar(e, s);
                                }
                              }}
                            >
                              <div className="flex-1 px-2 text-white text-xs font-medium truncate">
                                {hasConflict && <span className="mr-1">⚠️</span>}
                                {s.note || 'Arbeit'}
                              </div>
                              <div className="w-3 h-full bg-white/20 hover:bg-white/40 cursor-ew-resize flex items-center justify-center" onMouseDown={(e) => onMouseDownResize(e, s)}>
                                <div className="w-0.5 h-4 bg-white/60 rounded"></div>
                              </div>
                            </div>
                          );
                        });
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (<>
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader title="📅 Personaleinsatzplan" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging}>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={onCreateQuick}
            className="border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all"
          >
            ➕ Eintrag erstellen
          </Button>
          <Button 
            onClick={onExportICS}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            📥 ICS Export
          </Button>
        </div>
      </AppHeader>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter & Controls Card */}
        <Card className="tradetrackr-card mb-6 border-2 border-[#058bc0] shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎛️</span>
                Ansicht & Filter
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={()=>{ if(history.length){ const prev=history[history.length-1]; setHistory(h=>h.slice(0,-1)); setFuture(f=>[slots,...f]); setSlots(prev);} }}
                  disabled={!history.length}
                  className="bg-gradient-to-b from-yellow-300 to-yellow-500 hover:from-yellow-400 hover:to-yellow-600 active:from-yellow-600 active:to-yellow-700 text-gray-900 border-3 border-yellow-600 hover:border-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-600 disabled:border-gray-500 font-bold shadow-[0_4px_6px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_12px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:scale-105 active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-0 active:scale-100 text-base px-5 py-2 rounded-lg cursor-pointer"
                >
                  ↶ Undo
                </Button>
                <Button 
                  onClick={()=>{ if(future.length){ const nxt=future[0]; setFuture(f=>f.slice(1)); setHistory(h=>[...h, slots]); setSlots(nxt);} }}
                  disabled={!future.length}
                  className="bg-gradient-to-b from-yellow-300 to-yellow-500 hover:from-yellow-400 hover:to-yellow-600 active:from-yellow-600 active:to-yellow-700 text-gray-900 border-3 border-yellow-600 hover:border-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-600 disabled:border-gray-500 font-bold shadow-[0_4px_6px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_12px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:scale-105 active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-0 active:scale-100 text-base px-5 py-2 rounded-lg cursor-pointer"
                >
                  ↷ Redo
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📁</div>
                <Select value={projectFilter || 'all'} onValueChange={(val) => setProjectFilter(val === 'all' ? '' : val)}>
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
                <Select value={resourceFilter || 'all'} onValueChange={(val) => setResourceFilter(val === 'all' ? '' : val)}>
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
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🏷️</div>
                <Select value={statusFilter} onValueChange={(v:any)=>setStatusFilter(v)}>
                  <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🎯 Alle</SelectItem>
                    <SelectItem value="planned">📝 Geplant</SelectItem>
                    <SelectItem value="confirmed">Bestätigt</SelectItem>
                    <SelectItem value="completed">🎉 Abgeschlossen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planning Board Card */}
        <Card className="tradetrackr-card shadow-xl border-2 border-gray-300">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 pt-4 pb-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Ressourcenplanung
              </div>
              <div className={`px-4 py-1 rounded-full text-sm font-semibold ${conflicts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>
                {conflicts.length > 0 ? `⚠️ ${conflicts.length} Konflikt${conflicts.length > 1 ? 'e' : ''}` : '✅ Keine Konflikte'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 overflow-visible">
            {renderBars()}
          </CardContent>
        </Card>
      </main>
    </div>
    {/* Eintrag Erstellen Dialog */}
    <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
      <DialogContent className="sm:max-w-3xl bg-white border-4 border-green-500 shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">➕</span>
            Neuen Eintrag erstellen
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📁 Projekt *
            </label>
            <Select value={quickCreateData.projectId} onValueChange={(val) => setQuickCreateData({...quickCreateData, projectId: val})}>
              <SelectTrigger className="border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                <SelectValue placeholder="Projekt wählen" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((proj: any) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {projectNames[proj.id] || 'Unbenanntes Projekt'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              👥 Mitarbeiter * (Mehrfachauswahl möglich) {employees.length === 0 && <span className="text-xs text-red-500">(Keine Mitarbeiter geladen)</span>}
            </label>
            <div className="border-2 border-gray-300 rounded-lg p-3 bg-white max-h-48 overflow-y-auto">
              {employees.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">Keine Mitarbeiter verfügbar</div>
              ) : (
                <div className="space-y-2">
                  {employees.map((emp: any) => {
                    const displayName = `${emp.vorname || ''} ${emp.nachname || ''}`.trim() || emp.displayName || emp.email || emp.uid;
                    const isSelected = quickCreateData.assigneeIds.includes(emp.uid);
                    
                    return (
                      <div
                        key={emp.uid}
                        onClick={() => {
                          if (isSelected) {
                            setQuickCreateData({
                              ...quickCreateData,
                              assigneeIds: quickCreateData.assigneeIds.filter(id => id !== emp.uid)
                            });
                          } else {
                            setQuickCreateData({
                              ...quickCreateData,
                              assigneeIds: [...quickCreateData.assigneeIds, emp.uid]
                            });
                          }
                        }}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-green-100 border-2 border-green-500' 
                            : 'bg-gray-50 border-2 border-transparent hover:bg-green-50 hover:border-green-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-green-500 border-green-500' 
                            : 'bg-white border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-700">
                          {displayName} {emp.mitarbeiterID ? `(${emp.mitarbeiterID})` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {quickCreateData.assigneeIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {quickCreateData.assigneeIds.map(uid => {
                  const emp = employees.find(e => e.uid === uid);
                  const displayName = emp ? (`${emp.vorname || ''} ${emp.nachname || ''}`.trim() || emp.displayName || emp.email) : uid;
                  return (
                    <span key={uid} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {displayName}
                      <button
                        onClick={() => setQuickCreateData({
                          ...quickCreateData,
                          assigneeIds: quickCreateData.assigneeIds.filter(id => id !== uid)
                        })}
                        className="ml-1 text-green-500 hover:text-green-700 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📅 Start-Datum *
            </label>
            <Input 
              type="date"
              value={quickCreateData.startDate} 
              onChange={e => setQuickCreateData({...quickCreateData, startDate: e.target.value})} 
              className="border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              ⏰ Start-Zeit *
            </label>
            <TimePicker
              value={quickCreateData.startTime}
              onChange={(val) => setQuickCreateData({...quickCreateData, startTime: val})}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📅 End-Datum *
            </label>
            <Input 
              type="date"
              value={quickCreateData.endDate} 
              onChange={e => setQuickCreateData({...quickCreateData, endDate: e.target.value})} 
              className="border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              ⏰ End-Zeit *
            </label>
            <TimePicker
              value={quickCreateData.endTime}
              onChange={(val) => setQuickCreateData({...quickCreateData, endTime: val})}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              🎨 Farbe
            </label>
            <Input 
              type="color" 
              value={quickCreateData.color} 
              onChange={e => setQuickCreateData({...quickCreateData, color: e.target.value})} 
              className="h-10 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📝 Notiz
            </label>
            <div className="flex gap-2">
              <Select 
                value="custom" 
                onValueChange={(val) => {
                  if (val !== 'custom') {
                    setQuickCreateData({...quickCreateData, note: val});
                  }
                }}
              >
                <SelectTrigger className="w-48 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                  <SelectValue placeholder="Vorlage wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">✏️ Eigene Eingabe</SelectItem>
                  <SelectItem value="Installation">🔧 Installation</SelectItem>
                  <SelectItem value="Wartung">⚙️ Wartung</SelectItem>
                  <SelectItem value="Reparatur">🛠️ Reparatur</SelectItem>
                  <SelectItem value="Inspektion">🔍 Inspektion</SelectItem>
                  <SelectItem value="Montage">🏗️ Montage</SelectItem>
                  <SelectItem value="Demontage">📦 Demontage</SelectItem>
                  <SelectItem value="Planung">📋 Planung</SelectItem>
                  <SelectItem value="Beratung">💬 Beratung</SelectItem>
                  <SelectItem value="Schulung">🎓 Schulung</SelectItem>
                  <SelectItem value="Dokumentation">📄 Dokumentation</SelectItem>
                  <SelectItem value="Qualitätskontrolle">✅ Qualitätskontrolle</SelectItem>
                  <SelectItem value="Nachbesserung">🔄 Nachbesserung</SelectItem>
                  <SelectItem value="Kundentermin">👥 Kundentermin</SelectItem>
                  <SelectItem value="Materialbeschaffung">📦 Materialbeschaffung</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                value={quickCreateData.note} 
                onChange={e => setQuickCreateData({...quickCreateData, note: e.target.value})} 
                placeholder="Notiz eingeben oder Vorlage wählen" 
                className="flex-1 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={() => setQuickCreateOpen(false)}
            className="border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 transition-all"
          >
            ❌ Abbrechen
          </Button>
          <Button 
            onClick={saveQuickCreate}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            ✅ Anlegen
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Eintrag Bearbeiten Dialog */}
    <Dialog open={editSlotOpen} onOpenChange={setEditSlotOpen}>
      <DialogContent className="sm:max-w-3xl bg-white border-4 border-blue-500 shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">✏️</span>
            Eintrag bearbeiten
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📁 Projekt *
            </label>
            <Select value={editSlotData.projectId} onValueChange={(val) => setEditSlotData({...editSlotData, projectId: val})}>
              <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <SelectValue placeholder="Projekt wählen" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((proj: any) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {projectNames[proj.id] || 'Unbenanntes Projekt'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              👥 Zugewiesener Mitarbeiter *
            </label>
            <Select 
              value={editSlotData.assigneeIds[0] || ''} 
              onValueChange={(val) => setEditSlotData({...editSlotData, assigneeIds: [val]})}
            >
              <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <SelectValue placeholder={employees.length > 0 ? "Mitarbeiter wählen" : "Keine Mitarbeiter verfügbar"} />
              </SelectTrigger>
              <SelectContent>
                {employees.length === 0 ? (
                  <SelectItem value="none" disabled>Keine Mitarbeiter verfügbar</SelectItem>
                ) : (
                  employees.map((emp: any) => {
                    const displayName = `${emp.vorname || ''} ${emp.nachname || ''}`.trim() || emp.displayName || emp.email || emp.uid;
                    return (
                      <SelectItem key={emp.uid} value={emp.uid}>
                        {displayName} {emp.mitarbeiterID ? `(${emp.mitarbeiterID})` : ''}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📅 Start-Datum *
            </label>
            <Input 
              type="date"
              value={editSlotData.startDate} 
              onChange={e => setEditSlotData({...editSlotData, startDate: e.target.value})} 
              className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              ⏰ Start-Zeit *
            </label>
            <TimePicker
              value={editSlotData.startTime}
              onChange={(val) => setEditSlotData({...editSlotData, startTime: val})}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📅 End-Datum *
            </label>
            <Input 
              type="date"
              value={editSlotData.endDate} 
              onChange={e => setEditSlotData({...editSlotData, endDate: e.target.value})} 
              className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              ⏰ End-Zeit *
            </label>
            <TimePicker
              value={editSlotData.endTime}
              onChange={(val) => setEditSlotData({...editSlotData, endTime: val})}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              🎨 Farbe
            </label>
            <Input 
              type="color" 
              value={editSlotData.color} 
              onChange={e => setEditSlotData({...editSlotData, color: e.target.value})} 
              className="h-10 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              📝 Notiz
            </label>
            <div className="flex gap-2">
              <Select 
                value="custom" 
                onValueChange={(val) => {
                  if (val !== 'custom') {
                    setEditSlotData({...editSlotData, note: val});
                  }
                }}
              >
                <SelectTrigger className="w-48 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder="Vorlage wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">✏️ Eigene Eingabe</SelectItem>
                  <SelectItem value="Installation">🔧 Installation</SelectItem>
                  <SelectItem value="Wartung">⚙️ Wartung</SelectItem>
                  <SelectItem value="Reparatur">🛠️ Reparatur</SelectItem>
                  <SelectItem value="Inspektion">🔍 Inspektion</SelectItem>
                  <SelectItem value="Montage">🏗️ Montage</SelectItem>
                  <SelectItem value="Demontage">📦 Demontage</SelectItem>
                  <SelectItem value="Planung">📋 Planung</SelectItem>
                  <SelectItem value="Beratung">💬 Beratung</SelectItem>
                  <SelectItem value="Schulung">🎓 Schulung</SelectItem>
                  <SelectItem value="Dokumentation">📄 Dokumentation</SelectItem>
                  <SelectItem value="Qualitätskontrolle">✅ Qualitätskontrolle</SelectItem>
                  <SelectItem value="Nachbesserung">🔄 Nachbesserung</SelectItem>
                  <SelectItem value="Kundentermin">👥 Kundentermin</SelectItem>
                  <SelectItem value="Materialbeschaffung">📦 Materialbeschaffung</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                value={editSlotData.note} 
                onChange={e => setEditSlotData({...editSlotData, note: e.target.value})} 
                placeholder="Notiz eingeben oder Vorlage wählen" 
                className="flex-1 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-between">
          <Button 
            onClick={deleteEditSlot}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            🗑️ Löschen
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setEditSlotOpen(false)}
              className="border-2 border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-all"
            >
              ❌ Abbrechen
            </Button>
            <Button 
              onClick={saveEditSlot}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              ✅ Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Quick Action Sidebar */}
  </>);
};

export default SchedulingBoard;


