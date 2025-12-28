/**
 * RequestEditor - Create/Edit procurement requests (Anfragen)
 * 
 * UI Pattern: Matches OfferEditor/InvoiceEditor styling
 * - Gradient cards with colored borders
 * - Consistent form spacing and input styling
 * - Same footer action bar pattern
 * - Optional project assignment
 * 
 * German UI throughout
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Lock, FolderOpen, X, FileText, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProcurementService } from '@/services/procurementService';
import { requestPdfService } from '@/services/requestPdfService';
import { Supplier, SupplierSnapshot, UserSnapshot } from '@/types/suppliers';
import { ProcurementRequest, RequestLineItem, ProjectSnapshot } from '@/types/procurement';
import { MATERIAL_UNITS } from '@/types/materials';
import { useProjects } from '@/hooks/useProjects';
import { buildMailtoUrl, openMailtoUrl, copyToClipboard, MAX_MAILTO_BODY_LEN } from '@/utils/mailto';
import { buildRequestEmailDraft, buildShortRequestEmailDraft } from '@/utils/procurementEmailTemplates';
import { downloadFile } from '@/utils/download';

interface RequestEditorProps {
  supplier: Supplier;
  supplierSnapshot: SupplierSnapshot;
  existingRequest?: ProcurementRequest;
  onSaved: () => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

const RequestEditor: React.FC<RequestEditorProps> = ({
  supplier,
  supplierSnapshot,
  existingRequest,
  onSaved,
  onCancel,
  isReadOnly = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernID = user?.concernID || user?.ConcernID;

  // Form state
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<RequestLineItem[]>([
    { position: 1, description: '', qty: 1, unit: 'Stk' },
  ]);
  const [project, setProject] = useState<ProjectSnapshot | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMarkSentDialog, setShowMarkSentDialog] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);

  // Load projects for selector
  const { allProjects, loading: projectsLoading } = useProjects(concernID || '');

  const procurementService = useMemo(() => {
    if (!concernID) return null;
    return new ProcurementService(concernID);
  }, [concernID]);

  const userSnapshot: UserSnapshot = useMemo(() => ({
    userId: user?.uid || '',
    name: user?.displayName || user?.vorname || user?.email || '',
  }), [user]);

  // Load existing data
  useEffect(() => {
    if (existingRequest) {
      setTitle(existingRequest.title || '');
      setNotes(existingRequest.notes || '');
      setLineItems(existingRequest.lineItems.length > 0 
        ? existingRequest.lineItems 
        : [{ position: 1, description: '', qty: 1, unit: 'Stk' }]
      );
      setProject(existingRequest.project);
    }
  }, [existingRequest]);

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { position: lineItems.length + 1, description: '', qty: 1, unit: 'Stk' },
    ]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    const updated = lineItems.filter((_, i) => i !== index);
    // Reorder positions
    updated.forEach((item, i) => { item.position = i + 1; });
    setLineItems(updated);
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof RequestLineItem, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    if (projectId === '__none__') {
      setProject(undefined);
      return;
    }
    const selectedProject = allProjects.find(p => p.id === projectId);
    if (selectedProject) {
      setProject({
        projectId: selectedProject.id,
        projectNumber: selectedProject.projectNumber || selectedProject.projectName,
        name: selectedProject.projectName,
      });
    }
  };

  // Remove project
  const handleRemoveProject = () => {
    setProject(undefined);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie einen Titel ein.',
        variant: 'destructive',
      });
      return false;
    }

    const validItems = lineItems.filter(li => li.description.trim());
    if (validItems.length === 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte fügen Sie mindestens eine Position hinzu.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Save
  const handleSave = async () => {
    if (!procurementService) return;
    if (!validateForm()) return;

    const validItems = lineItems.filter(li => li.description.trim());

    setIsSaving(true);
    try {
      if (existingRequest?.id) {
        await procurementService.updateRequest(existingRequest.id, {
          title: title.trim(),
          notes: notes.trim() || undefined,
          lineItems: validItems,
          project: project || undefined,
        }, userSnapshot);
        toast({ title: '✅ Anfrage aktualisiert' });
      } else {
        await procurementService.createRequest({
          supplierId: supplier.id,
          supplierSnapshot,
          title: title.trim(),
          status: 'draft',
          lineItems: validItems,
          notes: notes.trim() || undefined,
          project: project || undefined,
        }, userSnapshot);
        toast({ title: '✅ Anfrage erstellt' });
      }
      onSaved();
    } catch (error) {
      console.error('Error saving request:', error);
      toast({
        title: 'Fehler',
        description: 'Anfrage konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF using Cloud Function and trigger download
  const handleGeneratePdf = async () => {
    if (!existingRequest?.id || !concernID) {
      toast({
        title: 'Hinweis',
        description: 'Bitte speichern Sie die Anfrage zuerst.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Check if PDF already exists (avoid regenerating)
      let downloadUrl = pdfUrl;
      let fileName = `Anfrage_${existingRequest.requestNumber || existingRequest.id}.html`;
      
      if (!downloadUrl) {
        toast({ title: '📄 PDF wird erstellt...' });
        const result = await requestPdfService.generateRequestPdf(concernID, existingRequest.id);
        downloadUrl = result.downloadUrl;
        fileName = result.fileName || fileName;
        setPdfUrl(downloadUrl);
      }
      
      // Trigger browser download
      if (downloadUrl) {
        await downloadFile(downloadUrl, fileName);
        toast({ title: '✅ PDF wurde heruntergeladen' });
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'PDF konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Open email client with mailto: link (mirrors Offer workflow)
  const handleOpenEmailClient = async () => {
    if (!existingRequest?.id || !concernID) {
      toast({
        title: 'Hinweis',
        description: 'Bitte speichern Sie die Anfrage zuerst.',
        variant: 'destructive',
      });
      return;
    }

    // Check for supplier email
    const supplierEmail = supplier?.email || supplierSnapshot?.email;
    if (!supplierEmail) {
      toast({
        title: 'Fehler',
        description: 'Keine E-Mail-Adresse für den Lieferanten hinterlegt.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Try to generate PDF and download it (optional - continue without if it fails)
      let currentPdfUrl = pdfUrl;
      let currentFileName = `Anfrage_${existingRequest.requestNumber || existingRequest.id}.html`;
      
      if (!currentPdfUrl && !existingRequest.pdfStoragePath) {
        try {
          toast({ title: '📄 PDF wird erstellt...' });
          const pdfResult = await requestPdfService.generateRequestPdf(concernID, existingRequest.id);
          currentPdfUrl = pdfResult.downloadUrl;
          currentFileName = pdfResult.fileName || currentFileName;
          setPdfUrl(currentPdfUrl);
          
          // Trigger download so user has the PDF locally
          if (currentPdfUrl) {
            await downloadFile(currentPdfUrl, currentFileName);
            toast({ title: '✅ PDF wurde heruntergeladen' });
          }
        } catch (pdfError) {
          console.warn('PDF generation failed, continuing without PDF:', pdfError);
          // Continue without PDF - it's optional
        }
      } else if (currentPdfUrl) {
        // PDF exists, download it before opening email
        await downloadFile(currentPdfUrl, currentFileName);
      }

      // Build email draft with request content
      const userName = user?.displayName || user?.vorname || user?.email || 'Ihr Team';
      const companyName = 'TradeTrackr'; // Could be loaded from concern branding
      
      // Build full email draft first
      const fullDraft = buildRequestEmailDraft({
        request: existingRequest,
        supplierName: supplierSnapshot?.name || supplier?.name || 'Sehr geehrte Damen und Herren',
        supplierEmail,
        userName,
        companyName,
        pdfUrl: currentPdfUrl, // May be undefined if PDF generation failed
      });

      // Check if body exceeds mailto limits
      let emailDraft = fullDraft;
      if (fullDraft.body.length > MAX_MAILTO_BODY_LEN) {
        // Use shortened version with portal link
        emailDraft = buildShortRequestEmailDraft({
          request: existingRequest,
          supplierName: supplierSnapshot?.name || supplier?.name || 'Sehr geehrte Damen und Herren',
          supplierEmail,
          userName,
          companyName,
          pdfUrl: currentPdfUrl,
          portalUrl: window.location.href,
        });
      }

      // Build mailto URL (without Re: prefix for new emails)
      const mailtoResult = buildMailtoUrl({
        to: emailDraft.to,
        subject: emailDraft.subject,
        body: emailDraft.body,
        skipRePrefix: true, // New email, not a reply
      });

      // If body was truncated, copy full content to clipboard
      if (mailtoResult.bodyTruncated || fullDraft.body.length > MAX_MAILTO_BODY_LEN) {
        const copied = await copyToClipboard(fullDraft.body);
        if (copied) {
          toast({
            title: '📋 Vollständiger Text kopiert',
            description: 'Der vollständige E-Mail-Text wurde in die Zwischenablage kopiert.',
          });
        }
      }

      // Open email client
      openMailtoUrl(mailtoResult.url);

      // Show appropriate toast based on whether PDF was included
      if (currentPdfUrl) {
        toast({
          title: '✉️ E-Mail-Client geöffnet',
          description: 'PDF-Link wurde in die E-Mail eingefügt.',
        });
      } else {
        toast({
          title: '✉️ E-Mail-Client geöffnet',
          description: 'E-Mail ohne PDF-Link (PDF-Generierung nicht verfügbar).',
        });
      }

      // Show dialog to confirm marking as sent
      setShowMarkSentDialog(true);

    } catch (error: any) {
      console.error('Error opening email client:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'E-Mail konnte nicht vorbereitet werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Mark request as sent (after user confirms email was sent)
  const handleMarkAsSent = async () => {
    if (!existingRequest?.id || !concernID || !procurementService) return;

    try {
      await procurementService.sendRequest(existingRequest.id, userSnapshot);
      toast({ title: '✅ Anfrage als versendet markiert' });
      setShowMarkSentDialog(false);
      onSaved();
    } catch (error: any) {
      console.error('Error marking as sent:', error);
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Banner for Finalized Requests */}
      {isReadOnly && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              Diese Anfrage ist bereits versendet und kann nicht mehr bearbeitet werden.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Sie können die Anfrage nur ansehen. Um Änderungen vorzunehmen, erstellen Sie eine neue Anfrage.
            </p>
          </div>
        </div>
      )}

      {/* Stammdaten Card */}
      <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📋</span>
            Anfrage-Informationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold text-gray-900">Titel *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Anfrage Elektromaterial"
                disabled={isReadOnly}
                className={`border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold h-11 mt-1 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}
              />
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Lieferant</Label>
              <Input 
                value={supplierSnapshot.name} 
                disabled 
                className="bg-gray-100 border-2 border-blue-300 font-semibold h-11 mt-1"
              />
            </div>
            {existingRequest?.requestNumber && (
              <div>
                <Label className="font-semibold text-gray-900">Anfrage-Nr.</Label>
                <Input 
                  value={existingRequest.requestNumber} 
                  disabled 
                  className="bg-gray-100 border-2 border-blue-300 font-semibold h-11 mt-1 font-mono"
                />
              </div>
            )}
            {existingRequest?.status && (
              <div>
                <Label className="font-semibold text-gray-900">Status</Label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                    existingRequest.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    existingRequest.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    existingRequest.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {existingRequest.status === 'draft' ? 'Entwurf' :
                     existingRequest.status === 'sent' ? 'Versendet' :
                     existingRequest.status === 'cancelled' ? 'Storniert' :
                     existingRequest.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Assignment Card */}
      <Card className="bg-gradient-to-br from-cyan-100 via-cyan-50 to-white border-3 border-cyan-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📁</span>
            Projektzuordnung (optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project ? (
            <div className="flex items-center gap-3 p-3 bg-cyan-50 rounded-lg border-2 border-cyan-200">
              <FolderOpen className="h-5 w-5 text-cyan-600" />
              <div className="flex-1">
                <Badge variant="outline" className="bg-cyan-100 text-cyan-800 border-cyan-300">
                  {project.projectNumber}
                </Badge>
                <span className="ml-2 font-semibold text-gray-800">{project.name}</span>
              </div>
              {!isReadOnly && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveProject}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Entfernen
                </Button>
              )}
            </div>
          ) : (
            <div>
              <Label className="font-semibold text-gray-900">Projekt auswählen</Label>
              <Select
                value=""
                onValueChange={handleProjectSelect}
                disabled={isReadOnly || projectsLoading}
              >
                <SelectTrigger className={`border-2 border-cyan-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 h-11 mt-1 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}>
                  <SelectValue placeholder={projectsLoading ? 'Laden...' : 'Projekt auswählen (optional)'} />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-cyan-300">
                  <SelectItem value="__none__">Kein Projekt</SelectItem>
                  {allProjects
                    .filter(p => p.id && p.id.trim() !== '') // Guard: skip items with empty id
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectNumber || p.projectName} - {p.projectName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-2">
                Das Projekt wird automatisch auf Bestellungen und Lieferungen übertragen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📝</span>
            Positionen
            {!isReadOnly && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={addLineItem}
                className="ml-auto border-2 border-green-400 hover:bg-green-50 hover:border-green-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Position hinzufügen
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-green-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="bg-green-50 grid grid-cols-12 gap-3 p-3 border-b-2 border-green-200">
              <div className="col-span-1 text-center text-sm font-bold text-gray-700">Nr.</div>
              <div className="col-span-5 text-sm font-bold text-gray-700">Beschreibung</div>
              <div className="col-span-2 text-sm font-bold text-gray-700">Menge</div>
              <div className="col-span-2 text-sm font-bold text-gray-700">Einheit</div>
              <div className="col-span-2 text-sm font-bold text-gray-700 text-right">Aktion</div>
            </div>
            
            {/* Table Rows */}
            <div className="divide-y divide-green-100">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-3 items-center hover:bg-green-50/50 transition-colors">
                  <div className="col-span-1 text-center text-gray-500 font-mono font-bold">
                    {item.position}
                  </div>
                  <div className="col-span-5">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Beschreibung eingeben..."
                      disabled={isReadOnly}
                      className={`border-2 border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 h-10 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                      placeholder="Menge"
                      disabled={isReadOnly}
                      min={0}
                      step={0.01}
                      className={`border-2 border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 h-10 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateLineItem(index, 'unit', v)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className={`border-2 border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 h-10 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-green-300">
                        {MATERIAL_UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {!isReadOnly && lineItems.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Position count summary */}
          <div className="mt-3 text-sm text-gray-600">
            {lineItems.filter(li => li.description.trim()).length} von {lineItems.length} Positionen ausgefüllt
          </div>
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📝</span>
            Notizen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Interne Anmerkungen zur Anfrage..."
            disabled={isReadOnly}
            rows={4}
            className={`border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 ${isReadOnly ? 'bg-gray-100' : 'bg-white'}`}
          />
        </CardContent>
      </Card>

      {/* Action Buttons - Matching OfferEditor pattern */}
      <div className="flex flex-wrap gap-3 justify-between pt-4 border-t-2 border-gray-300">
        {/* Left side - Cancel */}
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
        >
          <span className="text-xl mr-2">❌</span> {isReadOnly ? 'Schließen' : 'Abbrechen'}
        </Button>

        {/* Right side - Actions */}
        <div className="flex gap-3">
          {/* PDF Button - only for existing requests */}
          {existingRequest?.id && (
            <Button 
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="border-3 border-orange-400 text-orange-700 hover:bg-orange-50 hover:border-orange-500 font-bold shadow-md hover:shadow-lg transition-all px-6 py-6 text-base"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <FileText className="h-5 w-5 mr-2" />
              )}
              PDF erzeugen
            </Button>
          )}

          {/* Email Button - only for draft requests (opens mail client) */}
          {existingRequest?.id && existingRequest.status === 'draft' && !isReadOnly && (
            <Button 
              variant="outline"
              onClick={handleOpenEmailClient}
              disabled={isSending}
              className="border-3 border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600 font-bold shadow-md hover:shadow-lg transition-all px-6 py-6 text-base"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Mail className="h-5 w-5 mr-2" />
              )}
              E-Mail öffnen
            </Button>
          )}

          {/* Save Button */}
          {!isReadOnly && (
            <Button 
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-10 py-6 text-base border-3 border-[#047ba8] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <span className="text-xl mr-2">{existingRequest ? '💾' : '✨'}</span> 
                  {existingRequest ? 'Anfrage speichern' : 'Anfrage erstellen'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog: Mark as Sent */}
      <Dialog open={showMarkSentDialog} onOpenChange={setShowMarkSentDialog}>
        <DialogContent className="max-w-md bg-white border-4 border-green-500 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              E-Mail versendet?
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Der E-Mail-Client wurde geöffnet. Wurde die Anfrage erfolgreich an den Lieferanten gesendet?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowMarkSentDialog(false)}
              className="border-2 border-gray-400 text-gray-700"
            >
              Nicht markieren
            </Button>
            <Button
              onClick={handleMarkAsSent}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Als versendet markieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestEditor;
