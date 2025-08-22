import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
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
  Calendar,
  User,
  Tag
} from 'lucide-react';
import { FirebaseDocument } from '@/services/documentService';
import { documentService } from '@/services/documentService';

interface DocumentGridProps {
  documents: FirebaseDocument[];
  onView: (document: FirebaseDocument) => void;
  onDownload: (document: FirebaseDocument) => void;
  onEdit: (document: FirebaseDocument) => void;
  onDelete: (document: FirebaseDocument) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
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
        return <ImageIcon className="h-8 w-8 text-blue-600" />;
      case 'video':
        return <Video className="h-8 w-8 text-purple-600" />;
      case 'audio':
        return <Music className="h-8 w-8 text-green-600" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-600" />;
      case 'archive':
        return <Archive className="h-8 w-8 text-orange-600" />;
      default:
        return <File className="h-8 w-8 text-gray-600" />;
    }
  };

  // Prioritö¤ts-Badge
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

  // Tags anzeigen (maximal 3)
  const renderTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return null;
    
    const displayTags = tags.slice(0, 3);
    const hasMore = tags.length > 3;
    
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
            +{tags.length - 3} weitere
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((document) => (
        <Card key={document.documentId} className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(document)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate" title={document.displayName}>
                    {document.displayName}
                  </h3>
                  <p className="text-sm text-gray-500 truncate" title={document.originalFileName}>
                    {document.originalFileName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {getPriorityBadge(document.priority)}
                {getAccessLevelBadge(document.accessLevel)}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            {/* Beschreibung */}
            {document.description && (
              <p className="text-sm text-gray-600 line-clamp-2" title={document.description}>
                {document.description}
              </p>
            )}
            
            {/* Tags */}
            {renderTags(document.tags)}
            
            {/* Metadaten */}
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Upload: {formatDate(document.uploadDate)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>{document.uploadedByEmail}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>{documentService.formatFileSize(document.fileSize)}</span>
              </div>
            </div>
            
            {/* Aktions-Buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(document)}
                  className="h-8 w-8 p-0"
                  title="Anzeigen"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(document)}
                  className="h-8 w-8 p-0"
                  title="Herunterladen"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(document)}
                    className="h-8 w-8 p-0"
                    title="Bearbeiten"
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
                    title="Lö¶schen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DocumentGrid;

