import React from 'react';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, queueLength, syncQueue } = useOfflineSupport();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && queueLength === 0) {
    return null; // Don't show when online and no queue
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300",
        "bg-white border-2 rounded-lg shadow-xl p-4",
        "max-w-sm",
        isOnline ? "border-green-500" : "border-red-500"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-full",
          isOnline ? "bg-green-100" : "bg-red-100"
        )}>
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-600" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="font-semibold text-gray-900">
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {queueLength > 0 && (
            <div className="text-sm text-gray-600">
              {queueLength} {queueLength === 1 ? 'Aktion' : 'Aktionen'} in Warteschlange
            </div>
          )}
          {!isOnline && (
            <div className="text-xs text-gray-500 mt-1">
              Änderungen werden gespeichert
            </div>
          )}
        </div>

        {queueLength > 0 && isOnline && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? 'Synchronisiere...' : 'Synchronisieren'}
          </Button>
        )}

        {queueLength > 0 && (
          <Badge variant={isOnline ? "default" : "secondary"}>
            {queueLength}
          </Badge>
        )}
      </div>
    </div>
  );
};







