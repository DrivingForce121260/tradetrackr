import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Euro } from 'lucide-react';
import { PaymentMethod, PAYMENT_METHOD_LABELS, Invoice } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';
import { useToast } from '@/hooks/use-toast';

interface RecordPaymentDialogProps {
  invoice: Invoice | null;
  invoicingService: InvoicingService | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

export const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
  invoice,
  invoicingService,
  userName,
  open,
  onOpenChange,
  onPaymentRecorded,
}) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UEBERWEISUNG');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAmount('');
    setMethod('UEBERWEISUNG');
    setPaidAt(new Date().toISOString().split('T')[0]);
    setReference('');
    setNote('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!invoice || !invoicingService) return;

    // Validate amount
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(amountNum <= 0 ? 'Der Betrag muss größer als 0 sein.' : 'Bitte einen gültigen Betrag eingeben.');
      return;
    }

    // Validate date
    if (!paidAt) {
      setError('Bitte ein Zahlungsdatum wählen.');
      return;
    }

    // Validate method
    if (!method) {
      setError('Bitte eine Zahlungsart wählen.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await invoicingService.recordPayment(
        invoice.id,
        {
          amountEur: amountNum,
          method,
          paidAt: new Date(paidAt),
          reference: reference || undefined,
          note: note || undefined,
        },
        userName
      );

      toast({
        title: 'Zahlung gespeichert',
        description: `${amountNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} wurde erfasst.`,
      });

      resetForm();
      onOpenChange(false);
      onPaymentRecorded();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      let errorMsg = 'Zahlung konnte nicht gespeichert werden.';
      if (err?.message === 'INVALID_AMOUNT') {
        errorMsg = 'Ungültiger Betrag.';
      } else if (err?.message === 'INVOICE_NOT_FOUND') {
        errorMsg = 'Rechnung nicht gefunden.';
      } else if (err?.message === 'CONCERN_MISMATCH') {
        errorMsg = 'Keine Berechtigung für diese Rechnung.';
      }
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Calculate suggested amount (open amount)
  const openAmountEur = invoice
    ? (invoice.openAmountCents != null 
        ? invoice.openAmountCents / 100 
        : (invoice.openAmount ?? invoice.totals?.grandTotalGross ?? 0))
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white border-2 border-green-500 shadow-xl" aria-describedby={undefined}>
        <DialogHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Zahlung erfassen
          </DialogTitle>
          <DialogDescription className="text-green-100 text-sm">
            Rechnung {invoice?.number || invoice?.id}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Invoice Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rechnungsbetrag:</span>
              <span className="font-semibold">
                {(invoice?.totals?.grandTotalGross ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Offen:</span>
              <span className="font-semibold text-amber-600">
                {openAmountEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Betrag (EUR) *</Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder={openAmountEur.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-10 border-2 border-gray-300 focus:border-green-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
            {openAmountEur > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-green-600 hover:text-green-700 h-auto p-0"
                onClick={() => setAmount(openAmountEur.toFixed(2).replace('.', ','))}
              >
                Offenen Betrag übernehmen
              </Button>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="paidAt">Zahlungsdatum *</Label>
            <Input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="border-2 border-gray-300 focus:border-green-500"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Zahlungsart *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="border-2 border-gray-300 focus:border-green-500">
                <SelectValue placeholder="Zahlungsart wählen" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === 'UEBERWEISUNG' && '🏦 '}
                    {m === 'BAR' && '💵 '}
                    {m === 'EC' && '💳 '}
                    {m === 'KREDITKARTE' && '💳 '}
                    {m === 'PAYPAL' && '📱 '}
                    {m === 'SONSTIGES' && '📝 '}
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="reference">Verwendungszweck (optional)</Label>
            <Input
              id="reference"
              type="text"
              placeholder="z.B. Überweisungsreferenz"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="border-2 border-gray-300 focus:border-green-500"
            />
          </div>

          {/* Note (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="note">Notiz (optional)</Label>
            <Input
              id="note"
              type="text"
              placeholder="Interne Notiz"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-2 border-gray-300 focus:border-green-500"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="border-gray-300 hover:border-gray-400"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !amount}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              '✅ Speichern'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;



