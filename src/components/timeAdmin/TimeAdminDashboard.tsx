/**
 * TradeTrackr - Time Admin Dashboard
 * Overview with KPIs, active punches, exceptions, pending approvals
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Clock, Users, AlertCircle, CheckCircle, TrendingUp, Activity, XCircle, FileBarChart } from 'lucide-react';
import { getDashboardStats, getActivePunches } from '../../services/timeAdminService';
import type { Punch } from '../../services/timeAdminService';
import AppHeader from '../AppHeader';
import { useAuth } from '@/contexts/AuthContext';

interface TimeAdminDashboardProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

export function TimeAdminDashboard({ onBack, onNavigate, onOpenMessaging }: TimeAdminDashboardProps) {
  const { user, hasPermission } = useAuth();
  const concernId = user?.concernId || '';
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['timeAdminStats', concernId],
    queryFn: () => getDashboardStats(concernId),
  });

  // Fetch active punches
  const { data: activePunches, isLoading: punchesLoading } = useQuery({
    queryKey: ['activePunches', concernId],
    queryFn: () => getActivePunches(concernId),
  });

  if (statsLoading) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Zeit-Administration"
          showBackButton={true}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#058bc0]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="⏱️ Zeit-Administration"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Description */}
        <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-lg">
          <CardContent className="p-4">
            <p className="text-gray-800 font-medium flex items-center gap-2">
              <span className="text-xl">ℹ️</span>
              Zentrale Verwaltung für Zeiterfassung, Genehmigungen und Auswertungen
            </p>
          </CardContent>
        </Card>

        {/* Zeit-Module Quick Navigation */}
        <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🚀</span>
              Schnellzugriff
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => onNavigate?.('time-ops-live')}
                className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Activity className="h-4 w-4" />
                📊 Live-Ansicht
              </Button>
              <Button
                onClick={() => onNavigate?.('time-ops-exceptions')}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <XCircle className="h-4 w-4" />
                ⚠️ Ausnahmen
              </Button>
              <Button
                onClick={() => onNavigate?.('time-ops-reports')}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <FileBarChart className="h-4 w-4" />
                📈 Berichte
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Aktive Schichten
                </p>
                <p className="text-3xl font-bold mt-2">{stats?.activePunches || 0}</p>
              </div>
              <div className="text-4xl">⏰</div>
            </div>
          </CardContent>
        </Card>
        <Card className="tradetrackr-card bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Genehmigungen
                </p>
                <p className="text-3xl font-bold mt-2">{stats?.pendingTimesheets || 0}</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </CardContent>
        </Card>
        <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Urlaubsanträge
                </p>
                <p className="text-3xl font-bold mt-2">{stats?.pendingLeave || 0}</p>
              </div>
              <div className="text-4xl">🏖️</div>
            </div>
          </CardContent>
        </Card>
        <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Diese Woche
                </p>
                <p className="text-3xl font-bold mt-2">{stats?.totalHoursWeek.toFixed(1) || '0'} h</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Punches */}
      <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            ⏰ Aktive Schichten ({activePunches?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
          {punchesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#058bc0] mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Lädt aktive Schichten...</p>
            </div>
          ) : !activePunches || activePunches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-gray-200">
              <div className="text-6xl mb-4">😴</div>
              <p className="text-gray-600 font-medium">Keine aktiven Schichten</p>
              <p className="text-gray-500 text-sm mt-2">Derzeit sind keine Mitarbeiter im Dienst</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePunches.map((punch) => (
                <ActivePunchItem key={punch.punchId} punch={punch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Genehmigungen"
          description="Stundenzettel und Anträge genehmigen"
          icon={<CheckCircle className="h-8 w-8" />}
          page="time-admin-approvals"
          onNavigate={onNavigate}
        />
        <QuickActionCard
          title="Stundenzettel"
          description="Perioden ansehen und verwalten"
          icon={<Clock className="h-8 w-8" />}
          page="time-admin-timesheets"
          onNavigate={onNavigate}
        />
        <QuickActionCard
          title="Exporte"
          description="CSV/PDF/DATEV exportieren"
          icon={<TrendingUp className="h-8 w-8" />}
          page="time-admin-exports"
          onNavigate={onNavigate}
        />
      </div>

      {/* Quick Action Sidebar - removed, using DesktopSidebar instead */}
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}

function KPICard({ title, value, icon, color, suffix = '' }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-2">
              {value}
              {suffix}
            </p>
          </div>
          <div className={`${color} p-3 rounded-lg text-white`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivePunchItemProps {
  punch: Punch;
}

function ActivePunchItem({ punch }: ActivePunchItemProps) {
  const startTime = punch.startAt.toDate();
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 shadow-md hover:shadow-lg hover:border-[#058bc0] transition-all">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
          <span className="text-lg">👤</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">User: {punch.uid}</p>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Gestartet: {startTime.toLocaleTimeString('de-DE')}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-2xl font-bold text-[#058bc0]">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
        </p>
        <p className="text-xs text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded">{punch.method}</p>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  page: string;
  onNavigate?: (page: string) => void;
}

function QuickActionCard({ title, description, icon, page, onNavigate }: QuickActionCardProps) {
  const getGradient = (title: string) => {
    if (title.includes('Genehmigungen')) return 'from-green-500 to-emerald-600';
    if (title.includes('Stundenzettel')) return 'from-[#058bc0] to-[#0470a0]';
    if (title.includes('Exporte')) return 'from-purple-500 to-purple-600';
    return 'from-[#058bc0] to-[#0470a0]';
  };

  const getEmoji = (title: string) => {
    if (title.includes('Genehmigungen')) return '✅';
    if (title.includes('Stundenzettel')) return '📋';
    if (title.includes('Exporte')) return '📤';
    return '📋';
  };

  return (
    <Card 
      className={`tradetrackr-card border-2 border-[#058bc0] shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer overflow-hidden`}
      onClick={() => onNavigate?.(page)}
    >
      <CardHeader className={`bg-gradient-to-r ${getGradient(title)} text-white px-6 py-3`}>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <span className="text-2xl">{getEmoji(title)}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-[#058bc0]">{icon}</div>
          <p className="text-sm text-gray-700 font-medium">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}


