/**
 * TradeTrackr - Time Ops Live View
 * Real-time crew status for supervisors
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  MapPin, 
  Clock, 
  Play, 
  Pause, 
  StopCircle,
  MessageSquare,
  Navigation,
  Settings,
  XCircle,
  FileBarChart,
} from 'lucide-react';
import { getActiveWorkers, type WorkerStatus } from '../../services/timeOpsService';
import { useFirestoreListener } from '../../hooks/useFirestoreListener';
import { where } from 'firebase/firestore';
import AppHeader from '../AppHeader';
import { useAuth } from '@/contexts/AuthContext';

interface LiveViewProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

export function LiveView({ onBack, onNavigate, onOpenMessaging }: LiveViewProps) {
  const { user, hasPermission } = useAuth();
  const concernId = user?.concernId || '';
  const userRole = user?.role || '';
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterSite, setFilterSite] = useState<string>('');

  // Real-time active punches listener
  const { data: activePunches, loading } = useFirestoreListener<any>({
    collectionPath: 'punches',
    constraints: [
      where('concernId', '==', concernId),
      where('endAt', '==', null),
    ],
  });

  // Calculate worker statuses
  const workerStatuses: WorkerStatus[] = activePunches?.map((punch) => {
    const since = punch.startAt?.toDate() || new Date();
    const elapsed = Date.now() - since.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

    return {
      uid: punch.uid,
      displayName: punch.uid, // Would fetch from users collection
      status: 'on', // Would check break status
      currentPunch: punch,
      projectId: punch.projectId,
      taskId: punch.taskId,
      siteId: punch.siteId,
      since,
      lastGPSAccuracy: punch.locationStart?.acc,
      lastLocation: punch.locationStart,
    };
  }) || [];

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="⏱️ Zeit Operations - Live"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onNavigate?.('time-admin')}
            className="border-2 border-gray-300 hover:border-cyan-500 hover:bg-cyan-50 transition-all"
          >
            ⚙️ Administration
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate?.('time-ops-exceptions')}
            className="border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-all"
          >
            ⚠️ Ausnahmen
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate?.('time-ops-reports')}
            className="border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            📊 Berichte
          </Button>
        </div>
      </AppHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Live Status Banner */}
        <Card className="border-2 border-green-400 shadow-xl overflow-hidden">
          <CardContent className="bg-gradient-to-r from-green-50 to-emerald-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                <div>
                  <p className="text-lg font-bold text-gray-900">🔴 Live-Ansicht</p>
                  <p className="text-sm text-gray-600">Echtzeit-Status Ihrer Mitarbeiter</p>
                </div>
              </div>
              <Badge className="text-lg px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg">
                {workerStatuses.length} Aktiv
              </Badge>
            </div>
          </CardContent>
        </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gesamt Aktiv
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-white">{workerStatuses.length}</div>
            <p className="text-xs text-white/80">Mitarbeiter</p>
          </CardContent>
        </Card>
        <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Play className="h-4 w-4" />
              Im Einsatz
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-white">{workerStatuses.filter((w) => w.status === 'on').length}</div>
            <p className="text-xs text-white/80">Arbeitend</p>
          </CardContent>
        </Card>
        <Card className="tradetrackr-card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Pause
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-white">{workerStatuses.filter((w) => w.status === 'break').length}</div>
            <p className="text-xs text-white/80">In Pause</p>
          </CardContent>
        </Card>
        <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Baustellen
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-white">{new Set(workerStatuses.map((w) => w.siteId).filter(Boolean)).size}</div>
            <p className="text-xs text-white/80">Aktive Sites</p>
          </CardContent>
        </Card>
      </div>

      {/* Worker List */}
      <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 pt-4 pb-4">
          <CardTitle className="text-lg font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mitarbeiter-Status
            </div>
            <div className="px-4 py-1 rounded-full text-sm font-semibold bg-white/20">
              {workerStatuses.length} {workerStatuses.length === 1 ? 'Person' : 'Personen'}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">{loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#058bc0] border-t-transparent mx-auto"></div>
              <p className="text-gray-500 mt-4">Lade Live-Daten...</p>
            </div>
          ) : workerStatuses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <StopCircle className="h-20 w-20 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold text-gray-600">Keine aktiven Schichten</p>
              <p className="text-sm mt-2">Mitarbeiter erscheinen hier sobald sie ihre Zeiterfassung starten</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workerStatuses.map((worker) => (
                <WorkerCard key={worker.uid} worker={worker} />
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

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`${color} p-3 rounded-lg text-white`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WorkerCardProps {
  worker: WorkerStatus;
}

function WorkerCard({ worker }: WorkerCardProps) {
  const elapsed = worker.since
    ? Date.now() - worker.since.getTime()
    : 0;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

  const statusConfig = {
    on: { color: 'bg-gradient-to-br from-green-500 to-emerald-600', text: '✅ Aktiv', icon: <Play className="h-4 w-4" />, border: 'border-green-300' },
    break: { color: 'bg-gradient-to-br from-orange-500 to-orange-600', text: '☕ Pause', icon: <Pause className="h-4 w-4" />, border: 'border-orange-300' },
    off: { color: 'bg-gradient-to-br from-gray-500 to-gray-600', text: '🔴 Offline', icon: <StopCircle className="h-4 w-4" />, border: 'border-gray-300' },
  };

  const config = statusConfig[worker.status];

  return (
    <div className={`flex items-center justify-between p-4 bg-white rounded-xl border-2 ${config.border} hover:shadow-xl transition-all hover:scale-[1.01]`}>
      <div className="flex items-center gap-4 flex-1">
        {/* Status Indicator */}
        <div className={`${config.color} p-3 rounded-full text-white shadow-lg`}>
          {config.icon}
        </div>

        {/* Worker Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 text-lg">{worker.displayName}</p>
            <Badge className={`text-xs font-semibold ${config.color} text-white border-0`}>
              {config.text}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            {worker.projectId && (
              <span className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                <MapPin className="h-3 w-3 text-blue-600" />
                <span className="font-medium">Projekt:</span> {worker.projectId}
              </span>
            )}
            {worker.siteId && (
              <span className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-md">
                <Navigation className="h-3 w-3 text-purple-600" />
                <span className="font-medium">Site:</span> {worker.siteId}
              </span>
            )}
          </div>
        </div>

        {/* Time Display */}
        <div className="text-right bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border-2 border-blue-200">
          <p className="font-mono text-2xl font-bold text-[#058bc0]">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          </p>
          <p className="text-xs text-gray-600 font-medium">
            ⏰ Start: {worker.since && worker.since.toLocaleTimeString('de-DE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            title="Supervisor-Notiz hinzufügen"
            className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all"
            title="Schicht beenden"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


