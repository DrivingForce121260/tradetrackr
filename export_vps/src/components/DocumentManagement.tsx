import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Table as TableIcon,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Plus,
  RefreshCw,
  SortAsc,
  SortDesc,
  FolderOpen,
  CheckSquare,
  BarChart3,
  Building2,
  Package,
  ClipboardList,
  Users,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import AppHeader from './AppHeader';
import { documentService, FirebaseDocument } from '@/services/documentService';
import { FirestoreService } from '@/services/firestoreService';
import { DocumentCategory, DocumentFormData, DocumentFilter, DocumentViewMode } from '@/types/documents';
import DocumentUploadModal from './DocumentUploadModal';
import SignatureViewerModal from '@/components/SignatureViewerModal';
import DocumentPreview from '@/components/DocumentPreview';
import DocumentGrid from './DocumentGrid';
import DocumentFilters from './DocumentFilters';
import { storage } from '@/config/firebase';
import { getMetadata, ref } from 'firebase/storage';
import { documentCacheService } from '@/services/documentCacheService';
import { getExternalProjects, getInternalProjects } from '@/services/projectLinkingService';

interface DocumentManagementProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
  projectId?: string; // Optional: Wenn null, werden alle Projekte angezeigt
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ 
  onBack, 
  onNavigate, 
  onOpenMessaging,
  projectId 
}) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  
  // State
  const [documents, setDocuments] = useState<FirebaseDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);  // Changed to false - no auto-load
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<FirebaseDocument | null>(null);
  const [signatureDoc, setSignatureDoc] = useState<FirebaseDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DocumentFilter>({});
  const [sortField, setSortField] = useState<string>('uploadDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [signatureOnly, setSignatureOnly] = useState(false);
  const [signatureMap, setSignatureMap] = useState<Record<string, boolean>>({});
  const canApprove = user?.role === 'admin' || user?.role === 'office';
  
  // NEW: Mandatory filter state - must select before loading
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [externalProjects, setExternalProjects] = useState<any[]>([]);
  const [internalProjects, setInternalProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Berechtigungen
  const canUploadDocuments = hasPermission('create_document') || user?.role === 'admin';
  const canEditDocuments = hasPermission('edit_document') || user?.role === 'admin';
  const canDeleteDocuments = hasPermission('delete_document') || user?.role === 'admin';
  const canManageCategories = hasPermission('manage_document_categories') || user?.role === 'admin';

  // NEW: Validate that at least one filter is selected
  const canLoadDocuments = useMemo(() => {
    return !!(
      filters.projectId ||
      filters.projectType ||
      filters.category ||
      filters.documentType ||
      filters.dateFrom ||
      filters.dateTo ||
      projectId  // If opened from project context
    );
  }, [filters, projectId]);

  // Dokumente laden - Mit Cache-Support und Pflicht-Filtern
  const loadDocuments = useCallback(async (force: boolean = false) => {
    if (!user?.concernID) {
      return;
    }

    // CRITICAL VALIDATION: Always check filters BEFORE any action (even before cache check)
    // This ensures users cannot load documents without proper filtering
    if (!projectId && !canLoadDocuments) {
      toast({
        title: '⚠️ Filter erforderlich',
        description: 'Bitte wählen Sie mindestens einen Filter aus:\n• Projekttyp (Intern/Extern)\n• Projekt\n• Dokumententyp\n• Datum',
        variant: 'destructive'
      });
      console.warn('[DocumentManagement] Load blocked: No filters selected');
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('[DocumentManagement] Loading with filters:', { ...filters, projectId, fromCache: !force });
      
      // Check cache first (unless force refresh)
      // NOTE: Validation already passed above, so cache is only used with valid filters
      if (!force) {
        const cached = await documentCacheService.get(user.concernID, { ...filters, projectId });
        if (cached) {
          setDocuments(cached);
          setIsLoading(false);
          setHasLoadedOnce(true);
          console.log(`📦 Using cached data: ${cached.length} documents`);
          return;
        }
      }
      
      let loadedDocs: FirebaseDocument[] = [];
      
      if (projectId) {
        // Dokumente für ein spezifisches Projekt laden
        const projectDocs = await documentService.getProjectDocuments(
          user.concernID,
          projectId,
          filters.category,
          searchTerm
        );

        loadedDocs = projectDocs;
      } else {
        // Alle Dokumente des Concerns laden (für Admin-Übersicht)
        try {
          // Verwende die gleiche Logik wie bei der Projektinformationen-Seite
          const allDocs = await FirestoreService.getAll<FirebaseDocument>('project_documents', user.concernID);

          loadedDocs = allDocs;
        } catch (error) {
          // Fallback: Versuche die documentService Methode
          try {
            const allDocs = await documentService.getAllDocuments(user.concernID);

            loadedDocs = allDocs;
          } catch (fallbackError) {
            // Letzter Fallback: Versuche projektübergreifende Dokumente zu laden
            try {
              const projectDocs = await documentService.getProjectDocuments(
                user.concernID,
                '', // Leerer projectId für alle Projekte
                filters.category,
                searchTerm
              );

              loadedDocs = projectDocs;
            } catch (finalError) {
              loadedDocs = [];
            }
          }
        }
      }
      
      // Apply client-side filters
      let filteredDocs = loadedDocs;
      
      // Filter by document type
      if (filters.documentType) {
        filteredDocs = filteredDocs.filter(doc => doc.documentType === filters.documentType);
      }
      
      // Filter by date range
      if (filters.dateFrom) {
        filteredDocs = filteredDocs.filter(doc => {
          const docDate = new Date(doc.uploadDate);
          return docDate >= filters.dateFrom!;
        });
      }
      
      if (filters.dateTo) {
        filteredDocs = filteredDocs.filter(doc => {
          const docDate = new Date(doc.uploadDate);
          return docDate <= filters.dateTo!;
        });
      }
      
      setDocuments(filteredDocs);
      
      // Cache the results
      await documentCacheService.set(user.concernID, { ...filters, projectId }, filteredDocs);
      
      setHasLoadedOnce(true);
      
      console.log(`📄 Loaded ${filteredDocs.length} documents (cached for 5 minutes)`);
      
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
      toast({
        title: '❌ Fehler',
        description: 'Dokumente konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.concernID, projectId, filters, searchTerm, canLoadDocuments, toast]);

  // Kategorien laden
  const loadCategories = useCallback(async () => {
    if (!user?.concernID) return;

    try {
      const docCategories = await documentService.getDocumentCategories(user.concernID);
      setCategories(docCategories);
    } catch (error) {
    }
  }, [user?.concernID]);

  // Real-time Updates abonnieren (only if project-specific view)
  useEffect(() => {
    if (!user?.concernID || !projectId) return;

    const unsubscribe = documentService.subscribeToProjectDocuments(
      user.concernID,
      projectId,
      (updatedDocuments) => {
        setDocuments(updatedDocuments);
      }
    );

    return unsubscribe;
  }, [user?.concernID, projectId]);

  // Load projects list on mount (but NOT documents)
  useEffect(() => {
    if (!user?.concernID) return;
    
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const [external, internal] = await Promise.all([
          getExternalProjects(user.concernID),
          getInternalProjects(user.concernID)
        ]);
        setExternalProjects(external);
        setInternalProjects(internal);
        console.log(`📂 Loaded ${external.length} external + ${internal.length} internal projects`);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
    loadCategories();
    
    // Auto-load only if opened from project context
    if (projectId) {
      loadDocuments(false);
    }
  }, [user?.concernID, projectId, loadCategories]);  // Removed loadDocuments from dependencies

  // Sortier-Icon anzeigen
  const getSortIcon = (column: string) => {
    if (sortField !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-600" /> : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Spalte sortieren
  const handleSortColumn = (column: string) => {
    if (sortField === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(column);
      setSortOrder('asc');
    }
  };

  // Datei-Icon bestimmen
  const getFileIcon = (document: FirebaseDocument) => {
    switch (document.fileType) {
      case 'image':
        return <ImageIcon className="h-5 w-5 text-blue-600" />;
      case 'video':
        return <Video className="h-5 w-5 text-purple-600" />;
      case 'audio':
        return <Music className="h-5 w-5 text-green-600" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'archive':
        return <Archive className="h-5 w-5 text-orange-600" />;
      default:
        return <File className="h-5 w-5 text-gray-600" />;
    }
  };

  // Datum formatieren
  const formatDate = (date: any) => {
    if (!date) return 'Unbekannt';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Ungültig';
      return dateObj.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Ungültig';
    }
  };

  const checkSignatureExists = useCallback(async (docItem: FirebaseDocument) => {
    if (!docItem?.projectId || !docItem?.documentId) return false;
    const key = docItem.documentId;
    if (signatureMap[key] !== undefined) return signatureMap[key];
    try {
      const path = `projects/${docItem.projectId}/signatures/${docItem.documentId}.png`;
      await getMetadata(ref(storage, path));
      setSignatureMap(prev => ({ ...prev, [key]: true }));
      return true;
    } catch {
      setSignatureMap(prev => ({ ...prev, [key]: false }));
      return false;
    }
  }, [signatureMap]);

  // Dokumente filtern und sortieren
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents;

    // Filter anwenden
    if (filters.documentType) {
      filtered = filtered.filter(doc => doc.documentType === filters.documentType);
    }
    if (filters.priority) {
      filtered = filtered.filter(doc => doc.priority === filters.priority);
    }
    if (filters.projectPhase) {
      filtered = filtered.filter(doc => doc.projectPhase === filters.projectPhase);
    }
    if (filters.uploadedBy) {
      filtered = filtered.filter(doc => doc.uploadedBy === filters.uploadedBy);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(doc => new Date(doc.uploadDate) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(doc => new Date(doc.uploadDate) <= filters.dateTo!);
    }

    if (signatureOnly) {
      filtered = filtered.filter(d => signatureMap[d.documentId]);
    }

    // Status-Filter
    if ((filters as any).status) {
      filtered = filtered.filter(doc => (doc.status || 'draft') === (filters as any).status);
    }

    // Tag-Filter (einfacher contains)
    if ((filters as any).tag) {
      const t = ((filters as any).tag as string).toLowerCase();
      filtered = filtered.filter(doc => (doc.tags || []).some(x => x.toLowerCase().includes(t)));
    }

    // Sortierung anwenden
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'displayName':
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
        case 'uploadDate':
          aValue = new Date(a.uploadDate);
          bValue = new Date(b.uploadDate);
          break;
        case 'lastModified':
          aValue = new Date(a.lastModified);
          bValue = new Date(b.lastModified);
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 } as any;
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        default:
          aValue = new Date(a.uploadDate);
          bValue = new Date(b.uploadDate);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [documents, filters, sortField, sortOrder, signatureOnly, signatureMap]);

  useEffect(() => {
    const toCheck = filteredAndSortedDocuments.slice(0, 50);
    toCheck.forEach(d => {
      if (signatureMap[d.documentId] === undefined) {
        checkSignatureExists(d);
      }
    });
  }, [filteredAndSortedDocuments, checkSignatureExists, signatureMap]);

  // Dokument löschen
  const handleDeleteDocument = async (document: FirebaseDocument) => {
    if (!canDeleteDocuments) {
      toast({
        title: 'Zugriff verweigert',
        description: 'Sie haben keine Berechtigung, Dokumente zu löschen.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await documentService.deleteDocument(document.documentId, document.storagePath);
      
      toast({
        title: 'Dokument gelöscht',
        description: `${document.displayName} wurde erfolgreich gelöscht.`,
      });
      
      // Dokumente neu laden
      loadDocuments();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Dokument konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  };

  // Dokument herunterladen
  const handleDownloadDocument = (document: FirebaseDocument) => {
    const link = document.createElement('a');
    link.href = document.downloadUrl;
    link.download = document.originalFileName;
    link.click();
  };

  // Dokument anzeigen
  const handleViewDocument = (document: FirebaseDocument) => {
    setSelectedDocument(document);
  };

  const handleViewSignature = (document: FirebaseDocument) => {
    setSignatureDoc(document);
  };

  // Dokument bearbeiten
  const handleEditDocument = (document: FirebaseDocument) => {
    if (!canEditDocuments) {
      toast({
        title: 'Zugriff verweigert',
        description: 'Sie haben keine Berechtigung, Dokumente zu bearbeiten.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedDocument(document);
    // TODO: Implementiere Dokument-Bearbeitung Modal
  };

  // Upload erfolgreich
  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    loadDocuments();
    toast({
      title: 'Upload erfolgreich',
      description: 'Dokumente wurden erfolgreich hochgeladen.',
    });
  };

  // Statistiken berechnen
  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
    const documentsByCategory = documents.reduce((acc, doc) => {
      (acc as any)[doc.category] = ((acc as any)[doc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const documentsByType = documents.reduce((acc, doc) => {
      (acc as any)[doc.documentType] = ((acc as any)[doc.documentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      totalDocuments: documents.length,
      totalSize,
      documentsByCategory,
      documentsByType,
      recentUploads: documents.filter(doc => {
        const uploadDate = new Date(doc.uploadDate);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return uploadDate >= oneWeekAgo;
      }).length
    } as any;

    return stats;
  }, [documents]);

  if (!user?.concernID) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Dokumentenverwaltung" 
          showBackButton={true} 
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Keine Berechtigung</h2>
              <p className="text-gray-600">Sie haben keine Berechtigung, auf die Dokumentenverwaltung zuzugreifen.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title={projectId ? "📁 Projekt-Dokumente" : "📁 Dokumentenverwaltung"} 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        {canUploadDocuments && (
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Upload className="h-5 w-5 mr-2" />
            📤 Hochladen
          </Button>
        )}
      </AppHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.totalDocuments}</div>
                <p className="text-xs text-white/80">Dokumente</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Speicher
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{documentService.formatFileSize(stats.totalSize)}</div>
                <p className="text-xs text-white/80">Verwendet</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Kategorien
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{Object.keys(stats.documentsByCategory).length}</div>
                <p className="text-xs text-white/80">Verfügbar</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Diese Woche
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.recentUploads}</div>
                <p className="text-xs text-white/80">Neu</p>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Typen
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{Object.keys(stats.documentsByType).length}</div>
                <p className="text-xs text-white/80">Formate</p>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {filteredAndSortedDocuments.length} {filteredAndSortedDocuments.length === 1 ? 'Dokument' : 'Dokumente'}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* View Mode Buttons */}
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`h-8 px-3 transition-all ${viewMode === 'grid' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Grid
                  </Button>

                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`h-8 px-3 transition-all ${viewMode === 'table' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                  >
                    <TableIcon className="h-4 w-4 mr-1" />
                    Tabelle
                  </Button>

                  <Button
                    variant={signatureOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSignatureOnly(v => !v)}
                    className={`h-8 px-3 transition-all ${signatureOnly ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                    title="Nur signierte Dokumente anzeigen"
                  >
                    ✍️ Signiert
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                    <Input
                      placeholder="Dokumente durchsuchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sortieren nach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="displayName">Name</SelectItem>
                      <SelectItem value="uploadDate">Upload-Datum</SelectItem>
                      <SelectItem value="lastModified">Änderungsdatum</SelectItem>
                      <SelectItem value="fileSize">Dateigröße</SelectItem>
                      <SelectItem value="priority">Priorität</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="h-8 px-3"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <DocumentFilters
                filters={filters}
                onFiltersChange={setFilters}
                categories={categories}
                canManageCategories={canManageCategories}
                externalProjects={externalProjects}
                internalProjects={internalProjects}
              />
              
              {/* Sync Button - Prominently placed */}
              <div className="flex items-center justify-between pt-4 border-t-2 border-gray-300">
                <div className="flex items-center space-x-2">
                  {!canLoadDocuments && !projectId && (
                    <Badge variant="destructive" className="flex items-center space-x-1">
                      <Filter className="w-3 h-3" />
                      <span>Mindestens ein Filter erforderlich</span>
                    </Badge>
                  )}
                  {canLoadDocuments && hasLoadedOnce && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <CheckSquare className="w-3 h-3" />
                      <span>Filter aktiv - {filteredAndSortedDocuments.length} Dokumente</span>
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => {
                      // Extra validation on click - shows toast even if button somehow enabled
                      if (!projectId && !canLoadDocuments) {
                        toast({
                          title: '⚠️ Filter fehlt',
                          description: 'Mindestens ein Filter muss ausgewählt sein (Projekt, Typ, oder Datum).',
                          variant: 'destructive'
                        });
                        return;
                      }
                      loadDocuments(false);
                    }}
                    disabled={isLoading || (!projectId && !canLoadDocuments)}
                    className="bg-gradient-to-r from-[#058bc0] to-[#046a8f] text-white hover:from-[#046a8f] hover:to-[#058bc0] shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canLoadDocuments && !projectId ? 'Mindestens ein Filter erforderlich' : undefined}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Laden...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {hasLoadedOnce ? 'Neu laden (Cache)' : 'Dokumente laden'}
                      </>
                    )}
                  </Button>
                  
                  {hasLoadedOnce && (
                    <Button
                      onClick={() => {
                        // Extra validation on click
                        if (!projectId && !canLoadDocuments) {
                          toast({
                            title: '⚠️ Filter fehlt',
                            description: 'Mindestens ein Filter muss ausgewählt sein.',
                            variant: 'destructive'
                          });
                          return;
                        }
                        loadDocuments(true);
                      }}
                      disabled={isLoading || (!projectId && !canLoadDocuments)}
                      variant="outline"
                      className="border-2 border-gray-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!canLoadDocuments && !projectId ? 'Mindestens ein Filter erforderlich' : 'Cache ignorieren und neu von Firestore laden'}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Aus Firestore laden
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Display */}
          {!hasLoadedOnce && !projectId ? (
            <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-8 text-center">
                <Filter className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Dokumente laden</h3>
                <p className="text-gray-700 mb-4">
                  Wählen Sie mindestens einen Filter aus (Projekttyp, Projekt, Typ oder Datum) und klicken Sie auf <strong>"Dokumente laden"</strong>.
                </p>
                <div className="bg-white p-4 rounded-lg border-2 border-blue-200 max-w-md mx-auto">
                  <p className="text-sm text-gray-600 text-left">
                    <strong className="text-blue-700">Performance-Optimierung:</strong><br />
                    Durch die Vorauswahl werden nur relevante Dokumente geladen und für 5 Minuten gecached.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Lade Dokumente aus Firestore...</p>
              </CardContent>
            </Card>
          ) : filteredAndSortedDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Dokumente gefunden</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || Object.keys(filters).length > 0
                    ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
                    : 'Laden Sie Ihr erstes Dokument hoch, um zu beginnen.'}
                </p>
                {canUploadDocuments && (
                  <Button onClick={() => setShowUploadModal(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Dokument hochladen
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {viewMode === 'grid' && (
                <DocumentGrid
                  documents={filteredAndSortedDocuments}
                  onView={handleViewDocument}
                  onDownload={handleDownloadDocument}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                  canEdit={canEditDocuments}
                  canDelete={canDeleteDocuments}
                />
              )}
              
              {viewMode === 'table' && (
                <Card>
                  <CardContent className="p-0">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('uploadDate')}
                        >
                          <div className="flex items-center gap-1">
                            Hochgeladen {getSortIcon('uploadDate')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('fileName')}
                        >
                          <div className="flex items-center gap-1">
                            Dateiname {getSortIcon('fileName')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('category')}
                        >
                          <div className="flex items-center gap-1">
                            Kategorie {getSortIcon('category')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('documentType')}
                        >
                          <div className="flex items-center gap-1">
                            Typ {getSortIcon('documentType')}
                          </div>
                        </TableHead>
                        <TableHead
                          className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSortColumn('fileSize')}
                        >
                          <div className="flex items-center gap-1">
                            Größe {getSortIcon('fileSize')}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        <TableHead className="font-semibold text-gray-900">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedDocuments.map((document) => (
                        <TableRow 
                          key={document.documentId} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewDocument(document)}
                        >
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(document.uploadDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getFileIcon(document)}
                              <span className="truncate max-w-[200px]" title={document.displayName}>
                                {document.displayName}
                              </span>
                              {signatureMap[document.documentId] && (
                                <Badge className="ml-2" variant="secondary">Signiert</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {document.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {document.documentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {documentService.formatFileSize(document.fileSize)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={document.status === 'approved' ? 'default' : document.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {document.status || 'draft'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDocument(document);
                                }}
                                className="h-8 w-8 p-0"
                                title="Anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canApprove && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await documentService.updateDocumentStatus(document.documentId, 'approved');
                                      } catch {}
                                    }}
                                    className="h-8 px-2"
                                    title="Genehmigen"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await documentService.updateDocumentStatus(document.documentId, 'rejected');
                                      } catch {}
                                    }}
                                    className="h-8 px-2"
                                    title="Ablehnen"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {document.projectId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSignature(document);
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Signatur anzeigen"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadDocument(document);
                                }}
                                className="h-8 w-8 p-0"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {canEditDocuments && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditDocument(document);
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Bearbeiten"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteDocuments && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDocument(document);
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Löschen"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Quick Navigation to Other Dashboard Functions - Fixed at Bottom */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-center gap-4">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('dashboard')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-transparent hover:bg-white/10 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/30 hover:border-white/50 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                    <span>Dashboard</span>
                  </Button>
                </div>
                
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('projects')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-blue-50/30 hover:bg-blue-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-300/60 hover:border-blue-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Projekte</span>
                  </Button>
                  {hasPermission('create_project') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('new-project')}
                      className="absolute top-1 right-1 h-5 w-5 p-0 bg-blue-600 text-white hover:bg-blue-700"
                      title="Neues Projekt erstellen"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('tasks')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-green-50/30 hover:bg-green-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green-300/60 hover:border-green-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <CheckSquare className="h-5 w-5 text-green-600" />
                    <span>Aufgaben</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('new-task')}
                    className="absolute top-1 right-1 h-5 w-5 p-0 bg-green-600 text-white hover:bg-green-700"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('reports')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-orange-50/30 hover:bg-orange-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-orange-300/60 hover:border-orange-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    <span>Berichte</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('new-report')}
                    className="absolute top-1 right-1 h-5 w-5 p-0 bg-orange-600 text-white hover:bg-orange-700"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('customers')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-indigo-50/30 hover:bg-indigo-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-indigo-300/60 hover:border-indigo-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <span>Kunden</span>
                  </Button>
                  {hasPermission('create_customer') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('new-customer')}
                      className="absolute top-1 right-1 h-5 w-5 p-0 bg-indigo-600 text-white hover:bg-indigo-700"
                      title="Neuen Kunden erstellen"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('materials')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-teal-50/30 hover:bg-teal-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-teal-300/60 hover:border-teal-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <Package className="h-5 w-5 text-teal-600" />
                    <span>Materialien</span>
                  </Button>
                  {hasPermission('create_material') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('new-material')}
                      className="absolute top-1 right-1 h-5 w-5 p-0 bg-teal-600 text-white hover:bg-teal-700"
                      title="Neues Material erstellen"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('categories')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-pink-50/30 hover:bg-pink-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-pink-300/60 hover:border-pink-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <ClipboardList className="h-5 w-5 text-pink-600" />
                    <span>Kategorien</span>
                  </Button>
                  {hasPermission('create_category') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('new-category')}
                      className="absolute top-1 right-1 h-5 w-5 p-0 bg-pink-600 text-white hover:bg-pink-700"
                      title="Neue Kategorie erstellen"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('users')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-gray-50/30 hover:bg-gray-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-300/60 hover:border-gray-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <Users className="h-5 w-5 text-gray-600" />
                    <span>Benutzer</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('new-user')}
                    className="absolute top-1 right-1 h-5 w-5 p-0 bg-gray-600 text-white hover:bg-gray-700"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('messaging')}
                    className="flex flex-col items-center gap-2 h-auto py-4 px-4 text-sm bg-red-50/30 hover:bg-red-100/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-red-300/60 hover:border-red-400/80 backdrop-blur-sm transform -translate-y-1 hover:-translate-y-2"
                  >
                    <MessageCircle className="h-5 w-5 text-red-600" />
                    <span>Nachrichten</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('messaging')}
                    className="absolute top-1 right-1 h-5 w-5 p-0 bg-red-600 text-white hover:bg-red-700"
                    title="Neue Nachricht"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
          projectId={projectId}
          categories={categories}
          concernID={user.concernID}
        />
      )}

      {/* Signature Viewer */}
      {signatureDoc && (
        <SignatureViewerModal 
          open={!!signatureDoc}
          onOpenChange={(o) => { if (!o) setSignatureDoc(null); }}
          projectId={signatureDoc.projectId}
          documentId={signatureDoc.documentId}
        />
      )}

      {/* Document Preview with Annotations */}
      {selectedDocument && (
        <DocumentPreview
          open={!!selectedDocument}
          onOpenChange={(o) => { if (!o) setSelectedDocument(null); }}
          document={selectedDocument}
        />
      )}
    </div>
  );
};

export default DocumentManagement;
