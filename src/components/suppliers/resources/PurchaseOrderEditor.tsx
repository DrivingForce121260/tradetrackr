/**
 * PurchaseOrderEditor - Create/Edit purchase orders (Bestellungen)
 * Can be created from a request or directly
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
import { PurchaseOrder, ProcurementRequest, OrderLineItem } from '@/types/procurement';
import { MATERIAL_UNITS } from '@/types/materials';

interface PurchaseOrderEditorProps {
  supplier: Supplier;
  supplierSnapshot: SupplierSnapshot;
  existingOrder?: PurchaseOrder;
  requests?: ProcurementRequest[];
  onSaved: () => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

const PurchaseOrderEditor: React.FC<PurchaseOrderEditorProps> = ({
  supplier,
  supplierSnapshot,
  existingOrder,
  requests = [],
  onSaved,
  onCancel,
  isReadOnly = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernID = user?.concernID || user?.ConcernID;

  // Form state
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number | undefined>();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([
    { position: 1, description: '', qty: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 },
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
    if (existingOrder) {
      setNotes(existingOrder.notes || '');
      setPaymentTermsDays(existingOrder.paymentTermsDays);
      setDeliveryAddress(existingOrder.deliveryAddress || '');
      setLineItems(existingOrder.lineItems.length > 0 
        ? existingOrder.lineItems 
        : [{ position: 1, description: '', qty: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 }]
      );
    }
  }, [existingOrder]);

  // Load from selected request
  const handleRequestSelect = (requestId: string) => {
    // Handle "none" selection - clear the request
    if (requestId === '__none__') {
      setSelectedRequestId('');
      setLineItems([{ position: 1, description: '', qty: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 }]);
      return;
    }
    setSelectedRequestId(requestId);
    const request = requests.find(r => r.id === requestId);
    if (request) {
      // Convert request line items to order line items (add pricing)
      const orderItems: OrderLineItem[] = request.lineItems.map(li => ({
        position: li.position,
        description: li.description,
        sku: li.sku,
        qty: li.qty,
        unit: li.unit,
        unitPriceNet: li.unitPriceNet || 0,
        vatRate: li.vatRate || 19,
        notes: li.notes,
      }));
      setLineItems(orderItems.length > 0 ? orderItems : [
        { position: 1, description: '', qty: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 },
      ]);
      setNotes(request.notes || '');
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    let net = 0;
    let vat = 0;
    for (const item of lineItems) {
      const lineNet = (item.qty || 0) * (item.unitPriceNet || 0);
      const lineVat = lineNet * ((item.vatRate || 0) / 100);
      net += lineNet;
      vat += lineVat;
    }
    return {
      net: Math.round(net * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      gross: Math.round((net + vat) * 100) / 100,
    };
  }, [lineItems]);

  // Line item operations
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { position: lineItems.length + 1, description: '', qty: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    const updated = lineItems.filter((_, i) => i !== index);
    updated.forEach((item, i) => { item.position = i + 1; });
    setLineItems(updated);
  };

  const updateLineItem = (index: number, field: keyof OrderLineItem, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Save
  const handleSave = async () => {
    if (!procurementService) return;

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
      if (existingOrder?.id) {
        await procurementService.updateOrder(existingOrder.id, {
          notes: notes.trim() || undefined,
          paymentTermsDays,
          deliveryAddress: deliveryAddress.trim() || undefined,
          lineItems: validItems,
        }, userSnapshot);
        toast({ title: '✅ Bestellung aktualisiert' });
      } else if (selectedRequestId) {
        // Create from request
        await procurementService.createOrderFromRequest(selectedRequestId, validItems, userSnapshot);
        toast({ title: '✅ Bestellung aus Anfrage erstellt' });
      } else {
        // Direct creation
        await procurementService.createOrder({
          supplierId: supplier.id,
          supplierSnapshot,
          status: 'ordered',
          lineItems: validItems,
          notes: notes.trim() || undefined,
          paymentTermsDays,
          deliveryAddress: deliveryAddress.trim() || undefined,
        }, userSnapshot);
        toast({ title: '✅ Bestellung erstellt' });
      }
      onSaved();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: 'Fehler',
        description: 'Bestellung konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* From Request Selector (only for new orders) */}
      {!existingOrder && requests.length > 0 && (
        <div>
          <Label className="text-sm font-semibold">Aus Anfrage übernehmen</Label>
          <Select value={selectedRequestId} onValueChange={handleRequestSelect}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Anfrage auswählen (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Keine - Neue Bestellung</SelectItem>
              {requests
                .filter(req => req.id && req.id.trim() !== '') // Guard: skip items with empty id
                .map(req => (
                  <SelectItem key={req.id} value={req.id}>
                    {req.requestNumber} - {req.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Order Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold">Zahlungsziel (Tage)</Label>
          <Input
            type="number"
            value={paymentTermsDays || ''}
            onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || undefined)}
            placeholder="z.B. 30"
            disabled={isReadOnly}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Lieferadresse</Label>
          <Input
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Abweichende Lieferadresse"
            disabled={isReadOnly}
            className="mt-1"
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Positionen</Label>
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
            <div className="col-span-3">Beschreibung</div>
            <div className="col-span-1">Menge</div>
            <div className="col-span-2">Einheit</div>
            <div className="col-span-2">Preis (netto)</div>
            <div className="col-span-1">MwSt.</div>
            <div className="col-span-2 text-right">Summe</div>
          </div>
          {lineItems.map((item, index) => {
            const lineTotal = (item.qty || 0) * (item.unitPriceNet || 0);
            return (
              <div key={index} className="p-3 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1 text-center text-gray-500 font-mono">
                  {item.position}
                </div>
                <div className="col-span-3">
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Beschreibung"
                    disabled={isReadOnly}
                    className="text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
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
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.unitPriceNet}
                    onChange={(e) => updateLineItem(index, 'unitPriceNet', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    min={0}
                    step={0.01}
                    className="text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <Select
                    value={String(item.vatRate)}
                    onValueChange={(v) => updateLineItem(index, 'vatRate', parseFloat(v))}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="19">19%</SelectItem>
                      <SelectItem value="7">7%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <span className="text-sm font-semibold">{formatCurrency(lineTotal)}</span>
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
            );
          })}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Netto:</span>
              <span>{formatCurrency(totals.net)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>MwSt.:</span>
              <span>{formatCurrency(totals.vat)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Gesamt:</span>
              <span>{formatCurrency(totals.gross)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold">Notizen</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interne Anmerkungen..."
          disabled={isReadOnly}
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={isSaving || isReadOnly}
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

export default PurchaseOrderEditor;

