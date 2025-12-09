/**
 * Countdown Spinner Component
 * 
 * Shows a loading spinner with countdown from specified seconds
 * Stops immediately when loading completes
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface CountdownSpinnerProps {
  isLoading: boolean;
  maxSeconds?: number;
  message?: string;
}

export const CountdownSpinner: React.FC<CountdownSpinnerProps> = ({
  isLoading,
  maxSeconds = 20,
  message = 'Dokument wird analysiert...'
}) => {
  const [countdown, setCountdown] = useState(maxSeconds);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Reset countdown when loading starts
      setCountdown(maxSeconds);
      setStartTime(Date.now());

      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Loading completed - stop immediately
      if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setCountdown(Math.max(0, maxSeconds - elapsed));
      }
      setStartTime(null);
    }
  }, [isLoading, maxSeconds]);

  if (!isLoading && startTime === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6 min-w-[320px] border-4 border-blue-500">
        {/* Spinner with Countdown */}
        <div className="relative">
          {/* Rotating Spinner */}
          <Loader2 className="h-24 w-24 text-blue-500 animate-spin" />
          
          {/* Countdown in Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-blue-600">
              {countdown}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 mb-1">
            {message}
          </p>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Bitte warten...' : 'Abgeschlossen!'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-1000 ease-linear"
            style={{ 
              width: `${((maxSeconds - countdown) / maxSeconds) * 100}%` 
            }}
          />
        </div>

        {/* Sub-text */}
        <p className="text-xs text-gray-400">
          AI analysiert Rechnung mit OCR...
        </p>
      </div>
    </div>
  );
};













