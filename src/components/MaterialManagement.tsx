import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, User, Building, MapPin, X, Clock, Calendar, CheckCircle, XCircle, AlertCircle, Search, Download, Filter, BarChart3, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Truck, Box, Plus, Edit, Trash2, FileText, Printer, FileSpreadsheet, TrendingUp, AlertTriangle, Table as TableIcon, FolderOpen, CheckSquare, BarChart3 as BarChartIcon, User as UserIcon, Building2, ClipboardList, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from './AppHeader';

import { Material, MaterialManagementProps } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';
import { cleanupDemoData } from '@/utils/demoDataCleanup';
import QuickActionButtons from './QuickActionButtons';

const MaterialManagement: React.FC<MaterialManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projects, setProjects] = useState<Array<{id: string, projectNumber: string, name: string}>>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMaterialDetails, setShowMaterialDetails] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showEditMaterial, setShowEditMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStatistics, setShowStatistics] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'financial'>('summary');
  const [newMaterialForm, setNewMaterialForm] = useState({
    materialNumber: '',
    partNumber: '',
    name: '',
    category: '',
    projectNumber: '',
    workLocation: '',
    manufacturer: '',
    supplier: '',
    employee: '',
    quantity: 1,
    unit: 'Stück',
    unitPrice: 0,
    notes: ''
  });

  const { isQuickAction, quickActionType } = useQuickAction();

  // Check permissions
  const canViewMaterials = hasPermission('view_materials') || hasPermission('view_reports');
  const canManageMaterials = hasPermission('create_material') || hasPermission('edit_material') || hasPermission('delete_material') || user?.role === 'auftraggeber';

  // Clean up demo data for authenticated users
  useEffect(() => {
    if (user) {

      cleanupDemoData();
      setMaterials([]);
    }
  }, [user]);

  // Materials state - empty for authenticated users, demo data for non-authenticated users
  const [materials, setMaterials] = useState<Material[]>(() => {
    // Only show demo data for non-authenticated users
    if (user) {
      return [];
    }
    
    return [
      {
        id: '1',
        materialNumber: 'MAT-2024-001-01',
        partNumber: 'LED-PANEL-24W',
        name: 'LED-Beleuchtungsset',
        category: 'Beleuchtung',
        manufacturer: 'Philips Lighting',
        supplier: 'Elektro-Handel München',
        projectNumber: 'PRJ-2024-001',
        workLocation: 'München, MaximilianstraöŸe 1',
        quantity: 24,
        unit: 'Stück',
        unitPrice: 45.50,
        totalPrice: 1092.00,
        status: 'delivered',
        orderDate: '2024-01-10',
        deliveryDate: '2024-01-12',
        notes: 'Dimmbare LED-Panels für Konferenzraum',
        employee: 'Anna Schmidt'
      },
      {
        id: '2',
        materialNumber: 'MAT-2024-001-02',
        partNumber: 'HV-400A-3P',
        name: 'Hauptverteiler',
        category: 'Elektroinstallation',
        manufacturer: 'Siemens AG',
        supplier: 'Siemens AG',
        projectNumber: 'PRJ-2024-001',
        workLocation: 'München, MaximilianstraöŸe 1',
        quantity: 1,
        unit: 'Stück',
        unitPrice: 1250.00,
        totalPrice: 1250.00,
        status: 'installed',
        orderDate: '2024-01-08',
        deliveryDate: '2024-01-10',
        notes: '400A Hauptverteiler mit Sicherungen',
        employee: 'Max Mustermann'
      },
      {
        id: '3',
        materialNumber: 'MAT-2024-001-03',
        partNumber: 'KNX-ACT-16CH',
        name: 'KNX-System Komponenten',
        category: 'Smart Home',
        manufacturer: 'Gira Systemtechnik',
        supplier: 'Gira Systemtechnik',
        projectNumber: 'PRJ-2024-001',
        workLocation: 'München, MaximilianstraöŸe 1',
        quantity: 15,
        unit: 'Stück',
        unitPrice: 89.90,
        totalPrice: 1348.50,
        status: 'ordered',
        orderDate: '2024-01-20',
        notes: 'KNX-Aktoren und Sensoren für Chefetage',
        employee: 'Tom Weber'
      },
      {
        id: '4',
        materialNumber: 'MAT-2024-002-01',
        partNumber: 'HK-2000-600',
        name: 'Heizkö¶rper',
        category: 'Heizung',
        manufacturer: 'Viessmann Deutschland',
        supplier: 'Viessmann Deutschland',
        projectNumber: 'PRJ-2024-002',
        workLocation: 'Hamburg, Altonaer StraöŸe 15',
        quantity: 8,
        unit: 'Stück',
        unitPrice: 320.00,
        totalPrice: 2560.00,
        status: 'delivered',
        orderDate: '2024-01-15',
        deliveryDate: '2024-01-18',
        notes: 'Moderne Heizkö¶rper mit Thermostaten',
        employee: 'Anna Schmidt'
      },
      {
        id: '5',
        materialNumber: 'MAT-2024-002-02',
        partNumber: 'GROHE-ESSENCE',
        name: 'Sanitö¤rarmaturen',
        category: 'Sanitö¤r',
        manufacturer: 'Grohe AG',
        supplier: 'Grohe AG',
        projectNumber: 'PRJ-2024-002',
        workLocation: 'Hamburg, Altonaer StraöŸe 15',
        quantity: 12,
        unit: 'Stück',
        unitPrice: 180.00,
        totalPrice: 2160.00,
        status: 'installed',
        orderDate: '2024-01-12',
        deliveryDate: '2024-01-15',
        notes: 'Wasserhö¤hne und Duscharmaturen',
        employee: 'Max Mustermann'
      }
    ];
  });

  // Load materials and projects from localStorage
  useEffect(() => {
    const loadMaterials = () => {
      const savedMaterials = localStorage.getItem('materials');
      if (savedMaterials) {
        setMaterials(JSON.parse(savedMaterials));
      }
    };

    const loadProjects = () => {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    };

    loadMaterials();
    loadProjects();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadMaterials();
      loadProjects();
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'material') {
      setShowAddMaterial(true);
    }
  }, [isQuickAction, quickActionType]);

  if (!canViewMaterials) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Materialverwaltung" 
          showBackButton={true} 
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Zugriff verweigert</h2>
              <p className="text-gray-600">Sie haben keine Berechtigung, Materialien anzuzeigen.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredMaterials = materials.filter(material => {
    const matchesSearchTerm = material.materialNumber.includes(searchTerm) ||
                              material.name.includes(searchTerm) ||
                              material.projectNumber.includes(searchTerm) ||
                              material.workLocation.includes(searchTerm) ||
                              material.supplier.includes(searchTerm) ||
                              material.employee.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || material.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || material.projectNumber === projectFilter;
    return matchesSearchTerm && matchesStatus && matchesCategory && matchesProject;
  });

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const aValue = a[sortBy as keyof Material];
    const bValue = b[sortBy as keyof Material];
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate statistics
  const statistics = {
    total: materials.length,
    ordered: materials.filter(m => m.status === 'ordered').length,
    delivered: materials.filter(m => m.status === 'delivered').length,
    installed: materials.filter(m => m.status === 'installed').length,
    returned: materials.filter(m => m.status === 'returned').length,
    totalValue: materials.reduce((sum, m) => sum + m.totalPrice, 0),
    averageValue: materials.length > 0 ? materials.reduce((sum, m) => sum + m.totalPrice, 0) / materials.length : 0
  };

  const handleAddMaterial = () => {
    setShowAddMaterial(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setShowEditMaterial(true);
  };

  const handleViewMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialDetails(true);
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleSaveMaterial = () => {
    if (newMaterialForm.materialNumber && newMaterialForm.name && newMaterialForm.quantity > 0) {
      const newMaterial: Material = {
        id: Date.now().toString(),
        materialNumber: newMaterialForm.materialNumber,
        partNumber: newMaterialForm.partNumber,
        name: newMaterialForm.name,
        category: newMaterialForm.category,
        supplier: newMaterialForm.supplier,
        manufacturer: newMaterialForm.manufacturer,
        projectNumber: newMaterialForm.projectNumber,
        workLocation: newMaterialForm.workLocation,
        quantity: newMaterialForm.quantity,
        unit: newMaterialForm.unit,
        unitPrice: newMaterialForm.unitPrice,
        totalPrice: newMaterialForm.quantity * newMaterialForm.unitPrice,
        status: 'ordered',
        orderDate: new Date().toISOString().split('T')[0],
        notes: newMaterialForm.notes,
        employee: user ? `${user.firstName} ${user.lastName}` : 'Unbekannt'
      };
      
      setMaterials([...materials, newMaterial]);
      
      // Reset form
      setNewMaterialForm({
        materialNumber: '',
        partNumber: '',
        name: '',
        category: '',
        projectNumber: '',
        workLocation: '',
        manufacturer: '',
        supplier: '',
        employee: '',
        quantity: 1,
        unit: 'Stück',
        unitPrice: 0,
        notes: ''
      });
      
      setShowAddMaterial(false);
    }
  };

  const handleSaveEdit = () => {
    if (editingMaterial) {
      setMaterials(materials.map(m => 
        m.id === editingMaterial.id ? editingMaterial : m
      ));
      setShowEditMaterial(false);
      setEditingMaterial(null);
    }
  };

  const handleCancel = () => {
    setShowAddMaterial(false);
    setShowEditMaterial(false);
    setSelectedMaterial(null);
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
    if (sortBy !== column) return <ArrowUpDown className="h-5 w-5 text-gray-400" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-5 w-5 text-blue-600" /> : <ArrowDown className="h-5 w-5 text-blue-600" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ordered: 'default',
      delivered: 'success',
      installed: 'info',
      returned: 'warning'
    };
    const labels = {
      ordered: 'Bestellt',
      delivered: 'Geliefert',
      installed: 'Installiert',
      returned: 'Zurückgegeben'
    };
    return <Badge variant={variants[status as keyof typeof variants] as any}>{labels[status as keyof typeof labels]}</Badge>;
  };

  const handleExport = () => {
    // Export functionality

  };



  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Materialverwaltung" 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
              <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Materialverwaltung
                  </h1>
                  <p className="text-gray-600">
                    Verwalten Sie Materialien, Bestellungen und Lieferungen
                  </p>
                  {hasPermission('view_own_materials') && !hasPermission('view_all_materials') && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700">
                        <Eye className="h-5 w-5 inline mr-1" />
                        Sie haben nur Lesezugriff auf Ihre eigenen Materialien.
                      </p>
                    </div>
                  )}
                </div>
                {canManageMaterials && (
                  <Button 
                    onClick={() => setShowAddMaterial(true)}
                    className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Neues Material
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="materials" />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="tradetrackr-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {hasPermission('view_own_materials') && !hasPermission('view_all_materials') ? 'Meine Materialien' : 'Gesamt Materialien'}
                  </CardTitle>
                  <Package className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                      ? materials.filter(material => material.employee === user?.firstName + ' ' + user?.lastName).length
                      : materials.length
                    }
                  </div>
                </CardContent>
              </Card>
              
              <Card className="tradetrackr-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Bestellt</CardTitle>
                  <Clock className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                      ? materials.filter(material => material.status === 'ordered' && material.employee === user?.firstName + ' ' + user?.lastName).length
                      : materials.filter(material => material.status === 'ordered').length
                    }
                  </div>
                </CardContent>
            </Card>
              
              <Card className="tradetrackr-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Geliefert</CardTitle>
                  <Truck className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                      ? materials.filter(material => material.status === 'delivered' && material.employee === user?.firstName + ' ' + user?.lastName).length
                      : materials.filter(material => material.status === 'delivered').length
                    }
                  </div>
                </CardContent>
            </Card>
              
              <Card className="tradetrackr-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Installiert</CardTitle>
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                      ? materials.filter(material => material.status === 'installed' && material.employee === user?.firstName + ' ' + user?.lastName).length
                      : materials.filter(material => material.status === 'installed').length
                    }
                  </div>
                </CardContent>
            </Card>
          </div>

            {/* Statistics Card */}
          {showStatistics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Materialstatistiken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                    <div className="text-sm text-gray-600">Gesamt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{statistics.ordered}</div>
                    <div className="text-sm text-gray-600">Bestellt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.delivered}</div>
                    <div className="text-sm text-gray-600">Geliefert</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.installed}</div>
                    <div className="text-sm text-gray-600">Installiert</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">â‚¬{statistics.totalValue.toFixed(0)}</div>
                    <div className="text-sm text-gray-600">Gesamtwert</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">â‚¬{statistics.averageValue.toFixed(0)}</div>
                    <div className="text-sm text-gray-600">ö˜ Wert</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controls Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>
                    Materialien ({filteredMaterials.length})
                  </CardTitle>
                  {projectFilter !== 'all' && (
                    <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                      Gefiltert für: {projectFilter}
                    </Badge>
                  )}
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
                    onClick={handleExport}
                    className="text-xs h-8 px-3"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
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
                    <Package className="h-4 w-3 mr-1" />
                    Karten
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    <SelectItem value="Beleuchtung">Beleuchtung</SelectItem>
                    <SelectItem value="Elektroinstallation">Elektroinstallation</SelectItem>
                    <SelectItem value="Smart Home">Smart Home</SelectItem>
                    <SelectItem value="Heizung">Heizung</SelectItem>
                    <SelectItem value="Sanitö¤r">Sanitö¤r</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Nach Material, Beschreibung oder Mitarbeiter suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>



              {/* Clear Filters */}
              {(projectFilter !== 'all' || searchTerm || categoryFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProjectFilter('all');
                      setSearchTerm('');
                      setCategoryFilter('all');
                    }}
                    className="text-xs h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Alle Filter zurücksetzen
                  </Button>
                </div>
              )}

              {/* Materials Grid */}
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || projectFilter !== 'all' ? 
                    'Keine Materialien mit den aktuellen Filtern gefunden.' : 
                    'Keine Materialien gefunden.'
                  }
                </div>
              ) : (
                <>


                  {/* Table View */}
                  {viewMode === 'table' && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('projectNumber')}
                            >
                              <div className="flex items-center gap-1">
                                Projekt {getSortIcon('projectNumber')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('materialNumber')}
                            >
                              <div className="flex items-center gap-1">
                                Materialnummer {getSortIcon('materialNumber')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('name')}
                            >
                              <div className="flex items-center gap-1">
                                Name {getSortIcon('name')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('category')}
                            >
                              <div className="flex items-center gap-1">
                                Kategorie {getSortIcon('category')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('status')}
                            >
                              <div className="flex items-center gap-1">
                                Status {getSortIcon('status')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('quantity')}
                            >
                              <div className="flex items-center gap-1">
                                Menge {getSortIcon('quantity')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('totalPrice')}
                            >
                              <div className="flex items-center gap-1">
                                Preis {getSortIcon('totalPrice')}
                              </div>
                            </TableHead>
                            <TableHead className="w-20">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedMaterials.map((material) => (
                            <TableRow 
                              key={material.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleViewMaterial(material)}
                            >
                              <TableCell className="font-mono text-sm">
                                {material.projectNumber}
                              </TableCell>
                              <TableCell className="font-medium text-blue-600">
                                {material.materialNumber}
                              </TableCell>
                              <TableCell className="font-medium">
                                {material.name}
                              </TableCell>
                              <TableCell>{material.category}</TableCell>
                              <TableCell>
                                {getStatusBadge(material.status)}
                              </TableCell>
                              <TableCell className="text-center">
                                {material.quantity} {material.unit}
                              </TableCell>
                              <TableCell className="font-medium">
                                â‚¬{material.totalPrice.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditMaterial(material);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMaterial(material.id);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Cards View */}
                  {viewMode === 'cards' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedMaterials.map((material) => (
                        <Card 
                          key={material.id} 
                          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 tradetrackr-card"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-semibold text-blue-600">
                                {material.materialNumber}
                              </CardTitle>
                              {getStatusBadge(material.status)}
                            </div>
                            <p className="text-sm text-gray-600">
                              {material.orderDate} â€¢ {material.quantity} {material.unit}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Package className="h-5 w-5 text-gray-500" />
                              <span className="font-medium">{material.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="h-5 w-5 text-gray-500" />
                              <span>{material.category}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-5 w-5 text-gray-500" />
                              <span>{material.projectNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-5 w-5 text-gray-500" />
                              <span className="truncate">{material.workLocation}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-5 w-5 text-gray-500" />
                              <span>{material.employee}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Einzelpreis:</span>
                                <span className="font-medium">â‚¬{material.unitPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Gesamtpreis:</span>
                                <span className="font-medium text-green-600">â‚¬{material.totalPrice.toFixed(2)}</span>
                              </div>
                            </div>
                            {material.notes && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {material.notes}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Material Modal */}
      {showAddMaterial && (
        <Dialog open={showAddMaterial} onOpenChange={setShowAddMaterial}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neues Material hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Materialnummer *</label>
                  <Input
                    value={newMaterialForm.materialNumber}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, materialNumber: e.target.value }))}
                    placeholder="MAT-2024-001-01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Partnumber</label>
                  <Input
                    value={newMaterialForm.partNumber}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, partNumber: e.target.value }))}
                    placeholder="ABC123-456"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={newMaterialForm.name}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="LED-Beleuchtungsset"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kategorie</label>
                  <Select value={newMaterialForm.category} onValueChange={(value) => setNewMaterialForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Kategorie wö¤hlen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beleuchtung">Beleuchtung</SelectItem>
                      <SelectItem value="Elektroinstallation">Elektroinstallation</SelectItem>
                      <SelectItem value="Smart Home">Smart Home</SelectItem>
                      <SelectItem value="Heizung">Heizung</SelectItem>
                      <SelectItem value="Sanitö¤r">Sanitö¤r</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Hersteller</label>
                  <Input
                    value={newMaterialForm.manufacturer}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="Siemens AG"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Lieferant</label>
                  <Input
                    value={newMaterialForm.supplier}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Elektro-Handel München"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Menge *</label>
                  <Input
                    type="number"
                    value={newMaterialForm.quantity}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Einheit</label>
                  <Select value={newMaterialForm.unit} onValueChange={(value) => setNewMaterialForm(prev => ({ ...prev, unit: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stück">Stück</SelectItem>
                      <SelectItem value="Meter">Meter</SelectItem>
                      <SelectItem value="Kilogramm">Kilogramm</SelectItem>
                      <SelectItem value="Liter">Liter</SelectItem>
                      <SelectItem value="Packung">Packung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Einzelpreis (â‚¬)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newMaterialForm.unitPrice}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Projektnummer</label>
                  <Input
                    value={newMaterialForm.projectNumber}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, projectNumber: e.target.value }))}
                    placeholder="PRJ-2024-001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Arbeitsort</label>
                  <Input
                    value={newMaterialForm.workLocation}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, workLocation: e.target.value }))}
                    placeholder="München, MaximilianstraöŸe 1"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notizen</label>
                <Input
                  value={newMaterialForm.notes}
                  onChange={(e) => setNewMaterialForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Zusö¤tzliche Informationen zum Material..."
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>Abbrechen</Button>
              <Button onClick={handleSaveMaterial}>Speichern</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Material Details Modal */}
      <Dialog open={showMaterialDetails} onOpenChange={setShowMaterialDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Materialnummer</Label>
                  <p className="text-lg font-semibold">{selectedMaterial.materialNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Artikelnummer</Label>
                  <p className="text-lg">{selectedMaterial.partNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Name</Label>
                  <p className="text-lg font-semibold">{selectedMaterial.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Kategorie</Label>
                  <p className="text-lg">{selectedMaterial.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Hersteller</Label>
                  <p className="text-lg">{selectedMaterial.manufacturer}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Lieferant</Label>
                  <p className="text-lg">{selectedMaterial.supplier}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Menge</Label>
                  <p className="text-lg">{selectedMaterial.quantity} {selectedMaterial.unit}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Einzelpreis</Label>
                  <p className="text-lg">{selectedMaterial.unitPrice.toFixed(2)} â‚¬</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Gesamtpreis</Label>
                  <p className="text-lg font-semibold text-green-600">{selectedMaterial.totalPrice.toFixed(2)} â‚¬</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Projektnummer</Label>
                  <p className="text-lg">{selectedMaterial.projectNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Arbeitsort</Label>
                  <p className="text-lg">{selectedMaterial.workLocation}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={selectedMaterial.status === 'delivered' ? 'default' : 'secondary'}>
                    {selectedMaterial.status}
                  </Badge>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Bestelldatum</Label>
                  <p className="text-lg">{selectedMaterial.orderDate}</p>
                </div>
                {selectedMaterial.deliveryDate && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Lieferdatum</Label>
                    <p className="text-lg">{selectedMaterial.deliveryDate}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Mitarbeiter</Label>
                  <p className="text-lg">{selectedMaterial.employee}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notizen</Label>
                  <p className="text-lg">{selectedMaterial.notes || 'Keine Notizen'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaterialDetails(false)}>
              SchlieöŸen
            </Button>
            <Button onClick={() => {
              if (selectedMaterial) {
                handleEditMaterial(selectedMaterial);
                setShowMaterialDetails(false);
              }
            }}>
              Bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={showEditMaterial} onOpenChange={setShowEditMaterial}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Material bearbeiten</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-materialNumber" className="text-sm font-medium">Materialnummer *</Label>
                <Input
                  id="edit-materialNumber"
                  value={editingMaterial.materialNumber}
                  onChange={(e) => setEditingMaterial({...editingMaterial, materialNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-partNumber" className="text-sm font-medium">Artikelnummer</Label>
                <Input
                  id="edit-partNumber"
                  value={editingMaterial.partNumber}
                  onChange={(e) => setEditingMaterial({...editingMaterial, partNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">Name *</Label>
                <Input
                  id="edit-name"
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="text-sm font-medium">Kategorie</Label>
                <Select value={editingMaterial.category} onValueChange={(value) => setEditingMaterial({...editingMaterial, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elektronik">Elektronik</SelectItem>
                    <SelectItem value="Werkzeuge">Werkzeuge</SelectItem>
                    <SelectItem value="Baumaterialien">Baumaterialien</SelectItem>
                    <SelectItem value="Sicherheitsausrüstung">Sicherheitsausrüstung</SelectItem>
                    <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-manufacturer" className="text-sm font-medium">Hersteller</Label>
                <Input
                  id="edit-manufacturer"
                  value={editingMaterial.manufacturer}
                  onChange={(e) => setEditingMaterial({...editingMaterial, manufacturer: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-supplier" className="text-sm font-medium">Lieferant</Label>
                <Input
                  id="edit-supplier"
                  value={editingMaterial.supplier}
                  onChange={(e) => setEditingMaterial({...editingMaterial, supplier: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantity" className="text-sm font-medium">Menge *</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="1"
                  value={editingMaterial.quantity}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 0;
                    setEditingMaterial({
                      ...editingMaterial, 
                      quantity,
                      totalPrice: quantity * editingMaterial.unitPrice
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit" className="text-sm font-medium">Einheit</Label>
                <Select value={editingMaterial.unit} onValueChange={(value) => setEditingMaterial({...editingMaterial, unit: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stück">Stück</SelectItem>
                    <SelectItem value="Meter">Meter</SelectItem>
                    <SelectItem value="Kilogramm">Kilogramm</SelectItem>
                    <SelectItem value="Liter">Liter</SelectItem>
                    <SelectItem value="Paket">Paket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unitPrice" className="text-sm font-medium">Einzelpreis (â‚¬)</Label>
                <Input
                  id="edit-unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingMaterial.unitPrice}
                  onChange={(e) => {
                    const unitPrice = parseFloat(e.target.value) || 0;
                    setEditingMaterial({
                      ...editingMaterial, 
                      unitPrice,
                      totalPrice: editingMaterial.quantity * unitPrice
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-projectNumber" className="text-sm font-medium">Projektnummer</Label>
                <Input
                  id="edit-projectNumber"
                  value={editingMaterial.projectNumber}
                  onChange={(e) => setEditingMaterial({...editingMaterial, projectNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-workLocation" className="text-sm font-medium">Arbeitsort</Label>
                <Input
                  id="edit-workLocation"
                  value={editingMaterial.workLocation}
                  onChange={(e) => setEditingMaterial({...editingMaterial, workLocation: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-medium">Status</Label>
                <Select value={editingMaterial.status} onValueChange={(value: 'ordered' | 'delivered' | 'installed' | 'returned') => setEditingMaterial({...editingMaterial, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordered">Bestellt</SelectItem>
                    <SelectItem value="delivered">Geliefert</SelectItem>
                    <SelectItem value="installed">Installiert</SelectItem>
                    <SelectItem value="returned">Zurückgegeben</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-orderDate" className="text-sm font-medium">Bestelldatum</Label>
                <Input
                  id="edit-orderDate"
                  type="date"
                  value={editingMaterial.orderDate}
                  onChange={(e) => setEditingMaterial({...editingMaterial, orderDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deliveryDate" className="text-sm font-medium">Lieferdatum</Label>
                <Input
                  id="edit-deliveryDate"
                  type="date"
                  value={editingMaterial.deliveryDate || ''}
                  onChange={(e) => setEditingMaterial({...editingMaterial, deliveryDate: e.target.value || undefined})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-employee" className="text-sm font-medium">Mitarbeiter</Label>
                <Input
                  id="edit-employee"
                  value={editingMaterial.employee}
                  onChange={(e) => setEditingMaterial({...editingMaterial, employee: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit-notes" className="text-sm font-medium">Notizen</Label>
                <Textarea
                  id="edit-notes"
                  value={editingMaterial.notes}
                  onChange={(e) => setEditingMaterial({...editingMaterial, notes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMaterial(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialManagement;

