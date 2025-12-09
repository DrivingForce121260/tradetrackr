/**
 * TradeTrackr - Time Ops Reports View
 * Generate and download reports
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Download, FileText, Calendar, Users, Settings, Activity, XCircle } from 'lucide-react';
import { generateReport } from '../../services/timeOpsService';
import AppHeader from '../AppHeader';
import { useAuth } from '@/contexts/AuthContext';

interface ReportsViewProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

export function ReportsView({ onBack, onNavigate, onOpenMessaging }: ReportsViewProps) {
  const { user, hasPermission } = useAuth();
  const concernId = user?.concernId || '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async (format: 'csv' | 'pdf' | 'datev') => {
    if (!startDate || !endDate) {
      alert('Bitte Start- und Enddatum auswählen');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateReport({
        concernId,
        startDate,
        endDate,
        format,
      });

      // Open download URL
      window.open(result.url, '_blank');
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Fehler beim Generieren des Berichts');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Zeit Operations - Berichte"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      <div className="p-6 space-y-6">
        {/* Description */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <p className="text-gray-600">
            Zeiterfassungs-Berichte generieren und exportieren
          </p>
        </div>

        {/* Zeit-Module Quick Navigation */}
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => onNavigate?.('time-admin')}
            className="flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 border-cyan-300"
          >
            <Settings className="h-4 w-4 text-cyan-600" />
            <span>Administration</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate?.('time-ops-live')}
            className="flex items-center gap-2 bg-sky-50 hover:bg-sky-100 border-sky-300"
          >
            <Activity className="h-4 w-4 text-sky-600" />
            <span>Live-Ansicht</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate?.('time-ops-exceptions')}
            className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 border-orange-300"
          >
            <XCircle className="h-4 w-4 text-orange-600" />
            <span>Ausnahmen</span>
          </Button>
        </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#058bc0]" />
            Berichtszeitraum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Von</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Bis</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-[#058bc0]">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-[#058bc0]" />
              <div>
                <h3 className="font-semibold text-lg">CSV Export</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Excel-kompatibel
                </p>
              </div>
              <Button
                className="w-full bg-[#058bc0] hover:bg-[#047aa0]"
                onClick={() => handleGenerateReport('csv')}
                disabled={isGenerating}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV Generieren
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-red-500">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-red-600" />
              <div>
                <h3 className="font-semibold text-lg">PDF Export</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Druckfertig
                </p>
              </div>
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => handleGenerateReport('pdf')}
                disabled={isGenerating}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF Generieren
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-green-500">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-green-600" />
              <div>
                <h3 className="font-semibold text-lg">DATEV Export</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Buchhaltungs-Format
                </p>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleGenerateReport('datev')}
                disabled={isGenerating}
              >
                <Download className="h-4 w-4 mr-2" />
                DATEV Generieren
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Kürzlich generierte Berichte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Keine Berichte vorhanden</p>
            <p className="text-sm mt-2">Generierte Berichte erscheinen hier</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Sidebar - removed, using DesktopSidebar instead */}
      </div>
    </div>
  );
}


