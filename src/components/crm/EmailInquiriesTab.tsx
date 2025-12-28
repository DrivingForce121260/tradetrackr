/**
 * E-Mail-Anfragen Tab für CRM
 * 
 * Zeigt email-derived CRM Companies und deren Notes.
 * Ermöglicht Aktionen wie "Als Anfrage anlegen" und "Projekt verknüpfen".
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
  createProcurementRequestFromInquiry,
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
import { canWriteCrm, getCrmPermissionTooltip } from '@/utils/permissions';
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
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface EmailInquiriesTabProps {
  onNavigateToProcurement?: (filter?: { requestId?: string }) => void;
  onNavigateToProject?: (projectId: string) => void;
}

const EmailInquiriesTab: React.FC<EmailInquiriesTabProps> = ({
  onNavigateToProcurement,
  onNavigateToProject,
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
  
  // Procurement request creation state
  const [createRequestDialogOpen, setCreateRequestDialogOpen] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestProjectId, setRequestProjectId] = useState<string>('');
  const [inquiryForRequest, setInquiryForRequest] = useState<EmailInquiry | null>(null);
  
  // Permission check
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
  
  // Filter inquiries by search
  const filteredInquiries = inquiries.filter((inquiry) => {
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
      console.error('[CRM] Error loading projects:', error);
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
      console.error('[CRM] Error linking project:', error);
      toast({
        title: 'Fehler',
        description: 'Projekt konnte nicht verknüpft werden.',
        variant: 'destructive',
      });
    } finally {
      setLinkingProject(false);
    }
  };

  // Open create request dialog
  const handleOpenCreateRequestDialog = (inquiry: EmailInquiry) => {
    if (!hasWritePermission) {
      toast({
        title: 'Keine Berechtigung',
        description: permissionTooltip || 'Sie haben keine Berechtigung für diese Aktion.',
        variant: 'destructive',
      });
      return;
    }
    
    // If already has a linked procurement request, navigate to it
    if (inquiry.linkedProcurementRequestId) {
      toast({
        title: 'Anfrage existiert bereits',
        description: 'Diese E-Mail wurde bereits als Anfrage angelegt.',
      });
      if (onNavigateToProcurement) {
        onNavigateToProcurement({ requestId: inquiry.linkedProcurementRequestId });
      }
      return;
    }
    
    setInquiryForRequest(inquiry);
    setRequestTitle(inquiry.subject || inquiry.title || '');
    setRequestProjectId(inquiry.linkedProjectId || '');
    setCreateRequestDialogOpen(true);
    loadProjects();
  };

  // Handle create procurement request
  const handleCreateProcurementRequest = async () => {
    if (!concernId || !inquiryForRequest) return;
    
    setCreatingRequest(true);
    try {
      const selectedProject = requestProjectId ? projects.find(p => p.id === requestProjectId) : null;
      
      const result = await createProcurementRequestFromInquiry(
        concernId,
        inquiryForRequest.id,
        {
          title: requestTitle || undefined,
          projectId: selectedProject?.id,
          projectNumber: selectedProject?.projectNumber,
        }
      );
      
      if (result.alreadyExists) {
        toast({
          title: 'Anfrage existiert bereits',
          description: 'Diese E-Mail wurde bereits als Anfrage angelegt.',
        });
      } else {
        toast({
          title: 'Anfrage erstellt',
          description: 'Die Beschaffungsanfrage wurde erfolgreich erstellt.',
        });
      }
      
      setCreateRequestDialogOpen(false);
      setInquiryForRequest(null);
      setRequestTitle('');
      setRequestProjectId('');
      
      // Navigate to procurement
      if (onNavigateToProcurement) {
        onNavigateToProcurement({ requestId: result.requestId });
      }
    } catch (error: any) {
      console.error('[CRM] Error creating procurement request:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Anfrage konnte nicht erstellt werden',
        variant: 'destructive',
      });
    } finally {
      setCreatingRequest(false);
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
              Keine E-Mail-Anfragen gefunden
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Sobald E-Mails als Produkt- oder Dienstleistungsanfragen erkannt werden, 
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
                Automatisch erkannte Produkt- und Dienstleistungsanfragen aus E-Mails
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
              Unternehmen ({companies.length})
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
              <span className="ml-3 text-gray-600">Lade E-Mail-Anfragen...</span>
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
                          
                          {/* Create Request - show if not already created */}
                          {inquiry.linkedProcurementRequestId ? (
                            <Badge 
                              variant="secondary" 
                              className="cursor-pointer bg-blue-100 text-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onNavigateToProcurement) {
                                  onNavigateToProcurement({ requestId: inquiry.linkedProcurementRequestId });
                                }
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Anfrage
                            </Badge>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-[#058bc0] hover:bg-[#0470a0]"
                              disabled={!hasWritePermission}
                              title={permissionTooltip}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCreateRequestDialog(inquiry);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Anfrage
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
                  <TableHead className="font-semibold">Firma</TableHead>
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
                      Keine Unternehmen gefunden
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateRequest(company);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Anfrage
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
                  Unternehmensdaten
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
                    Wechseln Sie zur Ansicht "Anfragen", um Aktionen wie "Als Anfrage anlegen" oder "Projekt verknüpfen" durchzuführen.
                  </span>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Notes Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                  E-Mail-Notizen ({companyNotes.length})
                </h4>

                {notesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#058bc0]" />
                  </div>
                ) : companyNotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Keine Notizen vorhanden</p>
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

                          {/* Extracted Data */}
                          {note.ai.extracted && Object.keys(note.ai.extracted).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex flex-wrap gap-2">
                                {note.ai.extracted.projectNumber && (
                                  <Badge variant="secondary" className="text-xs">
                                    Projekt: {note.ai.extracted.projectNumber}
                                  </Badge>
                                )}
                                {note.ai.extracted.requestNumber && (
                                  <Badge variant="secondary" className="text-xs">
                                    Anfrage: {note.ai.extracted.requestNumber}
                                  </Badge>
                                )}
                                {note.ai.extracted.keywords?.slice(0, 3).map((kw, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {kw}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
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

      {/* Create Procurement Request Dialog */}
      <Dialog open={createRequestDialogOpen} onOpenChange={setCreateRequestDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#058bc0]" />
              Anfrage aus E-Mail erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie eine Beschaffungsanfrage basierend auf dieser E-Mail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="request-title">Titel</Label>
              <Input
                id="request-title"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                placeholder="Titel der Anfrage..."
              />
            </div>
            
            {/* Sender Info (readonly) */}
            {inquiryForRequest && (
              <div className="space-y-2">
                <Label>Absender</Label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium">{inquiryForRequest.companyName || 'Unbekannt'}</div>
                  <div className="text-gray-500">{inquiryForRequest.senderEmail}</div>
                </div>
              </div>
            )}
            
            {/* Optional Project */}
            <div className="space-y-2">
              <Label htmlFor="request-project">Projekt (optional)</Label>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#058bc0]" />
                </div>
              ) : (
                <Select 
                  value={requestProjectId || '__none__'} 
                  onValueChange={(val) => setRequestProjectId(val === '__none__' ? '' : val)}
                >
                  <SelectTrigger id="request-project">
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
              onClick={() => setCreateRequestDialogOpen(false)}
              disabled={creatingRequest}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateProcurementRequest}
              disabled={creatingRequest}
              className="bg-[#058bc0] hover:bg-[#0470a0]"
            >
              {creatingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Anfrage erstellen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailInquiriesTab;

