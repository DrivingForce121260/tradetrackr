/**
 * DATEV Export Panel for TradeTrackr
 * 
 * Provides UI for:
 * - DATEV settings configuration
 * - Buchungsstapel export (invoices + payments)
 * - Debitoren export (customer master data)
 * 
 * German Excel CSV Format:
 * - Delimiter: ';' (semicolon)
 * - Decimal: ',' (comma) 
 * - Line ending: CRLF
 * - Encoding: UTF-8 with BOM
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Settings, 
  FileDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DatevSettings,
  DEFAULT_DATEV_SETTINGS,
  DebitorMode,
  VatMode,
  DATEV_FIELD_LABELS,
} from '@/types/datev';
import {
  loadDatevSettings,
  saveDatevSettings,
  validateDatevSettings,
  performDatevExport,
  downloadCsv,
  getDatevExportFilename,
  MAX_INVOICES_EXPORT,
  MAX_PAYMENTS_EXPORT,
  DatevExportResultExtended,
} from '@/services/datevService';

interface DatevExportPanelProps {
  concernID: string;
  userId: string;
  userName: string;
}

/**
 * Loading phase for better progress indication
 */
type ExportPhase = 
  | 'idle'
  | 'loading-settings'
  | 'loading-invoices'
  | 'loading-payments'
  | 'generating-csv'
  | 'complete';

export const DatevExportPanel: React.FC<DatevExportPanelProps> = ({
  concernID,
  userId,
  userName,
}) => {
  const { toast } = useToast();
  
  // Settings state
  const [settings, setSettings] = useState<DatevSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  
  // Export state
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [onlyFinalized, setOnlyFinalized] = useState(true);
  const [includePayments, setIncludePayments] = useState(true);
  const [exporting, setExporting] = useState<'buchungsstapel' | 'debitoren' | null>(null);
  const [exportPhase, setExportPhase] = useState<ExportPhase>('idle');
  const [lastExportResult, setLastExportResult] = useState<{
    type: string;
    invoiceCount: number;
    paymentCount: number;
    warnings: string[];
    blocked?: boolean;
  } | null>(null);
  
  // Form state for editing
  const [formData, setFormData] = useState<Partial<DatevSettings>>({});
  
  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setExportPhase('loading-settings');
      try {
        const data = await loadDatevSettings(concernID);
        if (data) {
          setSettings(data);
          setFormData(data);
        } else {
          // Initialize with defaults
          const defaults = {
            ...DEFAULT_DATEV_SETTINGS,
            concernID,
            companyName: '',
          } as DatevSettings;
          setSettings(defaults);
          setFormData(defaults);
          setSettingsExpanded(true); // Show settings if not configured
        }
      } catch (error) {
        console.error('Error loading DATEV settings:', error);
        toast({
          title: 'Fehler',
          description: 'DATEV-Einstellungen konnten nicht geladen werden.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setExportPhase('idle');
      }
    };
    load();
  }, [concernID, toast]);
  
  // Handle form field changes
  const handleFieldChange = (field: keyof DatevSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveDatevSettings(concernID, formData, userId);
      setSettings({ ...formData, concernID } as DatevSettings);
      toast({
        title: 'Gespeichert',
        description: 'DATEV-Einstellungen wurden gespeichert.',
      });
      setSettingsExpanded(false);
    } catch (error) {
      console.error('Error saving DATEV settings:', error);
      toast({
        title: 'Fehler',
        description: 'Einstellungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Perform export
  const handleExport = async (type: 'buchungsstapel' | 'debitoren') => {
    if (!settings) return;
    
    // Validate settings
    const validation = validateDatevSettings(settings);
    if (!validation.valid) {
      toast({
        title: 'Einstellungen unvollständig',
        description: `Fehlend: ${validation.missingFields.join(', ')}`,
        variant: 'destructive',
      });
      setSettingsExpanded(true);
      return;
    }
    
    setExporting(type);
    setLastExportResult(null);
    
    try {
      // Show loading phases for better UX
      setExportPhase('loading-invoices');
      
      const options = type === 'buchungsstapel'
        ? { dateFrom, dateTo, onlyFinalized, includePayments }
        : { onlyWithInvoices: true };
      
      if (type === 'buchungsstapel' && includePayments) {
        // Brief delay to show phase change
        await new Promise(r => setTimeout(r, 100));
        setExportPhase('loading-payments');
      }
      
      const result: DatevExportResultExtended = await performDatevExport(
        concernID,
        userId,
        userName,
        type,
        settings,
        options
      );
      
      // Check if export was blocked
      if (result.blocked) {
        setLastExportResult({
          type: type === 'buchungsstapel' ? 'Buchungsstapel' : 'Debitoren',
          invoiceCount: result.invoiceCount,
          paymentCount: result.paymentCount,
          warnings: result.warnings,
          blocked: true,
        });
        
        toast({
          title: 'Export blockiert',
          description: result.warnings[0] || 'Zu viele Datensätze.',
          variant: 'destructive',
        });
        return;
      }
      
      setExportPhase('generating-csv');
      
      // Download the CSV
      const filename = getDatevExportFilename(type, dateFrom, dateTo);
      downloadCsv(result.csv, filename);
      
      // Update last result
      setLastExportResult({
        type: type === 'buchungsstapel' ? 'Buchungsstapel' : 'Debitoren',
        invoiceCount: result.invoiceCount,
        paymentCount: result.paymentCount,
        warnings: result.warnings,
      });
      
      setExportPhase('complete');
      
      toast({
        title: 'Export erfolgreich',
        description: `DATEV-Datei wurde erstellt (${result.invoiceCount} Rechnungen${result.paymentCount > 0 ? `, ${result.paymentCount} Zahlungen` : ''}).`,
      });
    } catch (error) {
      console.error('Error exporting DATEV:', error);
      toast({
        title: 'Fehler',
        description: 'Export konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
      setExportPhase('idle');
    }
  };
  
  /**
   * Get loading phase description in German
   */
  const getPhaseDescription = (): string => {
    switch (exportPhase) {
      case 'loading-invoices':
        return 'Lade Rechnungen...';
      case 'loading-payments':
        return 'Lade Zahlungen...';
      case 'generating-csv':
        return 'Erstelle CSV-Datei...';
      case 'complete':
        return 'Export abgeschlossen';
      default:
        return 'Exportiere...';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Lade DATEV-Einstellungen...</span>
      </div>
    );
  }
  
  const validation = validateDatevSettings(settings);
  
  return (
    <div className="space-y-6">
      {/* CSV Format Info (read-only) */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <h3 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          CSV-Einstellungen (für deutsche Excel-Kompatibilität)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Trennzeichen:</span>
            <span className="ml-2 font-mono bg-white px-2 py-0.5 rounded border">;</span>
          </div>
          <div>
            <span className="text-slate-500">Dezimalformat:</span>
            <span className="ml-2 font-mono bg-white px-2 py-0.5 rounded border">1234,56</span>
          </div>
          <div>
            <span className="text-slate-500">Kodierung:</span>
            <span className="ml-2 font-mono bg-white px-2 py-0.5 rounded border">UTF-8 BOM</span>
          </div>
          <div>
            <span className="text-slate-500">Zeilenende:</span>
            <span className="ml-2 font-mono bg-white px-2 py-0.5 rounded border">CRLF</span>
          </div>
        </div>
      </div>
      
      {/* Settings Panel */}
      <Card className="border-2 border-gray-200 shadow-md">
        <CardHeader 
          className="bg-gradient-to-r from-gray-100 to-gray-200 cursor-pointer"
          onClick={() => setSettingsExpanded(!settingsExpanded)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <span>DATEV-Einstellungen</span>
              {validation.valid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <span className="text-sm font-normal text-gray-500">
              {settingsExpanded ? '▼' : '▶'} {settingsExpanded ? 'Einklappen' : 'Aufklappen'}
            </span>
          </CardTitle>
        </CardHeader>
        
        {settingsExpanded && (
          <CardContent className="pt-6">
            {!validation.valid && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Bitte konfigurieren Sie alle erforderlichen Felder vor dem Export.
                {validation.missingFields.length > 0 && (
                  <span className="block mt-1">Fehlend: {validation.missingFields.join(', ')}</span>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Name */}
              <div className="space-y-1.5">
                <Label htmlFor="companyName">{DATEV_FIELD_LABELS.companyName} *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName || ''}
                  onChange={(e) => handleFieldChange('companyName', e.target.value)}
                  placeholder="Firmenname"
                />
              </div>
              
              {/* Fiscal Year */}
              <div className="space-y-1.5">
                <Label htmlFor="fiscalYear">{DATEV_FIELD_LABELS.fiscalYear} *</Label>
                <Input
                  id="fiscalYear"
                  type="number"
                  value={formData.fiscalYear || new Date().getFullYear()}
                  onChange={(e) => handleFieldChange('fiscalYear', parseInt(e.target.value) || new Date().getFullYear())}
                />
              </div>
              
              {/* Consultant Number */}
              <div className="space-y-1.5">
                <Label htmlFor="consultantNumber">{DATEV_FIELD_LABELS.consultantNumber}</Label>
                <Input
                  id="consultantNumber"
                  value={formData.consultantNumber || ''}
                  onChange={(e) => handleFieldChange('consultantNumber', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              
              {/* Client Number */}
              <div className="space-y-1.5">
                <Label htmlFor="clientNumber">{DATEV_FIELD_LABELS.clientNumber}</Label>
                <Input
                  id="clientNumber"
                  value={formData.clientNumber || ''}
                  onChange={(e) => handleFieldChange('clientNumber', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              
              {/* Revenue Account 19% */}
              <div className="space-y-1.5">
                <Label htmlFor="revenueAccount19">{DATEV_FIELD_LABELS.revenueAccount19} *</Label>
                <Input
                  id="revenueAccount19"
                  value={formData.revenueAccount19 || ''}
                  onChange={(e) => handleFieldChange('revenueAccount19', e.target.value)}
                  placeholder="z.B. 8400"
                />
              </div>
              
              {/* Revenue Account 7% */}
              <div className="space-y-1.5">
                <Label htmlFor="revenueAccount7">{DATEV_FIELD_LABELS.revenueAccount7}</Label>
                <Input
                  id="revenueAccount7"
                  value={formData.revenueAccount7 || ''}
                  onChange={(e) => handleFieldChange('revenueAccount7', e.target.value)}
                  placeholder="z.B. 8300"
                />
              </div>
              
              {/* Revenue Account 0% */}
              <div className="space-y-1.5">
                <Label htmlFor="revenueAccount0">{DATEV_FIELD_LABELS.revenueAccount0}</Label>
                <Input
                  id="revenueAccount0"
                  value={formData.revenueAccount0 || ''}
                  onChange={(e) => handleFieldChange('revenueAccount0', e.target.value)}
                  placeholder="z.B. 8200"
                />
              </div>
              
              {/* Receivables Account */}
              <div className="space-y-1.5">
                <Label htmlFor="receivablesAccountDefault">{DATEV_FIELD_LABELS.receivablesAccountDefault} *</Label>
                <Input
                  id="receivablesAccountDefault"
                  value={formData.receivablesAccountDefault || ''}
                  onChange={(e) => handleFieldChange('receivablesAccountDefault', e.target.value)}
                  placeholder="z.B. 1400"
                />
              </div>
              
              {/* Bank Account */}
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountDefault">{DATEV_FIELD_LABELS.bankAccountDefault} *</Label>
                <Input
                  id="bankAccountDefault"
                  value={formData.bankAccountDefault || ''}
                  onChange={(e) => handleFieldChange('bankAccountDefault', e.target.value)}
                  placeholder="z.B. 1200"
                />
              </div>
              
              {/* Debitor Mode */}
              <div className="space-y-1.5">
                <Label>{DATEV_FIELD_LABELS.debitorMode}</Label>
                <Select
                  value={formData.debitorMode || 'collective'}
                  onValueChange={(v) => handleFieldChange('debitorMode', v as DebitorMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collective">Sammelkonto (alle Kunden)</SelectItem>
                    <SelectItem value="perCustomer">Pro Kunde (individuelle Debitorennr.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Debitor Start Number (only if perCustomer) */}
              {formData.debitorMode === 'perCustomer' && (
                <div className="space-y-1.5">
                  <Label htmlFor="debitorStartNumber">{DATEV_FIELD_LABELS.debitorStartNumber}</Label>
                  <Input
                    id="debitorStartNumber"
                    type="number"
                    value={formData.debitorStartNumber || 10000}
                    onChange={(e) => handleFieldChange('debitorStartNumber', parseInt(e.target.value) || 10000)}
                    placeholder="z.B. 10000"
                  />
                </div>
              )}
              
              {/* VAT Mode */}
              <div className="space-y-1.5">
                <Label>{DATEV_FIELD_LABELS.vatMode}</Label>
                <Select
                  value={formData.vatMode || 'deriveFromInvoice'}
                  onValueChange={(v) => handleFieldChange('vatMode', v as VatMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deriveFromInvoice">Aus Rechnung ableiten</SelectItem>
                    <SelectItem value="force19">Immer 19%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Speichere...
                  </>
                ) : (
                  '💾 Einstellungen speichern'
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Export Panel */}
      <Card className="border-2 border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100">
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-green-600" />
            <span>DATEV Export erstellen</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1.5">
              <Label htmlFor="dateFrom">Von</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateTo">Bis</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            
            {/* Options */}
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyFinalized}
                  onChange={(e) => setOnlyFinalized(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600"
                />
                <span className="text-sm text-gray-700">Nur finalisierte</span>
              </label>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePayments}
                  onChange={(e) => setIncludePayments(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600"
                />
                <span className="text-sm text-gray-700">Zahlungen einschließen</span>
              </label>
            </div>
          </div>
          
          {/* Limits Info */}
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Maximale Datenmenge pro Export: {MAX_INVOICES_EXPORT.toLocaleString('de-DE')} Rechnungen, 
              {' '}{MAX_PAYMENTS_EXPORT.toLocaleString('de-DE')} Zahlungen. 
              Bei größeren Datenmengen bitte Zeitraum einschränken.
            </span>
          </div>
          
          {/* Validation Warning */}
          {!validation.valid && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Export nicht möglich. Bitte konfigurieren Sie erst die DATEV-Einstellungen.
            </div>
          )}
          
          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleExport('buchungsstapel')}
              disabled={!validation.valid || exporting !== null}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
            >
              {exporting === 'buchungsstapel' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {getPhaseDescription()}
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Buchungsstapel exportieren
                </>
              )}
            </Button>
            
            <Button
              onClick={() => handleExport('debitoren')}
              disabled={!validation.valid || exporting !== null}
              variant="outline"
              className="border-green-300 hover:border-green-500 hover:bg-green-50"
            >
              {exporting === 'debitoren' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportiere...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Debitoren exportieren
                </>
              )}
            </Button>
          </div>
          
          {/* Last Export Result - Blocked */}
          {lastExportResult?.blocked && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                Export blockiert
              </div>
              <div className="text-sm text-red-600">
                {lastExportResult.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            </div>
          )}
          
          {/* Last Export Result - Success */}
          {lastExportResult && !lastExportResult.blocked && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <CheckCircle className="h-4 w-4" />
                {lastExportResult.type} erfolgreich exportiert
              </div>
              <div className="text-sm text-gray-600">
                {lastExportResult.invoiceCount > 0 && (
                  <span className="mr-4">📄 {lastExportResult.invoiceCount} Rechnungen</span>
                )}
                {lastExportResult.paymentCount > 0 && (
                  <span>💰 {lastExportResult.paymentCount} Zahlungen</span>
                )}
              </div>
              
              {lastExportResult.warnings.length > 0 && (
                <div className="mt-2 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Hinweise:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {lastExportResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
        <Info className="h-4 w-4 inline mr-2" />
        <strong>Hinweis:</strong> Der DATEV-Export erstellt CSV-Dateien für den Import in DATEV oder kompatible Buchhaltungssoftware. 
        Die Dateien sind für deutsche Excel-Versionen optimiert (Trennzeichen: Semikolon, Dezimalkomma).
      </div>
    </div>
  );
};

export default DatevExportPanel;

