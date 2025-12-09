// ============================================================================
// AI CONFIRM MODAL - Explicit User Consent for AI Analysis
// ============================================================================

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles, Brain, Zap, Shield, Clock } from 'lucide-react';

interface AIConfirmModalProps {
  file: { file: File; id: string };
  onConfirm: () => void;
  onCancel: () => void;
}

export function AIConfirmModal({ file, onConfirm, onCancel }: AIConfirmModalProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl border-2 border-purple-500 shadow-2xl">
        <DialogHeader className="border-b-2 border-purple-200 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-xl shadow-lg">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            KI-Analyse starten?
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-3">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                📎 Datei: <span className="text-purple-700">{file.file.name}</span>
              </p>
              <p className="text-xs text-gray-600">
                Größe: {(file.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl p-4 flex items-start gap-3 shadow-md">
              <div className="bg-amber-500 p-2 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-900 mb-2">⏱️ Wichtiger Hinweis:</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Die vollständige Analyse kann <strong>bis zu 1 Minute</strong> dauern. 
                  Die KI rät nicht – bei Unsicherheit wird manuelle Auswahl erforderlich sein.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center p-3 bg-white rounded-lg border-2 border-gray-200">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-900">KI-Powered</p>
                <p className="text-xs text-gray-600">Intelligent</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border-2 border-gray-200">
                <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-900">Kein Raten</p>
                <p className="text-xs text-gray-600">≥85% Konfidenz</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border-2 border-gray-200">
                <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-900">Präzise</p>
                <p className="text-xs text-gray-600">26 Typen</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
              Die KI liest den <strong>Dokumentinhalt</strong> und klassifiziert ihn. 
              Bei Konfidenz unter 85% ist <strong>manuelle Auswahl</strong> erforderlich.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-3 sm:justify-between pt-4 border-t-2 border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="border-2 border-gray-300 font-semibold px-6"
          >
            Abbrechen
          </Button>
          <Button 
            type="button" 
            onClick={onConfirm} 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 border-2 border-purple-700 shadow-lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Analyse starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

