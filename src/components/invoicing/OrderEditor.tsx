import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineItem, Order, TaxKey } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';

interface OrderEditorProps {
  order: Order;
  onSaved?: () => void;
  onCancel?: () => void;
}

const OrderEditor: React.FC<OrderEditorProps> = ({ order, onSaved, onCancel }) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const [items, setItems] = useState<LineItem[]>(order.lineItems || []);
  const [additionalDiscountAbs, setAdditionalDiscountAbs] = useState<number>(order.additionalDiscountAbs || 0);
  const [taxKeys] = useState<TaxKey[]>(order.taxKeys || []);

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

  const handleSave = async () => {
    if (!invoicingService) return;
    await invoicingService.updateOrder(order.id, {
      lineItems: items,
      additionalDiscountAbs,
    });
    onSaved && onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auftrag bearbeiten: {order.number}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

export default OrderEditor;













