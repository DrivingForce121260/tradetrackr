// ============================================================================
// DOCUMENT EDIT FORM - Edit AI-extracted document data
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Save, 
  X,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Brain
} from 'lucide-react';
import { DocumentType, DOCUMENT_TYPE_CONFIGS } from '@/types/documents';
import { getDocumentFields, DocumentField } from '@/lib/documents/documentFields';

interface DocumentEditFormProps {
  open: boolean;
  onClose: () => void;
  documentType: DocumentType;
  extractedData: Record<string, any>;
  confidence: number;
  onSave: (formData: Record<string, any>) => Promise<void>;
}

export function DocumentEditForm({
  open,
  onClose,
  documentType,
  extractedData,
  confidence,
  onSave
}: DocumentEditFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const typeConfig = DOCUMENT_TYPE_CONFIGS.find(c => c.slug === documentType);
  const fields = getDocumentFields(documentType);

  // Initialize form data from extracted data
  useEffect(() => {
    if (extractedData) {
      setFormData(extractedData);
      
      // Check for missing required fields
      const missing = fields
        .filter(f => f.required && !extractedData[f.name])
        .map(f => f.labelDe);
      
      setMissingFields(missing);
    }
  }, [extractedData, fields]);

  const handleSave = async () => {
    // Validate required fields
    const missing = fields
      .filter(f => f.required && !formData[f.name])
      .map(f => f.labelDe);
    
    if (missing.length > 0) {
      toast({
        title: 'Pflichtfelder fehlen',
        description: `Bitte füllen Sie folgende Felder aus: ${missing.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('[DocumentEditForm] Save failed:', error);
      toast({
        title: 'Speichern fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: DocumentField) => {
    const value = formData[field.name] || '';
    const isMissing = field.required && !value;

    return (
      <div key={field.name} className="space-y-2">
        <Label className="flex items-center gap-2">
          {field.labelDe}
          {field.required && <Badge variant="destructive" className="text-xs">Pflicht</Badge>}
          {isMissing && <AlertCircle className="h-4 w-4 text-red-500" />}
        </Label>

        {field.type === 'textarea' ? (
          <Textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            placeholder={field.placeholder || field.description || `${field.labelDe} eingeben`}
            className={`border-2 ${isMissing ? 'border-red-400' : 'border-gray-300'} focus:border-[#058bc0]`}
            rows={4}
          />
        ) : field.type === 'select' ? (
          <Select 
            value={value} 
            onValueChange={(val) => setFormData({ ...formData, [field.name]: val })}
          >
            <SelectTrigger className={`border-2 ${isMissing ? 'border-red-400' : 'border-gray-300'} focus:border-[#058bc0]`}>
              <SelectValue placeholder={`${field.labelDe} auswählen`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            placeholder={field.placeholder || `${field.labelDe} eingeben`}
            className={`border-2 ${isMissing ? 'border-red-400' : 'border-gray-300'} focus:border-[#058bc0]`}
          />
        )}

        {field.description && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] border-2 border-[#058bc0] shadow-2xl">
        <DialogHeader className="border-b-2 border-gray-200 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-[#058bc0] to-[#047ba8] p-3 rounded-xl shadow-lg">
              <FileText className="h-7 w-7 text-white" />
            </div>
            Dokumentdaten prüfen und speichern
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-3">
            {/* Document Type Info */}
            <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <Brain className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Erkannter Typ: <span className="text-[#058bc0]">{typeConfig?.labelDe}</span>
                </p>
                <p className="text-xs text-gray-600">
                  KI-Konfidenz: {Math.round(confidence * 100)}%
                </p>
              </div>
              {confidence >= 0.85 ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-500" />
              )}
            </div>

            {/* Missing Fields Warning */}
            {missingFields.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Fehlende Pflichtfelder ({missingFields.length}):
                    </p>
                    <p className="text-xs text-amber-800">
                      {missingFields.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Form Fields */}
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {fields.map(field => renderField(field))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex gap-3 sm:justify-between pt-4 border-t-2 border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-2 border-gray-300 font-semibold px-6"
          >
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || missingFields.length > 0}
            className="bg-gradient-to-r from-[#058bc0] to-[#047ba8] hover:from-[#047ba8] hover:to-[#036a8f] text-white font-bold px-8 border-2 border-[#047ba8] shadow-lg"
          >
            {isSaving ? (
              <>
                <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Dokument speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}













