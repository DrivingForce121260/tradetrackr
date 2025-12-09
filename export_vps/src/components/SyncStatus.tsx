import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Play, Square, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SyncStatus: React.FC = () => {
  const { 
    isAutoSyncActive, 
    getLastSyncTime, 
    getSyncStatus, 
    startAutoSync, 
    stopAutoSync 
  } = useAuth();

  const syncStatus = getSyncStatus();
  const lastSyncTime = getLastSyncTime();
  const isActive = isAutoSyncActive();

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'idle':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Synchronisiere...';
      case 'error':
        return 'Fehler';
      case 'idle':
        return 'Aktiv';
      default:
        return 'Unbekannt';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'idle':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Noch nie';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Minuten`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Vor ${hours} Stunden`;
    
    const days = Math.floor(hours / 24);
    return `Vor ${days} Tagen`;
  };

  const handleToggleSync = () => {
    if (isActive) {
      stopAutoSync();
    } else {
      startAutoSync();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Firestore-Synchronisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status-Anzeige */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-2">{getStatusText()}</span>
          </Badge>
        </div>

        {/* Auto-Sync Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Auto-Sync:</span>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? 'Aktiv' : 'Inaktiv'}
          </Badge>
        </div>

        {/* Letzte Synchronisation */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Letzte Sync:</span>
          <span className="text-sm text-gray-600">{formatLastSync()}</span>
        </div>

        {/* Aktions-Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleToggleSync}
            variant={isActive ? "destructive" : "default"}
            size="sm"
            className="flex-1"
          >
            {isActive ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stoppen
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Starten
              </>
            )}
          </Button>
          
          {isActive && (
            <Button
              onClick={startAutoSync}
              variant="outline"
              size="sm"
              disabled={syncStatus === 'syncing'}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          )}
        </div>

        {/* Info-Text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Automatische Synchronisation:</p>
          <ul className="space-y-1">
            <li>â€¢ Lö¤uft im Hintergrund wö¤hrend Sie angemeldet sind</li>
            <li>â€¢ Aktualisiert alle Daten in Echtzeit</li>
            <li>â€¢ Stoppt automatisch beim Abmelden</li>
            <li>â€¢ Funktioniert nur für echte Benutzer (nicht Demo)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncStatus;
