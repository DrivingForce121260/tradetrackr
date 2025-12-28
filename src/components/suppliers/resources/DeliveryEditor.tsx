/**
 * DeliveryEditor - Create/Edit supplier deliveries (Lieferungen)
 * Includes delivery note details and line items
 * German UI
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProcurementService } from '@/services/procurementService';
import { Supplier, SupplierSnapshot, UserSnapshot } from '@/types/suppliers';
import { SupplierDelivery, PurchaseOrder, DeliveryLineItem, DeliveryNoteDetails } from '@/types/procurement';
import { MATERIAL_UNITS } from '@/types/materials';

interface DeliveryEditorProps {
  supplier: Supplier;
  supplierSnapshot: SupplierSnapshot;
  existingDelivery?: SupplierDelivery;
  orders?: PurchaseOrder[];
  onSaved: () => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

const DeliveryEditor: React.FC<DeliveryEditorProps> = ({
  supplier,
  supplierSnapshot,
  existingDelivery,
  orders = [],
  onSaved,
  onCancel,
  isReadOnly = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernID = user?.concernID || user?.ConcernID;

  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  // Delivery note details
  const [receiverName, setReceiverName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  
  const [lineItems, setLineItems] = useState<DeliveryLineItem[]>([
    { position: 1, description: '', qtyDelivered: 1, unit: 'Stk' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const procurementService = useMemo(() => {
    if (!concernID) return null;
    return new ProcurementService(concernID);
  }, [concernID]);

  const userSnapshot: UserSnapshot = useMemo(() => ({
    userId: user?.uid || '',
    name: user?.displayName || user?.vorname || user?.email || '',
  }), [user]);

  // Load existing data
  useEffect(() => {
    if (existingDelivery) {
      setDeliveryNoteNumber(existingDelivery.deliveryNoteNumber || '');
      setNotes(existingDelivery.notes || '');
      setReceiverName(existingDelivery.deliveryNote?.receiverName || '');
      setDeliveryAddress(existingDelivery.deliveryNote?.deliveryAddress || '');
      setCarrier(existingDelivery.deliveryNote?.carrier || '');
      setTracking(existingDelivery.deliveryNote?.tracking || '');
      setLineItems(existingDelivery.lineItems.length > 0 
        ? existingDelivery.lineItems 
        : [{ position: 1, description: '', qtyDelivered: 1, unit: 'Stk' }]
      );
      if (existingDelivery.purchaseOrderId) {
        setSelectedOrderId(existingDelivery.purchaseOrderId);
      }
    }
  }, [existingDelivery]);

  // Load from selected order
  const handleOrderSelect = (orderId: string) => {
    // Handle "none" selection - clear the order
    if (orderId === '__none__') {
      setSelectedOrderId('');
      setLineItems([{ position: 1, description: '', qtyDelivered: 1, unit: 'Stk' }]);
      return;
    }
    setSelectedOrderId(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      // Convert order line items to delivery line items
      const deliveryItems: DeliveryLineItem[] = order.lineItems.map(li => ({
        position: li.position,
        description: li.description,
        sku: li.sku,
        qtyOrdered: li.qty,
        qtyDelivered: li.qty - (li.qtyDelivered || 0), // Remaining qty
        unit: li.unit,
      }));
      setLineItems(deliveryItems.length > 0 ? deliveryItems : [
        { position: 1, description: '', qtyDelivered: 1, unit: 'Stk' },
      ]);
      setNotes(order.notes || '');
    }
  };

  // Line item operations
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { position: lineItems.length + 1, description: '', qtyDelivered: 1, unit: 'Stk' },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    const updated = lineItems.filter((_, i) => i !== index);
    updated.forEach((item, i) => { item.position = i + 1; });
    setLineItems(updated);
  };

  const updateLineItem = (index: number, field: keyof DeliveryLineItem, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  // Save
  const handleSave = async () => {
    if (!procurementService) return;

    if (!deliveryNoteNumber.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine Lieferscheinnummer ein.',
        variant: 'destructive',
      });
      return;
    }

    const validItems = lineItems.filter(li => li.description.trim());
    if (validItems.length === 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte fügen Sie mindestens eine Position hinzu.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const deliveryNote: DeliveryNoteDetails = {
        receiverName: receiverName.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        carrier: carrier.trim() || undefined,
        tracking: tracking.trim() || undefined,
      };

      if (existingDelivery?.id) {
        await procurementService.updateDelivery(existingDelivery.id, {
          deliveryNoteNumber: deliveryNoteNumber.trim(),
          deliveryNote,
          lineItems: validItems,
          notes: notes.trim() || undefined,
        }, userSnapshot);
        toast({ title: '✅ Lieferung aktualisiert' });
      } else if (selectedOrderId) {
        // Create from order
        await procurementService.createDeliveryFromOrder(
          selectedOrderId,
          validItems,
          deliveryNoteNumber.trim(),
          userSnapshot
        );
        toast({ title: '✅ Lieferung für Bestellung erfasst' });
      } else {
        // Direct creation
        await procurementService.createDelivery({
          supplierId: supplier.id,
          supplierSnapshot,
          deliveryNoteNumber: deliveryNoteNumber.trim(),
          status: 'received',
          deliveryNote,
          lineItems: validItems,
          notes: notes.trim() || undefined,
        }, userSnapshot);
        toast({ title: '✅ Lieferung erfasst' });
      }
      onSaved();
    } catch (error) {
      console.error('Error saving delivery:', error);
      toast({
        title: 'Fehler',
        description: 'Lieferung konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* From Order Selector (only for new deliveries) */}
      {!existingDelivery && orders.length > 0 && (
        <div>
          <Label className="text-sm font-semibold">Zu Bestellung zuordnen</Label>
          <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Bestellung auswählen (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Keine - Freie Lieferung</SelectItem>
              {orders
                .filter(order => order.id && order.id.trim() !== '') // Guard: skip items with empty id
                .map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.orderNumber} - {order.totals.gross.toFixed(2)} €
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Delivery Note Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold">Lieferscheinnummer *</Label>
          <Input
            value={deliveryNoteNumber}
            onChange={(e) => setDeliveryNoteNumber(e.target.value)}
            placeholder="z.B. LS-2025-001"
            disabled={isReadOnly}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Empfänger</Label>
          <Input
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Name des Empfängers"
            disabled={isReadOnly}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Spediteur/Kurier</Label>
          <Input
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="z.B. DHL, UPS"
            disabled={isReadOnly}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Sendungsnummer</Label>
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Tracking-Nummer"
            disabled={isReadOnly}
            className="mt-1"
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Gelieferte Positionen</Label>
          {!isReadOnly && (
            <Button size="sm" variant="outline" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-1" />
              Position
            </Button>
          )}
        </div>

        <div className="border rounded-lg divide-y">
          <div className="p-3 bg-gray-50 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600">
            <div className="col-span-1">Pos.</div>
            <div className="col-span-4">Beschreibung</div>
            <div className="col-span-2">Art.-Nr./SKU</div>
            <div className="col-span-2">Menge geliefert</div>
            <div className="col-span-2">Einheit</div>
            <div className="col-span-1"></div>
          </div>
          {lineItems.map((item, index) => (
            <div key={index} className="p-3 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-1 text-center text-gray-500 font-mono">
                {item.position}
              </div>
              <div className="col-span-4">
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Beschreibung"
                  disabled={isReadOnly}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={item.sku || ''}
                  onChange={(e) => updateLineItem(index, 'sku', e.target.value)}
                  placeholder="SKU"
                  disabled={isReadOnly}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={item.qtyDelivered}
                  onChange={(e) => updateLineItem(index, 'qtyDelivered', parseFloat(e.target.value) || 0)}
                  disabled={isReadOnly}
                  min={0}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2">
                <Select
                  value={item.unit}
                  onValueChange={(v) => updateLineItem(index, 'unit', v)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex justify-end">
                {!isReadOnly && lineItems.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold">Notizen</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anmerkungen zur Lieferung..."
          disabled={isReadOnly}
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={isSaving || isReadOnly || !deliveryNoteNumber.trim()}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            '✅ Speichern'
          )}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
};

export default DeliveryEditor;

