// ============================================================================
// AUFMASS PREVIEW - TradeTrackr Portal
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, FileText, ArrowLeft, Calendar, Package } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ReportRecord, AufmassAggregatedLine } from '@/types/aufmass';
import { aggregateReports, calculateTotalsByUnit, formatQuantity } from '@/lib/aufmass/aggregate';

interface AufmassPreviewProps {
  open: boolean;
  onClose: () => void;
  onGenerate: () => void;
  projectId: string;
  projectNumber: string;
  range: {
    mode: 'project' | 'custom';
    from?: string;
    to?: string;
  };
  sources: {
    items: boolean;
    hours: boolean;
    materials: boolean;
  };
  aggregateBy: 'positionUnit' | 'descriptionUnit';
  hideZeroQuantities: boolean;
  isGenerating: boolean;
}

const AufmassPreview: React.FC<AufmassPreviewProps> = ({
  open,
  onClose,
  onGenerate,
  projectId,
  projectNumber,
  range,
  sources,
  aggregateBy,
  hideZeroQuantities,
  isGenerating
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [previewLines, setPreviewLines] = useState<AufmassAggregatedLine[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (open && projectId) {
      loadPreviewData();
    }
  }, [open, projectId]);

  const loadPreviewData = async () => {
    setIsLoading(true);
    try {
      // Query reports for this project
      const reportsRef = collection(db, 'projects', projectId, 'reports');
      let q = query(reportsRef, orderBy('date', 'desc'));

      // Apply date filters if custom range
      if (range.mode === 'custom' && range.from && range.to) {
        q = query(
          reportsRef,
          where('date', '>=', range.from),
          where('date', '<=', range.to),
          orderBy('date', 'desc')
        );
      }

      // Limit to first 50 reports for preview
      q = query(q, limit(50));

      const snapshot = await getDocs(q);
      const reports: ReportRecord[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          reportId: doc.id,
          projectId: projectId,
          projectNumber: projectNumber,
          date: data.date || data.reportDate || data.workDate,
          items: data.items || [],
          hours: data.hours || [],
          materials: data.materials || []
        });
      });

      setTotalReports(reports.length);

      // Determine date range
      if (reports.length > 0) {
        const dates = reports.map(r => r.date).filter(Boolean).sort();
        setDateRange({
          from: dates[0] || '',
          to: dates[dates.length - 1] || ''
        });
      }

      // Aggregate the data
      const aggregated = aggregateReports(reports, sources, {
        aggregateBy,
        hideZeroQuantities
      });

      // Limit preview to first 50 lines
      setPreviewLines(aggregated.slice(0, 50));

    } catch (error) {
      console.error('Error loading preview data:', error);
      setPreviewLines([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotalsByUnit(previewLines);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
          {/* Animated background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          
          <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
            <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
              👁️
            </div>
            <div className="flex-1">
              Aufmaß-Vorschau
              <div className="text-xs font-normal text-white/80 mt-1">
                Vorschau der ersten 50 aggregierten Zeilen
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Summary Info */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">📁</span>
                  Projekt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl text-[#058bc0]">{projectNumber}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-100 via-green-50 to-white border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Berichte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl text-green-600">{totalReports}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-100 via-purple-50 to-white border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Zeitraum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-purple-700">
                    {dateRange ? `${dateRange.from} – ${dateRange.to}` : 'Wird geladen...'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data sources badges */}
          <div className="flex gap-2 flex-wrap p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-lg border-2 border-indigo-200">
            <span className="text-sm font-bold text-gray-700 mr-2">Datenquellen:</span>
            {sources.items && <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-semibold">📋 Leistungspositionen</Badge>}
            {sources.hours && <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold">⏰ Arbeitsstunden</Badge>}
            {sources.materials && <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">🧱 Materialien</Badge>}
          </div>

          {/* Preview Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-3 border-blue-300">
              <Loader2 className="h-8 w-8 animate-spin text-[#058bc0]" />
              <span className="ml-3 text-gray-900 font-semibold">Lade Vorschau...</span>
            </div>
          ) : previewLines.length === 0 ? (
            <Card className="bg-gradient-to-br from-yellow-100 via-yellow-50 to-white border-3 border-yellow-300 shadow-lg">
              <CardContent className="pt-6">
                <p className="text-center text-yellow-800 font-semibold">
                  ⚠️ Keine Daten gefunden. Bitte prüfen Sie Ihre Filtereinstellungen.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-indigo-100 via-indigo-50 to-white border-3 border-indigo-300 shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Vorschau (erste 50 von {previewLines.length} Zeilen)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto border-3 border-indigo-300 rounded-lg bg-white shadow-inner">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200">
                        {aggregateBy === 'positionUnit' && (
                          <TableHead className="w-32 font-bold text-gray-900">Pos./Key</TableHead>
                        )}
                        <TableHead className="font-bold text-gray-900">Beschreibung</TableHead>
                        <TableHead className="w-24 font-bold text-gray-900">Einheit</TableHead>
                        <TableHead className="w-32 text-right font-bold text-gray-900">Menge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewLines.map((line, idx) => (
                        <TableRow key={idx} className="hover:bg-indigo-50 transition-colors">
                          {aggregateBy === 'positionUnit' && (
                            <TableCell className="font-mono text-sm font-semibold text-gray-700">
                              {line.position || '-'}
                            </TableCell>
                          )}
                          <TableCell className="font-medium text-gray-900">{line.description}</TableCell>
                          <TableCell className="font-bold text-indigo-600">{line.unit}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-gray-900">
                            {formatQuantity(line.totalQuantity, line.unit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals by unit */}
                {totals.size > 0 && (
                  <div className="mt-4 pt-4 border-t-3 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                    <h4 className="text-base font-bold mb-3 text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">🔢</span>
                      Summen nach Einheit:
                    </h4>
                    <div className="flex gap-3 flex-wrap">
                      {Array.from(totals.entries()).map(([unit, total]) => (
                        <Badge key={unit} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-base py-2 px-4 font-bold shadow-md hover:shadow-lg transition-all hover:scale-105">
                          {formatQuantity(total, unit)} {unit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isGenerating}
            className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
          >
            <span className="text-xl mr-2">⬅️</span> Zurück
          </Button>
          <Button 
            onClick={onGenerate} 
            disabled={isGenerating || previewLines.length === 0}
            className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span className="text-xl">⏳</span> Wird erstellt...
              </>
            ) : (
              <>
                <span className="text-xl mr-2">✨</span>
                Aufmaß jetzt generieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AufmassPreview;



