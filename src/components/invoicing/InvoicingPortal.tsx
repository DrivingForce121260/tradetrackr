import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppHeader from '@/components/AppHeader';
import { InvoicingService } from '@/services/invoicingService';
import OfferEditor from '@/components/invoicing/OfferEditor';
import OrderEditor from '@/components/invoicing/OrderEditor';
import InvoiceEditor from '@/components/invoicing/InvoiceEditor';
import SalesEmailInquiriesTab from '@/components/sales/EmailInquiriesTab';
import { Mail, ArrowRight, Euro, FileDown, FileText, Loader2, Clock, Lock, Sparkles } from 'lucide-react';
import { Offer, Order, Invoice } from '@/types/invoicing';
import { renderWithTemplate } from '@/services/renderService';
import { templateService } from '@/services/templateService';
import { EmailService } from '@/services/emailService';
import { SendEmailModal } from '@/components/email/SendEmailModal';
import { EmailHistoryPanel } from '@/components/email/EmailHistoryPanel';
import { DocumentHistoryPanel, DocumentType as HistoryDocType } from '@/components/invoicing/DocumentHistoryPanel';
import { FinalizeOfferDialog } from '@/components/invoicing/FinalizeOfferDialog';
import { RecordPaymentDialog } from '@/components/invoicing/RecordPaymentDialog';
import { DatevExportPanel } from '@/components/invoicing/DatevExportPanel';
import { PAYMENT_STATUS_LABELS, PaymentStatus } from '@/types/invoicing';
import { fetchBrandingSettings, BrandingSettings, validateCompanyProfile } from '@/services/brandingService';
import { recordPdfGenerated } from '@/services/offerHistoryService';
import { sendOfferViaEmail } from '@/services/offerPdfService';
import { useToast } from '@/hooks/use-toast';
import { downloadOfferPdf, downloadInvoicePdf, validateInvoiceForPdf } from '@/pdf';
import { toISODateTime, toISODate, compareISODatesDesc } from '@/utils/firestoreDate';

interface InvoicingPortalProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

// Allowed tabs - used to validate and sanitize any tab value
const ALLOWED_TABS = new Set(['email-inquiries', 'offers', 'orders', 'invoices', 'datev'] as const);
type AllowedTab = 'email-inquiries' | 'offers' | 'orders' | 'invoices' | 'datev';
const safeTab = (t?: string): AllowedTab => (t && ALLOWED_TABS.has(t as AllowedTab) ? t as AllowedTab : 'offers');

const InvoicingPortal: React.FC<InvoicingPortalProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const concernID = user?.concernID;
  const [activeTab, setActiveTab] = useState<AllowedTab>('offers');
  
  // Safe tab setter that validates input
  const handleTabChange = (value: string) => setActiveTab(safeTab(value));
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showOfferEditor, setShowOfferEditor] = useState(false);
  const [offerToEdit, setOfferToEdit] = useState<Offer | null>(null); // For editing existing offers
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null); // For order editor overlay
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null); // For invoice editor overlay
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  
  // State for "Zu Rechnung" and "Zu Auftrag" duplicate prevention + loading
  const [convertingOrderIds, setConvertingOrderIds] = useState<Set<string>>(new Set());
  const [convertingOfferIds, setConvertingOfferIds] = useState<Set<string>>(new Set());
  const [existingInvoiceDialog, setExistingInvoiceDialog] = useState<{
    orderId: string;
    invoiceId: string;
    invoiceNumber: string;
  } | null>(null);
  const [existingOrderDialog, setExistingOrderDialog] = useState<{
    offerId: string;
    orderId: string;
    orderNumber: string;
  } | null>(null);
  // Confirmation dialog before creating order from offer
  const [confirmOfferToOrderDialog, setConfirmOfferToOrderDialog] = useState<{
    offerId: string;
    offerNumber: string;
  } | null>(null);
  const [datevContra, setDatevContra] = useState<string>('8400');
  const [datevAccountMap, setDatevAccountMap] = useState<string>('{}');
  // Payment capture dialog state
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState<Invoice | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailDocument, setEmailDocument] = useState<{ id: string; type: 'offer' | 'invoice' | 'order' | 'report'; data?: any } | null>(null);
  const [emailHistoryDocId, setEmailHistoryDocId] = useState<string | null>(null);
  const [sendingEmailOfferId, setSendingEmailOfferId] = useState<string | null>(null);
  const [emailSendProgress, setEmailSendProgress] = useState<'generating' | 'downloading' | 'opening' | null>(null);
  // Unified history modal state - supports offers, orders, invoices
  const [historyModal, setHistoryModal] = useState<{
    docType: HistoryDocType;
    docId: string;
    title: string;
  } | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [offerToFinalize, setOfferToFinalize] = useState<Offer | null>(null);
  // Invoice PDF generation state (for resolving order number)
  const [generatingInvoicePdfId, setGeneratingInvoicePdfId] = useState<string | null>(null);
  const { toast } = useToast();

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

      // Load offers, orders, invoices (customers are loaded by editors individually)
      const offersQ = query(collection(db, 'offers'), where('concernID', '==', concernID));
      const ordersQ = query(collection(db, 'orders'), where('concernID', '==', concernID));
      const invoicesQ = query(collection(db, 'invoices'), where('concernID', '==', concernID));

      const [offersSnap, ordersSnap, invoicesSnap] = await Promise.all([
        getDocs(offersQ),
        getDocs(ordersQ),
        getDocs(invoicesQ),
      ]);
      // Spread data first, normalize timestamps, then override with d.id
      const mappedOffers = offersSnap.docs.map(d => {
        const data = d.data() as any;
        return {
          ...data,
          id: d.id,
          createdAt: toISODateTime(data.createdAt) ?? toISODateTime(data.created_at) ?? null,
          updatedAt: toISODateTime(data.updatedAt) ?? toISODateTime(data.updated_at) ?? null,
          issueDate: toISODate(data.issueDate) ?? toISODate(data.issuedAt) ?? null,
        };
      }) as Offer[];
      // Sort by createdAt descending (newest first), fallback to issueDate
      mappedOffers.sort((a, b) => {
        const dateA = a.createdAt ?? a.issueDate ?? null;
        const dateB = b.createdAt ?? b.issueDate ?? null;
        return compareISODatesDesc(dateA, dateB);
      });
      setOffers(mappedOffers);
      setOrders(ordersSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Order[]);
      setInvoices(invoicesSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Invoice[]);
      // Overdue-Status aktualisieren (non-blocking)
      try { await invoicingService?.refreshOverdueStatuses(); } catch {}
    };
    load();
  }, [concernID]);

  const refreshAll = async () => {
    if (!concernID) return;
    // Reload offers, orders, invoices (customers are loaded by editors individually)
    const offersQ = query(collection(db, 'offers'), where('concernID', '==', concernID));
    const ordersQ = query(collection(db, 'orders'), where('concernID', '==', concernID));
    const invoicesQ = query(collection(db, 'invoices'), where('concernID', '==', concernID));

    const [offersSnap, ordersSnap, invoicesSnap] = await Promise.all([
      getDocs(offersQ),
      getDocs(ordersQ),
      getDocs(invoicesQ),
    ]);

    // Spread data first, normalize timestamps, then override with d.id
    const mappedOffers = offersSnap.docs.map(d => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
        createdAt: toISODateTime(data.createdAt) ?? toISODateTime(data.created_at) ?? null,
        updatedAt: toISODateTime(data.updatedAt) ?? toISODateTime(data.updated_at) ?? null,
        issueDate: toISODate(data.issueDate) ?? toISODate(data.issuedAt) ?? null,
      };
    }) as Offer[];
    // Sort by createdAt descending (newest first), fallback to issueDate
    mappedOffers.sort((a, b) => {
      const dateA = a.createdAt ?? a.issueDate ?? null;
      const dateB = b.createdAt ?? b.issueDate ?? null;
      return compareISODatesDesc(dateA, dateB);
    });
    setOffers(mappedOffers);
    setOrders(ordersSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Order[]);
    setInvoices(invoicesSnap.docs.map(d => ({ ...(d.data() as any), id: d.id })) as Invoice[]);
  };

  // Step 1: Show confirmation dialog before converting offer to order
  const handleOfferToOrderClick = async (offerId: string, offerNumber: string) => {
    if (!invoicingService) return;
    
    // Prevent double-click
    if (convertingOfferIds.has(offerId)) return;
    
    setConvertingOfferIds(prev => new Set(prev).add(offerId));
    
    try {
      // First check if an order already exists for this offer
      const existingOrder = await invoicingService.findOrderByOfferId(offerId);
      
      if (existingOrder) {
        // Order already exists - open it in overlay, no confirmation needed
        await refreshAll();
        setActiveTab('orders');
        setEditingOrderId(existingOrder.id);
        toast({
          title: 'Auftrag existiert bereits',
          description: `Auftrag ${existingOrder.number || existingOrder.id} wurde geöffnet.`,
        });
        return;
      }
      
      // No existing order - show confirmation dialog
      setConfirmOfferToOrderDialog({ offerId, offerNumber });
    } catch (error) {
      console.error('Error checking for existing order:', error);
      toast({
        title: 'Fehler',
        description: 'Konnte nicht prüfen, ob bereits ein Auftrag existiert.',
        variant: 'destructive',
      });
    } finally {
      setConvertingOfferIds(prev => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  // Step 2: Actually convert offer to order after user confirmation
  const handleConfirmedOfferToOrder = async (offerId: string) => {
    if (!invoicingService) return;
    
    setConfirmOfferToOrderDialog(null);
    setConvertingOfferIds(prev => new Set(prev).add(offerId));
    
    try {
      console.log('[handleConfirmedOfferToOrder] Converting offer:', offerId);
      const newOrderId = await invoicingService.convertOfferToOrder(offerId);
      console.log('[handleConfirmedOfferToOrder] Order created:', newOrderId);
      
      await refreshAll();
      setActiveTab('orders');
      setEditingOrderId(newOrderId);
      toast({
        title: 'Auftrag erstellt',
        description: 'Der Auftrag wurde erfolgreich aus dem Angebot erstellt.',
      });
    } catch (error: any) {
      console.error('Error converting offer to order:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Auftrag konnte nicht erstellt werden.';
      if (error?.message === 'OFFER_NOT_FOUND') {
        errorMessage = 'Das Angebot wurde nicht gefunden.';
      } else if (error?.message === 'MISSING_CONCERN_ID') {
        errorMessage = 'Fehlende Mandanten-ID im Angebot.';
      } else if (error?.message === 'MISSING_CLIENT_DATA') {
        errorMessage = 'Fehlende Kundendaten im Angebot.';
      } else if (error?.code === 'permission-denied') {
        errorMessage = 'Keine Berechtigung für diese Aktion.';
      }
      
      toast({
        title: 'Fehler',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setConvertingOfferIds(prev => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  const handleOrderToInvoice = async (orderId: string) => {
    if (!invoicingService) return;
    
    // Prevent double-click: check if already converting this order
    if (convertingOrderIds.has(orderId)) return;
    
    setConvertingOrderIds(prev => new Set(prev).add(orderId));
    
    try {
      // Transaction-safe conversion: checks for existing invoice inside transaction
      // and only creates new one if none exists (prevents race conditions across tabs/users)
      const result = await invoicingService.convertOrderToInvoice(orderId);
      
      if (result.existed) {
        // Invoice already existed - open it directly in overlay
        await refreshAll();
        setActiveTab('invoices');
        setEditingInvoiceId(result.invoiceId);
        toast({
          title: 'Rechnung existiert bereits',
          description: 'Die bestehende Rechnung wurde geöffnet.',
        });
        return;
      }
      
      // New invoice was created - open it in overlay
      await refreshAll();
      setActiveTab('invoices');
      setEditingInvoiceId(result.invoiceId);
      toast({
        title: 'Rechnung erstellt',
        description: 'Die Rechnung wurde erfolgreich aus dem Auftrag erstellt.',
      });
    } catch (error) {
      console.error('Error converting order to invoice:', error);
      toast({
        title: 'Fehler',
        description: 'Rechnung konnte nicht erstellt werden. Bitte prüfen Sie die Auftragsdaten (Fälligkeit/Zahlungsziel).',
        variant: 'destructive',
      });
    } finally {
      setConvertingOrderIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };
  
  // Handler for opening existing invoice from dialog
  const handleOpenExistingInvoice = () => {
    if (existingInvoiceDialog) {
      setEditingInvoiceId(existingInvoiceDialog.invoiceId);
      setActiveTab('invoices');
      setExistingInvoiceDialog(null);
    }
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

  /**
   * One-click email flow for offers:
   * 1. Open PDF in print dialog (user saves as PDF)
   * 2. Open email client with mailto
   */
  const handleSendOfferEmail = (offer: Offer) => {
    if (!concernID) {
      toast({ title: 'Fehler', description: 'Mandant nicht gefunden', variant: 'destructive' });
      return;
    }

    // Check company profile
    const profileCheck = validateCompanyProfile(branding);
    if (!profileCheck.valid) {
      toast({ 
        title: 'Firmendaten unvollständig', 
        description: `Bitte ergänzen Sie unter Einstellungen → Firmendaten: ${profileCheck.missingFields.join(', ')}`,
        variant: 'destructive' 
      });
      return;
    }

    setSendingEmailOfferId(offer.id);
    setEmailSendProgress('generating');

    try {
      sendOfferViaEmail({
        offer,
        branding: branding!,
        recipientEmail: offer.clientSnapshot?.billingAddress?.email || '',
        customerName: offer.clientSnapshot?.name,
        senderName: user?.displayName || user?.vorname || undefined,
        onProgress: (step) => setEmailSendProgress(step as any),
      });

      toast({ 
        title: '✅ PDF-Vorschau geöffnet', 
        description: 'Bitte drucken Sie das PDF (Speichern als PDF) und fügen Sie es dann als Anhang zur E-Mail hinzu.' 
      });
    } catch (error: any) {
      console.error('Error sending offer email:', error);
      toast({ 
        title: 'Fehler', 
        description: error.message || 'E-Mail konnte nicht vorbereitet werden', 
        variant: 'destructive' 
      });
    } finally {
      setSendingEmailOfferId(null);
      setEmailSendProgress(null);
    }
  };

  /**
   * Handle successful finalization from Cloud Function
   */
  const handleFinalizeSuccess = () => {
    toast({ 
      title: '✅ Angebot finalisiert', 
      description: `Angebot ${offerToFinalize?.number || offerToFinalize?.id} wurde als versendet markiert.` 
    });
    setOfferToFinalize(null);
    setShowFinalizeDialog(false);
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
    // Check if company profile is complete
    const profileCheck = validateCompanyProfile(branding);
    if (!profileCheck.valid) {
      alert(`Firmendaten unvollständig. Fehlende Felder: ${profileCheck.missingFields.join(', ')}.\n\nBitte ergänzen Sie unter Einstellungen → Firmendaten.`);
      return;
    }

    const w = window.open('', '_blank');
    if (!w) return;
    
    const isDE = (doc as any).locale !== 'en';
    const isSmallBusiness = branding?.isSmallBusiness || false;
    
    // Document type labels
    const title = doc.documentType === 'offer' 
      ? (isDE ? 'Angebot' : 'Quotation') 
      : doc.documentType === 'order' 
        ? (isDE ? 'Auftrag' : 'Order') 
        : (isDE ? 'Rechnung' : 'Invoice');
    
    // German labels
    const labels = {
      date: isDE ? 'Datum' : 'Date',
      validUntil: isDE ? 'Gültig bis' : 'Valid until',
      due: isDE ? 'Fällig' : 'Due',
      pos: isDE ? 'Pos.' : 'No.',
      desc: isDE ? 'Beschreibung' : 'Description',
      qty: isDE ? 'Menge' : 'Qty',
      unit: isDE ? 'Einheit' : 'Unit',
      unitNet: isDE ? 'Einzelpreis (netto)' : 'Unit price (net)',
      lineTotal: isDE ? 'Gesamt (netto)' : 'Total (net)',
      subtotal: isDE ? 'Zwischensumme netto' : 'Subtotal net',
      vat: isDE ? 'Umsatzsteuer' : 'VAT',
      total: isDE ? 'Gesamtbetrag' : 'Total',
      vatId: isDE ? 'USt-IdNr.' : 'VAT ID',
      taxNumber: isDE ? 'Steuernummer' : 'Tax Number',
      register: isDE ? 'Handelsregister' : 'Commercial Register',
      director: isDE ? 'Geschäftsführer' : 'Managing Director',
      bank: isDE ? 'Bankverbindung' : 'Bank Details',
      paymentTerms: isDE ? 'Zahlungsbedingungen' : 'Payment Terms',
      smallBusinessNote: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    };

    // Company info from branding (concern's company profile)
    const companyName = branding?.companyName || '';
    const legalForm = branding?.legalForm ? ` ${branding.legalForm}` : '';
    const companyFullName = `${companyName}${legalForm}`;
    const companyAddress = branding?.street 
      ? `${branding.street}, ${branding.postalCode || ''} ${branding.city || ''}`
      : branding?.address || '';
    const companyCountry = branding?.country || 'Deutschland';
    const companyEmail = branding?.email || '';
    const companyPhone = branding?.phone || '';
    const companyWebsite = branding?.website || '';
    const logoUrl = branding?.logoUrl || '';
    const vatId = branding?.vatId || '';
    const taxNumber = branding?.taxNumber || '';
    const commercialRegister = branding?.commercialRegister || '';
    const managingDirector = branding?.managingDirector || '';
    const bankName = branding?.bankName || '';
    const iban = branding?.iban || '';
    const bic = branding?.bic || '';
    const paymentTermsText = branding?.paymentTermsText || (isDE ? 'Zahlbar innerhalb von 14 Tagen ohne Abzug.' : 'Payment due within 14 days.');
    const offerValidityDays = branding?.offerValidityDays || 14;
    
    // Calculate valid until date for offers
    const issueDate = new Date(doc.issueDate);
    const validUntilDate = new Date(issueDate);
    validUntilDate.setDate(validUntilDate.getDate() + offerValidityDays);
    const validUntilStr = validUntilDate.toLocaleDateString('de-DE');
    const issueDateStr = issueDate.toLocaleDateString('de-DE');
    
    // Line items
    const rows = doc.lineItems.map(it => {
      const lineTotal = it.quantity * it.unitPrice;
      return `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${it.position}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top;white-space:pre-wrap;">${it.description}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">${it.quantity.toLocaleString('de-DE', {minimumFractionDigits: 2})}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${it.unit}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">${it.unitPrice.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">${lineTotal.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
      </tr>`;
    }).join('');
    
    // VAT calculation section (only if not small business)
    let totalsSection = '';
    if (isSmallBusiness) {
      totalsSection = `
        <div style="text-align:right;margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px;">
          <div style="font-size:18px;font-weight:700;color:#111;">${labels.total}: ${doc.totals.itemNetAfterDiscount.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</div>
          <div style="margin-top:8px;font-size:12px;color:#666;font-style:italic;">${labels.smallBusinessNote}</div>
        </div>`;
    } else {
      const vatLines = Object.entries(doc.totals.vatByKey || {}).map(([k, v]) => {
        const rate = k.replace('DE', '');
        return `<div style="display:flex;justify-content:space-between;margin:4px 0;"><span>${labels.vat} ${rate}%:</span><span>${(v as number).toLocaleString('de-DE', {minimumFractionDigits: 2})} €</span></div>`;
      }).join('');
      
      totalsSection = `
        <div style="text-align:right;margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px;">
          <div style="display:flex;justify-content:space-between;margin:4px 0;"><span>${labels.subtotal}:</span><span>${doc.totals.itemNetAfterDiscount.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</span></div>
          ${vatLines}
          <div style="border-top:2px solid #333;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:18px;font-weight:700;">
            <span>${labels.total}:</span>
            <span>${doc.totals.grandTotalGross.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</span>
          </div>
        </div>`;
    }

    w.document.write(`
      <!DOCTYPE html>
      <html lang="${isDE ? 'de' : 'en'}">
        <head>
          <meta charset="utf-8" />
          <title>${title} ${doc.number}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 40px; font-size: 14px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
            .issuer { max-width: 50%; }
            .issuer-name { font-size: 22px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
            .issuer-details { font-size: 12px; color: #6b7280; line-height: 1.6; }
            .logo { max-height: 60px; max-width: 200px; }
            .addresses { display: flex; justify-content: space-between; margin-bottom: 24px; }
            .address-block { width: 48%; }
            .address-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .address-content { font-size: 13px; }
            .document-info { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .document-title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
            .document-meta { display: flex; gap: 24px; font-size: 13px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            thead th { background: #f9fafb; padding: 10px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
            thead th:nth-child(3), thead th:nth-child(5), thead th:nth-child(6) { text-align: right; }
            .payment-terms { margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; }
            .payment-terms-title { font-weight: 600; color: #92400e; margin-bottom: 4px; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; }
            .footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
            .footer-section { }
            .footer-label { font-weight: 600; color: #4b5563; margin-bottom: 4px; }
            .no-print { margin-top: 24px; }
            @media print { 
              .no-print { display: none; } 
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <!-- Header: Issuer (Company) -->
          <div class="header">
            <div class="issuer">
              <div class="issuer-name">${companyFullName}</div>
              <div class="issuer-details">
                ${companyAddress}${companyCountry !== 'Deutschland' ? `, ${companyCountry}` : ''}<br>
                ${companyEmail ? `E-Mail: ${companyEmail}` : ''}${companyPhone ? ` • Tel: ${companyPhone}` : ''}${companyWebsite ? ` • ${companyWebsite}` : ''}
                ${vatId ? `<br>${labels.vatId}: ${vatId}` : ''}${taxNumber ? ` • ${labels.taxNumber}: ${taxNumber}` : ''}
                ${commercialRegister ? `<br>${labels.register}: ${commercialRegister}` : ''}
                ${managingDirector ? `<br>${labels.director}: ${managingDirector}` : ''}
              </div>
            </div>
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
          </div>

          <!-- Recipient Address -->
          <div class="addresses">
            <div class="address-block">
              <div class="address-label">${isDE ? 'Empfänger' : 'Recipient'}</div>
              <div class="address-content">
                <strong>${doc.clientSnapshot?.name || ''}</strong><br>
                ${doc.clientSnapshot?.billingAddress?.street || ''}<br>
                ${doc.clientSnapshot?.billingAddress?.postalCode || ''} ${doc.clientSnapshot?.billingAddress?.city || ''}
                ${doc.clientSnapshot?.vatId ? `<br>${labels.vatId}: ${doc.clientSnapshot.vatId}` : ''}
              </div>
            </div>
          </div>

          <!-- Document Info -->
          <div class="document-info">
            <div class="document-title">${title} ${doc.number}</div>
            <div class="document-meta">
              <span><strong>${labels.date}:</strong> ${issueDateStr}</span>
              ${doc.documentType === 'offer' ? `<span><strong>${labels.validUntil}:</strong> ${validUntilStr}</span>` : ''}
              ${doc.documentType === 'invoice' && (doc as any).dueDate ? `<span><strong>${labels.due}:</strong> ${new Date((doc as any).dueDate).toLocaleDateString('de-DE')}</span>` : ''}
            </div>
          </div>

          <!-- Line Items Table -->
          <table>
            <thead>
              <tr>
                <th style="width:50px;">${labels.pos}</th>
                <th>${labels.desc}</th>
                <th style="width:80px;">${labels.qty}</th>
                <th style="width:70px;">${labels.unit}</th>
                <th style="width:100px;">${labels.unitNet}</th>
                <th style="width:100px;">${labels.lineTotal}</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <!-- Totals -->
          ${totalsSection}

          <!-- Payment Terms -->
          <div class="payment-terms">
            <div class="payment-terms-title">${labels.paymentTerms}</div>
            <div>${paymentTermsText}</div>
          </div>

          ${doc.documentType === 'offer' && (doc as any).calcSummary ? `
          <div style="margin-top:16px; padding:12px; border:1px solid #ddd; border-radius:6px; background:#f9fafb;">
            <div style="font-weight:700; margin-bottom:6px;">📊 Kosten / Marge (intern)</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
              <div>Materialkosten: ${((doc as any).calcSummary.materialsCost || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} €</div>
              <div>Arbeitskosten: ${((doc as any).calcSummary.laborCost || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} €</div>
              <div>Gemeinkosten (${((doc as any).calcSummary.overheadPct || 0).toFixed(0)}%): ${((doc as any).calcSummary.overheadValue || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} €</div>
              <div><strong>Gesamtkosten: ${((doc as any).calcSummary.costTotal || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} €</strong></div>
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #ddd;">
              <strong>Marge: ${((doc as any).calcSummary.marginValue || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} € (${((doc as any).calcSummary.marginPct || 0).toFixed(1)}%)</strong>
            </div>
          </div>` : ''}

          <!-- Footer -->
          <div class="footer">
            <div class="footer-grid">
              <div class="footer-section">
                <div class="footer-label">${companyFullName}</div>
                <div>${companyAddress}</div>
              </div>
              ${(bankName || iban) ? `
              <div class="footer-section">
                <div class="footer-label">${labels.bank}</div>
                <div>${bankName ? bankName : ''}</div>
                <div>${iban ? `IBAN: ${iban}` : ''}${bic ? ` • BIC: ${bic}` : ''}</div>
              </div>` : ''}
              <div class="footer-section">
                <div class="footer-label">Kontakt</div>
                <div>${companyEmail}</div>
                <div>${companyPhone}</div>
              </div>
            </div>
          </div>

          <div class="no-print">
            <button onclick="window.print()" style="padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
              🖨️ Drucken / Als PDF speichern
            </button>
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

  const handleOpenPayment = (invoice: Invoice) => {
    setPaymentDialogInvoice(invoice);
  };

  // Get display name for current user
  const currentUserName = user?.displayName || user?.email || 'Unbekannt';

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader title="💼 Angebote / Aufträge / Rechnungen" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-gradient-to-r from-gray-100 to-gray-200 p-1 rounded-lg shadow-md">
            <TabsTrigger value="email-inquiries" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              <Sparkles className="h-4 w-4 mr-1" />
              Anfragen
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

          {/* Email Inquiries Tab - Customer Inquiries from AI */}
          <TabsContent value="email-inquiries">
            <SalesEmailInquiriesTab
              onNavigateToOffer={async (offerId) => {
                // First refresh to ensure we have the latest data
                await refreshAll();
                // Switch to offers tab first
                setActiveTab('offers');
                
                // Wait a tick for state to update, then find the offer in the new list
                // We need to re-query from Firestore since `offers` state may not be updated yet
                const offersQ = query(collection(db, 'offers'), where('concernID', '==', concernID));
                const offersSnap = await getDocs(offersQ);
                const freshOffers = offersSnap.docs.map(d => {
                  const data = d.data() as any;
                  return {
                    ...data,
                    id: d.id,
                    createdAt: toISODateTime(data.createdAt) ?? toISODateTime(data.created_at) ?? null,
                    updatedAt: toISODateTime(data.updatedAt) ?? toISODateTime(data.updated_at) ?? null,
                    issueDate: toISODate(data.issueDate) ?? toISODate(data.issuedAt) ?? null,
                  };
                }) as Offer[];
                
                const freshOffer = freshOffers.find(o => o.id === offerId);
                if (freshOffer) {
                  setOfferToEdit(freshOffer);
                  setShowOfferEditor(true);
                } else {
                  // Dev-only warning if offer not found
                  if (process.env.NODE_ENV === 'development') {
                    console.warn(`[InvoicingPortal] Offer ${offerId} not found after refresh. Available offers:`, freshOffers.map(o => o.id));
                  }
                  // User feedback
                  toast({
                    title: 'Hinweis',
                    description: 'Angebot konnte nicht geöffnet werden. Bitte wählen Sie es aus der Liste.',
                  });
                }
              }}
              onNavigateToProject={(projectId) => {
                // Navigate to project
                if (onNavigate) {
                  onNavigate('projects');
                }
              }}
              onOfferCreated={async () => {
                // Refresh offers list and switch to offers tab
                await refreshAll();
                setActiveTab('offers');
              }}
            />
          </TabsContent>

          <TabsContent value="offers">
            {/* List always visible - editor opens in overlay dialog */}
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white px-6 pt-5 pb-5 flex-shrink-0">
                <CardTitle className="text-xl font-bold flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      📝
                    </div>
                    <div>
                      <span className="text-white">Angebote</span>
                      <Badge className="ml-3 bg-white/25 text-white font-bold border-0 px-3 py-1">
                        {offers.length}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowOfferEditor(true)}
                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 px-5 py-2"
                  >
                    <span className="mr-2">✨</span> Neues Angebot
                  </Button>
                </CardTitle>
              </CardHeader>
              
              {/* Scrollable Offer Cards */}
              <div className="overflow-auto bg-gradient-to-b from-gray-50 to-white p-4" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                {offers.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-gray-500 text-lg font-medium">Keine Angebote vorhanden</p>
                    <p className="text-gray-400 text-sm mt-2">Erstellen Sie Ihr erstes Angebot</p>
                    <Button 
                      onClick={() => setShowOfferEditor(true)}
                      className="mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg"
                    >
                      ✨ Jetzt Angebot erstellen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offers.map(o => {
                      // Status badge styling - with fallback for missing state
                      const statusConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
                        draft: { bg: 'bg-gray-100 border-gray-300', text: 'text-gray-700', icon: '📝', label: 'Entwurf' },
                        sent: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-700', icon: '📤', label: 'Gesendet' },
                        accepted: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-700', icon: '✅', label: 'Angenommen' },
                        declined: { bg: 'bg-red-100 border-red-300', text: 'text-red-700', icon: '❌', label: 'Abgelehnt' },
                        expired: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-700', icon: '⏰', label: 'Abgelaufen' },
                        converted: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-700', icon: '🔄', label: 'Konvertiert' },
                      };
                      // Tolerant: default to 'draft' if state is missing or invalid
                      const status = statusConfig[o.state] || statusConfig.draft;
                      
                      // Tolerant fallbacks for display fields
                      const displayNumber = o.number || '(ohne Nummer)';
                      const displayClient = o.clientSnapshot?.name || o.clientId || '(ohne Kunde)';
                      const displayClientInitial = (displayClient[0] || 'K').toUpperCase();
                      const formattedTotal = (o.totals?.grandTotalGross || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const formattedDate = o.issueDate ? new Date(o.issueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                      
                      // Can edit if not yet sent (draft state)
                      const canEdit = o.state === 'draft';
                      // All offers are viewable (click opens in view-only or edit mode)
                      const isViewOnly = !canEdit;
                      
                      return (
                        <div 
                          key={o.id} 
                          className="bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-xl hover:border-blue-300 transition-all duration-200 overflow-hidden group cursor-pointer"
                        >
                          {/* Main Content Row - Clickable to open (edit for drafts, view for finalized) */}
                          <div 
                            className="p-4 flex items-center gap-4 hover:bg-blue-50/50 transition-colors"
                            onClick={() => {
                              setOfferToEdit(o);
                              setShowOfferEditor(true);
                            }}
                            title={canEdit ? 'Klicken zum Bearbeiten' : 'Klicken zum Ansehen (nur Lesezugriff)'}
                          >
                            {/* Edit/View indicator */}
                            <div className="flex-shrink-0 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className={isViewOnly ? 'text-gray-500' : 'text-blue-500'}>
                                {isViewOnly ? '👁️' : '✏️'}
                              </span>
                            </div>
                            
                            {/* Number & Date Column */}
                            <div className="flex-shrink-0 w-32">
                              <div className="font-bold text-gray-900 text-base">{displayNumber}</div>
                              <div className="text-sm text-gray-500 mt-1">📅 {formattedDate}</div>
                            </div>
                            
                            {/* Customer Column */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {displayClientInitial}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">{displayClient}</div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {o.lineItems?.length || 0} Position{(o.lineItems?.length || 0) !== 1 ? 'en' : ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-semibold text-sm ${status.bg} ${status.text}`}>
                                <span>{status.icon}</span>
                                {status.label}
                              </span>
                            </div>
                            
                            {/* Amount */}
                            <div className="flex-shrink-0 w-32 text-right">
                              <div className="font-bold text-lg text-gray-900">{formattedTotal} €</div>
                              <div className="text-xs text-gray-500">Brutto</div>
                            </div>
                          </div>
                          
                          {/* Actions Row */}
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/50 border-t border-gray-100 flex items-center justify-between gap-2">
                            {/* Primary Actions */}
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleSendOfferEmail(o)}
                                disabled={sendingEmailOfferId === o.id}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                              >
                                {sendingEmailOfferId === o.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    {emailSendProgress === 'generating' ? 'PDF wird erstellt...' :
                                     emailSendProgress === 'downloading' ? 'Download...' :
                                     emailSendProgress === 'opening' ? 'Öffne E-Mail...' : 'Wird vorbereitet...'}
                                  </>
                                ) : (
                                  <>
                                    <Mail className="h-4 w-4 mr-1.5" /> Angebot per E-Mail
                                  </>
                                )}
                              </Button>
                              {o.state === 'draft' || o.state === 'sent' ? (
                                <Button 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); handleOfferToOrderClick(o.id, o.number || o.id); }}
                                  disabled={convertingOfferIds.has(o.id)}
                                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                                >
                                  {convertingOfferIds.has(o.id) ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Prüfe...
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRight className="h-4 w-4 mr-1.5" /> Zu Auftrag
                                    </>
                                  )}
                                </Button>
                              ) : null}
                            </div>
                            
                            {/* Secondary Actions */}
                            <div className="flex items-center gap-1.5">
                              {/* Finalize button - only for drafts */}
                              {o.state === 'draft' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setOfferToFinalize(o);
                                    setShowFinalizeDialog(true);
                                  }}
                                  className="border-amber-300 hover:border-amber-500 hover:bg-amber-50 text-amber-700 font-medium"
                                >
                                  <Lock className="h-4 w-4 mr-1" /> Finalisieren
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setHistoryModal({
                                    docType: 'offer',
                                    docId: o.id,
                                    title: `Angebot ${o.number || o.id}`,
                                  });
                                }}
                                className="border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium"
                              >
                                <Clock className="h-4 w-4 mr-1" /> Verlauf
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  // Validate company profile
                                  const profileCheck = validateCompanyProfile(branding);
                                  if (!profileCheck.valid) {
                                    toast({ 
                                      title: 'Firmendaten unvollständig', 
                                      description: `Bitte ergänzen Sie unter Einstellungen → Firmendaten: ${profileCheck.missingFields.join(', ')}`,
                                      variant: 'destructive' 
                                    });
                                    return;
                                  }
                                  try {
                                    const generatedByName = user?.displayName || user?.vorname || user?.email || '';
                                    downloadOfferPdf(o, branding!, generatedByName);
                                    // Record PDF generation in history
                                    if (user?.uid) {
                                      recordPdfGenerated({
                                        offerId: o.id,
                                        userId: user.uid,
                                        userName: user.displayName || user.vorname || user.email || '',
                                      }).catch(console.error);
                                    }
                                    toast({ title: '✅ PDF erstellt', description: 'Das Angebot wurde als PDF heruntergeladen.' });
                                  } catch (e: any) {
                                    toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
                                  }
                                }}
                                className="border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-medium"
                              >
                                <FileDown className="h-4 w-4 mr-1" /> PDF
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => exportOfferCostCsv(o)}
                                className="border-gray-300 hover:border-amber-400 hover:bg-amber-50 text-gray-700 hover:text-amber-700 font-medium"
                                title="Kalkulation als CSV exportieren"
                              >
                                <FileDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
            
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

          {/* Aufträge Tab - Card-based layout matching Angebote (canonical pattern) */}
          <TabsContent value="orders">
            {/* List always visible - editor opens in overlay dialog */}
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-purple-500 via-purple-600 to-violet-600 text-white px-6 pt-5 pb-5 flex-shrink-0">
                <CardTitle className="text-xl font-bold flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      📋
                    </div>
                    <div>
                      <span className="text-white">Aufträge</span>
                      <Badge className="ml-3 bg-white/25 text-white font-bold border-0 px-3 py-1">
                        {orders.length}
                      </Badge>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              
              {/* Scrollable Order Cards */}
              <div className="overflow-auto bg-gradient-to-b from-gray-50 to-white p-4" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                {orders.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-gray-500 text-lg font-medium">Keine Aufträge vorhanden</p>
                    <p className="text-gray-400 text-sm mt-2">Aufträge werden aus Angeboten erstellt</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(o => {
                      // Status badge styling - matching Angebote pattern
                      const orderStatusConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
                        draft: { bg: 'bg-gray-100 border-gray-300', text: 'text-gray-700', icon: '📝', label: 'Entwurf' },
                        confirmed: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-700', icon: '✅', label: 'Bestätigt' },
                        in_progress: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-700', icon: '🔧', label: 'In Bearbeitung' },
                        completed: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-700', icon: '✔️', label: 'Abgeschlossen' },
                        cancelled: { bg: 'bg-red-100 border-red-300', text: 'text-red-700', icon: '❌', label: 'Storniert' },
                      };
                      const status = orderStatusConfig[o.state] || orderStatusConfig.draft;
                      const formattedTotal = (o.totals?.grandTotalGross || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const formattedDate = o.issueDate ? new Date(o.issueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                      
                      return (
                        <div 
                          key={o.id} 
                          className="bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-xl hover:border-purple-300 transition-all duration-200 overflow-hidden group cursor-pointer"
                        >
                          {/* Main Content Row - Clickable to open editor */}
                          <div 
                            className="p-4 flex items-center gap-4 hover:bg-purple-50/50 transition-colors"
                            onClick={() => setEditingOrderId(o.id)}
                            title="Klicken zum Bearbeiten"
                          >
                            {/* Edit indicator */}
                            <div className="flex-shrink-0 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-purple-500">✏️</span>
                            </div>
                            
                            {/* Number & Date Column */}
                            <div className="flex-shrink-0 w-32">
                              <div className="font-bold text-gray-900 text-base">{o.number || 'Neu'}</div>
                              <div className="text-sm text-gray-500 mt-1">📅 {formattedDate}</div>
                            </div>
                            
                            {/* Customer Column */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {(o.clientSnapshot?.name || 'K')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">{o.clientSnapshot?.name || o.clientId}</div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {o.lineItems?.length || 0} Position{(o.lineItems?.length || 0) !== 1 ? 'en' : ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-semibold text-sm ${status.bg} ${status.text}`}>
                                <span>{status.icon}</span>
                                {status.label}
                              </span>
                            </div>
                            
                            {/* Amount */}
                            <div className="flex-shrink-0 w-32 text-right">
                              <div className="font-bold text-lg text-gray-900">{formattedTotal} €</div>
                              <div className="text-xs text-gray-500">Brutto</div>
                            </div>
                          </div>
                          
                          {/* Actions Row */}
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-purple-50/50 border-t border-gray-100 flex items-center justify-between gap-2">
                            {/* Primary Actions */}
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); handleOrderToInvoice(o.id); }}
                                disabled={convertingOrderIds.has(o.id)}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                              >
                                {convertingOrderIds.has(o.id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Prüfe...
                                  </>
                                ) : (
                                  <>
                                    <ArrowRight className="h-4 w-4 mr-1.5" /> Zu Rechnung
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Secondary Actions */}
                            <div className="flex items-center gap-1.5">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => { e.stopPropagation(); openPdfPreview(o); }}
                                className="border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-medium"
                              >
                                <FileText className="h-4 w-4 mr-1" /> PDF
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Rechnungen Tab - Card-based layout matching Angebote (canonical pattern) */}
          <TabsContent value="invoices">
            {/* List always visible - editor opens in overlay dialog */}
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-6 pt-5 pb-5 flex-shrink-0">
                <CardTitle className="text-xl font-bold flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      💶
                    </div>
                    <div>
                      <span className="text-white">Rechnungen</span>
                      <Badge className="ml-3 bg-white/25 text-white font-bold border-0 px-3 py-1">
                        {invoices.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => setShowInvoiceEditor(true)}
                      className="bg-white text-green-600 hover:bg-green-50 font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 px-5 py-2"
                    >
                      <span className="mr-2">✨</span> Neue Rechnung
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExportDATEV} 
                      disabled={selectedInvoiceIds.size === 0}
                      className="bg-white/90 text-green-700 hover:bg-white font-semibold shadow-lg transition-all disabled:opacity-50 px-4 py-2"
                    >
                      <FileDown className="h-4 w-4 mr-1.5" /> DATEV
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              
              
              {/* Select All for DATEV */}
              {invoices.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={selectedInvoiceIds.size === invoices.length && invoices.length > 0}
                    onChange={e => {
                      if (e.target.checked) setSelectedInvoiceIds(new Set(invoices.map(i => i.id)));
                      else setSelectedInvoiceIds(new Set());
                    }} 
                    className="w-4 h-4 rounded border-gray-300" 
                  />
                  <span className="text-sm text-gray-600">
                    {selectedInvoiceIds.size > 0 
                      ? `${selectedInvoiceIds.size} ausgewählt` 
                      : 'Alle auswählen für DATEV-Export'}
                  </span>
                </div>
              )}
              
              {/* Scrollable Invoice Cards */}
              <div className="overflow-auto bg-gradient-to-b from-gray-50 to-white p-4" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                {invoices.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">💶</div>
                    <p className="text-gray-500 text-lg font-medium">Keine Rechnungen vorhanden</p>
                    <p className="text-gray-400 text-sm mt-2">Erstellen Sie Ihre erste Rechnung</p>
                    <Button 
                      onClick={() => setShowInvoiceEditor(true)}
                      className="mt-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg"
                    >
                      ✨ Jetzt Rechnung erstellen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map(inv => {
                      // Payment status badge styling
                      const paymentStatusConfig: Record<PaymentStatus | string, { bg: string; text: string; icon: string; label: string }> = {
                        open: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-700', icon: '💰', label: 'Offen' },
                        partial: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-700', icon: '💸', label: 'Teilweise bezahlt' },
                        paid: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-700', icon: '✅', label: 'Bezahlt' },
                        overpaid: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-700', icon: '💎', label: 'Überbezahlt' },
                      };
                      
                      // Document state badge styling
                      const docStateConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
                        draft: { bg: 'bg-gray-100 border-gray-300', text: 'text-gray-700', icon: '📝', label: 'Entwurf' },
                        sent: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-700', icon: '📤', label: 'Gesendet' },
                        overdue: { bg: 'bg-red-100 border-red-300', text: 'text-red-700', icon: '⚠️', label: 'Überfällig' },
                        cancelled: { bg: 'bg-gray-200 border-gray-400', text: 'text-gray-600', icon: '❌', label: 'Storniert' },
                      };
                      
                      // Use paymentStatus if available, else derive from state
                      const effectivePaymentStatus: PaymentStatus = inv.paymentStatus || (inv.state === 'paid' ? 'paid' : 'open');
                      const status = paymentStatusConfig[effectivePaymentStatus] || paymentStatusConfig.open;
                      const docState = docStateConfig[inv.state] || docStateConfig.draft;
                      
                      const formattedTotal = (inv.totals?.grandTotalGross || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      // Use new openAmountCents if available, else fallback
                      const openAmountEur = inv.openAmountCents != null 
                        ? inv.openAmountCents / 100 
                        : (inv.openAmount ?? inv.totals?.grandTotalGross ?? 0);
                      const formattedOpen = openAmountEur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const formattedDate = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                      const isSelected = selectedInvoiceIds.has(inv.id);
                      
                      return (
                        <div 
                          key={inv.id} 
                          className={`bg-white rounded-xl border-2 shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden group cursor-pointer ${
                            isSelected ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300'
                          }`}
                        >
                          {/* Main Content Row - Clickable to open editor */}
                          <div 
                            className="p-4 flex items-center gap-4 hover:bg-green-50/50 transition-colors"
                            onClick={() => setEditingInvoiceId(inv.id)}
                            title="Klicken zum Bearbeiten"
                          >
                            {/* Checkbox for DATEV selection */}
                            <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => toggleInvoiceSelected(inv.id)}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                            </div>
                            
                            {/* Edit indicator */}
                            <div className="flex-shrink-0 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-green-500">✏️</span>
                            </div>
                            
                            {/* Number & Date Column */}
                            <div className="flex-shrink-0 w-32">
                              <div className="font-bold text-gray-900 text-base">{inv.number || 'Neu'}</div>
                              <div className="text-sm text-gray-500 mt-1">📅 {formattedDate}</div>
                            </div>
                            
                            {/* Customer Column */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {(inv.clientSnapshot?.name || 'K')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">{inv.clientSnapshot?.name || inv.clientId}</div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {inv.lineItems?.length || 0} Position{(inv.lineItems?.length || 0) !== 1 ? 'en' : ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-semibold text-sm ${status.bg} ${status.text}`}>
                                <span>{status.icon}</span>
                                {status.label}
                              </span>
                            </div>
                            
                            {/* Amount */}
                            <div className="flex-shrink-0 w-36 text-right">
                              <div className="font-bold text-lg text-gray-900">{formattedTotal} €</div>
                              {inv.state !== 'paid' && inv.openAmount !== inv.totals?.grandTotalGross && (
                                <div className="text-xs text-amber-600 font-medium">Offen: {formattedOpen} €</div>
                              )}
                              {inv.state === 'paid' && (
                                <div className="text-xs text-emerald-600 font-medium">Vollständig bezahlt</div>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions Row */}
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-green-50/50 border-t border-gray-100 flex items-center justify-between gap-2">
                            {/* Primary Actions */}
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); handleSendByEmail(inv); }}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                              >
                                <Mail className="h-4 w-4 mr-1.5" /> Per E-Mail senden
                              </Button>
                              {inv.paymentStatus !== 'paid' && inv.paymentStatus !== 'overpaid' && (
                                <Button 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); handleOpenPayment(inv); }}
                                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                >
                                  <Euro className="h-4 w-4 mr-1.5" /> Zahlung erfassen
                                </Button>
                              )}
                            </div>
                            
                            {/* Secondary Actions */}
                            <div className="flex items-center gap-1.5">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setHistoryModal({
                                    docType: 'invoice',
                                    docId: inv.id,
                                    title: `Rechnung ${inv.number || inv.id}`,
                                  });
                                }}
                                className="border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium"
                              >
                                <Clock className="h-4 w-4 mr-1" /> Verlauf
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                disabled={generatingInvoicePdfId === inv.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Validate company profile
                                  const profileCheck = validateCompanyProfile(branding);
                                  if (!profileCheck.valid) {
                                    toast({ 
                                      title: 'Firmendaten unvollständig', 
                                      description: `Bitte ergänzen Sie unter Einstellungen → Firmendaten: ${profileCheck.missingFields.join(', ')}`,
                                      variant: 'destructive' 
                                    });
                                    return;
                                  }
                                  // Validate invoice
                                  const invoiceCheck = validateInvoiceForPdf(inv);
                                  if (!invoiceCheck.valid) {
                                    toast({ 
                                      title: 'Rechnungsdaten unvollständig', 
                                      description: `Fehlende Felder: ${invoiceCheck.errors.join(', ')}`,
                                      variant: 'destructive' 
                                    });
                                    return;
                                  }
                                  try {
                                    setGeneratingInvoicePdfId(inv.id);
                                    
                                    // Resolve order number for legacy invoices (before PDF generation)
                                    let invoiceForPdf = inv;
                                    if (!inv.relatedOrderNumber && inv.relatedOrderId && invoicingService) {
                                      invoiceForPdf = await invoicingService.resolveInvoiceOrderNumber(inv);
                                    }
                                    
                                    const generatedByName = user?.displayName || user?.vorname || user?.email || '';
                                    downloadInvoicePdf(invoiceForPdf, branding!, generatedByName);
                                    toast({ title: '✅ PDF erstellt', description: 'Die Rechnung wurde als PDF heruntergeladen.' });
                                  } catch (e: any) {
                                    toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
                                  } finally {
                                    setGeneratingInvoicePdfId(null);
                                  }
                                }}
                                className="border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-medium"
                              >
                                {generatingInvoicePdfId === inv.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Lade...
                                  </>
                                ) : (
                                  <>
                                    <FileDown className="h-4 w-4 mr-1" /> PDF
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
            
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
            {/* DATEV Export Panel with settings and export functionality */}
            {concernID && user?.uid && (
              <DatevExportPanel
                concernID={concernID}
                userId={user.uid}
                userName={currentUserName}
              />
            )}
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

      {/* Offer Editor Dialog - For new and editing existing offers */}
      <Dialog open={showOfferEditor} onOpenChange={(open) => {
        setShowOfferEditor(open);
        if (!open) setOfferToEdit(null); // Clear when closing
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">{offerToEdit && offerToEdit.state !== 'draft' ? '👁️' : '📝'}</span>
              {offerToEdit 
                ? offerToEdit.state !== 'draft'
                  ? `Angebot ${offerToEdit.number || ''} ansehen`
                  : `Angebot ${offerToEdit.number || ''} bearbeiten`
                : 'Neues Angebot erstellen'}
            </DialogTitle>
            <div className="text-sm text-blue-100 mt-1">
              {offerToEdit && offerToEdit.state !== 'draft' 
                ? 'Dieses Angebot ist finalisiert (nur Lesezugriff)'
                : offerToEdit 
                  ? 'Bearbeiten Sie das bestehende Angebot'
                  : 'Erstellen Sie ein neues Angebot für einen Kunden'}
            </div>
          </DialogHeader>
          <div className="mt-4">
            <OfferEditor 
              existingOffer={offerToEdit || undefined}
              onCreated={async () => {
                setShowOfferEditor(false);
                setOfferToEdit(null);
                await refreshAll();
              }}
              onCancel={() => {
                setShowOfferEditor(false);
                setOfferToEdit(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* New Invoice Dialog - Matching Style */}
      <Dialog open={showInvoiceEditor} onOpenChange={setShowInvoiceEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-4 border-green-500 shadow-2xl" aria-describedby={undefined}>
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

      {/* Invoice Editor Dialog - For viewing/editing existing invoices (overlay like Offers) */}
      <Dialog open={!!editingInvoiceId} onOpenChange={(open) => {
        if (!open) {
          setEditingInvoiceId(null);
          refreshAll();
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-4 border-green-500 shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {(() => {
                const inv = invoices.find(i => i.id === editingInvoiceId);
                const isReadOnly = inv && inv.state !== 'draft';
                return (
                  <>
                    <span className="text-3xl">{isReadOnly ? '👁️' : '🧾'}</span>
                    {inv 
                      ? isReadOnly 
                        ? `Rechnung ${inv.number || ''} ansehen`
                        : `Rechnung ${inv.number || ''} bearbeiten`
                      : 'Rechnung bearbeiten'}
                  </>
                );
              })()}
            </DialogTitle>
            <div className="text-sm text-green-100 mt-1">
              {(() => {
                const inv = invoices.find(i => i.id === editingInvoiceId);
                return inv && inv.state !== 'draft'
                  ? 'Diese Rechnung ist finalisiert (nur Lesezugriff)'
                  : 'Bearbeiten Sie die bestehende Rechnung';
              })()}
            </div>
          </DialogHeader>
          <div className="mt-4">
            {editingInvoiceId && (
              <InvoiceEditor 
                invoice={invoices.find(iv => iv.id === editingInvoiceId)}
                onSaved={async () => {
                  setEditingInvoiceId(null);
                  await refreshAll();
                }}
                onCancel={() => setEditingInvoiceId(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Editor Dialog - For viewing/editing orders (overlay like Offers) */}
      <Dialog open={!!editingOrderId} onOpenChange={(open) => {
        if (!open) {
          setEditingOrderId(null);
          refreshAll();
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-4 border-purple-500 shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {(() => {
                const ord = orders.find(o => o.id === editingOrderId);
                const isReadOnly = ord && ord.state === 'done';
                return (
                  <>
                    <span className="text-3xl">{isReadOnly ? '👁️' : '📋'}</span>
                    {ord 
                      ? isReadOnly 
                        ? `Auftrag ${ord.number || ''} ansehen`
                        : `Auftrag ${ord.number || ''} bearbeiten`
                      : 'Auftrag bearbeiten'}
                  </>
                );
              })()}
            </DialogTitle>
            <div className="text-sm text-purple-100 mt-1">
              {(() => {
                const ord = orders.find(o => o.id === editingOrderId);
                return ord && ord.state === 'done'
                  ? 'Dieser Auftrag ist abgeschlossen (nur Lesezugriff)'
                  : 'Bearbeiten Sie den bestehenden Auftrag';
              })()}
            </div>
          </DialogHeader>
          <div className="mt-4">
            {editingOrderId && (
              <OrderEditor 
                order={orders.find(or => or.id === editingOrderId)!}
                onSaved={async () => {
                  setEditingOrderId(null);
                  await refreshAll();
                }}
                onCancel={() => setEditingOrderId(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Action Sidebar */}

      {/* Document History Modal (unified for offers/orders/invoices) */}
      <Dialog open={!!historyModal} onOpenChange={(open) => { if (!open) setHistoryModal(null); }}>
        <DialogContent className="max-w-2xl bg-white border-2 border-blue-200 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Verlauf: {historyModal?.title || 'Dokument'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Änderungsverlauf für {historyModal?.title || 'dieses Dokument'}
            </DialogDescription>
          </DialogHeader>
          {historyModal && (
            <DocumentHistoryPanel
              docType={historyModal.docType}
              docId={historyModal.docId}
              docNumber={historyModal.title}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Finalize Offer Dialog */}
      {offerToFinalize && (
        <FinalizeOfferDialog
          open={showFinalizeDialog}
          onClose={() => {
            setShowFinalizeDialog(false);
            setOfferToFinalize(null);
          }}
          onSuccess={handleFinalizeSuccess}
          offerId={offerToFinalize.id}
          offerNumber={offerToFinalize.number || offerToFinalize.id}
        />
      )}

      {/* Confirmation Dialog before converting Offer to Order */}
      <Dialog open={!!confirmOfferToOrderDialog} onOpenChange={(open) => !open && setConfirmOfferToOrderDialog(null)}>
        <DialogContent className="max-w-md bg-white border-2 border-blue-400 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 -mx-6 -mt-6 rounded-t-lg border-b border-blue-200">
            <DialogTitle className="text-lg font-bold text-blue-800 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Auftrag erstellen
            </DialogTitle>
            <DialogDescription className="sr-only">
              Bestätigung zur Erstellung eines Auftrags aus dem Angebot
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Wurde dieses Angebot vom Kunden angenommen?
            </p>
            <p className="mt-2 font-bold text-lg text-blue-700">
              {confirmOfferToOrderDialog?.offerNumber}
            </p>
            <p className="mt-4 text-gray-600 text-sm">
              Bei Bestätigung wird ein Auftrag aus diesem Angebot erstellt.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setConfirmOfferToOrderDialog(null)}
              className="border-gray-300 hover:border-gray-400"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={() => confirmOfferToOrderDialog && handleConfirmedOfferToOrder(confirmOfferToOrderDialog.offerId)}
              disabled={convertingOfferIds.has(confirmOfferToOrderDialog?.offerId || '')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
            >
              {convertingOfferIds.has(confirmOfferToOrderDialog?.offerId || '') ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Ja, Auftrag erstellen'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing Invoice Dialog - prevents duplicates when clicking "Zu Rechnung" */}
      <Dialog open={!!existingInvoiceDialog} onOpenChange={(open) => !open && setExistingInvoiceDialog(null)}>
        <DialogContent className="max-w-md bg-white border-2 border-amber-400 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-amber-100 to-yellow-100 px-6 py-4 -mx-6 -mt-6 rounded-t-lg border-b border-amber-200">
            <DialogTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Rechnung existiert bereits
            </DialogTitle>
            <DialogDescription className="sr-only">
              Für diesen Auftrag existiert bereits eine Rechnung
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Für diesen Auftrag wurde bereits eine Rechnung erstellt:
            </p>
            <p className="mt-2 font-bold text-lg text-green-700">
              {existingInvoiceDialog?.invoiceNumber}
            </p>
            <p className="mt-4 text-gray-600 text-sm">
              Möchten Sie diese Rechnung öffnen?
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setExistingInvoiceDialog(null)}
              className="border-gray-300 hover:border-gray-400"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleOpenExistingInvoice}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
            >
              Rechnung öffnen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoice={paymentDialogInvoice}
        invoicingService={invoicingService}
        userName={currentUserName}
        open={!!paymentDialogInvoice}
        onOpenChange={(open) => !open && setPaymentDialogInvoice(null)}
        onPaymentRecorded={refreshAll}
      />
    </div>
  );
};

export default InvoicingPortal;


