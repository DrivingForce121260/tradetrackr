import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppHeader from '@/components/AppHeader';
import { InvoicingService } from '@/services/invoicingService';
import OfferEditor from '@/components/invoicing/OfferEditor';
import OfferDetail from '@/components/invoicing/OfferDetail';
import OrderEditor from '@/components/invoicing/OrderEditor';
import InvoiceEditor from '@/components/invoicing/InvoiceEditor';
import { Mail, ArrowRight, Euro, FileDown, FileText } from 'lucide-react';
import { Client, Offer, Order, Invoice } from '@/types/invoicing';
import { renderWithTemplate } from '@/services/renderService';
import { templateService } from '@/services/templateService';
import { EmailService } from '@/services/emailService';
import { SendEmailModal } from '@/components/email/SendEmailModal';
import { EmailHistoryPanel } from '@/components/email/EmailHistoryPanel';
import { fetchBrandingSettings, BrandingSettings } from '@/services/brandingService';

interface InvoicingPortalProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const InvoicingPortal: React.FC<InvoicingPortalProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [showOfferEditor, setShowOfferEditor] = useState(false);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [datevContra, setDatevContra] = useState<string>('8400');
  const [datevAccountMap, setDatevAccountMap] = useState<string>('{}');
  const [paymentForInvoiceId, setPaymentForInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash' | 'card' | 'other'>('bank');
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailDocument, setEmailDocument] = useState<{ id: string; type: 'offer' | 'invoice' | 'order' | 'report'; data?: any } | null>(null);
  const [emailHistoryDocId, setEmailHistoryDocId] = useState<string | null>(null);

  const invoicingService = useMemo(() => {
    if (!concernID || !user?.uid) return null;
    return new InvoicingService(concernID, user.uid);
  }, [concernID, user?.uid]);

  useEffect(() => {
    if (!concernID) return;
    const load = async () => {
      const b = await fetchBrandingSettings(concernID);
      if (b) {
        setBranding(b);
        if (b.datevContraAccount) setDatevContra(b.datevContraAccount);
        if (b.taxAccountMapping) setDatevAccountMap(JSON.stringify(b.taxAccountMapping));
      }

      const clientsQ = query(collection(db, 'clients'), where('concernID', '==', concernID));
      const offersQ = query(collection(db, 'offers'), where('concernID', '==', concernID));
      const ordersQ = query(collection(db, 'orders'), where('concernID', '==', concernID));
      const invoicesQ = query(collection(db, 'invoices'), where('concernID', '==', concernID));

      const [clientsSnap, offersSnap, ordersSnap, invoicesSnap] = await Promise.all([
        getDocs(clientsQ),
        getDocs(offersQ),
        getDocs(ordersQ),
        getDocs(invoicesQ),
      ]);

      setClients(clientsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Client[]);
      setOffers(offersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Offer[]);
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Order[]);
      setInvoices(invoicesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Invoice[]);
      // Overdue-Status aktualisieren (non-blocking)
      try { await invoicingService?.refreshOverdueStatuses(); } catch {}
    };
    load();
  }, [concernID]);

  const handleCreateClient = async () => {
    if (!invoicingService || !newClientName.trim()) return;
    const newClient: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      concernID: concernID!,
      name: newClientName.trim(),
      billingAddress: {},
      currency: 'EUR',
    } as any;
    const id = await invoicingService.createClient(newClient);
    setNewClientName('');
    setClients([{ id, ...newClient, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Client, ...clients]);
  };

  const refreshAll = async () => {
    if (!concernID) return;
    const clientsQ = query(collection(db, 'clients'), where('concernID', '==', concernID));
    const offersQ = query(collection(db, 'offers'), where('concernID', '==', concernID));
    const ordersQ = query(collection(db, 'orders'), where('concernID', '==', concernID));
    const invoicesQ = query(collection(db, 'invoices'), where('concernID', '==', concernID));

    const [clientsSnap, offersSnap, ordersSnap, invoicesSnap] = await Promise.all([
      getDocs(clientsQ),
      getDocs(offersQ),
      getDocs(ordersQ),
      getDocs(invoicesQ),
    ]);

    setClients(clientsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Client[]);
    setOffers(offersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Offer[]);
    setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Order[]);
    setInvoices(invoicesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Invoice[]);
  };

  const handleOfferToOrder = async (offerId: string) => {
    if (!invoicingService) return;
    await invoicingService.convertOfferToOrder(offerId);
    await refreshAll();
    setActiveTab('orders');
  };

  const handleOrderToInvoice = async (orderId: string) => {
    if (!invoicingService) return;
    await invoicingService.convertOrderToInvoice(orderId);
    await refreshAll();
    setActiveTab('invoices');
  };

  const handleSendByEmail = (doc: Offer | Invoice) => {
    setEmailDocument({
      id: doc.id,
      type: doc.documentType as 'offer' | 'invoice' | 'order',
      data: { client: doc.clientSnapshot, invoice: doc, offer: doc, order: doc } as any,
    });
    setShowSendEmailModal(true);
  };

  const handleEmailSent = () => {
    setEmailHistoryDocId(emailDocument?.id || null);
    setShowSendEmailModal(false);
    refreshAll();
  };

  const toggleInvoiceSelected = (invoiceId: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId); else next.add(invoiceId);
      return next;
    });
  };

  const handleExportDATEV = async () => {
    if (!invoicingService) return;
    const ids = Array.from(selectedInvoiceIds);
    if (ids.length === 0) return;
    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(datevAccountMap || '{}'); } catch {}
    const csv = await invoicingService.exportInvoicesToDATEVCSV(ids, { contraAccount: datevContra, accountMapping: mapping });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datev_invoices_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDATEVZip = async () => {
    if (!invoicingService) return;
    const ids = Array.from(selectedInvoiceIds);
    if (ids.length === 0) return;
    // Load JSZip from CDN to avoid bundling changes
    // @ts-ignore
    const JSZip = (await new Promise<any>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      s.onload = () => resolve((window as any).JSZip);
      s.onerror = reject;
      document.head.appendChild(s);
    }));
    const zip = new JSZip();
    // For simplicity: one combined CSV; could also add per-invoice files
    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(datevAccountMap || '{}'); } catch {}
    const csv = await invoicingService.exportInvoicesToDATEVCSV(ids, { contraAccount: datevContra, accountMapping: mapping });
    zip.file(`datev_invoices_${new Date().toISOString().slice(0,10)}.csv`, csv);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datev_export_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openPdfPreview = (doc: Offer | Order | Invoice) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const isDE = (doc as any).locale !== 'en';
    const title = doc.documentType === 'offer' ? (isDE ? 'Angebot' : 'Quotation') : doc.documentType === 'order' ? (isDE ? 'Auftrag' : 'Order') : (isDE ? 'Rechnung' : 'Invoice');
    const lblDate = isDE ? 'Datum' : 'Date';
    const lblDue = isDE ? 'Fällig' : 'Due';
    const lblPos = isDE ? 'Pos' : 'No';
    const lblDesc = isDE ? 'Beschreibung' : 'Description';
    const lblQty = isDE ? 'Menge' : 'Qty';
    const lblUnit = isDE ? 'Einheit' : 'Unit';
    const lblUnitNet = isDE ? 'EP netto' : 'Unit net';
    const lblSubtotal = isDE ? 'Zwischensumme netto' : 'Subtotal net';
    const lblTotal = isDE ? 'Gesamt' : 'Total';
    const brandName = branding?.companyName || 'TradeTrackr';
    const brandAddress = branding?.address || (isDE ? 'Musterstraße 1, 12345 Musterstadt' : 'Example Street 1, 12345 City');
    const brandEmail = branding?.email || 'info@tradetrackr.com';
    const brandPhone = branding?.phone || '+49 123 456789';
    const logoUrl = branding?.logoUrl || '';
    const rows = doc.lineItems.map(it => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;">${it.position}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${it.description}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${it.quantity}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${it.unit}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${it.unitPrice.toFixed(2)} €</td>
      </tr>`).join('');
    const vatLines = Object.entries(doc.totals.vatByKey || {}).map(([k,v]) => `<div>${isDE ? 'USt' : 'VAT'} ${k}: ${v.toFixed(2)} €</div>`).join('');
    w.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title} ${doc.number}</title>
          <style>
            body{ font-family: Arial, sans-serif; color:#111; }
            .head{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
            .brand{ font-weight:700; font-size:18px; }
            .doc{ font-size:14px; }
            table{ width:100%; border-collapse:collapse; }
            .totals{ text-align:right; margin-top:12px; }
            .muted{ color:#555; }
            @media print { .no-print{ display:none } }
          </style>
        </head>
        <body>
          <div class="head">
            <div class="brand">${brandName}</div>
            <div class="doc">
              <div>${title}: <strong>${doc.number}</strong></div>
              <div class="muted">${lblDate}: ${doc.issueDate}</div>
              ${doc.documentType === 'invoice' && (doc as any).dueDate ? `<div class="muted">${lblDue}: ${(doc as any).dueDate}</div>` : ''}
            </div>
          </div>
          ${logoUrl ? `<div style="margin-bottom:12px;"><img src="${logoUrl}" alt="Logo" style="height:40px" /></div>` : ''}
          <div style="margin-bottom:16px;">
            <div><strong>${doc.clientSnapshot?.name || ''}</strong></div>
            <div class="muted">${doc.clientSnapshot?.billingAddress?.street || ''}</div>
            <div class="muted">${doc.clientSnapshot?.billingAddress?.postalCode || ''} ${doc.clientSnapshot?.billingAddress?.city || ''}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;">${lblPos}</th>
                <th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;">${lblDesc}</th>
                <th style="text-align:right;padding:6px;border-bottom:1px solid #ddd;">${lblQty}</th>
                <th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;">${lblUnit}</th>
                <th style="text-align:right;padding:6px;border-bottom:1px solid #ddd;">${lblUnitNet}</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="totals">
            <div>${lblSubtotal}: ${doc.totals.itemNetAfterDiscount.toFixed(2)} €</div>
            ${vatLines}
            <div><strong>${lblTotal}: ${doc.totals.grandTotalGross.toFixed(2)} €</strong></div>
          </div>
          ${doc.documentType === 'offer' && (doc as any).calcSummary ? `
          <div style="margin-top:16px; padding:12px; border:1px solid #ddd; border-radius:6px;">
            <div style="font-weight:700; margin-bottom:6px;">Kosten / Marge</div>
            <div>Materialkosten: ${((doc as any).calcSummary.materialsCost || 0).toFixed(2)} €</div>
            <div>Arbeitskosten: ${((doc as any).calcSummary.laborCost || 0).toFixed(2)} €</div>
            <div>Gemeinkosten (${((doc as any).calcSummary.overheadPct || 0).toFixed(0)}%): ${((doc as any).calcSummary.overheadValue || 0).toFixed(2)} €</div>
            <div><strong>Gesamtkosten: ${((doc as any).calcSummary.costTotal || 0).toFixed(2)} €</strong></div>
            <div>Verkaufspreis: ${((doc as any).calcSummary.sellTotal || 0).toFixed(2)} €</div>
            <div><strong>Marge: ${((doc as any).calcSummary.marginValue || 0).toFixed(2)} € (${((doc as any).calcSummary.marginPct || 0).toFixed(2)}%)</strong></div>
          </div>` : ''}
          <div class="no-print" style="margin-top:20px;">
            <button onclick="window.print()">Drucken / PDF</button>
          </div>
          <div style="margin-top:32px; font-size:12px; color:#666;">
            <div>${brandName}</div>
            <div>${brandAddress}</div>
            <div>${brandEmail} • ${brandPhone}</div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
  };

  const openTemplatePreview = async (doc: Offer | Order | Invoice) => {
    if (!user?.concernID) return;
    const locale = (doc as any).locale || 'de';
    const useFor = (doc as any).documentType === 'invoice' ? 'invoice' : (doc as any).documentType === 'offer' ? 'offer' : 'order';
    const active = await templateService.getActive(user.concernID, 'pdf', locale, useFor as any);
    if (!active) {
      alert('Kein aktives PDF-Template gefunden');
      return;
    }
    const data = { client: doc.clientSnapshot, invoice: doc, order: doc, offer: doc } as any;
    const res = await renderWithTemplate({ concernID: user.concernID, templateId: active.id, data, output: 'html' });
    window.open(res.url, '_blank');
  };

  const exportOfferCostCsv = (offer: Offer) => {
    const headers = [
      'position','description','quantity','unit','unitPrice','type','unitCost','unitSell','lineMargin','materialId','personnelId'
    ];
    const rows = offer.lineItems.map(it => [
      it.position,
      (it.description || '').replace(/\n/g, ' '),
      it.quantity,
      it.unit,
      it.unitPrice?.toFixed?.(2) ?? '',
      it.type ?? '',
      it.unitCost?.toFixed?.(2) ?? '',
      (it.unitSell ?? it.unitPrice)?.toFixed?.(2) ?? '',
      it.lineMargin?.toFixed?.(2) ?? '',
      it.materialId ?? '',
      it.personnelId ?? ''
    ]);
    const s = offer.calcSummary;
    const summary = s ? [
      [],
      ['materialsCost', s.materialsCost.toFixed(2)],
      ['laborCost', s.laborCost.toFixed(2)],
      ['overheadPct', s.overheadPct.toString()],
      ['overheadValue', s.overheadValue.toFixed(2)],
      ['costTotal', s.costTotal.toFixed(2)],
      ['sellTotal', s.sellTotal.toFixed(2)],
      ['marginValue', s.marginValue.toFixed(2)],
      ['marginPct', s.marginPct.toFixed(2)]
    ] : [];
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n') + (summary.length ? ('\r\n' + summary.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')) : '');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer_${offer.number || offer.id}_costs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenPayment = (invoiceId: string) => {
    setPaymentForInvoiceId(invoiceId);
    setPaymentAmount('');
    setPaymentMethod('bank');
  };

  const handleSavePayment = async () => {
    if (!invoicingService || !paymentForInvoiceId) return;
    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) return;
    await invoicingService.registerPayment(paymentForInvoiceId, {
      invoiceId: paymentForInvoiceId,
      amount: amountNum,
      method: paymentMethod,
      paidAt: new Date().toISOString().slice(0, 10),
    } as any);
    setPaymentForInvoiceId(null);
    await refreshAll();
  };

  const stats = {
    clients: clients.length,
    offers: offers.length,
    orders: orders.length,
    invoices: invoices.length,
    totalValue: invoices.reduce((sum, inv) => sum + (inv.totals?.grandTotalGross || 0), 0),
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader title="💼 Angebote / Aufträge / Rechnungen" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                👥 Kunden
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.clients}</div>
              <p className="text-xs text-white/80">Gesamt</p>
            </CardContent>
          </Card>
          <Card className="tradetrackr-card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                📝 Angebote
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.offers}</div>
              <p className="text-xs text-white/80">Offen</p>
            </CardContent>
          </Card>
          <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                📋 Aufträge
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.orders}</div>
              <p className="text-xs text-white/80">Aktiv</p>
            </CardContent>
          </Card>
          <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                💶 Rechnungen
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.invoices}</div>
              <p className="text-xs text-white/80">Erstellt</p>
            </CardContent>
          </Card>
          <Card className="tradetrackr-card bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                💰 Volumen
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">€{stats.totalValue.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-white/80">Rechnungen</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-gradient-to-r from-gray-100 to-gray-200 p-1 rounded-lg shadow-md">
            <TabsTrigger value="clients" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              👥 Kunden
            </TabsTrigger>
            <TabsTrigger value="offers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              📝 Angebote
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              📋 Aufträge
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              💶 Rechnungen
            </TabsTrigger>
            <TabsTrigger value="datev" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              📊 DATEV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  Kunden
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {clients.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-2 mb-6">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">👤</div>
                    <Input 
                      placeholder="Neuer Kunde" 
                      value={newClientName} 
                      onChange={(e) => setNewClientName(e.target.value)} 
                      className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateClient}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    ✨ Anlegen
                  </Button>
                </div>
                <div className="overflow-auto rounded-lg border-2 border-gray-200">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <TableRow className="border-b-2 border-gray-300">
                        <TableHead className="font-bold text-gray-700">🏢 Name</TableHead>
                        <TableHead className="font-bold text-gray-700">🔢 USt-IdNr.</TableHead>
                        <TableHead className="font-bold text-gray-700">💰 Währung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((c, idx) => (
                        <TableRow key={c.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.vatId || '-'}</TableCell>
                          <TableCell>{c.currency || 'EUR'}</TableCell>
                        </TableRow>
                      ))}
                      {clients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-2">👥</div>
                            <div className="text-sm">Keine Kunden gefunden</div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers">
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 pt-4 pb-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    📝 Angebote
                    <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                      {offers.length}
                    </Badge>
                  </div>
                  <Button 
                    onClick={() => setShowOfferEditor(true)}
                    className="bg-white text-blue-600 hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    size="sm"
                  >
                    ✨ Neues Angebot
                  </Button>
                </CardTitle>
              </CardHeader>
              {/* Fixed Table Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300 flex-shrink-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">📋 Nummer</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">👤 Kunde</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">🏷️ Status</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">💰 Summe (brutto)</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-700">⚙️ Aktionen</th>
                    </tr>
                  </thead>
                </table>
              </div>
              {/* Scrollable Table Body */}
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 550px)' }}>
                <Table>
                  <TableHeader className="invisible">
                    <TableRow>
                      <TableHead>Nummer</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Summe</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>{o.number}</TableCell>
                        <TableCell>{o.clientSnapshot?.name || o.clientId}</TableCell>
                        <TableCell>{o.state}</TableCell>
                        <TableCell>{o.totals?.grandTotalGross?.toFixed?.(2)}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => handleSendByEmail(o)}>
                            <Mail className="h-4 w-4 mr-1" /> Senden
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEmailHistoryDocId(o.id)}>
                            <Mail className="h-4 w-4 mr-1" /> Verlauf
                          </Button>
                          <Button size="sm" onClick={() => handleOfferToOrder(o.id)}>
                            <ArrowRight className="h-4 w-4 mr-1" /> Zu Auftrag
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openPdfPreview(o)}>
                            <FileText className="h-4 w-4 mr-1" /> PDF (basic)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openTemplatePreview(o)}>
                            <FileText className="h-4 w-4 mr-1" /> Template
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => exportOfferCostCsv(o)}>
                            <FileDown className="h-4 w-4 mr-1" /> CSV (Kosten)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingOfferId(o.id)}>
                            Bearbeiten
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {offers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                          <div className="text-4xl mb-2">📝</div>
                          <div className="text-sm">Keine Angebote gefunden</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
            
            {/* Offer Detail View */}
            {editingOfferId && activeTab === 'offers' && (
              <div className="mt-4">
                <OfferDetail 
                  offer={offers.find(o => o.id === editingOfferId)!}
                  onBack={() => {
                    setEditingOfferId(null);
                    refreshAll();
                  }}
                  onUpdate={async (updated) => {
                    await refreshAll();
                  }}
                />
              </div>
            )}
            
            {/* Email History for Offers */}
            {emailHistoryDocId && activeTab === 'offers' && (
              <EmailHistoryPanel 
                documentId={emailHistoryDocId} 
                onResend={(emailId) => {
                  setEmailHistoryDocId(null);
                  setTimeout(() => setEmailHistoryDocId(emailHistoryDocId), 500);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="orders">
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 pt-4 pb-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  📋 Aufträge
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {orders.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              {/* Fixed Table Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300 flex-shrink-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">📋 Nummer</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">👤 Kunde</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">🏷️ Status</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">💰 Summe (brutto)</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-700">⚙️ Aktionen</th>
                    </tr>
                  </thead>
                </table>
              </div>
              {/* Scrollable Table Body */}
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 550px)' }}>
                <Table>
                  <TableHeader className="invisible">
                    <TableRow>
                      <TableHead>Nummer</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Summe</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>{o.number}</TableCell>
                        <TableCell>{o.clientSnapshot?.name || o.clientId}</TableCell>
                        <TableCell>{o.state}</TableCell>
                        <TableCell>{o.totals?.grandTotalGross?.toFixed?.(2)}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => handleOrderToInvoice(o.id)}>
                            <ArrowRight className="h-4 w-4 mr-1" /> Zu Rechnung
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingOrderId(o.id)}>
                            Bearbeiten
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openPdfPreview(o)}>
                            <FileText className="h-4 w-4 mr-1" /> PDF (basic)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openTemplatePreview(o)}>
                            <FileText className="h-4 w-4 mr-1" /> Template
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                          <div className="text-4xl mb-2">📋</div>
                          <div className="text-sm">Keine Aufträge gefunden</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
            {editingOrderId && (
              <div className="mt-6">
                <OrderEditor 
                  order={orders.find(or => or.id === editingOrderId)!}
                  onSaved={async () => { setEditingOrderId(null); await refreshAll(); }}
                  onCancel={() => setEditingOrderId(null)}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 pt-4 pb-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    💶 Rechnungen
                    <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                      {invoices.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => setShowInvoiceEditor(true)}
                      className="bg-white text-green-600 hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                      size="sm"
                    >
                      ✨ Neue Rechnung
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExportDATEV} 
                      disabled={selectedInvoiceIds.size === 0}
                      className="bg-white text-green-600 hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50"
                      size="sm"
                    >
                      <FileDown className="h-4 w-4 mr-1" /> 📊 DATEV CSV
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              {paymentForInvoiceId && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Euro className="h-5 w-5 text-blue-600" />
                    <span className="font-bold text-gray-900">💰 Zahlung erfassen</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input 
                      placeholder="Betrag (brutto)" 
                      value={paymentAmount} 
                      onChange={e => setPaymentAmount(e.target.value)} 
                      className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                    <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                      <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20">
                        <SelectValue placeholder="Zahlmethode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">🏦 Überweisung</SelectItem>
                        <SelectItem value="cash">💵 Bar</SelectItem>
                        <SelectItem value="card">💳 Karte</SelectItem>
                        <SelectItem value="other">📝 Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPaymentForInvoiceId(null)} className="border-2 border-red-300 hover:border-red-500 hover:bg-red-50">
                        ❌ Abbrechen
                      </Button>
                      <Button onClick={handleSavePayment} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                        ✅ Speichern
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Fixed Table Header */}
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300 flex-shrink-0">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-3 font-bold text-gray-700">
                          <input type="checkbox" onChange={e => {
                            if (e.target.checked) setSelectedInvoiceIds(new Set(invoices.map(i => i.id)));
                            else setSelectedInvoiceIds(new Set());
                          }} className="w-4 h-4" />
                        </th>
                        <th className="text-left px-4 py-3 font-bold text-gray-700">📋 Nummer</th>
                        <th className="text-left px-4 py-3 font-bold text-gray-700">👤 Kunde</th>
                        <th className="text-left px-4 py-3 font-bold text-gray-700">🏷️ Status</th>
                        <th className="text-left px-4 py-3 font-bold text-gray-700">💰 Offen</th>
                        <th className="text-right px-4 py-3 font-bold text-gray-700">⚙️ Aktionen</th>
                      </tr>
                    </thead>
                  </table>
                </div>
                {/* Scrollable Table Body */}
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 550px)' }}>
                  <Table>
                    <TableHeader className="invisible">
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Nummer</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Offen</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <input type="checkbox" checked={selectedInvoiceIds.has(inv.id)} onChange={() => toggleInvoiceSelected(inv.id)} />
                        </TableCell>
                        <TableCell>{inv.number}</TableCell>
                        <TableCell>{inv.clientSnapshot?.name || inv.clientId}</TableCell>
                        <TableCell>{inv.state}</TableCell>
                        <TableCell>{(inv.openAmount ?? inv.totals?.grandTotalGross)?.toFixed?.(2)}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => handleSendByEmail(inv)}>
                            <Mail className="h-4 w-4 mr-1" /> Senden
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEmailHistoryDocId(inv.id)}>
                            <Mail className="h-4 w-4 mr-1" /> Verlauf
                          </Button>
                          <Button size="sm" onClick={() => handleOpenPayment(inv.id)}>
                            <Euro className="h-4 w-4 mr-1" /> Zahlung
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingInvoiceId(inv.id)}>
                            Bearbeiten
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openPdfPreview(inv)}>
                            <FileText className="h-4 w-4 mr-1" /> PDF (basic)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openTemplatePreview(inv)}>
                            <FileText className="h-4 w-4 mr-1" /> Template
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                          <div className="text-4xl mb-2">💶</div>
                          <div className="text-sm">Keine Rechnungen gefunden</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
            {editingInvoiceId && (
              <div className="mt-6">
                <InvoiceEditor 
                  invoice={invoices.find(iv => iv.id === editingInvoiceId)!}
                  onSaved={async () => { setEditingInvoiceId(null); await refreshAll(); }}
                  onCancel={() => setEditingInvoiceId(null)}
                />
              </div>
            )}
            
            {/* Email History */}
            {emailHistoryDocId && (
              <EmailHistoryPanel 
                documentId={emailHistoryDocId} 
                onResend={(emailId) => {
                  // Refresh history after resend
                  setEmailHistoryDocId(null);
                  setTimeout(() => setEmailHistoryDocId(emailHistoryDocId), 500);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="datev">
            <Card className="tradetrackr-card border-2 border-orange-400 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 pt-4 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileDown className="h-5 w-5" />
                  📊 DATEV Export
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {selectedInvoiceIds.size} ausgewählt
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50">
                {/* Configuration Section */}
                <div className="bg-white rounded-lg border-2 border-orange-200 p-6 mb-6 shadow-md">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    ⚙️ Konfiguration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                        💰 Gegenkonto (Erlöse)
                      </label>
                      <Input 
                        value={datevContra} 
                        onChange={e => setDatevContra(e.target.value)} 
                        className="border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                        🔢 Konten-Mapping (taxKey → Konto) als JSON
                      </label>
                      <Input 
                        placeholder='{"DE19":"8400","DE7":"8300"}' 
                        value={datevAccountMap} 
                        onChange={e => setDatevAccountMap(e.target.value)} 
                        className="border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Export Section */}
                <div className="bg-white rounded-lg border-2 border-orange-200 p-6 shadow-md">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    📥 Export
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-md border border-blue-200">
                    ℹ️ Wählen Sie Rechnungen im Rechnungen-Tab aus und exportieren Sie diese als CSV oder ZIP für DATEV.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleExportDATEV} 
                      disabled={selectedInvoiceIds.size === 0}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileDown className="h-4 w-4 mr-2" /> 📄 DATEV CSV exportieren
                    </Button>
                    <Button 
                      onClick={handleExportDATEVZip} 
                      disabled={selectedInvoiceIds.size === 0}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileDown className="h-4 w-4 mr-2" /> 📦 DATEV ZIP exportieren
                    </Button>
                  </div>
                  {selectedInvoiceIds.size === 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        ⚠️ Bitte wählen Sie mindestens eine Rechnung im Rechnungen-Tab aus.
                      </p>
                    </div>
                  )}
                  {selectedInvoiceIds.size > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        ✅ {selectedInvoiceIds.size} Rechnung{selectedInvoiceIds.size > 1 ? 'en' : ''} ausgewählt und bereit für Export.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Send Email Modal */}
      {showSendEmailModal && emailDocument && (
        <SendEmailModal
          open={showSendEmailModal}
          onOpenChange={setShowSendEmailModal}
          documentId={emailDocument.id}
          documentType={emailDocument.type}
          documentData={emailDocument.data}
          onSent={handleEmailSent}
        />
      )}

      {/* New Offer Dialog - Matching CRM Style */}
      <Dialog open={showOfferEditor} onOpenChange={setShowOfferEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">📝</span>
              Neues Angebot erstellen
            </DialogTitle>
            <div className="text-sm text-blue-100 mt-1">
              Erstellen Sie ein neues Angebot für einen Kunden
            </div>
          </DialogHeader>
          <div className="mt-4">
            <OfferEditor 
              onCreated={async () => {
                setShowOfferEditor(false);
                await refreshAll();
              }}
              onCancel={() => setShowOfferEditor(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* New Invoice Dialog - Matching Style */}
      <Dialog open={showInvoiceEditor} onOpenChange={setShowInvoiceEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-4 border-green-500 shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">💶</span>
              Neue Rechnung erstellen
            </DialogTitle>
            <div className="text-sm text-green-100 mt-1">
              Erstellen Sie eine neue Rechnung für einen Kunden
            </div>
          </DialogHeader>
          <div className="mt-4">
            <InvoiceEditor 
              onCreated={async (invoiceId) => {
                setShowInvoiceEditor(false);
                await refreshAll();
              }}
              onCancel={() => setShowInvoiceEditor(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Action Sidebar */}
    </div>
  );
};

export default InvoicingPortal;


