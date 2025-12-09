import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Invoice, LineItem, TaxKey } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';

interface InvoiceEditorProps {
  invoice?: Invoice; // Optional for new invoices
  onCreated?: (invoiceId: string) => void;
  onSaved?: () => void;
  onCancel?: () => void;
  presetClientId?: string;
}

const defaultTaxKeys: TaxKey[] = [
  { key: 'DE19', ratePct: 19, descriptionDe: 'Umsatzsteuer 19%', descriptionEn: 'VAT 19%' },
  { key: 'DE7', ratePct: 7, descriptionDe: 'Umsatzsteuer 7%', descriptionEn: 'VAT 7%' },
  { key: 'DE0', ratePct: 0, descriptionDe: 'Steuerfrei', descriptionEn: 'Tax exempt' },
];

const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ invoice, onCreated, onSaved, onCancel, presetClientId }) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string>(presetClientId || invoice?.clientId || '');
  const [locale, setLocale] = useState<'de' | 'en'>('de');
  const [issueDate, setIssueDate] = useState<string>(invoice?.issueDate || new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<LineItem[]>(invoice?.lineItems || [{
    position: 1,
    description: '',
    quantity: 1,
    unit: 'Stk',
    unitPrice: 0,
    taxKey: 'DE19',
  }]);
  const [additionalDiscountAbs, setAdditionalDiscountAbs] = useState<number>(invoice?.additionalDiscountAbs || 0);
  const [taxKeys] = useState<TaxKey[]>(invoice?.taxKeys || defaultTaxKeys);
  const [dueDate, setDueDate] = useState<string>(invoice?.dueDate || new Date().toISOString().slice(0, 10));

  const invoicingService = useMemo(() => {
    if (!concernID || !user?.uid) return null;
    return new InvoicingService(concernID, user.uid);
  }, [concernID, user?.uid]);

  const handleChangeItem = (index: number, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: field === 'quantity' || field === 'unitPrice' || field === 'discountPct' ? Number(value) : value } : it));
  };

  const handleAddItem = () => {
    setItems(prev => ([...prev, {
      position: prev.length + 1,
      description: '',
      quantity: 1,
      unit: 'Stk',
      unitPrice: 0,
      taxKey: taxKeys[0]?.key || 'DE19'
    }]));
  };

  // Load clients
  useEffect(() => {
    if (!concernID) return;
    const load = async () => {
      try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('concernID', '==', concernID));
        const snap = await getDocs(q);
        setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    load();
  }, [concernID]);

  const handleSave = async () => {
    if (!invoicingService || !clientId) return;
    
    if (invoice) {
      // Update existing invoice
      await invoicingService.updateInvoice(invoice.id, {
        lineItems: items,
        additionalDiscountAbs,
        dueDate,
      });
      onSaved && onSaved();
    } else {
      // Create new invoice
      const newInvoice = await invoicingService.createInvoice({
        clientId,
        locale,
        issueDate,
        dueDate,
        lineItems: items,
        additionalDiscountAbs,
        taxKeys,
      });
      onCreated && onCreated(newInvoice.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{invoice ? `Rechnung bearbeiten: ${invoice.number}` : 'Neue Rechnung erstellen'}</CardTitle>
      </CardHeader>
      <CardContent>
        {!invoice && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label>Kunde *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name || client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rechnungsdatum</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label>Sprache</Label>
              <Select value={locale} onValueChange={(val: 'de' | 'en') => setLocale(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-600">Fälligkeitsdatum</label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rabatt (absolut)</label>
            <Input type="number" value={additionalDiscountAbs} onChange={e => setAdditionalDiscountAbs(Number(e.target.value || 0))} />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Positionen</h3>
            <Button variant="secondary" onClick={handleAddItem}>Position hinzufügen</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pos</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead>Menge</TableHead>
                <TableHead>Einheit</TableHead>
                <TableHead>EP netto</TableHead>
                <TableHead>Steuer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.position}</TableCell>
                  <TableCell>
                    <Input value={it.description} onChange={e => handleChangeItem(idx, 'description', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={it.quantity} onChange={e => handleChangeItem(idx, 'quantity', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input value={it.unit} onChange={e => handleChangeItem(idx, 'unit', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={it.unitPrice} onChange={e => handleChangeItem(idx, 'unitPrice', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Select value={it.taxKey} onValueChange={(v) => handleChangeItem(idx, 'taxKey', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taxKeys.map(t => (
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

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button onClick={handleSave}>Speichern</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceEditor;



