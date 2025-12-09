/**
 * TradeTrackr - Zeit-Administration: Exporte
 * CSV/PDF/DATEV exportieren
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FileDown, FileText, FileSpreadsheet, ArrowLeft, Calendar } from 'lucide-react';
import AppHeader from '../AppHeader';
import { useAuth } from '@/contexts/AuthContext';

interface ExportsProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

export function Exports({ onBack, onNavigate, onOpenMessaging }: ExportsProps) {
  const { user, hasPermission } = useAuth();
  const [exportFormat, setExportFormat] = useState<string>('csv');
  const [exportPeriod, setExportPeriod] = useState<string>('current_month');
  const [exportType, setExportType] = useState<string>('timesheets');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = () => {
    // Placeholder - will implement actual export logic
    console.log('Export:', { exportFormat, exportPeriod, exportType, startDate, endDate });
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="📤 Exporte"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <Button
          onClick={() => onNavigate?.('time-admin')}
          variant="outline"
          className="border-white text-white hover:bg-white/20 transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          🔙 Zurück zur Zeit-Administration
        </Button>
      </AppHeader>
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Export Options Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                Export-Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-6">
              {/* Export Format */}
              <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-gray-200">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  <span className="text-base">📄</span>
                  Export-Format
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('csv')}
                    className={exportFormat === 'csv' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    📊 CSV
                  </Button>
                  <Button
                    variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('pdf')}
                    className={exportFormat === 'pdf' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : ''}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    📕 PDF
                  </Button>
                  <Button
                    variant={exportFormat === 'datev' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('datev')}
                    className={exportFormat === 'datev' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' : ''}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    💼 DATEV
                  </Button>
                </div>
              </div>

              {/* Export Type */}
              <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-gray-200">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  <span className="text-base">📋</span>
                  Datentyp
                </Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timesheets">⏱️ Stundenzettel</SelectItem>
                    <SelectItem value="punches">⏰ Zeit-Stempel (Punches)</SelectItem>
                    <SelectItem value="leave">🏖️ Urlaubsanträge</SelectItem>
                    <SelectItem value="overtime">⏰ Überstunden</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period Selection */}
              <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-gray-200">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  <span className="text-base">📅</span>
                  Zeitraum
                </Label>
                <Select value={exportPeriod} onValueChange={setExportPeriod}>
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_week">📅 Aktuelle Woche</SelectItem>
                    <SelectItem value="last_week">⏮️ Letzte Woche</SelectItem>
                    <SelectItem value="current_month">📆 Aktueller Monat</SelectItem>
                    <SelectItem value="last_month">⏮️ Letzter Monat</SelectItem>
                    <SelectItem value="custom">🎯 Benutzerdefiniert</SelectItem>
                  </SelectContent>
                </Select>

                {exportPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Von</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Bis</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <div className="flex justify-end pt-4 border-t-2 border-gray-300">
                <Button
                  onClick={handleExport}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  📥 Export starten
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export History */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">📜</span>
                Export-Verlauf
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-600 font-medium">Noch keine Exporte durchgeführt</p>
                <p className="text-gray-500 text-sm mt-2">Ihre Export-Historie wird hier angezeigt</p>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-semibold text-gray-900">CSV-Export</p>
                    <p className="text-gray-700">Für Excel, Google Sheets oder weitere Analysen</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xl">📕</span>
                  <div>
                    <p className="font-semibold text-gray-900">PDF-Export</p>
                    <p className="text-gray-700">Druckbare Berichte und Dokumentation</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xl">💼</span>
                  <div>
                    <p className="font-semibold text-gray-900">DATEV-Export</p>
                    <p className="text-gray-700">Direkt für Buchhaltungssoftware (DATEV-Format)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Exports;













