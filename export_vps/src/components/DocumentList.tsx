import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Calendar,
  User,
  Tag,
  MoreVertical
} from 'lucide-react';
import { FirebaseDocument } from '@/services/documentService';
import { documentService } from '@/services/documentService';

interface DocumentListProps {
  documents: FirebaseDocument[];
  onView: (document: FirebaseDocument) => void;
  onDownload: (document: FirebaseDocument) => void;
  onEdit: (document: FirebaseDocument) => void;
  onDelete: (document: FirebaseDocument) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onView,
  onDownload,
  onEdit,
  onDelete,
  canEdit,
  canDelete
}) => {
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

  // Prioritäts-Badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Hoch</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Mittel</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Niedrig</Badge>;
      default:
        return null;
    }
  };

  // Zugriffsebene-Badge
  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public':
        return <Badge variant="default" className="text-xs bg-green-600">ö–ffentlich</Badge>;
      case 'restricted':
        return <Badge variant="secondary" className="text-xs">Eingeschrö¤nkt</Badge>;
      case 'admin':
        return <Badge variant="destructive" className="text-xs">Admin</Badge>;
      default:
        return null;
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

  // Tags anzeigen (maximal 5)
  const renderTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return null;
    
    const displayTags = tags.slice(0, 5);
    const hasMore = tags.length > 5;
    
    return (
      <div className="flex flex-wrap gap-1 items-center">
        <Tag className="h-3 w-3 text-gray-400" />
        {displayTags.map((tag, index) => (
          <Badge key={index} variant="outline" className="text-xs px-2 py-1">
            {tag}
          </Badge>
        ))}
        {hasMore && (
          <span className="text-xs text-gray-500">
            +{tags.length - 5} weitere
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {documents.map((document, index) => (
        <div key={document.documentId}>
          <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
            {/* Icon und Hauptinformationen */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getFileIcon(document)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate" title={document.displayName}>
                    {document.displayName}
                  </h3>
                  {getPriorityBadge(document.priority)}
                  {getAccessLevelBadge(document.accessLevel)}
                </div>
                
                <p className="text-sm text-gray-500 truncate mb-1" title={document.originalFileName}>
                  {document.originalFileName}
                </p>
                
                {document.description && (
                  <p className="text-sm text-gray-600 line-clamp-1" title={document.description}>
                    {document.description}
                  </p>
                )}
                
                {renderTags(document.tags)}
              </div>
            </div>
            
            {/* Metadaten */}
            <div className="hidden lg:flex flex-col items-end text-sm text-gray-500 space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span className="whitespace-nowrap">{formatDate(document.uploadDate)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span className="truncate max-w-32" title={document.uploadedByEmail}>
                  {document.uploadedByEmail}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>{documentService.formatFileSize(document.fileSize)}</span>
              </div>
            </div>
            
            {/* Aktions-Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(document)}
                className="h-8 w-8 p-0"
                title="Anzeigen"
                aria-label={`Dokument "${document.fileName || document.documentId}" anzeigen`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(document)}
                className="h-8 w-8 p-0"
                title="Herunterladen"
                aria-label={`Dokument "${document.fileName || document.documentId}" herunterladen`}
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(document)}
                  className="h-8 w-8 p-0"
                  title="Bearbeiten"
                  aria-label={`Dokument "${document.fileName || document.documentId}" bearbeiten`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(document)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Löschen"
                  aria-label={`Dokument "${document.fileName || document.documentId}" löschen`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Separator zwischen Eintrö¤gen */}
          {index < documents.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
};

export default DocumentList;

