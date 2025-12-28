/**
 * SupplierResourcesCard - Procurement workflow tabs for a supplier
 * 
 * Tabs:
 * - Anfragen (Procurement Requests / RFQs)
 * - Auftrag erteilt (Purchase Orders)
 * - Geliefert (Deliveries)
 * - Rechnung/Verlauf (Invoices & History)
 * 
 * German UI throughout
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Clock,
  AlertCircle,
  RefreshCw,
  Package,
  History,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProcurementService } from '@/services/procurementService';
import { MaterialsService } from '@/services/materialsService';
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
  ProcurementHistoryEvent,
  PROCUREMENT_EVENT_LABELS,
} from '@/types/procurement';

// Import the editor components (will be created next)
import RequestEditor from './RequestEditor';
import PurchaseOrderEditor from './PurchaseOrderEditor';
import DeliveryEditor from './DeliveryEditor';
import SupplierInvoiceEditor from './SupplierInvoiceEditor';

interface SupplierResourcesCardProps {
  supplier: Supplier;
  isReadOnly?: boolean;
}

const SupplierResourcesCard: React.FC<SupplierResourcesCardProps> = ({
  supplier,
  isReadOnly = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernID = user?.concernID || user?.ConcernID;

  // State
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [history, setHistory] = useState<ProcurementHistoryEvent[]>([]);

  // Editor state
  const [showRequestEditor, setShowRequestEditor] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ProcurementRequest | null>(null);
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [showDeliveryEditor, setShowDeliveryEditor] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<SupplierDelivery | null>(null);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    id: string;
    message: string;
  } | null>(null);

  // Services
  const procurementService = useMemo(() => {
    if (!concernID) return null;
    return new ProcurementService(concernID);
  }, [concernID]);

  const materialsService = useMemo(() => {
    if (!concernID) return null;
    return new MaterialsService(concernID);
  }, [concernID]);

  // User snapshot for audit
  const userSnapshot: UserSnapshot = useMemo(() => ({
    userId: user?.uid || '',
    name: user?.displayName || user?.vorname || user?.email || '',
  }), [user]);

  // Supplier snapshot for documents
  const supplierSnapshot: SupplierSnapshot = useMemo(() => ({
    id: supplier.id,
    name: supplier.name,
    vatId: supplier.vatId,
    iban: supplier.iban,
  }), [supplier]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!procurementService) return;
    
    setLoading(true);
    try {
      const [reqData, ordData, delData, invData, histData] = await Promise.all([
        procurementService.getRequestsBySupplier(supplier.id),
        procurementService.getOrdersBySupplier(supplier.id),
        procurementService.getDeliveriesBySupplier(supplier.id),
        procurementService.getInvoicesBySupplier(supplier.id),
        procurementService.getSupplierHistory(supplier.id),
      ]);
      
      setRequests(reqData);
      setOrders(ordData);
      setDeliveries(delData);
      setInvoices(invData);
      setHistory(histData);
    } catch (error) {
      console.error('Error loading procurement data:', error);
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [procurementService, supplier.id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Counts for badges
  const counts = useMemo(() => ({
    requests: requests.length,
    orders: orders.filter(o => o.status !== 'cancelled').length,
    deliveries: deliveries.length,
    invoices: invoices.filter(i => i.status === 'open' || i.status === 'partial').length,
  }), [requests, orders, deliveries, invoices]);

  // Format date helper
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('de-DE');
  };

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Handle workflow actions
  const handleConfirmDelivery = async (deliveryId: string) => {
    if (!procurementService || !materialsService) return;
    
    try {
      // Confirm the delivery
      const confirmedDelivery = await procurementService.confirmDelivery(deliveryId, userSnapshot);
      
      // Process inbound stock
      const updatedLineItems = await materialsService.processDeliveryInbound(confirmedDelivery, userSnapshot);
      
      // Update delivery with material links
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

  // Render loading state
  if (loading) {
    return (
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
          <span className="ml-3 text-gray-600">Lade Ressourcen...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-[#058bc0] shadow-lg">
      <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            Ressourcen & Beschaffung
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
      <CardContent className="pt-6">
        {isReadOnly && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            🔒 Dieser Lieferant ist archiviert. Neue Dokumente können nicht erstellt werden.
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Anfragen
              {counts.requests > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.requests}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Bestellungen
              {counts.orders > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.orders}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Lieferungen
              {counts.deliveries > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.deliveries}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Rechnungen
              {counts.invoices > 0 && (
                <Badge className="ml-1 bg-yellow-500">{counts.invoices}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {!isReadOnly && (
                  <Button
                    onClick={() => {
                      setEditingRequest(null);
                      setShowRequestEditor(true);
                    }}
                    className="bg-[#058bc0] hover:bg-[#0470a0]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Anfrage
                  </Button>
                )}
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Anfragen vorhanden</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Nr.</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Projekt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow
                          key={req.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setEditingRequest(req);
                            setShowRequestEditor(true);
                          }}
                        >
                          <TableCell className="font-mono">{req.requestNumber}</TableCell>
                          <TableCell>{req.title}</TableCell>
                          <TableCell>{formatDate(req.requestedAt)}</TableCell>
                          <TableCell>{req.project?.projectNumber || '-'}</TableCell>
                          <TableCell>
                            <Badge className={`${PROCUREMENT_REQUEST_STATUS_COLORS[req.status].bg} ${PROCUREMENT_REQUEST_STATUS_COLORS[req.status].text}`}>
                              {PROCUREMENT_REQUEST_STATUS_LABELS[req.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {req.status === 'draft' && !isReadOnly && (
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {!isReadOnly && (
                  <Button
                    onClick={() => {
                      setEditingOrder(null);
                      setShowOrderEditor(true);
                    }}
                    className="bg-[#058bc0] hover:bg-[#0470a0]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Bestellung
                  </Button>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Bestellungen vorhanden</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Nr.</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Projekt</TableHead>
                        <TableHead className="text-right">Summe</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setEditingOrder(order);
                            setShowOrderEditor(true);
                          }}
                        >
                          <TableCell className="font-mono">{order.orderNumber}</TableCell>
                          <TableCell>{formatDate(order.orderedAt)}</TableCell>
                          <TableCell>{order.project?.projectNumber || '-'}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(order.totals.gross)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${PURCHASE_ORDER_STATUS_COLORS[order.status].bg} ${PURCHASE_ORDER_STATUS_COLORS[order.status].text}`}>
                              {PURCHASE_ORDER_STATUS_LABELS[order.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {order.status === 'ordered' && !isReadOnly && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDelivery(null);
                                  // Pass order context to delivery editor
                                  setShowDeliveryEditor(true);
                                }}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Lieferung
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {!isReadOnly && (
                  <Button
                    onClick={() => {
                      setEditingDelivery(null);
                      setShowDeliveryEditor(true);
                    }}
                    className="bg-[#058bc0] hover:bg-[#0470a0]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Lieferung
                  </Button>
                )}
              </div>

              {deliveries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Lieferungen vorhanden</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Lieferschein-Nr.</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Bestellung</TableHead>
                        <TableHead>Projekt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow
                          key={delivery.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setEditingDelivery(delivery);
                            setShowDeliveryEditor(true);
                          }}
                        >
                          <TableCell className="font-mono">{delivery.deliveryNoteNumber}</TableCell>
                          <TableCell>{formatDate(delivery.deliveredAt)}</TableCell>
                          <TableCell>{delivery.purchaseOrderNumber || '-'}</TableCell>
                          <TableCell>{delivery.project?.projectNumber || '-'}</TableCell>
                          <TableCell>
                            <Badge className={`${SUPPLIER_DELIVERY_STATUS_COLORS[delivery.status].bg} ${SUPPLIER_DELIVERY_STATUS_COLORS[delivery.status].text}`}>
                              {SUPPLIER_DELIVERY_STATUS_LABELS[delivery.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {delivery.status === 'received' && !isReadOnly && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Invoices & History Tab */}
          <TabsContent value="invoices">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoices List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Rechnungen
                  </h3>
                  {!isReadOnly && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingInvoice(null);
                        setShowInvoiceEditor(true);
                      }}
                      className="bg-[#058bc0] hover:bg-[#0470a0]"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Neue Rechnung
                    </Button>
                  )}
                </div>

                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Keine Rechnungen</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Nr.</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => (
                          <TableRow
                            key={inv.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              setEditingInvoice(inv);
                              setShowInvoiceEditor(true);
                            }}
                          >
                            <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(inv.totals.gross)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${SUPPLIER_INVOICE_STATUS_COLORS[inv.status].bg} ${SUPPLIER_INVOICE_STATUS_COLORS[inv.status].text}`}>
                                {SUPPLIER_INVOICE_STATUS_LABELS[inv.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* History Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Verlauf
                </h3>

                {history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    <History className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Keine Aktivitäten</p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-4">
                      {history.slice(0, 20).map((event, idx) => {
                        // Support both legacy 'type' and new 'eventKey' fields
                        const eventKey = event.eventKey ?? event.type;
                        return (
                          <div key={idx} className="flex gap-3 text-sm">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              {(eventKey === 'created' || eventKey === 'created_from_crm_inquiry') && <Plus className="h-4 w-4 text-green-600" />}
                              {eventKey === 'sent' && <FileText className="h-4 w-4 text-blue-600" />}
                              {eventKey === 'order_placed' && <ShoppingCart className="h-4 w-4 text-purple-600" />}
                              {eventKey === 'delivery_received' && <Truck className="h-4 w-4 text-orange-600" />}
                              {eventKey === 'delivery_confirmed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {eventKey === 'invoice_received' && <Receipt className="h-4 w-4 text-cyan-600" />}
                              {eventKey === 'payment_recorded' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {eventKey === 'updated' && <Clock className="h-4 w-4 text-gray-600" />}
                              {eventKey === 'status_changed' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-900">{event.message}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(event.at)}
                                {event.byUserName && ` · ${event.byUserName}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Request Editor Dialog */}
      <Dialog open={showRequestEditor} onOpenChange={setShowRequestEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRequest ? 'Anfrage bearbeiten' : 'Neue Anfrage'}
            </DialogTitle>
          </DialogHeader>
          <RequestEditor
            supplier={supplier}
            supplierSnapshot={supplierSnapshot}
            existingRequest={editingRequest || undefined}
            onSaved={() => {
              setShowRequestEditor(false);
              loadData();
            }}
            onCancel={() => setShowRequestEditor(false)}
            isReadOnly={isReadOnly}
          />
        </DialogContent>
      </Dialog>

      {/* Order Editor Dialog */}
      <Dialog open={showOrderEditor} onOpenChange={setShowOrderEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? 'Bestellung bearbeiten' : 'Neue Bestellung'}
            </DialogTitle>
          </DialogHeader>
          <PurchaseOrderEditor
            supplier={supplier}
            supplierSnapshot={supplierSnapshot}
            existingOrder={editingOrder || undefined}
            requests={requests.filter(r => r.status === 'sent')}
            onSaved={() => {
              setShowOrderEditor(false);
              loadData();
            }}
            onCancel={() => setShowOrderEditor(false)}
            isReadOnly={isReadOnly}
          />
        </DialogContent>
      </Dialog>

      {/* Delivery Editor Dialog */}
      <Dialog open={showDeliveryEditor} onOpenChange={setShowDeliveryEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDelivery ? 'Lieferung bearbeiten' : 'Neue Lieferung'}
            </DialogTitle>
          </DialogHeader>
          <DeliveryEditor
            supplier={supplier}
            supplierSnapshot={supplierSnapshot}
            existingDelivery={editingDelivery || undefined}
            orders={orders.filter(o => o.status === 'ordered' || o.status === 'partially_delivered')}
            onSaved={() => {
              setShowDeliveryEditor(false);
              loadData();
            }}
            onCancel={() => setShowDeliveryEditor(false)}
            isReadOnly={isReadOnly}
          />
        </DialogContent>
      </Dialog>

      {/* Invoice Editor Dialog */}
      <Dialog open={showInvoiceEditor} onOpenChange={setShowInvoiceEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? 'Rechnung bearbeiten' : 'Neue Rechnung'}
            </DialogTitle>
          </DialogHeader>
          <SupplierInvoiceEditor
            supplier={supplier}
            supplierSnapshot={supplierSnapshot}
            existingInvoice={editingInvoice || undefined}
            deliveries={deliveries.filter(d => d.status === 'confirmed')}
            onSaved={() => {
              setShowInvoiceEditor(false);
              loadData();
            }}
            onCancel={() => setShowInvoiceEditor(false)}
            isReadOnly={isReadOnly}
          />
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
    </Card>
  );
};

export default SupplierResourcesCard;

