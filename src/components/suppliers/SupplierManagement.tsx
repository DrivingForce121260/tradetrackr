/**
 * SupplierManagement - Main component for managing suppliers (Lieferanten)
 * 
 * UI patterns aligned with CustomerManagement (Kunden):
 * - Same page shell, header, and container structure
 * - Same filter/search card styling
 * - Same table styling using shadcn Table component
 * - Same statistics cards at top
 * - Same empty state styling
 * - Editor opens as Dialog (same pattern as existing)
 * 
 * German UI throughout
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  CheckSquare,
  Archive,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { SupplierService } from '@/services/supplierService';
import {
  Supplier,
  SupplierStatus,
  SUPPLIER_STATUS_LABELS,
} from '@/types/suppliers';
import SupplierEditor from './SupplierEditor';
import { useToast } from '@/hooks/use-toast';

interface SupplierManagementProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const SupplierManagement: React.FC<SupplierManagementProps> = ({
  onBack,
  onNavigate,
  onOpenMessaging,
}) => {
  const { user, hasPermission } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const { toast } = useToast();

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showEditor, setShowEditor] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Check permissions (using same pattern as Kunden)
  const canManageSuppliers = hasPermission('create_customer') || hasPermission('edit_customer') || hasPermission('delete_customer');
  const canViewSuppliers = hasPermission('view_customers');

  const supplierService = useMemo(() => {
    if (!concernID) return null;
    return new SupplierService(concernID);
  }, [concernID]);

  // Load suppliers
  const loadSuppliers = useCallback(async () => {
    if (!supplierService) return;

    setLoading(true);
    try {
      const data = await supplierService.getAllSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast({
        title: 'Fehler',
        description: 'Lieferanten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [supplierService, toast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Filter suppliers based on search and status
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      // Search filter
      const searchMatch = !searchTerm.trim() || 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.vatId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const supplierStatus = supplier.status || 'active';
      const statusMatch = statusFilter === 'all' || supplierStatus === statusFilter;
      
      return searchMatch && statusMatch;
    });
  }, [suppliers, searchTerm, statusFilter]);

  // Sort suppliers
  const sortedSuppliers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => {
      let aValue: string = '';
      let bValue: string = '';

      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'city':
          aValue = a.city || '';
          bValue = b.city || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'status':
          aValue = a.status || 'active';
          bValue = b.status || 'active';
          break;
        case 'vatId':
          aValue = a.vatId || '';
          bValue = b.vatId || '';
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }

      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue, 'de-DE')
        : bValue.localeCompare(aValue, 'de-DE');
    });
  }, [filteredSuppliers, sortBy, sortOrder]);

  // Sort column handler
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
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Status badge helper (matching Kunden pattern)
  const getStatusBadge = (status: SupplierStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0">
            Aktiv
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0">
            Inaktiv
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-0">
            Archiviert
          </Badge>
        );
      default:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0">
            Aktiv
          </Badge>
        );
    }
  };

  // Handler: Open editor for new supplier
  const handleCreateNew = () => {
    setEditingSupplier(null);
    setShowEditor(true);
  };

  // Handler: Open editor for existing supplier
  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowEditor(true);
  };

  // Handler: After save
  const handleSaved = async () => {
    setShowEditor(false);
    setEditingSupplier(null);
    await loadSuppliers();
  };

  // Handler: Cancel editor
  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingSupplier(null);
  };

  // Statistics
  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s) => (s.status || 'active') === 'active').length,
    inactive: suppliers.filter((s) => s.status === 'inactive').length,
    archived: suppliers.filter((s) => s.status === 'archived').length,
  };

  // Permission check for view access
  if (!canViewSuppliers) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader
          title="Lieferantenverwaltung"
          showBackButton={true}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Zugriff verweigert</h2>
              <p className="text-gray-600">Sie haben keine Berechtigung, Lieferanten anzuzeigen.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader
        title="🏭 Lieferantenverwaltung"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        {canManageSuppliers && (
          <Button
            onClick={handleCreateNew}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            ✨ Neuer Lieferant
          </Button>
        )}
      </AppHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Statistics Cards (matching Kunden pattern) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-xs text-white/80">Lieferanten</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Aktiv
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.active}</div>
                <p className="text-xs text-white/80">Aktive</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Inaktiv
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.inactive}</div>
                <p className="text-xs text-white/80">Inaktive</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Archiviert
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.archived}</div>
                <p className="text-xs text-white/80">Archiviert</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Search Card (matching Kunden pattern) */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {suppliers.length} Lieferanten
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSuppliers}
                    disabled={loading}
                    className="h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                    title="Lieferanten neu laden"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    🔄 Neu laden
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input
                    placeholder="Nach Name, Ort, USt-IdNr., E-Mail suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🏷️</div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Status auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎯 Alle Status</SelectItem>
                      <SelectItem value="active">✅ Aktiv</SelectItem>
                      <SelectItem value="inactive">⏸️ Inaktiv</SelectItem>
                      <SelectItem value="archived">📦 Archiviert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🔢</div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Sortieren nach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">🏢 Firmenname</SelectItem>
                      <SelectItem value="city">🏙️ Ort</SelectItem>
                      <SelectItem value="email">📧 E-Mail</SelectItem>
                      <SelectItem value="status">🏷️ Status</SelectItem>
                      <SelectItem value="vatId">🔖 USt-IdNr.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="text-xs h-8 px-3 border-2 border-red-300 hover:border-red-500 hover:bg-red-50 transition-all"
                  >
                    <X className="h-3 w-3 mr-1" />
                    ❌ Alle Filter zurücksetzen
                  </Button>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
                  <span className="ml-3 text-gray-600 font-medium">Lade Lieferanten...</span>
                </div>
              ) : sortedSuppliers.length === 0 ? (
                /* Empty State (matching Kunden pattern) */
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Lieferanten gefunden
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
                      : 'Erstellen Sie Ihren ersten Lieferanten, um zu beginnen.'
                    }
                  </p>
                  {canManageSuppliers && !searchTerm && statusFilter === 'all' && (
                    <Button
                      onClick={handleCreateNew}
                      className="mt-6 bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Lieferant erstellen
                    </Button>
                  )}
                </div>
              ) : (
                /* Table View (matching Kunden pattern) */
                <div className="border rounded-lg overflow-hidden bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('name')}
                        >
                          <div className="flex items-center gap-2">
                            Firmenname
                            {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead>Ansprechpartner</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('city')}
                        >
                          <div className="flex items-center gap-2">
                            Ort
                            {getSortIcon('city')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('email')}
                        >
                          <div className="flex items-center gap-2">
                            E-Mail
                            {getSortIcon('email')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('vatId')}
                        >
                          <div className="flex items-center gap-2">
                            USt-IdNr.
                            {getSortIcon('vatId')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortColumn('status')}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            {getSortIcon('status')}
                          </div>
                        </TableHead>
                        {canManageSuppliers && <TableHead className="w-[80px]">Aktionen</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSuppliers.map((supplier) => {
                        const supplierStatus = (supplier.status || 'active') as SupplierStatus;
                        return (
                          <TableRow
                            key={supplier.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell>{supplier.contactPerson || '-'}</TableCell>
                            <TableCell>
                              {[supplier.postalCode, supplier.city].filter(Boolean).join(' ') || '-'}
                            </TableCell>
                            <TableCell>{supplier.email || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {supplier.vatId || '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(supplierStatus)}</TableCell>
                            {canManageSuppliers && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSupplier(supplier);
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Bearbeiten"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Supplier Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={(open) => {
        if (!open) {
          handleCancelEdit();
        }
      }}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl"
          aria-describedby={undefined}
        >
          <DialogHeader className="border-b-2 border-gray-200 pb-4">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Building2 className="h-7 w-7 text-[#058bc0]" />
              {editingSupplier ? 'Lieferant bearbeiten' : 'Neuer Lieferant'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {editingSupplier
                ? 'Bearbeiten Sie die Lieferantendaten'
                : 'Erfassen Sie einen neuen Lieferanten'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            <SupplierEditor
              existingSupplier={editingSupplier || undefined}
              onSaved={handleSaved}
              onCancel={handleCancelEdit}
              onOpenSupplier={(supplier) => {
                // Close current dialog and open the duplicate supplier
                setEditingSupplier(supplier);
              }}
            />
            
            {/* Procurement Preview Card - shows summary with link to global portal */}
            {editingSupplier && (
              <Card className="border-2 border-[#058bc0] shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white py-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📦</span>
                      Beschaffung (Übersicht)
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleCancelEdit();
                        // Navigate to global procurement portal with supplier filter
                        onNavigate?.(`procurement?supplier=${editingSupplier.id}`);
                      }}
                      className="border-white text-white hover:bg-white/20"
                    >
                      Zur Beschaffung →
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Alle Beschaffungsvorgänge (Anfragen, Bestellungen, Lieferungen, Rechnungen) für diesen Lieferanten 
                    werden im globalen Beschaffungsmodul verwaltet.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleCancelEdit();
                      onNavigate?.('procurement');
                    }}
                    className="text-[#058bc0] border-[#058bc0] hover:bg-[#058bc0]/10"
                  >
                    📦 Beschaffung öffnen
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierManagement;
