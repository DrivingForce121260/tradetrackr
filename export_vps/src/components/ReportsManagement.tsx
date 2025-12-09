import React, { useState, useEffect, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, Plus, Eye, CheckCircle, XCircle, Search, Download, Package, 
  TableIcon, User, Building, MapPin, Hash, Database, Calendar, Clock, 
  Filter, X, EyeOff, BarChart3, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Printer, RefreshCw, Check, Calculator,
  Building2, FolderOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from './AppHeader';
import type { Report, WorkLine } from '@/services/firestoreService';

import { reportService, userService, projectService } from '@/services/firestoreService';
import { cacheService } from '@/services/cacheService';
import { useToast } from '@/hooks/use-toast';
import AutoCompleteInput from './AutoCompleteInput';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { CSVDataTable } from './CSVDataTable';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useResponsiveViewMode } from '@/hooks/use-responsive-view-mode';
import { cn } from '@/lib/utils';

// Use consistent types from the types directory
import ReportsStats from './ReportsStats';
import AufmassDialog from './aufmass/AufmassDialog';
import type { GenerateAufmassResponse } from '@/types/aufmass';

interface ReportsManagementProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const ReportsManagement: React.FC<ReportsManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();

  const { toast } = useToast();

  // Funktion zum Extrahieren der Standort-Information aus den Rohdaten basierend auf dem Berichtsdatum
  const getLocationFromRawData = (report: Report): string => {
    try {
      // Prüfe ob reportData vorhanden ist
      if (!report.reportData) {
        return report.workLocation || 'Nicht verfügbar';
      }

      // Parse CSV-Daten
      const lines = report.reportData.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        return report.workLocation || 'Nicht verfügbar';
      }

      // Hole die letzte Zeile (letzte Arbeitszeile)
      const lastLine = lines[lines.length - 1];
      const columns = lastLine.split(',').map(col => col.trim().replace(/"/g, ''));

      // Bestimme das Berichtsdatum - verwende die ursprüngliche Parsing-Logik
      const dateString = report.reportDate || report.workDate;
      let reportDate: Date;
      
      // Verwende die gleiche Datum-Parsing-Logik wie im ursprünglichen Code
      if (dateString.includes('/')) {
        // Deutsches Format DD/MM/YYYY parsen
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Monate sind 0-basiert
          const year = parseInt(parts[2], 10);
          reportDate = new Date(year, month, day);
        } else {
          reportDate = new Date(dateString);
        }
      } else {
        reportDate = new Date(dateString);
      }
      
      // Verwende das gleiche Cutoff-Datum wie im ursprünglichen Code
      const cutoffDate = new Date('2025-08-15');
      
      // Wähle die richtige Position basierend auf dem Datum
      const positionIndex = reportDate >= cutoffDate ? 6 : 10; // 0-basiert, also Position 7 = Index 6, Position 11 = Index 10

      // Extrahiere den Standort aus der entsprechenden Position
      const location = columns[positionIndex] || 'Nicht verfügbar';

      return location;
    } catch (error) {
      console.warn('Fehler beim Extrahieren der Standort-Information:', error);
      return report.workLocation || 'Nicht verfügbar';
    }
  };
  
  // State variables
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Array<{id: string, projectNumber: string, name: string, customerName: string}>>([]);
  const [employees, setEmployees] = useState<any[]>([]); // NEW: All employees from users collection
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // NEW: Track if user has searched
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>(''); // Changed back to single string
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Auto-load reports when date range is selected
  useEffect(() => {
    if ((dateFrom || dateTo) && !isLoadingReports && !hasSearched) {
      console.log('📅 Date range selected, auto-loading reports...');
      loadReportsManually();
    }
  }, [dateFrom, dateTo]);
  const [viewMode, setViewMode, isMobile] = useResponsiveViewMode('table');
  const [showStatistics, setShowStatistics] = useState(false);
  
  // Infinite scroll state
  const [displayedReportsCount, setDisplayedReportsCount] = useState(20);
  const itemsPerPage = 20;
  
  // Tablet layout
  const { isTablet, isTwoColumn } = useTabletLayout();
  
  // Pull-to-refresh
  const handleRefresh = async () => {
    setIsLoadingReports(true);
    try {
      await loadReportsManually();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };
  
  const { isRefreshing, pullDistance, canRefresh, containerProps } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: isMobile,
  });
  const [sortBy, setSortBy] = useState<string>('workDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [showCSVData, setShowCSVData] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showProjectSummary, setShowProjectSummary] = useState(false);
  const [selectedProjectForSummary, setSelectedProjectForSummary] = useState<string>('all');
  const [showAufmassDialog, setShowAufmassDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    customer: '',
    projectNumber: '',
    workLocation: '',
    workDate: new Date().toISOString().split('T')[0],
    totalHours: 8,
    workDescription: '',
    mitarbeiterID: user?.uid || '',
    projectReportNumber: '',
    reportData: '',
    reportDate: new Date().toISOString().split('T')[0],
    signatureReference: '',
    stadt: '',
    concernID: (user as any)?.concernID || '',
    activeprojectName: '',
    location: '',
    workLines: [] as WorkLine[],
    // Neue Felder für das aktualisierte Formular
    reportNumber: '',
    employee: '',
    gewerk: ''
  });

  // Check permissions
  const canViewReports = hasPermission('view_reports') || hasPermission('view_own_reports') || hasPermission('create_report');
  const canManageReports = hasPermission('create_report') || hasPermission('edit_report') || hasPermission('delete_report') || user?.role === 'auftraggeber';
  const canApproveRejectReports = hasPermission('approve_report') || hasPermission('reject_report') || user?.role === 'admin' || user?.role === 'manager';
  
  // Debug permissions
  console.log('ðŸ" User permissions:', {
    user: user?.email,
    role: user?.role,
    canViewReports,
    canManageReports,
    canApproveRejectReports,
    hasPermission: {
      view_reports: hasPermission('view_reports'),
      view_own_reports: hasPermission('view_own_reports'),
      create_report: hasPermission('create_report'),
      edit_report: hasPermission('edit_report'),
      delete_report: hasPermission('delete_report'),
      approve_report: hasPermission('approve_report'),
      reject_report: hasPermission('reject_report')
    }
  });

  // Load projects function
  const loadProjects = async () => {
    if (!user?.concernID) return;
    
    setIsLoadingProjects(true);
    try {
      const projectsData = await projectService.getAll(user.concernID);
      const formattedProjects = projectsData.map(project => ({
        id: project.uid || '',
        projectNumber: String(project.projectNumber || ''),
        name: String((project as any).title || (project as any).name || project.projectNumber || ''),
        customerName: (project as any).customerName || (project as any).client || 'Unbekannt'
      }));
      
      console.log('📋 [PROJECTS LOADED]', {
        rawProjects: projectsData.slice(0, 3),
        formattedProjects: formattedProjects.slice(0, 3),
        totalProjects: formattedProjects.length,
        sampleProjectNumbers: formattedProjects.slice(0, 5).map(p => ({
          id: p.id,
          projectNumber: p.projectNumber,
          type: typeof p.projectNumber,
          length: p.projectNumber ? String(p.projectNumber).length : 0
        }))
      });
      
      setProjects(formattedProjects);
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
      toast({
        title: 'Fehler',
        description: 'Projekte konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Load projects
  useEffect(() => {
    if (user?.concernID) {
      loadProjects();
    }
  }, [user?.concernID]);

  // Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      if (!user?.concernID) return;
      
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');
        
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('concernID', '==', user.concernID));
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          uid: doc.id,
          ...doc.data()
        }));
        setEmployees(usersList);
        console.log('👥 Loaded employees:', usersList.length);
      } catch (error) {
        console.error('Error loading employees:', error);
      }
    };
    
    loadEmployees();
  }, [user?.concernID]);

  // Load customers for autocomplete
  const [customers, setCustomers] = useState<Array<{id: string, name: string, companyName?: string, email?: string, phone?: string}>>([]);
  
  useEffect(() => {
    const loadCustomers = () => {
      const savedCustomers = localStorage.getItem('customers');
      if (savedCustomers) {
        try {
          const parsedCustomers = JSON.parse(savedCustomers);
          setCustomers(parsedCustomers);
        } catch (error) {
          console.error('Error loading customers:', error);
        }
      }
    };
    loadCustomers();
  }, []);

  // Autocomplete hooks - must be after state declarations
  const customerAutocomplete = useAutocomplete({
    data: customers,
    getLabel: (c) => c.name || c.companyName || '',
    getValue: (c) => c.name || c.companyName || '',
    getDescription: (c) => c.email ? `📧 ${c.email}` : c.phone ? `📞 ${c.phone}` : '',
    storageKey: 'report_customer',
    maxRecentItems: 5,
  });

  const projectAutocomplete = useAutocomplete({
    data: projects,
    getLabel: (p) => `${p.projectNumber || ''} - ${p.name || ''}`,
    getValue: (p) => p.projectNumber || '',
    getDescription: (p) => p.customerName ? `👤 ${p.customerName}` : '',
    storageKey: 'report_project',
    maxRecentItems: 5,
  });

  // Manual load function (not automatic)
  const loadReportsManually = async () => {
    try {
      setIsLoadingReports(true);
      setHasSearched(true);
      
      // Load reports from Firestore if user has concernID
      if ((user as any)?.concernID) {
          // Prüfe ob es ein neuer Login ist (andere User-ID als zuvor)
          const lastUserId = localStorage.getItem('lastUserId');
          const currentUserId = (user as any)?.uid;
          
          if (lastUserId && lastUserId !== currentUserId) {

            localStorage.removeItem('users');
            localStorage.removeItem('projects');
            localStorage.removeItem('lastDataLoadTime');
          }
          
          // Aktuelle User-ID speichern
          localStorage.setItem('lastUserId', currentUserId);
          try {
            console.log('ðŸ" Loading reports from Firestore for concern:', (user as any).concernID);
            
            // ZUERST: Lokale Daten laden/aktualisieren

            const { users, projects } = await loadLocalData();
            
            // DANN: Berichte aus Firestore laden (mit Cache)
            const firestoreReports = await reportService.getReportsByConcern((user as any).concernID);

            
            if (firestoreReports && firestoreReports.length > 0) {
              // SCHRITT 1: Verwende die 8 Hauptfelder aus Firestore korrekt
              
              console.log('📊 [REPORTS LOADED] Sample project numbers:', 
                firestoreReports.slice(0, 5).map(r => ({
                  id: r.id,
                  projectNumber: r.projectNumber,
                  type: typeof r.projectNumber,
                  length: r.projectNumber ? String(r.projectNumber).length : 0
                }))
              );
              
              const processedReports = firestoreReports.map(report => {

                console.log('ðŸ" [Step 1] Firestore fields:', {
                  concernID: report.concernID,
                  mitarbeiterID: report.mitarbeiterID,
                  projectNumber: report.projectNumber,
                  reportDate: report.reportDate,
                  reportNumber: report.reportNumber,
                  location: report.location,
                  gewerk: report.activeprojectName,
                  reportData: report.reportData ? 'Present' : 'Missing'
                });

                // SCHRITT 2: Lokale Datenverknüpfung


                // Debug: öberprüfe verfügbare lokale Daten
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const projects = JSON.parse(localStorage.getItem('projects') || '[]');
                
                console.log('ðŸ" [Step 2] Available local data:', {
                  usersCount: users.length,
                  projectsCount: projects.length,
                  usersSample: users.slice(0, 2).map((u: any) => ({ uid: u.uid, vorname: u.vorname, nachname: u.nachname })),
                  projectsSample: projects.slice(0, 2).map((p: any) => ({ projectNumber: p.projectNumber, customerName: p.customerName }))
                });

                // 1. Mitarbeitername aus lokaler Datenbank extrahieren (basierend auf mitarbeiterID)
                let employeeName = 'Unbekannt';
                if (report.mitarbeiterID) {
                  try {

                    console.log('ðŸ" [Step 2] Available user IDs:', users.map((u: any) => u.uid));
                    
                    // Suche nach Mitarbeiter mit verschiedenen ID-Formaten
                    let employee = users.find((u: any) => u.uid === report.mitarbeiterID);
                    
                    // Fallback: Suche nach anderen ID-Feldern
                    if (!employee) {
                      employee = users.find((u: any) => u.id === report.mitarbeiterID);
                    }
                    if (!employee) {
                      employee = users.find((u: any) => u.mitarbeiterID === report.mitarbeiterID);
                    }
                    
                    if (employee) {
                      employeeName = `${employee.vorname || employee.firstName || ''} ${employee.nachname || employee.lastName || ''}`.trim() || 'Unbekannt';

                    } else {





                    }
                  } catch (error) {

                  }
                } else {

                }

                // 2. Kundeninformationen aus lokaler Datenbank extrahieren (basierend auf projectNumber)
                let customerName = 'Unbekannt';
                if (report.projectNumber) {
                  try {

                    console.log('ðŸ" [Step 2] Available projects:', projects.map((p: any) => ({
                      id: p.id,
                      projectNumber: p.projectNumber,
                      projectId: p.projectId,
                      customerName: p.customerName,
                      client: p.client,
                      customer: p.customer
                    })));
                    
                    // Suche nach Projekt mit verschiedenen Nummer-Formaten
                    let project = projects.find((p: any) => p.projectNumber === report.projectNumber);
                    
                    // Fallback: Suche nach anderen Nummer-Feldern
                    if (!project) {
                      project = projects.find((p: any) => p.id === report.projectNumber);
                    }
                    if (!project) {
                      project = projects.find((p: any) => p.projectId === report.projectNumber);
                    }
                    
                    // Fallback: Suche mit String-Vergleich (für verschiedene Datentypen)
                    if (!project) {
                      project = projects.find((p: any) => String(p.projectNumber) === String(report.projectNumber));
                    }
                    if (!project) {
                      project = projects.find((p: any) => String(p.id) === String(report.projectNumber));
                    }
                    if (!project) {
                      project = projects.find((p: any) => String(p.projectId) === String(report.projectNumber));
                    }
                    
                    if (project) {
                      customerName = project.customerName || project.client || project.customer || 'Unbekannt';

                    } else {





                    }
                  } catch (error) {

                  }
                } else {

                }

                console.log('ðŸ" [Step 2] Local data linking completed:', {
                  mitarbeiterID: report.mitarbeiterID,
                  employeeName,
                  projectNumber: report.projectNumber,
                  customerName
                });

                // Verwende die 8 Hauptfelder aus Firestore direkt + lokale Datenverknüpfung
                const processedReport = {
                  ...report,
                  // Firestore-Felder (8 Hauptfelder) - direkt verwenden
                  reportNumber: report.reportNumber || report.projectReportNumber || report.id || 'Nicht verfügbar',
                  employee: employeeName, // Jetzt aus lokaler Datenbank
                  customer: customerName, // Jetzt aus lokaler Datenbank
                  projectNumber: report.projectNumber || 'Nicht verfügbar',
                  workLocation: report.location || 'Nicht verfügbar',
                  workDate: report.reportDate || 'Nicht verfügbar', // reportDate = workDate
                  totalHours: 0, // Wird in Schritt 4 hinzugefügt
                  workDescription: report.reportData || 'Nicht verfügbar',
                  
                  // Zusö¤tzliche Felder aus Firestore
                  mitarbeiterID: report.mitarbeiterID || 'Nicht verfügbar',
                  reportDate: report.reportDate || 'Nicht verfügbar',
                  gewerk: report.activeprojectName || 'Nicht verfügbar',
                  workLines: [] // Wird in Schritt 4 hinzugefügt
                };

                console.log('ðŸ" [Step 1+2] Processed report with local data:', {
                  id: processedReport.id,
                  concernID: processedReport.concernID,
                  mitarbeiterID: processedReport.mitarbeiterID,
                  employee: processedReport.employee,
                  projectNumber: processedReport.projectNumber,
                  customer: processedReport.customer,
                  workDate: processedReport.workDate
                });

                return processedReport;
              });
              
                              setReports(processedReports);

                
                // Debug: Check specific report pgH8Uh5IE5o1IaTgMt45
                const debugReport = processedReports.find(r => r.id === 'pgH8Uh5IE5o1IaTgMt45');
              if (debugReport) {
                console.log('ðŸ" [DEBUG] pgH8Uh5IE5o1IaTgMt45 report data:', {
                  id: debugReport.id,
                  projectNumber: debugReport.projectNumber,
                  reportNumber: debugReport.reportNumber,
                  employee: debugReport.employee,
                  customer: debugReport.customer,
                  workLocation: debugReport.workLocation,
                  workDate: debugReport.workDate,
                  reportDate: debugReport.reportDate,
                  mitarbeiterID: debugReport.mitarbeiterID,
                  activeprojectName: debugReport.activeprojectName,
                  totalHours: debugReport.totalHours,
                  workLinesCount: debugReport.workLines?.length || 0
                });
              }
            } else {

              setReports([]);
            }
          } catch (error) {

            setReports([]);
          }
        } else {

          setReports([]);
        }
      } catch (error) {

        setReports([]);
      } finally {
        setIsLoadingReports(false);
      }
  };

  // Browser-Neustart erkennen und lokale Daten löschen
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Setze einen Marker, dass der Browser geschlossen wird
      sessionStorage.setItem('browserClosing', 'true');
    };

    const handleLoad = () => {
      // Prüfe ob der Browser neu gestartet wurde
      const wasClosing = sessionStorage.getItem('browserClosing');
      if (wasClosing) {

        localStorage.removeItem('users');
        localStorage.removeItem('projects');
        localStorage.removeItem('lastDataLoadTime');
        sessionStorage.removeItem('browserClosing');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  // Funktion zum Laden der lokalen Daten (Users und Projects)
  const loadLocalData = async (forceReload = false) => {

    
    try {
      if (!user?.concernID) {

        return { users: [], projects: [] };
      }

      // Prüfe ob lokale Daten bereits vorhanden sind
      const existingUsers = localStorage.getItem('users');
      const existingProjects = localStorage.getItem('projects');
      const lastLoadTime = localStorage.getItem('lastDataLoadTime');
      
      // Wenn lokale Daten vorhanden sind und kein erzwungenes Neuladen, verwende diese
      if (!forceReload && existingUsers && existingProjects && lastLoadTime) {
        const timeSinceLastLoad = Date.now() - parseInt(lastLoadTime);
        const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden
        
        if (timeSinceLastLoad < maxAge) {
          console.log('ðŸ" Verwende vorhandene lokale Daten (geladen vor', Math.round(timeSinceLastLoad / 1000 / 60), 'Minuten)');
          const users = JSON.parse(existingUsers);
          const projects = JSON.parse(existingProjects);
          return { users, projects };
        } else {
          console.log('ðŸ" Lokale Daten sind veraltet (ölter als 24 Stunden), lade neu von Firestore');
        }
      }

      // Wenn keine lokalen Daten vorhanden oder veraltet, lade von Firestore

      const users = await userService.getAll(user.concernID);

      
      const projects = await projectService.getAll(user.concernID);

      
      // In localStorage speichern für zukünftige Verwendung
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('projects', JSON.stringify(projects));
      localStorage.setItem('lastDataLoadTime', Date.now().toString());
      

      
      return { users, projects };
    } catch (error) {

      
      // Fallback: Versuche vorhandene lokale Daten zu verwenden
      try {
        const existingUsers = localStorage.getItem('users');
        const existingProjects = localStorage.getItem('projects');
        
        if (existingUsers && existingProjects) {

          const users = JSON.parse(existingUsers);
          const projects = JSON.parse(existingProjects);
          return { users, projects };
        }
      } catch (fallbackError) {

      }
      
      return { users: [], projects: [] };
    }
  };



  // Funktion zum manuellen Neuladen der Berichte
  const reloadReports = async () => {

    setIsLoadingReports(true);
    
    try {
      if (!user?.concernID) {

        return;
      }

      // ZUERST: Lokale Daten laden/aktualisieren

      const { users, projects } = await loadLocalData();
      
      // DANN: Berichte aus Firestore neu laden
      const firestoreReports = await reportService.getReportsByConcern(user.concernID);

      
      if (firestoreReports && firestoreReports.length > 0) {
        // SCHRITT 1: Verwende die 8 Hauptfelder aus Firestore korrekt

        
        const processedReports = firestoreReports.map(report => {

          console.log('ðŸ" [Step 1] Firestore fields:', {
            concernID: report.concernID,
            mitarbeiterID: report.mitarbeiterID,
            projectNumber: report.projectNumber,
            reportDate: report.reportDate,
            reportNumber: report.reportNumber,
            location: report.location,
            gewerk: report.activeprojectName,
            reportData: report.reportData ? 'Present' : 'Missing'
          });

          // SCHRITT 2: Lokale Datenverknüpfung


          // 1. Mitarbeitername aus lokaler Datenbank extrahieren (basierend auf mitarbeiterID)
          let employeeName = 'Unbekannt';
          if (report.mitarbeiterID) {
            try {
              const users = JSON.parse(localStorage.getItem('users') || '[]');
              
              // Suche nach Mitarbeiter mit verschiedenen ID-Formaten
              let employee = users.find((u: any) => u.uid === report.mitarbeiterID);
              
              // Fallback: Suche nach anderen ID-Feldern
              if (!employee) {
                employee = users.find((u: any) => u.id === report.mitarbeiterID);
              }
              if (!employee) {
                employee = users.find((u: any) => u.mitarbeiterID === report.mitarbeiterID);
              }
              
              if (employee) {
                employeeName = `${employee.vorname || employee.firstName || ''} ${employee.nachname || employee.lastName || ''}`.trim() || 'Unbekannt';

              } else {

              }
            } catch (error) {

            }
          }

          // 2. Kundeninformationen aus lokaler Datenbank extrahieren (basierend auf projectNumber)
          let customerName = 'Unbekannt';
          if (report.projectNumber) {
            try {
              const projects = JSON.parse(localStorage.getItem('projects') || '[]');

              console.log('ðŸ" [Step 2] Available projects from localStorage:', projects.map((p: any) => ({
                id: p.id,
                projectNumber: p.projectNumber,
                projectId: p.projectId,
                customerName: p.customerName,
                client: p.client,
                customer: p.customer
              })));
              
              // Suche nach Projekt mit verschiedenen Nummer-Formaten
              let project = projects.find((p: any) => p.projectNumber === report.projectNumber);
              
              // Fallback: Suche nach anderen Nummer-Feldern
              if (!project) {
                project = projects.find((p: any) => p.id === report.projectNumber);
              }
              if (!project) {
                project = projects.find((p: any) => p.projectId === report.projectNumber);
              }
              
              // Fallback: Suche mit String-Vergleich (für verschiedene Datentypen)
              if (!project) {
                project = projects.find((p: any) => String(p.projectNumber) === String(report.projectNumber));
              }
              if (!project) {
                project = projects.find((p: any) => String(p.id) === String(report.projectNumber));
              }
              if (!project) {
                project = projects.find((p: any) => String(p.projectId) === String(report.projectNumber));
              }
              
              if (project) {
                customerName = project.customerName || project.client || project.customer || 'Unbekannt';

              } else {

                
                // Spezielle Debugging-Info für Projekt 270289
                if (String(report.projectNumber) === '270289') {




                  
                  // Suche nach verschiedenen Varianten
                  const exactMatch = projects.find((p: any) => p.projectNumber === '270289');
                  const exactMatchNum = projects.find((p: any) => p.projectNumber === 270289);
                  const idMatch = projects.find((p: any) => p.id === '270289');
                  const idMatchNum = projects.find((p: any) => p.id === 270289);
                  




                }
              }
            } catch (error) {

            }
          }

          console.log('ðŸ" [Step 2] Local data linking completed:', {
            mitarbeiterID: report.mitarbeiterID,
            employeeName,
            projectNumber: report.projectNumber,
            customerName
          });

          // Verwende die 8 Hauptfelder aus Firestore direkt + lokale Datenverknüpfung
          const processedReport = {
            ...report,
            // Firestore-Felder (8 Hauptfelder) - direkt verwenden
            reportNumber: report.reportNumber || report.projectReportNumber || report.id || 'Nicht verfügbar',
            employee: employeeName, // Jetzt aus lokaler Datenbank
            customer: customerName, // Jetzt aus lokaler Datenbank
            projectNumber: report.projectNumber || 'Nicht verfügbar',
            workLocation: report.location || 'Nicht verfügbar',
            workDate: report.reportDate || 'Nicht verfügbar', // reportDate = workDate
            totalHours: 0, // Wird in Schritt 4 hinzugefügt
            workDescription: report.reportData || 'Nicht verfügbar',
            
            // Zusö¤tzliche Felder aus Firestore
            mitarbeiterID: report.mitarbeiterID || 'Nicht verfügbar',
            reportDate: report.reportDate || 'Nicht verfügbar',
            gewerk: report.activeprojectName || 'Nicht verfügbar',
            workLines: [] // Wird in Schritt 4 hinzugefügt
          };

          console.log('ðŸ" [Step 1+2] Processed report with local data:', {
            id: processedReport.id,
            concernID: processedReport.concernID,
            mitarbeiterID: processedReport.mitarbeiterID,
            employee: processedReport.employee,
            projectNumber: processedReport.projectNumber,
            customer: processedReport.customer,
            workDate: processedReport.workDate
          });

          return processedReport;
        });
        
        setReports(processedReports);

        
        toast({
          title: 'Berichte aktualisiert',
          description: `${processedReports.length} Berichte wurden erfolgreich neu geladen.`,
        });
      } else {

        setReports([]);
        toast({
          title: 'Keine Berichte gefunden',
          description: 'Es wurden keine Berichte in der Datenbank gefunden.',
        });
      }
    } catch (error) {

      toast({
        title: 'Fehler',
        description: 'Fehler beim Neuladen der Berichte aus der Datenbank.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Funktion zum Erstellen einer Projekt-Zusammenfassung
  const createProjectSummary = (projectNumber: string) => {
    const projectReports = reports.filter(report => 
      String(report.projectNumber || '').trim() === String(projectNumber).trim()
    );
    
    if (projectReports.length === 0) {
      toast({
        title: 'Keine Berichte gefunden',
        description: `Für das Projekt ${projectNumber} wurden keine Berichte gefunden.`,
        variant: 'destructive',
      });
      return null;
    }

    // Projekt-Informationen finden
    const project = projects.find(p => String(p.projectNumber).trim() === String(projectNumber).trim());
    
    // Statistiken berechnen
    const totalReports = projectReports.length;
    const totalHours = projectReports.reduce((sum, report) => sum + (report.totalHours || 0), 0);
    const pendingReports = projectReports.filter(r => r.status === 'pending').length;
    const approvedReports = projectReports.filter(r => r.status === 'approved').length;
    const rejectedReports = projectReports.filter(r => r.status === 'rejected').length;
    
    // Mitarbeiter-Statistiken
    const employeeStats = projectReports.reduce((acc, report) => {
      const employee = report.employee || 'Unbekannt';
      if (!acc[employee]) {
        acc[employee] = { hours: 0, reports: 0 };
      }
      acc[employee].hours += report.totalHours || 0;
      acc[employee].reports += 1;
      return acc;
    }, {} as Record<string, { hours: number, reports: number }>);

    // Monats-Statistiken
    const monthlyStats = projectReports.reduce((acc, report) => {
      const date = new Date(report.workDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) {
        acc[monthKey] = { hours: 0, reports: 0 };
      }
      acc[monthKey].hours += report.totalHours || 0;
      acc[monthKey].reports += 1;
      return acc;
    }, {} as Record<string, { hours: number, reports: number }>);

    // Excel-ähnliche Tabelle: Komponenten nach Räumen gruppiert
    const componentMatrix = createComponentMatrix(projectReports);
    
    console.log(`🔍 [Summary] Projekt-Zusammenfassung für ${projectNumber}:`, {
      totalReports,
      componentMatrix: {
        rooms: componentMatrix.rooms,
        components: componentMatrix.components,
        dataSize: componentMatrix.data.size
      }
    });
    
    // Debug: Zeige die ersten paar Komponenten und deren Daten
    console.log(`🔍 [Summary] Erste 3 Komponenten:`, componentMatrix.components.slice(0, 3));
    componentMatrix.components.slice(0, 3).forEach(component => {
      const componentData = componentMatrix.data.get(component);
      console.log(`🔍 [Summary] Komponente "${component}":`, componentData);
    });

    return {
      projectNumber,
      projectName: project?.name || projectNumber,
      customerName: project?.customerName || 'Unbekannt',
      totalReports,
      totalHours,
      pendingReports,
      approvedReports,
      rejectedReports,
      employeeStats,
      monthlyStats,
      componentMatrix,
      reports: projectReports
    };
  };

  // Funktion zum Erstellen der Komponenten-Matrix (Excel-ähnliche Tabelle)
  const createComponentMatrix = (projectReports: Report[]) => {
    console.log(`🚀 [Matrix] NEUE FUNKTION WIRD AUFGERUFEN!`);
    console.log(`🔍 [Matrix] Starte Matrix-Erstellung für ${projectReports.length} Berichte`);
    
    // Filter: Alle Berichte berücksichtigen (kein Datumsfilter)
    console.log(`🔍 [Matrix] Kein Datumsfilter - alle Berichte werden berücksichtigt`);
    
    // Funktion zum Parsen deutscher Datumsformate
    const parseGermanDate = (dateString: string): Date | null => {
      if (!dateString) return null;
      
      try {
        // Versuche zuerst das Standard-Format zu parsen
        const standardDate = new Date(dateString);
        if (!isNaN(standardDate.getTime())) {
          return standardDate;
        }
        
        // Deutsche Datumsformate parsen: "14/8/2025", "27/8/2025"
        const germanDateMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (germanDateMatch) {
          const [, day, month, year] = germanDateMatch;
          // JavaScript Monate sind 0-basiert (0-11), daher month - 1
          const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
        
        return null;
      } catch (error) {
        console.warn(`⚠️ [Matrix] Fehler beim Parsen des deutschen Datums "${dateString}":`, error);
        return null;
      }
    };
    
    // Debug: Zeige die ersten 3 Berichte und deren Datum
    projectReports.slice(0, 3).forEach((report, index) => {
      try {
        const reportDate = parseGermanDate(report.workDate || report.reportDate);
        const isValid = reportDate !== null;
        console.log(`🔍 [Matrix] Bericht ${index + 1}: workDate="${report.workDate}", reportDate="${report.reportDate}", parsed="${isValid ? reportDate!.toISOString() : 'INVALID'}", isValid=${isValid}`);
      } catch (error) {
        console.log(`🔍 [Matrix] Bericht ${index + 1}: Fehler beim Parsen des Datums: ${error}`);
      }
    });
    
    const filteredReports = projectReports.filter(report => {
      try {
        const reportDate = parseGermanDate(report.workDate || report.reportDate);
        const isValid = reportDate !== null;
        
        if (!isValid) {
          console.log(`⚠️ [Matrix] Ungültiges Datum für Bericht ${report.reportNumber || report.id}: ${report.workDate || report.reportDate}`);
        }
        
        return isValid; // Alle gültigen Berichte berücksichtigen
      } catch (error) {
        console.log(`⚠️ [Matrix] Fehler beim Verarbeiten des Berichts ${report.reportNumber || report.id}: ${error}`);
        return false;
      }
    });
    
    console.log(`🔍 [Matrix] Gefilterte Berichte: ${filteredReports.length} von ${projectReports.length} (alle gültigen Berichte)`);
    
    // Neue Matrix-Struktur: Standorte als Spalten, Komponenten als Zeilen
    const rooms = new Set<string>();
    const components = new Map<string, Map<string, { quantity: number, reports: string[] }>>();
    
    // Jeden Bericht einzeln verarbeiten
    filteredReports.forEach((report, reportIndex) => {
      try {
        console.log(`🔍 [Matrix] Verarbeite Bericht ${reportIndex + 1}: ${report.reportNumber || report.id}`);
        
        // Standort wird später aus der CSV extrahiert
        let standort = 'Allgemein'; // Standardwert
        
        // CSV-Daten des Berichts verarbeiten
        if (report.reportData && typeof report.reportData === 'string') {
          const csvLines = report.reportData.split('\n').filter(line => line.trim());
          console.log(`🔍 [Matrix] Bericht hat ${csvLines.length} CSV-Zeilen`);
          
          // Debug: Zeige die ersten 3 CSV-Zeilen
          if (csvLines.length > 0) {
            console.log(`🔍 [Matrix] Erste CSV-Zeile: "${csvLines[0]}"`);
            if (csvLines.length > 1) {
              console.log(`🔍 [Matrix] Zweite CSV-Zeile: "${csvLines[1]}"`);
            }
            if (csvLines.length > 2) {
              console.log(`🔍 [Matrix] Dritte CSV-Zeile: "${csvLines[2]}"`);
            }
          }
          
          // Zuerst den Standort aus der ersten Datenzeile extrahieren
          let berichtStandort = 'Allgemein';
          for (let i = 0; i < csvLines.length; i++) {
            const columns = csvLines[i].split(',').map(col => col.trim().replace(/"/g, ''));
            
            // Suche nach einer Zeile mit Standort-Daten (Spalte 10: location)
            if (columns.length >= 11 && columns[10] && columns[10] !== 'location' && columns[10] !== 'Location' && columns[10] !== '') {
              berichtStandort = columns[10].trim();
              console.log(`🔍 [Matrix] Standort für diesen Bericht gefunden: "${berichtStandort}"`);
              
              // Standort zur Spaltenliste hinzufügen
              if (berichtStandort && berichtStandort !== 'Allgemein' && berichtStandort !== '') {
                rooms.add(berichtStandort);
              }
              break; // Ersten gültigen Standort verwenden
            }
          }
          
          // Jetzt alle Zeilen mit dem gefundenen Standort verarbeiten
          csvLines.forEach((line, lineIndex) => {
            try {
              const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
              
              // Debug: Zeige die ersten 3 Zeilen
              if (lineIndex < 3) {
                console.log(`🔍 [Matrix] Zeile ${lineIndex}:`, columns);
              }
              
              // Komponente und Menge aus den CSV-Spalten extrahieren
              let component = '';
              let quantity = 0;
              
              // pgH8Uh5IE5o1IaTgMt45 Template Format:
              // linenumber,reportID,component,workDone,quantity,hours,dateCreated,text,zusatz,activeProject,location,dateCreated,UIDAB,mitarbeiterID,mitarbeiterName,activeprojectName,gewerk
              if (columns.length >= 5) {
                component = columns[2]; // Spalte 2: component
                quantity = parseInt(columns[4]) || 0; // Spalte 4: quantity
              }
              
              // Nur gültige Komponenten mit Menge verarbeiten
              if (component && 
                  component !== 'component' && 
                  component !== 'Component' && 
                  component !== 'linenumber' &&
                  component !== 'ProjectInfo' &&
                  component !== '' &&
                  quantity > 0) {
                
                console.log(`🔍 [Matrix] Gültige Zeile ${lineIndex}: Komponente="${component}", Menge=${quantity}, Standort="${berichtStandort}"`);
                
                // Komponente initialisieren falls nicht vorhanden
                if (!components.has(component)) {
                  components.set(component, new Map());
                }
                
                const componentRooms = components.get(component)!;
                
                // Standort initialisieren falls nicht vorhanden
                if (!componentRooms.has(berichtStandort)) {
                  componentRooms.set(berichtStandort, { quantity: 0, reports: [] });
                }
                
                const roomData = componentRooms.get(berichtStandort)!;
                roomData.quantity += quantity; // Menge addieren
                
                // Bericht-ID hinzufügen falls nicht vorhanden
                const reportId = report.reportNumber || report.id;
                if (reportId && !roomData.reports.includes(reportId)) {
                  roomData.reports.push(reportId);
                }
              }
            } catch (lineError) {
              console.warn(`⚠️ [Matrix] Fehler beim Verarbeiten der Zeile ${lineIndex}:`, lineError);
            }
          });
        } else {
          console.log(`⚠️ [Matrix] Bericht ${report.reportNumber || report.id} hat keine CSV-Daten`);
        }
      } catch (error) {
        console.warn(`❌ [Matrix] Fehler beim Verarbeiten des Berichts ${report.reportNumber || report.id}:`, error);
      }
    });
    
    console.log(`🔍 [Matrix] Gefundene Standorte (Spalten):`, Array.from(rooms));
    console.log(`🔍 [Matrix] Gefundene Komponenten (Zeilen):`, Array.from(components.keys()));
    
    // Alle Standorte sortieren (Allgemein zuerst, dann alphabetisch)
    const sortedRooms = Array.from(rooms).sort((a, b) => {
      if (a === 'Allgemein') return -1;
      if (b === 'Allgemein') return 1;
      return a.localeCompare(b);
    });
    
    // Alle Komponenten sortieren (alphabetisch)
    const sortedComponents = Array.from(components.keys()).sort();
    
    return {
      rooms: sortedRooms,
      components: sortedComponents,
      data: components,
      totalComponents: sortedComponents.length,
      totalRooms: sortedRooms.length,
      filteredReportsCount: filteredReports.length,
      totalReportsCount: projectReports.length
    };
  };

  // Funktion zum Drucken einer Projekt-Zusammenfassung
  const printProjectSummary = (projectNumber: string) => {
    const summary = createProjectSummary(projectNumber);
    if (!summary) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Projekt-Zusammenfassung - ${summary.projectNumber}</title>
        <style>
          @media print {
            body { margin: 15px; font-size: 12px; line-height: 1.4; }
            .header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9; }
            .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
            .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background: #f3f4f6; font-weight: bold; }
            .section { margin: 20px 0; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1f2937; }
            .employee-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .monthly-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .status-badge { 
              display: inline-block; 
              padding: 4px 8px; 
              border-radius: 4px; 
              font-size: 12px; 
              font-weight: bold; 
              text-transform: uppercase; 
            }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #d1fae5; color: #065f46; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
            
            /* Matrix Table Styles */
            .matrix-table { font-size: 10px; }
            .matrix-table th, .matrix-table td { padding: 4px; text-align: center; }
            .component-header { background: #1f2937; color: white; font-weight: bold; }
            .room-header { background: #3b82f6; color: white; font-weight: bold; }
            .total-header { background: #059669; color: white; font-weight: bold; }
            .component-name { background: #f3f4f6; font-weight: bold; text-align: left; }
            .quantity-cell { background: #f0f9ff; }
            .empty-cell { background: #f9fafb; color: #9ca3af; }
            .total-cell { background: #ecfdf5; font-weight: bold; }
            .quantity { font-weight: bold; color: #1e40af; }
            .hours { font-size: 9px; color: #059669; }
            .reports { font-size: 8px; color: #7c3aed; }
            .total-quantity { color: #059669; }
            .total-hours { color: #059669; font-size: 10px; }
            
            /* Matrix Table Styles */
            .matrix-table { font-size: 10px; }
            .matrix-table th, .matrix-table td { padding: 4px; text-align: center; }
            .component-header { background: #1f2937; color: white; font-weight: bold; }
            .room-header { background: #3b82f6; color: white; font-weight: bold; }
            .total-header { background: #059669; color: white; font-weight: bold; }
            .component-name { background: #f3f4f6; font-weight: bold; text-align: left; }
            .quantity-cell { background: #f0f9ff; }
            .empty-cell { background: #f9fafb; color: #9ca3af; }
            .total-cell { background: #ecfdf5; font-weight: bold; }
            .quantity { font-weight: bold; color: #1e40af; }
            .hours { font-size: 9px; color: #059669; }
            .reports { font-size: 8px; color: #7c3aed; }
            .total-quantity { color: #059669; }
            .total-hours { color: #059669; font-size: 10px; }
          }
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9; }
          .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
          .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background: #f3f4f6; font-weight: bold; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1f2937; }
          .employee-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .monthly-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .status-badge { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: bold; 
            text-transform: uppercase; 
          }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Projekt-Zusammenfassung</h1>
          <h2>${summary.projectNumber} - ${summary.projectName}</h2>
          <p><strong>Kunde:</strong> ${summary.customerName}</p>
          <p><strong>Erstellt am:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${summary.totalReports}</div>
            <div class="stat-label">Gesamt Berichte</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${summary.totalHours}</div>
            <div class="stat-label">Gesamt Stunden</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${summary.pendingReports}</div>
            <div class="stat-label">Ausstehend</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${summary.approvedReports}</div>
            <div class="stat-label">Genehmigt</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Status-Übersicht</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${summary.pendingReports}</div>
              <div class="stat-label">Ausstehend</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${summary.approvedReports}</div>
              <div class="stat-label">Genehmigt</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${summary.rejectedReports}</div>
              <div class="stat-label">Abgelehnt</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Mitarbeiter-Statistiken</div>
          ${Object.entries(summary.employeeStats).map(([employee, stats]) => `
            <div class="employee-row">
              <span><strong>${employee}</strong></span>
              <span>${stats.reports} Berichte, ${stats.hours} Stunden</span>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">Monats-Statistiken</div>
          ${Object.entries(summary.monthlyStats).map(([month, stats]) => `
            <div class="monthly-row">
              <span><strong>${month}</strong></span>
              <span>${stats.reports} Berichte, ${stats.hours} Stunden</span>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">Komponenten-Matrix (Excel-ähnlich)</div>
          <div class="filter-info" style="margin-bottom: 15px; padding: 10px; background: #dbeafe; border-radius: 5px; font-size: 12px;">
            <strong>Filter:</strong> Berichte ab 25.8.2025 
            (${summary.componentMatrix.filteredReportsCount} von ${summary.componentMatrix.totalReportsCount} Berichten)
          </div>
          <table class="table matrix-table">
            <thead>
              <tr>
                <th class="component-header">Komponente</th>
                ${summary.componentMatrix.rooms.map(room => `
                  <th class="room-header">${room}</th>
                `).join('')}
                <th class="total-header">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              ${summary.componentMatrix.components.map(component => {
                const componentData = summary.componentMatrix.data.get(component);
                let totalQuantity = 0;
                let totalHours = 0;
                
                // Gesamtwerte berechnen
                summary.componentMatrix.rooms.forEach(room => {
                  const roomData = componentData?.get(room);
                  if (roomData) {
                    totalQuantity += roomData.quantity;
                  }
                });
                
                return `
                  <tr>
                    <td class="component-name"><strong>${component}</strong></td>
                    ${summary.componentMatrix.rooms.map(room => {
                      const roomData = componentData?.get(room);
                      if (roomData && roomData.quantity > 0) {
                        return `
                          <td class="quantity-cell">
                            <div class="quantity">${roomData.quantity}</div>
                            <div class="reports">${roomData.reports.length} Ber.</div>
                          </td>
                        `;
                      } else {
                        return '<td class="empty-cell">-</td>';
                      }
                    }).join('')}
                    <td class="total-cell">
                      <div class="total-quantity"><strong>${totalQuantity}</strong></div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Alle Berichte im Detail</div>
          <table class="table">
            <thead>
              <tr>
                <th>Bericht Nr.</th>
                <th>Mitarbeiter</th>
                <th>Datum</th>
                <th>Stunden</th>
                <th>Status</th>
                <th>Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              ${summary.reports.map(report => `
                <tr>
                  <td>${report.reportNumber || 'N/A'}</td>
                  <td>${report.employee || 'N/A'}</td>
                  <td>${new Date(report.workDate).toLocaleDateString('de-DE')}</td>
                  <td>${report.totalHours || 0}</td>
                  <td>
                    <span class="status-badge status-${report.status}">
                      ${report.status === 'pending' ? 'Ausstehend' : 
                        report.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                    </span>
                  </td>
                  <td>${report.workDescription || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Diese Zusammenfassung wurde automatisch generiert am ${new Date().toLocaleString('de-DE')}</p>
          <p>Projekt: ${summary.projectNumber} | Kunde: ${summary.customerName}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Warte kurz, bis der Inhalt geladen ist, dann drucke
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Funktion zum Drucken eines Berichts - druckt exakt die Bericht Details Ansicht
  const printReport = (report: Report) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Fehler',
        description: 'Pop-up-Blocker verhindert das öffnen des Druckfensters.',
        variant: 'destructive',
      });
      return;
    }

    // Erstelle den exakten Inhalt der Bericht Details Ansicht
    const createWorkLinesTable = () => {
      if (!report.workLines || report.workLines.length === 0) return '';
      
      return `
        <div class="section">
          <div class="section-title">Arbeitszeilen</div>
          <table class="table">
            <thead>
              <tr>
                <th>Zeile</th>
                <th>Komponente</th>
                <th>Arbeit</th>
                <th>Menge</th>
                <th>Stunden</th>
              </tr>
            </thead>
            <tbody>
              ${report.workLines.map((line, index) => `
                <tr>
                  <td>${line.linenumber || index + 1}</td>
                  <td>${line.component || '-'}</td>
                  <td>${line.workDone || '-'}</td>
                  <td>${line.quantity || '-'}</td>
                  <td>${line.hours || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    const createCSVDataTable = () => {
      if (!report.reportData) return '';
      
      try {
        const csvLines = report.reportData.split('\n').filter(line => line.trim());
        if (csvLines.length === 0) return '';
        
        const parsedData = csvLines.map((line, index) => {
          try {
            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
            return { lineNumber: index + 1, columns };
          } catch (parseError) {
            return { lineNumber: index + 1, columns: [line] };
          }
        });
        
        // Header-Erkennung
        const headerLine = parsedData.find(row => 
          row.columns.some(col => {
            const colLower = col.toLowerCase();
            return colLower.includes('projectinfo') || 
                   colLower.includes('component') || 
                   colLower.includes('zeile') ||
                   colLower.includes('linie') ||
                   colLower.includes('arbeit') ||
                   colLower.includes('menge') ||
                   colLower.includes('stunden') ||
                   colLower.includes('datum') ||
                   colLower.includes('mitarbeiter') ||
                   colLower.includes('kunde') ||
                   colLower.includes('projekt') ||
                   colLower.includes('standort') ||
                   colLower.includes('gewerk') ||
                   colLower.includes('beschreibung');
          })
        );
        
        if (headerLine) {
          const headers = headerLine.columns.map(header => {
            const headerLower = header.toLowerCase();
            if (headerLower.includes('projectinfo')) return 'Projektinfo';
            if (headerLower.includes('component')) return 'Komponente';
            if (headerLower.includes('zeile') || headerLower.includes('linie')) return 'Zeile';
            if (headerLower.includes('arbeit')) return 'Arbeit';
            if (headerLower.includes('menge')) return 'Menge';
            if (headerLower.includes('stunden')) return 'Stunden';
            if (headerLower.includes('datum')) return 'Datum';
            if (headerLower.includes('mitarbeiter')) return 'Mitarbeiter';
            if (headerLower.includes('kunde')) return 'Kunde';
            if (headerLower.includes('projekt')) return 'Projekt';
            if (headerLower.includes('standort')) return 'Standort';
            if (headerLower.includes('gewerk')) return 'Gewerk';
            if (headerLower.includes('beschreibung')) return 'Beschreibung';
            return header || 'Unbekannt';
          });
          
          const dataRows = parsedData.filter(row => 
            row.lineNumber !== headerLine.lineNumber && 
            !row.columns.some(col => col.toLowerCase().includes('projectinfo'))
          );
          
          return `
            <div class="section">
              <div class="section-title">Bericht</div>
              <table class="table">
                <thead>
                  <tr>
                    <th class="w-16">Zeile</th>
                    <th class="min-w-120">Komponente</th>
                    <th class="min-w-120">Leistung</th>
                    <th class="min-w-80">Menge</th>
                    <th class="min-w-80">Std</th>
                  </tr>
                </thead>
                <tbody>
                  ${dataRows.slice(0, 15).map((row, index) => {
                    const zeileIndex = headers.findIndex(header => 
                      header.toLowerCase().includes('zeile') || 
                      header.toLowerCase().includes('linie') ||
                      header.toLowerCase().includes('linenumber')
                    );
                    const komponenteIndex = headers.findIndex(header => 
                      header.toLowerCase().includes('komponente') || 
                      header.toLowerCase().includes('component')
                    );
                    const leistungIndex = headers.findIndex(header => 
                      header.toLowerCase().includes('arbeit') || 
                      header.toLowerCase().includes('workdone') ||
                      header.toLowerCase().includes('leistung')
                    );
                    const mengeIndex = headers.findIndex(header => 
                      header.toLowerCase().includes('menge') || 
                      header.toLowerCase().includes('quantity')
                    );
                    const stundenIndex = headers.findIndex(header => 
                      header.toLowerCase().includes('stunden') || 
                      header.toLowerCase().includes('hours') ||
                      header.toLowerCase().includes('std')
                    );
                    
                    return `
                      <tr>
                        <td class="font-mono text-xs">${zeileIndex !== -1 ? row.columns[zeileIndex] : row.lineNumber}</td>
                        <td class="text-xs max-w-200">${komponenteIndex !== -1 ? row.columns[komponenteIndex] : '-'}</td>
                        <td class="text-xs max-w-200">${leistungIndex !== -1 ? row.columns[leistungIndex] : '-'}</td>
                        <td class="text-xs text-center">${mengeIndex !== -1 ? row.columns[mengeIndex] : '-'}</td>
                        <td class="text-xs text-center">${stundenIndex !== -1 ? row.columns[stundenIndex] : '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              ${dataRows.length > 15 ? `
                <div class="mt-3 text-center text-sm text-gray-500">
                  Zeige ${dataRows.length - 15} weitere Zeilen... (Gesamt: ${dataRows.length})
                </div>
              ` : ''}
            </div>
          `;
        } else {
          // Fallback für einfache Daten
          return `
            <div class="section">
              <div class="section-title">Berichtsdaten</div>
              <table class="table">
                <thead>
                  <tr>
                    <th class="w-16">Zeile</th>
                    <th class="min-w-120">Komponente</th>
                    <th class="min-w-120">Leistung</th>
                    <th class="min-w-80">Menge</th>
                    <th class="min-w-80">Std</th>
                  </tr>
                </thead>
                <tbody>
                  ${parsedData.slice(0, 15).map((row, index) => `
                    <tr>
                      <td class="font-mono text-xs">${row.lineNumber}</td>
                      <td class="text-xs max-w-200">${row.columns[0] || '-'}</td>
                      <td class="text-xs max-w-200">${row.columns[1] || '-'}</td>
                      <td class="text-xs text-center">${row.columns[2] || '-'}</td>
                      <td class="text-xs text-center">${row.columns[3] || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${parsedData.length > 15 ? `
                <div class="mt-3 text-center text-sm text-gray-500">
                  Zeige ${parsedData.length - 15} weitere Zeilen... (Gesamt: ${parsedData.length})
                </div>
              ` : ''}
            </div>
          `;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return `
          <div class="section">
            <div class="section-title">Berichtsdaten</div>
            <div class="text-sm text-red-600">
              Fehler beim Parsen der CSV-Daten: ${errorMessage}
            </div>
          </div>
        `;
      }
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bericht Details - ${report.reportNumber || report.id}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              margin: 15px; 
              line-height: 1.4;
              color: #333;
              font-size: 14px;
            }
            .header { 
              text-align: center; 
              border-bottom: 1px solid #333; 
              padding-bottom: 15px; 
              margin-bottom: 20px; 
            }
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .header p {
              font-size: 13px;
              margin: 3px 0;
            }
            .section { 
              margin-bottom: 20px; 
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 16px; 
              font-weight: 600; 
              margin-bottom: 15px; 
              color: #1f2937;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 6px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 16px; 
            }
            .info-item { 
              margin-bottom: 12px; 
            }
            .info-label { 
              font-weight: 500; 
              color: #6b7280; 
              margin-bottom: 4px; 
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .info-value { 
              font-size: 14px; 
              font-weight: 600;
              color: #111827;
            }
            .table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px; 
              border: 1px solid #e5e7eb;
              font-size: 11px;
            }
            .table th, .table td { 
              border: 1px solid #e5e7eb; 
              padding: 8px; 
              text-align: left; 
              vertical-align: top;
            }
            .table th { 
              background-color: #f9fafb; 
              font-weight: 600; 
              color: #374151;
              font-size: 11px;
            }
            .table td {
              font-size: 11px;
              color: #374151;
            }
            .footer { 
              margin-top: 25px; 
              text-align: center; 
              font-size: 11px; 
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
            }
            .status-badge {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .status-pending { background-color: #fef3c7; color: #92400e; }
            .status-approved { background-color: #d1fae5; color: #065f46; }
            .status-rejected { background-color: #fee2e2; color: #991b1b; }
            .w-16 { width: 50px; }
            .min-w-120 { min-width: 100px; }
            .min-w-80 { min-width: 60px; }
            .max-w-200 { max-width: 150px; }
            .font-mono { font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 12px; }
            .text-center { text-align: center; }
            .text-gray-500 { color: #6b7280; }
            .mt-3 { margin-top: 8px; }
            @media print { 
              body { margin: 10px; } 
              .no-print { display: none; } 
              .section { page-break-inside: avoid; }
              .table { font-size: 10px; }
              .table th, .table td { padding: 6px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bericht Details</h1>
            <p><strong>Berichtsnummer:</strong> ${report.reportNumber || report.id}</p>
            <p><strong>Erstellt am:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
          </div>

          <div class="section">
            <div class="section-title">Grundinformationen</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Projektnummer</div>
                <div class="info-value">${report.projectNumber || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Berichtsnummer</div>
                <div class="info-value">${report.reportNumber || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Mitarbeitername</div>
                <div class="info-value">${report.employee || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Mitarbeiternummer</div>
                <div class="info-value">${report.mitarbeiterID || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Kundenname</div>
                <div class="info-value">${report.customer || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Berichtsdatum</div>
                <div class="info-value">${report.reportDate || report.workDate || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Standort</div>
                <div class="info-value">${getLocationFromRawData(report)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Gewerk</div>
                <div class="info-value">${report.activeprojectName || 'Nicht verfügbar'}</div>
              </div>
            </div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <div class="info-label">Status</div>
              <div style="margin-top: 8px;">
                <span class="status-badge status-${report.status === 'pending' ? 'pending' : report.status === 'approved' ? 'approved' : 'rejected'}">
                  ${report.status === 'pending' ? 'Ausstehend' : report.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                </span>
              </div>
            </div>
          </div>

          ${createWorkLinesTable()}
          ${createCSVDataTable()}

          <div class="footer">
            <p>Generiert von TradrTrackr am ${new Date().toLocaleString('de-DE')}</p>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
              Drucken
            </button>
            <button onclick="window.close()" style="padding: 12px 24px; font-size: 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; margin-left: 12px; font-weight: 500;">
              Schließen
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Funktionen zum Genehmigen/Ablehnen von Berichten
  const handleApproveReport = async (reportId: string) => {
    if (!user?.concernID) {
      toast({
        title: 'Fehler',
        description: 'Keine Concern-ID verfügbar.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // Status in Firestore auf 'approved' setzen
      await reportService.updateReport(reportId, { status: 'approved' });
      
      // Lokalen State aktualisieren
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId 
            ? { ...report, status: 'approved' as const }
            : report
        )
      );
      
      // SelectedReport aktualisieren falls es der aktuelle ist
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: 'approved' as const } : null);
      }
      
      toast({
        title: 'Bericht genehmigt',
        description: 'Der Bericht wurde erfolgreich genehmigt.',
      });
    } catch (error) {

      toast({
        title: 'Fehler',
        description: 'Fehler beim Genehmigen des Berichts.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRejectReport = async (reportId: string) => {
    if (!user?.concernID) {
      toast({
        title: 'Fehler',
        description: 'Keine Concern-ID verfügbar.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // Status in Firestore auf 'rejected' setzen
      await reportService.updateReport(reportId, { status: 'rejected' });
      
      // Lokalen State aktualisieren
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId 
            ? { ...report, status: 'rejected' as const }
            : report
        )
      );
      
      // SelectedReport aktualisieren falls es der aktuelle ist
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: 'rejected' as const } : null);
      }
      
      toast({
        title: 'Bericht abgelehnt',
        description: 'Der Bericht wurde erfolgreich abgelehnt.',
      });
    } catch (error) {

      toast({
        title: 'Fehler',
        description: 'Fehler beim Ablehnen des Berichts.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Enhanced CSV parsing function for mobile app data (pgH8Uh5IE5o1IaTgMt45 template format)
  const parseMobileAppCSV = (csvData: string) => {
    try {
      const lines = csvData.split('\n');
      const projectInfoLine = lines.find(line => line.trim().startsWith('ProjectInfo'));
      
      if (!projectInfoLine) {

        return null;
      }

      const columns = projectInfoLine.split(',');


      // Enhanced parsing for pgH8Uh5IE5o1IaTgMt45 template format
      const parsedData = {
        // Basic project information from ProjectInfo line
        projectNumber: columns[9] || 'Nicht verfügbar',
        reportNumber: columns[12] || 'Nicht verfügbar',
        reportDate: columns[11] || 'Nicht verfügbar',
        
        // Employee information from ProjectInfo line
        employeeName: columns[14] || 'Nicht verfügbar',
        employeeID: columns[13] || 'Nicht verfügbar',
        
        // Location and project information from ProjectInfo line
        workLocation: columns[8] || 'Nicht verfügbar',
        gewerk: columns[15] || 'Nicht verfügbar',
        
        // Additional metadata from ProjectInfo line
        concernID: columns[5] || 'Nicht verfügbar',
        
        // Work lines data from the data rows
        workLines: (() => {
          const workLinesData: any[] = [];
          const dataRows = lines.slice(1).filter(line => 
            line.trim() && !line.trim().startsWith('ProjectInfo') && line.trim() !== 'linenumber,reportID,component,workDone,quantity,hours,dateCreated,text,zusatz,activeProject,location,dateCreated,UIDAB,mitarbeiterID,mitarbeiterName,activeprojectName,gewerk'
          );
          
          dataRows.forEach((line, index) => {
            if (!line.trim()) return;
            
            const lineColumns = line.split(',');
            
            // Enhanced work line parsing for pgH8Uh5IE5o1IaTgMt45 format
            if (lineColumns.length >= 11) {
              const workLine = {
                linenumber: parseInt(lineColumns[0]) || (index + 1),
                reportID: lineColumns[1] || '',
                component: lineColumns[2] || '',
                workDone: lineColumns[3] || '',
                quantity: lineColumns[4] || '',
                hours: lineColumns[5] || '',
                dateCreated: lineColumns[6] || '',
                text: lineColumns[7] || '',
                zusatz: lineColumns[8] || '',
                activeProject: lineColumns[9] || '',
                location: lineColumns[10] || ''
              };
              
              // Clean up component names (remove duplicates and format properly)
              if (workLine.component) {
                workLine.component = workLine.component
                  .replace(/KabelbahnKabelbahn:/g, 'Kabelbahn:')
                  .replace(/TasterTaster/g, 'Taster')
                  .replace(/SteckdoseSteckdose/g, 'Steckdose')
                  .replace(/PVC-RohrPVC-Rohr/g, 'PVC-Rohr')
                  .replace(/Sammelhalter - Kabelsammelhalter/g, 'Kabelsammelhalter')
                  .trim();
              }
              
              // Only add work lines with meaningful component data
              if (workLine.component && workLine.component.trim()) {
                workLinesData.push(workLine);
              }
            }
          });
          
          return workLinesData;
        })(),
        
        // Calculate total hours from work lines
        totalHours: (() => {
          const workLines = (() => {
            const dataRows = lines.slice(1).filter(line => 
              line.trim() && !line.trim().startsWith('ProjectInfo') && line.trim() !== 'linenumber,reportID,component,workDone,quantity,hours,dateCreated,text,zusatz,activeProject,location,dateCreated,UIDAB,mitarbeiterID,mitarbeiterName,activeprojectName,gewerk'
            );
            
            return dataRows.map(line => {
              const lineColumns = line.split(',');
              return lineColumns[5] || '0';
            });
          })();
          
          return workLines.reduce((total, hours) => {
            const parsedHours = parseFloat(hours) || 0;
            return total + parsedHours;
          }, 0);
        })(),
        
        // Extract customer information (if available in future reports)
        customer: 'Aus CSV zu extrahieren', // Placeholder for future reports
        
        // Template metadata
        templateSource: 'Legacy Format (pgH8Uh5IE5o1IaTgMt45)',
        parsingTimestamp: new Date().toISOString()
      };


      return parsedData;
    } catch (error) {

      return null;
    }
  };

  // New parsing function for reports after August 15, 2025
  const parseNewerReportsCSV = (csvData: string) => {
    try {

      
      const lines = csvData.split('\n');

      
      // Find and skip the header line
      const headerLine = lines.find(line => 
        line.includes('linenumber') && 
        line.includes('component') && 
        line.includes('workDone')
      );
      
      if (!headerLine) {

        return null;
      }
      

      
      // Get data lines (skip header)
      const headerIndex = lines.indexOf(headerLine);
      const dataLines = lines.slice(headerIndex + 1).filter(line => line.trim());
      

      
      if (dataLines.length === 0) {

        return null;
      }
      
      // Parse the first data line to get project-level information
      const firstLine = dataLines[0].split(',');

      
      // Extract project-level information from first line based on actual headers:
      // linenumber,component,workDone,quantity,hours,activeProject,location,dateCreated,UIDAB,mitarbeiterID,mitarbeiterName,activeprojectName,gewerk
      const projectInfo = {
        projectNumber: firstLine[5] || 'Nicht verfügbar',        // activeProject
        workLocation: firstLine[6] || 'Nicht verfügbar',        // location
        reportDate: firstLine[7] || 'Nicht verfügbar',          // dateCreated
        reportNumber: firstLine[8] || 'Nicht verfügbar',        // UIDAB
        employeeID: firstLine[9] || 'Nicht verfügbar',          // mitarbeiterID
        employeeName: firstLine[10] || 'Nicht verfügbar',       // mitarbeiterName
        projectName: firstLine[11] || 'Nicht verfügbar',        // activeprojectName
        gewerk: firstLine[12] || 'Nicht verfügbar'              // gewerk
      };
      

      
      // Parse work lines from all data lines (skip first line as it contains project info)
      const workLines = dataLines.slice(1).map((line, index) => {
        const columns = line.split(',');
        

        
        if (columns.length >= 13) {
          const workLine = {
            linenumber: parseInt(columns[0]) || (index + 1),    // linenumber
            component: columns[1] || '',                         // component
            workDone: columns[2] || '',                         // workDone
            quantity: columns[3] || '',                         // quantity
            hours: parseFloat(columns[4]) || 0,                 // hours
            projectNumber: columns[5] || '',                    // activeProject
            workLocation: columns[6] || '',                     // location
            workDate: columns[7] || '',                         // dateCreated
            reportNumber: columns[8] || '',                     // UIDAB
            employeeID: columns[9] || '',                       // mitarbeiterID
            employeeName: columns[10] || '',                    // mitarbeiterName
            projectName: columns[11] || '',                     // activeprojectName
            gewerk: columns[12] || ''                           // gewerk
          };
          

          
          // Clean up component names (remove duplicates and format properly)
          if (workLine.component) {
            workLine.component = workLine.component
              .replace(/KabelbahnKabelbahn:/g, 'Kabelbahn:')
              .replace(/TasterTaster/g, 'Taster')
              .replace(/SteckdoseSteckdose/g, 'Steckdose')
              .replace(/PVC-RohrPVC-Rohr/g, 'PVC-Rohr')
              .replace(/Sammelhalter - Kabelsammelhalter/g, 'Kabelsammelhalter')
              .trim();
          }
          
          return workLine;
        } else {

          return null;
        }
      }).filter(line => line !== null);
      

      
      // Calculate total hours from work lines (excluding first line with project info)
      const totalHours = workLines.reduce((total, line) => {
        return total + (line?.hours || 0);
      }, 0);
      

      
      // Create parsed data object with same structure as old parser
      const parsedData = {
        projectNumber: projectInfo.projectNumber,
        reportNumber: projectInfo.reportNumber,
        reportDate: projectInfo.reportDate,
        employeeName: projectInfo.employeeName,
        employeeID: projectInfo.employeeID,
        workLocation: projectInfo.workLocation,
        gewerk: projectInfo.gewerk,
        concernID: 'Aus neuem Format zu extrahieren', // Not available in new format
        workLines: workLines,
        totalHours: totalHours,
        customer: projectInfo.projectName, // Use project name as customer for now
        templateSource: 'Neuer Berichtsformat (nach 15.08.2025)',
        parsingTimestamp: new Date().toISOString()
      };


      return parsedData;
    } catch (error) {

      return null;
    }
  };

  // Function to determine which parser to use based on report date
  const parseReportData = async (reportData: string, reportDate?: string) => {
    if (!reportData || !reportData.trim()) {
      return null;
    }


    console.log('ðŸ" [Parser Selection] CSV data preview:', reportData.substring(0, 100) + '...');

    // Check if report date is after August 15, 2025
    const cutoffDate = new Date('2025-08-15');
    let reportDateObj: Date | null = null;
    
    if (reportDate) {
      try {
        reportDateObj = new Date(reportDate);



      } catch (error) {

      }
    } else {

    }

    if (reportDateObj && reportDateObj > cutoffDate) {

      const result = parseNewerReportsCSV(reportData);

      return result;
    } else {

      const result = parseMobileAppCSV(reportData);

      return result;
    }
  };

  // Unified function to ensure consistent data structure from both parsers
  const normalizeParsedData = (parsedData: any, parserType: 'legacy' | 'newer') => {

    
    // Ensure consistent field names and structure
    const normalizedData = {
      // Core fields that should be consistent across both parsers
      projectNumber: parsedData.projectNumber || 'Nicht verfügbar',
      reportNumber: parsedData.reportNumber || 'Nicht verfügbar',
      reportDate: parsedData.reportDate || 'Nicht verfügbar',
      employeeName: parsedData.employeeName || 'Nicht verfügbar',
      employeeID: parsedData.employeeID || 'Nicht verfügbar',
      workLocation: parsedData.workLocation || 'Nicht verfügbar',
      gewerk: parsedData.gewerk || 'Nicht verfügbar',
      concernID: parsedData.concernID || 'Nicht verfügbar',
      workLines: parsedData.workLines || [],
      totalHours: parsedData.totalHours || 0,
      customer: parsedData.customer || 'Nicht verfügbar',
      
      // Parser metadata
      parserType: parserType,
      templateSource: parsedData.templateSource || `${parserType} Format`,
      parsingTimestamp: parsedData.parsingTimestamp || new Date().toISOString()
    };
    

    return normalizedData;
  };

  // Handle create new report
  const handleCreateReport = async () => {
    if (!newReport.customer || !newReport.projectNumber || !newReport.workLocation || !newReport.workDescription) {
      toast({
        title: "Pflichtfelder fehlen",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    // Parse CSV data if available to extract additional information
    let parsedCSVData = null;
    if (newReport.reportData && newReport.reportData.trim()) {
      try {
        parsedCSVData = await parseReportData(newReport.reportData, newReport.reportDate);
      } catch (error) {
        console.error('Fehler beim Parsen der CSV-Daten:', error);
        toast({
          title: "Parsing-Fehler",
          description: "Die CSV-Daten konnten nicht geparst werden. Der Bericht wird ohne CSV-Daten erstellt.",
          variant: "destructive",
        });
      }
    }

    const newReportId = (reports.length + 1).toString();
    const reportNumber = `RPT-${newReport.projectNumber}-${newReportId.padStart(2, '0')}`;
    
    // Use parsed CSV data to fill in missing information
    const createdReport: Report = {
      id: newReportId,
      reportNumber: parsedCSVData?.reportNumber || reportNumber,
      employee: parsedCSVData?.employeeName || newReport.employee || `${user?.displayName || 'Unbekannt'}`,
      customer: parsedCSVData?.customer || newReport.customer,
      projectNumber: parsedCSVData?.projectNumber || newReport.projectNumber,
      workLocation: parsedCSVData?.workLocation || newReport.workLocation,
      workDate: parsedCSVData?.reportDate || newReport.workDate,
      totalHours: parsedCSVData?.totalHours || newReport.totalHours,
      workDescription: newReport.workDescription,
      status: 'pending',
      mitarbeiterID: parsedCSVData?.employeeID || newReport.mitarbeiterID,
      projectReportNumber: parsedCSVData?.reportNumber || newReport.projectReportNumber,
      reportData: newReport.reportData,
      reportDate: parsedCSVData?.reportDate || newReport.reportDate,
      signatureReference: newReport.signatureReference,
      stadt: newReport.stadt,
      concernID: parsedCSVData?.concernID || newReport.concernID,
      activeprojectName: newReport.activeprojectName,
      location: parsedCSVData?.workLocation || newReport.location,
      workLines: parsedCSVData?.workLines || newReport.workLines,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to local state and localStorage
    setReports(prev => [...prev, createdReport]);
    localStorage.setItem('reports', JSON.stringify([...reports, createdReport]));
    
    // Reset form
    setNewReport({
      customer: '',
      projectNumber: '',
      workLocation: '',
      workDate: new Date().toISOString().split('T')[0],
      totalHours: 8,
      workDescription: '',
      mitarbeiterID: user?.uid || '',
      projectReportNumber: '',
      reportData: '',
      reportDate: new Date().toISOString().split('T')[0],
      signatureReference: '',
      stadt: '',
      concernID: (user as any)?.concernID || '',
      activeprojectName: '',
      location: '',
      workLines: [],
      // Reset new fields
      reportNumber: '',
      employee: '',
      gewerk: ''
    });
    setShowNewReportForm(false);
    
    // Show success message with parsing information
    if (parsedCSVData) {
      toast({
        title: "Bericht erfolgreich erstellt",
        description: `Aus CSV-Daten extrahiert: Projektnummer ${parsedCSVData.projectNumber}, Mitarbeiter ${parsedCSVData.employeeName}, Arbeitsort ${parsedCSVData.workLocation}`,
      });
    } else {
      toast({
        title: "Bericht erfolgreich erstellt",
        description: "Der Bericht wurde erfolgreich erstellt.",
      });
    }
  };

  // Export functionality
  const exportToCSV = () => {
    if (reports.length === 0) return;
    
    const headers = [
      'Mitarbeiter', 'Kunde', 'Standort', 'Projektnummer', 'Arbeitsort',
      'Arbeitsdatum', 'Stunden', 'Arbeitsbeschreibung', 'Status'
    ];
    
    const csvData = filteredAndSortedReports.map(report => {
      // Convert status to German
      let statusGerman: string = report.status;
      if (report.status === 'pending') statusGerman = 'Ausstehend';
      else if (report.status === 'approved') statusGerman = 'Genehmigt';
      else if (report.status === 'rejected') statusGerman = 'Abgelehnt';
      
      return [
        report.employee || 'N/A', 
        report.customer || 'N/A', 
        getLocationFromRawData(report), 
        report.projectNumber || 'N/A',
        report.workLocation || 'N/A', 
        report.workDate || 'N/A', 
        report.totalHours || '0', 
        report.workDescription || 'N/A', 
        statusGerman
      ];
    });
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n');
    
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvWithBOM], { 
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `berichte_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle sort column click
  const handleSortColumn = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-5 w-5" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  // Parse German date format (DD/MM/YYYY) to Date object
  const parseGermanDate = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    
    // Handle German date format: DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript
      const year = parseInt(parts[2], 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Fallback: try standard Date parsing
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {

    }
    
    return null;
  };

  // Employees are loaded from users collection (see useEffect above)

  // Get filtered and sorted reports - OPTIMIZED with useMemo
  const filteredAndSortedReports = useMemo(() => {
    if (!reports || reports.length === 0) return [];
    
    // First filter the reports
    let filteredReports = reports.filter(report => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          report.reportNumber?.toLowerCase().includes(searchLower) ||
          report.employee?.toLowerCase().includes(searchLower) ||
          report.customer?.toLowerCase().includes(searchLower) ||
          report.projectNumber?.toLowerCase().includes(searchLower) ||
          report.workLocation?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && report.status !== statusFilter) {
        return false;
      }
      
      // Project filter
      if (projectFilter !== 'all') {
        // Normalize project numbers for comparison (remove spaces, convert to string)
        const normalizedFilter = String(projectFilter).trim();
        const normalizedReportProject = String(report.projectNumber || '').trim();
        
        console.log('🔍 [PROJECT FILTER DEBUG]', {
          projectFilter: normalizedFilter,
          reportProjectNumber: normalizedReportProject,
          matches: normalizedReportProject === normalizedFilter,
          reportId: report.id,
          originalFilter: projectFilter,
          originalReportProject: report.projectNumber
        });
        
        if (normalizedReportProject !== normalizedFilter) {
          return false;
        }
      }
      
      // Employee filter (single select)
      if (employeeFilter && employeeFilter !== 'all') {
        // Match by employee name
        const matchesEmployee = report.employee === employeeFilter;
        if (!matchesEmployee) return false;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        const reportDate = new Date(report.workDate || report.reportDate || '');
        if (isNaN(reportDate.getTime())) return true; // Skip invalid dates
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (reportDate < fromDate) return false;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999); // Include the entire day
          if (reportDate > toDate) return false;
        }
      }
      
      return true;
    });
    
    // Then sort the filtered reports
    return filteredReports.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Report];
      let bValue: any = b[sortBy as keyof Report];
      
      // Debug sorting values
      if (sortBy === 'workDate') {
        console.log('ðŸ" [SORT DEBUG] Sorting workDate:', {
          a: { id: a.id, workDate: a.workDate, value: aValue, rawValue: a[sortBy as keyof Report] },
          b: { id: b.id, workDate: b.workDate, value: bValue, rawValue: b[sortBy as keyof Report] }
        });
      }
      
      // Handle different data types
      if (sortBy === 'workDate' || sortBy === 'reportDate') {
        // Convert dates to timestamps for comparison
        // Handle various date formats and invalid dates
        if (sortBy === 'workDate') {
          console.log('ðŸ" [DATE DEBUG] Processing workDate values:', {
            aRaw: aValue,
            bRaw: bValue,
            aType: typeof aValue,
            bType: typeof bValue
          });
        }
        
        // Use German date parser for workDate
        if (sortBy === 'workDate') {
          const aDate = parseGermanDate(aValue);
          const bDate = parseGermanDate(bValue);
          
          aValue = aDate ? aDate.getTime() : 0;
          bValue = bDate ? bDate.getTime() : 0;
          
          if (sortBy === 'workDate') {
            console.log('ðŸ" [DATE DEBUG] After German parsing:', {
              aValue,
              bValue,
              aDate: aDate,
              bDate: bDate
            });
          }
        } else {
          // Standard date parsing for other date fields
          try {
            aValue = aValue ? new Date(aValue).getTime() : 0;
            if (isNaN(aValue)) aValue = 0;
          } catch (e) {

            aValue = 0;
          }
          
          try {
            bValue = bValue ? new Date(bValue).getTime() : 0;
            if (isNaN(bValue)) bValue = 0;
          } catch (e) {

            bValue = 0;
          }
        }
      } else if (sortBy === 'totalHours') {
        // Convert to numbers for comparison
        try {
          aValue = aValue ? parseFloat(aValue) : 0;
          if (isNaN(aValue)) aValue = 0;
        } catch (e) {
          aValue = 0;
        }
        
        try {
          bValue = bValue ? parseFloat(bValue) : 0;
          if (isNaN(bValue)) bValue = 0;
        } catch (e) {
          bValue = 0;
        }
      } else {
        // Convert to strings for comparison
        try {
          aValue = aValue ? String(aValue).toLowerCase() : '';
        } catch (e) {
          aValue = '';
        }
        
        try {
          bValue = bValue ? String(bValue).toLowerCase() : '';
        } catch (e) {
          bValue = '';
        }
      }
      
      if (sortOrder === 'asc') {
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        if (sortBy === 'workDate') {

        }
        return result;
      } else {
        const result = aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        if (sortBy === 'workDate') {

        }
        return result;
      }
    });
  }, [reports, searchTerm, statusFilter, projectFilter, employeeFilter, dateFrom, dateTo, sortBy, sortOrder]);
  
  // Infinite scroll - initialized after filteredAndSortedReports
  const hasMoreReports = displayedReportsCount < filteredAndSortedReports.length;
  const { isLoadingMore, sentinelRef } = useInfiniteScroll({
    hasMore: hasMoreReports,
    loading: isLoadingReports,
    onLoadMore: async () => {
      setDisplayedReportsCount(prev => Math.min(prev + itemsPerPage, filteredAndSortedReports.length));
    },
    enabled: isMobile || isTablet,
  });
  
  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedReportsCount(itemsPerPage);
  }, [searchTerm, statusFilter, projectFilter, employeeFilter, dateFrom, dateTo, sortBy, sortOrder]);
  
  // Get displayed reports
  const displayedReports = filteredAndSortedReports.slice(0, displayedReportsCount);

  // Debug: Log current state
  console.log('ðŸ" [ReportsManagement] Current state:', {
    reports: reports.length,
    filteredReports: filteredAndSortedReports.length,
    reportsData: reports,
    user: user?.email,
    concernID: (user as any)?.concernID,
    canViewReports,
    canManageReports,
    isLoadingReports
  });

  // Debug: Log date values for sorting
  if (reports.length > 0) {
    console.log('ðŸ… [DEBUG] Date values for sorting:', {
      sortBy,
      sortOrder,
      sampleDates: reports.slice(0, 3).map(r => ({
        id: r.id,
        workDate: r.workDate,
        workDateType: typeof r.workDate,
        workDateParsed: r.workDate ? new Date(r.workDate) : null,
        workDateTimestamp: r.workDate ? new Date(r.workDate).getTime() : null
      })),
      allWorkDates: reports.map(r => ({
        id: r.id,
        workDate: r.workDate,
        workDateType: typeof r.workDate
      }))
    });
  }

  // Check permissions
  if (!canViewReports) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Berichtsverwaltung" 
          showBackButton={true} 
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Zugriff verweigert</h2>
              <p className="text-gray-600">Sie haben keine Berechtigung, Berichte anzuzeigen.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: filteredAndSortedReports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    approved: reports.filter(r => r.status === 'approved').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="📊 Berichtsverwaltung" 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAufmassDialog(true)}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            title="Aufmaß aus Berichten erstellen"
          >
            <Calculator className="h-5 w-5 mr-2" />
            📐 Aufmaß erstellen
          </Button>
          
          <Button
            onClick={async () => {
              await loadLocalData(true);
              reloadReports();
            }}
            disabled={isLoadingReports}
            className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
            title="Alle Daten neu laden"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isLoadingReports ? 'animate-spin' : ''}`} />
            {isLoadingReports ? '⏳ Lade...' : '🔄 Neu laden'}
          </Button>

          {onNavigate && (
            <>
              <Button
                variant="outline"
                onClick={() => onNavigate('reports-list')}
                title="Vorlagen & Berichts-Builder"
                className="border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                📈 Builder
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate('reports-scheduler')}
                title="Geplante Berichte"
                className="border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-all"
              >
                <Clock className="h-5 w-5 mr-2" />
                🕐 Planung
              </Button>
            </>
          )}
          
          {canManageReports && (
            <Button
              onClick={() => setShowNewReportForm(true)}
              className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              aria-label="Neuen Bericht erstellen"
            >
              <Plus className="h-5 w-5 mr-2" />
              ✨ Neuer Bericht
            </Button>
          )}
        </div>
      </AppHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-xs text-white/80">Berichte</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ausstehend
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.pending}</div>
                <p className="text-xs text-white/80">Zu prüfen</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Genehmigt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.approved}</div>
                <p className="text-xs text-white/80">Freigegeben</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Abgelehnt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.rejected}</div>
                <p className="text-xs text-white/80">Zurückgewiesen</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Sidebar */}

          {/* Statistics */}
          {showStatistics && <ReportsStats reports={reports} user={user} hasPermission={hasPermission} />}

          {/* Controls Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <span className="text-lg font-bold">Filter & Suche</span>
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {filteredAndSortedReports.length} {filteredAndSortedReports.length === 1 ? 'Bericht' : 'Berichte'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatistics(!showStatistics)}
                    className={`text-xs h-8 px-3 transition-all ${showStatistics ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                  >
                    {showStatistics ? <EyeOff className="h-3 w-3 mr-1" /> : <BarChart3 className="h-3 w-3 mr-1" />}
                    {showStatistics ? '📊 Ausblenden' : '📊 Statistiken'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowProjectSummary(true);
                    }}
                    className="text-xs h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                  >
                    <ClipboardList className="h-5 w-5 mr-1" />
                    📋 Zusammenfassung
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="text-xs h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                  >
                    <Download className="h-5 w-5 mr-1" />
                    📥 CSV
                  </Button>

                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`h-8 px-3 transition-all ${viewMode === 'table' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                  >
                    <TableIcon className="h-5 w-5 mr-1" />
                    Tabelle
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className={`h-8 px-3 transition-all ${viewMode === 'cards' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                  >
                    <Package className="h-5 w-5 mr-1" />
                    Karten
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Info Note - Show if not searched */}
              {!hasSearched && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <p className="text-sm text-gray-700">
                    💡 <strong>Hinweis:</strong> Bitte wählen Sie mindestens eine Filteroption aus und klicken Sie auf "Laden", um Berichte anzuzeigen.
                  </p>
                </div>
              )}

              {/* Filters Grid - Styled like TaskBoard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input 
                    placeholder="Suchen..." 
                    value={searchTerm} 
                    onChange={e=>setSearchTerm(e.target.value)} 
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg z-10 pointer-events-none">📁</div>
                  <Select value={projectFilter || 'all'} onValueChange={(val) => setProjectFilter(val === 'all' ? '' : val)}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Alle Projekte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Projekte</SelectItem>
                      {projects.map((project: any) => {
                        const projectNumber = project.projectNumber || project.id || `Projekt-${project.id?.substring(0, 8) || 'Unbekannt'}`;
                        return (
                          <SelectItem key={project.id} value={projectNumber}>
                            {projectNumber} - {project.customerName || project.name || 'Unbenannt'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg z-10 pointer-events-none">👤</div>
                  <Select value={employeeFilter || 'all'} onValueChange={(val) => setEmployeeFilter(val === 'all' ? '' : val)}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Alle Mitarbeiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                      {employees.map((emp: any) => {
                        const displayName = `${emp.vorname || ''} ${emp.nachname || ''}`.trim() || emp.displayName || emp.email || `Mitarbeiter ${emp.uid?.substring(0, 8) || 'Unbekannt'}`;
                        return (
                          <SelectItem key={emp.uid} value={displayName}>
                            {displayName} {emp.mitarbeiterID ? `(${emp.mitarbeiterID})` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg z-10 pointer-events-none">🏷️</div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Alle Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="pending">⏰ Ausstehend</SelectItem>
                      <SelectItem value="approved">✅ Genehmigt</SelectItem>
                      <SelectItem value="rejected">❌ Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range and Action Buttons */}
              <div className="flex flex-wrap items-end gap-4">
                
                {/* Date From */}
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    📅 Von
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                  />
                </div>

                {/* Date To */}
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    📅 Bis
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                  />
                </div>

                {/* Spacer */}
                <div className="flex-1 min-w-[100px]"></div>
                
                {/* Clear Filters Button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setProjectFilter('');
                    setEmployeeFilter('');
                    setStatusFilter('all');
                    setSearchTerm('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all"
                >
                  <X className="h-4 w-4 mr-2" />
                  Zurücksetzen
                </Button>
                
                {/* Load Button */}
                <Button
                  onClick={loadReportsManually}
                  disabled={isLoadingReports}
                  className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#058bc0] text-white font-bold shadow-md hover:shadow-xl transition-all px-8"
                >
                  {isLoadingReports ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Laden...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      🔍 Berichte laden
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* No Data Message */}
          {!hasSearched && (
            <Card className="border-2 border-blue-300 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Keine Berichte geladen</h3>
                <p className="text-gray-600">
                  Bitte verwenden Sie die Filter oben und klicken Sie auf "Berichte laden", um Daten anzuzeigen.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reports Table */}
          {hasSearched && viewMode === 'table' && (
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 pt-4 pb-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  📊 Berichte-Liste
                </CardTitle>
              </CardHeader>
              {/* Fixed Table Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300 flex-shrink-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th onClick={() => handleSortColumn('employee')} className="cursor-pointer hover:bg-gray-300 transition-colors font-bold text-gray-700 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            👤 Mitarbeiter
                            {getSortIcon('employee')}
                          </div>
                        </th>
                        <th onClick={() => handleSortColumn('customer')} className="cursor-pointer hover:bg-gray-300 transition-colors font-bold text-gray-700 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            🏢 Kunde
                            {getSortIcon('customer')}
                          </div>
                        </th>
                        <th onClick={() => handleSortColumn('workLocation')} className="cursor-pointer hover:bg-gray-300 transition-colors font-bold text-gray-700 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            📍 Standort
                            {getSortIcon('workLocation')}
                          </div>
                        </th>
                        <th onClick={() => handleSortColumn('projectNumber')} className="cursor-pointer hover:bg-gray-300 transition-colors font-bold text-gray-700 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            📋 Projektnr.
                            {getSortIcon('projectNumber')}
                          </div>
                        </th>
                        <th onClick={() => handleSortColumn('workDate')} className="cursor-pointer hover:bg-gray-300 transition-colors font-bold text-gray-700 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            📅 Datum
                            {getSortIcon('workDate')}
                          </div>
                        </th>
                        <th onClick={() => handleSortColumn('totalHours')} className="cursor-pointer hover:bg-gray-300 transition-colors font-bold text-gray-700 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            ⏱️ Stunden
                            {getSortIcon('totalHours')}
                          </div>
                        </th>
                        <th onClick={() => handleSortColumn('status')} className="cursor-pointer hover:bg-gray-300 transition-colors font-bold text-gray-700 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            🏷️ Status
                            {getSortIcon('status')}
                          </div>
                        </th>
                        <th className="text-right font-bold text-gray-700 bg-gray-100 px-4 py-3">⚙️ Aktionen</th>
                      </tr>
                    </thead>
                  </table>
                </div>
              </div>
              {/* Scrollable Table Body */}
              <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(100vh - 550px)' }}>
                <Table>
                  <TableHeader className="invisible">
                    <TableRow>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Standort</TableHead>
                      <TableHead>Projektnr.</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Stunden</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-12 w-12 text-gray-500" />
                            <p className="text-gray-700">Keine Berichte gefunden</p>
                            {canManageReports && (
                              <Button
                                onClick={() => setShowNewReportForm(true)}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Ersten Bericht erstellen
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedReports.map((report) => (
                        <TableRow 
                          key={report.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowReportDetails(true);
                          }}
                        >
                          <TableCell>{report.employee}</TableCell>
                          <TableCell>{report.customer}</TableCell>
                          <TableCell>{getLocationFromRawData(report)}</TableCell>
                          <TableCell>{report.projectNumber}</TableCell>
                          <TableCell>{report.workDate}</TableCell>
                          <TableCell>{report.totalHours}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                report.status === 'approved' ? 'default' :
                                report.status === 'rejected' ? 'destructive' : 'secondary'
                              }
                            >
                              {report.status === 'pending' ? 'Ausstehend' :
                               report.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Verhindert, dass der Row-Click ausgelöst wird
                                  setSelectedReport(report);
                                  setShowReportDetails(true);
                                }}
                                aria-label={`Bericht "${report.projectNumber || report.id}" anzeigen`}
                                title="Bericht anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Reports Cards */}
          {hasSearched && viewMode === 'cards' && (
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
              {reports.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-gray-500" />
                    <p className="text-gray-700">Keine Berichte gefunden</p>
                    {canManageReports && (
                      <Button
                        onClick={() => setShowNewReportForm(true)}
                        variant="outline"
                        size="sm"
                        aria-label="Ersten Bericht erstellen"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ersten Bericht erstellen
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                      displayedReports.map((report) => (
                  <Card 
                    key={report.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowReportDetails(true);
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-sm font-medium">{report.reportNumber}</span>
                        <Badge
                          variant={
                            report.status === 'approved' ? 'default' :
                            report.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {report.status === 'pending' ? 'Ausstehend' :
                           report.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{report.employee}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{report.customer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{report.projectNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{getLocationFromRawData(report)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{report.workDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{report.totalHours} Stunden</span>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation(); // Verhindert, dass der Card-Click ausgelöst wird
                            setSelectedReport(report);
                            setShowReportDetails(true);
                          }}
                          aria-label={`Bericht "${report.projectNumber || report.id}" Details anzeigen`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details anzeigen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              {/* Infinite Scroll Sentinel */}
              {(isMobile || isTablet) && (
                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm">Lade weitere Berichte...</span>
                    </div>
                  )}
                  {!hasMoreReports && displayedReports.length > 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Alle Berichte geladen ({displayedReports.length} von {filteredAndSortedReports.length})
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Report Details Dialog */}
          <Dialog open={showReportDetails} onOpenChange={setShowReportDetails}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
              <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
                {/* Animated background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                
                <div className="flex items-center justify-between relative z-10">
                  <DialogTitle className="text-3xl font-bold flex items-center gap-4">
                    <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                      📄
                    </div>
                    <div className="flex-1">
                      Bericht Details
                      <div className="text-xs font-normal text-white/80 mt-1">
                        Detaillierte Ansicht des Berichts
                      </div>
                    </div>
                  </DialogTitle>
                  <div className="pr-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedReport) {
                          printReport(selectedReport);
                        }
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 backdrop-blur-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Drucken
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              {selectedReport && (
                <div className="space-y-6 pt-4">
                  {/* Debug Information */}
                  <Card className="bg-gradient-to-br from-yellow-100 via-yellow-50 to-white border-3 border-yellow-300 shadow-md">
                    <CardContent className="text-xs text-yellow-800 p-3 font-semibold">
                      <div>🔍 <strong>ID:</strong> {selectedReport.id}</div>
                    </CardContent>
                  </Card>

                  {/* Basic Information */}
                  <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-3xl">ℹ️</span>
                        Grundinformationen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Line 1: Projektnummer | Berichtsnummer */}
                      <div className="flex gap-8">
                        <div className="w-48">
                          <Label className="text-xs font-medium text-gray-600">Projektnummer</Label>
                          <p className="text-base font-semibold">{selectedReport.projectNumber || 'Nicht verfügbar'}</p>
                        </div>
                        <div className="w-48">
                          <Label className="text-xs font-medium text-gray-600">Berichtsnummer</Label>
                          <p className="text-base font-semibold">{selectedReport.reportNumber || 'Nicht verfügbar'}</p>
                        </div>
                      </div>
                      
                      {/* Line 2: Mitarbeitername | Mitarbeiternummer */}
                      <div className="flex gap-8">
                        <div className="w-48">
                          <Label className="text-xs font-medium text-gray-600">Mitarbeitername</Label>
                          <p className="text-base font-semibold">{selectedReport.employee || 'Nicht verfügbar'}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Mitarbeiternummer</Label>
                          <p className="text-base font-semibold">{selectedReport.mitarbeiterID || 'Nicht verfügbar'}</p>
                        </div>
                      </div>
                      
                      {/* Line 3: Kundenname | Berichtsdatum */}
                      <div className="flex gap-8">
                        <div className="w-48">
                          <Label className="text-xs font-medium text-gray-600">Kundenname</Label>
                          <p className="text-base font-semibold">{selectedReport.customer || 'Nicht verfügbar'}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Berichtsdatum</Label>
                          <p className="text-base font-semibold">{selectedReport.reportDate || selectedReport.workDate || 'Nicht verfügbar'}</p>
                        </div>
                      </div>
                      
                      {/* Line 4: Standort | Gewerk */}
                      <div className="flex gap-8">
                        <div className="w-48">
                          <Label className="text-xs font-medium text-gray-600">Standort</Label>
                          <p className="text-base font-semibold">{getLocationFromRawData(selectedReport)}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Gewerk</Label>
                          <p className="text-base font-semibold">{selectedReport.activeprojectName || 'Nicht verfügbar'}</p>
                        </div>
                      </div>
                      
                      {/* Status below the 4 lines */}
                      <div className="pt-3 border-t">
                        <Label className="text-xs font-medium text-gray-600">Status</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <Badge
                            variant={
                              selectedReport.status === 'approved' ? 'default' :
                              selectedReport.status === 'rejected' ? 'destructive' : 'secondary'
                            }
                            className="text-sm px-3 py-1"
                          >
                            {selectedReport.status === 'pending' ? 'Ausstehend' :
                             selectedReport.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                          </Badge>
                          
                          {/* Approve/Reject Buttons - nur anzeigen wenn Status pending ist UND Benutzer die Berechtigung hat */}
                          {selectedReport.status === 'pending' && canApproveRejectReports && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => handleApproveReport(selectedReport.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isUpdatingStatus}
                                aria-label={`Bericht "${selectedReport.projectNumber || selectedReport.id}" genehmigen`}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Genehmigen
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRejectReport(selectedReport.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={isUpdatingStatus}
                                aria-label={`Bericht "${selectedReport.projectNumber || selectedReport.id}" ablehnen`}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Ablehnen
                              </Button>
                          </div>
                          )}
                          
                          {/* Status Info für genehmigte/abgelehnte Berichte */}
                          {selectedReport.status !== 'pending' && (
                            <div className="ml-4 text-xs text-gray-500">
                              {selectedReport.status === 'approved' ? '✓ Bericht wurde genehmigt' : '✗ Bericht wurde abgelehnt'}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Work Lines */}
                  {selectedReport.workLines && selectedReport.workLines.length > 0 && (
                    <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <span className="text-3xl">📋</span>
                          Arbeitszeilen
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="border-3 border-green-300 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-green-100 to-emerald-100">
                              <TableHead className="font-bold text-gray-900">Zeile</TableHead>
                              <TableHead className="font-bold text-gray-900">Komponente</TableHead>
                              <TableHead className="font-bold text-gray-900">Arbeit</TableHead>
                              <TableHead className="font-bold text-gray-900">Menge</TableHead>
                              <TableHead className="font-bold text-gray-900">Stunden</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedReport.workLines.map((line, index) => (
                              <TableRow key={index} className="hover:bg-green-50 transition-colors">
                                <TableCell className="font-semibold text-gray-700">{line.linenumber || index + 1}</TableCell>
                                <TableCell className="font-medium text-gray-900">{line.component}</TableCell>
                                <TableCell className="font-medium text-gray-900">{line.workDone}</TableCell>
                                <TableCell className="font-semibold text-green-600">{line.quantity}</TableCell>
                                <TableCell className="font-semibold text-green-600">{line.hours}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* CSV Data Table */}
                  {selectedReport.reportData && (
                    <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">📊</span>
                            <span>Bericht</span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          try {
                            // Sicherheitscheck für reportData
                            if (!selectedReport.reportData || typeof selectedReport.reportData !== 'string') {

                              return <p className="text-sm text-red-500">Keine gültigen CSV-Daten verfügbar</p>;
                            }
                            
                            const csvLines = selectedReport.reportData.split('\n').filter(line => line.trim());
                            if (csvLines.length === 0) {
                              return <p className="text-sm text-gray-500">Keine CSV-Daten verfügbar</p>;
                            }
                            

                            
                            // Parse CSV data
                            const parsedData = csvLines.map((line, index) => {
                              try {
                                const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
                                return { lineNumber: index + 1, columns };
                              } catch (parseError) {

                                return { lineNumber: index + 1, columns: [line] }; // Fallback: Zeile als einzelne Spalte
                              }
                            });
                            
                            // Verbesserte Header-Erkennung
                            const headerLine = parsedData.find(row => 
                              row.columns.some(col => {
                                const colLower = col.toLowerCase();
                                return colLower.includes('projectinfo') || 
                                       colLower.includes('component') || 
                                       colLower.includes('zeile') ||
                                       colLower.includes('linie') ||
                                       colLower.includes('arbeit') ||
                                       colLower.includes('menge') ||
                                       colLower.includes('stunden') ||
                                       colLower.includes('datum') ||
                                       colLower.includes('mitarbeiter') ||
                                       colLower.includes('kunde') ||
                                       colLower.includes('projekt') ||
                                       colLower.includes('standort') ||
                                       colLower.includes('gewerk') ||
                                       colLower.includes('beschreibung');
                              })
                            );
                            
                            if (headerLine) {
                              // öbersetze und bereinige Header
                              const headers = headerLine.columns.map(header => {
                                const headerLower = header.toLowerCase();
                                if (headerLower.includes('projectinfo')) return 'Projektinfo';
                                if (headerLower.includes('component')) return 'Komponente';
                                if (headerLower.includes('zeile') || headerLower.includes('linie')) return 'Zeile';
                                if (headerLower.includes('arbeit')) return 'Arbeit';
                                if (headerLower.includes('menge')) return 'Menge';
                                if (headerLower.includes('stunden')) return 'Stunden';
                                if (headerLower.includes('datum')) return 'Datum';
                                if (headerLower.includes('mitarbeiter')) return 'Mitarbeiter';
                                if (headerLower.includes('kunde')) return 'Kunde';
                                if (headerLower.includes('projekt')) return 'Projekt';
                                if (headerLower.includes('standort')) return 'Standort';
                                if (headerLower.includes('gewerk')) return 'Gewerk';
                                if (headerLower.includes('beschreibung')) return 'Beschreibung';
                                return header || 'Unbekannt';
                              });
                              
                              const dataRows = parsedData.filter(row => 
                                row.lineNumber !== headerLine.lineNumber && 
                                !row.columns.some(col => col.toLowerCase().includes('projectinfo'))
                              );
                              
                              // Extrahiere Gewerk und Standort aus der letzten Zeile der CSV-Daten
                              if (dataRows.length > 0) {
                                const lastRow = dataRows[dataRows.length - 1];
                                
                                // Prüfe das Berichtsdatum für die Extraktionslogik


                                
                                let reportDate: Date;
                                try {
                                  // Versuche verschiedene Datumsformate zu parsen
                                  if (selectedReport.reportDate) {
                                    reportDate = new Date(selectedReport.reportDate);
                                  } else if (selectedReport.workDate) {
                                    reportDate = new Date(selectedReport.workDate);
                                  } else {
                                    // Fallback: Verwende heutiges Datum
                                    reportDate = new Date();

                                  }
                                  
                                  // Prüfe ob das Datum gültig ist
                                  if (isNaN(reportDate.getTime())) {

                                    reportDate = new Date();
                                  }
                                } catch (error) {

                                  reportDate = new Date();
                                }
                                
                                const cutoffDate = new Date('2025-08-15');
                                



                                
                                if (reportDate < cutoffDate) {
                                  // Für Berichte vor 15.08.2025: Standort in Spalte 11, Gewerk in der letzten Spalte



                                  
                                  if (lastRow.columns.length >= 11) {
                                    const standortValue = lastRow.columns[10]; // Spalte 11 (Index 10)
                                    selectedReport.workLocation = standortValue;

                                  } else {
                                    console.log('âš ï¸ [Legacy Mode] Nicht genug Spalten für Standort (Spalte 11)');
                                  }
                                  
                                  if (lastRow.columns.length > 0) {
                                    const gewerkValue = lastRow.columns[lastRow.columns.length - 1]; // Letzte Spalte
                                    selectedReport.activeprojectName = gewerkValue;

                                  } else {

                                  }
                                } else {
                                  // Für neuere Berichte: Intelligente Spaltenerkennung

                                  const gewerkIndex = headers.findIndex(header => 
                                    header.toLowerCase().includes('gewerk') || 
                                    header.toLowerCase().includes('standort')
                                  );
                                  const standortIndex = headers.findIndex(header => 
                                    header.toLowerCase().includes('standort') || 
                                    header.toLowerCase().includes('location')
                                  );
                                  


                                  
                                  // Aktualisiere die Grundinformationen mit den CSV-Werten
                                  if (gewerkIndex !== -1 && lastRow.columns[gewerkIndex]) {
                                    selectedReport.activeprojectName = lastRow.columns[gewerkIndex];

                                  }
                                  if (standortIndex !== -1 && lastRow.columns[standortIndex]) {
                                    selectedReport.workLocation = lastRow.columns[standortIndex];

                                  }
                                }
                                
                                // Debug: Zeige die aktualisierten Werte


                                
                                // Debug: Zeige die aktualisierten Werte


                                
                                // KEINE UI-Updates hier - das verursacht den Loop!
                                // Die Werte werden nur für die Anzeige in den Grundinformationen gesetzt
                              }
                              
                              return (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-16">Zeile</TableHead>
                                        <TableHead className="min-w-[120px]">Komponente</TableHead>
                                        <TableHead className="min-w-[120px]">Leistung</TableHead>
                                        <TableHead className="min-w-[80px]">Menge</TableHead>
                                        <TableHead className="min-w-[80px]">Std</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {dataRows.slice(0, 20).map((row, index) => {
                                        // Finde die relevanten Spaltenindizes
                                        const zeileIndex = headers.findIndex(header => 
                                          header.toLowerCase().includes('zeile') || 
                                          header.toLowerCase().includes('linie') ||
                                          header.toLowerCase().includes('linenumber')
                                        );
                                        const komponenteIndex = headers.findIndex(header => 
                                          header.toLowerCase().includes('komponente') || 
                                          header.toLowerCase().includes('component')
                                        );
                                        const leistungIndex = headers.findIndex(header => 
                                          header.toLowerCase().includes('arbeit') || 
                                          header.toLowerCase().includes('workdone') ||
                                          header.toLowerCase().includes('leistung')
                                        );
                                        const mengeIndex = headers.findIndex(header => 
                                          header.toLowerCase().includes('menge') || 
                                          header.toLowerCase().includes('quantity')
                                        );
                                        const stundenIndex = headers.findIndex(header => 
                                          header.toLowerCase().includes('stunden') || 
                                          header.toLowerCase().includes('hours') ||
                                          header.toLowerCase().includes('std')
                                        );
                                        
                                        return (
                                          <TableRow key={index}>
                                            <TableCell className="font-mono text-xs">
                                              {zeileIndex !== -1 ? row.columns[zeileIndex] : row.lineNumber}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate" title={komponenteIndex !== -1 ? row.columns[komponenteIndex] : ''}>
                                              {komponenteIndex !== -1 ? row.columns[komponenteIndex] : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate" title={leistungIndex !== -1 ? row.columns[leistungIndex] : ''}>
                                              {leistungIndex !== -1 ? row.columns[leistungIndex] : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-center">
                                              {mengeIndex !== -1 ? row.columns[mengeIndex] : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-center">
                                              {stundenIndex !== -1 ? row.columns[stundenIndex] : '-'}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                  {dataRows.length > 20 && (
                                    <div className="mt-3 text-center text-sm text-gray-500">
                                      Zeige {dataRows.length - 20} weitere Zeilen... (Gesamt: {dataRows.length})
                                    </div>
                                  )}
                                  
                                  {/* Rohdaten Button */}
                                  <div className="mt-4 flex justify-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowCSVData(true)}
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Database className="h-4 w-4 mr-2" />
                                      Rohdaten anzeigen
                                    </Button>
                                  </div>
                                </div>
                              );
                            } else {
                              // Fallback: Show raw data in simple table with intelligent column naming

                              // Extrahiere auch hier Gewerk und Standort aus der letzten Zeile
                              if (parsedData.length > 0) {
                                const lastRow = parsedData[parsedData.length - 1];
                                
                                // Prüfe das Berichtsdatum für die Extraktionslogik


                                
                                let reportDate: Date;
                                try {
                                  // Versuche verschiedene Datumsformate zu parsen
                                  if (selectedReport.reportDate) {
                                    reportDate = new Date(selectedReport.reportDate);
                                  } else if (selectedReport.workDate) {
                                    reportDate = new Date(selectedReport.workDate);
                                  } else {
                                    // Fallback: Verwende heutiges Datum
                                    reportDate = new Date();

                                  }
                                  
                                  // Prüfe ob das Datum gültig ist
                                  if (isNaN(reportDate.getTime())) {

                                    reportDate = new Date();
                                  }
                                } catch (error) {

                                  reportDate = new Date();
                                }
                                
                                const cutoffDate = new Date('2025-08-15');
                                
                                if (reportDate < cutoffDate) {
                                  // Für Berichte vor 15.08.2025: Standort in Spalte 11, Gewerk in der letzten Spalte
                                  if (lastRow.columns.length >= 11) {
                                    selectedReport.workLocation = lastRow.columns[10]; // Spalte 11 (Index 10)
                                  }
                                  if (lastRow.columns.length > 0) {
                                    selectedReport.activeprojectName = lastRow.columns[lastRow.columns.length - 1]; // Letzte Spalte
                                  }
                                } else {
                                  // Für neuere Berichte: Versuche, aus dem Inhalt der ersten Zeile Gewerk und Standort zu identifizieren
                                  const firstRow = parsedData[0];
                                  const gewerkIndex = firstRow.columns.findIndex(col => 
                                    col.toLowerCase().includes('gewerk') || 
                                    col.toLowerCase().includes('standort') ||
                                    col.toLowerCase().includes('location')
                                  );
                                  const standortIndex = firstRow.columns.findIndex(col => 
                                    col.toLowerCase().includes('standort') || 
                                    col.toLowerCase().includes('location') ||
                                    col.toLowerCase().includes('ort')
                                  );
                                  
                                  // Aktualisiere die Grundinformationen mit den CSV-Werten



                                  
                                  // Prüfe ob die Indizes gültig sind
                                  if (gewerkIndex >= 0 && gewerkIndex < lastRow.columns.length) {
                                    const gewerkValue = lastRow.columns[gewerkIndex];
                                    if (gewerkValue && gewerkValue.trim() !== '') {
                                      selectedReport.activeprojectName = gewerkValue;

                                    } else {

                                    }
                                  } else {
                                    console.log('âš ï¸ [Modern Mode] Gewerk-Index', gewerkIndex, 'ist außerhalb des gültigen Bereichs (0-' + (lastRow.columns.length - 1) + ')');
                                  }
                                  
                                  if (standortIndex >= 0 && standortIndex < lastRow.columns.length) {
                                    const standortValue = lastRow.columns[standortIndex];
                                    if (standortValue && standortValue.trim() !== '') {
                                      selectedReport.workLocation = standortValue;

                                    } else {

                                    }
                                  } else {
                                    console.log('âš ï¸ [Modern Mode] Standort-Index', standortIndex, 'ist außerhalb des gültigen Bereichs (0-' + (lastRow.columns.length - 1) + ')');
                                  }
                                }
                              }
                              
                              return (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-16">Zeile</TableHead>
                                        <TableHead className="min-w-[120px]">Komponente</TableHead>
                                        <TableHead className="min-w-[120px]">Leistung</TableHead>
                                        <TableHead className="min-w-[80px]">Menge</TableHead>
                                        <TableHead className="min-w-[80px]">Std</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {parsedData.slice(0, 15).map((row, index) => {
                                        // Versuche, aus dem Inhalt der ersten Zeile die relevanten Spalten zu identifizieren
                                        const firstRow = parsedData[0];
                                        const zeileIndex = firstRow.columns.findIndex(col => 
                                          col.toLowerCase().includes('zeile') || 
                                          col.toLowerCase().includes('linie') ||
                                          col.toLowerCase().includes('linenumber')
                                        );
                                        const komponenteIndex = firstRow.columns.findIndex(col => 
                                          col.toLowerCase().includes('komponente') || 
                                          col.toLowerCase().includes('component')
                                        );
                                        const leistungIndex = firstRow.columns.findIndex(col => 
                                          col.toLowerCase().includes('arbeit') || 
                                          col.toLowerCase().includes('workdone') ||
                                          col.toLowerCase().includes('leistung')
                                        );
                                        const mengeIndex = firstRow.columns.findIndex(col => 
                                          col.toLowerCase().includes('menge') || 
                                          col.toLowerCase().includes('quantity')
                                        );
                                        const stundenIndex = firstRow.columns.findIndex(col => 
                                          col.toLowerCase().includes('stunden') || 
                                          col.toLowerCase().includes('hours') ||
                                          col.toLowerCase().includes('std')
                                        );
                                        
                                        return (
                                          <TableRow key={index}>
                                            <TableCell className="font-mono text-xs">
                                              {zeileIndex !== -1 ? row.columns[zeileIndex] : row.lineNumber}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate" title={komponenteIndex !== -1 ? row.columns[komponenteIndex] : ''}>
                                              {komponenteIndex !== -1 ? row.columns[komponenteIndex] : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate" title={leistungIndex !== -1 ? row.columns[leistungIndex] : ''}>
                                              {leistungIndex !== -1 ? row.columns[leistungIndex] : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-center">
                                              {mengeIndex !== -1 ? row.columns[mengeIndex] : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-center">
                                              {stundenIndex !== -1 ? row.columns[stundenIndex] : '-'}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                  {parsedData.length > 15 && (
                                    <div className="mt-3 text-center text-sm text-gray-500">
                                      Zeige {parsedData.length - 15} weitere Zeilen... (Gesamt: {parsedData.length})
                                    </div>
                                  )}
                                  
                                  {/* Rohdaten Button */}
                                  <div className="mt-4 flex justify-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowCSVData(true)}
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Database className="h-4 w-4 mr-2" />
                                      Rohdaten anzeigen
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                          } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
                            return (
                              <div className="text-sm text-red-600">
                                Fehler beim Parsen der CSV-Daten: {errorMessage}
                              </div>
                            );
                          }
                        })()}
                      </CardContent>
                    </Card>
                  )}



                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowReportDetails(false)}
                    >
                      Schließen
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* New Report Form Dialog */}
          <Dialog open={showNewReportForm} onOpenChange={setShowNewReportForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
              <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
                {/* Animated background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                
                <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                  <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                    ✨
                  </div>
                  <div className="flex-1">
                    Neuen Bericht erstellen
                    <div className="text-xs font-normal text-white/80 mt-1">
                      Erstellen Sie einen neuen Bericht mit allen notwendigen Informationen
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateReport();
              }}>
                <div className="space-y-6 pt-4">
                  {/* Basic Information */}
                  <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-3xl">ℹ️</span>
                        Grundinformationen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customer" className="mb-2 block">
                            Kunde *
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                              (Auto-Vervollständigung verfügbar)
                            </span>
                          </Label>
                          <AutoCompleteInput
                            label=""
                            placeholder="Kundenname eingeben oder auswählen"
                            value={newReport.customer}
                            onChange={(value) => {
                              setNewReport({ ...newReport, customer: value });
                            }}
                            onSelect={(option) => {
                              setNewReport({ ...newReport, customer: option.value });
                              customerAutocomplete.trackUsage(option.id);
                            }}
                            options={customerAutocomplete.options}
                            filterFn={customerAutocomplete.filterFn}
                            showRecentFirst={true}
                            showUsageCount={true}
                            maxSuggestions={5}
                            icon={<Building2 className="h-4 w-4" />}
                            emptyMessage="Keine Kunden gefunden"
                          />
                        </div>
                        <div>
                          <Label htmlFor="projectNumber" className="mb-2 block">
                            Projektnummer *
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                              (Auto-Vervollständigung verfügbar)
                            </span>
                          </Label>
                          <AutoCompleteInput
                            label=""
                            placeholder="Projektnummer eingeben oder auswählen"
                            value={newReport.projectNumber}
                            onChange={(value) => {
                              setNewReport({ ...newReport, projectNumber: value });
                              // Auto-fill workLocation if project is selected
                              const selectedProject = projects.find(p => p.projectNumber === value);
                              if (selectedProject && selectedProject.name) {
                                // Try to extract workLocation from project name or use customer name
                                setNewReport(prev => ({
                                  ...prev,
                                  projectNumber: value,
                                  workLocation: prev.workLocation || selectedProject.customerName || ''
                                }));
                              }
                            }}
                            onSelect={(option) => {
                              const selectedProject = projects.find(p => p.projectNumber === option.value);
                              if (selectedProject) {
                                setNewReport(prev => ({
                                  ...prev,
                                  projectNumber: option.value,
                                  customer: prev.customer || selectedProject.customerName || '',
                                  workLocation: prev.workLocation || selectedProject.customerName || ''
                                }));
                                projectAutocomplete.trackUsage(option.id);
                              }
                            }}
                            options={projectAutocomplete.options}
                            filterFn={projectAutocomplete.filterFn}
                            showRecentFirst={true}
                            showUsageCount={true}
                            maxSuggestions={5}
                            icon={<FolderOpen className="h-4 w-4" />}
                            emptyMessage="Keine Projekte gefunden"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="workLocation">Arbeitsort *</Label>
                          <Input
                            id="workLocation"
                            value={newReport.workLocation}
                            onChange={(e) => setNewReport({ ...newReport, workLocation: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="workDate">Arbeitsdatum *</Label>
                          <Input
                            id="workDate"
                            type="date"
                            value={newReport.workDate}
                            onChange={(e) => setNewReport({ ...newReport, workDate: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="totalHours">Stunden</Label>
                          <Input
                            id="totalHours"
                            type="number"
                            value={newReport.totalHours}
                            onChange={(e) => setNewReport({ ...newReport, totalHours: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="workDescription">Arbeitsbeschreibung *</Label>
                          <Input
                            id="workDescription"
                            value={newReport.workDescription}
                            onChange={(e) => setNewReport({ ...newReport, workDescription: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* CSV Data */}
                  <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-3xl">📊</span>
                        CSV-Daten (pgH8Uh5IE5o1IaTgMt45 Template)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="reportData">CSV-Daten</Label>
                        <textarea
                          id="reportData"
                          value={newReport.reportData}
                          onChange={(e) => setNewReport({ ...newReport, reportData: e.target.value })}
                          rows={8}
                          className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
                          placeholder={`linenumber,reportID,component,workDone,quantity,hours,dateCreated,text,zusatz,activeProject,location,dateCreated,UIDAB,mitarbeiterID,mitarbeiterName,activeprojectName,gewerk
,15571755159561293,Aus-/Wechselschalter,Installiert,1,,14/8/2025,Keine,0,,,,,,,
,15571755159561293,PVC-Rohr - 20,Installiert,1,,14/8/2025,Keine,0,,,,,,,
ProjectInfo,,,,,,,,,270289,UG1 .1.11,14/8/2025,15571755159123914,1557,David Bullock,,Starkstromanlagen`}
                        />
                        <p className="text-sm text-gray-600 mt-1">
                          Fügen Sie hier die CSV-Daten im pgH8Uh5IE5o1IaTgMt45 Template-Format ein.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewReportForm(false)}
                    className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
                  >
                    <span className="text-xl mr-2">❌</span> Abbrechen
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
                  >
                    <span className="text-xl mr-2">✨</span> Bericht erstellen
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* CSV Data Dialog */}
          <Dialog open={showCSVData} onOpenChange={setShowCSVData}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
              <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
                {/* Animated background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                
                <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                  <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                    📋
                  </div>
                  <div className="flex-1">
                    CSV Rohdaten - {selectedReport?.reportNumber}
                    <div className="text-xs font-normal text-white/80 mt-1">
                      Rohe CSV-Daten für diesen Bericht. Diese Daten werden für das Parsing verwendet.
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              {selectedReport?.reportData && (
                <div className="space-y-6 pt-4">
                  <Card className="bg-gradient-to-br from-indigo-100 via-indigo-50 to-white border-3 border-indigo-300 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-900 font-semibold">
                          <span className="text-indigo-700">🔍 Bericht ID:</span> {selectedReport.id} | 
                          <span className="text-indigo-700"> 📄 Berichtsnummer:</span> {selectedReport.reportNumber} |
                          <span className="text-indigo-700"> 📅 Datum:</span> {selectedReport.reportDate || selectedReport.workDate}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedReport.reportData);
                            toast({
                              title: "CSV kopiert",
                              description: "Die CSV-Daten wurden in die Zwischenablage kopiert.",
                            });
                          }}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Kopieren
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-gray-100 via-gray-50 to-white border-3 border-gray-300 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-3xl">💾</span>
                        Rohdaten
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="border-3 border-gray-300 rounded-lg overflow-hidden m-4">
                        <pre className="p-4 bg-gradient-to-br from-gray-50 to-white text-sm font-mono overflow-x-auto whitespace-pre-wrap text-gray-800 max-h-[500px] overflow-y-auto">
                          {selectedReport.reportData}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-300">
                    <Button
                      variant="outline"
                      onClick={() => setShowCSVData(false)}
                      className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
                    >
                      <span className="text-xl mr-2">❌</span> Schließen
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Project Summary Dialog */}
          <Dialog open={showProjectSummary} onOpenChange={(open) => {
            console.log(`🚀 [Dialog] Projekt-Zusammenfassung Dialog wird ${open ? 'geöffnet' : 'geschlossen'}`);
            console.log(`🚀 [Dialog] showProjectSummary State: ${showProjectSummary}, open: ${open}`);
            setShowProjectSummary(open);
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
              <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
                {/* Animated background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                
                <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                  <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                    📊
                  </div>
                  <div className="flex-1">
                    Projekt-Zusammenfassung erstellen
                    <div className="text-xs font-normal text-white/80 mt-1">
                      Wählen Sie ein Projekt aus, um eine druckbare Zusammenfassung aller Berichte zu erstellen
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                {/* Project Selection */}
                <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-3xl">📁</span>
                      Projekt auswählen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedProjectForSummary} onValueChange={(value) => {
                      console.log(`🚀 [Select] Projekt ausgewählt: ${value}`);
                      setSelectedProjectForSummary(value);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Projekt auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Projekte</SelectItem>
                        {projects.map(project => {
                          const projectNumber = project.projectNumber || project.id || `Projekt-${project.id?.substring(0, 8) || 'Unbekannt'}`;
                          const reportCount = reports.filter(r => 
                            String(r.projectNumber || '').trim() === String(projectNumber).trim()
                          ).length;
                          return (
                            <SelectItem key={project.id} value={projectNumber}>
                              {projectNumber} - {project.customerName} ({reportCount} Berichte)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Summary Preview */}
                {selectedProjectForSummary !== 'all' && (
                  <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-3xl">📋</span>
                        Zusammenfassung Vorschau
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        console.log(`🚀 [Preview] Erstelle Vorschau für Projekt: ${selectedProjectForSummary}`);
                        const summary = createProjectSummary(selectedProjectForSummary);
                        console.log(`🚀 [Preview] Summary erstellt:`, summary);
                        if (!summary) return <div className="text-red-600">Keine Berichte für dieses Projekt gefunden.</div>;
                        
                        console.log(`🚀 [Preview] Matrix-Daten:`, {
                          rooms: summary.componentMatrix.rooms,
                          components: summary.componentMatrix.components,
                          dataSize: summary.componentMatrix.data.size
                        });
                        
                        return (
                          <div className="space-y-4">
                            {/* Project Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{summary.totalReports}</div>
                                <div className="text-sm text-gray-600">Gesamt Berichte</div>
                              </div>
                              <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{summary.totalHours}</div>
                                <div className="text-sm text-gray-600">Gesamt Stunden</div>
                              </div>
                              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">{summary.pendingReports}</div>
                                <div className="text-sm text-gray-600">Ausstehend</div>
                              </div>
                              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                                <div className="text-2xl font-bold text-emerald-600">{summary.approvedReports}</div>
                                <div className="text-sm text-gray-600">Genehmigt</div>
                              </div>
                            </div>

                            {/* Employee Stats */}
                            <div>
                              <h4 className="font-semibold mb-2">Mitarbeiter-Statistiken</h4>
                              <div className="space-y-2">
                                {Object.entries(summary.employeeStats).map(([employee, stats]) => (
                                  <div key={employee} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="font-medium">{employee}</span>
                                    <span className="text-sm text-gray-600">
                                      {stats.reports} Berichte, {stats.hours} Stunden
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Monthly Stats */}
                            <div>
                              <h4 className="font-semibold mb-2">Monats-Statistiken</h4>
                              <div className="space-y-2">
                                {Object.entries(summary.monthlyStats).map(([month, stats]) => (
                                  <div key={month} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="font-medium">{month}</span>
                                    <span className="text-sm text-gray-600">
                                      {stats.reports} Berichte, {stats.hours} Stunden
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Component Matrix Preview */}
                            <div>
                              <h4 className="font-semibold mb-2">Komponenten-Matrix Vorschau</h4>
                              <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                                <span className="font-medium">Filter:</span> Berichte ab 14.8.2025 
                                ({summary.componentMatrix.filteredReportsCount} von {summary.componentMatrix.totalReportsCount} Berichten)
                              </div>
                              
                              {/* Debug Info */}
                              <div className="mb-3 p-2 bg-yellow-50 rounded text-xs">
                                <strong>Debug:</strong> Räume: {summary.componentMatrix.rooms.length}, 
                                Komponenten: {summary.componentMatrix.components.length}
                              </div>
                              
                              {summary.componentMatrix.rooms.length === 0 ? (
                                <div className="p-4 bg-red-50 rounded text-red-600">
                                  Keine Räume gefunden! Alle Berichte wurden gefiltert.
                                </div>
                              ) : summary.componentMatrix.components.length === 0 ? (
                                <div className="p-4 bg-red-50 rounded text-red-600">
                                  Keine Komponenten gefunden! Überprüfen Sie die CSV-Daten.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-gray-300 text-xs">
                                    <thead>
                                      <tr>
                                        <th className="border border-gray-300 bg-gray-100 p-2 text-left">Komponente</th>
                                        {summary.componentMatrix.rooms.map(room => (
                                          <th key={room} className="border border-gray-300 bg-blue-100 p-2 text-center">
                                            {room}
                                          </th>
                                        ))}
                                        <th className="border border-gray-300 bg-green-100 p-2 text-center">Gesamt</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {summary.componentMatrix.components.slice(0, 5).map(component => {
                                        const componentData = summary.componentMatrix.data.get(component);
                                        let totalQuantity = 0;
                                        
                                        summary.componentMatrix.rooms.forEach(room => {
                                          const roomData = componentData?.get(room);
                                          if (roomData) {
                                            totalQuantity += roomData.quantity;
                                          }
                                        });
                                        
                                        return (
                                          <tr key={component}>
                                            <td className="border border-gray-300 bg-gray-50 p-2 font-medium">
                                              {component}
                                            </td>
                                            {summary.componentMatrix.rooms.map(room => {
                                              const roomData = componentData?.get(room);
                                              if (roomData && roomData.quantity > 0) {
                                                return (
                                                  <td key={room} className="border border-gray-300 p-2 text-center">
                                                    <div className="font-bold text-blue-600">{roomData.quantity}</div>
                                                    <div className="text-xs text-gray-600">{roomData.reports.length} Ber.</div>
                                                  </td>
                                                );
                                              } else {
                                                return (
                                                  <td key={room} className="border border-gray-300 p-2 text-center text-gray-400">
                                                    -
                                                  </td>
                                                );
                                              }
                                            })}
                                            <td className="border border-gray-300 bg-green-50 p-2 text-center font-bold">
                                              <div className="text-green-700">{totalQuantity}</div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {summary.componentMatrix.components.length > 5 && (
                                        <tr>
                                          <td colSpan={summary.componentMatrix.rooms.length + 2} className="text-center text-gray-500 p-2">
                                            ... und {summary.componentMatrix.components.length - 5} weitere Komponenten
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-600 mt-2">
                                Zeige die ersten 5 von {summary.componentMatrix.components.length} Komponenten. 
                                Vollständige Matrix wird beim Drucken angezeigt.
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowProjectSummary(false)}
                    className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
                  >
                    <span className="text-xl mr-2">❌</span> Abbrechen
                  </Button>
                  {selectedProjectForSummary !== 'all' && (
                    <Button 
                      onClick={() => {
                        printProjectSummary(selectedProjectForSummary);
                        setShowProjectSummary(false);
                      }}
                      className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
                    >
                      <Printer className="h-5 w-5 mr-2" />
                      <span className="text-xl mr-2">🖨️</span> Zusammenfassung drucken
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Aufmaß Dialog */}
          <AufmassDialog
            open={showAufmassDialog}
            onClose={() => setShowAufmassDialog(false)}
            projects={projects.map(p => ({
              id: p.id,
              projectNumber: p.projectNumber,
              name: p.name
            }))}
            onSuccess={(response: GenerateAufmassResponse) => {
              console.log('Aufmaß created successfully:', response);
              toast({
                title: 'Aufmaß erstellt',
                description: `${response.fileName} wurde erfolgreich erstellt (${response.rowCount} Zeilen)`,
              });
              setShowAufmassDialog(false);
            }}
          />
        </div>
      </div>
    </div>
  );


};

// Memoize component to prevent unnecessary re-renders
export default memo(ReportsManagement);
