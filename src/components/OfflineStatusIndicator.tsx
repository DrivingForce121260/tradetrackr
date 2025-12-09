// ============================================================================
// OFFLINE STATUS INDICATOR COMPONENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { firestoreOfflineQueue } from '@/services/firestoreOfflineQueue';
import { useToast } from '@/hooks/use-toast';

interface OfflineStatusIndicatorProps {
  className?: string;
}

export const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ successful: number; failed: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to queue length changes
    const unsubscribe = firestoreOfflineQueue.subscribe((length) => {
      setQueueLength(length);
    });

    // Check online status
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastSyncResult(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine && queueLength > 0) {
      syncQueue();
    }

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncQueue = async () => {
    if (isSyncing || !isOnline) {
      return;
    }

    setIsSyncing(true);
    try {
      const result = await firestoreOfflineQueue.syncQueue();
      setLastSyncResult(result);

      if (result.successful > 0) {
        toast({
          title: 'Synchronisation erfolgreich',
          description: `${result.successful} Operation${result.successful > 1 ? 'en' : ''} synchronisiert.`,
          variant: 'default',
        });
      }

      if (result.failed > 0) {
        toast({
          title: 'Synchronisation teilweise fehlgeschlagen',
          description: `${result.failed} Operation${result.failed > 1 ? 'en' : ''} konnten nicht synchronisiert werden.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[OfflineStatusIndicator] Sync failed:', error);
      toast({
        title: 'Synchronisation fehlgeschlagen',
        description: 'Die Synchronisation konnte nicht durchgeführt werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show anything if online and no queue
  if (isOnline && queueLength === 0 && !lastSyncResult) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-orange-500" />
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            Offline
          </Badge>
          {queueLength > 0 && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
              {queueLength} in Warteschlange
            </Badge>
          )}
        </>
      ) : queueLength > 0 ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            {queueLength} ausstehend
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={syncQueue}
            disabled={isSyncing}
            className="h-7 px-2"
          >
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </>
      ) : lastSyncResult && lastSyncResult.successful > 0 ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            Synchronisiert
          </Badge>
        </>
      ) : null}
    </div>
  );
};

export default OfflineStatusIndicator;






