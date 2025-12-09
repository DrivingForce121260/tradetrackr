import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive, 
  File,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { documentService, FirebaseDocument } from '@/services/documentService';
import { DocumentCategory, DocumentFormData } from '@/types/documents';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: string;
  categories: DocumentCategory[];
  concernID: string;
}

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  formData: DocumentFormData;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  categories,
  concernID
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Standard-Kategorien falls keine vorhanden
  const defaultCategories: DocumentCategory[] = [
    {
      id: 'general',
      concernID,
      name: 'Allgemein',
      description: 'Allgemeine Dokumente',
      icon: '📄',
      color: '#6B7280',
      allowedFileTypes: ['*'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'drawings',
      concernID,
      name: 'Zeichnungen',
      description: 'Technische Zeichnungen und Plö¤ne',
      icon: 'ðŸ“',
      color: '#3B82F6',
      allowedFileTypes: ['image/*', 'application/pdf'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'contracts',
      concernID,
      name: 'Verträge',
      description: 'Verträge und rechtliche Dokumente',
      icon: '📋',
      color: '#10B981',
      allowedFileTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxFileSize: 25 * 1024 * 1024, // 25MB
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'photos',
      concernID,
      name: 'Fotos',
      description: 'Projektfotos und Dokumentation',
      icon: '📷',
      color: '#F59E0B',
      allowedFileTypes: ['image/*'],
      maxFileSize: 20 * 1024 * 1024, // 20MB
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const availableCategories = categories.length > 0 ? categories : defaultCategories;

  // Dateien hinzufügen
  const handleFilesAdded = useCallback((files: FileList | File[]) => {
    const newItems: FileUploadItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}_${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading',
      formData: {
        displayName: file.name.replace(/\.[^/.]+$/, ''), // Dateiname ohne Extension
        description: '',
        category: availableCategories[0]?.id || 'general',
        tags: [],
        accessLevel: 'public',
        allowedRoles: [],
        isPublic: true,
        projectPhase: '',
        documentType: getDocumentTypeFromFile(file),
        priority: 'medium'
      }
    }));

    setUploadItems(prev => [...prev, ...newItems]);
  }, [availableCategories]);

  // Datei entfernen
  const removeFile = useCallback((id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Formular-Daten aktualisieren
  const updateFormData = useCallback((id: string, field: keyof DocumentFormData, value: any) => {
    setUploadItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, formData: { ...item.formData, [field]: value } }
        : item
    ));
  }, []);

  // Tags hinzufügen/entfernen
  const handleTagsChange = useCallback((id: string, tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    updateFormData(id, 'tags', tags);
  }, [updateFormData]);

  // Drag & Drop Handler
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  }, [handleFilesAdded]);

  // Datei-Input Handler
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  }, [handleFilesAdded]);

  // Upload starten
  const startUpload = useCallback(async () => {
    if (!user?.concernID || !projectId || uploadItems.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const item of uploadItems) {
        try {
          // Datei zu Storage hochladen
          const { storagePath, downloadUrl } = await documentService.uploadFile(
            item.file,
            user.concernID,
            projectId,
            (progress) => {
              setUploadItems(prev => prev.map(prevItem => 
                prevItem.id === item.id 
                  ? { ...prevItem, progress }
                  : prevItem
              ));
            },
            user.uid
          );

          // Thumbnail generieren (falls möglich)
          const thumbnailUrl = await documentService.generateThumbnail(
            item.file,
            user.concernID,
            projectId,
            item.id
          );

          // Dokument-Daten für Firestore vorbereiten
          const documentData: Omit<FirebaseDocument, 'documentId' | 'uploadDate' | 'lastModified' | 'version'> = {
            concernID: user.concernID,
            projectId,
            fileName: `${Date.now()}_${item.file.name}`,
            displayName: item.formData.displayName,
            description: item.formData.description,
            category: item.formData.category,
            tags: item.formData.tags,
            fileType: documentService.getFileTypeFromMime(item.file.type),
            fileExtension: item.file.name.split('.').pop() || '',
            fileSize: item.file.size,
            originalFileName: item.file.name,
            storagePath,
            downloadUrl,
            accessLevel: item.formData.accessLevel,
            allowedRoles: item.formData.allowedRoles,
            isPublic: item.formData.isPublic,
            uploadedBy: user.uid,
            uploadedByEmail: user.email || '',
            projectPhase: item.formData.projectPhase,
            documentType: item.formData.documentType,
            priority: item.formData.priority,
            searchableText: `${item.formData.displayName} ${item.formData.description} ${item.formData.tags.join(' ')}`,
            fullTextSearch: [
              item.formData.displayName.toLowerCase(),
              item.formData.description.toLowerCase(),
              ...item.formData.tags.map(tag => tag.toLowerCase())
            ]
          };

          // Nur thumbnailUrl hinzufügen, wenn es einen Wert hat
          if (thumbnailUrl) {
            (documentData as any).thumbnailUrl = thumbnailUrl;
          }

          await documentService.addProjectDocument(
            user.concernID,
            projectId,
            documentData
          );

          // Status auf Erfolg setzen
          setUploadItems(prev => prev.map(prevItem => 
            prevItem.id === item.id 
              ? { ...prevItem, status: 'success', progress: 100 }
              : prevItem
          ));

          successCount++;
        } catch (error) {

          
          // Status auf Fehler setzen
          setUploadItems(prev => prev.map(prevItem => 
            prevItem.id === item.id 
              ? { 
                  ...prevItem, 
                  status: 'error', 
                  error: error instanceof Error ? error.message : 'Unbekannter Fehler'
                }
              : prevItem
          ));

          errorCount++;
        }
      }

      // Ergebnis anzeigen
      if (successCount > 0) {
        toast({
          title: 'Upload erfolgreich',
          description: `${successCount} von ${uploadItems.length} Dokumenten wurden erfolgreich hochgeladen.`,
        });
        
        if (errorCount === 0) {
          // Alle erfolgreich - Modal schließen
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      }

      if (errorCount > 0) {
        toast({
          title: 'Upload mit Fehlern',
          description: `${errorCount} Dokumente konnten nicht hochgeladen werden.`,
          variant: 'destructive',
        });
      }
    } catch (error) {

      toast({
        title: 'Upload-Fehler',
        description: 'Ein unerwarteter Fehler ist aufgetreten.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, projectId, uploadItems, toast, onSuccess]);

  // Dateityp aus Datei bestimmen
  const getDocumentTypeFromFile = (file: File): 'drawing' | 'contract' | 'photo' | 'report' | 'other' => {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type.includes('pdf')) return 'contract';
    if (file.type.includes('word') || file.type.includes('document')) return 'contract';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return 'report';
    if (file.type.includes('powerpoint') || file.type.includes('presentation')) return 'report';
    return 'other';
  };

  // Datei-Icon bestimmen
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-blue-600" />;
    if (file.type.startsWith('video/')) return <Video className="h-6 w-6 text-purple-600" />;
    if (file.type.startsWith('audio/')) return <Music className="h-6 w-6 text-green-600" />;
    if (file.type.includes('pdf')) return <FileText className="h-6 w-6 text-red-600" />;
    if (file.type.includes('zip') || file.type.includes('rar')) return <Archive className="h-6 w-6 text-orange-600" />;
    return <File className="h-6 w-6 text-gray-600" />;
  };

  // Modal schließen
  const handleClose = () => {
    if (!isUploading) {
      setUploadItems([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white -m-6 mb-4 p-6 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="h-6 w-6" />
            Dokumente hochladen
          </DialogTitle>
          <p className="text-blue-100 text-sm mt-2">
            Laden Sie Dokumente für Ihr Projekt hoch und organisieren Sie sie nach Kategorien
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
              dragActive 
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg scale-[1.02]' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 transition-all ${
              dragActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
            }`}>
              <Upload className="h-10 w-10" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Dateien hierher ziehen oder klicken zum Auswählen
            </p>
            <p className="text-gray-600 mb-4">
              Unterstützte Formate: PDF, Word, Excel, Bilder, Videos, Audio
            </p>
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-input')?.click()}
              disabled={isUploading}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dateien auswählen
            </Button>
            <input
              id="file-input"
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Upload Items */}
          {uploadItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Ausgewählte Dateien ({uploadItems.length})
              </h3>
              
              {uploadItems.map((item) => (
                <div key={item.id} className="border-2 border-gray-200 rounded-lg p-5 space-y-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-all">
                  {/* File Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(item.file)}
                      <div>
                        <p className="font-medium">{item.file.name}</p>
                        <p className="text-sm text-gray-600">
                          {documentService.formatFileSize(item.file.size)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      {item.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(item.id)}
                        disabled={isUploading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {item.status === 'uploading' && (
                    <div className="space-y-2">
                      <Progress value={item.progress} className="h-2" />
                      <p className="text-sm text-gray-600 text-center">
                        {Math.round(item.progress)}% hochgeladen
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {item.status === 'error' && item.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800">{item.error}</p>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`displayName-${item.id}`}>Anzeigename *</Label>
                      <Input
                        id={`displayName-${item.id}`}
                        value={item.formData.displayName}
                        onChange={(e) => updateFormData(item.id, 'displayName', e.target.value)}
                        placeholder="Anzeigename für das Dokument"
                        disabled={isUploading}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`category-${item.id}`}>Kategorie *</Label>
                      <Select
                        value={item.formData.category}
                        onValueChange={(value) => updateFormData(item.id, 'category', value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategorie auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <span>{category.icon}</span>
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`documentType-${item.id}`}>Dokumententyp</Label>
                      <Select
                        value={item.formData.documentType}
                        onValueChange={(value: any) => updateFormData(item.id, 'documentType', value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="drawing">Zeichnung</SelectItem>
                          <SelectItem value="contract">Vertrag</SelectItem>
                          <SelectItem value="photo">Foto</SelectItem>
                          <SelectItem value="report">Bericht</SelectItem>
                          <SelectItem value="other">Sonstiges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`priority-${item.id}`}>Priorität</Label>
                      <Select
                        value={item.formData.priority}
                        onValueChange={(value: any) => updateFormData(item.id, 'priority', value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Niedrig</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="high">Hoch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor={`description-${item.id}`}>Beschreibung</Label>
                      <Textarea
                        id={`description-${item.id}`}
                        value={item.formData.description}
                        onChange={(e) => updateFormData(item.id, 'description', e.target.value)}
                        placeholder="Beschreibung des Dokuments"
                        rows={3}
                        disabled={isUploading}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor={`tags-${item.id}`}>Tags (durch Komma getrennt)</Label>
                      <Input
                        id={`tags-${item.id}`}
                        value={item.formData.tags.join(', ')}
                        onChange={(e) => handleTagsChange(item.id, e.target.value)}
                        placeholder="Tag1, Tag2, Tag3"
                        disabled={isUploading}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`accessLevel-${item.id}`}>Zugriffsebene</Label>
                      <Select
                        value={item.formData.accessLevel}
                        onValueChange={(value: any) => updateFormData(item.id, 'accessLevel', value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Öffentlich</SelectItem>
                          <SelectItem value="restricted">Eingeschränkt</SelectItem>
                          <SelectItem value="admin">Nur Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`projectPhase-${item.id}`}>Projektphase</Label>
                      <Input
                        id={`projectPhase-${item.id}`}
                        value={item.formData.projectPhase}
                        onChange={(e) => updateFormData(item.id, 'projectPhase', e.target.value)}
                        placeholder="z.B. Planung, Ausführung, Fertigstellung"
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Abbrechen
            </Button>
            
            <Button
              onClick={startUpload}
              disabled={isUploading || uploadItems.length === 0}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all px-6 py-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadItems.length} {uploadItems.length === 1 ? 'Dokument' : 'Dokumente'} hochladen
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadModal;
