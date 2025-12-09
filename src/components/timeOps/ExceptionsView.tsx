/**
 * TradeTrackr - Time Ops Exceptions View
 * Handle anomalies and exceptions in time tracking
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertTriangle, CheckCircle, Clock, MapPin, XCircle, Settings, Activity, FileBarChart } from 'lucide-react';
import { getExceptions, fixPunch, type Exception } from '../../services/timeOpsService';
import AppHeader from '../AppHeader';
import { useAuth } from '@/contexts/AuthContext';

interface ExceptionsViewProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

export function ExceptionsView({ onBack, onNavigate, onOpenMessaging }: ExceptionsViewProps) {
  const { user, hasPermission } = useAuth();
  const concernId = user?.concernId || '';
  const { data: exceptions, isLoading } = useQuery({
    queryKey: ['exceptions', concernId],
    queryFn: () => getExceptions(concernId),
    refetchInterval: 60000, // Refresh every minute
  });

  const severityCounts = {
    high: exceptions?.filter((e) => e.severity === 'high').length || 0,
    medium: exceptions?.filter((e) => e.severity === 'medium').length || 0,
    low: exceptions?.filter((e) => e.severity === 'low').length || 0,
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Zeit Operations - Ausnahmen"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      <div className="p-6 space-y-6">
        {/* Description */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <p className="text-gray-600">
            Überlappungen, fehlende Enden, Geofence-Verstöße
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
            onClick={() => onNavigate?.('time-ops-reports')}
            className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border-purple-300"
          >
            <FileBarChart className="h-4 w-4 text-purple-600" />
            <span>Berichte</span>
          </Button>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hohe Priorität</p>
                <p className="text-3xl font-bold text-red-600">{severityCounts.high}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mittlere Priorität</p>
                <p className="text-3xl font-bold text-orange-600">{severityCounts.medium}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Niedrige Priorität</p>
                <p className="text-3xl font-bold text-yellow-600">{severityCounts.low}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exceptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Offene Ausnahmen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Lädt...</div>
          ) : !exceptions || exceptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="font-semibold">Keine Ausnahmen</p>
              <p className="text-sm mt-2">Alles läuft reibungslos!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((exception) => (
                <ExceptionCard key={exception.id} exception={exception} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Sidebar - removed, using DesktopSidebar instead */}
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface ExceptionCardProps {
  exception: Exception;
}

function ExceptionCard({ exception }: ExceptionCardProps) {
  const severityConfig = {
    high: { color: 'bg-red-100 border-red-300', badge: 'destructive', text: 'Hoch' },
    medium: { color: 'bg-orange-100 border-orange-300', badge: 'default', text: 'Mittel' },
    low: { color: 'bg-yellow-100 border-yellow-300', badge: 'secondary', text: 'Niedrig' },
  };

  const typeConfig = {
    overlap: { icon: <XCircle className="h-5 w-5" />, text: 'Überlappung' },
    missing_end: { icon: <Clock className="h-5 w-5" />, text: 'Fehlendes Ende' },
    out_of_geofence: { icon: <MapPin className="h-5 w-5" />, text: 'Außerhalb Geofence' },
    excessive_hours: { icon: <AlertTriangle className="h-5 w-5" />, text: 'Überstunden' },
  };

  const config = severityConfig[exception.severity];
  const typeInfo = typeConfig[exception.type];

  return (
    <div className={`p-4 rounded-lg border ${config.color}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-gray-700 mt-1">{typeInfo.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{typeInfo.text}</span>
              <Badge variant={config.badge as any} className="text-xs">
                {config.text}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 mb-2">{exception.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>User: {exception.uid}</span>
              <span>Punch: {exception.punchId.substring(0, 8)}...</span>
              <span>{exception.createdAt.toLocaleDateString('de-DE')}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (confirm('Ausnahme als gelöst markieren?')) {
                await fixPunch(exception.punchId, {});
                // Would refresh list
              }
            }}
          >
            Beheben
          </Button>
        </div>
      </div>
    </div>
  );
}


