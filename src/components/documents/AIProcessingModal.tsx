// ============================================================================
// AI PROCESSING MODAL - Shows Progress with Countdown
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Brain, Loader2, CheckCircle } from 'lucide-react';

interface AIProcessingModalProps {
  file: { file: File; id: string };
  isProcessing: boolean;
}

export function AIProcessingModal({ file, isProcessing }: AIProcessingModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      
      setProgress(prev => {
        const newProgress = Math.min(prev + (100 / 60), 100);
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg border-2 border-purple-500 shadow-2xl"
      >
        <DialogHeader className="border-b-2 border-purple-200 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-xl shadow-lg animate-pulse">
              <Brain className="h-7 w-7 text-white" />
            </div>
            KI-Analyse läuft...
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-3">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                📎 Analysiere: <span className="text-purple-700">{file.file.name}</span>
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Countdown Display */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              {/* Outer ring */}
              <div className="absolute w-32 h-32 rounded-full border-8 border-purple-200"></div>
              
              {/* Animated ring */}
              <div className="absolute w-32 h-32 rounded-full border-8 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
              
              {/* Center content */}
              <div className="relative z-10 text-center">
                <div className="text-5xl font-bold text-purple-700 mb-1">
                  {timeRemaining}
                </div>
                <div className="text-sm font-semibold text-gray-600">
                  Sekunden
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Fortschritt:</span>
              <span className="font-bold text-purple-700">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3 border-2 border-purple-300" />
          </div>

          {/* Status Messages */}
          <div className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
              progress >= 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
            }`}>
              {progress >= 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin flex-shrink-0" />
              )}
              <span className="text-sm font-semibold text-gray-900">
                {progress >= 0 ? '✓ Dokument hochgeladen' : 'Upload läuft...'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
              progress >= 20 ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
            }`}>
              {progress >= 20 ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin flex-shrink-0" />
              )}
              <span className="text-sm font-semibold text-gray-900">
                {progress >= 20 ? '✓ Text extrahiert' : 'Textextraktion läuft...'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
              progress >= 60 ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
            }`}>
              {progress >= 60 ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 text-purple-600 animate-spin flex-shrink-0" />
              )}
              <span className="text-sm font-semibold text-gray-900">
                {progress >= 60 ? '✓ KI-Klassifizierung abgeschlossen' : 'KI analysiert Dokument...'}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-900">
              <Sparkles className="h-4 w-4 inline mr-1" />
              <strong>Bitte warten...</strong> Die KI analysiert Ihr Dokument mit höchster Präzision.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

