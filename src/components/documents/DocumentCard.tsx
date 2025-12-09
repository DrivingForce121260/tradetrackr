// ============================================================================
// DOCUMENT CARD COMPONENT - Display Individual Document
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, AlertCircle, CheckCircle, Clock, Sparkles, Folder } from 'lucide-react';
import { DocRecord, DOCUMENT_TYPE_CONFIGS } from '@/types/documents';
import { format } from 'date-fns';
import { CategoryPicker } from './CategoryPicker';
import { fetchCategoriesForOrg } from '@/lib/categories/categoryHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from '@/hooks/use-toast';

interface DocumentCardProps {
  document: DocRecord;
  onClick?: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
}

export function DocumentCard({ document, onClick, onDownload, onPreview }: DocumentCardProps) {
  const { user } = useAuth();
  const [categoryPath, setCategoryPath] = useState<string>('');
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const typeConfig = DOCUMENT_TYPE_CONFIGS.find(c => c.slug === document.type);

  // Load category path
  useEffect(() => {
    const loadCategoryPath = async () => {
      if (!document.categoryId) {
        setCategoryPath('');
        return;
      }

      const orgId = user?.concernID || user?.ConcernID || '';
      if (!orgId) return;

      try {
        const categories = await fetchCategoriesForOrg(orgId);
        const category = categories.find(c => c.categoryId === document.categoryId);
        if (category) {
          setCategoryPath(category.path.join(' > '));
        } else {
          setCategoryPath('');
        }
      } catch (error) {
        console.error('[DocumentCard] Failed to load category:', error);
      }
    };

    loadCategoryPath();
  }, [document.categoryId, user]);

  const handleCategoryChange = async (categoryId: string | null) => {
    if (!document.docId) return;

    setUpdatingCategory(true);
    try {
      // Find document in Firestore
      const docRef = doc(db, 'documents', document.docId);
      await updateDoc(docRef, {
        categoryId: categoryId,
        categoryDecision: {
          categoryId: categoryId,
          confidence: 1.0,
          source: 'explicit',
          reason: 'Manually assigned by user'
        }
      });

      toast({
        title: 'Erfolg',
        description: 'Kategorie wurde aktualisiert'
      });

      // Update local state
      if (categoryId) {
        const orgId = user?.concernID || user?.ConcernID || '';
        if (orgId) {
          const categories = await fetchCategoriesForOrg(orgId);
          const category = categories.find(c => c.categoryId === categoryId);
          if (category) {
            setCategoryPath(category.path.join(' > '));
          }
        }
      } else {
        setCategoryPath('');
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Kategorie konnte nicht aktualisiert werden: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setUpdatingCategory(false);
    }
  };
  
  const getStatusBadge = () => {
    switch (document.status) {
      case 'uploaded':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Hochgeladen</Badge>;
      case 'routed':
        return <Badge variant="outline" className="bg-blue-50"><CheckCircle className="h-3 w-3 mr-1" /> Geroutet</Badge>;
      case 'ai_requested':
      case 'ai_processing':
        return <Badge variant="outline" className="bg-purple-50"><Sparkles className="h-3 w-3 mr-1" /> AI-Analyse</Badge>;
      case 'needs_review':
        return <Badge variant="outline" className="bg-amber-50"><AlertCircle className="h-3 w-3 mr-1" /> Prüfung</Badge>;
      case 'stored':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Gespeichert</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  const getFileIcon = () => {
    if (document.mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (document.mimeType === 'application/pdf') {
      return '📄';
    } else if (document.mimeType.includes('spreadsheet') || document.mimeType.includes('excel')) {
      return '📊';
    } else if (document.mimeType.includes('wordprocessing') || document.mimeType.includes('document')) {
      return '📝';
    }
    return '📎';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: any): string => {
    try {
      if (timestamp?.toDate) {
        return format(timestamp.toDate(), 'dd.MM.yyyy HH:mm');
      }
      return 'Unbekannt';
    } catch {
      return 'Unbekannt';
    }
  };

  return (
    <Card 
      className="border-2 border-gray-300 shadow-md hover:shadow-xl transition-all cursor-pointer hover:border-[#058bc0] hover:scale-[1.02] duration-200"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* File Icon - Enhanced */}
          <div className="text-5xl flex-shrink-0 bg-gray-100 p-3 rounded-xl border-2 border-gray-200">
            {getFileIcon()}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base truncate">
                {document.originalFilename}
              </h4>
              <p className="text-sm text-gray-500">
                {formatFileSize(document.sizeBytes)} • {formatDate(document.createdAt)}
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Document Type - Enhanced */}
          {document.type && typeConfig && (
            <div className="mb-3">
              <Badge className="bg-[#058bc0] text-white border-2 border-[#047ba8] px-3 py-1 text-sm font-bold">
                {typeConfig.labelDe}
              </Badge>
              {document.typeConfidence !== null && document.typeConfidence !== undefined && (
                <Badge variant="outline" className="ml-2 border-2 border-gray-300 font-semibold">
                  {(document.typeConfidence * 100).toFixed(0)}% Konfidenz
                </Badge>
              )}
            </div>
          )}

          {/* Metadata - Enhanced */}
          <div className="flex flex-wrap gap-2 mb-3">
            {document.projectId && (
              <Badge variant="outline" className="border-2 border-blue-300 bg-blue-50 text-blue-700 font-semibold">
                📁 Projekt: {document.projectId}
              </Badge>
            )}
            {/* Category */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <CategoryPicker
                selectedCategoryId={document.categoryId || null}
                onSelect={handleCategoryChange}
                candidates={document.categoryDecision?.candidates || []}
                disabled={updatingCategory}
              />
            </div>
            {document.clientId && (
              <Badge variant="outline" className="border-2 border-purple-300 bg-purple-50 text-purple-700 font-semibold">
                👤 Kunde: {document.clientId}
              </Badge>
            )}
            {document.employeeId && (
              <Badge variant="outline" className="border-2 border-green-300 bg-green-50 text-green-700 font-semibold">
                👷 Mitarbeiter: {document.employeeId}
              </Badge>
            )}
          </div>

          {/* Category Decision Info */}
          {document.categoryDecision && (
            <div className="mb-2">
              {document.categoryDecision.reason && (
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Kategorie:</span> {document.categoryDecision.reason}
                  {document.categoryDecision.confidence !== undefined && (
                    <span className="ml-2">
                      ({(document.categoryDecision.confidence * 100).toFixed(0)}% Konfidenz)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {document.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Route/AI Decision */}
          {document.routeDecision?.reason && (
            <p className="text-xs text-gray-600 mb-2">
              <span className="font-medium">Routing:</span> {document.routeDecision.reason}
            </p>
          )}
          {document.aiDecision?.reason && (
            <p className="text-xs text-purple-600 mb-2">
              <span className="font-medium">AI:</span> {document.aiDecision.reason}
              {document.aiDecision.model && ` (${document.aiDecision.model})`}
            </p>
          )}

          {/* Notes */}
          {document.notes && (
            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
              {document.notes}
            </p>
          )}

          {/* Text Sample (if OCR applied) */}
          {document.meta?.ocrApplied && document.meta?.textSample && (
            <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-600 mb-2">
              <p className="font-medium mb-1">OCR-Text (Auszug):</p>
              <p className="line-clamp-2">{document.meta.textSample}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {onPreview && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      </CardContent>
    </Card>
  );
}

