/**
 * OrderEditor - View and edit orders with consistent styling like OfferEditor
 * 
 * Features:
 * - Read-only mode for completed/converted orders
 * - Consistent card-based layout matching OfferEditor
 * - Same action bar placement and styling
 */

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Trash2 } from 'lucide-react';
import { LineItem, Order, TaxKey } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';

interface OrderEditorProps {
  order: Order;
  onSaved?: () => void;
  onCancel?: () => void;
}

const defaultTaxKeys: TaxKey[] = [
  { key: 'DE19', ratePct: 19, descriptionDe: 'Umsatzsteuer 19%', descriptionEn: 'VAT 19%' },
  { key: 'DE7', ratePct: 7, descriptionDe: 'Umsatzsteuer 7%', descriptionEn: 'VAT 7%' },
  { key: 'DE0', ratePct: 0, descriptionDe: 'Steuerfrei', descriptionEn: 'Tax exempt' },
];

// Orders are read-only when completed, cancelled, or already converted to invoice
const isOrderReadOnly = (order: Order): boolean => {
  return order.state === 'completed' || order.state === 'cancelled';
};

const OrderEditor: React.FC<OrderEditorProps> = ({ order, onSaved, onCancel }) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  
  // Read-only mode for finalized orders
  const isReadOnly = isOrderReadOnly(order);
  
  const [items, setItems] = useState<LineItem[]>(order.lineItems || []);
  const [additionalDiscountAbs, setAdditionalDiscountAbs] = useState<number>(order.additionalDiscountAbs || 0);
  const [taxKeys] = useState<TaxKey[]>(order.taxKeys || defaultTaxKeys);
  const [isSaving, setIsSaving] = useState(false);

  const invoicingService = useMemo(() => {
    if (!concernID || !user?.uid) return null;
    return new InvoicingService(concernID, user.uid);
  }, [concernID, user?.uid]);

  // Calculate totals
  const totals = useMemo(() => {
    let subtotalNet = 0;
    let totalTax = 0;
    
    items.forEach(item => {
      const lineNet = item.quantity * item.unitPrice * (1 - (item.discountPct || 0) / 100);
      subtotalNet += lineNet;
      const taxRate = taxKeys.find(t => t.key === item.taxKey)?.ratePct || 19;
      totalTax += lineNet * (taxRate / 100);
    });
    
    const netAfterDiscount = subtotalNet - additionalDiscountAbs;
    const grandTotal = netAfterDiscount + totalTax;
    
    return {
      subtotalNet,
      netAfterDiscount,
      taxAmount: totalTax,
      grandTotal,
    };
  }, [items, additionalDiscountAbs, taxKeys]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const handleChangeItem = (index: number, field: keyof LineItem, value: any) => {
    if (isReadOnly) return;
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: field === 'quantity' || field === 'unitPrice' || field === 'discountPct' ? Number(value) : value } : it));
  };

  const handleAddItem = () => {
    if (isReadOnly) return;
    setItems(prev => ([...prev, {
      position: prev.length + 1,
      description: '',
      quantity: 1,
      unit: 'Stk',
      unitPrice: 0,
      taxKey: taxKeys[0]?.key || 'DE19'
    }]));
  };

  const handleRemoveItem = (index: number) => {
    if (isReadOnly) return;
    setItems(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i + 1 })));
  };

  const handleSave = async () => {
    // Defensive guard: prevent saving finalized orders
    if (isReadOnly) {
      console.warn('Attempted to save a finalized order - blocked');
      return;
    }
    
    if (!invoicingService) return;
    
    setIsSaving(true);
    
    try {
      await invoicingService.updateOrder(order.id, {
        lineItems: items,
        additionalDiscountAbs,
      });
      onSaved && onSaved();
    } catch (error) {
      console.error('Error saving order:', error);
      alert(`Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Get status label for display
  const getStatusLabel = () => {
    switch (order.state) {
      case 'confirmed': return { text: 'Bestätigt', color: 'bg-blue-100 text-blue-800' };
      case 'in_progress': return { text: 'In Bearbeitung', color: 'bg-yellow-100 text-yellow-800' };
      case 'completed': return { text: 'Abgeschlossen', color: 'bg-green-100 text-green-800' };
      case 'cancelled': return { text: 'Storniert', color: 'bg-red-100 text-red-800' };
      default: return { text: 'Entwurf', color: 'bg-gray-100 text-gray-600' };
    }
  };

  const statusLabel = getStatusLabel();

  return (
    <div className="space-y-6">
      {/* Read-Only Banner for Finalized Orders */}
      {isReadOnly && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              Dieser Auftrag ist abgeschlossen und kann nicht mehr bearbeitet werden.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Sie können den Auftrag nur ansehen. Abgeschlossene Aufträge können nicht geändert werden.
            </p>
          </div>
        </div>
      )}

      {/* Order Information Card */}
      <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📋</span>
            Auftrag {order.number}
            <span className={`ml-3 px-3 py-1 rounded-full text-sm font-semibold ${statusLabel.color}`}>
              {statusLabel.text}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="font-semibold text-gray-900">Kunde</Label>
              <Input 
                value={order.clientSnapshot?.name || ''} 
                disabled 
                className="bg-gray-100 border-2 border-purple-300 font-semibold h-11"
              />
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Auftragsdatum</Label>
              <Input 
                type="date" 
                value={order.issueDate || ''} 
                disabled
                className="bg-gray-100 border-2 border-purple-300 font-semibold h-11"
              />
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Fälligkeitsdatum</Label>
              <Input 
                type="date" 
                value={order.dueDate || ''} 
                disabled
                className="bg-gray-100 border-2 border-purple-300 font-semibold h-11"
              />
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Sprache</Label>
              <Input 
                value={order.locale === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'} 
                disabled
                className="bg-gray-100 border-2 border-purple-300 font-semibold h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-3xl">📝</span>
              Positionen
            </CardTitle>
            {!isReadOnly && (
              <Button 
                variant="outline" 
                onClick={handleAddItem}
                className="border-2 border-blue-400 text-blue-700 hover:bg-blue-100 hover:border-blue-500 font-semibold"
              >
                + Position hinzufügen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-100 border-b-2 border-blue-300">
                  <th className="text-left p-3 font-bold text-gray-900 w-16">Pos</th>
                  <th className="text-left p-3 font-bold text-gray-900">Beschreibung</th>
                  <th className="text-right p-3 font-bold text-gray-900 w-24">Menge</th>
                  <th className="text-left p-3 font-bold text-gray-900 w-24">Einheit</th>
                  <th className="text-right p-3 font-bold text-gray-900 w-32">EP netto</th>
                  <th className="text-left p-3 font-bold text-gray-900 w-40">Steuer</th>
                  <th className="text-right p-3 font-bold text-gray-900 w-32">Gesamt</th>
                  {!isReadOnly && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineTotal = item.quantity * item.unitPrice * (1 - (item.discountPct || 0) / 100);
                  return (
                    <tr key={idx} className="border-b border-blue-200 hover:bg-blue-50">
                      <td className="p-2 text-center font-semibold text-gray-600">{item.position}</td>
                      <td className="p-2">
                        {isReadOnly ? (
                          <span className="text-gray-900">{item.description}</span>
                        ) : (
                          <Input 
                            value={item.description} 
                            onChange={e => handleChangeItem(idx, 'description', e.target.value)}
                            className="border-2 border-blue-200 focus:border-blue-400 bg-white"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isReadOnly ? (
                          <span className="text-gray-900 text-right block">{item.quantity}</span>
                        ) : (
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => handleChangeItem(idx, 'quantity', e.target.value)}
                            className="border-2 border-blue-200 focus:border-blue-400 bg-white text-right"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isReadOnly ? (
                          <span className="text-gray-900">{item.unit}</span>
                        ) : (
                          <Input 
                            value={item.unit} 
                            onChange={e => handleChangeItem(idx, 'unit', e.target.value)}
                            className="border-2 border-blue-200 focus:border-blue-400 bg-white"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isReadOnly ? (
                          <span className="text-gray-900 text-right block">{formatCurrency(item.unitPrice)} €</span>
                        ) : (
                          <Input 
                            type="number" 
                            value={item.unitPrice} 
                            onChange={e => handleChangeItem(idx, 'unitPrice', e.target.value)}
                            className="border-2 border-blue-200 focus:border-blue-400 bg-white text-right"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isReadOnly ? (
                          <span className="text-gray-900">{taxKeys.find(t => t.key === item.taxKey)?.descriptionDe || item.taxKey}</span>
                        ) : (
                          <Select value={item.taxKey} onValueChange={(v) => handleChangeItem(idx, 'taxKey', v)}>
                            <SelectTrigger className="border-2 border-blue-200 focus:border-blue-400 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-2 border-blue-300">
                              {taxKeys.map(t => (
                                <SelectItem key={t.key} value={t.key}>{t.descriptionDe}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-2 text-right font-semibold text-gray-900">
                        {formatCurrency(lineTotal)} €
                      </td>
                      {!isReadOnly && (
                        <td className="p-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Card */}
      <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">💰</span>
            Summen & Steuern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Discount Input */}
            <div className="space-y-4">
              <div>
                <Label className="font-semibold text-gray-900">Zusätzlicher Rabatt (€)</Label>
                <Input 
                  type="number" 
                  value={additionalDiscountAbs} 
                  onChange={e => setAdditionalDiscountAbs(Number(e.target.value || 0))} 
                  disabled={isReadOnly}
                  className={`border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 font-semibold h-11 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            {/* Right: Totals Summary */}
            <div className="bg-white border-2 border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zwischensumme netto:</span>
                <span className="font-semibold">{formatCurrency(totals.subtotalNet)} €</span>
              </div>
              {additionalDiscountAbs > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Rabatt:</span>
                  <span className="font-semibold">-{formatCurrency(additionalDiscountAbs)} €</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-600">Netto nach Rabatt:</span>
                <span className="font-semibold">{formatCurrency(totals.netAfterDiscount)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">MwSt.:</span>
                <span className="font-semibold">{formatCurrency(totals.taxAmount)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t-2 border-green-300 pt-2 mt-2">
                <span className="text-gray-900">Gesamtbetrag:</span>
                <span className="text-green-700">{formatCurrency(totals.grandTotal)} €</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-300">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
        >
          <span className="text-xl mr-2">❌</span> {isReadOnly ? 'Schließen' : 'Abbrechen'}
        </Button>
        {!isReadOnly && (
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500 hover:from-purple-600 hover:via-purple-700 hover:to-purple-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-10 py-6 text-base border-3 border-purple-600 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSaving ? (
              <>
                <span className="text-xl mr-2 animate-spin">⏳</span> 
                Wird gespeichert...
              </>
            ) : (
              <>
                <span className="text-xl mr-2">💾</span> 
                Auftrag speichern
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrderEditor;
