/**
 * Material OCR Import Dialog
 * 
 * Displays scanned invoice data and allows bulk import of materials
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Building2, 
  Package, 
  AlertCircle, 
  CheckCircle2,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MaterialOCRResult } from '@/services/materialOCRService';

interface MaterialOCRImportDialogProps {
  open: boolean;
  onClose: () => void;
  ocrResult: MaterialOCRResult | null;
  onImport: (materials: any[], supplierInfo: any, documentInfo: any) => Promise<void>;
}

export const MaterialOCRImportDialog: React.FC<MaterialOCRImportDialogProps> = ({
  open,
  onClose,
  ocrResult,
  onImport
}) => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [missingDataInputs, setMissingDataInputs] = useState<Record<string, string>>({});

  // Initialize materials when dialog opens
  React.useEffect(() => {
    if (ocrResult?.materials) {
      setMaterials(ocrResult.materials.map((m, idx) => ({ ...m, id: idx })));
    }
  }, [ocrResult]);

  const handleMissingDataInput = (noteIndex: number, value: string) => {
    setMissingDataInputs(prev => ({
      ...prev,
      [noteIndex]: value
    }));
  };

  if (!ocrResult) return null;

  const { documentInfo, supplierInfo, bankDetails, totals } = ocrResult;
  
  // Use notes directly from Cloud Function (includes mandatory field validation)
  // Add optional nice-to-have fields
  const generateMissingDataNotes = (): string[] => {
    const notes: string[] = [...(ocrResult.notes || [])];
    
    // Add optional fields (not mandatory but useful)
    if (!documentInfo?.customerNumber) notes.push('Optional: Kundennummer fehlt');
    if (!documentInfo?.orderNumber) notes.push('Optional: Bestellnummer fehlt');
    if (!documentInfo?.orderDate) notes.push('Optional: Bestelldatum fehlt');
    if (!supplierInfo?.email) notes.push('Optional: Lieferanten-Email fehlt');
    if (!supplierInfo?.phone) notes.push('Optional: Lieferanten-Telefon fehlt');
    if (!supplierInfo?.website) notes.push('Optional: Lieferanten-Website fehlt');
    if (!bankDetails?.iban) notes.push('Optional: IBAN fehlt');
    if (!bankDetails?.bic) notes.push('Optional: BIC fehlt');
    
    return notes;
  };
  
  const notes = generateMissingDataNotes();

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // Merge missing data inputs into supplier and document info
      const enrichedSupplierInfo = { ...supplierInfo };
      const enrichedDocumentInfo = { ...documentInfo };
      
      // Map missing data inputs back to fields based on note text
      Object.entries(missingDataInputs).forEach(([noteIndex, value]) => {
        if (!value) return; // Skip empty inputs
        
        const note = notes[parseInt(noteIndex)];
        
        // Match note text to field and update accordingly
        if (note.includes('Email')) enrichedSupplierInfo.email = value;
        else if (note.includes('Telefon')) enrichedSupplierInfo.phone = value;
        else if (note.includes('Adresse') || note.includes('Straße')) enrichedSupplierInfo.street = value;
        else if (note.includes('Dokumentennummer')) enrichedDocumentInfo.documentNumber = value;
        else if (note.includes('Dokumentendatum')) enrichedDocumentInfo.documentDate = value;
        else if (note.includes('Kundennummer')) enrichedDocumentInfo.customerNumber = value;
        else if (note.includes('Bestellnummer')) enrichedDocumentInfo.orderNumber = value;
        else if (note.includes('Lieferantenname')) enrichedSupplierInfo.name = value;
        else if (note.includes('Steuernummer') && !note.includes('USt')) enrichedSupplierInfo.taxNumber = value;
        else if (note.includes('USt-IdNr')) enrichedSupplierInfo.vatNumber = value;
        else if (note.includes('IBAN')) {
          if (!ocrResult.bankDetails) ocrResult.bankDetails = { bankName: '', iban: '', bic: '' };
          ocrResult.bankDetails.iban = value;
        }
      });
      
      await onImport(materials, enrichedSupplierInfo, enrichedDocumentInfo);
      toast({
        title: '✅ Import erfolgreich',
        description: `${materials.length} Material(ien) wurden importiert.`
      });
      onClose();
    } catch (error: any) {
      toast({
        title: '❌ Import fehlgeschlagen',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    setMaterials(prev => prev.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
  };

  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  // Check if a field is missing/invalid
  const isMissingField = (value: any): boolean => {
    return !value || value === '' || value === 0;
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'Rechnung': return 'bg-green-500';
      case 'Lieferschein': return 'bg-blue-500';
      case 'Auftragsbestätigung': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden bg-white border-4 border-[#058bc0] shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <FileText className="h-6 w-6" />
            Material-Import aus gescanntem Dokument
          </DialogTitle>
          <div className="text-sm text-blue-100 mt-2 flex items-center gap-4">
            <Badge className={`${getDocumentTypeColor(documentInfo.documentType)} text-white`}>
              {documentInfo.documentType}
            </Badge>
            <span>Nr: {documentInfo.documentNumber || 'N/A'}</span>
            <span>Datum: {documentInfo.documentDate || 'N/A'}</span>
            <span>Lieferant: {supplierInfo.name || 'Unbekannt'}</span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] px-6">
          {/* Supplier Information */}
          <Card className="mb-4 border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Lieferanteninformation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="font-semibold">Name:</span> {supplierInfo.name || '-'}
              </div>
              <div>
                <span className="font-semibold">Adresse:</span> {supplierInfo.street || '-'}, {supplierInfo.postalCode} {supplierInfo.city}
              </div>
              <div>
                <span className="font-semibold">Land:</span> {supplierInfo.country || '-'}
              </div>
              <div>
                <span className="font-semibold">Telefon:</span> {supplierInfo.phone || '-'}
              </div>
              <div>
                <span className="font-semibold">Email:</span> {supplierInfo.email || '-'}
              </div>
              <div>
                <span className="font-semibold">Website:</span> {supplierInfo.website || '-'}
              </div>
              <div>
                <span className="font-semibold">Steuernr.:</span> {supplierInfo.taxNumber || '-'}
              </div>
              <div>
                <span className="font-semibold">USt-IdNr.:</span> {supplierInfo.vatNumber || '-'}
              </div>
              <div>
                <span className="font-semibold">Bank:</span> {bankDetails.bankName || '-'}
              </div>
              {bankDetails.iban && (
                <div className="col-span-2">
                  <span className="font-semibold">IBAN:</span> {bankDetails.iban} ({bankDetails.bic || 'BIC N/A'})
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Metadata */}
          <Card className="mb-4 border-2 border-green-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                Dokumentendaten
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="font-semibold">Kunden-Nr.:</span> {documentInfo.customerNumber || '-'}
              </div>
              <div>
                <span className="font-semibold">Bestelldatum:</span> {documentInfo.orderDate || '-'}
              </div>
              <div>
                <span className="font-semibold">Bestellnr.:</span> {documentInfo.orderNumber || '-'}
              </div>
              <div>
                <span className="font-semibold">Zwischensumme:</span> €{totals.subtotal.toFixed(2)}
              </div>
              <div>
                <span className="font-semibold">MwSt ({totals.taxRate}%):</span> €{totals.taxAmount.toFixed(2)}
              </div>
              <div>
                <span className="font-semibold text-lg">Gesamt:</span> <span className="text-lg font-bold text-green-600">€{totals.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Materials Table */}
          <Card className="mb-4 border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                Materialien ({materials.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left p-2 font-semibold">#</th>
                      <th className="text-left p-2 font-semibold">Material</th>
                      <th className="text-left p-2 font-semibold">Art.-Nr.</th>
                      <th className="text-right p-2 font-semibold">Menge</th>
                      <th className="text-left p-2 font-semibold">Einheit</th>
                      <th className="text-right p-2 font-semibold">Einzelpreis</th>
                      <th className="text-right p-2 font-semibold">Gesamt</th>
                      <th className="text-left p-2 font-semibold">Kategorie</th>
                      <th className="text-center p-2 font-semibold">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">
                          {editingIndex === index ? (
                            <Input
                              value={material.name}
                              onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                              className={`h-8 text-sm ${isMissingField(material.name) ? 'border-2 border-red-500 bg-red-50' : ''}`}
                            />
                          ) : (
                            <div className={`max-w-xs truncate ${isMissingField(material.name) ? 'text-red-600 font-semibold' : ''}`} title={material.name}>
                              {material.name || '⚠️ Fehlt!'}
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          {editingIndex === index ? (
                            <Input
                              value={material.itemNumber}
                              onChange={(e) => updateMaterial(index, 'itemNumber', e.target.value)}
                              className="h-8 text-sm w-24"
                            />
                          ) : (
                            material.itemNumber || '-'
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {editingIndex === index ? (
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value))}
                              className={`h-8 text-sm w-20 text-right ${isMissingField(material.quantity) ? 'border-2 border-red-500 bg-red-50' : ''}`}
                            />
                          ) : (
                            <span className={isMissingField(material.quantity) ? 'text-red-600 font-semibold' : ''}>
                              {material.quantity || '⚠️ 0'}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {editingIndex === index ? (
                            <Input
                              value={material.unit}
                              onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                              className={`h-8 text-sm w-16 ${isMissingField(material.unit) ? 'border-2 border-red-500 bg-red-50' : ''}`}
                            />
                          ) : (
                            <span className={isMissingField(material.unit) ? 'text-red-600 font-semibold' : ''}>
                              {material.unit || '⚠️ Fehlt!'}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {editingIndex === index ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={material.unitPrice}
                              onChange={(e) => updateMaterial(index, 'unitPrice', parseFloat(e.target.value))}
                              className={`h-8 text-sm w-24 text-right ${isMissingField(material.unitPrice) ? 'border-2 border-red-500 bg-red-50' : ''}`}
                            />
                          ) : (
                            <span className={isMissingField(material.unitPrice) ? 'text-red-600 font-semibold' : ''}>
                              {material.unitPrice ? `€${material.unitPrice.toFixed(2)}` : '⚠️ €0.00'}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right font-semibold">
                          €{material.totalPrice.toFixed(2)}
                        </td>
                        <td className="p-2">
                          {editingIndex === index ? (
                            <Input
                              value={material.category}
                              onChange={(e) => updateMaterial(index, 'category', e.target.value)}
                              className="h-8 text-sm w-32"
                            />
                          ) : (
                            material.category || '-'
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex gap-1 justify-center">
                            {editingIndex === index ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingIndex(null)}
                                className="h-7 w-7 p-0"
                              >
                                <Save className="h-4 w-4 text-green-600" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingIndex(index)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMaterial(index)}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Notes / Warnings with Input Fields - ALWAYS SHOWN */}
          <Card className="mb-4 border-2 border-yellow-300 bg-yellow-50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                Hinweise & fehlende Daten ({notes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-yellow-200">
                      <div className="text-sm text-yellow-900 mb-2 flex items-start gap-2">
                        <span className="text-yellow-600 font-bold">•</span>
                        <span className="flex-1">{note}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-700 whitespace-nowrap">
                          Fehlende Info ergänzen:
                        </Label>
                        <Input
                          placeholder="Hier eingeben..."
                          value={missingDataInputs[idx] || ''}
                          onChange={(e) => handleMissingDataInput(idx, e.target.value)}
                          className="text-sm h-8 border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-800">Alle Daten vollständig!</p>
                  <p className="text-xs text-green-600 mt-1">Keine fehlenden Informationen gefunden.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollArea>

        <DialogFooter className="flex justify-between items-center pt-4 border-t-2 border-gray-200 px-6">
          <div className="text-sm text-gray-600">
            <CheckCircle2 className="inline h-4 w-4 mr-1 text-green-600" />
            {materials.length} Material(ien) bereit zum Import
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isImporting}
              className="border-2 border-red-300 hover:bg-red-50 hover:border-red-500"
            >
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || materials.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg"
            >
              <Package className="h-4 w-4 mr-2" />
              {isImporting ? 'Importiere...' : `${materials.length} Material(ien) importieren`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

