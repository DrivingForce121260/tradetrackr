/**
 * MaterialManagement - Firestore-backed Materials/Inventory page
 * 
 * Displays materials created via supplier deliveries (procurement workflow).
 * UI patterns match Kunden/Lieferanten pages.
 * 
 * German UI throughout.
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package,
  Search,
  Loader2,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Truck,
  Plus,
  TrendingDown,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from './AppHeader';

import { MaterialsService } from '@/services/materialsService';
import {
  Material as FirestoreMaterial,
  MaterialStatus,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUS_COLORS,
} from '@/types/materials';
import MaterialDetailDrawer from './materials/MaterialDetailDrawer';

interface MaterialManagementProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const MaterialManagement: React.FC<MaterialManagementProps> = ({
  onBack,
  onNavigate,
  onOpenMessaging,
}) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const concernID = user?.concernID || user?.ConcernID;

  // Data state
  const [materials, setMaterials] = useState<FirestoreMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Sorting
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Detail view
  const [selectedMaterial, setSelectedMaterial] = useState<FirestoreMaterial | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Service
  const materialsService = useMemo(() => {
    if (!concernID) return null;
    return new MaterialsService(concernID);
  }, [concernID]);

  // Permission check
  const canViewMaterials = hasPermission('view_materials') || hasPermission('view_reports') || user?.role === 'auftraggeber';

  // Load materials from Firestore
  const loadMaterials = useCallback(async () => {
    if (!materialsService) {
      setMaterials([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectId = projectFilter !== 'all' ? projectFilter : undefined;
      const data = await materialsService.getMaterials(projectId);
      setMaterials(data);
    } catch (err: any) {
      console.error('Error loading materials:', err);
      if (err.code === 'permission-denied') {
        setError('Keine Berechtigung oder Firestore-Regeln fehlen. Bitte Firestore-Regeln prüfen.');
      } else {
        setError('Fehler beim Laden der Materialien: ' + (err.message || 'Unbekannter Fehler'));
      }
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [materialsService, projectFilter]);

  // Initial load
  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Filter and sort materials
  const filteredAndSortedMaterials = useMemo(() => {
    let filtered = [...materials];

    // Search filter (name, sku)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        (m.sku && m.sku.toLowerCase().includes(term)) ||
        (m.category && m.category.toLowerCase().includes(term)) ||
        (m.supplierSnapshot?.name && m.supplierSnapshot.name.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof FirestoreMaterial];
      let bVal: any = b[sortBy as keyof FirestoreMaterial];

      // Handle nested values
      if (sortBy === 'stock') {
        aVal = a.stock?.onHand || 0;
        bVal = b.stock?.onHand || 0;
      }

      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [materials, searchTerm, statusFilter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = materials.length;
    const available = materials.filter(m => m.status === 'available').length;
    const lowStock = materials.filter(m => m.status === 'low_stock').length;
    const outOfStock = materials.filter(m => m.status === 'out_of_stock').length;

    let totalValue = 0;
    for (const m of materials) {
      if (m.lastPurchasePriceNet && m.stock?.onHand) {
        totalValue += m.lastPurchasePriceNet * m.stock.onHand;
      }
    }

    return { total, available, lowStock, outOfStock, totalValue };
  }, [materials]);

  // Extract unique projects for filter dropdown
  const projectOptions = useMemo(() => {
    const projectMap = new Map<string, { id: string; number: string; name: string }>();
    for (const m of materials) {
      if (m.projectSnapshot?.projectId) {
        projectMap.set(m.projectSnapshot.projectId, {
          id: m.projectSnapshot.projectId,
          number: m.projectSnapshot.projectNumber,
          name: m.projectSnapshot.name,
        });
      }
    }
    return Array.from(projectMap.values());
  }, [materials]);

  // Handle sorting
  const handleSortColumn = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc' ?
      <ArrowUp className="h-4 w-4 text-blue-600" /> :
      <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Handle row click
  const handleViewMaterial = (material: FirestoreMaterial) => {
    setSelectedMaterial(material);
    setShowDetail(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setProjectFilter('all');
  };

  const hasFilters = searchTerm || statusFilter !== 'all' || projectFilter !== 'all';

  // Permission denied view
  if (!canViewMaterials) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader
          title="📦 Materialien"
          showBackButton={true}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Zugriff verweigert</h2>
              <p className="text-gray-600">Sie haben keine Berechtigung, Materialien anzuzeigen.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader
        title="📦 Materialien"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        {/* Placeholder for future "New Material" button */}
        <Button
          disabled
          className="bg-gray-400 text-white cursor-not-allowed"
          title="Materialien werden automatisch durch Lieferungen erzeugt"
        >
          <Plus className="h-5 w-5 mr-2" />
          Neu (kommt bald)
        </Button>
      </AppHeader>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-xs text-white/80">Materialien</p>
              </CardContent>
            </Card>

            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Verfügbar
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.available}</div>
                <p className="text-xs text-white/80">Auf Lager</p>
              </CardContent>
            </Card>

            <Card className="tradetrackr-card bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-2xl transition-all">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Niedriger Bestand
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.lowStock}</div>
                <p className="text-xs text-white/80">Nachbestellen</p>
              </CardContent>
            </Card>

            <Card className="tradetrackr-card bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-2xl transition-all">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Nicht auf Lager
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.outOfStock}</div>
                <p className="text-xs text-white/80">Ausverkauft</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Search Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {filteredAndSortedMaterials.length} Materialien
                  </Badge>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMaterials}
                  disabled={loading}
                  className="h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Suche (Name / SKU)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🎯</div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Status wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="available">✅ Verfügbar</SelectItem>
                      <SelectItem value="low_stock">⚠️ Niedriger Bestand</SelectItem>
                      <SelectItem value="out_of_stock">❌ Nicht auf Lager</SelectItem>
                      <SelectItem value="discontinued">🚫 Auslaufend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📁</div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Projekt wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Projekte</SelectItem>
                      {projectOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.number} - {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters */}
              {hasFilters && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Alle Filter zurücksetzen
                  </Button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
                  <span className="ml-3 text-gray-600">Lade Materialien...</span>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && filteredAndSortedMaterials.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  {hasFilters ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Keine Materialien gefunden
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Es gibt keine Materialien, die Ihren Filterkriterien entsprechen.
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Filter zurücksetzen
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Noch keine Materialien vorhanden
                      </h3>
                      <p className="text-gray-500">
                        Materialien werden automatisch durch bestätigte Lieferungen erzeugt.
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Gehen Sie zu Lieferanten → Ressourcen → Lieferungen um Wareneingänge zu erfassen.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Materials Table */}
              {!loading && !error && filteredAndSortedMaterials.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('name')}
                        >
                          <div className="flex items-center gap-1">
                            Material {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('sku')}
                        >
                          <div className="flex items-center gap-1">
                            SKU {getSortIcon('sku')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('unit')}
                        >
                          <div className="flex items-center gap-1">
                            Einheit {getSortIcon('unit')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none text-right"
                          onClick={() => handleSortColumn('stock')}
                        >
                          <div className="flex items-center gap-1 justify-end">
                            Bestand {getSortIcon('stock')}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">
                          Lieferant
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('status')}
                        >
                          <div className="flex items-center gap-1">
                            Status {getSortIcon('status')}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedMaterials.map((material) => {
                        const statusColors = MATERIAL_STATUS_COLORS[material.status] || MATERIAL_STATUS_COLORS.available;
                        return (
                          <TableRow
                            key={material.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewMaterial(material)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                {material.name}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-gray-600">
                              {material.sku || '-'}
                            </TableCell>
                            <TableCell>{material.unit}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {material.stock?.onHand ?? 0}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {material.supplierSnapshot?.name || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                                {MATERIAL_STATUS_LABELS[material.status] || material.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Outbound Booking Placeholder */}
              <div className="pt-4 border-t border-gray-200">
                <Button
                  disabled
                  variant="outline"
                  className="border-dashed border-2 border-gray-300 text-gray-400 cursor-not-allowed"
                  title="Funktion kommt in einer zukünftigen Version"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Ausgang buchen (kommt bald)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Material Detail Drawer */}
      <MaterialDetailDrawer
        material={selectedMaterial}
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedMaterial(null);
        }}
      />
    </div>
  );
};

export default memo(MaterialManagement);
