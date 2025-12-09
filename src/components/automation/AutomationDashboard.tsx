import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AutomationService } from '@/services/automationService';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Key, AlertCircle, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import type { AutomationQueueItem, AutomationKey, AutomationEvent } from '@/types/automation';

interface AutomationDashboardProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  onOpenMessaging: () => void;
}

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({
  onBack,
  onNavigate,
  onOpenMessaging,
}) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [automationService, setAutomationService] = useState<AutomationService | null>(null);
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [keys, setKeys] = useState<AutomationKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AutomationQueueItem | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    if (user) {
      const service = new AutomationService(user);
      setAutomationService(service);
      loadData(service);
    }
  }, [user]);

  const loadData = async (service: AutomationService) => {
    setLoading(true);
    try {
      const [queueItems, keysList] = await Promise.all([
        service.getQueueItems({ limit: 100 }),
        service.getKeys(),
      ]);

      // Convert queue items to events
      const eventsList: AutomationEvent[] = queueItems.map((item) => ({
        id: item.id,
        source: item.payload.source,
        type: item.payload.type,
        status: item.status,
        intent: item.intent,
        summary: item.summary || item.payload.summary,
        createdAt: item.createdAt,
        processedAt: item.processedAt,
        assignedTo: item.assignedUserId,
        error: item.error,
      }));

      setEvents(eventsList);
      setKeys(keysList);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden: ' + (error.message || 'Unbekannter Fehler'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (automationService) {
      loadData(automationService);
    }
  };

  const handleCreateKey = async () => {
    if (!automationService || !newKeyName.trim()) return;

    try {
      const { id, secret } = await automationService.createKey(newKeyName);
      setNewKeySecret(secret);
      toast({
        title: 'Erfolg',
        description: 'API-Schlüssel wurde erstellt',
      });
      await loadData(automationService);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Schlüssel konnte nicht erstellt werden: ' + (error.message || 'Unbekannter Fehler'),
        variant: 'destructive',
      });
    }
  };

  const handleToggleKey = async (keyId: string, currentActive: boolean) => {
    if (!automationService) return;

    try {
      await automationService.updateKey(keyId, { active: !currentActive });
      toast({
        title: 'Erfolg',
        description: `Schlüssel wurde ${!currentActive ? 'aktiviert' : 'deaktiviert'}`,
      });
      await loadData(automationService);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Schlüssel konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!automationService) return;
    if (!window.confirm('Möchten Sie diesen Schlüssel wirklich löschen?')) return;

    try {
      await automationService.deleteKey(keyId);
      toast({
        title: 'Erfolg',
        description: 'Schlüssel wurde gelöscht',
      });
      await loadData(automationService);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Schlüssel konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = async (eventId: string) => {
    if (!automationService) return;

    try {
      await automationService.retryQueueItem(eventId);
      toast({
        title: 'Erfolg',
        description: 'Event wurde zur erneuten Verarbeitung markiert',
      });
      await loadData(automationService);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Event konnte nicht erneut verarbeitet werden',
        variant: 'destructive',
      });
    }
  };

  const handleAssign = async (eventId: string, userId: string) => {
    if (!automationService) return;

    try {
      await automationService.assignQueueItem(eventId, userId);
      toast({
        title: 'Erfolg',
        description: 'Event wurde zugewiesen',
      });
      await loadData(automationService);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Event konnte nicht zugewiesen werden',
        variant: 'destructive',
      });
    }
  };

  const handleViewEvent = async (eventId: string) => {
    if (!automationService) return;

    try {
      const item = await automationService.getQueueItem(eventId);
      if (item) {
        setSelectedEvent(item);
        setShowEventDialog(true);
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Event konnte nicht geladen werden',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'default',
      completed: 'secondary',
      failed: 'destructive',
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      processing: <RefreshCw className="h-3 w-3 mr-1 animate-spin" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <XCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {icons[status]}
        {status}
      </Badge>
    );
  };

  const filteredEvents = events.filter((event) => {
    if (filterStatus !== 'all' && event.status !== filterStatus) return false;
    if (filterSource !== 'all' && event.source !== filterSource) return false;
    return true;
  });

  const sources = Array.from(new Set(events.map((e) => e.source)));

  if (!hasPermission(['admin', 'office'])) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Automation Dashboard" 
          showBackButton={true}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="mt-4">
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">Sie haben keine Berechtigung für diese Seite.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="🤖 Automation Dashboard" 
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <Button 
          onClick={handleRefresh} 
          disabled={loading} 
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          🔄 Aktualisieren
        </Button>
      </AppHeader>
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Incoming Events */}
            <Card className="lg:col-span-2 tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <span className="text-2xl">📨</span>
                      Eingehende Events
                    </CardTitle>
                    <CardDescription className="text-white/80 mt-1">
                      Übersicht über alle Automation-Events
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📊</div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🎯 Alle</SelectItem>
                        <SelectItem value="pending">⏳ Pending</SelectItem>
                        <SelectItem value="processing">⚙️ Verarbeitung</SelectItem>
                        <SelectItem value="completed">✅ Abgeschlossen</SelectItem>
                        <SelectItem value="failed">❌ Fehler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🔗</div>
                    <Select value={filterSource} onValueChange={setFilterSource}>
                      <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                        <SelectValue placeholder="Quelle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🎯 Alle</SelectItem>
                        {sources.map((source) => (
                          <SelectItem key={source} value={source}>
                            🔌 {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Quelle</TableHead>
                        <TableHead className="font-semibold">Typ</TableHead>
                        <TableHead className="font-semibold">Intent</TableHead>
                        <TableHead className="font-semibold">Zusammenfassung</TableHead>
                        <TableHead className="font-semibold">Erstellt</TableHead>
                        <TableHead className="font-semibold">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="text-5xl mb-3">📭</div>
                            <p className="text-gray-600 font-medium">Keine Events gefunden</p>
                            <p className="text-gray-500 text-sm mt-1">Passen Sie die Filter an oder warten Sie auf neue Events</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEvents.map((event) => (
                          <TableRow key={event.id} className="hover:bg-blue-50 transition-colors">
                            <TableCell>{getStatusBadge(event.status)}</TableCell>
                            <TableCell className="font-medium">{event.source}</TableCell>
                            <TableCell>{event.type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50">{event.intent || 'unknown'}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{event.summary || '-'}</TableCell>
                            <TableCell className="text-sm">
                              {event.createdAt.toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewEvent(event.id)}
                                  className="text-xs"
                                >
                                  👁️ Details
                                </Button>
                                {event.status === 'failed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRetry(event.id)}
                                    className="text-xs bg-orange-50 hover:bg-orange-100"
                                  >
                                    🔄 Retry
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card className="tradetrackr-card border-2 border-purple-500 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <span className="text-2xl">🔑</span>
                      API-Schlüssel
                    </CardTitle>
                    <CardDescription className="text-white/80 mt-1">
                      Verwaltung der Automation-Keys
                    </CardDescription>
                  </div>
                  <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm"
                        className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        ✨ Neu
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border-4 border-purple-500 shadow-2xl bg-white overflow-hidden">
                      <DialogHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white -mx-6 -mt-6 px-6 py-5 mb-6">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                          <span className="text-4xl">🔑</span>
                          Neuer API-Schlüssel
                        </DialogTitle>
                        <DialogDescription className="text-white/90 mt-2">
                          Erstellen Sie einen neuen Schlüssel für externe Services
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 px-2">
                        <div className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                          <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                            <span className="text-base">🏷️</span>
                            Service-Name
                          </Label>
                          <Input
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="z.B. Meiti AI"
                            className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        
                        {newKeySecret && (
                          <div className="p-5 bg-gradient-to-br from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-lg shadow-lg animate-pulse">
                            <Label className="text-yellow-900 font-bold text-base flex items-center gap-2 mb-3">
                              <span className="text-2xl">⚠️</span>
                              WICHTIG: Kopieren Sie diesen Schlüssel jetzt!
                            </Label>
                            <p className="text-sm text-yellow-800 mb-3">
                              Der Schlüssel wird nicht erneut angezeigt. Speichern Sie ihn an einem sicheren Ort.
                            </p>
                            <div className="mt-3 p-3 bg-white border-2 border-yellow-500 rounded-lg font-mono text-sm break-all shadow-inner">
                              {newKeySecret}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 w-full bg-yellow-50 hover:bg-yellow-100 border-2 border-yellow-500 font-semibold"
                              onClick={() => {
                                navigator.clipboard.writeText(newKeySecret);
                                toast({ title: '✅ Kopiert', description: 'Schlüssel in Zwischenablage kopiert' });
                              }}
                            >
                              📋 In Zwischenablage kopieren
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowKeyDialog(false)}
                            className="flex-1 border-2 border-gray-300 hover:bg-gray-100 font-semibold"
                          >
                            ❌ Abbrechen
                          </Button>
                          <Button 
                            onClick={handleCreateKey} 
                            className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                          >
                            ✨ Erstellen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="bg-gradient-to-br from-purple-50 to-pink-50 p-6">
                <div className="space-y-3">
                  {keys.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border-2 border-gray-200">
                      <div className="text-5xl mb-3">🔐</div>
                      <p className="text-sm text-gray-600 font-medium">Keine Schlüssel vorhanden</p>
                      <p className="text-xs text-gray-500 mt-1">Erstellen Sie einen neuen API-Schlüssel</p>
                    </div>
                  ) : (
                    keys.map((key) => (
                      <div key={key.id} className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-md hover:shadow-lg hover:border-purple-500 transition-all">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="text-base">🔌</span>
                            {key.serviceName}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                            <span>📅</span>
                            Erstellt: {key.createdAt.toLocaleDateString('de-DE')}
                          </div>
                          {key.lastUsed && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <span>🕒</span>
                              Zuletzt verwendet: {key.lastUsed.toLocaleDateString('de-DE')}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleKey(key.id, key.active)}
                            className="flex-1 text-xs"
                          >
                            {key.active ? '⏸️ Deaktivieren' : '▶️ Aktivieren'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteKey(key.id)}
                            className="flex-1 text-xs bg-red-50 hover:bg-red-100 border-red-200"
                          >
                            🗑️ Löschen
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Event-Details</DialogTitle>
              <DialogDescription>Vollständige Informationen zum Event</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <div>{getStatusBadge(selectedEvent.status)}</div>
              </div>
              <div>
                <Label>Quelle</Label>
                <div>{selectedEvent.payload?.source || '-'}</div>
              </div>
              <div>
                <Label>Typ</Label>
                <div>{selectedEvent.payload?.type || '-'}</div>
              </div>
              <div>
                <Label>Intent</Label>
                <div>
                  <Badge>{selectedEvent.intent || 'unknown'}</Badge>
                </div>
              </div>
              <div>
                <Label>Priorität</Label>
                <div>
                  <Badge variant="outline">{selectedEvent.priority || 'medium'}</Badge>
                </div>
              </div>
              <div>
                <Label>Zusammenfassung</Label>
                <div className="p-2 bg-gray-50 rounded">{selectedEvent.payload?.summary || '-'}</div>
              </div>
              <div>
                <Label>Client</Label>
                <div className="p-2 bg-gray-50 rounded">
                  {selectedEvent.payload?.client ? (
                    <div>
                      <div>Name: {selectedEvent.payload.client.name || '-'}</div>
                      <div>E-Mail: {selectedEvent.payload.client.email || '-'}</div>
                      <div>Telefon: {selectedEvent.payload.client.phone || '-'}</div>
                    </div>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
              {selectedEvent.error && (
                <div>
                  <Label className="text-red-600">Fehler</Label>
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                    {selectedEvent.error}
                  </div>
                </div>
              )}
              <div>
                <Label>Vollständiges Payload (JSON)</Label>
                <Textarea
                  value={JSON.stringify(selectedEvent.payload || {}, null, 2)}
                  readOnly
                  className="font-mono text-xs"
                  rows={10}
                />
              </div>
              <div className="flex gap-2">
                {selectedEvent.status === 'failed' && (
                  <Button onClick={() => handleRetry(selectedEvent.id)}>
                    Erneut versuchen
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                  Schließen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
        </div>
      </div>

      {/* Quick Action Sidebar */}
    </div>
  );
};

