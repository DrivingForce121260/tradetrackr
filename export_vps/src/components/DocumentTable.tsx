import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  MoreVertical
} from 'lucide-react';
import { FirebaseDocument } from '@/services/documentService';
import { documentService } from '@/services/documentService';

interface DocumentTableProps {
  documents: FirebaseDocument[];
  onView: (document: FirebaseDocument) => void;
  onDownload: (document: FirebaseDocument) => void;
  onEdit: (document: FirebaseDocument) => void;
  onDelete: (document: FirebaseDocument) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const DocumentTable: React.FC<DocumentTableProps> = ({
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

  // Tags anzeigen (maximal 3)
  const renderTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return '-';
    
    const displayTags = tags.slice(0, 3);
    const hasMore = tags.length > 3;
    
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {displayTags.map((tag, index) => (
          <Badge key={index} variant="outline" className="text-xs px-2 py-1">
            {tag}
          </Badge>
        ))}
        {hasMore && (
          <span className="text-xs text-gray-500">
            +{tags.length - 3}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12">Typ</TableHead>
            <TableHead className="min-w-48">Name & Beschreibung</TableHead>
            <TableHead className="min-w-32">Kategorie</TableHead>
            <TableHead className="min-w-24">Tags</TableHead>
            <TableHead className="min-w-24">Priorität</TableHead>
            <TableHead className="min-w-24">Zugriff</TableHead>
            <TableHead className="min-w-24">Größe</TableHead>
            <TableHead className="min-w-24">Upload</TableHead>
            <TableHead className="min-w-24">Von</TableHead>
            <TableHead className="w-32 text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.documentId} className="hover:bg-gray-50">
              {/* Dateityp Icon */}
              <TableCell className="py-3">
                {getFileIcon(document)}
              </TableCell>
              
              {/* Name & Beschreibung */}
              <TableCell className="py-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate" title={document.displayName}>
                    {document.displayName}
                  </div>
                  <div className="text-sm text-gray-500 truncate" title={document.originalFileName}>
                    {document.originalFileName}
                  </div>
                  {document.description && (
                    <div className="text-sm text-gray-600 truncate mt-1" title={document.description}>
                      {document.description}
                    </div>
                  )}
                </div>
              </TableCell>
              
              {/* Kategorie */}
              <TableCell className="py-3">
                <Badge variant="outline" className="text-xs">
                  {document.category}
                </Badge>
              </TableCell>
              
              {/* Tags */}
              <TableCell className="py-3">
                {renderTags(document.tags)}
              </TableCell>
              
              {/* Priorität */}
              <TableCell className="py-3">
                {getPriorityBadge(document.priority)}
              </TableCell>
              
              {/* Zugriffsebene */}
              <TableCell className="py-3">
                {getAccessLevelBadge(document.accessLevel)}
              </TableCell>
              
              {/* Dateigröße */}
              <TableCell className="py-3 text-sm text-gray-600">
                {documentService.formatFileSize(document.fileSize)}
              </TableCell>
              
              {/* Upload-Datum */}
              <TableCell className="py-3 text-sm text-gray-600">
                {formatDate(document.uploadDate)}
              </TableCell>
              
              {/* Upload von */}
              <TableCell className="py-3 text-sm text-gray-600">
                <div className="truncate max-w-24" title={document.uploadedByEmail}>
                  {document.uploadedByEmail}
                </div>
              </TableCell>
              
              {/* Aktionen */}
              <TableCell className="py-3">
                <div className="flex items-center justify-end gap-1">
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
      
      {documents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Keine Dokumente gefunden
        </div>
      )}
    </div>
  );
};

export default DocumentTable;

