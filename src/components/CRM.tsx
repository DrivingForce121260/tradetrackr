

// ============================================================================
// CRM DASHBOARD - MAIN COMPONENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CRMService from '@/services/crmService';
import OfferEditor from '@/components/invoicing/OfferEditor';
import CRMImportModal from '@/components/CRMImportModal';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Building2,
  Users,
  TrendingUp,
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Euro,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  BarChart3,
  TableIcon,
  Package,
  X,
  Shield,
  Camera,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import AppHeader from './AppHeader';
import BusinessCardScanModal from './crm/BusinessCardScanModal';
import BusinessCardUploadModal from './crm/BusinessCardUploadModal';
import BusinessCardReviewDialog from './crm/BusinessCardReviewDialog';
import { useHasCamera } from '@/hooks/useHasCamera';
import {
  CRMAccount,
  CRMContact,
  CRMOpportunity,
  CRMQuote,
  CRMActivity,
  CRMStats,
  CRMAccountFormData,
  CRMContactFormData,
  CRMOpportunityFormData
} from '@/types/crm';

interface CRMProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const CRM: React.FC<CRMProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [crmService, setCrmService] = useState<CRMService | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [accounts, setAccounts] = useState<CRMAccount[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [quotes, setQuotes] = useState<CRMQuote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortField, setSortField] = useState<keyof CRMOpportunity>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Form states
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [showNewOpportunityDialog, setShowNewOpportunityDialog] = useState(false);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [showQuickQuote, setShowQuickQuote] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showOpportunityDetails, setShowOpportunityDetails] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CRMAccount | null>(null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editAccountData, setEditAccountData] = useState<Partial<CRMAccount>>({});
  const [showBusinessCardScan, setShowBusinessCardScan] = useState(false);
  const [showBusinessCardUpload, setShowBusinessCardUpload] = useState(false);
  const [showBusinessCardReview, setShowBusinessCardReview] = useState(false);
  const [businessCardDetectedFields, setBusinessCardDetectedFields] = useState<any>(null);
  const [businessCardConfidence, setBusinessCardConfidence] = useState<number>(0);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<CRMOpportunity | null>(null);
  
  const hasCamera = useHasCamera();
  
  // Debug: Log camera status
  useEffect(() => {
    console.log('📷 [CRM] Camera available:', hasCamera);
  }, [hasCamera]);

  // Form data
  const [newAccount, setNewAccount] = useState<CRMAccountFormData>({
    name: '',
    legalForm: '',
    vatId: '',
    addresses: [],
    billingEmail: '',
    tags: [],
    source: 'web',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: ''
  });

  const [newContact, setNewContact] = useState<CRMContactFormData>({
    accountId: '',
    firstName: '',
    lastName: '',
    role: '',
    phones: [''],
    emails: [''],
    preferredChannel: 'email',
    notes: ''
  });

  const [newOpportunity, setNewOpportunity] = useState<CRMOpportunityFormData>({
    accountId: '',
    primaryContactId: '',
    title: '',
    pipelineId: 'default',
    stage: 'new',
    amountNet: 0,
    probability: 50,
    expectedCloseDate: new Date()
  });

  // Check permissions
  const canViewCRM = hasPermission('view_crm');
  const canCreateCRM = hasPermission('create_crm');
  const canEditCRM = hasPermission('edit_crm');
  const canDeleteCRM = hasPermission('delete_crm');

  // Initialize CRM service
  useEffect(() => {
    if (user) {
      const service = new CRMService(user, user.concernID || 'default');
      setCrmService(service);
      loadCRMData(service);
    }
  }, [user]);

  const loadCRMData = async (service: CRMService) => {
    try {
      setLoading(true);
      const [statsData, accountsData, contactsData, opportunitiesData] = await Promise.all([
        service.getCRMStats(),
        service.getAccounts(),
        service.getContacts(),
        service.getOpportunities()
      ]);

      setStats(statsData);
      setAccounts(accountsData);
      setContacts(contactsData);
      setOpportunities(opportunitiesData);
    } catch (error) {
      console.error('Error loading CRM data:', error);
      toast({
        title: 'Fehler',
        description: 'CRM-Daten konnten nicht geladen werden',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!crmService) return;

    try {
      await crmService.createAccount(newAccount);
      toast({
        title: 'Erfolg',
        description: 'Konto erfolgreich erstellt'
      });
      setShowNewAccountDialog(false);
      setNewAccount({
        name: '',
        legalForm: '',
        vatId: '',
        addresses: [],
        billingEmail: '',
        tags: [],
        source: 'web',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        notes: ''
      });
      loadCRMData(crmService);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Konto konnte nicht erstellt werden',
        variant: 'destructive'
      });
    }
  };

  const handleImportCSV = async (rows: Array<Record<string, string>>) => {
    if (!crmService) return { inserted: 0, updated: 0 };
    const res = await crmService.upsertAccountsFromCSV(rows);
    await loadCRMData(crmService);
    return res;
  };

  const handleMergeAccount = async (accountId: string, merged: any) => {
    if (!crmService) return;
    await crmService.updateAccount(accountId, merged as any);
    await loadCRMData(crmService);
  };

  const handleDeleteAccount = async (account: CRMAccount, mode: 'delete' | 'anonymize') => {
    if (!crmService) return;
    
    const confirmMessage = mode === 'anonymize' 
      ? `Möchten Sie die Daten für "${account.name}" anonymisieren?\n\n` +
        `Dies ist GDPR-konform und behält die Struktur, entfernt aber:\n` +
        `- Personenbezogene Daten\n` +
        `- Namen und Kontaktinformationen\n` +
        `- E-Mail-Adressen\n\n` +
        `Die Daten bleiben für statistische Zwecke erhalten.`
      : `Möchten Sie das Konto "${account.name}" komplett löschen?\n\n` +
        `⚠️ WARNUNG: Diese Aktion kann NICHT rückgängig gemacht werden!\n\n` +
        `Es werden gelöscht:\n` +
        `- Das gesamte Konto\n` +
        `- Alle Kontakte\n` +
        `- Alle Chancen\n` +
        `- Alle Angebote\n` +
        `- Alle Aktivitäten`;
    
    const confirmDelete = window.confirm(confirmMessage);
    if (!confirmDelete) return;
    
    try {
      if (mode === 'anonymize') {
        await crmService.deleteClientCascade(account.id, 'anonymize');
        toast({
          title: 'Erfolg',
          description: `Kundendaten wurden anonymisiert (GDPR-konform)`
        });
      } else {
        await crmService.deleteAccount(account.id);
        toast({
          title: 'Erfolg',
          description: `Konto "${account.name}" wurde komplett gelöscht`
        });
      }
      setShowAccountDetails(false);
      setSelectedAccount(null);
      await loadCRMData(crmService);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: mode === 'anonymize' ? 'Daten konnten nicht anonymisiert werden' : 'Konto konnte nicht gelöscht werden',
        variant: 'destructive'
      });
    }
  };

  const loadTimeline = async (account: CRMAccount) => {
    if (!account) return;
    const items: any[] = [];
    const clientId = account.id;
    const qOffers = query(collection(db, 'offers'), where('clientId', '==', clientId), orderBy('issueDate','desc'), limit(50));
    const qOrders = query(collection(db, 'orders'), where('clientId', '==', clientId), orderBy('issueDate','desc'), limit(50));
    const qInvoices = query(collection(db, 'invoices'), where('clientId', '==', clientId), orderBy('issueDate','desc'), limit(50));
    const qTasks = query(collection(db, 'tasks'), where('accountId', '==', clientId), orderBy('updatedAt','desc'), limit(50));
    const qEmails = query(collection(db, 'crm_activities'), where('accountId', '==', clientId), where('type','==','email'), orderBy('at','desc'), limit(50));
    const [s1, s2, s3, s4, s5] = await Promise.all([getDocs(qOffers), getDocs(qOrders), getDocs(qInvoices), getDocs(qTasks), getDocs(qEmails)]);
    s1.forEach(d => items.push({ type: 'offer', id: d.id, ...d.data() }));
    s2.forEach(d => items.push({ type: 'order', id: d.id, ...d.data() }));
    s3.forEach(d => items.push({ type: 'invoice', id: d.id, ...d.data() }));
    s4.forEach(d => items.push({ type: 'task', id: d.id, ...d.data() }));
    s5.forEach(d => items.push({ type: 'email', id: d.id, ...d.data() }));
    items.sort((a,b) => (new Date(b.issueDate || b.updatedAt || b.at).getTime()) - (new Date(a.issueDate || a.updatedAt || a.at).getTime()));
    setTimeline(items);
  };

  const handleGdprExport = async (account: CRMAccount) => {
    if (!crmService) return;
    const res = await crmService.gdprExport(account.id);
    window.open(res.url, '_blank');
  };

  const handleCreateContact = async () => {
    if (!crmService || !newContact.accountId) return;

    try {
      await crmService.createContact(newContact);
      toast({
        title: 'Erfolg',
        description: 'Kontakt erfolgreich erstellt'
      });
      setShowNewContactDialog(false);
      setNewContact({
        accountId: '',
        firstName: '',
        lastName: '',
        role: '',
        phones: [''],
        emails: [''],
        preferredChannel: 'email',
        notes: ''
      });
      loadCRMData(crmService);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Kontakt konnte nicht erstellt werden',
        variant: 'destructive'
      });
    }
  };

  const handleCreateOpportunity = async () => {
    if (!crmService || !newOpportunity.accountId) return;

    try {
      await crmService.createOpportunity(newOpportunity);
      toast({
        title: 'Erfolg',
        description: 'Chance erfolgreich erstellt'
      });
      setShowNewOpportunityDialog(false);
      setNewOpportunity({
        accountId: '',
        primaryContactId: '',
        title: '',
        pipelineId: 'default',
        stage: 'new',
        amountNet: 0,
        probability: 50,
        expectedCloseDate: new Date()
      });
      loadCRMData(crmService);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Chance konnte nicht erstellt werden',
        variant: 'destructive'
      });
    }
  };

  const handleViewAccount = (account: CRMAccount) => {
    setSelectedAccount(account);
    setEditAccountData(account);
    setIsEditingAccount(false);
    setShowAccountDetails(true);
  };

  const handleSaveAccountEdit = async () => {
    if (!crmService || !selectedAccount) return;
    
    try {
      await crmService.updateAccount(selectedAccount.id, editAccountData as any);
      toast({
        title: 'Erfolg',
        description: 'Konto wurde aktualisiert'
      });
      setIsEditingAccount(false);
      setSelectedAccount({ ...selectedAccount, ...editAccountData });
      await loadCRMData(crmService);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Konto konnte nicht aktualisiert werden',
        variant: 'destructive'
      });
    }
  };

  const handleBusinessCardFieldsDetected = (data: any) => {
    const { fields, confidence, needs_review } = data;
    
    if (needs_review) {
      // Show review dialog for manual correction
      setBusinessCardDetectedFields(fields);
      setBusinessCardConfidence(confidence);
      setShowBusinessCardReview(true);
    } else {
      // Auto-apply with high confidence
      applyBusinessCardFields(fields);
    }
  };

  const applyBusinessCardFields = (fields: any) => {
    // Map detected fields to account data
    const updates: Partial<CRMAccount> = {};
    
    if (fields.company) updates.name = fields.company;
    if (fields.contact?.fullName) updates.contactName = fields.contact.fullName;
    if (fields.email) updates.contactEmail = fields.email;
    if (fields.phones?.length > 0) {
      const workPhone = fields.phones.find((p: any) => p.type === 'work');
      const mobilePhone = fields.phones.find((p: any) => p.type === 'mobile');
      updates.contactPhone = workPhone?.number || mobilePhone?.number || fields.phones[0].number;
    }
    if (fields.extras?.note) {
      updates.notes = (editAccountData.notes || '') + '\n\n[Visitenkarte]\n' + fields.extras.note;
    }

    // Apply to edit data and switch to edit mode
    setEditAccountData({ ...editAccountData, ...updates });
    setIsEditingAccount(true);
    
    toast({
      title: 'Visitenkarte erfolgreich gescannt',
      description: 'Felder wurden automatisch befüllt. Bitte überprüfen und speichern.',
    });
  };

  const handleReviewedFieldsApply = (reviewedFields: any) => {
    // Map reviewed fields from the dialog
    const updates: Partial<CRMAccount> = {};
    
    if (reviewedFields.company) updates.name = reviewedFields.company;
    if (reviewedFields.contactName) updates.contactName = reviewedFields.contactName;
    if (reviewedFields.contactEmail) updates.contactEmail = reviewedFields.contactEmail;
    if (reviewedFields.contactPhone) updates.contactPhone = reviewedFields.contactPhone;
    if (reviewedFields.notes) {
      updates.notes = (editAccountData.notes || '') + '\n\n[Visitenkarte]\n' + reviewedFields.notes;
    }

    // Apply to edit data and switch to edit mode
    setEditAccountData({ ...editAccountData, ...updates });
    setIsEditingAccount(true);
    
    toast({
      title: 'Felder übernommen',
      description: 'Die geprüften Felder wurden übernommen. Bitte speichern Sie die Änderungen.',
    });
  };

  const handleViewOpportunity = (opportunity: CRMOpportunity) => {
    setSelectedOpportunity(opportunity);
    setShowOpportunityDetails(true);
  };

  const getStageBadge = (stage: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'new': 'secondary',
      'qualified': 'default',
      'site-visit': 'default',
      'quotation-sent': 'default',
      'negotiation': 'default',
      'won': 'default',
      'lost': 'destructive'
    };

    const labels: Record<string, string> = {
      'new': 'Neu',
      'qualified': 'Qualifiziert',
      'site-visit': 'Vor-Ort-Termin',
      'quotation-sent': 'Angebot gesendet',
      'negotiation': 'Verhandlung',
      'won': 'Gewonnen',
      'lost': 'Verloren'
    };

    return (
      <Badge variant={variants[stage] || 'default'}>
        {labels[stage] || stage}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const variants: Record<string, 'default' | 'secondary'> = {
      'referral': 'default',
      'web': 'secondary',
      'phone': 'default',
      'other': 'secondary'
    };

    const labels: Record<string, string> = {
      'referral': 'Empfehlung',
      'web': 'Web',
      'phone': 'Telefon',
      'other': 'Sonstiges'
    };

    return (
      <Badge variant={variants[source] || 'default'}>
        {labels[source] || source}
      </Badge>
    );
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.accountId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'all' || opp.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof CRMOpportunity) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof CRMOpportunity) => {
    if (sortField !== field) return <ArrowUpDown className="h-5 w-5" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStage('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="CRM" 
          showBackButton={!!onBack}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Lade CRM-Daten...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="👥 CRM" 
        showBackButton={!!onBack}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowImport(true)}
            className="border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            📥 CSV Import
          </Button>
          <Button 
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105" 
            size="sm" 
            onClick={() => setShowNewAccountDialog(true)}
          >
            ✨ Konto anlegen
          </Button>
        </div>
      </AppHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Konten
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.totalAccounts}</div>
                <p className="text-xs text-white/80">Gesamt</p>
              </CardContent>
            </Card>

            <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Chancen
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.totalOpportunities}</div>
                <p className="text-xs text-white/80">Aktiv</p>
              </CardContent>
            </Card>

            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Volumen
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">€{stats.totalValue.toLocaleString()}</div>
                <p className="text-xs text-white/80">Alle Chancen</p>
              </CardContent>
            </Card>

            <Card className="tradetrackr-card bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Gewonnen
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">€{stats.wonValue.toLocaleString()}</div>
                <p className="text-xs text-white/80">Konvertiert</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-gray-100 to-gray-200 p-1 rounded-lg shadow-md">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              📊 Übersicht
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              🏢 Konten
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              🎯 Chancen
            </TabsTrigger>
            <TabsTrigger value="quotes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold transition-all">
              💼 Angebote
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Opportunities */}
              <Card className="tradetrackr-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Target className="h-5 w-5 mr-2 text-[#058bc0]" />
                      Neueste Chancen
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('opportunities')}
                    >
                      Alle anzeigen
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunities.slice(0, 5).map((opp) => (
                    <div key={opp.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900">{opp.title}</p>
                        <p className="text-sm text-gray-500">€{opp.amountNet.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        {getStageBadge(opp.stage)}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(opp.expectedCloseDate).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Accounts */}
              <Card className="tradetrackr-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Building2 className="h-5 w-5 mr-2 text-[#058bc0]" />
                      Neueste Konten
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('accounts')}
                    >
                      Alle anzeigen
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accounts.slice(0, 5).map((account) => (
                    <div key={account.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900">{account.name}</p>
                        <p className="text-sm text-gray-500">{account.legalForm}</p>
                      </div>
                      <div className="text-right">
                        {getSourceBadge(account.source)}
                        <p className="text-xs text-gray-500 mt-1">
                          {account.stats.totalProjects} Projekte
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 pt-4 pb-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    🏢 Konten
                    <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                      {accounts.length}
                    </Badge>
                  </div>
                  {canCreateCRM && (
                    <Button
                      onClick={() => setShowNewAccountDialog(true)}
                      className="bg-white text-[#058bc0] hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Neues Konto
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              {/* Fixed Table Header */}
              <div className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] border-b-2 border-[#047ba8] flex-shrink-0">
                <table className="w-full table-fixed">
                  <thead>
                    <tr>
                      <th className="text-left px-6 py-4 font-bold text-white text-base w-[35%]">🏢 Name</th>
                      <th className="text-left px-6 py-4 font-bold text-white text-base w-[20%]">📋 Rechtsform</th>
                      <th className="text-left px-6 py-4 font-bold text-white text-base w-[20%]">🔗 Quelle</th>
                      <th className="text-center px-6 py-4 font-bold text-white text-base w-[12%]">📁 Projekte</th>
                      <th className="text-right px-6 py-4 font-bold text-white text-base w-[13%]">💰 Wert</th>
                    </tr>
                  </thead>
                </table>
              </div>
              {/* Scrollable Table Body */}
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 550px)' }}>
                <table className="w-full table-fixed">
                  <tbody>
                      {accounts.map((account) => (
                        <tr 
                          key={account.id}
                          onClick={() => handleViewAccount(account)}
                          className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all border-b border-gray-200 hover:shadow-md"
                        >
                          <td className="font-bold text-gray-900 px-6 py-4 text-base w-[35%] border-r border-gray-200">{account.name}</td>
                          <td className="font-medium text-gray-700 px-6 py-4 w-[20%] border-r border-gray-200">{account.legalForm || '-'}</td>
                          <td className="px-6 py-4 w-[20%] border-r border-gray-200">{getSourceBadge(account.source)}</td>
                          <td className="font-semibold text-blue-600 px-6 py-4 text-center w-[12%] border-r border-gray-200">{account.stats.totalProjects}</td>
                          <td className="font-bold text-green-600 px-6 py-4 text-right w-[13%]">€{account.stats.lifetimeValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </Card>
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-6">
            {/* Search and Filter Card */}
            <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                    <Input
                      placeholder="Chancen durchsuchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                    />
                  </div>
                  <div className="relative w-64">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🏷️</div>
                    <Select value={filterStage} onValueChange={setFilterStage}>
                      <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                        <SelectValue placeholder="Stage filtern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🎯 Alle Stages</SelectItem>
                        <SelectItem value="new">🆕 Neu</SelectItem>
                        <SelectItem value="qualified">✅ Qualifiziert</SelectItem>
                        <SelectItem value="site-visit">🏗️ Vor-Ort-Termin</SelectItem>
                        <SelectItem value="quotation-sent">📤 Angebot gesendet</SelectItem>
                        <SelectItem value="negotiation">💼 Verhandlung</SelectItem>
                      <SelectItem value="won">🏆 Gewonnen</SelectItem>
                      <SelectItem value="lost">❌ Verloren</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opportunities Table */}
            <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 pt-4 pb-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    🎯 Chancen
                    <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                      {opportunities.length}
                    </Badge>
                  </div>
                  {canCreateCRM && (
                    <Button
                      onClick={() => setShowNewOpportunityDialog(true)}
                      className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Neue Chance
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              {/* Fixed Table Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300 flex-shrink-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('title')} className="text-left px-4 py-3 font-bold text-gray-700 cursor-pointer hover:bg-gray-300 transition-colors">
                        <div className="flex items-center gap-2">
                          📝 Titel {getSortIcon('title')}
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">🏢 Konto</th>
                      <th onClick={() => handleSort('stage')} className="text-left px-4 py-3 font-bold text-gray-700 cursor-pointer hover:bg-gray-300 transition-colors">
                        <div className="flex items-center gap-2">
                          🏷️ Stage {getSortIcon('stage')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('amountNet')} className="text-left px-4 py-3 font-bold text-gray-700 cursor-pointer hover:bg-gray-300 transition-colors">
                        <div className="flex items-center gap-2">
                          💰 Betrag {getSortIcon('amountNet')}
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">📊 Wahrscheinlichkeit</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">🎯 Nächste Aktion</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-700">⚙️ Aktionen</th>
                    </tr>
                  </thead>
                </table>
              </div>
              {/* Scrollable Table Body */}
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 650px)' }}>
                <Table>
                  <TableHeader className="invisible">
                    <TableRow>
                      <TableHead>Titel</TableHead>
                      <TableHead>Konto</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Wahrscheinlichkeit</TableHead>
                      <TableHead>Nächste Aktion</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {sortedOpportunities.map((opp) => (
                        <TableRow key={opp.id}>
                          <TableCell className="font-medium">{opp.title}</TableCell>
                          <TableCell>
                            {accounts.find(acc => acc.id === opp.accountId)?.name || opp.accountId}
                          </TableCell>
                          <TableCell>{getStageBadge(opp.stage)}</TableCell>
                          <TableCell>€{opp.amountNet.toLocaleString()}</TableCell>
                          <TableCell>{opp.probability}%</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{opp.nextAction.type}</p>
                              <p className="text-gray-500">
                                {new Date(opp.nextAction.dueAt).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewOpportunity(opp)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEditCRM && (
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="space-y-6">
            <Card className="tradetrackr-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-[#058bc0]" />
                    Angebote ({quotes.length})
                  </span>
                  {canCreateCRM && (
                    <Button
                      onClick={() => setShowNewQuoteDialog(true)}
                      className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Neues Angebot
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Angebote werden hier angezeigt...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Account Dialog */}
        <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
              {/* Animated background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              
              <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                  🏢
                </div>
                <div className="flex-1">
                  Neues Konto erstellen
                  <div className="text-xs font-normal text-white/80 mt-1">
                    Erstellen Sie ein neues Kundenkonto
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 pt-4">
              <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">ℹ️</span>
                    Grundinformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accountName" className="font-semibold text-gray-900">Firmenname *</Label>
                      <Input
                        id="accountName"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                        required
                        className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="legalForm" className="font-semibold text-gray-900">Rechtsform</Label>
                      <Input
                        id="legalForm"
                        value={newAccount.legalForm}
                        onChange={(e) => setNewAccount({ ...newAccount, legalForm: e.target.value })}
                        className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vatId" className="font-semibold text-gray-900">USt-ID</Label>
                      <Input
                        id="vatId"
                        value={newAccount.vatId}
                        onChange={(e) => setNewAccount({ ...newAccount, vatId: e.target.value })}
                        className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingEmail" className="font-semibold text-gray-900">Rechnungs-E-Mail</Label>
                      <Input
                        id="billingEmail"
                        type="email"
                        value={newAccount.billingEmail}
                        onChange={(e) => setNewAccount({ ...newAccount, billingEmail: e.target.value })}
                        className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">👤</span>
                    Kontaktdetails
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="contactName" className="font-semibold text-gray-900">Ansprechpartner</Label>
                    <Input
                      id="contactName"
                      value={newAccount.contactName}
                      onChange={(e) => setNewAccount({ ...newAccount, contactName: e.target.value })}
                      placeholder="Name des Ansprechpartners"
                      className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactEmail" className="font-semibold text-gray-900">E-Mail</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={newAccount.contactEmail}
                        onChange={(e) => setNewAccount({ ...newAccount, contactEmail: e.target.value })}
                        placeholder="email@example.com"
                        className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone" className="font-semibold text-gray-900">Telefon</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={newAccount.contactPhone}
                        onChange={(e) => setNewAccount({ ...newAccount, contactPhone: e.target.value })}
                        placeholder="+49 123 456789"
                        className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-100 via-orange-50 to-white border-3 border-orange-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">📝</span>
                    Notizen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="accountNotes" className="font-semibold text-gray-900">Notizen</Label>
                  <Textarea
                    id="accountNotes"
                    value={newAccount.notes}
                    onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })}
                    placeholder="Zusätzliche Informationen über das Konto..."
                    rows={4}
                    className="mt-2 bg-white border-2 border-orange-300 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/30 font-semibold"
                  />
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    Quelle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="source" className="font-semibold text-gray-900">Quelle</Label>
                  <Select value={newAccount.source} onValueChange={(value: any) => setNewAccount({ ...newAccount, source: value })}>
                    <SelectTrigger className="bg-white border-2 border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/30 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-2 border-purple-300">
                      <SelectItem value="web">🌐 Web</SelectItem>
                      <SelectItem value="phone">📞 Telefon</SelectItem>
                      <SelectItem value="referral">👥 Empfehlung</SelectItem>
                      <SelectItem value="other">📋 Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewAccountDialog(false)}
                  className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
                >
                  <span className="text-xl mr-2">❌</span> Abbrechen
                </Button>
                <Button 
                  onClick={handleCreateAccount}
                  disabled={!newAccount.name.trim()}
                  className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="text-xl mr-2">✨</span> Konto erstellen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Contact Dialog */}
        <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
              {/* Animated background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              
              <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                  👤
                </div>
                <div className="flex-1">
                  Neuen Kontakt erstellen
                  <div className="text-xs font-normal text-white/80 mt-1">
                    Erfassen Sie einen neuen Ansprechpartner
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 pt-4">
              <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">👤</span>
                    Persönliche Informationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="contactAccountId" className="font-semibold text-gray-900">Konto *</Label>
                    <Select value={newContact.accountId} onValueChange={(value) => setNewContact({ ...newContact, accountId: value })}>
                      <SelectTrigger className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11">
                        <SelectValue placeholder="Konto auswählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-blue-300">
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="font-semibold text-gray-900">Vorname *</Label>
                      <Input
                        id="firstName"
                        value={newContact.firstName}
                        onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                        required
                        className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="font-semibold text-gray-900">Nachname *</Label>
                      <Input
                        id="lastName"
                        value={newContact.lastName}
                        onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                        required
                        className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contactRole" className="font-semibold text-gray-900">Rolle</Label>
                    <Input
                      id="contactRole"
                      value={newContact.role}
                      onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                      placeholder="z.B. Geschäftsführer, Einkaufsleiter"
                      className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">📞</span>
                    Kontaktinformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="contactEmail" className="font-semibold text-gray-900">E-Mail *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={newContact.emails[0]}
                      onChange={(e) => setNewContact({ ...newContact, emails: [e.target.value] })}
                      required
                      className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone" className="font-semibold text-gray-900">Telefon</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={newContact.phones[0]}
                      onChange={(e) => setNewContact({ ...newContact, phones: [e.target.value] })}
                      className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredChannel" className="font-semibold text-gray-900">Bevorzugter Kanal</Label>
                    <Select value={newContact.preferredChannel} onValueChange={(value: any) => setNewContact({ ...newContact, preferredChannel: value })}>
                      <SelectTrigger className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-green-300">
                        <SelectItem value="email">📧 E-Mail</SelectItem>
                        <SelectItem value="phone">📞 Telefon</SelectItem>
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">📝</span>
                    Notizen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="contactNotes" className="font-semibold text-gray-900">Notizen</Label>
                  <Textarea
                    id="contactNotes"
                    value={newContact.notes || ''}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    placeholder="Zusätzliche Informationen über den Kontakt..."
                    rows={4}
                    className="bg-white border-2 border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/30 font-semibold"
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewContactDialog(false)}
                  className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
                >
                  <span className="text-xl mr-2">❌</span> Abbrechen
                </Button>
                <Button 
                  onClick={handleCreateContact}
                  className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
                  disabled={!newContact.accountId || !newContact.firstName || !newContact.lastName || !newContact.emails[0]}
                >
                  <span className="text-xl mr-2">✨</span> Kontakt erstellen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Opportunity Dialog */}
        <Dialog open={showNewOpportunityDialog} onOpenChange={setShowNewOpportunityDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
              {/* Animated background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              
              <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                  🎯
                </div>
                <div className="flex-1">
                  Neue Chance erstellen
                  <div className="text-xs font-normal text-white/80 mt-1">
                    Erfassen Sie eine neue Verkaufschance
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 pt-4">
              <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">📝</span>
                    Grundinformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="opportunityTitle" className="font-semibold text-gray-900">Titel *</Label>
                    <Input
                      id="opportunityTitle"
                      value={newOpportunity.title}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, title: e.target.value })}
                      placeholder="z.B. EV-Installation @ Müller"
                      required
                      className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold text-lg h-12"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accountId" className="font-semibold text-gray-900">Konto *</Label>
                      <Select value={newOpportunity.accountId} onValueChange={(value) => setNewOpportunity({ ...newOpportunity, accountId: value })}>
                        <SelectTrigger className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11">
                          <SelectValue placeholder="Konto auswählen" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-blue-300">
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stage" className="font-semibold text-gray-900">Stage</Label>
                      <Select value={newOpportunity.stage} onValueChange={(value: any) => setNewOpportunity({ ...newOpportunity, stage: value })}>
                        <SelectTrigger className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-blue-300">
                          <SelectItem value="new">🆕 Neu</SelectItem>
                          <SelectItem value="qualified">✅ Qualifiziert</SelectItem>
                          <SelectItem value="site-visit">📍 Vor-Ort-Termin</SelectItem>
                          <SelectItem value="quotation-sent">📧 Angebot gesendet</SelectItem>
                          <SelectItem value="negotiation">🤝 Verhandlung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">💰</span>
                    Finanzen & Wahrscheinlichkeit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amountNet" className="font-semibold text-gray-900">Betrag (Netto) *</Label>
                      <Input
                        id="amountNet"
                        type="number"
                        value={newOpportunity.amountNet}
                        onChange={(e) => setNewOpportunity({ ...newOpportunity, amountNet: parseFloat(e.target.value) || 0 })}
                        required
                        className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="probability" className="font-semibold text-gray-900">Wahrscheinlichkeit (%)</Label>
                      <Input
                        id="probability"
                        type="number"
                        min="0"
                        max="100"
                        value={newOpportunity.probability}
                        onChange={(e) => setNewOpportunity({ ...newOpportunity, probability: parseInt(e.target.value) || 0 })}
                        className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">📅</span>
                    Zeitplan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="expectedCloseDate" className="font-semibold text-gray-900">Erwartetes Abschlussdatum</Label>
                  <Input
                    id="expectedCloseDate"
                    type="date"
                    value={newOpportunity.expectedCloseDate.toISOString().split('T')[0]}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, expectedCloseDate: new Date(e.target.value) })}
                    className="bg-white border-2 border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/30 font-semibold h-11"
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewOpportunityDialog(false)}
                  className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
                >
                  <span className="text-xl mr-2">❌</span> Abbrechen
                </Button>
                <Button 
                  onClick={handleCreateOpportunity}
                  className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
                >
                  <span className="text-xl mr-2">✨</span> Chance erstellen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Account Details Dialog */}
        {showAccountDetails && selectedAccount && (
          <Dialog open={showAccountDetails} onOpenChange={setShowAccountDetails}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
              <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
                {/* Animated background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                
                <div className="flex items-center justify-between relative z-10">
                  <DialogTitle className="text-3xl font-bold flex items-center gap-4">
                    <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                      🏢
                    </div>
                    <div className="flex-1">
                      Konto Details
                      <div className="text-xs font-normal text-white/80 mt-1">
                        {selectedAccount.name}
                      </div>
                    </div>
                  </DialogTitle>
                  <div className="flex gap-2">
                    {isEditingAccount && (
                      <Button
                        onClick={() => {
                          setIsEditingAccount(false);
                          setEditAccountData(selectedAccount);
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 backdrop-blur-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Abbrechen
                      </Button>
                    )}
                    {/* Camera scan button */}
                    {(typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) && (
                      <Button
                        onClick={() => {
                          console.log('📷 Opening camera scanner...');
                          setShowBusinessCardScan(true);
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 backdrop-blur-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        📷 Scannen
                      </Button>
                    )}
                    {/* Upload button - always available */}
                    <Button
                      onClick={() => {
                        console.log('📤 Opening upload dialog...');
                        setShowBusinessCardUpload(true);
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 backdrop-blur-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      📤 Hochladen
                    </Button>
                    <Button
                      onClick={() => {
                        if (isEditingAccount) {
                          handleSaveAccountEdit();
                        } else {
                          setIsEditingAccount(true);
                        }
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 backdrop-blur-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      {isEditingAccount ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Speichern
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-3xl">ℹ️</span>
                      Grundinformationen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-gray-600">Firmenname</Label>
                        {isEditingAccount ? (
                          <Input
                            value={editAccountData.name || ''}
                            onChange={(e) => setEditAccountData({ ...editAccountData, name: e.target.value })}
                            className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                          />
                        ) : (
                          <p className="text-gray-900 font-bold text-lg">{selectedAccount.name}</p>
                        )}
                      </div>
                      <div>
                        <Label className="font-semibold text-gray-600">Rechtsform</Label>
                        {isEditingAccount ? (
                          <Input
                            value={editAccountData.legalForm || ''}
                            onChange={(e) => setEditAccountData({ ...editAccountData, legalForm: e.target.value })}
                            className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                          />
                        ) : (
                          <p className="text-gray-900 font-semibold">{selectedAccount.legalForm || '-'}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-gray-600">USt-ID</Label>
                        {isEditingAccount ? (
                          <Input
                            value={editAccountData.vatId || ''}
                            onChange={(e) => setEditAccountData({ ...editAccountData, vatId: e.target.value })}
                            className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                          />
                        ) : (
                          <p className="text-gray-900 font-semibold">{selectedAccount.vatId || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="font-semibold text-gray-600">Rechnungs-E-Mail</Label>
                        {isEditingAccount ? (
                          <Input
                            type="email"
                            value={editAccountData.billingEmail || ''}
                            onChange={(e) => setEditAccountData({ ...editAccountData, billingEmail: e.target.value })}
                            className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                          />
                        ) : (
                          <p className="text-gray-900 font-semibold">{selectedAccount.billingEmail || '-'}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="font-semibold text-gray-600">Quelle</Label>
                      <div className="mt-2">{getSourceBadge(selectedAccount.source)}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-3xl">👤</span>
                      Kontaktdetails
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="font-semibold text-gray-600">Ansprechpartner</Label>
                      {isEditingAccount ? (
                        <Input
                          value={editAccountData.contactName || ''}
                          onChange={(e) => setEditAccountData({ ...editAccountData, contactName: e.target.value })}
                          placeholder="Name des Ansprechpartners"
                          className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                        />
                      ) : (
                        <p className="text-gray-900 font-semibold">{selectedAccount.contactName || '-'}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-gray-600">E-Mail</Label>
                        {isEditingAccount ? (
                          <Input
                            type="email"
                            value={editAccountData.contactEmail || ''}
                            onChange={(e) => setEditAccountData({ ...editAccountData, contactEmail: e.target.value })}
                            placeholder="email@example.com"
                            className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                          />
                        ) : (
                          <p className="text-gray-900 font-semibold">{selectedAccount.contactEmail || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="font-semibold text-gray-600">Telefon</Label>
                        {isEditingAccount ? (
                          <Input
                            type="tel"
                            value={editAccountData.contactPhone || ''}
                            onChange={(e) => setEditAccountData({ ...editAccountData, contactPhone: e.target.value })}
                            placeholder="+49 123 456789"
                            className="bg-white border-2 border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 font-semibold"
                          />
                        ) : (
                          <p className="text-gray-900 font-semibold">{selectedAccount.contactPhone || '-'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-100 via-orange-50 to-white border-3 border-orange-300 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-3xl">📝</span>
                      Notizen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label className="font-semibold text-gray-600">Notizen</Label>
                    {isEditingAccount ? (
                      <Textarea
                        value={editAccountData.notes || ''}
                        onChange={(e) => setEditAccountData({ ...editAccountData, notes: e.target.value })}
                        placeholder="Zusätzliche Informationen über das Konto..."
                        rows={4}
                        className="mt-2 bg-white border-2 border-orange-300 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/30 font-semibold"
                      />
                    ) : (
                      <p className="mt-2 text-gray-900 font-medium whitespace-pre-wrap">{selectedAccount.notes || '-'}</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-3xl">⚡</span>
                      Aktionen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowQuickQuote(true)}
                        className="bg-green-500 hover:bg-green-600 text-white border-0 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        📝 Schnellangebot erstellen
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={async () => { await loadTimeline(selectedAccount); }}
                        className="bg-blue-500 hover:bg-blue-600 text-white border-0 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        📅 Timeline laden
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleGdprExport(selectedAccount)}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        📥 Daten exportieren (GDPR)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Timeline */}
                {timeline.length > 0 && (
                  <Card className="bg-gradient-to-br from-orange-100 via-orange-50 to-white border-3 border-orange-300 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-3xl">📊</span>
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="max-h-64 overflow-auto space-y-2">
                        {timeline.map(item => (
                          <li key={`${item.type}-${item.id}`} className="p-2 bg-white rounded border border-orange-200 hover:bg-orange-50 transition-colors">
                            <Badge variant="outline" className="mr-2 font-semibold">{item.type}</Badge>
                            <span className="font-medium">{item.number || item.title || item.id}</span>
                            {item.state && <span className="text-gray-600"> · {item.state}</span>}
                            {item.issueDate && <span className="text-gray-500"> · {item.issueDate}</span>}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                <div className="pt-6 border-t-2 border-gray-300">
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Daten löschen oder anonymisieren
                    </h4>
                    <p className="text-sm text-red-800 mb-4">
                      Wählen Sie, wie Sie mit den Kontodaten verfahren möchten:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => handleDeleteAccount(selectedAccount, 'anonymize')}
                        className="bg-orange-500 hover:bg-orange-600 text-white border-0 font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        GDPR Anonymisieren
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleDeleteAccount(selectedAccount, 'delete')}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Komplett löschen
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAccountDetails(false)}
                      className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
                    >
                      <span className="text-xl mr-2">❌</span> Schließen
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Business Card Scan Modal */}
        {showBusinessCardScan && selectedAccount && (
          <BusinessCardScanModal
            open={showBusinessCardScan}
            onClose={() => setShowBusinessCardScan(false)}
            onFieldsDetected={handleBusinessCardFieldsDetected}
            accountId={selectedAccount.id}
          />
        )}

        {/* Business Card Upload Modal */}
        {showBusinessCardUpload && selectedAccount && (
          <BusinessCardUploadModal
            open={showBusinessCardUpload}
            onClose={() => setShowBusinessCardUpload(false)}
            onFieldsDetected={handleBusinessCardFieldsDetected}
            accountId={selectedAccount.id}
          />
        )}

        {/* Business Card Review Dialog */}
        {showBusinessCardReview && (
          <BusinessCardReviewDialog
            open={showBusinessCardReview}
            onClose={() => setShowBusinessCardReview(false)}
            onApply={handleReviewedFieldsApply}
            detectedFields={businessCardDetectedFields}
            confidence={businessCardConfidence}
          />
        )}

        {/* Quick Quote Dialog */}
        {showQuickQuote && selectedAccount && (
          <Dialog open={showQuickQuote} onOpenChange={setShowQuickQuote}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
              <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
                {/* Animated background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                
                <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                  <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                    📝
                  </div>
                  <div className="flex-1">
                    Schnellangebot für {selectedAccount.name}
                    <div className="text-xs font-normal text-white/80 mt-1">
                      Erstellt ein Angebot im Invoicing-Modul
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="pt-4">
                <OfferEditor 
                  presetClientId={selectedAccount.id}
                  onCreated={() => setShowQuickQuote(false)}
                  onCancel={() => setShowQuickQuote(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Import CSV */}
        {showImport && (
          <CRMImportModal 
            open={showImport}
            onOpenChange={setShowImport}
            onImport={handleImportCSV}
            existingAccounts={accounts}
            onLoadExisting={async () => {
              if (!crmService) return [];
              return await crmService.getAccounts();
            }}
            onMergeAccount={handleMergeAccount}
          />
        )}

        {/* Opportunity Details Dialog */}
        {showOpportunityDetails && selectedOpportunity && (
          <Dialog open={showOpportunityDetails} onOpenChange={setShowOpportunityDetails}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Chance Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Titel</Label>
                  <p className="text-gray-900 font-medium">{selectedOpportunity.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Konto</Label>
                    <p className="text-gray-900">
                      {accounts.find(acc => acc.id === selectedOpportunity.accountId)?.name || selectedOpportunity.accountId}
                    </p>
                  </div>
                  <div>
                    <Label>Stage</Label>
                    <div className="mt-1">{getStageBadge(selectedOpportunity.stage)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Betrag (Netto)</Label>
                    <p className="text-gray-900">€{selectedOpportunity.amountNet.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Wahrscheinlichkeit</Label>
                    <p className="text-gray-900">{selectedOpportunity.probability}%</p>
                  </div>
                </div>
                <div>
                  <Label>Nächste Aktion</Label>
                  <div className="mt-1">
                    <p className="text-gray-900 font-medium">{selectedOpportunity.nextAction.type}</p>
                    <p className="text-gray-500">
                      {new Date(selectedOpportunity.nextAction.dueAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowOpportunityDetails(false)}>
                    Schließen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* New Quote/Offer Dialog */}
        <Dialog open={showNewQuoteDialog} onOpenChange={setShowNewQuoteDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
              {/* Animated background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              
              <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                  📝
                </div>
                <div className="flex-1">
                  Neues Angebot erstellen
                  <div className="text-xs font-normal text-white/80 mt-1">
                    Erstellen Sie ein neues Angebot für einen Kunden
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="pt-4">
              <OfferEditor 
                onCreated={async () => {
                  setShowNewQuoteDialog(false);
                  toast({
                    title: "✅ Erfolg",
                    description: "Angebot wurde erfolgreich erstellt",
                  });
                  // Reload quotes
                  await loadData();
                }}
                onCancel={() => setShowNewQuoteDialog(false)}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Action Sidebar - removed, using DesktopSidebar instead */}
      </div>
    </div>
  );
};

export default CRM;
