import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import CRMMergeDialog from './CRMMergeDialog';
import type { CRMAccount } from '@/types/crm';

interface CRMImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: Array<Record<string, string>>) => Promise<{ inserted: number; updated: number }>;
  existingAccounts?: CRMAccount[];
  onLoadExisting?: () => Promise<CRMAccount[]>;
  onMergeAccount?: (accountId: string, merged: any) => Promise<void>;
}

export const CRMImportModal: React.FC<CRMImportModalProps> = ({ 
  open, 
  onOpenChange, 
  onImport,
  existingAccounts = [],
  onLoadExisting,
  onMergeAccount
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [duplicates, setDuplicates] = useState<Array<{ row: Record<string, string>; existing: CRMAccount }>>([]);
  const [showMerge, setShowMerge] = useState(false);
  const [currentMerge, setCurrentMerge] = useState<{ row: Record<string, string>; existing: CRMAccount } | null>(null);
  const [accounts, setAccounts] = useState<CRMAccount[]>(existingAccounts);

  useEffect(() => {
    if (open && onLoadExisting) {
      onLoadExisting().then(setAccounts).catch(console.error);
    } else if (existingAccounts.length) {
      setAccounts(existingAccounts);
    }
  }, [open, onLoadExisting, existingAccounts]);

  const parseCSV = async (file: File): Promise<Array<Record<string, string>>> => {
    const text = await file.text();
    // UTF-8 BOM handling
    const cleaned = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    
    // Handle quoted CSV fields
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (cols[idx] || '').replace(/^"|"$/g, '').trim();
      });
      rows.push(row);
    }
    return rows;
  };

  const findDuplicates = (rows: Array<Record<string, string>>): Array<{ row: Record<string, string>; existing: CRMAccount }> => {
    const found: Array<{ row: Record<string, string>; existing: CRMAccount }> = [];
    for (const row of rows) {
      const vatId = row.vatId || row.vat || '';
      const email = row.email || '';
      if (!vatId && !email) continue;

      const match = accounts.find(acc => {
        if (vatId && acc.vatId && acc.vatId === vatId) return true;
        if (email && acc.billingEmail && acc.billingEmail.toLowerCase() === email.toLowerCase()) return true;
        return false;
      });

      if (match) {
        found.push({ row, existing: match });
      }
    }
    return found;
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsLoadingPreview(true);
    try {
      const rows = await parseCSV(file);
      setPreviewRows(rows);
      const dups = findDuplicates(rows);
      setDuplicates(dups);
    } catch (error) {
      console.error('Error parsing CSV:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleMerge = async (merged: any) => {
    if (!currentMerge || !onMergeAccount) return;
    await onMergeAccount(currentMerge.existing.id, merged);
    // Update accounts list
    setAccounts(prev => prev.map(acc => acc.id === currentMerge.existing.id ? { ...acc, ...merged } : acc));
    // Remove merged duplicate
    const remaining = duplicates.filter(d => d !== currentMerge);
    setDuplicates(remaining);
    setCurrentMerge(null);
    setShowMerge(false);
    // Process next duplicate if any
    if (remaining.length > 0) {
      setTimeout(() => {
        setCurrentMerge(remaining[0]);
        setShowMerge(true);
      }, 300);
    }
  };

  const handleSkipMerge = () => {
    if (currentMerge) {
      const remaining = duplicates.filter(d => d !== currentMerge);
      setDuplicates(remaining);
      setCurrentMerge(null);
      setShowMerge(false);
      // Process next duplicate if any
      if (remaining.length > 0) {
        setTimeout(() => {
          setCurrentMerge(remaining[0]);
          setShowMerge(true);
        }, 300);
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setResult(null);
    try {
      // Process duplicates first
      let remainingRows = [...previewRows];
      for (const dup of duplicates) {
        const idx = remainingRows.findIndex(r => r === dup.row);
        if (idx >= 0) remainingRows.splice(idx, 1);
      }

      // Import remaining rows
      const res = await onImport(remainingRows);
      setResult(res);
      setPreviewRows([]);
      setDuplicates([]);
    } finally {
      setIsImporting(false);
    }
  };

  const processNextDuplicate = () => {
    if (duplicates.length > 0) {
      setCurrentMerge(duplicates[0]);
      setShowMerge(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSV-Import (Kunden)</DialogTitle>
            <DialogDescription>Spalten z. B.: name,vatId,email,address,tags. UTF-8 wird unterstützt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CSV-Datei</Label>
              <Input type="file" accept=".csv" onChange={e => {
                setFile(e.target.files?.[0] || null);
                setPreviewRows([]);
                setDuplicates([]);
              }} />
            </div>

            {file && (
              <div className="flex gap-2">
                <Button onClick={handlePreview} disabled={isLoadingPreview}>
                  {isLoadingPreview ? 'Lade...' : 'Vorschau & Duplikate prüfen'}
                </Button>
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Vorschau ({previewRows.length} Zeilen)</Label>
                  {duplicates.length > 0 && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{duplicates.length} Duplikat(e) gefunden</span>
                    </div>
                  )}
                </div>
                <div className="border rounded max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>VAT</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => {
                        const isDup = duplicates.some(d => d.row === row);
                        return (
                          <TableRow key={idx}>
                            <TableCell>{row.name || row.company || '-'}</TableCell>
                            <TableCell>{row.vatId || row.vat || '-'}</TableCell>
                            <TableCell>{row.email || '-'}</TableCell>
                            <TableCell>
                              {isDup ? (
                                <span className="text-orange-600 text-xs">Duplikat</span>
                              ) : (
                                <span className="text-green-600 text-xs">OK</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {duplicates.length > 0 && !showMerge && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <Label className="font-semibold text-orange-900">
                      {duplicates.length} Duplikat(e) müssen zusammengeführt werden
                    </Label>
                  </div>
                  <Button size="sm" onClick={processNextDuplicate}>
                    Zusammenführen starten
                  </Button>
                </div>
                <p className="text-sm text-orange-700">
                  Gleiche VAT-ID oder E-Mail erkannt. Bitte führen Sie die Duplikate Feld für Feld zusammen.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleImport} 
                disabled={!file || isImporting || previewRows.length === 0 || duplicates.length > 0}
                className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
              >
                {isImporting ? 'Importiere…' : 'Importieren'}
              </Button>
              <Button variant="outline" onClick={() => {
                onOpenChange(false);
                setFile(null);
                setPreviewRows([]);
                setDuplicates([]);
              }}>Schließen</Button>
            </div>
            {result && (
              <div className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Import abgeschlossen: {result.inserted} neu, {result.updated} aktualisiert
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showMerge && currentMerge && onMergeAccount && (
        <CRMMergeDialog
          open={showMerge}
          onOpenChange={(open) => {
            setShowMerge(open);
            if (!open && !currentMerge) {
              handleSkipMerge();
            }
          }}
          existing={currentMerge.existing}
          incoming={currentMerge.row}
          onMerge={handleMerge}
          onSkip={handleSkipMerge}
        />
      )}
    </>
  );
};

export default CRMImportModal;



