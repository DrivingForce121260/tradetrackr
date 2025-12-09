// ============================================================================
// DOCUMENT LIST COMPONENT - Filter and Display Documents
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Search, Filter, RefreshCw, X } from 'lucide-react';
import { DocumentManagementService } from '@/services/documentManagementService';
import { DocRecord, DocumentType, DocumentStatus, DOCUMENT_TYPE_CONFIGS } from '@/types/documents';
import { DocumentCard } from './DocumentCard';
import { Category, fetchCategoriesForOrg, buildCategoryTree } from '@/lib/categories/categoryHelpers';

interface DocumentListProps {
  initialFilter?: {
    status?: DocumentStatus[];
    type?: DocumentType;
    projectId?: string;
  };
  onDocumentSelect?: (doc: DocRecord) => void;
}

export function DocumentList({ initialFilter, onDocumentSelect }: DocumentListProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [cachedDocuments, setCachedDocuments] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Get concernID with fallback
  const getConcernID = () => {
    const fromUser = user?.concernID || user?.ConcernID;
    if (fromUser) return fromUser;
    
    // Fallback: localStorage
    try {
      const usersData = localStorage.getItem('users');
      if (usersData && user?.uid) {
        const users = JSON.parse(usersData);
        const currentUser = users.find((u: any) => u.uid === user.uid || u.id === user.uid);
        return currentUser?.concernID || currentUser?.ConcernID || '';
      }
    } catch (error) {
      console.error('[DocumentList] Failed to get concernID from localStorage:', error);
    }
    return '';
  };

  const concernId = getConcernID();
  const userId = user?.uid || '';

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!concernId) return;
      try {
        const fetchedCategories = await fetchCategoriesForOrg(concernId);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('[DocumentList] Failed to load categories:', error);
      }
    };
    loadCategories();
  }, [concernId]);

  // Apply filters to cached data
  const applyFiltersToCache = (cache: DocRecord[] = cachedDocuments) => {
    let filtered = [...cache];
    
    // Filter by status
    if (statusFilter !== 'all') {
      const statuses = statusFilter.split(',') as DocumentStatus[];
      filtered = filtered.filter(doc => statuses.includes(doc.status));
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }
    
    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.categoryId === categoryFilter);
    }
    
    // Filter by project (if initialFilter set)
    if (initialFilter?.projectId) {
      filtered = filtered.filter(doc => doc.projectId === initialFilter.projectId);
    }
    
    setDocuments(filtered);
  };

  // Apply filters when filter changes
  useEffect(() => {
    if (cachedDocuments.length > 0) {
      applyFiltersToCache();
    }
  }, [statusFilter, typeFilter, categoryFilter]);

  // Manual sync function
  const handleSync = async () => {
    if (!concernId || !userId) {
      console.log('[DocumentList] No user or concern, skipping sync', { concernId, userId });
      toast({
        title: 'Sync nicht möglich',
        description: 'Benutzer- oder Concern-ID fehlt',
        variant: 'destructive'
      });
      return;
    }
    
    await loadDocuments();
  };

  const loadDocuments = async () => {
    if (!concernId || !userId) {
      console.log('[DocumentList] No user or concern, skipping load', { concernId, userId });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('[DocumentList] Loading all documents from Firebase');
    
    try {
      const docService = new DocumentManagementService(concernId, userId);
      
      // Always load all recent documents (ignoring current filters)
      console.log('[DocumentList] Loading recent documents (100 limit)');
      const docs = await docService.listRecentDocuments(100);

      console.log('[DocumentList] Documents loaded:', docs.length, docs);
      setCachedDocuments(docs); // Cache the loaded documents
      applyFiltersToCache(docs); // Apply current filters to newly loaded data
      
      toast({
        title: 'Sync erfolgreich',
        description: `${docs.length} Dokument(e) geladen`,
      });
    } catch (error) {
      console.error('[DocumentList] Load failed:', error);
      setDocuments([]);
      
      toast({
        title: 'Fehler beim Laden',
        description: error instanceof Error ? error.message : 'Dokumente konnten nicht geladen werden',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      doc.originalFilename.toLowerCase().includes(term) ||
      (doc.type && doc.type.toLowerCase().includes(term)) ||
      (doc.notes && doc.notes.toLowerCase().includes(term))
    );
  });

  const statusOptions = [
    { value: 'all', label: 'Alle Status' },
    { value: 'uploaded', label: 'Hochgeladen' },
    { value: 'routed', label: 'Geroutet' },
    { value: 'needs_review', label: 'Prüfung erforderlich' },
    { value: 'stored', label: 'Gespeichert' },
    { value: 'ai_processing', label: 'AI-Verarbeitung' }
  ];

  return (
    <div className="space-y-4">
      {/* Filters - Enhanced with bold borders */}
      <Card className="border-2 border-gray-300 shadow-md">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#058bc0]" />
              <Input
                placeholder="Dokumente suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 border-2 border-gray-300 focus:border-[#058bc0] font-medium"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] font-medium">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] font-medium">
                <SelectValue placeholder="Typ filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {DOCUMENT_TYPE_CONFIGS.map(config => (
                  <SelectItem key={config.slug} value={config.slug}>
                    {config.labelDe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] font-medium">
                <SelectValue placeholder="Kategorie filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                <SelectItem value="none">Keine Kategorie</SelectItem>
                {categories.filter(c => c.active).map(category => (
                  <SelectItem key={category.categoryId} value={category.categoryId}>
                    {category.path.join(' > ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sync Button - Prominent */}
          <div className="flex justify-center mt-4">
            <Button 
              onClick={handleSync} 
              disabled={loading}
              className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#046a90] text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 px-8 py-3 border-2 border-[#047ba8]"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Synchronisiere...' : 'Dokumente synchronisieren'}
            </Button>
            {cachedDocuments.length > 0 && !loading && (
              <span className="ml-4 text-sm text-gray-600 flex items-center gap-2 self-center">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                  ✓ {cachedDocuments.length} Dokument(e) im Cache
                </span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count - Enhanced */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-300 rounded-lg shadow-sm">
        <span className="font-bold text-base text-gray-900">
          📄 {filteredDocuments.length} Dokument{filteredDocuments.length !== 1 ? 'e' : ''} gefunden
        </span>
        {searchTerm && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSearchTerm('')}
            className="border-2 border-gray-300 hover:border-red-500 font-semibold"
          >
            <X className="h-4 w-4 mr-1" />
            Suche zurücksetzen
          </Button>
        )}
      </div>

      {/* Document Cards */}
      {loading ? (
        <Card className="border-2 border-gray-300 shadow-md">
          <CardContent className="text-center py-16">
            <RefreshCw className="h-12 w-12 animate-spin text-[#058bc0] mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700">Lade Dokumente...</p>
          </CardContent>
        </Card>
      ) : filteredDocuments.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-400 shadow-md">
          <CardContent className="p-16 text-center">
            <Filter className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-600 mb-2">Keine Dokumente gefunden</p>
            <p className="text-sm text-gray-500 mb-4">Versuchen Sie andere Filter oder laden Sie neue Dokumente hoch</p>
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all') && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-3 border-2 border-gray-300 hover:border-[#058bc0] font-semibold"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Filter zurücksetzen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-gray-300 shadow-md">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {filteredDocuments.map(doc => {
                const typeConfig = DOCUMENT_TYPE_CONFIGS.find(c => c.slug === doc.type);
                const isExpanded = expandedDocId === doc.docId;
                
                return (
                  <div key={doc.docId} className="hover:bg-gray-50 transition-colors">
                    {/* One-Line Summary */}
                    <div 
                      className="px-6 py-4 cursor-pointer flex items-center justify-between gap-4"
                      onClick={() => setExpandedDocId(isExpanded ? null : doc.docId)}
                    >
                      <div className="flex-1 flex items-center gap-4 min-w-0">
                        {/* Filename */}
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-900 truncate block">
                            {doc.originalFilename}
                          </span>
                        </div>
                        
                        {/* Type */}
                        <div className="flex-shrink-0 w-48">
                          <Badge className="bg-purple-100 text-purple-800 border-2 border-purple-300">
                            {typeConfig?.labelDe || doc.type || 'Unbekannt'}
                          </Badge>
                        </div>
                        
                        {/* Category */}
                        <div className="flex-shrink-0 w-48">
                          {doc.categoryId ? (
                            (() => {
                              const category = categories.find(c => c.categoryId === doc.categoryId);
                              return (
                                <Badge className="bg-blue-100 text-blue-800 border-2 border-blue-300">
                                  {category ? category.path.join(' > ') : 'Kategorie'}
                                </Badge>
                              );
                            })()
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Keine Kategorie
                            </Badge>
                          )}
                        </div>
                        
                        {/* Status */}
                        <div className="flex-shrink-0 w-32">
                          <Badge 
                            className={
                              doc.status === 'stored' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                              doc.status === 'needs_review' ? 'bg-amber-100 text-amber-800 border-2 border-amber-300' :
                              doc.status === 'ai_processing' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                              'bg-gray-100 text-gray-800 border-2 border-gray-300'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        
                        {/* Date */}
                        <div className="flex-shrink-0 w-32 text-sm text-gray-600">
                          {doc.meta?.date || new Date(doc.createdAt).toLocaleDateString('de-DE')}
                        </div>
                        
                        {/* Expand Icon */}
                        <div className="flex-shrink-0">
                          <Button variant="ghost" size="sm" className="p-2">
                            {isExpanded ? '▲' : '▼'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                        <DocumentCard
                          document={doc}
                          onClick={() => onDocumentSelect?.(doc)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

