import React, { useState, useEffect, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, User, Building, MapPin, X, Clock, Calendar, CheckCircle, XCircle, AlertCircle, Search, Download, Filter, BarChart3, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Truck, Box, Plus, Edit, Trash2, FileText, Printer, FileSpreadsheet, TrendingUp, AlertTriangle, Table as TableIcon, FolderOpen, CheckSquare, BarChart3 as BarChartIcon, User as UserIcon, Building2, ClipboardList, Archive, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from './AppHeader';

import { Material, MaterialManagementProps } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';
import { cleanupDemoData } from '@/utils/demoDataCleanup';
import { MaterialOCRImportDialog } from './materials/MaterialOCRImportDialog';
import { CountdownSpinner } from './ui/countdown-spinner';
import { useResponsiveViewMode } from '@/hooks/use-responsive-view-mode';
import AutoCompleteInput from './AutoCompleteInput';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { cn } from '@/lib/utils';

const MaterialManagement: React.FC<MaterialManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projects, setProjects] = useState<Array<{id: string, projectNumber: string, name: string}>>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showMaterialDetails, setShowMaterialDetails] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showEditMaterial, setShowEditMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOCRImportDialog, setShowOCRImportDialog] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStatistics, setShowStatistics] = useState(false);
  const [viewMode, setViewMode, isMobile] = useResponsiveViewMode('table');
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'financial'>('summary');
  
  // Infinite scroll state
  const [displayedMaterialsCount, setDisplayedMaterialsCount] = useState(20);
  const itemsPerPage = 20;
  
  // Tablet layout
  const { isTablet, isTwoColumn } = useTabletLayout();
  
  // Pull-to-refresh
  const handleRefresh = async () => {
    // Reload materials from localStorage
    const savedMaterials = localStorage.getItem('materials');
    if (savedMaterials) {
      try {
        const parsedMaterials = JSON.parse(savedMaterials);
        setMaterials(parsedMaterials);
      } catch (error) {
        console.error('Error refreshing materials:', error);
      }
    }
  };
  
  const { isRefreshing, pullDistance, canRefresh, containerProps } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: isMobile,
  });
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
        name: 'Heizkörper',
        category: 'Heizung',
        manufacturer: 'Viessmann Deutschland',
        supplier: 'Viessmann Deutschland',
        projectNumber: 'PRJ-2024-002',
        workLocation: 'Hamburg, Altonaer Straße 15',
        quantity: 8,
        unit: 'Stück',
        unitPrice: 320.00,
        totalPrice: 2560.00,
        status: 'delivered',
        orderDate: '2024-01-15',
        deliveryDate: '2024-01-18',
        notes: 'Moderne Heizkörper mit Thermostaten',
        employee: 'Anna Schmidt'
      },
      {
        id: '5',
        materialNumber: 'MAT-2024-002-02',
        partNumber: 'GROHE-ESSENCE',
        name: 'Sanitärarmaturen',
        category: 'Sanitär',
        manufacturer: 'Grohe AG',
        supplier: 'Grohe AG',
        projectNumber: 'PRJ-2024-002',
        workLocation: 'Hamburg, Altonaer Straße 15',
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

  // Define loadMaterials outside useEffect so it can be called from import handler
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

  // Extract unique suppliers from existing materials for autocomplete
  // Must be after materials state declaration
  const uniqueSuppliers = useMemo(() => {
    return Array.from(
      new Set(materials.map(m => m.supplier).filter(Boolean))
    ).map(supplier => ({
      id: supplier,
      name: supplier,
    }));
  }, [materials]);

  // Supplier autocomplete hook - must be called unconditionally
  const supplierAutocomplete = useAutocomplete({
    data: uniqueSuppliers,
    getLabel: (s) => s.name || '',
    getValue: (s) => s.name || '',
    storageKey: 'material_supplier',
    maxRecentItems: 5,
  });

  // Load materials and projects from localStorage
  useEffect(() => {
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

  // OPTIMIZED: Use useMemo for expensive filtering and sorting operations
  const filteredAndSortedMaterials = useMemo(() => {
    const filtered = materials.filter(material => {
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

    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy as keyof Material];
      const bValue = b[sortBy as keyof Material];
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [materials, searchTerm, statusFilter, categoryFilter, projectFilter, sortBy, sortOrder]);
  
  // Infinite scroll - initialized after filteredAndSortedMaterials
  const hasMoreMaterials = displayedMaterialsCount < filteredAndSortedMaterials.length;
  const { isLoadingMore, sentinelRef } = useInfiniteScroll({
    hasMore: hasMoreMaterials,
    loading: false,
    onLoadMore: async () => {
      setDisplayedMaterialsCount(prev => Math.min(prev + itemsPerPage, filteredAndSortedMaterials.length));
    },
    enabled: isMobile || isTablet,
  });
  
  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedMaterialsCount(itemsPerPage);
  }, [searchTerm, statusFilter, categoryFilter, projectFilter, sortBy, sortOrder]);
  
  // Get displayed materials
  const displayedMaterials = filteredAndSortedMaterials.slice(0, displayedMaterialsCount);

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
        title="📦 Materialverwaltung" 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        {canManageMaterials && (
          <Button 
            onClick={() => setShowAddMaterial(true)}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            aria-label="Neues Material erstellen"
          >
            <Plus className="h-5 w-5 mr-2" />
            ✨ Neues Material
          </Button>
        )}
      </AppHeader>
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Read-only Notice */}
          {hasPermission('view_own_materials') && !hasPermission('view_all_materials') && (
            <Card className="tradetrackr-card border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-md">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  👀 Sie haben nur Lesezugriff auf Ihre eigenen Materialien.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {hasPermission('view_own_materials') && !hasPermission('view_all_materials') ? 'Meine Materialien' : 'Gesamt'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">
                  {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                    ? materials.filter(material => material.employee === user?.firstName + ' ' + user?.lastName).length
                    : materials.length
                  }
                </div>
                <p className="text-xs text-white/80">Materialien</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Bestellt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">
                  {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                    ? materials.filter(material => material.status === 'ordered' && material.employee === user?.firstName + ' ' + user?.lastName).length
                    : materials.filter(material => material.status === 'ordered').length
                  }
                </div>
                <p className="text-xs text-white/80">In Bestellung</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Geliefert
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">
                  {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                    ? materials.filter(material => material.status === 'delivered' && material.employee === user?.firstName + ' ' + user?.lastName).length
                    : materials.filter(material => material.status === 'delivered').length
                  }
                </div>
                <p className="text-xs text-white/80">Verfügbar</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Installiert
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">
                  {hasPermission('view_own_materials') && !hasPermission('view_all_materials')
                    ? materials.filter(material => material.status === 'installed' && material.employee === user?.firstName + ' ' + user?.lastName).length
                    : materials.filter(material => material.status === 'installed').length
                  }
                </div>
                <p className="text-xs text-white/80">Verbaut</p>
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
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {filteredAndSortedMaterials.length} Materialien
                  </Badge>
                  {projectFilter !== 'all' && (
                    <Badge className="ml-2 bg-yellow-400 text-gray-900 font-semibold border-0">
                      📌 Gefiltert: {projectFilter}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatistics(!showStatistics)}
                    className="h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                  >
                    {showStatistics ? <EyeOff className="h-4 w-4 mr-1" /> : <BarChart3 className="h-4 w-4 mr-1" />}
                    {showStatistics ? '📊 Ausblenden' : '📊 Statistiken'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    📥 Export
                  </Button>
                  {isMobile ? (
                    <div className="text-xs text-white/80 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>Mobile Ansicht</span>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={`h-8 px-3 transition-all ${viewMode === 'table' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                      >
                        <TableIcon className="h-4 w-4 mr-1" />
                        Tabelle
                      </Button>
                      <Button
                        variant={viewMode === 'cards' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('cards')}
                        className={`h-8 px-3 transition-all ${viewMode === 'cards' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Karten
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📁</div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Projekt auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎯 Alle Projekte</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.projectNumber} - {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🏷️</div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Kategorie auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎯 Alle Kategorien</SelectItem>
                      <SelectItem value="Beleuchtung">💡 Beleuchtung</SelectItem>
                      <SelectItem value="Elektroinstallation">⚡ Elektroinstallation</SelectItem>
                      <SelectItem value="Smart Home">🏠 Smart Home</SelectItem>
                      <SelectItem value="Heizung">🔥 Heizung</SelectItem>
                      <SelectItem value="Sanitär">🚿 Sanitär</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input
                    placeholder="Nach Material, Beschreibung oder Mitarbeiter suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
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
              {filteredAndSortedMaterials.length === 0 ? (
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
                          {displayedMaterials.map((material) => (
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
                                    aria-label={`Material "${material.name || material.materialNumber || material.id}" bearbeiten`}
                                    title="Bearbeiten"
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
                                    aria-label={`Material "${material.name || material.materialNumber || material.id}" löschen`}
                                    title="Löschen"
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
                    <div 
                      {...(isMobile ? containerProps : {})}
                      className={cn(
                        "grid gap-4",
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
                      {displayedMaterials.map((material) => (
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
                      {/* Infinite Scroll Sentinel */}
                      {(isMobile || isTablet) && (
                        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                          {isLoadingMore && (
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-sm">Lade weitere Materialien...</span>
                            </div>
                          )}
                          {!hasMoreMaterials && displayedMaterials.length > 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Alle Materialien geladen ({displayedMaterials.length} von {filteredAndSortedMaterials.length})
                            </p>
                          )}
                        </div>
                      )}
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
          <DialogContent className="max-w-3xl border-4 border-[#058bc0] shadow-2xl bg-white">
            <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white -mx-6 -mt-6 px-6 py-4 rounded-t-lg mb-4">
              <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">✨</span>
                  Neues Material hinzufügen
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🖱️ AI Button clicked');
                    const input = document.getElementById('ocr-invoice-upload') as HTMLInputElement;
                    console.log('📁 File input element:', input);
                    if (input) {
                      input.click();
                      console.log('✅ File dialog triggered');
                    } else {
                      console.error('❌ File input not found');
                    }
                  }}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  🤖 AI Rechnung scannen
                </Button>
                <input
                  id="ocr-invoice-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    console.log('📂 File input onChange triggered');
                    const file = e.target.files?.[0];
                    console.log('📄 Selected file:', file?.name, file?.size, file?.type);
                    
                    if (!file) {
                      console.warn('⚠️ No file selected');
                      return;
                    }
                    
                    try {
                      console.log('🚀 Starting OCR analysis...');
                      
                      // Start countdown spinner
                      setIsAnalyzing(true);
                      
                      const { MaterialOCRService } = await import('@/services/materialOCRService');
                      const result = await MaterialOCRService.analyzeInvoice(file, user?.concernID || '', user?.uid || '');
                      
                      // Stop spinner immediately on success
                      setIsAnalyzing(false);
                      
                      console.log('🤖 OCR Result:', result);
                      console.log('📊 Materials found:', result.materials?.length || 0);
                      
                      // Open import dialog with OCR result
                      if (result.materials && result.materials.length > 0) {
                        setOcrResult(result);
                        setShowOCRImportDialog(true);
                        setShowAddMaterial(false); // Close add dialog
                        
                        toast({
                          title: "✅ Dokument gescannt!",
                          description: `${result.documentInfo?.documentType || 'Dokument'} erkannt\n${result.materials.length} Material(ien) gefunden\nLieferant: ${result.supplierInfo?.name || 'Unbekannt'}`,
                        });
                      } else {
                        toast({
                          title: "⚠️ Warnung",
                          description: "Keine Materialien im Dokument gefunden. Bitte manuell eingeben.",
                          variant: "destructive"
                        });
                      }
                    } catch (error: any) {
                      // Stop spinner on error
                      setIsAnalyzing(false);
                      
                      console.error('OCR error:', error);
                      toast({
                        title: "❌ Fehler",
                        description: "Fehler bei der AI-Analyse: " + error.message,
                        variant: "destructive"
                      });
                    }
                    
                    // Reset input
                    e.target.value = '';
                  }}
                />
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-2 max-h-[70vh] overflow-y-auto px-2">
              {/* Section 1: Material Identifikation */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <span className="text-lg">🏷️</span>
                  Material Identifikation
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">🔢</span>
                      Materialnummer *
                    </Label>
                    <Input
                      value={newMaterialForm.materialNumber}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, materialNumber: e.target.value }))}
                      placeholder="MAT-2024-001-01"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">📋</span>
                      Partnumber
                    </Label>
                    <Input
                      value={newMaterialForm.partNumber}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, partNumber: e.target.value }))}
                      placeholder="ABC123-456"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">📦</span>
                      Name *
                    </Label>
                    <Input
                      value={newMaterialForm.name}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="LED-Beleuchtungsset"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">🏷️</span>
                      Kategorie
                    </Label>
                    <Select value={newMaterialForm.category} onValueChange={(value) => setNewMaterialForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beleuchtung">💡 Beleuchtung</SelectItem>
                        <SelectItem value="Elektroinstallation">⚡ Elektroinstallation</SelectItem>
                        <SelectItem value="Smart Home">🏠 Smart Home</SelectItem>
                        <SelectItem value="Heizung">🔥 Heizung</SelectItem>
                        <SelectItem value="Sanitär">🚿 Sanitär</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2: Hersteller & Lieferant */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <span className="text-lg">🏭</span>
                  Hersteller & Lieferant
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">🏭</span>
                      Hersteller
                    </Label>
                    <Input
                      value={newMaterialForm.manufacturer}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                      placeholder="Siemens AG"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">🚚</span>
                      Lieferant
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        (Auto-Vervollständigung verfügbar)
                      </span>
                    </Label>
                    <div className="mt-1.5">
                      <AutoCompleteInput
                        label=""
                        placeholder="Lieferant eingeben oder auswählen"
                        value={newMaterialForm.supplier}
                        onChange={(value) => {
                          setNewMaterialForm(prev => ({ ...prev, supplier: value }));
                        }}
                        onSelect={(option) => {
                          setNewMaterialForm(prev => ({ ...prev, supplier: option.value }));
                          supplierAutocomplete.trackUsage(option.id);
                        }}
                        options={supplierAutocomplete.options}
                        filterFn={supplierAutocomplete.filterFn}
                        showRecentFirst={true}
                        showUsageCount={true}
                        maxSuggestions={5}
                        icon={<Truck className="h-4 w-4" />}
                        emptyMessage="Keine Lieferanten gefunden"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Zuletzt verwendete Lieferanten werden zuerst angezeigt.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Menge & Preis */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <span className="text-lg">💰</span>
                  Menge & Preis
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">🔢</span>
                      Menge *
                    </Label>
                    <Input
                      type="number"
                      value={newMaterialForm.quantity}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      placeholder="1"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">📏</span>
                      Einheit
                    </Label>
                    <Select value={newMaterialForm.unit} onValueChange={(value) => setNewMaterialForm(prev => ({ ...prev, unit: value }))}>
                      <SelectTrigger className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stück">📦 Stück</SelectItem>
                        <SelectItem value="Meter">📏 Meter</SelectItem>
                        <SelectItem value="Kilogramm">⚖️ Kilogramm</SelectItem>
                        <SelectItem value="Liter">🧴 Liter</SelectItem>
                        <SelectItem value="Packung">📦 Packung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">💶</span>
                      Einzelpreis (€)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newMaterialForm.unitPrice}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Projekt & Ort */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <span className="text-lg">📍</span>
                  Projekt & Ort
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">📁</span>
                      Projektnummer
                    </Label>
                    <Input
                      value={newMaterialForm.projectNumber}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, projectNumber: e.target.value }))}
                      placeholder="PRJ-2024-001"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <span className="text-base">📍</span>
                      Arbeitsort
                    </Label>
                    <Input
                      value={newMaterialForm.workLocation}
                      onChange={(e) => setNewMaterialForm(prev => ({ ...prev, workLocation: e.target.value }))}
                      placeholder="München, Maximilianstraße 1"
                      className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Notizen */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border-2 border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <span className="text-lg">📝</span>
                  Zusätzliche Informationen
                </h3>
                <div>
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">💬</span>
                    Notizen
                  </Label>
                  <Textarea
                    value={newMaterialForm.notes}
                    onChange={(e) => setNewMaterialForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Zusätzliche Informationen zum Material..."
                    className="mt-1.5 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 min-h-[80px]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t-2 border-gray-200">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="border-2 border-gray-300 hover:bg-gray-100 font-semibold"
              >
                ❌ Abbrechen
              </Button>
              <Button 
                onClick={handleSaveMaterial}
                className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                ✅ Speichern
              </Button>
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

      {/* Countdown Spinner */}
      <CountdownSpinner
        isLoading={isAnalyzing}
        maxSeconds={20}
        message="Dokument wird analysiert..."
      />

      {/* OCR Import Dialog */}
      <MaterialOCRImportDialog
        open={showOCRImportDialog}
        onClose={() => {
          setShowOCRImportDialog(false);
          setOcrResult(null);
        }}
        ocrResult={ocrResult}
        onImport={async (materials, supplierInfo, documentInfo) => {
          // Import logic: create supplier if needed, generate material numbers, add materials
          try {
            const { db } = await import('@/config/firebase');
            const { collection, addDoc, query, where, getDocs, serverTimestamp } = await import('firebase/firestore');

            // 1. Check if supplier exists or create new one
            let supplierId = '';
            if (supplierInfo && supplierInfo.name) {
              const suppliersRef = collection(db, 'suppliers');
              const supplierQuery = query(
                suppliersRef,
                where('concernID', '==', user?.concernID),
                where('name', '==', supplierInfo.name)
              );
              const supplierSnapshot = await getDocs(supplierQuery);

              if (!supplierSnapshot.empty) {
                supplierId = supplierSnapshot.docs[0].id;
                console.log('✅ Existing supplier found:', supplierId);
              } else {
                // Create new supplier
                const newSupplier = await addDoc(suppliersRef, {
                  concernID: user?.concernID,
                  name: supplierInfo.name,
                  street: supplierInfo.street || '',
                  postalCode: supplierInfo.postalCode || '',
                  city: supplierInfo.city || '',
                  country: supplierInfo.country || '',
                  phone: supplierInfo.phone || '',
                  email: supplierInfo.email || '',
                  website: supplierInfo.website || '',
                  taxNumber: supplierInfo.taxNumber || '',
                  vatNumber: supplierInfo.vatNumber || '',
                  createdAt: serverTimestamp(),
                  createdBy: user?.uid
                });
                supplierId = newSupplier.id;
                console.log('✅ New supplier created:', supplierId);
              }
            }

            // 2. Generate material numbers and add materials
            const materialsRef = collection(db, 'materials_library');
            let importedCount = 0;

            for (const material of materials) {
              // Generate unique material number (MAT-YYYYMMDD-XXXX)
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
              const materialNumber = `MAT-${dateStr}-${randomStr}`;

              const newMaterial = {
                concernID: user?.concernID,
                materialNumber: materialNumber,
                name: material.name,
                partNumber: material.itemNumber || '',
                supplier: supplierInfo?.name || material.supplier || '',
                supplierId: supplierId || '',
                manufacturer: supplierInfo?.name || '',
                quantity: material.quantity || 0,
                unit: material.unit || 'Stk',
                unitPrice: material.unitPrice || 0,
                totalValue: material.totalPrice || (material.quantity * material.unitPrice),
                category: material.category || 'General',
                description: material.description || '',
                notes: `Importiert aus ${documentInfo?.documentType || 'Dokument'} ${documentInfo?.documentNumber || ''}\nDatum: ${documentInfo?.documentDate || ''}`,
                projectNumber: '',
                workLocation: '',
                employee: user?.displayName || user?.email || '',
                orderDate: documentInfo?.orderDate || documentInfo?.documentDate || new Date().toISOString().slice(0, 10),
                deliveryDate: documentInfo?.documentDate || new Date().toISOString().slice(0, 10),
                status: 'available',
                tags: [documentInfo?.documentType || 'imported'],
                confidence: material.confidence || 0.9,
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
                updatedAt: serverTimestamp()
              };

              await addDoc(materialsRef, newMaterial);
              importedCount++;
            }

            console.log(`✅ Imported ${importedCount} materials`);
            
            // Reload materials
            await loadMaterials();

          } catch (error: any) {
            console.error('Import error:', error);
            throw new Error(`Import fehlgeschlagen: ${error.message}`);
          }
        }}
      />

      {/* Quick Action Sidebar */}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(MaterialManagement);

