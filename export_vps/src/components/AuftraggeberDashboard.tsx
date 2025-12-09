import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Eye, CheckCircle, XCircle, Clock, Calendar, DollarSign, Users, MapPin, LogOut, Table as TableIcon, Package, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AuftraggeberDashboardProps } from '@/types';

const AuftraggeberDashboard: React.FC<AuftraggeberDashboardProps> = ({ onBack }) => {
  const { user, isDemoUser, logout, hasPermission } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [reportApprovals, setReportApprovals] = useState<{[key: string]: 'pending' | 'approved' | 'rejected'}>({});
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {


    console.log('ðŸš€ Is Demo User:', isDemoUser());
    
    // For demo users, always load demo data
    // For real users, check if they have a project assigned
    if (isDemoUser()) {
      loadProjectData();
      loadReportApprovals();
    } else {

      setError('Kein Projekt zugewiesen. Bitte kontaktieren Sie den Administrator.');
      setLoading(false);
    }
  }, [user, isDemoUser]);

  const loadReportApprovals = () => {
    try {
      const savedApprovals = localStorage.getItem('reportApprovals');
      if (savedApprovals) {
        setReportApprovals(JSON.parse(savedApprovals));
      }
    } catch (err) {

    }
  };

  const saveReportApprovals = (approvals: {[key: string]: 'pending' | 'approved' | 'rejected'}) => {
    try {
      localStorage.setItem('reportApprovals', JSON.stringify(approvals));
    } catch (err) {

    }
  };

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Only generate demo data for demo users
      if (isDemoUser()) {
        // Load project data from localStorage for demo users
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) {
          const projects = JSON.parse(savedProjects);
          const userProject = projects.find((p: any) => p.id === 'demo-project-1');
          
          if (userProject) {
            setProject(userProject);
            await loadReportsForProject(userProject.id);
          } else {
            // Project not found, create a demo project for demo user

            generateDemoProject();
          }
        } else {
          // No projects exist, generate demo project for demo user

          generateDemoProject();
        }
      } else {
        // For real users, show message that no project is assigned
        setError('Kein Projekt zugewiesen. Bitte kontaktieren Sie den Administrator.');
        setLoading(false);
      }
    } catch (err) {

      setError('Fehler beim Laden der Projektdaten');
    } finally {
      setLoading(false);
    }
  };

  const generateDemoProject = () => {
    const demoProject = {
      id: 'demo-project-1',
      projectNumber: 'PRJ-2024-005',
      name: 'Schule Köln - Elektroinstallation',
      description: 'Vollständige Elektroinstallation für die neue Grundschule in Köln',
      status: 'active',
      priority: 'high',
      startDate: '2024-01-15',
      plannedEndDate: '2024-11-30',
      actualEndDate: null,
      budget: '125000',
      assignedEmployees: ['Max Mustermann', 'Anna Schmidt'],
      location: 'Köln, Schulstraße 5',
      progress: 65
    };
    
    setProject(demoProject);
    
    // Generate demo reports
    generateDemoReports(demoProject.id);
  };

  const generateDemoReports = async (projectId: string) => {
    const demoReports = [
      {
        id: 'REP-001',
        employee: 'Max Mustermann',
        date: '2024-01-15',
        hours: 7.5,
        workDescription: 'Baustelleneinrichtung, Materiallager aufgebaut, Hauptverteiler montiert, Grundleitungen verlegt (50m), Sicherungskasten installiert',
        status: 'approved',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-002',
        employee: 'Anna Schmidt',
        date: '2024-01-16',
        hours: 8.0,
        workDescription: 'Steckdosen (24 Stück) und Schalter (12 Stück) im Erdgeschoss installiert, Unterputzdosen gesetzt, Kabelkanö¤le verlegt',
        status: 'approved',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-003',
        employee: 'Max Mustermann',
        date: '2024-01-17',
        hours: 6.5,
        workDescription: 'Beleuchtungsanlage im Hauptflur installiert (8 LED-Panels), Bewegungsmelder montiert, Schaltplan erstellt',
        status: 'approved',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-004',
        employee: 'Anna Schmidt',
        date: '2024-01-18',
        hours: 7.0,
        workDescription: 'Steckdosen (18 Stück) und Schalter (8 Stück) im 1. Obergeschoss installiert, Netzwerkdosen vorbereitet',
        status: 'approved',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-005',
        employee: 'Max Mustermann',
        date: '2024-01-19',
        hours: 8.0,
        workDescription: 'Beleuchtungsanlage im 1. Obergeschoss installiert (12 LED-Panels), Notbeleuchtung montiert, Prüfung durchgeführt',
        status: 'approved',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-006',
        employee: 'Anna Schmidt',
        date: '2024-01-20',
        hours: 6.0,
        workDescription: 'Steckdosen (16 Stück) und Schalter (6 Stück) im 2. Obergeschoss installiert, Kabelkanö¤le verlegt',
        status: 'pending',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-007',
        employee: 'Max Mustermann',
        date: '2024-01-21',
        hours: 7.5,
        workDescription: 'Beleuchtungsanlage im 2. Obergeschoss installiert (10 LED-Panels), Bewegungsmelder montiert, Schaltplan erstellt',
        status: 'pending',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-008',
        employee: 'Anna Schmidt',
        date: '2024-01-22',
        hours: 8.0,
        workDescription: 'Steckdosen (20 Stück) und Schalter (10 Stück) im Keller installiert, Feuchtigkeitsgeschützte Ausführung',
        status: 'pending',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-009',
        employee: 'Max Mustermann',
        date: '2024-01-23',
        hours: 6.5,
        workDescription: 'Beleuchtungsanlage im Keller installiert (6 LED-Panels), Notbeleuchtung montiert, Prüfung durchgeführt',
        status: 'pending',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-010',
        employee: 'Anna Schmidt',
        date: '2024-01-24',
        hours: 7.0,
        workDescription: 'Steckdosen (14 Stück) und Schalter (8 Stück) im Lehrerzimmer installiert, Netzwerkdosen montiert',
        status: 'pending',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-011',
        employee: 'Max Mustermann',
        date: '2024-01-25',
        hours: 8.0,
        workDescription: 'Beleuchtungsanlage im Lehrerzimmer installiert (4 LED-Panels), Dimmer montiert, Schaltplan erstellt',
        status: 'pending',
        location: 'Köln, Schulstraße 5'
      },
      {
        id: 'REP-012',
        employee: 'Anna Schmidt',
        date: '2024-01-26',
        hours: 6.5,
        workDescription: 'Steckdosen (22 Stück) und Schalter (12 Stück) in den Klassenrö¤umen installiert, Kabelkanö¤le verlegt',
        status: 'pending',
        location: 'Köln, Schulstraße 5'
      }
    ];


    setReports(demoReports);
    
    // First, remove any existing reports for this project to avoid duplicates
    const existingReports = localStorage.getItem('reports');
    let allReports = existingReports ? JSON.parse(existingReports) : [];
    
    // Filter out existing reports for this project
    allReports = allReports.filter((r: any) => r.projectId !== projectId);
    
    // Add new demo reports
    const projectReports = demoReports.map(r => ({ ...r, projectId }));
    allReports.push(...projectReports);
    
    localStorage.setItem('reports', JSON.stringify(allReports));

  };

  const loadReportsForProject = async (projectId: string) => {
    try {
      const savedReports = localStorage.getItem('reports');
      if (savedReports) {
        const allReports = JSON.parse(savedReports);
        const projectReports = allReports.filter((r: any) => r.projectId === projectId);

        setReports(projectReports);
      } else {

        setReports([]);
      }
    } catch (err) {

      setReports([]);
    }
  };

  const handleReportApproval = (reportId: string, status: 'approved' | 'rejected') => {
    const newApprovals = { ...reportApprovals, [reportId]: status };
    setReportApprovals(newApprovals);
    saveReportApprovals(newApprovals);
  };

  const calculateProgress = () => {
    if (!project) return 0;
    return project.progress || 0;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  };

  const handleSortColumn = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const sortedReports = [...reports].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'employee':
        aValue = a.employee.toLowerCase();
        bValue = b.employee.toLowerCase();
        break;
      case 'hours':
        aValue = a.hours;
        bValue = b.hours;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        aValue = a.date;
        bValue = b.date;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          <p className="mt-4 text-white text-lg">Lade Projektdaten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Fehler: </strong>
            <span className="block sm:inline">{error}</span>
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

  if (!project) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue flex items-center justify-center">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Kein Projekt: </strong>
            <span className="block sm:inline">Sie haben kein Projekt zugewiesen bekommen.</span>
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
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Auftraggeber Dashboard</h1>
                <p className="text-gray-700">Übersicht über Ihr Projekt</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                size="lg"
                variant="outline"
                onClick={logout}
                className="bg-red-600 text-white hover:bg-red-700 border-2 border-red-600 font-semibold px-6 py-3"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>

        {/* Project Overview Card */}
        <Card className="mb-8 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <MapPin className="h-6 w-6 text-blue-600" />
              {project?.name || 'Projekt'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Projektnummer</div>
                <div className="text-lg font-semibold">{project?.projectNumber || 'N/A'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div className="flex items-center gap-2">
                  <Badge variant={project?.status === 'active' ? 'default' : 'secondary'}>
                    {project?.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Fortschritt</div>
                <div className="flex items-center gap-2">
                  <Progress value={project?.progress || 0} className="flex-1" />
                  <span className="text-sm font-medium">{project?.progress || 0}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Startdatum</div>
                <div className="text-lg">{project?.startDate || 'N/A'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Geplantes Enddatum</div>
                <div className="text-lg">{project?.plannedEndDate || 'N/A'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Standort</div>
                <div className="text-lg">{project?.location || 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Section - Main Focus */}
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Arbeitsberichte ({reports.length})</h2>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="bg-white text-blue-600 hover:bg-blue-50 border-blue-200"
              >
                <TableIcon className="h-4 w-4 mr-1" />
                Tabelle
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="bg-white text-blue-600 hover:bg-blue-50 border-blue-200"
              >
                <Package className="h-4 w-4 mr-1" />
                Karten
              </Button>
            </div>
          </div>
        </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('date')}
                        >
                          <div className="flex items-center gap-2">
                            Datum
                            {getSortIcon('date')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('employee')}
                        >
                          <div className="flex items-center gap-2">
                            Mitarbeiter
                            {getSortIcon('employee')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('hours')}
                        >
                          <div className="flex items-center gap-2">
                            Stunden
                            {getSortIcon('hours')}
                          </div>
                        </TableHead>
                        <TableHead>Standort</TableHead>
                        <TableHead>Arbeitsbeschreibung</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedReports.map((report) => (
                        <TableRow 
                          key={report.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewReport(report)}
                        >
                          <TableCell>
                            {new Date(report.date).toLocaleDateString('de-DE')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {report.employee}
                          </TableCell>
                          <TableCell className="text-center">
                            {report.hours}h
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[150px] truncate" title={report.location}>
                              {report.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={report.workDescription}>
                              {report.workDescription}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(report.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReport(report);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {report.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReportApproval(report.id, 'approved');
                                    }}
                                    className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReportApproval(report.id, 'rejected');
                                    }}
                                    className="h-8 w-8 p-0 border-red-200 text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedReports.map((report) => (
                <Card 
                  key={report.id} 
                  className="bg-white/95 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewReport(report)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{report.workDescription}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.status)}
                        <Badge variant="outline" className="text-xs">
                          {report.hours}h
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Mitarbeiter:</span>
                        <div className="font-semibold">{report.employee}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Datum:</span>
                        <div className="font-semibold">{new Date(report.date).toLocaleDateString('de-DE')}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Arbeitszeit:</span>
                        <div className="font-semibold">{report.hours} Stunden</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Standort:</span>
                        <div className="font-semibold">{report.location}</div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-500">Arbeitsbeschreibung:</span>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                        {report.workDescription}
                      </div>
                    </div>

                    {/* Approval Actions */}
                    {report.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <span className="text-sm font-medium text-gray-500">Genehmigung:</span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReportApproval(report.id, 'approved');
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Genehmigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReportApproval(report.id, 'rejected');
                          }}
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Ablehnen
                        </Button>
                      </div>
                    )}

                    {/* Status Display */}
                    {report.status !== 'pending' && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">Status:</span>
                          {report.status === 'approved' ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">Genehmigt</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="font-medium">Abgelehnt</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Reports Message */}
          {reports.length === 0 && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Keine Berichte verfügbar</h3>
                  <p>Es wurden noch keine Arbeitsberichte für dieses Projekt erstellt.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Report Details Modal */}
        {selectedReport && showReportDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Bericht Details</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowReportDetails(false)}
                  size="sm"
                >
                  SchlieöŸen
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Datum:</span>
                      <span>{new Date(selectedReport.date).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Arbeitsstunden:</span>
                      <span>{selectedReport.hours}h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Standort:</span>
                      <span>{selectedReport.location}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Mitarbeiter:</span>
                      <span>{selectedReport.employee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Status:</span>
                      <span>{getStatusBadge(selectedReport.status)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="font-medium text-gray-700 mb-2">Arbeitsbeschreibung:</div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    {selectedReport.workDescription}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuftraggeberDashboard;
