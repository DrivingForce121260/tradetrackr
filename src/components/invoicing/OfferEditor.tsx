import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Client, LineItem, Offer, TaxKey } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';

interface OfferEditorProps {
  onCreated?: (offerId: string) => void;
  onCancel?: () => void;
  presetClientId?: string;
}

const defaultTaxKeys: TaxKey[] = [
  { key: 'DE19', ratePct: 19, descriptionDe: 'Umsatzsteuer 19%', descriptionEn: 'VAT 19%' },
  { key: 'DE7', ratePct: 7, descriptionDe: 'Umsatzsteuer 7%', descriptionEn: 'VAT 7%' },
  { key: 'DE0', ratePct: 0, descriptionDe: 'Steuerfrei', descriptionEn: 'Tax exempt' },
];

const OfferEditor: React.FC<OfferEditorProps> = ({ onCreated, onCancel, presetClientId }) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>(presetClientId || '');
  const [locale, setLocale] = useState<'de' | 'en'>('de');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<LineItem[]>([{
    position: 1,
    description: '',
    quantity: 1,
    unit: 'Stk',
    unitPrice: 0,
    taxKey: 'DE19',
  }]);
  const [additionalDiscountAbs, setAdditionalDiscountAbs] = useState<number>(0);

  const invoicingService = useMemo(() => {
    if (!concernID || !user?.uid) return null;
    return new InvoicingService(concernID, user.uid);
  }, [concernID, user?.uid]);

  useEffect(() => {
    if (!concernID) return;
    const load = async () => {
      const clientsQ = query(collection(db, 'clients'), where('concernID', '==', concernID));
      const snap = await getDocs(clientsQ);
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Client[];
      setClients(list);
      if (presetClientId) {
        setClientId(presetClientId);
      } else if (list.length && !clientId) {
        setClientId(list[0].id);
      }
    };
    load();
  }, [concernID, presetClientId]);

  const handleAddItem = () => {
    setItems(prev => ([...prev, {
      position: prev.length + 1,
      description: '',
      quantity: 1,
      unit: 'Stk',
      unitPrice: 0,
      taxKey: 'DE19'
    }]));
  };

  const handleChangeItem = (index: number, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: field === 'quantity' || field === 'unitPrice' || field === 'discountPct' ? Number(value) : value } : it));
  };

  const handleCreate = async () => {
    if (!invoicingService || !clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const payload = {
      documentType: 'offer' as const,
      concernID: concernID!,
      clientId: client.id,
      clientSnapshot: {
        name: client.name,
        billingAddress: client.billingAddress,
        vatId: client.vatId,
        currency: client.currency || 'EUR',
        defaultTaxKey: client.defaultTaxKey,
      },
      locale,
      currency: client.currency || 'EUR',
      issueDate,
      noteInternal: '',
      noteCustomer: '',
      lineItems: items,
      additionalDiscountAbs,
      taxKeys: defaultTaxKeys,
      state: 'draft' as const,
      totals: { subtotalNet: 0, lineDiscountTotal: 0, itemNetAfterDiscount: 0, additionalDiscountAbs: 0, vatByKey: {}, totalVat: 0, grandTotalGross: 0 },
      createdBy: user!.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      number: '',
      id: '',
    } as unknown as Offer;

    const id = await invoicingService.createOffer(payload as any);
    if (onCreated) onCreated(id);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📋</span>
            Angebotsinformationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold text-gray-900">Kunde *</Label>
              {presetClientId ? (
                <Input 
                  value={clients.find(c => c.id === presetClientId)?.name || ''} 
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
              <Select value={locale} onValueChange={(v: any) => setLocale(v)}>
                <SelectTrigger className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11">
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
                className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11"
              />
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Rabatt (absolut)</Label>
              <Input 
                type="number" 
                value={additionalDiscountAbs} 
                onChange={e => setAdditionalDiscountAbs(Number(e.target.value || 0))} 
                className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-3xl">📝</span>
              Positionen
            </CardTitle>
            <Button 
              variant="secondary" 
              onClick={handleAddItem}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              Position hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-3 border-green-300 rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-green-100 to-emerald-100">
                  <TableHead className="font-bold text-gray-900">Pos</TableHead>
                  <TableHead className="font-bold text-gray-900">Beschreibung</TableHead>
                  <TableHead className="font-bold text-gray-900">Menge</TableHead>
                  <TableHead className="font-bold text-gray-900">Einheit</TableHead>
                  <TableHead className="font-bold text-gray-900">EP netto</TableHead>
                  <TableHead className="font-bold text-gray-900">Steuer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx} className="hover:bg-green-50 transition-colors">
                    <TableCell className="font-semibold text-gray-700">{it.position}</TableCell>
                    <TableCell>
                      <Input 
                        value={it.description} 
                        onChange={e => handleChangeItem(idx, 'description', e.target.value)}
                        className="border-2 border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-medium"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={it.quantity} 
                        onChange={e => handleChangeItem(idx, 'quantity', e.target.value)}
                        className="border-2 border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={it.unit} 
                        onChange={e => handleChangeItem(idx, 'unit', e.target.value)}
                        className="border-2 border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-medium"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={it.unitPrice} 
                        onChange={e => handleChangeItem(idx, 'unitPrice', e.target.value)}
                        className="border-2 border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={it.taxKey} onValueChange={(v) => handleChangeItem(idx, 'taxKey', v)}>
                        <SelectTrigger className="border-2 border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-green-300">
                          {defaultTaxKeys.map(t => (
                            <SelectItem key={t.key} value={t.key}>{t.descriptionDe}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-300">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
        >
          <span className="text-xl mr-2">❌</span> Abbrechen
        </Button>
        <Button 
          onClick={handleCreate}
          className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
        >
          <span className="text-xl mr-2">✨</span> Angebot erstellen
        </Button>
      </div>
    </div>
  );
};

export default OfferEditor;


