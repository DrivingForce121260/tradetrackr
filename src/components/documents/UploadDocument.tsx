// ============================================================================
// UPLOAD DOCUMENT COMPONENT - Drag & Drop with Routing
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, File, X, AlertCircle, CheckCircle, Loader2, FileText } from 'lucide-react';
import { DocumentManagementService } from '@/services/documentManagementService';
import { projectService, customerService } from '@/services/firestoreService';
import { routeByHeuristics, evaluateConfidence } from '@/lib/documents/routeByHeuristics';
import { computeFileSHA256 } from '@/lib/documents/hashFile';
import { extractQuickMetadata } from '@/lib/documents/extractText';
import { analyzeDocumentWithAI } from '@/lib/documents/documentAI';
import {
  DocumentType,
  DocumentStatus,
  UploadContext,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  DOCUMENT_TYPE_CONFIGS
} from '@/types/documents';
import { AIConfirmModal } from './AIConfirmModal';
import { OcrChoiceModal } from './OcrChoiceModal';
import { DocumentEditForm } from './DocumentEditForm';
import { TypeSelectorModal } from './TypeSelectorModal';
import { AIProcessingModal } from './AIProcessingModal';

interface UploadFileState {
  file: File;
  id: string;
  status: 'pending' | 'hashing' | 'routing' | 'uploading' | 'uploaded' | 'error';
  hash?: string;
  duplicate?: { docId: string; filename: string };
  routedType?: DocumentType;
  confidence?: number;
  reason?: string;
  error?: string;
  docId?: string;
}

interface UploadDocumentProps {
  initialContext?: UploadContext;
  onUploadComplete?: (docIds: string[]) => void;
}

export default function UploadDocument({ initialContext, onUploadComplete }: UploadDocumentProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [files, setFiles] = useState<UploadFileState[]>([]);
  const [context, setContext] = useState<UploadContext>(initialContext || {});
  const [isDragging, setIsDragging] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; projectNumber: string; name: string; clientId?: string; customerUserId?: string; customerName?: string }>>([]);
  const [projectsMap, setProjectsMap] = useState<Map<string, any>>(new Map());
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; company?: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Modals
  const [aiModalFile, setAiModalFile] = useState<UploadFileState | null>(null);
  const [ocrModalFile, setOcrModalFile] = useState<UploadFileState | null>(null);
  const [typeSelectorFile, setTypeSelectorFile] = useState<UploadFileState | null>(null);
  const [aiProcessingFile, setAiProcessingFile] = useState<UploadFileState | null>(null);
  const [formModalData, setFormModalData] = useState<{
    fileId: string;
    docId: string;
    type: DocumentType;
    extractedData: Record<string, any>;
    confidence: number;
  } | null>(null);

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
      console.error('[UploadDocument] Failed to get concernID from localStorage:', error);
    }
    return '';
  };

  const concernId = getConcernID();
  const userId = user?.uid || '';
  
  console.log('[UploadDocument] User info:', { concernId, userId, user });

  // Load projects and customers on mount
  useEffect(() => {
    const loadData = async () => {
      if (!concernId) return;
      
      setLoadingProjects(true);
      try {
        // Load projects and customers in parallel
        const [projectsData, customersData] = await Promise.all([
          projectService.getAll(concernId),
          customerService.getAll(concernId).catch(() => []) // Don't fail if customers can't be loaded
        ]);
        
        // Format projects
        const formattedProjects = projectsData.map((project: any) => ({
          id: project.uid || '',
          projectNumber: String(project.projectNumber || ''),
          name: String((project as any).title || (project as any).name || project.projectNumber || 'Unbenanntes Projekt'),
          clientId: (project as any).clientId,
          customerUserId: (project as any).customerUserId,
          customerName: (project as any).customerName || (project as any).client || (project as any).customerName
        }));
        setProjects(formattedProjects);
        
        // Format customers
        const formattedCustomers = customersData.map((customer: any) => ({
          id: customer.id || customer.uid || '',
          name: customer.name || customer.company || '',
          company: customer.company || customer.name || ''
        }));
        setCustomers(formattedCustomers);
        
        // Create a map for quick lookup
        const map = new Map();
        projectsData.forEach((project: any) => {
          const id = project.uid || '';
          if (id) {
            map.set(id, project);
          }
        });
        setProjectsMap(map);
      } catch (error) {
        console.error('[UploadDocument] Failed to load data:', error);
        toast({
          title: 'Fehler',
          description: 'Daten konnten nicht geladen werden.',
          variant: 'destructive'
        });
      } finally {
        setLoadingProjects(false);
      }
    };

    loadData();
  }, [concernId]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle file browse
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  // Process selected files
  const processFiles = async (selectedFiles: File[]) => {
    const validFiles: UploadFileState[] = [];
    
    for (const file of selectedFiles) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({
          title: 'Ungültiger Dateityp',
          description: `${file.name} ist kein unterstützter Dateityp.`,
          variant: 'destructive'
        });
        continue;
      }
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: 'Datei zu groß',
          description: `${file.name} überschreitet die maximale Größe von 50 MB.`,
          variant: 'destructive'
        });
        continue;
      }
      
      const fileState: UploadFileState = {
        file,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending'
      };
      
      validFiles.push(fileState);
    }
    
    setFiles(prev => [...prev, ...validFiles]);
    
    // Start processing each file
    for (const fileState of validFiles) {
      await processFile(fileState);
    }
  };

  // Process individual file: hash -> route -> upload
  const processFile = async (fileState: UploadFileState) => {
    if (!concernId || !userId) return;
    
    try {
      const docService = new DocumentManagementService(concernId, userId);
      
      // Step 1: Compute hash
      updateFileState(fileState.id, { status: 'hashing' });
      const hash = await computeFileSHA256(fileState.file);
      updateFileState(fileState.id, { hash });
      
      // Step 2: Check for duplicates
      const duplicate = await docService.checkDuplicateByHash(hash);
      if (duplicate.exists) {
        updateFileState(fileState.id, {
          status: 'error',
          duplicate: { docId: duplicate.docId!, filename: duplicate.filename! },
          error: 'Duplikat gefunden'
        });
        return;
      }
      
      // Step 3: Check if image file - ALWAYS ask user first
      if (fileState.file.type.startsWith('image/')) {
        console.log('[UploadDocument] Image file detected, asking user for type...');
        updateFileState(fileState.id, {
          status: 'pending',
          reason: 'Bitte wählen: Normales Bild oder gescanntes Dokument?'
        });
        setOcrModalFile(fileState);
        return; // Stop processing until user answers
      }
      
      // Step 4: Route non-image documents
      updateFileState(fileState.id, { status: 'routing' });
      const metadata = extractQuickMetadata(fileState.file);
      const routingDecision = routeByHeuristics(
        { name: fileState.file.name, type: fileState.file.type },
        context,
        null // No OCR text yet
      );
      
      const evaluation = evaluateConfidence(routingDecision);
      
      if (evaluation.action === 'route' && routingDecision) {
        // High confidence - auto-route
        updateFileState(fileState.id, {
          routedType: routingDecision.type,
          confidence: routingDecision.confidence,
          reason: routingDecision.reason
        });
        await uploadFile(fileState.id, routingDecision.type!, routingDecision.confidence, routingDecision);
      } else if (evaluation.action === 'review' && routingDecision) {
        // Medium confidence - needs review
        updateFileState(fileState.id, {
          routedType: routingDecision.type,
          confidence: routingDecision.confidence,
          reason: routingDecision.reason,
          status: 'pending'
        });
      } else {
        // Low/no confidence - needs AI or manual selection
        updateFileState(fileState.id, {
          status: 'pending',
          reason: 'Kein Dokumenttyp erkannt - Bitte wählen Sie manuell oder starten Sie die KI-Analyse'
        });
      }
      
    } catch (error) {
      console.error('[UploadDocument] Processing failed:', error);
      updateFileState(fileState.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Verarbeitung fehlgeschlagen'
      });
    }
  };

  // Upload file to Firebase
  const uploadFile = async (
    fileId: string,
    docType: DocumentType,
    confidence: number,
    routeDecision: any
  ) => {
    const fileState = files.find(f => f.id === fileId);
    if (!fileState) return;
    
    if (!concernId || !userId) {
      const errorMsg = !concernId 
        ? 'ConcernID fehlt. Bitte laden Sie die Seite neu oder melden Sie sich erneut an.'
        : 'Benutzer-ID fehlt. Bitte melden Sie sich erneut an.';
      
      updateFileState(fileId, {
        status: 'error',
        error: errorMsg
      });
      
      toast({
        title: 'Upload nicht möglich',
        description: errorMsg,
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const docService = new DocumentManagementService(concernId, userId);
      updateFileState(fileId, { status: 'uploading' });
      
      const docId = await docService.uploadDocument(
        fileState.file,
        context,
        {
          hash: fileState.hash,
          type: docType,
          confidence,
          routeDecision
        }
      );
      
      updateFileState(fileId, {
        status: 'uploaded',
        docId
      });
      
      toast({
        title: 'Datei hochgeladen',
        description: `${fileState.file.name} wurde erfolgreich hochgeladen.`
      });
      
    } catch (error) {
      console.error('[UploadDocument] Upload failed:', error);
      
      let errorMessage = error instanceof Error ? error.message : 'Upload fehlgeschlagen';
      
      // Check for specific Firebase errors
      if (errorMessage.includes('storage/unauthorized')) {
        errorMessage = 'Keine Berechtigung für Upload. Bitte laden Sie die Seite neu (F5) und versuchen Sie es erneut.';
      } else if (errorMessage.includes('ConcernID')) {
        errorMessage = 'ConcernID fehlt. Bitte laden Sie die Seite neu (F5).';
      }
      
      updateFileState(fileId, {
        status: 'error',
        error: errorMessage
      });
      
      toast({
        title: 'Upload fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Update file state
  const updateFileState = (fileId: string, updates: Partial<UploadFileState>) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
  };

  // Remove file from list
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Handle AI analysis request
  const handleRequestAI = (fileState: UploadFileState) => {
    setAiModalFile(fileState);
  };

  // Handle manual type selection
  const handleManualSelect = (fileState: UploadFileState) => {
    setTypeSelectorFile(fileState);
  };

  // Render status badge
  const renderStatusBadge = (fileState: UploadFileState) => {
    switch (fileState.status) {
      case 'pending':
        return <Badge variant="outline">Wartend</Badge>;
      case 'hashing':
        return <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Prüfe...</Badge>;
      case 'routing':
        return <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Routing...</Badge>;
      case 'uploading':
        return <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Upload...</Badge>;
      case 'uploaded':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Hochgeladen</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Fehler</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Context Selection - Enhanced */}
      <Card className="border-2 border-gray-300 shadow-md">
        <CardHeader className="border-b-2 border-gray-200 bg-gray-50">
          <h3 className="font-bold text-lg text-gray-900">Upload-Kontext (Optional)</h3>
          <p className="text-sm text-gray-600">Projekt oder Kunde zuordnen für bessere automatische Erkennung</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">Projekt</Label>
              {loadingProjects ? (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lade Projekte...
                </div>
              ) : (
                <Select
                  value={context.projectId || undefined}
                  onValueChange={(value) => {
                    console.log('[UploadDocument] Project selection changed:', value);
                    
                    if (value === '__none__') {
                      setContext(prev => {
                        console.log('[UploadDocument] Clearing project and clientId');
                        return { ...prev, projectId: null, clientId: null };
                      });
                    } else {
                      // Find the selected project and extract clientId immediately
                      // First try from projectsMap (full project data), then from formatted projects array
                      const fullProject = projectsMap.get(value);
                      const formattedProject = projects.find(p => p.id === value);
                      
                      console.log('[UploadDocument] Looking up project:', {
                        value,
                        hasFullProject: !!fullProject,
                        hasFormattedProject: !!formattedProject,
                        fullProjectKeys: fullProject ? Object.keys(fullProject) : [],
                        fullProjectSample: fullProject ? {
                          clientId: (fullProject as any).clientId,
                          customerUserId: (fullProject as any).customerUserId,
                          customerId: (fullProject as any).customerId,
                          customerName: (fullProject as any).customerName,
                          client: (fullProject as any).client,
                          customer: (fullProject as any).customer
                        } : null,
                        formattedProjectData: formattedProject
                      });
                      
                      let clientId: string | null = null;
                      
                      // Try different possible fields for customer ID from full project data
                      if (fullProject) {
                        clientId = (fullProject as any).clientId || 
                                   (fullProject as any).customerUserId || 
                                   (fullProject as any).customerId ||
                                   (fullProject as any).customerUserId ||
                                   null;
                        
                        console.log('[UploadDocument] Extracted from fullProject:', {
                          clientId: (fullProject as any).clientId,
                          customerUserId: (fullProject as any).customerUserId,
                          customerId: (fullProject as any).customerId,
                          result: clientId
                        });
                      }
                      
                      // If not found in full project, try from formatted project
                      if (!clientId && formattedProject) {
                        clientId = formattedProject.clientId || 
                                   formattedProject.customerUserId || 
                                   null;
                        
                        console.log('[UploadDocument] Extracted from formattedProject:', {
                          clientId: formattedProject.clientId,
                          customerUserId: formattedProject.customerUserId,
                          result: clientId
                        });
                      }
                      
                      // If still no clientId, try to find it by customer name
                      if (!clientId && customers.length > 0) {
                        const customerName = (fullProject as any)?.customerName || 
                                           (fullProject as any)?.client || 
                                           (formattedProject as any)?.customerName ||
                                           null;
                        
                        if (customerName) {
                          // Try to find customer by name or company
                          const foundCustomer = customers.find(c => 
                            c.name?.toLowerCase() === customerName.toLowerCase() ||
                            c.company?.toLowerCase() === customerName.toLowerCase() ||
                            c.name?.toLowerCase().includes(customerName.toLowerCase()) ||
                            c.company?.toLowerCase().includes(customerName.toLowerCase())
                          );
                          
                          if (foundCustomer) {
                            clientId = foundCustomer.id;
                            console.log('[UploadDocument] Found customer by name:', {
                              customerName,
                              foundCustomerId: foundCustomer.id,
                              foundCustomerName: foundCustomer.name
                            });
                          }
                        }
                      }
                      
                      console.log('[UploadDocument] Final clientId to set:', clientId);
                      
                      // Immediately update context with both projectId and clientId
                      setContext(prev => {
                        const newContext = { 
                          ...prev, 
                          projectId: value || null,
                          clientId: clientId || null // Set to null if not found, don't keep previous
                        };
                        console.log('[UploadDocument] Updating context:', newContext);
                        return newContext;
                      });
                    }
                  }}
                >
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] mt-2">
                    <SelectValue placeholder="Projekt auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Kein Projekt</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="font-semibold">Kunde</Label>
              <Input
                placeholder="Kunden-ID (wird automatisch ausgefüllt)"
                value={context.clientId || ''}
                onChange={(e) => setContext({ ...context, clientId: e.target.value || null })}
                className="border-2 border-gray-300 focus:border-[#058bc0] mt-2"
                readOnly={!!context.projectId && !!context.clientId}
              />
              {context.projectId && context.clientId && (
                <p className="text-xs text-gray-500 mt-1">
                  ✓ Automatisch aus Projekt übernommen
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone - Bold and Eye-Catching */}
      <Card
        className={`p-12 border-4 border-dashed text-center transition-all duration-300 shadow-lg ${
          isDragging 
            ? 'border-[#058bc0] bg-gradient-to-br from-blue-100 to-cyan-100 scale-105 shadow-2xl' 
            : 'border-gray-400 hover:border-[#058bc0] hover:bg-blue-50/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className={`transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}>
          <div className="bg-gradient-to-br from-[#058bc0] to-[#047ba8] p-4 rounded-2xl inline-block mb-4 shadow-lg">
            <Upload className="h-20 w-20 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900">Dateien hochladen</h3>
          <p className="text-lg text-gray-700 mb-6 font-medium">
            Dateien hierher ziehen oder klicken zum Durchsuchen
          </p>
          <Input
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button 
              type="button" 
              size="lg"
              className="bg-[#058bc0] hover:bg-[#047ba8] text-white font-bold px-8 py-6 text-lg border-2 border-[#047ba8] shadow-lg hover:shadow-xl transition-all"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-5 w-5 mr-2" />
              Dateien auswählen
            </Button>
          </label>
          <div className="mt-6 p-4 bg-gray-100 rounded-lg border-2 border-gray-300 inline-block">
            <p className="text-sm text-gray-700 font-semibold">
              📄 PDF • 📝 DOCX • 📊 XLSX • 📋 CSV • 🖼️ PNG, JPG, TIFF
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Maximale Dateigröße: <strong>50 MB</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* File List - Enhanced */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#058bc0]" />
            Hochgeladene Dateien ({files.length})
          </h3>
          {files.map(fileState => (
            <Card key={fileState.id} className="border-2 border-gray-300 shadow-md hover:shadow-lg transition-all hover:border-[#058bc0]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-5 w-5 text-gray-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{fileState.file.name}</span>
                      {renderStatusBadge(fileState)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {(fileState.file.size / 1024).toFixed(1)} KB
                    </p>
                    
                    {fileState.routedType && (
                      <div className="mt-2">
                        <Badge variant="outline" className="mr-2">
                          {DOCUMENT_TYPE_CONFIGS.find(c => c.slug === fileState.routedType)?.labelDe || fileState.routedType}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          Konfidenz: {((fileState.confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    
                    {fileState.reason && (
                      <p className="text-sm text-gray-600 mt-1">{fileState.reason}</p>
                    )}
                    
                    {fileState.error && (
                      <p className="text-sm text-red-600 mt-1">{fileState.error}</p>
                    )}
                    
                    {fileState.duplicate && (
                      <p className="text-sm text-orange-600 mt-1">
                        Duplikat von: {fileState.duplicate.filename}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {fileState.status === 'pending' && !fileState.routedType && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleRequestAI(fileState)}>
                        AI-Analyse
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleManualSelect(fileState)}>
                        Manuell wählen
                      </Button>
                    </>
                  )}
                  
                  {fileState.status === 'pending' && fileState.routedType && fileState.confidence && fileState.confidence < 0.9 && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => uploadFile(fileState.id, fileState.routedType!, fileState.confidence!, {})}
                      >
                        Bestätigen
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleManualSelect(fileState)}>
                        Ändern
                      </Button>
                    </>
                  )}
                  
                  <Button size="sm" variant="ghost" onClick={() => removeFile(fileState.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {aiModalFile && (
        <AIConfirmModal
          file={aiModalFile}
          onConfirm={async () => {
            const fileToProcess = aiModalFile;
            setAiModalFile(null);
            
            try {
              // First upload the file to get a docId
              updateFileState(fileToProcess.id, { status: 'uploading' });
              
              const docService = new DocumentManagementService(concernId, userId);
              const docId = await docService.uploadDocument(
                fileToProcess.file,
                context,
                {
                  hash: fileToProcess.hash,
                  type: null, // Type unknown yet
                  confidence: null
                }
              );
              
              console.log('[UploadDocument] Document uploaded for AI analysis:', docId);
              
              // Show processing modal
              setAiProcessingFile(fileToProcess);
              
              // Call AI analysis Cloud Function
              const aiResult = await analyzeDocumentWithAI(docId);
              
              console.log('[UploadDocument] AI analysis complete:', aiResult);
              
              // Close processing modal
              setAiProcessingFile(null);
              
              // Update file state with result
              updateFileState(fileToProcess.id, {
                status: 'uploaded',
                docId,
                routedType: aiResult.type as any,
                confidence: aiResult.confidence,
                reason: aiResult.reason
              });
              
              // Open form modal with extracted data
              setFormModalData({
                fileId: fileToProcess.id,
                docId,
                type: aiResult.type as DocumentType,
                extractedData: aiResult.extractedData || {},
                confidence: aiResult.confidence || 0
              });
              
              toast({
                title: 'KI-Analyse erfolgreich',
                description: `Dokument analysiert. Bitte prüfen Sie die extrahierten Daten.`,
              });
              
            } catch (error) {
              console.error('[UploadDocument] AI analysis failed:', error);
              
              setAiProcessingFile(null);
              
              updateFileState(fileToProcess.id, {
                status: 'error',
                error: error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen'
              });
              
              toast({
                title: 'KI-Analyse fehlgeschlagen',
                description: error instanceof Error ? error.message : 'Unbekannter Fehler',
                variant: 'destructive'
              });
            }
          }}
          onCancel={() => setAiModalFile(null)}
        />
      )}
      
      {aiProcessingFile && (
        <AIProcessingModal
          file={aiProcessingFile}
          isProcessing={true}
        />
      )}
      
      {ocrModalFile && (
        <OcrChoiceModal
          file={ocrModalFile}
          onChoice={async (isScanned) => {
            const fileId = ocrModalFile.id;
            const fileToProcess = ocrModalFile;
            setOcrModalFile(null);
            
            if (!isScanned) {
              // User selected "Reines Bild" - store as photo_doc immediately
              console.log('[UploadDocument] User selected: Normal image file');
              updateFileState(fileId, {
                routedType: 'quality.photo_doc',
                confidence: 0.95,
                reason: 'Benutzer bestätigt: Normales Bild',
                status: 'pending'
              });
              
              // Upload immediately
              await uploadFile(
                fileId, 
                'quality.photo_doc', 
                0.95, 
                { ruleId: 'USER_CHOICE', reason: 'Benutzer wählte: Normales Bild' }
              );
              
            } else {
              // User selected "Gescannt/Fotografiert" - Start AI analysis immediately
              console.log('[UploadDocument] User selected: Scanned document - Starting AI analysis immediately');
              
              try {
                // Upload file first
                updateFileState(fileId, { status: 'uploading' });
                
                if (!concernId || !userId) {
                  throw new Error('ConcernID oder UserID fehlt');
                }
                
                const docService = new DocumentManagementService(concernId, userId);
                const docId = await docService.uploadDocument(
                  fileToProcess.file,
                  context,
                  {
                    hash: fileToProcess.hash,
                    type: null,
                    confidence: null
                  }
                );
                
                console.log('[UploadDocument] Document uploaded for AI analysis:', docId);
                
                // Show AI processing modal
                setAiProcessingFile(fileToProcess);
                
                // Call AI analysis
                const aiResult = await analyzeDocumentWithAI(docId);
                
                console.log('[UploadDocument] AI analysis complete:', aiResult);
                
                // Close processing modal
                setAiProcessingFile(null);
                
                // Update file state
                updateFileState(fileId, {
                  status: 'uploaded',
                  docId,
                  routedType: aiResult.type as any,
                  confidence: aiResult.confidence,
                  reason: aiResult.reason
                });
                
                // Open form modal with extracted data
                setFormModalData({
                  fileId,
                  docId,
                  type: aiResult.type as DocumentType,
                  extractedData: aiResult.extractedData || {},
                  confidence: aiResult.confidence || 0
                });
                
                toast({
                  title: 'KI-Analyse erfolgreich',
                  description: `Dokument analysiert. Bitte prüfen Sie die extrahierten Daten.`,
                });
                
              } catch (error) {
                console.error('[UploadDocument] AI analysis failed:', error);
                setAiProcessingFile(null);
                
                updateFileState(fileId, {
                  status: 'error',
                  error: error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen'
                });
                
                toast({
                  title: 'KI-Analyse fehlgeschlagen',
                  description: error instanceof Error ? error.message : 'Unbekannter Fehler',
                  variant: 'destructive'
                });
              }
            }
          }}
          onCancel={() => setOcrModalFile(null)}
        />
      )}
      
      {typeSelectorFile && (
        <TypeSelectorModal
          file={typeSelectorFile}
          context={context}
          onSelect={(docType) => {
            uploadFile(typeSelectorFile.id, docType, 1.0, { ruleId: 'MANUAL', reason: 'Manuell ausgewählt' });
            setTypeSelectorFile(null);
          }}
          onCancel={() => setTypeSelectorFile(null)}
        />
      )}
      
      {formModalData && (
        <DocumentEditForm
          open={true}
          onClose={() => {
            setFormModalData(null);
            toast({
              title: 'Abgebrochen',
              description: 'Dokument wurde nicht gespeichert.',
            });
          }}
          documentType={formModalData.type}
          extractedData={formModalData.extractedData}
          confidence={formModalData.confidence}
          onSave={async (data) => {
            console.log('[UploadDocument] User confirmed extracted data:', data);
            
            // Update Firestore document with confirmed data
            try {
              const docService = new DocumentManagementService(concernId, userId);
              await docService.updateDocument(formModalData.docId, {
                notes: JSON.stringify(data, null, 2), // Store extracted data in notes for now
                status: 'stored'
              });
              
              updateFileState(formModalData.fileId, {
                status: 'uploaded',
                reason: 'Dokument gespeichert mit KI-extrahierten Daten'
              });
              
              toast({
                title: 'Dokument gespeichert',
                description: `${formModalData.type} wurde erfolgreich mit den extrahierten Daten gespeichert.`,
              });
              
              setFormModalData(null);
              
            } catch (error) {
              console.error('[UploadDocument] Failed to save document data:', error);
              toast({
                title: 'Speichern fehlgeschlagen',
                description: error instanceof Error ? error.message : 'Unbekannter Fehler',
                variant: 'destructive'
              });
            }
          }}
        />
      )}
    </div>
  );
}

