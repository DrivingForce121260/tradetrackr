/**
 * TradeTrackr - Zeit-Administration: Stundenzettel
 * Perioden ansehen und verwalten
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Calendar, Clock, User, TrendingUp, ArrowLeft, Search } from 'lucide-react';
import AppHeader from '../AppHeader';
import { useAuth } from '@/contexts/AuthContext';

interface TimesheetsProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

export function Timesheets({ onBack, onNavigate, onOpenMessaging }: TimesheetsProps) {
  const { user, hasPermission } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState<string>('current');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Placeholder data - will be replaced with real Firestore data
  const timesheets: any[] = [];

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="📋 Stundenzettel"
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
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Gesamt Stunden</p>
                    <p className="text-3xl font-bold mt-2">0.0 h</p>
                  </div>
                  <div className="text-4xl">⏱️</div>
                </div>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Diese Woche</p>
                    <p className="text-3xl font-bold mt-2">0.0 h</p>
                  </div>
                  <div className="text-4xl">📅</div>
                </div>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Mitarbeiter</p>
                    <p className="text-3xl font-bold mt-2">0</p>
                  </div>
                  <div className="text-4xl">👥</div>
                </div>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Ø Stunden/Tag</p>
                    <p className="text-3xl font-bold mt-2">0.0 h</p>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                Filter & Suche
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📅</div>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">📅 Aktuelle Woche</SelectItem>
                      <SelectItem value="last">⏮️ Letzte Woche</SelectItem>
                      <SelectItem value="month">📆 Dieser Monat</SelectItem>
                      <SelectItem value="all">🎯 Alle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">👤</div>
                  <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Mitarbeiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎯 Alle Mitarbeiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input
                    placeholder="Suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timesheets Table */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                Stundenzettel ({timesheets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white p-0">
              {timesheets.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-600 font-medium">Keine Stundenzettel vorhanden</p>
                  <p className="text-gray-500 text-sm mt-2">Stundenzettel werden hier angezeigt, sobald Mitarbeiter Zeit erfassen</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">👤 Mitarbeiter</TableHead>
                        <TableHead className="font-semibold">📅 Woche</TableHead>
                        <TableHead className="font-semibold">⏱️ Stunden</TableHead>
                        <TableHead className="font-semibold">📊 Status</TableHead>
                        <TableHead className="font-semibold">📝 Notizen</TableHead>
                        <TableHead className="font-semibold">⚡ Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          Keine Daten vorhanden
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Timesheets;













