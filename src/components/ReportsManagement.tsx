import React, { useState, useEffect } from 'react';
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
  Filter, X, EyeOff, BarChart3, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Printer, RefreshCw, Check 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from './AppHeader';
import type { Report, WorkLine } from '@/services/firestoreService';

import { reportService, userService, projectService } from '@/services/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { CSVDataTable } from './CSVDataTable';

// Use consistent types from the types directory
import ReportsStats from './ReportsStats';
import QuickActionButtons from './QuickActionButtons';

interface ReportsManagementProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const ReportsManagement: React.FC<ReportsManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();

  const { toast } = useToast();
  
  // State variables
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showStatistics, setShowStatistics] = useState(false);
  const [sortBy, setSortBy] = useState<string>('workDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [showCSVData, setShowCSVData] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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
  console.log('ðŸ” User permissions:', {
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

  // Load reports
  useEffect(() => {
    const loadReports = async () => {
      try {
        setIsLoadingReports(true);
        
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
            console.log('ðŸ“Š Loading reports from Firestore for concern:', (user as any).concernID);
            
            // ZUERST: Lokale Daten laden/aktualisieren

            const { users, projects } = await loadLocalData();
            
            // DANN: Berichte aus Firestore laden
            const firestoreReports = await reportService.getReportsByConcern((user as any).concernID);

            
            if (firestoreReports && firestoreReports.length > 0) {
              // SCHRITT 1: Verwende die 8 Hauptfelder aus Firestore korrekt

              
              const processedReports = firestoreReports.map(report => {

                console.log('ðŸ” [Step 1] Firestore fields:', {
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
                
                console.log('ðŸ” [Step 2] Available local data:', {
                  usersCount: users.length,
                  projectsCount: projects.length,
                  usersSample: users.slice(0, 2).map(u => ({ uid: u.uid, vorname: u.vorname, nachname: u.nachname })),
                  projectsSample: projects.slice(0, 2).map(p => ({ projectNumber: p.projectNumber, customerName: p.customerName }))
                });

                // 1. Mitarbeitername aus lokaler Datenbank extrahieren (basierend auf mitarbeiterID)
                let employeeName = 'Unbekannt';
                if (report.mitarbeiterID) {
                  try {

                    console.log('ðŸ” [Step 2] Available user IDs:', users.map(u => u.uid));
                    
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

                    console.log('ðŸ” [Step 2] Available projects:', projects.map(p => ({
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

                console.log('ðŸ” [Step 2] Local data linking completed:', {
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

                console.log('ðŸ” [Step 1+2] Processed report with local data:', {
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
                console.log('ðŸ” [DEBUG] pgH8Uh5IE5o1IaTgMt45 report data:', {
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

    loadReports();
  }, [user]);

  // Browser-Neustart erkennen und lokale Daten lö¶schen
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
          console.log('ðŸ“¥ Verwende vorhandene lokale Daten (geladen vor', Math.round(timeSinceLastLoad / 1000 / 60), 'Minuten)');
          const users = JSON.parse(existingUsers);
          const projects = JSON.parse(existingProjects);
          return { users, projects };
        } else {
          console.log('ðŸ“¥ Lokale Daten sind veraltet (ö¤lter als 24 Stunden), lade neu von Firestore');
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

          console.log('ðŸ” [Step 1] Firestore fields:', {
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

              console.log('ðŸ” [Step 2] Available projects from localStorage:', projects.map(p => ({
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
                  const exactMatch = projects.find(p => p.projectNumber === '270289');
                  const exactMatchNum = projects.find(p => p.projectNumber === 270289);
                  const idMatch = projects.find(p => p.id === '270289');
                  const idMatchNum = projects.find(p => p.id === 270289);
                  




                }
              }
            } catch (error) {

            }
          }

          console.log('ðŸ” [Step 2] Local data linking completed:', {
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

          console.log('ðŸ” [Step 1+2] Processed report with local data:', {
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

  // Funktion zum Drucken eines Berichts
  const printReport = (report: Report) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Fehler',
        description: 'Pop-up-Blocker verhindert das ö–ffnen des Druckfensters.',
        variant: 'destructive',
      });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bericht - ${report.reportNumber || report.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-item { margin-bottom: 15px; }
            .info-label { font-weight: bold; color: #666; margin-bottom: 5px; }
            .info-value { font-size: 16px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print { body { margin: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bericht</h1>
            <p>Berichtsnummer: ${report.reportNumber || report.id}</p>
            <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</p>
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
                <div class="info-label">Mitarbeiter</div>
                <div class="info-value">${report.employee || 'Unbekannt'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Mitarbeiternummer</div>
                <div class="info-value">${report.mitarbeiterID || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Kunde</div>
                <div class="info-value">${report.customer || 'Unbekannt'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Berichtsdatum</div>
                <div class="info-value">${report.reportDate || report.workDate || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Standort</div>
                <div class="info-value">${report.workLocation || 'Nicht verfügbar'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Gewerk</div>
                <div class="info-value">${report.activeprojectName || 'Nicht verfügbar'}</div>
              </div>
            </div>
          </div>

          ${report.reportData ? `
          <div class="section">
            <div class="section-title">Berichtsdaten</div>
            <div class="info-item">
              <div class="info-label">Beschreibung</div>
              <div class="info-value">${report.workDescription || 'Keine Beschreibung verfügbar'}</div>
            </div>
            ${report.totalHours ? `
            <div class="info-item">
              <div class="info-label">Gesamtstunden</div>
              <div class="info-value">${report.totalHours} Stunden</div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="footer">
            <p>Generiert von TradrTrackr am ${new Date().toLocaleString('de-DE')}</p>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Drucken
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              SchlieöŸen
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


    console.log('ðŸ” [Parser Selection] CSV data preview:', reportData.substring(0, 100) + '...');

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
  const handleCreateReport = () => {
    if (!newReport.customer || !newReport.projectNumber || !newReport.workLocation || !newReport.workDescription) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    // Parse CSV data if available to extract additional information
    let parsedCSVData = null;
    if (newReport.reportData && newReport.reportData.trim()) {

      parsedCSVData = parseReportData(newReport.reportData, newReport.reportDate);
      
      if (parsedCSVData) {


      } else {

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
      alert(`Bericht erfolgreich erstellt!\n\nAus CSV-Daten extrahiert:\n- Projektnummer: ${parsedCSVData.projectNumber}\n- Mitarbeiter: ${parsedCSVData.employeeName}\n- Arbeitsort: ${parsedCSVData.workLocation}\n- Kunde: ${parsedCSVData.customer}\n- Gewerk: ${parsedCSVData.gewerk}\n- Berichtsnummer: ${parsedCSVData.reportNumber}`);
    } else {
      alert('Bericht erfolgreich erstellt!');
    }
  };

  // Export functionality
  const exportToCSV = () => {
    if (reports.length === 0) return;
    
    const headers = [
      'Berichtsnummer', 'Mitarbeiter', 'Kunde', 'Projektnummer', 'Arbeitsort',
      'Arbeitsdatum', 'Stunden', 'Beschreibung', 'Status'
    ];
    
    const csvData = getFilteredAndSortedReports().map(report => [
      report.reportNumber, report.employee, report.customer, report.projectNumber,
      report.workLocation, report.workDate, report.totalHours, report.workDescription, report.status
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

  // Get filtered and sorted reports
  const getFilteredAndSortedReports = () => {
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
      if (projectFilter !== 'all' && report.projectNumber !== projectFilter) {
        return false;
      }
      
      return true;
    });
    
    // Then sort the filtered reports
    return filteredReports.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Report];
      let bValue: any = b[sortBy as keyof Report];
      
      // Debug sorting values
      if (sortBy === 'workDate') {
        console.log('ðŸ” [SORT DEBUG] Sorting workDate:', {
          a: { id: a.id, workDate: a.workDate, value: aValue, rawValue: a[sortBy as keyof Report] },
          b: { id: b.id, workDate: b.workDate, value: bValue, rawValue: b[sortBy as keyof Report] }
        });
      }
      
      // Handle different data types
      if (sortBy === 'workDate' || sortBy === 'reportDate') {
        // Convert dates to timestamps for comparison
        // Handle various date formats and invalid dates
        if (sortBy === 'workDate') {
          console.log('ðŸ” [DATE DEBUG] Processing workDate values:', {
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
            console.log('ðŸ” [DATE DEBUG] After German parsing:', {
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
  };

  // Debug: Log current state
  console.log('ðŸ” [ReportsManagement] Current state:', {
    reports: reports.length,
    filteredReports: getFilteredAndSortedReports().length,
    reportsData: reports,
    user: user?.email,
    concernID: (user as any)?.concernID,
    canViewReports,
    canManageReports,
    isLoadingReports
  });

  // Debug: Log date values for sorting
  if (reports.length > 0) {
    console.log('ðŸ“… [DEBUG] Date values for sorting:', {
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
          {/* Header */}
          <div className="mb-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-0">
                  Berichtsverwaltung
                </h1>
                <p className="text-gray-600 mb-0">
                  Verwalten Sie Berichte, verfolgen Sie Arbeitszeiten und exportieren Sie Daten
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => loadLocalData(true)}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  title="Lokale Daten neu laden"
                >
                  <Database className="h-5 w-5 mr-2" />
                  Lokale Daten neu laden
                </Button>
                

                
                <Button
                  onClick={reloadReports}
                  variant="outline"
                  disabled={isLoadingReports}
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  title="Berichte neu laden"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isLoadingReports ? 'animate-spin' : ''}`} />
                  {isLoadingReports ? 'Lade...' : 'Berichte neu laden'}
                </Button>
                
                {canManageReports && (
                  <Button
                    onClick={() => setShowNewReportForm(true)}
                    className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Neuer Bericht
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="reports" />

          {/* Statistics */}
          {showStatistics && <ReportsStats reports={reports} user={user} hasPermission={hasPermission} />}

          {/* Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  Berichte ({getFilteredAndSortedReports().length})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatistics(!showStatistics)}
                    className="text-xs h-8 px-3"
                  >
                    {showStatistics ? <EyeOff className="h-3 w-3 mr-1" /> : <BarChart3 className="h-3 w-3 mr-1" />}
                    {showStatistics ? 'Statistiken ausblenden' : 'Statistiken'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="text-xs h-8 px-3"
                  >
                    <Download className="h-5 w-5 mr-1" />
                    Export CSV
                  </Button>

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
              </CardTitle>
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
                    <SelectItem value="PRJ-2024-001">PRJ-2024-001 - München Immobilien GmbH</SelectItem>
                    <SelectItem value="PRJ-2024-002">PRJ-2024-002 - Hamburg Wohnbau AG</SelectItem>
                    <SelectItem value="PRJ-2024-003">PRJ-2024-003 - Berlin Shopping Center GmbH</SelectItem>
                    <SelectItem value="PRJ-2024-004">PRJ-2024-004 - Frankfurt Krankenhaus Stiftung</SelectItem>
                    <SelectItem value="PRJ-2024-005">PRJ-2024-005 - Kö¶ln Schulamt</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                    <SelectItem value="Max Mustermann">Max Mustermann</SelectItem>
                    <SelectItem value="Anna Schmidt">Anna Schmidt</SelectItem>
                    <SelectItem value="Tom Weber">Tom Weber</SelectItem>
                    <SelectItem value="Lisa Müller">Lisa Müller</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-3 text-gray-400" />
                  <Input
                    placeholder="Suchen..."
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
                    <SelectItem value="approved">Genehmigt</SelectItem>
                    <SelectItem value="rejected">Abgelehnt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          {viewMode === 'table' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => handleSortColumn('reportNumber')} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          Berichtsnummer
                          {getSortIcon('reportNumber')}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSortColumn('employee')} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          Mitarbeiter
                          {getSortIcon('employee')}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSortColumn('customer')} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          Kunde
                          {getSortIcon('customer')}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSortColumn('projectNumber')} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          Projektnummer
                          {getSortIcon('projectNumber')}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSortColumn('workDate')} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          Arbeitsdatum
                          {getSortIcon('workDate')}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSortColumn('totalHours')} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          Stunden
                          {getSortIcon('totalHours')}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSortColumn('status')} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-12 w-12 text-gray-400" />
                            <p className="text-gray-500">Keine Berichte gefunden</p>
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
                      getFilteredAndSortedReports().map((report) => (
                        <TableRow 
                          key={report.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowReportDetails(true);
                          }}
                        >
                          <TableCell className="font-medium">{report.reportNumber}</TableCell>
                          <TableCell>{report.employee}</TableCell>
                          <TableCell>{report.customer}</TableCell>
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
                                  e.stopPropagation(); // Verhindert, dass der Row-Click ausgelö¶st wird
                                  setSelectedReport(report);
                                  setShowReportDetails(true);
                                }}
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
              </CardContent>
            </Card>
          )}

          {/* Reports Cards */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">Keine Berichte gefunden</p>
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
                </div>
              ) : (
                getFilteredAndSortedReports().map((report) => (
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
                        <span className="text-sm">{report.workLocation}</span>
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
                            e.stopPropagation(); // Verhindert, dass der Card-Click ausgelö¶st wird
                            setSelectedReport(report);
                            setShowReportDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details anzeigen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Report Details Dialog */}
          <Dialog open={showReportDetails} onOpenChange={setShowReportDetails}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Bericht Details</DialogTitle>
                  <div className="pr-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedReport) {
                          printReport(selectedReport);
                        }
                      }}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Drucken
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              {selectedReport && (
                <div className="space-y-6">
                  {/* Debug Information */}
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="text-xs text-yellow-700 p-3">
                      <div><strong>ID:</strong> {selectedReport.id}</div>
                    </CardContent>
                  </Card>

                  {/* Basic Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Grundinformationen</CardTitle>
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
                          <p className="text-base font-semibold">{selectedReport.workLocation || 'Nicht verfügbar'}</p>
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
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Genehmigen
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRejectReport(selectedReport.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={isUpdatingStatus}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Ablehnen
                              </Button>
                          </div>
                          )}
                          
                          {/* Status Info für genehmigte/abgelehnte Berichte */}
                          {selectedReport.status !== 'pending' && (
                            <div className="ml-4 text-xs text-gray-500">
                              {selectedReport.status === 'approved' ? 'âœ… Bericht wurde genehmigt' : 'âŒ Bericht wurde abgelehnt'}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Work Lines */}
                  {selectedReport.workLines && selectedReport.workLines.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Arbeitszeilen</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Zeile</TableHead>
                              <TableHead>Komponente</TableHead>
                              <TableHead>Arbeit</TableHead>
                              <TableHead>Menge</TableHead>
                              <TableHead>Stunden</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedReport.workLines.map((line, index) => (
                              <TableRow key={index}>
                                                                 <TableCell>{line.linenumber || index + 1}</TableCell>
                                <TableCell>{line.component}</TableCell>
                                <TableCell>{line.workDone}</TableCell>
                                <TableCell>{line.quantity}</TableCell>
                                <TableCell>{line.hours}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* CSV Data Table */}
                  {selectedReport.reportData && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <span>Bericht</span>
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
                                    console.log('âš ï¸ [Legacy Mode] Nicht genug Spalten für Standort (Spalte 11)');
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
                                    console.log('âš ï¸ [Modern Mode] Gewerk-Index', gewerkIndex, 'ist auöŸerhalb des gültigen Bereichs (0-' + (lastRow.columns.length - 1) + ')');
                                  }
                                  
                                  if (standortIndex >= 0 && standortIndex < lastRow.columns.length) {
                                    const standortValue = lastRow.columns[standortIndex];
                                    if (standortValue && standortValue.trim() !== '') {
                                      selectedReport.workLocation = standortValue;

                                    } else {

                                    }
                                  } else {
                                    console.log('âš ï¸ [Modern Mode] Standort-Index', standortIndex, 'ist auöŸerhalb des gültigen Bereichs (0-' + (lastRow.columns.length - 1) + ')');
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
                                      {parsedData.slice(0, 20).map((row, index) => {
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
                                  {parsedData.length > 20 && (
                                    <div className="mt-3 text-center text-sm text-gray-500">
                                      Zeige {parsedData.length - 20} weitere Zeilen... (Gesamt: {parsedData.length})
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
                            return (
                              <div className="text-sm text-red-600">
                                Fehler beim Parsen der CSV-Daten: {error.message}
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
                      SchlieöŸen
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* New Report Form Dialog */}
          <Dialog open={showNewReportForm} onOpenChange={setShowNewReportForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neuen Bericht erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie einen neuen Bericht mit allen notwendigen Informationen.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateReport();
              }}>
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Grundinformationen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customer">Kunde *</Label>
                          <Input
                            id="customer"
                            value={newReport.customer}
                            onChange={(e) => setNewReport({ ...newReport, customer: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="projectNumber">Projektnummer *</Label>
                          <Input
                            id="projectNumber"
                            value={newReport.projectNumber}
                            onChange={(e) => setNewReport({ ...newReport, projectNumber: e.target.value })}
                            required
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
                  <Card>
                    <CardHeader>
                      <CardTitle>CSV-Daten (pgH8Uh5IE5o1IaTgMt45 Template)</CardTitle>
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
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowNewReportForm(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit">
                    Bericht erstellen
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* CSV Data Dialog */}
          <Dialog open={showCSVData} onOpenChange={setShowCSVData}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>CSV Rohdaten - {selectedReport?.reportNumber}</DialogTitle>
                <DialogDescription>
                  Rohe CSV-Daten für diesen Bericht. Diese Daten werden für das Parsing verwendet.
                </DialogDescription>
              </DialogHeader>
              
              {selectedReport?.reportData && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Bericht ID:</span> {selectedReport.id} | 
                      <span className="font-medium"> Berichtsnummer:</span> {selectedReport.reportNumber} |
                      <span className="font-medium"> Datum:</span> {selectedReport.reportDate || selectedReport.workDate}
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
                    >
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Kopieren
                    </Button>
                  </div>
                  
                  <Card>
                    <CardContent className="p-0">
                      <pre className="p-4 bg-gray-50 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                        {selectedReport.reportData}
                      </pre>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCSVData(false)}
                    >
                      SchlieöŸen
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );


};

export default ReportsManagement;
