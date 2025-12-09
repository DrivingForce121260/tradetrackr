import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  threshold: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

/**
 * Visual indicator for pull-to-refresh functionality
 */
export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  threshold,
  isRefreshing,
  canRefresh,
}) => {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const rotation = progress * 3.6; // 360 degrees at 100%

  if (pullDistance === 0 && !isRefreshing) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center py-4 transition-all duration-200',
        isRefreshing && 'opacity-100'
      )}
      style={{
        opacity: Math.min(pullDistance / threshold, 1),
      }}
    >
      <div className="relative">
        <RefreshCw
          className={cn(
            'h-6 w-6 text-blue-600 transition-transform duration-200',
            isRefreshing && 'animate-spin',
            canRefresh && !isRefreshing && 'text-green-600'
          )}
          style={{
            transform: isRefreshing ? 'rotate(0deg)' : `rotate(${rotation}deg)`,
          }}
        />
        {!isRefreshing && (
          <div
            className="absolute inset-0 rounded-full border-2 border-blue-200"
            style={{
              clipPath: `inset(0 ${100 - progress}% 0 0)`,
            }}
          />
        )}
      </div>
      <span
        className={cn(
          'ml-3 text-sm font-medium transition-colors',
          canRefresh ? 'text-green-600' : 'text-gray-600'
        )}
      >
        {isRefreshing
          ? 'Lädt...'
          : canRefresh
          ? 'Loslassen zum Aktualisieren'
          : 'Ziehen zum Aktualisieren'}
      </span>
    </div>
  );
};







