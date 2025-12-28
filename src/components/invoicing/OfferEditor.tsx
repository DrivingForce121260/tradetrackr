/**
 * OfferEditor - Create new offers with spreadsheet-like line items
 * 
 * Features:
 * - Spreadsheet-style grid for line items (resizable columns, auto row height)
 * - Offer-level tax rate (not per-line)
 * - Automatic totals calculation
 * 
 * Data Model Notes:
 * - LineItem.taxKey is kept for backward compatibility but not shown in UI
 * - On save, all line items get the same taxKey from offer-level selection
 * - On load, if lines have varying tax values, show warning banner
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Lock } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Client, LineItem, Offer, TaxKey } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';
import OfferItemsGrid, { OfferItem } from '@/components/offers/OfferItemsGrid';
import { recordOfferCreated, recordOfferUpdated } from '@/services/offerHistoryService';

interface OfferEditorProps {
  onCreated?: (offerId: string) => void;
  onCancel?: () => void;
  presetClientId?: string;
  existingOffer?: Offer; // For editing existing offers
}

const defaultTaxKeys: TaxKey[] = [
  { key: 'DE19', ratePct: 19, descriptionDe: 'Umsatzsteuer 19%', descriptionEn: 'VAT 19%' },
  { key: 'DE7', ratePct: 7, descriptionDe: 'Umsatzsteuer 7%', descriptionEn: 'VAT 7%' },
  { key: 'DE0', ratePct: 0, descriptionDe: 'Steuerfrei', descriptionEn: 'Tax exempt' },
];

const OfferEditor: React.FC<OfferEditorProps> = ({ onCreated, onCancel, presetClientId, existingOffer }) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  
  // Read-only mode: offer is finalized (state !== 'draft')
  const isReadOnly = existingOffer && existingOffer.state !== 'draft';
  
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>(presetClientId || '');
  const [locale, setLocale] = useState<'de' | 'en'>('de');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<OfferItem[]>([{
    position: 1,
    description: '',
    quantity: 1,
    unit: 'Stk',
    unitPrice: 0,
    discountPct: 0,
  }]);
  const [additionalDiscountAbs, setAdditionalDiscountAbs] = useState<number>(0);
  
  // Offer-level tax rate (applies to all line items)
  const [offerTaxKey, setOfferTaxKey] = useState<string>('DE19');
  const [taxWarning, setTaxWarning] = useState<string | null>(null);

  const invoicingService = useMemo(() => {
    if (!concernID || !user?.uid) return null;
    return new InvoicingService(concernID, user.uid);
  }, [concernID, user?.uid]);

  // Load existing offer if editing
  useEffect(() => {
    if (existingOffer) {
      setClientId(existingOffer.clientId);
      setLocale(existingOffer.locale);
      setIssueDate(existingOffer.issueDate);
      setAdditionalDiscountAbs(existingOffer.additionalDiscountAbs || 0);
      
      // Convert LineItems to OfferItems
      const offerItems: OfferItem[] = existingOffer.lineItems.map(li => ({
        position: li.position,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unitPrice: li.unitPrice,
        discountPct: li.discountPct || 0,
        taxKey: li.taxKey,
      }));
      setItems(offerItems);
      
      // Check for varying tax rates
      const taxKeys = new Set(existingOffer.lineItems.map(li => li.taxKey));
      if (taxKeys.size > 1) {
        setTaxWarning('Positionen haben unterschiedliche Steuerwerte. Bitte prüfen.');
        setOfferTaxKey(''); // Clear until user resolves
      } else if (taxKeys.size === 1) {
        setOfferTaxKey([...taxKeys][0]);
      }
    }
  }, [existingOffer]);

  // Load customers
  useEffect(() => {
    if (!concernID) return;
    const load = async () => {
      try {
        const customersQ = query(collection(db, 'customers'), where('concernID', '==', concernID));
        const customersSnap = await getDocs(customersQ);
        const customersList = customersSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            concernID: data.concernID,
            name: data.name || data.cusName || data.company || 'Unbekannt',
            billingAddress: {
              company: data.company || data.name || '',
              firstName: data.contactPerson?.split(' ')[0] || '',
              lastName: data.contactPerson?.split(' ').slice(1).join(' ') || '',
              street: data.address || data.cusAddress || '',
              postalCode: data.postalCode || '',
              city: data.city || '',
              country: 'Deutschland',
              email: data.email || data.cusEmail || '',
              phone: data.phone || data.cusTel || '',
            },
            vatId: data.vatId || '',
            currency: 'EUR' as const,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as Client;
        });
        
        customersList.sort((a, b) => a.name.localeCompare(b.name, 'de'));
        setClients(customersList);
        
        if (presetClientId) {
          setClientId(presetClientId);
        } else if (customersList.length && !clientId) {
          setClientId(customersList[0].id);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };
    load();
  }, [concernID, presetClientId]);

  // Calculate totals
  const totals = useMemo(() => {
    const taxRate = defaultTaxKeys.find(t => t.key === offerTaxKey)?.ratePct || 0;
    
    // Filter out empty items (position-only items at the end)
    const validItems = items.filter(item => 
      item.description || item.unitPrice > 0
    );
    
    const subtotalNet = validItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = item.discountPct ? lineTotal * (item.discountPct / 100) : 0;
      return sum + (lineTotal - discount);
    }, 0);
    
    const netAfterDiscount = subtotalNet - additionalDiscountAbs;
    const taxAmount = netAfterDiscount * (taxRate / 100);
    const grandTotal = netAfterDiscount + taxAmount;
    
    return {
      subtotalNet,
      additionalDiscountAbs,
      netAfterDiscount,
      taxRate,
      taxAmount,
      grandTotal,
    };
  }, [items, offerTaxKey, additionalDiscountAbs]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // Defensive guard: never save finalized offers
    if (isReadOnly) {
      console.warn('Attempted to save a finalized offer - blocked');
      return;
    }
    
    if (!invoicingService || !clientId) return;
    if (!offerTaxKey) {
      alert('Bitte wählen Sie einen Steuersatz aus.');
      return;
    }
    
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    setIsSaving(true);
    
    try {
      // Filter out empty items and convert to LineItems
      const validItems = items.filter(item => 
        item.description || item.unitPrice > 0
      );
      
      // Apply offer-level tax to all line items (ensure no undefined values)
      const lineItems: LineItem[] = validItems.map(item => ({
        position: item.position,
        description: item.description || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'Stk',
        unitPrice: item.unitPrice || 0,
        taxKey: offerTaxKey, // Apply offer-level tax
        discountPct: item.discountPct || 0, // Default to 0, not undefined
      }));
      
      // Build update payload for existing offers (partial update)
      const updateData: Partial<Offer> = {
        clientId: client.id,
        clientSnapshot: {
          name: client.name,
          billingAddress: client.billingAddress,
          vatId: client.vatId || '',
          currency: client.currency || 'EUR',
          // Only include defaultTaxKey if it's defined
          ...(client.defaultTaxKey ? { defaultTaxKey: client.defaultTaxKey } : {}),
        },
        locale,
        currency: client.currency || 'EUR',
        issueDate,
        lineItems,
        additionalDiscountAbs: additionalDiscountAbs || 0,
        taxKeys: defaultTaxKeys,
        totals: { 
          subtotalNet: totals.subtotalNet, 
          lineDiscountTotal: 0, 
          itemNetAfterDiscount: totals.netAfterDiscount, 
          additionalDiscountAbs: totals.additionalDiscountAbs || 0, 
          vatByKey: { [offerTaxKey]: totals.taxAmount }, 
          totalVat: totals.taxAmount, 
          grandTotalGross: totals.grandTotal 
        },
        updatedAt: new Date().toISOString(),
      };

      if (existingOffer && existingOffer.id) {
        // Update existing offer
        console.log('Updating offer:', existingOffer.id, updateData);
        await invoicingService.updateOffer(existingOffer.id, updateData);
        console.log('Offer updated successfully');
        
        // Record history entry for update
        await recordOfferUpdated({
          offerId: existingOffer.id,
          userId: user!.uid,
          userName: user!.displayName || user!.vorname || user!.email || '',
        }).catch(console.error);
        
        if (onCreated) onCreated(existingOffer.id);
      } else if (existingOffer && !existingOffer.id) {
        // existingOffer passed but has no ID - this is an error
        console.error('existingOffer has no ID:', existingOffer);
        throw new Error('Angebot hat keine gültige ID. Bitte versuchen Sie es erneut.');
      } else {
        // Create new offer - include all required fields
        // Runtime validation: ensure concernID exists
        if (!concernID) {
          console.error('Cannot create offer: concernID is missing');
          throw new Error('Mandanten-ID fehlt. Bitte melden Sie sich erneut an.');
        }
        
        const createPayload = {
          ...updateData,
          documentType: 'offer' as const,
          concernID: concernID,
          state: 'draft' as const,
          noteInternal: '',
          noteCustomer: '',
          createdBy: user!.uid,
          createdAt: new Date().toISOString(),
          number: '', // Will be assigned by service
        };
        console.log('Creating offer:', createPayload);
        const id = await invoicingService.createOffer(createPayload as any);
        console.log('Offer created with id:', id);
        
        // Record history entry for creation
        // Note: The offer number is assigned by the service, so we fetch it or use id
        await recordOfferCreated({
          offerId: id,
          userId: user!.uid,
          userName: user!.displayName || user!.vorname || user!.email || '',
          offerNumber: id, // Will be updated if number is available
        }).catch(console.error);
        
        if (onCreated) onCreated(id);
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      alert(`Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Banner for Finalized Offers */}
      {isReadOnly && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              Dieses Angebot ist finalisiert und kann nicht mehr bearbeitet werden.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Sie können das Angebot nur ansehen. Um Änderungen vorzunehmen, erstellen Sie ein neues Angebot.
            </p>
          </div>
        </div>
      )}

      {/* Tax Warning Banner */}
      {taxWarning && !isReadOnly && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">{taxWarning}</p>
            <p className="text-sm text-amber-700 mt-1">
              Wählen Sie einen einheitlichen Steuersatz für alle Positionen.
            </p>
          </div>
        </div>
      )}

      {/* Offer Information Card */}
      <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📋</span>
            Angebotsinformationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="font-semibold text-gray-900">Kunde *</Label>
              {presetClientId || isReadOnly ? (
                <Input 
                  value={clients.find(c => c.id === (presetClientId || clientId))?.name || ''} 
                  disabled 
                  className="bg-gray-100 border-2 border-blue-300 font-semibold h-11"
                />
              ) : (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11">
                    <SelectValue placeholder="Kunde wählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-blue-300">
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Sprache</Label>
              <Select value={locale} onValueChange={(v: any) => setLocale(v)} disabled={isReadOnly}>
                <SelectTrigger className={`border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}>
                  <SelectValue placeholder="Sprache" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-blue-300">
                  <SelectItem value="de">🇩🇪 DE</SelectItem>
                  <SelectItem value="en">🇬🇧 EN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Belegdatum</Label>
              <Input 
                type="date" 
                value={issueDate} 
                onChange={e => setIssueDate(e.target.value)} 
                disabled={isReadOnly}
                className={`border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Grid Card */}
      <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📝</span>
            Positionen
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Spaltenbreiten per Drag anpassen)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OfferItemsGrid 
            items={items} 
            onChangeItems={setItems}
            readOnly={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Totals and Tax Card */}
      <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">💰</span>
            Summen & Steuern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Tax and Discount Inputs */}
            <div className="space-y-4">
              <div>
                <Label className="font-semibold text-gray-900">Steuer (für alle Positionen)</Label>
                <Select 
                  value={offerTaxKey} 
                  onValueChange={(v) => {
                    setOfferTaxKey(v);
                    setTaxWarning(null); // Clear warning when user selects
                  }}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className={`border-2 focus:ring-2 font-semibold h-11 ${
                    isReadOnly ? 'bg-gray-100' : 'bg-white'
                  } ${
                    !offerTaxKey ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/30' : 'border-purple-300 focus:border-purple-500 focus:ring-purple-500/30'
                  }`}>
                    <SelectValue placeholder="Steuersatz wählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-purple-300">
                    {defaultTaxKeys.map(t => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.descriptionDe} ({t.ratePct}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-semibold text-gray-900">Zusätzlicher Rabatt (€)</Label>
                <Input 
                  type="number" 
                  value={additionalDiscountAbs} 
                  onChange={e => setAdditionalDiscountAbs(Number(e.target.value || 0))} 
                  disabled={isReadOnly}
                  className={`border-2 border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 font-semibold h-11 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            {/* Right: Totals Summary */}
            <div className="bg-white border-2 border-purple-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zwischensumme netto:</span>
                <span className="font-semibold">{formatCurrency(totals.subtotalNet)} €</span>
              </div>
              {totals.additionalDiscountAbs > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Rabatt:</span>
                  <span className="font-semibold">-{formatCurrency(totals.additionalDiscountAbs)} €</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-600">Netto nach Rabatt:</span>
                <span className="font-semibold">{formatCurrency(totals.netAfterDiscount)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  MwSt. ({totals.taxRate}%):
                </span>
                <span className="font-semibold">{formatCurrency(totals.taxAmount)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t-2 border-purple-300 pt-2 mt-2">
                <span className="text-gray-900">Gesamtbetrag:</span>
                <span className="text-purple-700">{formatCurrency(totals.grandTotal)} €</span>
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
            disabled={!clientId || !offerTaxKey || isSaving}
            className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-10 py-6 text-base border-3 border-[#047ba8] disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSaving ? (
              <>
                <span className="text-xl mr-2 animate-spin">⏳</span> 
                Wird gespeichert...
              </>
            ) : (
              <>
                <span className="text-xl mr-2">{existingOffer ? '💾' : '✨'}</span> 
                {existingOffer ? 'Angebot speichern' : 'Angebot erstellen'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OfferEditor;
