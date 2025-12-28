/**
 * SupplierInvoiceEditor - Create/Edit supplier invoices (Eingangsrechnungen)
 * Includes payment recording functionality
 * German UI
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Euro, Calendar, Receipt, CreditCard, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProcurementService } from '@/services/procurementService';
import { Supplier, SupplierSnapshot, UserSnapshot } from '@/types/suppliers';
import { 
  SupplierInvoice, 
  PurchaseOrder, 
  SupplierDelivery,
  SupplierInvoicePayment,
  SUPPLIER_INVOICE_STATUS_LABELS 
} from '@/types/procurement';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SupplierInvoiceEditorProps {
  supplier: Supplier;
  supplierSnapshot: SupplierSnapshot;
  existingInvoice?: SupplierInvoice;
  orders?: PurchaseOrder[];
  deliveries?: SupplierDelivery[];
  onSaved: () => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

const SupplierInvoiceEditor: React.FC<SupplierInvoiceEditorProps> = ({
  supplier,
  supplierSnapshot,
  existingInvoice,
  orders = [],
  deliveries = [],
  onSaved,
  onCancel,
  isReadOnly = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernID = user?.concernID || user?.ConcernID;

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [netAmount, setNetAmount] = useState<number>(0);
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [paymentReference, setPaymentReference] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const procurementService = useMemo(() => {
    if (!concernID) return null;
    return new ProcurementService(concernID);
  }, [concernID]);

  const userSnapshot: UserSnapshot = useMemo(() => ({
    userId: user?.uid || '',
    name: user?.displayName || user?.vorname || user?.email || '',
  }), [user]);

  // Calculate totals
  useEffect(() => {
    const gross = netAmount + vatAmount;
    setGrossAmount(gross);
  }, [netAmount, vatAmount]);

  // Load existing data
  useEffect(() => {
    if (existingInvoice) {
      setInvoiceNumber(existingInvoice.invoiceNumber || '');
      setInvoiceDate(existingInvoice.invoiceDate ? 
        new Date((existingInvoice.invoiceDate as Timestamp).toDate()).toISOString().split('T')[0] : '');
      setDueDate(existingInvoice.dueDate ? 
        new Date((existingInvoice.dueDate as Timestamp).toDate()).toISOString().split('T')[0] : '');
      setNetAmount(existingInvoice.totals.net || 0);
      setVatAmount(existingInvoice.totals.vat || 0);
      setGrossAmount(existingInvoice.totals.gross || 0);
      setSelectedOrderId(existingInvoice.purchaseOrderId || '');
      setSelectedDeliveryIds(existingInvoice.deliveryIds || []);
      setNotes(existingInvoice.notes || '');
      
      // Set remaining amount for payment
      const paidAmount = (existingInvoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
      setPaymentAmount((existingInvoice.totals.gross || 0) - paidAmount);
    } else {
      // Set today's date
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      // Default due date 30 days from now
      const due = new Date();
      due.setDate(due.getDate() + 30);
      setDueDate(due.toISOString().split('T')[0]);
    }
  }, [existingInvoice]);

  // Load from selected order
  const handleOrderSelect = (orderId: string) => {
    // Handle "none" selection - clear the order
    if (orderId === '__none__') {
      setSelectedOrderId('');
      setNetAmount(0);
      setVatAmount(0);
      setGrossAmount(0);
      setNotes('');
      return;
    }
    setSelectedOrderId(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setNetAmount(order.totals.net || 0);
      setVatAmount(order.totals.vat || 0);
      setGrossAmount(order.totals.gross || 0);
      setNotes(`Zu Bestellung ${order.orderNumber}`);
    }
  };

  // Calculate paid amount and remaining
  const paidAmount = useMemo(() => {
    if (!existingInvoice?.payments) return 0;
    return existingInvoice.payments.reduce((sum, p) => sum + p.amount, 0);
  }, [existingInvoice?.payments]);

  const remainingAmount = useMemo(() => {
    return grossAmount - paidAmount;
  }, [grossAmount, paidAmount]);

  // Save invoice
  const handleSave = async () => {
    if (!procurementService) return;

    if (!invoiceNumber.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine Rechnungsnummer ein.',
        variant: 'destructive',
      });
      return;
    }

    if (grossAmount <= 0) {
      toast({
        title: 'Fehler',
        description: 'Der Gesamtbetrag muss größer als 0 sein.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const invoiceData = {
        supplierId: supplier.id,
        supplierSnapshot,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate ? Timestamp.fromDate(new Date(invoiceDate)) : undefined,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : undefined,
        status: existingInvoice?.status || 'open' as const,
        totals: {
          net: netAmount,
          vat: vatAmount,
          gross: grossAmount,
          currency: 'EUR' as const,
        },
        purchaseOrderId: selectedOrderId || undefined,
        deliveryIds: selectedDeliveryIds.length > 0 ? selectedDeliveryIds : undefined,
        notes: notes.trim() || undefined,
      };

      if (existingInvoice?.id) {
        await procurementService.updateInvoice(existingInvoice.id, invoiceData, userSnapshot);
        toast({ title: '✅ Rechnung aktualisiert' });
      } else {
        await procurementService.createInvoice(invoiceData, userSnapshot);
        toast({ title: '✅ Rechnung erfasst' });
      }
      onSaved();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: 'Fehler',
        description: 'Rechnung konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Record payment
  const handleRecordPayment = async () => {
    if (!procurementService || !existingInvoice?.id) return;

    if (paymentAmount <= 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie einen gültigen Zahlungsbetrag ein.',
        variant: 'destructive',
      });
      return;
    }

    if (paymentAmount > remainingAmount) {
      toast({
        title: 'Fehler',
        description: 'Der Zahlungsbetrag ist höher als der Restbetrag.',
        variant: 'destructive',
      });
      return;
    }

    setIsRecordingPayment(true);
    try {
      await procurementService.recordPayment(
        existingInvoice.id,
        paymentAmount,
        paymentMethod,
        paymentReference.trim() || undefined,
        userSnapshot
      );
      toast({ title: '✅ Zahlung erfasst' });
      setShowPaymentDialog(false);
      onSaved(); // Refresh data
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Fehler',
        description: 'Zahlung konnte nicht erfasst werden.',
        variant: 'destructive',
      });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const isPaid = existingInvoice?.status === 'paid';
  const isCancelled = existingInvoice?.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {existingInvoice && (
        <div className={`p-3 rounded-lg text-center font-semibold ${
          isPaid ? 'bg-green-100 text-green-800' :
          isCancelled ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {isPaid && '✓ Bezahlt'}
          {isCancelled && '✗ Storniert'}
          {!isPaid && !isCancelled && `⏳ Offen - Restbetrag: ${remainingAmount.toFixed(2)} €`}
        </div>
      )}

      {/* From Order Selector (only for new invoices) */}
      {!existingInvoice && orders.length > 0 && (
        <div>
          <Label className="text-sm font-semibold">Zu Bestellung zuordnen</Label>
          <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Bestellung auswählen (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Keine - Freie Rechnung</SelectItem>
              {orders
                .filter(order => order.id && order.id.trim() !== '') // Guard: skip items with empty id
                .map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.orderNumber} - {order.totals.gross?.toFixed(2)} €
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Invoice Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1">
            <Receipt className="h-4 w-4" /> Rechnungsnummer *
          </Label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="z.B. RE-2025-001"
            disabled={isReadOnly || isPaid}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Rechnungsdatum
          </Label>
          <Input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            disabled={isReadOnly || isPaid}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Fälligkeitsdatum
          </Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isReadOnly || isPaid}
            className="mt-1"
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Euro className="h-4 w-4" /> Beträge
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-sm">Netto (€)</Label>
            <Input
              type="number"
              value={netAmount}
              onChange={(e) => setNetAmount(parseFloat(e.target.value) || 0)}
              disabled={isReadOnly || isPaid}
              min={0}
              step={0.01}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">MwSt. (€)</Label>
            <Input
              type="number"
              value={vatAmount}
              onChange={(e) => setVatAmount(parseFloat(e.target.value) || 0)}
              disabled={isReadOnly || isPaid}
              min={0}
              step={0.01}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Brutto (€)</Label>
            <Input
              type="number"
              value={grossAmount}
              disabled
              className="mt-1 bg-blue-50 font-bold"
            />
          </div>
        </div>
      </div>

      {/* Payment History */}
      {existingInvoice && existingInvoice.payments && existingInvoice.payments.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Zahlungen
          </h4>
          <div className="space-y-2">
            {existingInvoice.payments.map((payment, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{payment.amount.toFixed(2)} €</span>
                  <span className="text-gray-500 text-sm">
                    {payment.method === 'bank' ? 'Überweisung' :
                     payment.method === 'cash' ? 'Bar' :
                     payment.method === 'card' ? 'Karte' : payment.method}
                  </span>
                </div>
                <span className="text-gray-400 text-sm">
                  {payment.paidAt ? new Date((payment.paidAt as Timestamp).toDate()).toLocaleDateString('de-DE') : ''}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Gesamt bezahlt:</span>
              <span className="text-green-700">{paidAmount.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold">Notizen</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anmerkungen zur Rechnung..."
          disabled={isReadOnly}
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {!existingInvoice && (
          <Button
            onClick={handleSave}
            disabled={isSaving || isReadOnly || !invoiceNumber.trim() || grossAmount <= 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              '✅ Rechnung erfassen'
            )}
          </Button>
        )}
        
        {existingInvoice && !isPaid && !isCancelled && (
          <>
            <Button
              onClick={handleSave}
              disabled={isSaving || isReadOnly || !invoiceNumber.trim()}
              variant="outline"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                'Änderungen speichern'
              )}
            </Button>
            <Button
              onClick={() => {
                setPaymentAmount(remainingAmount);
                setShowPaymentDialog(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Zahlung erfassen
            </Button>
          </>
        )}
        
        <Button variant="outline" onClick={onCancel}>
          {existingInvoice ? 'Schließen' : 'Abbrechen'}
        </Button>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Zahlung erfassen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-sm text-gray-600">Offener Betrag</div>
              <div className="text-2xl font-bold text-blue-700">{remainingAmount.toFixed(2)} €</div>
            </div>
            
            <div>
              <Label className="text-sm font-semibold">Zahlungsbetrag (€) *</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                min={0}
                max={remainingAmount}
                step={0.01}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-semibold">Zahlungsart</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Überweisung</SelectItem>
                  <SelectItem value="cash">Bar</SelectItem>
                  <SelectItem value="card">Karte</SelectItem>
                  <SelectItem value="other">Sonstige</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-semibold">Referenz (optional)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="z.B. Transaktions-ID"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={isRecordingPayment || paymentAmount <= 0 || paymentAmount > remainingAmount}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRecordingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                '✓ Zahlung buchen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierInvoiceEditor;

