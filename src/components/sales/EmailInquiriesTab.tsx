/**
 * E-Mail-Anfragen Tab für Sales Portal (Angebote/Aufträge/Rechnungen)
 * 
 * Zeigt Kundenanfragen aus E-Mails.
 * Ermöglicht Konvertierung zu Angeboten und Projekt-Verknüpfung.
 * 
 * WICHTIG: Dies ist für KUNDENANFRAGEN (eingehende Verkaufsanfragen).
 * LIEFERANTENANGEBOTE werden weiterhin im Beschaffungsbereich verarbeitet.
 * 
 * German UI throughout.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  subscribeToEmailDerivedCompanies,
  subscribeToCompanyNotes,
  subscribeToEmailInquiries,
  updateEmailInquiryStatus,
  linkEmailInquiryToProject,
  createSalesOfferFromEmailInquiry,
} from '@/services/crmService';
import { 
  CRMEmailCompany, 
  CRMEmailNote, 
  EmailInquiry,
  CRM_EMAIL_NOTE_TYPE_LABELS,
  EMAIL_INQUIRY_STATUS_LABELS,
  EMAIL_INQUIRY_STATUS_COLORS,
  EmailInquiryStatus,
} from '@/types/crm';
import { canConvertSalesInquiry, getSalesConversionTooltip, canWriteCrm, getCrmPermissionTooltip } from '@/utils/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Building2,
  Globe,
  Clock,
  Hash,
  Search,
  Eye,
  FileText,
  Link2,
  Loader2,
  Inbox,
  Sparkles,
  ExternalLink,
  User,
  CalendarDays,
  Brain,
  FolderKanban,
  Check,
  AlertCircle,
  PenLine,
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface SalesEmailInquiriesTabProps {
  /** Navigate to offer detail/editor after conversion */
  onNavigateToOffer?: (offerId: string) => void | Promise<void>;
  /** Navigate to project detail */
  onNavigateToProject?: (projectId: string) => void;
  /** Callback to refresh offers list and switch to offers tab in parent */
  onOfferCreated?: () => void | Promise<void>;
}

const SalesEmailInquiriesTab: React.FC<SalesEmailInquiriesTabProps> = ({
  onNavigateToOffer,
  onNavigateToProject,
  onOfferCreated,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernId = user?.concernID || user?.ConcernID;
  const ownerUid = user?.uid;

  // State
  const [companies, setCompanies] = useState<CRMEmailCompany[]>([]);
  const [inquiries, setInquiries] = useState<EmailInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'companies' | 'inquiries'>('inquiries');
  
  // Detail panel state
  const [selectedCompany, setSelectedCompany] = useState<CRMEmailCompany | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<EmailInquiry | null>(null);
  const [companyNotes, setCompanyNotes] = useState<CRMEmailNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Project linking state
  const [projectLinkDialogOpen, setProjectLinkDialogOpen] = useState(false);
  const [projects, setProjects] = useState<{ id: string; projectNumber: string; name: string }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linkingProject, setLinkingProject] = useState(false);
  const [inquiryToLink, setInquiryToLink] = useState<EmailInquiry | null>(null);
  
  // Offer creation state
  const [createOfferDialogOpen, setCreateOfferDialogOpen] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerProjectId, setOfferProjectId] = useState<string>('');
  const [inquiryForOffer, setInquiryForOffer] = useState<EmailInquiry | null>(null);
  
  // Permission check for sales conversion
  const canConvert = useMemo(() => canConvertSalesInquiry(user), [user]);
  const conversionTooltip = useMemo(() => getSalesConversionTooltip(user), [user]);
  // CRM write permission for project linking
  const hasWritePermission = useMemo(() => canWriteCrm(user), [user]);
  const permissionTooltip = useMemo(() => getCrmPermissionTooltip(user), [user]);

  // Load companies and inquiries
  useEffect(() => {
    if (!concernId || !ownerUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Subscribe to companies
    const unsubCompanies = subscribeToEmailDerivedCompanies(
      concernId,
      ownerUid,
      (fetchedCompanies) => {
        setCompanies(fetchedCompanies);
      }
    );
    
    // Subscribe to inquiries
    const unsubInquiries = subscribeToEmailInquiries(
      concernId,
      ownerUid,
      undefined, // no status filter
      (fetchedInquiries) => {
        setInquiries(fetchedInquiries);
        setLoading(false);
      }
    );

    return () => {
      unsubCompanies();
      unsubInquiries();
    };
  }, [concernId, ownerUid]);

  // Load notes when company selected
  useEffect(() => {
    if (!selectedCompany || !concernId || !ownerUid) {
      setCompanyNotes([]);
      return;
    }

    setNotesLoading(true);
    const unsubscribe = subscribeToCompanyNotes(
      concernId,
      ownerUid,
      selectedCompany.id,
      (notes) => {
        setCompanyNotes(notes);
        setNotesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedCompany, concernId, ownerUid]);

  // Filter companies by search
  const filteredCompanies = companies.filter((company) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(term) ||
      company.domain?.toLowerCase().includes(term) ||
      company.email?.toLowerCase().includes(term)
    );
  });
  
  // Filter inquiries by search AND exclude spam
  const filteredInquiries = inquiries.filter((inquiry) => {
    // Spam gate: never show spam inquiries
    const inq = inquiry as any; // Access pipeline fields if present
    if (inq.pipelineState === 'stopped_spam' || inq.isSpam === true) {
      return false;
    }
    
    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      inquiry.title.toLowerCase().includes(term) ||
      inquiry.companyName?.toLowerCase().includes(term) ||
      inquiry.senderEmail.toLowerCase().includes(term) ||
      inquiry.subject.toLowerCase().includes(term)
    );
  });

  // Format date helper
  const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDateShort = (date: Date | null): string => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  // Handle status update for inquiry
  const handleUpdateInquiryStatus = async (inquiry: EmailInquiry, newStatus: EmailInquiryStatus) => {
    if (!concernId || !ownerUid) return;
    
    try {
      await updateEmailInquiryStatus(concernId, ownerUid, inquiry.id, newStatus);
      toast({
        title: 'Status aktualisiert',
        description: `Anfrage ist jetzt "${EMAIL_INQUIRY_STATUS_LABELS[newStatus]}"`,
      });
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Status konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  // Load projects for linking
  const loadProjects = async () => {
    if (!concernId) return;
    
    setProjectsLoading(true);
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('concernID', '==', concernId)
      );
      const snapshot = await getDocs(projectsQuery);
      const projectList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          projectNumber: data.projectNumber || doc.id,
          name: data.projectName || data.name || data.customerName || 'Unbenannt',
        };
      });
      // Sort by projectNumber
      projectList.sort((a, b) => a.projectNumber.localeCompare(b.projectNumber));
      setProjects(projectList);
    } catch (error) {
      console.error('[Sales] Error loading projects:', error);
      toast({
        title: 'Fehler',
        description: 'Projekte konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setProjectsLoading(false);
    }
  };

  // Open project link dialog
  const handleOpenProjectLinkDialog = (inquiry: EmailInquiry) => {
    if (!hasWritePermission) {
      toast({
        title: 'Keine Berechtigung',
        description: permissionTooltip || 'Sie haben keine Berechtigung für diese Aktion.',
        variant: 'destructive',
      });
      return;
    }
    
    setInquiryToLink(inquiry);
    setSelectedProjectId(inquiry.linkedProjectId || '');
    setProjectLinkDialogOpen(true);
    loadProjects();
  };

  // Handle project linking
  const handleLinkProject = async () => {
    if (!concernId || !inquiryToLink || !selectedProjectId) return;
    
    setLinkingProject(true);
    try {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (!selectedProject) {
        throw new Error('Projekt nicht gefunden');
      }
      
      // Update emailInquiry (canonical source) and mirror to crmNote
      await linkEmailInquiryToProject(
        concernId,
        inquiryToLink.id,
        selectedProjectId,
        selectedProject.projectNumber
      );
      
      toast({
        title: 'Projekt verknüpft',
        description: `Anfrage wurde mit Projekt ${selectedProject.projectNumber} verknüpft.`,
      });
      
      setProjectLinkDialogOpen(false);
      setInquiryToLink(null);
      setSelectedProjectId('');
    } catch (error: any) {
      console.error('[Sales] Error linking project:', error);
      toast({
        title: 'Fehler',
        description: 'Projekt konnte nicht verknüpft werden.',
        variant: 'destructive',
      });
    } finally {
      setLinkingProject(false);
    }
  };

  // Open create offer dialog
  const handleOpenCreateOfferDialog = (inquiry: EmailInquiry) => {
    if (!canConvert) {
      toast({
        title: 'Keine Berechtigung',
        description: conversionTooltip || 'Sie haben keine Berechtigung für diese Aktion.',
        variant: 'destructive',
      });
      return;
    }
    
    // If already has a linked sales offer, navigate to it
    if (inquiry.linkedSalesOfferId) {
      toast({
        title: 'Angebot existiert bereits',
        description: `Angebot ${inquiry.linkedSalesOfferNumber || ''} wurde bereits erstellt.`,
      });
      if (onNavigateToOffer) {
        onNavigateToOffer(inquiry.linkedSalesOfferId);
      }
      return;
    }
    
    setInquiryForOffer(inquiry);
    setOfferTitle(inquiry.subject || inquiry.title || '');
    setOfferProjectId(inquiry.linkedProjectId || '');
    setCreateOfferDialogOpen(true);
    loadProjects();
  };

  // Handle create sales offer
  const handleCreateSalesOffer = async () => {
    if (!concernId || !inquiryForOffer) return;
    
    setCreatingOffer(true);
    try {
      const selectedProject = offerProjectId ? projects.find(p => p.id === offerProjectId) : null;
      
      const result = await createSalesOfferFromEmailInquiry(
        concernId,
        inquiryForOffer.id,
        {
          title: offerTitle || undefined,
          projectId: selectedProject?.id,
          projectNumber: selectedProject?.projectNumber,
        }
      );
      
      // Show appropriate toast
      if (result.alreadyExists) {
        toast({
          title: 'Angebot existiert bereits',
          description: `Angebot ${result.offerNumber} wurde bereits erstellt.`,
        });
      } else {
        toast({
          title: 'Angebot erstellt',
          description: `Angebot ${result.offerNumber} wurde erfolgreich erstellt.`,
        });
      }
      
      // Close dialog first
      setCreateOfferDialogOpen(false);
      setInquiryForOffer(null);
      setOfferTitle('');
      setOfferProjectId('');
      
      // Determine the offerId to navigate to (newly created or existing)
      const targetOfferId = result.offerId || (result.alreadyExists ? inquiryForOffer.linkedSalesOfferId : null);
      
      // Always refresh parent offers list first
      if (onOfferCreated) {
        await onOfferCreated();
      }
      
      // Navigate to offer editor if we have a valid offerId
      if (targetOfferId && onNavigateToOffer) {
        await onNavigateToOffer(targetOfferId);
      } else if (!targetOfferId) {
        // Fallback: show German toast if offerId is missing
        toast({
          title: 'Hinweis',
          description: 'Angebot wurde erstellt, aber konnte nicht geöffnet werden. Bitte aktualisieren.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('[Sales] Error creating sales offer:', error);
      
      // Map specific error messages to German UI text
      let errorTitle = 'Fehler';
      let errorDescription = 'Angebot konnte nicht erstellt werden.';
      
      const msg = error.message || error.code || '';
      if (msg.includes('permission') || msg.includes('Permission') || msg.includes('Berechtigung')) {
        errorTitle = 'Keine Berechtigung';
        errorDescription = 'Sie haben keine Berechtigung, Angebote zu erstellen.';
      } else if (msg.includes('spam') || msg.includes('Spam')) {
        errorTitle = 'Spam blockiert';
        errorDescription = 'Spam-E-Mails können nicht in Angebote konvertiert werden.';
      } else if (msg.includes('not-found') || msg.includes('nicht gefunden')) {
        errorDescription = 'Die E-Mail-Anfrage wurde nicht gefunden.';
      } else if (msg) {
        errorDescription = msg;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setCreatingOffer(false);
    }
  };

  // Open company detail
  const handleOpenDetail = (company: CRMEmailCompany) => {
    setSelectedCompany(company);
    setDetailOpen(true);
  };

  // Render empty state
  if (!loading && inquiries.length === 0 && companies.length === 0) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="py-16">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keine Kundenanfragen gefunden
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Sobald E-Mails von potenziellen Kunden als Anfragen erkannt werden, 
              erscheinen sie hier. Verbinden Sie ein E-Mail-Konto und synchronisieren Sie Ihre Nachrichten.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Stats
  const newInquiriesCount = inquiries.filter(i => i.status === 'new').length;
  const inReviewCount = inquiries.filter(i => i.status === 'in_review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-[#058bc0] shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5" />
                E-Mail-Anfragen (KI)
              </CardTitle>
              <CardDescription className="text-blue-100 mt-1">
                Automatisch erkannte Kundenanfragen aus E-Mails – Konvertieren Sie zu Angeboten
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {newInquiriesCount > 0 && (
                <Badge className="bg-yellow-500 text-white border-0">
                  {newInquiriesCount} Neu
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-0">
                {inquiries.length} Anfragen
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'inquiries' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('inquiries')}
              className={viewMode === 'inquiries' ? 'bg-[#058bc0] hover:bg-[#0470a0]' : ''}
            >
              <Mail className="h-4 w-4 mr-1" />
              Anfragen ({inquiries.length})
            </Button>
            <Button
              variant={viewMode === 'companies' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('companies')}
              className={viewMode === 'companies' ? 'bg-[#058bc0] hover:bg-[#0470a0]' : ''}
            >
              <Building2 className="h-4 w-4 mr-1" />
              Interessenten ({companies.length})
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={viewMode === 'inquiries' 
                ? "Suchen nach Betreff, Absender..."
                : "Suchen nach Firma, Domain oder E-Mail..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
              <span className="ml-3 text-gray-600">Lade Kundenanfragen...</span>
            </div>
          ) : viewMode === 'inquiries' ? (
            /* Inquiries Table */
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Betreff</TableHead>
                  <TableHead className="font-semibold">Absender</TableHead>
                  <TableHead className="font-semibold">Eingegangen</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">KI-Konfidenz</TableHead>
                  <TableHead className="font-semibold text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Keine Anfragen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInquiries.map((inquiry) => (
                    <TableRow 
                      key={inquiry.id}
                      className="hover:bg-blue-50/50 cursor-pointer"
                      onClick={() => {
                        setSelectedInquiry(inquiry);
                        // Find and open the company if available
                        if (inquiry.crmCompanyId) {
                          const company = companies.find(c => c.id === inquiry.crmCompanyId);
                          if (company) {
                            setSelectedCompany(company);
                            setDetailOpen(true);
                          }
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <span className="font-medium block">{inquiry.subject.substring(0, 50)}</span>
                            {inquiry.companyName && (
                              <span className="text-xs text-gray-500">{inquiry.companyName}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {inquiry.senderName && (
                            <span className="text-sm font-medium">{inquiry.senderName}</span>
                          )}
                          <span className="text-sm text-gray-500">{inquiry.senderEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatDate(inquiry.receivedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${EMAIL_INQUIRY_STATUS_COLORS[inquiry.status].bg} ${EMAIL_INQUIRY_STATUS_COLORS[inquiry.status].text} border-0`}
                        >
                          {EMAIL_INQUIRY_STATUS_LABELS[inquiry.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Brain className="h-3 w-3 text-purple-500" />
                          <span className="text-sm">{Math.round(inquiry.aiConfidence * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Status actions */}
                          {inquiry.status === 'new' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateInquiryStatus(inquiry, 'in_review');
                              }}
                            >
                              In Bearbeitung
                            </Button>
                          )}
                          
                          {/* Project Link - show if linked, otherwise show link button */}
                          {inquiry.linkedProjectId ? (
                            <Badge 
                              variant="secondary" 
                              className="cursor-pointer bg-green-100 text-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onNavigateToProject) onNavigateToProject(inquiry.linkedProjectId!);
                              }}
                            >
                              <FolderKanban className="h-3 w-3 mr-1" />
                              {inquiry.linkedProjectNumber || 'Projekt'}
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!hasWritePermission}
                              title={permissionTooltip}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProjectLinkDialog(inquiry);
                              }}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Create Offer - show if not already created */}
                          {inquiry.linkedSalesOfferId || inquiry.conversionState === 'converted' ? (
                            <div className="flex items-center gap-1">
                              <Badge 
                                variant="secondary" 
                                className="bg-green-100 text-green-700"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {inquiry.linkedSalesOfferNumber || 'Angebot'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#058bc0] hover:text-[#0470a0]"
                                title="Zum Angebot"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onNavigateToOffer && inquiry.linkedSalesOfferId) {
                                    onNavigateToOffer(inquiry.linkedSalesOfferId);
                                  }
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-[#058bc0] hover:bg-[#0470a0]"
                              disabled={!canConvert}
                              title={conversionTooltip}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCreateOfferDialog(inquiry);
                              }}
                            >
                              <PenLine className="h-4 w-4 mr-1" />
                              Angebot erstellen
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            /* Companies Table */
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Interessent</TableHead>
                  <TableHead className="font-semibold">Domain / E-Mail</TableHead>
                  <TableHead className="font-semibold">Letzte Anfrage</TableHead>
                  <TableHead className="font-semibold text-center">Anzahl</TableHead>
                  <TableHead className="font-semibold">Quelle</TableHead>
                  <TableHead className="font-semibold text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Keine Interessenten gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow 
                      key={company.id}
                      className="hover:bg-blue-50/50 cursor-pointer"
                      onClick={() => handleOpenDetail(company)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {company.domain && (
                            <div className="flex items-center gap-1 text-sm">
                              <Globe className="h-3 w-3 text-gray-400" />
                              {company.domain}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {company.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatDateShort(company.lastInquiryAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {company.inquiryCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          E-Mail (KI)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(company);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Company Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedCompany && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl">{selectedCompany.name}</SheetTitle>
                    <SheetDescription>
                      {selectedCompany.domain || selectedCompany.email || 'Kein Domain/E-Mail'}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Separator className="my-4" />

              {/* Company Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                  Interessenten-Daten
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedCompany.domain && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedCompany.domain}</span>
                    </div>
                  )}
                  {selectedCompany.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedCompany.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{selectedCompany.inquiryCount} Anfragen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Letzte: {formatDateShort(selectedCompany.lastInquiryAt)}</span>
                  </div>
                </div>

                {/* Actions Info */}
                <div className="flex items-center gap-2 pt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Wechseln Sie zur Ansicht "Anfragen", um Angebote zu erstellen oder Projekte zu verknüpfen.
                  </span>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Notes Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                  E-Mail-Verlauf ({companyNotes.length})
                </h4>

                {notesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#058bc0]" />
                  </div>
                ) : companyNotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Keine E-Mails vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companyNotes.map((note) => (
                      <Card key={note.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          {/* Note Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {CRM_EMAIL_NOTE_TYPE_LABELS[note.type] || note.type}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <CalendarDays className="h-3 w-3" />
                                {formatDate(note.receivedAt)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <Brain className="h-3 w-3 text-purple-500" />
                              <span className="text-purple-600">
                                {Math.round(note.ai.confidence * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Subject */}
                          <h5 className="font-medium text-sm mb-1">{note.subject}</h5>

                          {/* Sender */}
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                            <User className="h-3 w-3" />
                            {note.senderName ? `${note.senderName} <${note.senderEmail}>` : note.senderEmail}
                          </div>

                          {/* Body Preview */}
                          <div className="text-sm text-gray-600 bg-gray-50 rounded p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {note.body.substring(0, 500)}
                            {note.body.length > 500 && '...'}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Project Link Dialog */}
      <Dialog open={projectLinkDialogOpen} onOpenChange={setProjectLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-[#058bc0]" />
              Projekt verknüpfen
            </DialogTitle>
            <DialogDescription>
              Wählen Sie ein Projekt aus, um es mit dieser Anfrage zu verknüpfen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-select">Projekt</Label>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#058bc0]" />
                </div>
              ) : (
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project-select">
                    <SelectValue placeholder="Projekt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.id).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {inquiryToLink?.linkedProjectId && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                Diese Anfrage ist bereits mit einem Projekt verknüpft.
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProjectLinkDialogOpen(false)}
              disabled={linkingProject}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleLinkProject}
              disabled={!selectedProjectId || linkingProject}
              className="bg-[#058bc0] hover:bg-[#0470a0]"
            >
              {linkingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verknüpfe...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Verknüpfen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sales Offer Dialog */}
      <Dialog open={createOfferDialogOpen} onOpenChange={setCreateOfferDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-[#058bc0]" />
              Angebot aus Anfrage erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie ein Angebot basierend auf dieser Kundenanfrage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="offer-title">Titel / Betreff</Label>
              <Input
                id="offer-title"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="Titel des Angebots..."
              />
            </div>
            
            {/* Sender Info (readonly) */}
            {inquiryForOffer && (
              <div className="space-y-2">
                <Label>Kunde / Interessent</Label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium">{inquiryForOffer.companyName || 'Unbekannt'}</div>
                  <div className="text-gray-500">{inquiryForOffer.senderEmail}</div>
                </div>
              </div>
            )}
            
            {/* Optional Project */}
            <div className="space-y-2">
              <Label htmlFor="offer-project">Projekt (optional)</Label>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#058bc0]" />
                </div>
              ) : (
                <Select 
                  value={offerProjectId || '__none__'} 
                  onValueChange={(val) => setOfferProjectId(val === '__none__' ? '' : val)}
                >
                  <SelectTrigger id="offer-project">
                    <SelectValue placeholder="Kein Projekt ausgewählt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Kein Projekt</SelectItem>
                    {projects.filter(p => p.id).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOfferDialogOpen(false)}
              disabled={creatingOffer}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateSalesOffer}
              disabled={creatingOffer}
              className="bg-[#058bc0] hover:bg-[#0470a0]"
            >
              {creatingOffer ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4 mr-2" />
                  Angebot erstellen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesEmailInquiriesTab;

