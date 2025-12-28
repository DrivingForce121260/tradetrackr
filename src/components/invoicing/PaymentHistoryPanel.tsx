import React, { useEffect, useState } from 'react';
import { InvoicePayment, PAYMENT_METHOD_LABELS, PaymentMethod } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';
import { Loader2, Clock } from 'lucide-react';

interface PaymentHistoryPanelProps {
  invoiceId: string;
  invoicingService: InvoicingService | null;
  refreshTrigger?: number; // Increment to trigger refresh
}

export const PaymentHistoryPanel: React.FC<PaymentHistoryPanelProps> = ({
  invoiceId,
  invoicingService,
  refreshTrigger,
}) => {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!invoicingService || !invoiceId) {
        setPayments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await invoicingService.getPaymentsForInvoice(invoiceId);
        setPayments(data);
      } catch (error) {
        console.error('Error loading payments:', error);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [invoiceId, invoicingService, refreshTrigger]);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatAmount = (cents: number): string => {
    return (cents / 100).toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Lade Zahlungen...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          Zahlungshistorie
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {payments.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            Noch keine Zahlungen erfasst.
          </div>
        ) : (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {formatAmount(payment.amountCents)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] || payment.method}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatDate(payment.paidAt)}
                  {payment.recordedByUserName && (
                    <> · erfasst von {payment.recordedByUserName}</>
                  )}
                </div>
                {payment.reference && (
                  <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                    Ref: {payment.reference}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryPanel;



