/**
 * ProcurementPortal - Global procurement management page
 * 
 * Displays procurement documents across ALL suppliers with filtering.
 * Tabs: Anfragen | Bestellungen | Lieferungen | Rechnungen
 * 
 * Pattern matches InvoicingPortal.
 * German UI throughout.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  ShoppingCart,
  Truck,
  Receipt,
  Plus,
  Search,
  Loader2,
  CheckCircle,
  RefreshCw,
  Lock,
  AlertTriangle,
  Sparkles,
  Info,
  Mail,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import { ProcurementService } from '@/services/procurementService';
import { MaterialsService } from '@/services/materialsService';
import { SupplierService } from '@/services/supplierService';
import { Supplier, SupplierSnapshot, UserSnapshot } from '@/types/suppliers';
import {
  ProcurementRequest,
  PurchaseOrder,
  SupplierDelivery,
  SupplierInvoice,
  PROCUREMENT_REQUEST_STATUS_LABELS,
  PROCUREMENT_REQUEST_STATUS_COLORS,
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_COLORS,
  SUPPLIER_DELIVERY_STATUS_LABELS,
  SUPPLIER_DELIVERY_STATUS_COLORS,
  SUPPLIER_INVOICE_STATUS_LABELS,
  SUPPLIER_INVOICE_STATUS_COLORS,
} from '@/types/procurement';

// Import editors from the existing supplier resources (will be refactored to work globally)
import RequestEditor from '@/components/suppliers/resources/RequestEditor';
import PurchaseOrderEditor from '@/components/suppliers/resources/PurchaseOrderEditor';
import DeliveryEditor from '@/components/suppliers/resources/DeliveryEditor';
import SupplierInvoiceEditor from '@/components/suppliers/resources/SupplierInvoiceEditor';

// Import Email Offers Tab for AI-detected supplier offers
import EmailOffersTab from './EmailOffersTab';
import { getProcurementOffersCount } from '@/services/emailIntelligenceService';

interface ProcurementPortalProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
  initialSupplierFilter?: string;
  initialProjectFilter?: string;
}

// Tab types
type ProcurementTab = 'requests' | 'orders' | 'deliveries' | 'invoices' | 'emailOffers';

const ProcurementPortal: React.FC<ProcurementPortalProps> = ({
  onBack,
  onNavigate,
  onOpenMessaging,
  initialSupplierFilter,
  initialProjectFilter,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernID = user?.concernID || user?.ConcernID;

  // Tab state
  const [activeTab, setActiveTab] = useState<ProcurementTab>('requests');

  // Data state
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>(initialSupplierFilter || 'all');
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Editor state
  const [showRequestEditor, setShowRequestEditor] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ProcurementRequest | null>(null);
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [showDeliveryEditor, setShowDeliveryEditor] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<SupplierDelivery | null>(null);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);

  // Selected supplier for new documents
  const [selectedSupplierForNew, setSelectedSupplierForNew] = useState<Supplier | null>(null);

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    id: string;
    message: string;
  } | null>(null);

  // Email offers count (for badge)
  const [emailOffersCount, setEmailOffersCount] = useState(0);

  // Services
  const procurementService = useMemo(() => {
    if (!concernID) return null;
    return new ProcurementService(concernID);
  }, [concernID]);

  const materialsService = useMemo(() => {
    if (!concernID) return null;
    return new MaterialsService(concernID);
  }, [concernID]);

  const supplierService = useMemo(() => {
    if (!concernID) return null;
    return new SupplierService(concernID);
  }, [concernID]);

  // User snapshot for audit
  const userSnapshot: UserSnapshot = useMemo(() => ({
    userId: user?.uid || '',
    name: user?.displayName || user?.vorname || user?.email || '',
  }), [user]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!procurementService || !supplierService) return;

    setLoading(true);
    try {
      const [reqData, ordData, delData, invData, suppData] = await Promise.all([
        procurementService.listRequests(),
        procurementService.listOrders(),
        procurementService.listDeliveries(),
        procurementService.listInvoices(),
        supplierService.getAllSuppliers(),
      ]);

      setRequests(reqData);
      setOrders(ordData);
      setDeliveries(delData);
      setInvoices(invData);
      setSuppliers(suppData);
    } catch (error: any) {
      console.error('[ProcurementPortal] Fehler beim Laden der Beschaffungsdaten:', error);
      
      // Check for Firestore index error
      const isIndexError = error?.code === 'failed-precondition' || 
        error?.message?.includes('index') ||
        error?.message?.includes('requires an index');
      
      toast({
        title: 'Fehler',
        description: isIndexError 
          ? 'Firestore-Index fehlt. Bitte führen Sie "firebase deploy --only firestore:indexes" aus.'
          : 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [procurementService, supplierService, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load email offers count
  useEffect(() => {
    if (!concernID || !user?.uid) return;
    
    getProcurementOffersCount(concernID, user.uid)
      .then((counts) => {
        setEmailOffersCount(counts.neu + counts.inPruefung);
      })
      .catch((err) => {
        console.debug('[ProcurementPortal] Email offers count error:', err);
      });
  }, [concernID, user?.uid]);

  // Format date helper
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString('de-DE');
    } catch {
      return '-';
    }
  };

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Check if supplier is archived
  const isSupplierArchived = (supplierId: string): boolean => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.status === 'archived';
  };

  // Get supplier by ID
  const getSupplierById = (supplierId: string): Supplier | undefined => {
    return suppliers.find(s => s.id === supplierId);
  };

  // Filter helpers
  const filterBySearch = <T extends { supplierSnapshot?: SupplierSnapshot }>(
    items: T[],
    searchFields: (item: T) => string[]
  ): T[] => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      const fields = searchFields(item);
      return fields.some(f => f?.toLowerCase().includes(term));
    });
  };

  const filterBySupplier = <T extends { supplierId: string | null }>(items: T[]): T[] => {
    if (supplierFilter === 'all') return items;
    // Include items with matching supplierId OR items with null supplierId (e.g., CRM-derived inquiries)
    if (supplierFilter === 'none') {
      return items.filter(item => !item.supplierId);
    }
    return items.filter(item => item.supplierId === supplierFilter);
  };

  const filterByProject = <T extends { project?: { projectId: string } | null }>(items: T[]): T[] => {
    if (projectFilter === 'all') return items;
    return items.filter(item => item.project?.projectId === projectFilter);
  };

  // Filtered data
  const filteredRequests = useMemo(() => {
    let filtered = filterBySupplier(filterByProject(requests));
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    return filterBySearch(filtered, r => [
      r.requestNumber,
      r.title,
      r.supplierSnapshot?.name || '',
    ]);
  }, [requests, supplierFilter, projectFilter, statusFilter, searchTerm]);

  const filteredOrders = useMemo(() => {
    let filtered = filterBySupplier(filterByProject(orders));
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    return filterBySearch(filtered, o => [
      o.orderNumber,
      o.supplierSnapshot?.name || '',
      o.sourceRequestNumber || '',
    ]);
  }, [orders, supplierFilter, projectFilter, statusFilter, searchTerm]);

  const filteredDeliveries = useMemo(() => {
    let filtered = filterBySupplier(filterByProject(deliveries));
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }
    return filterBySearch(filtered, d => [
      d.deliveryNoteNumber,
      d.supplierSnapshot?.name || '',
      d.purchaseOrderNumber || '',
    ]);
  }, [deliveries, supplierFilter, projectFilter, statusFilter, searchTerm]);

  const filteredInvoices = useMemo(() => {
    let filtered = filterBySupplier(filterByProject(invoices));
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    return filterBySearch(filtered, i => [
      i.invoiceNumber,
      i.supplierSnapshot?.name || '',
    ]);
  }, [invoices, supplierFilter, projectFilter, statusFilter, searchTerm]);

  // Extract unique projects for filter dropdown
  const projectOptions = useMemo(() => {
    const projectMap = new Map<string, { id: string; number: string; name: string }>();
    
    const addProject = (project?: { projectId: string; projectNumber: string; name: string } | null) => {
      if (project?.projectId) {
        projectMap.set(project.projectId, {
          id: project.projectId,
          number: project.projectNumber,
          name: project.name,
        });
      }
    };

    requests.forEach(r => addProject(r.project));
    orders.forEach(o => addProject(o.project));
    deliveries.forEach(d => addProject(d.project));
    invoices.forEach(i => addProject(i.project));

    return Array.from(projectMap.values());
  }, [requests, orders, deliveries, invoices]);

  // Counts for badges
  const counts = useMemo(() => ({
    requests: filteredRequests.length,
    orders: filteredOrders.length,
    deliveries: filteredDeliveries.length,
    invoices: filteredInvoices.filter(i => i.status === 'open' || i.status === 'partial').length,
  }), [filteredRequests, filteredOrders, filteredDeliveries, filteredInvoices]);

  // Handle workflow actions
  const handleConfirmDelivery = async (deliveryId: string) => {
    if (!procurementService || !materialsService) return;

    try {
      const confirmedDelivery = await procurementService.confirmDelivery(deliveryId, userSnapshot);
      const updatedLineItems = await materialsService.processDeliveryInbound(confirmedDelivery, userSnapshot);
      await procurementService.updateDeliveryLineItemMaterialLinks(deliveryId, updatedLineItems);

      toast({
        title: '✅ Wareneingang bestätigt',
        description: 'Die Materialien wurden ins Lager gebucht.',
      });

      await loadData();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast({
        title: 'Fehler',
        description: 'Wareneingang konnte nicht bestätigt werden.',
        variant: 'destructive',
      });
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction || !procurementService) return;

    try {
      switch (confirmAction.type) {
        case 'confirm_delivery':
          await handleConfirmDelivery(confirmAction.id);
          break;
        case 'send_request':
          await procurementService.sendRequest(confirmAction.id, userSnapshot);
          toast({ title: '✅ Anfrage gesendet' });
          break;
        case 'close_request':
          await procurementService.closeRequest(confirmAction.id, userSnapshot);
          toast({ title: '✅ Anfrage geschlossen' });
          break;
        case 'mark_paid':
          await procurementService.markInvoicePaid(confirmAction.id, userSnapshot);
          toast({ title: '✅ Rechnung als bezahlt markiert' });
          break;
      }

      await loadData();
    } catch (error) {
      console.error('Error executing action:', error);
      toast({
        title: 'Fehler',
        description: 'Aktion konnte nicht ausgeführt werden.',
        variant: 'destructive',
      });
    } finally {
      setConfirmAction(null);
    }
  };

  // Handle opening new document editor
  const handleNewDocument = (type: 'request' | 'order' | 'delivery' | 'invoice') => {
    // If a supplier filter is active, use that supplier
    if (supplierFilter !== 'all') {
      const supplier = getSupplierById(supplierFilter);
      if (supplier) {
        setSelectedSupplierForNew(supplier);
      }
    } else {
      setSelectedSupplierForNew(null);
    }

    switch (type) {
      case 'request':
        setEditingRequest(null);
        setShowRequestEditor(true);
        break;
      case 'order':
        setEditingOrder(null);
        setShowOrderEditor(true);
        break;
      case 'delivery':
        setEditingDelivery(null);
        setShowDeliveryEditor(true);
        break;
      case 'invoice':
        setEditingInvoice(null);
        setShowInvoiceEditor(true);
        break;
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSupplierFilter('all');
    setProjectFilter('all');
    setStatusFilter('all');
  };

  const hasFilters = searchTerm || supplierFilter !== 'all' || projectFilter !== 'all' || statusFilter !== 'all';

  // Get status options based on active tab
  const getStatusOptions = () => {
    switch (activeTab) {
      case 'requests':
        return Object.entries(PROCUREMENT_REQUEST_STATUS_LABELS);
      case 'orders':
        return Object.entries(PURCHASE_ORDER_STATUS_LABELS);
      case 'deliveries':
        return Object.entries(SUPPLIER_DELIVERY_STATUS_LABELS);
      case 'invoices':
        return Object.entries(SUPPLIER_INVOICE_STATUS_LABELS);
      default:
        return [];
    }
  };

  // Reset status filter when tab changes
  useEffect(() => {
    setStatusFilter('all');
  }, [activeTab]);

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader
        title="📦 Beschaffung"
        showBackButton
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProcurementTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-gradient-to-r from-gray-100 to-gray-200 p-1 rounded-lg shadow-md">
            <TabsTrigger
              value="requests"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all"
            >
              <FileText className="h-4 w-4 mr-2" />
              Anfragen
              {counts.requests > 0 && (
                <Badge variant="secondary" className="ml-2">{counts.requests}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Bestellungen
              {counts.orders > 0 && (
                <Badge variant="secondary" className="ml-2">{counts.orders}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="deliveries"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all"
            >
              <Truck className="h-4 w-4 mr-2" />
              Lieferungen
              {counts.deliveries > 0 && (
                <Badge variant="secondary" className="ml-2">{counts.deliveries}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="invoices"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Rechnungen
              {counts.invoices > 0 && (
                <Badge className="ml-2 bg-yellow-500">{counts.invoices}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="emailOffers"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              E-Mail-Angebote
              {emailOffersCount > 0 && (
                <Badge className="ml-2 bg-blue-500">{emailOffersCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Filter Bar - shared across all tabs */}
          <Card className="mb-6 border-2 border-[#058bc0] shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  🔍 Filter & Suche
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  disabled={loading}
                  className="border-white text-white hover:bg-white/20"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Suchen (Nr. / Lieferant)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Supplier Filter */}
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Lieferanten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Lieferanten</SelectItem>
                    <SelectItem value="none">Ohne Lieferant</SelectItem>
                    {suppliers
                      .filter(s => s.id && s.id.trim() !== '') // Guard: skip items with empty id
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.status === 'archived' && <Lock className="h-3 w-3 inline mr-1" />}
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Project Filter */}
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Projekte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Projekte</SelectItem>
                    {projectOptions
                      .filter(p => p.id && p.id.trim() !== '') // Guard: skip items with empty id
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.number} - {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    {getStatusOptions()
                      .filter(([value]) => value && value.trim() !== '') // Guard: skip items with empty value
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Filter zurücksetzen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <Card className="border-2 border-gray-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Anfragen
                    <Badge className="ml-2 bg-white/25 border-0">{filteredRequests.length}</Badge>
                  </CardTitle>
                  <Button
                    onClick={() => handleNewDocument('request')}
                    className="bg-white text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Anfrage
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
                    <span className="ml-3 text-gray-600">Lade Anfragen...</span>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Keine Anfragen vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRequests.map((req) => {
                      const isArchived = isSupplierArchived(req.supplierId);
                      const statusColors = PROCUREMENT_REQUEST_STATUS_COLORS[req.status];
                      return (
                        <div
                          key={req.id}
                          className={`bg-white rounded-lg border-2 p-4 hover:shadow-lg transition-all cursor-pointer ${
                            isArchived ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => {
                            setEditingRequest(req);
                            setShowRequestEditor(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {isArchived && <Lock className="h-4 w-4 text-amber-600" />}
                              <div>
                                <div className="font-bold text-gray-900">{req.requestNumber}</div>
                                <div className="text-sm text-gray-600">{req.title}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-700">
                                  {req.supplierId ? (
                                    req.supplierSnapshot?.name || 'Lieferant'
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-gray-400 italic flex items-center gap-1 cursor-help">
                                            <Mail className="h-3 w-3" />
                                            (noch kein Lieferant)
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-xs">
                                          <p>Diese Anfrage wurde aus einer E-Mail erstellt und hat noch keinen verknüpften Lieferanten.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(req.requestedAt)}
                                </div>
                              </div>
                              <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                                {PROCUREMENT_REQUEST_STATUS_LABELS[req.status]}
                              </Badge>
                              {req.status === 'draft' && !isArchived && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmAction({
                                      type: 'send_request',
                                      id: req.id,
                                      message: 'Anfrage als gesendet markieren?',
                                    });
                                  }}
                                >
                                  Senden
                                </Button>
                              )}
                            </div>
                          </div>
                          {req.project && (
                            <div className="mt-2 text-xs text-gray-500">
                              📁 {req.project.projectNumber} - {req.project.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="border-2 border-gray-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Bestellungen
                    <Badge className="ml-2 bg-white/25 border-0">{filteredOrders.length}</Badge>
                  </CardTitle>
                  <Button
                    onClick={() => handleNewDocument('order')}
                    className="bg-white text-purple-600 hover:bg-purple-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Bestellung
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
                    <span className="ml-3 text-gray-600">Lade Bestellungen...</span>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Keine Bestellungen vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => {
                      const isArchived = isSupplierArchived(order.supplierId);
                      const statusColors = PURCHASE_ORDER_STATUS_COLORS[order.status];
                      return (
                        <div
                          key={order.id}
                          className={`bg-white rounded-lg border-2 p-4 hover:shadow-lg transition-all cursor-pointer ${
                            isArchived ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 hover:border-purple-300'
                          }`}
                          onClick={() => {
                            setEditingOrder(order);
                            setShowOrderEditor(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {isArchived && <Lock className="h-4 w-4 text-amber-600" />}
                              <div>
                                <div className="font-bold text-gray-900">{order.orderNumber}</div>
                                <div className="text-sm text-gray-600">
                                  {order.supplierSnapshot?.name}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  {formatCurrency(order.totals?.gross || 0)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(order.orderedAt)}
                                </div>
                              </div>
                              <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                                {PURCHASE_ORDER_STATUS_LABELS[order.status]}
                              </Badge>
                              {order.status === 'ordered' && !isArchived && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDelivery(null);
                                    setShowDeliveryEditor(true);
                                  }}
                                >
                                  <Truck className="h-4 w-4 mr-1" />
                                  Lieferung
                                </Button>
                              )}
                            </div>
                          </div>
                          {order.project && (
                            <div className="mt-2 text-xs text-gray-500">
                              📁 {order.project.projectNumber} - {order.project.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card className="border-2 border-gray-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Lieferungen
                    <Badge className="ml-2 bg-white/25 border-0">{filteredDeliveries.length}</Badge>
                  </CardTitle>
                  <Button
                    onClick={() => handleNewDocument('delivery')}
                    className="bg-white text-orange-600 hover:bg-orange-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Lieferung
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
                    <span className="ml-3 text-gray-600">Lade Lieferungen...</span>
                  </div>
                ) : filteredDeliveries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Keine Lieferungen vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDeliveries.map((delivery) => {
                      const isArchived = isSupplierArchived(delivery.supplierId);
                      const statusColors = SUPPLIER_DELIVERY_STATUS_COLORS[delivery.status];
                      return (
                        <div
                          key={delivery.id}
                          className={`bg-white rounded-lg border-2 p-4 hover:shadow-lg transition-all cursor-pointer ${
                            isArchived ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 hover:border-orange-300'
                          }`}
                          onClick={() => {
                            setEditingDelivery(delivery);
                            setShowDeliveryEditor(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {isArchived && <Lock className="h-4 w-4 text-amber-600" />}
                              <div>
                                <div className="font-bold text-gray-900">{delivery.deliveryNoteNumber}</div>
                                <div className="text-sm text-gray-600">
                                  {delivery.supplierSnapshot?.name}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm text-gray-700">
                                  {delivery.purchaseOrderNumber && `Bestellung: ${delivery.purchaseOrderNumber}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(delivery.deliveredAt)}
                                </div>
                              </div>
                              <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                                {SUPPLIER_DELIVERY_STATUS_LABELS[delivery.status]}
                              </Badge>
                              {delivery.status === 'received' && !isArchived && (
                                <Button
                                  size="sm"
                                  className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmAction({
                                      type: 'confirm_delivery',
                                      id: delivery.id,
                                      message: 'Wareneingang bestätigen? Die Materialien werden ins Lager gebucht.',
                                    });
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Bestätigen
                                </Button>
                              )}
                            </div>
                          </div>
                          {delivery.project && (
                            <div className="mt-2 text-xs text-gray-500">
                              📁 {delivery.project.projectNumber} - {delivery.project.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="border-2 border-gray-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Eingangsrechnungen
                    <Badge className="ml-2 bg-white/25 border-0">{filteredInvoices.length}</Badge>
                  </CardTitle>
                  <Button
                    onClick={() => handleNewDocument('invoice')}
                    className="bg-white text-green-600 hover:bg-green-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Eingangsrechnung
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
                    <span className="ml-3 text-gray-600">Lade Rechnungen...</span>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Keine Eingangsrechnungen vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInvoices.map((invoice) => {
                      const isArchived = isSupplierArchived(invoice.supplierId);
                      const statusColors = SUPPLIER_INVOICE_STATUS_COLORS[invoice.status];
                      return (
                        <div
                          key={invoice.id}
                          className={`bg-white rounded-lg border-2 p-4 hover:shadow-lg transition-all cursor-pointer ${
                            isArchived ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 hover:border-green-300'
                          }`}
                          onClick={() => {
                            setEditingInvoice(invoice);
                            setShowInvoiceEditor(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {isArchived && <Lock className="h-4 w-4 text-amber-600" />}
                              <div>
                                <div className="font-bold text-gray-900">{invoice.invoiceNumber}</div>
                                <div className="text-sm text-gray-600">
                                  {invoice.supplierSnapshot?.name}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  {formatCurrency(invoice.totals?.gross || 0)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {invoice.openAmount > 0 && (
                                    <span className="text-amber-600">
                                      Offen: {formatCurrency(invoice.openAmount)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                                {SUPPLIER_INVOICE_STATUS_LABELS[invoice.status]}
                              </Badge>
                              {(invoice.status === 'open' || invoice.status === 'partial') && !isArchived && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmAction({
                                      type: 'mark_paid',
                                      id: invoice.id,
                                      message: 'Rechnung als vollständig bezahlt markieren?',
                                    });
                                  }}
                                >
                                  Als bezahlt
                                </Button>
                              )}
                            </div>
                          </div>
                          {invoice.project && (
                            <div className="mt-2 text-xs text-gray-500">
                              📁 {invoice.project.projectNumber} - {invoice.project.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Offers Tab */}
          <TabsContent value="emailOffers">
            <EmailOffersTab
              onOpenRequest={(requestId) => {
                // Find and open the request
                const request = requests.find(r => r.id === requestId);
                if (request) {
                  setEditingRequest(request);
                  setShowRequestEditor(true);
                }
              }}
              onOpenProject={(projectId) => {
                // Navigate to project - could be enhanced
                console.debug('[ProcurementPortal] Navigate to project:', projectId);
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Request Editor Dialog - Styled like InvoicingPortal */}
      <Dialog open={showRequestEditor} onOpenChange={setShowRequestEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">{editingRequest ? '📋' : '✨'}</span>
              {editingRequest ? 'Anfrage bearbeiten' : 'Neue Anfrage'}
            </DialogTitle>
            <div className="text-sm text-blue-100 mt-1">
              {editingRequest 
                ? `Anfrage ${editingRequest.requestNumber || ''} bearbeiten`
                : 'Erstellen Sie eine neue Anfrage an einen Lieferanten'}
            </div>
          </DialogHeader>
          {(editingRequest || selectedSupplierForNew) && (
            <RequestEditor
              supplier={editingRequest ? getSupplierById(editingRequest.supplierId)! : selectedSupplierForNew!}
              supplierSnapshot={editingRequest?.supplierSnapshot || {
                id: selectedSupplierForNew?.id || '',
                name: selectedSupplierForNew?.name || '',
                vatId: selectedSupplierForNew?.vatId,
                iban: selectedSupplierForNew?.iban,
              }}
              existingRequest={editingRequest || undefined}
              onSaved={() => {
                setShowRequestEditor(false);
                setEditingRequest(null);
                loadData();
              }}
              onCancel={() => {
                setShowRequestEditor(false);
                setEditingRequest(null);
              }}
              isReadOnly={editingRequest ? isSupplierArchived(editingRequest.supplierId) : false}
            />
          )}
          {!editingRequest && !selectedSupplierForNew && (
            <div className="p-4">
              <p className="text-gray-600 mb-4">Bitte wählen Sie zuerst einen Lieferanten:</p>
              <Select onValueChange={(id) => {
                const supplier = getSupplierById(id);
                if (supplier) setSelectedSupplierForNew(supplier);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Lieferant auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter(s => s.status !== 'archived' && s.id && s.id.trim() !== '') // Guard: skip archived and empty id
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Editor Dialog - Styled like InvoicingPortal */}
      <Dialog open={showOrderEditor} onOpenChange={setShowOrderEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">{editingOrder ? '📦' : '✨'}</span>
              {editingOrder ? 'Bestellung bearbeiten' : 'Neue Bestellung'}
            </DialogTitle>
            <div className="text-sm text-blue-100 mt-1">
              {editingOrder 
                ? `Bestellung ${editingOrder.orderNumber || ''} bearbeiten`
                : 'Erstellen Sie eine neue Bestellung an einen Lieferanten'}
            </div>
          </DialogHeader>
          {(editingOrder || selectedSupplierForNew) && (
            <PurchaseOrderEditor
              supplier={editingOrder ? getSupplierById(editingOrder.supplierId)! : selectedSupplierForNew!}
              supplierSnapshot={editingOrder?.supplierSnapshot || {
                id: selectedSupplierForNew?.id || '',
                name: selectedSupplierForNew?.name || '',
                vatId: selectedSupplierForNew?.vatId,
                iban: selectedSupplierForNew?.iban,
              }}
              existingOrder={editingOrder || undefined}
              requests={requests.filter(r => r.status === 'sent' && r.supplierId === (editingOrder?.supplierId || selectedSupplierForNew?.id))}
              onSaved={() => {
                setShowOrderEditor(false);
                setEditingOrder(null);
                loadData();
              }}
              onCancel={() => {
                setShowOrderEditor(false);
                setEditingOrder(null);
              }}
              isReadOnly={editingOrder ? isSupplierArchived(editingOrder.supplierId) : false}
            />
          )}
          {!editingOrder && !selectedSupplierForNew && (
            <div className="p-4">
              <p className="text-gray-600 mb-4">Bitte wählen Sie zuerst einen Lieferanten:</p>
              <Select onValueChange={(id) => {
                const supplier = getSupplierById(id);
                if (supplier) setSelectedSupplierForNew(supplier);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Lieferant auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter(s => s.status !== 'archived' && s.id && s.id.trim() !== '') // Guard: skip archived and empty id
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Editor Dialog - Styled like InvoicingPortal */}
      <Dialog open={showDeliveryEditor} onOpenChange={setShowDeliveryEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">{editingDelivery ? '🚚' : '✨'}</span>
              {editingDelivery ? 'Lieferung bearbeiten' : 'Neue Lieferung'}
            </DialogTitle>
            <div className="text-sm text-blue-100 mt-1">
              {editingDelivery 
                ? `Lieferung ${editingDelivery.deliveryNoteNumber || ''} bearbeiten`
                : 'Erfassen Sie eine neue Lieferung von einem Lieferanten'}
            </div>
          </DialogHeader>
          {(editingDelivery || selectedSupplierForNew) && (
            <DeliveryEditor
              supplier={editingDelivery ? getSupplierById(editingDelivery.supplierId)! : selectedSupplierForNew!}
              supplierSnapshot={editingDelivery?.supplierSnapshot || {
                id: selectedSupplierForNew?.id || '',
                name: selectedSupplierForNew?.name || '',
                vatId: selectedSupplierForNew?.vatId,
                iban: selectedSupplierForNew?.iban,
              }}
              existingDelivery={editingDelivery || undefined}
              orders={orders.filter(o => (o.status === 'ordered' || o.status === 'partially_delivered') && o.supplierId === (editingDelivery?.supplierId || selectedSupplierForNew?.id))}
              onSaved={() => {
                setShowDeliveryEditor(false);
                setEditingDelivery(null);
                loadData();
              }}
              onCancel={() => {
                setShowDeliveryEditor(false);
                setEditingDelivery(null);
              }}
              isReadOnly={editingDelivery ? isSupplierArchived(editingDelivery.supplierId) : false}
            />
          )}
          {!editingDelivery && !selectedSupplierForNew && (
            <div className="p-4">
              <p className="text-gray-600 mb-4">Bitte wählen Sie zuerst einen Lieferanten:</p>
              <Select onValueChange={(id) => {
                const supplier = getSupplierById(id);
                if (supplier) setSelectedSupplierForNew(supplier);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Lieferant auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter(s => s.status !== 'archived' && s.id && s.id.trim() !== '') // Guard: skip archived and empty id
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Editor Dialog - Styled like InvoicingPortal */}
      <Dialog open={showInvoiceEditor} onOpenChange={setShowInvoiceEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">{editingInvoice ? '🧾' : '✨'}</span>
              {editingInvoice ? 'Rechnung bearbeiten' : 'Neue Eingangsrechnung'}
            </DialogTitle>
            <div className="text-sm text-blue-100 mt-1">
              {editingInvoice 
                ? `Rechnung ${editingInvoice.invoiceNumber || ''} bearbeiten`
                : 'Erfassen Sie eine neue Eingangsrechnung'}
            </div>
          </DialogHeader>
          {(editingInvoice || selectedSupplierForNew) && (
            <SupplierInvoiceEditor
              supplier={editingInvoice ? getSupplierById(editingInvoice.supplierId)! : selectedSupplierForNew!}
              supplierSnapshot={editingInvoice?.supplierSnapshot || {
                id: selectedSupplierForNew?.id || '',
                name: selectedSupplierForNew?.name || '',
                vatId: selectedSupplierForNew?.vatId,
                iban: selectedSupplierForNew?.iban,
              }}
              existingInvoice={editingInvoice || undefined}
              deliveries={deliveries.filter(d => d.status === 'confirmed' && d.supplierId === (editingInvoice?.supplierId || selectedSupplierForNew?.id))}
              onSaved={() => {
                setShowInvoiceEditor(false);
                setEditingInvoice(null);
                loadData();
              }}
              onCancel={() => {
                setShowInvoiceEditor(false);
                setEditingInvoice(null);
              }}
              isReadOnly={editingInvoice ? isSupplierArchived(editingInvoice.supplierId) : false}
            />
          )}
          {!editingInvoice && !selectedSupplierForNew && (
            <div className="p-4">
              <p className="text-gray-600 mb-4">Bitte wählen Sie zuerst einen Lieferanten:</p>
              <Select onValueChange={(id) => {
                const supplier = getSupplierById(id);
                if (supplier) setSelectedSupplierForNew(supplier);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Lieferant auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter(s => s.status !== 'archived' && s.id && s.id.trim() !== '') // Guard: skip archived and empty id
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestätigung</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmAction} className="bg-[#058bc0] hover:bg-[#0470a0]">
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProcurementPortal;

