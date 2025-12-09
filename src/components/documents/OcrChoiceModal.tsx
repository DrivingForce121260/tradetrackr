// ============================================================================
// OCR CHOICE MODAL - Ask User About Image Type
// ============================================================================

import React, { useState } from 'react';
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
import { Image, FileText, Scan, Camera, File, Sparkles, CheckCircle } from 'lucide-react';

interface OcrChoiceModalProps {
  file: { file: File; id: string };
  onChoice: (isScannedDocument: boolean) => void;
  onCancel: () => void;
}

export function OcrChoiceModal({ file, onChoice, onCancel }: OcrChoiceModalProps) {
  const [selectedType, setSelectedType] = useState<'image' | 'scanned' | null>(null);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl border-2 border-[#058bc0]">
        <DialogHeader className="border-b-2 border-gray-200 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-[#058bc0] to-[#047ba8] p-3 rounded-xl">
              <Scan className="h-7 w-7 text-white" />
            </div>
            Bildtyp bestimmen
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                📎 Datei: <span className="text-[#058bc0]">{file.file.name}</span>
              </p>
              <p className="text-xs text-gray-600">
                Größe: {(file.file.size / 1024).toFixed(1)} KB • Format: {file.file.type.split('/')[1]?.toUpperCase()}
              </p>
            </div>
            
            <p className="text-sm text-gray-700 leading-relaxed">
              Für eine <strong>präzise Dokumentenerkennung</strong> müssen wir wissen, um welchen Bildtyp es sich handelt:
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Choice Cards - Big and Beautiful */}
        <div className="grid grid-cols-2 gap-4 py-6">
          {/* Normal Image Card */}
          <button
            onClick={() => setSelectedType('image')}
            className={`group relative p-6 rounded-xl border-3 transition-all duration-300 text-left ${
              selectedType === 'image'
                ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg scale-105'
                : 'border-gray-300 bg-white hover:border-green-400 hover:shadow-md hover:scale-102'
            }`}
          >
            {selectedType === 'image' && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            
            <div className={`mx-auto mb-4 p-4 rounded-2xl w-fit transition-all ${
              selectedType === 'image' ? 'bg-green-500' : 'bg-gray-200 group-hover:bg-green-400'
            }`}>
              <Image className={`h-12 w-12 ${selectedType === 'image' ? 'text-white' : 'text-gray-600 group-hover:text-white'}`} />
            </div>
            
            <h3 className={`text-lg font-bold text-center mb-2 ${selectedType === 'image' ? 'text-green-900' : 'text-gray-900'}`}>
              🖼️ Normales Bild
            </h3>
            
            <div className="space-y-1 text-center">
              <p className="text-sm text-gray-700 font-medium">
                Foto, Screenshot, Produktbild
              </p>
              <Badge variant="outline" className={`mt-2 ${selectedType === 'image' ? 'bg-green-600 text-white border-green-700' : 'bg-gray-100'}`}>
                Keine OCR nötig
              </Badge>
            </div>
          </button>

          {/* Scanned Document Card */}
          <button
            onClick={() => setSelectedType('scanned')}
            className={`group relative p-6 rounded-xl border-3 transition-all duration-300 text-left ${
              selectedType === 'scanned'
                ? 'border-[#058bc0] bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg scale-105'
                : 'border-gray-300 bg-white hover:border-[#058bc0] hover:shadow-md hover:scale-102'
            }`}
          >
            {selectedType === 'scanned' && (
              <div className="absolute top-2 right-2 bg-[#058bc0] text-white rounded-full p-1">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            
            <div className={`mx-auto mb-4 p-4 rounded-2xl w-fit transition-all ${
              selectedType === 'scanned' ? 'bg-[#058bc0]' : 'bg-gray-200 group-hover:bg-[#058bc0]'
            }`}>
              <FileText className={`h-12 w-12 ${selectedType === 'scanned' ? 'text-white' : 'text-gray-600 group-hover:text-white'}`} />
            </div>
            
            <h3 className={`text-lg font-bold text-center mb-2 ${selectedType === 'scanned' ? 'text-[#058bc0]' : 'text-gray-900'}`}>
              📄 Gescanntes Dokument
            </h3>
            
            <div className="space-y-1 text-center">
              <p className="text-sm text-gray-700 font-medium">
                Rechnung, Lieferschein, Vertrag
              </p>
              <Badge variant="outline" className={`mt-2 ${selectedType === 'scanned' ? 'bg-[#058bc0] text-white border-[#047ba8]' : 'bg-gray-100'}`}>
                <Sparkles className="h-3 w-3 mr-1 inline" />
                OCR + KI verfügbar
              </Badge>
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <strong>💡 Tipp:</strong> Wenn Ihr Bild Text enthält (z.B. fotografierte Rechnung), 
            wählen Sie <strong>"Gescanntes Dokument"</strong> für intelligente Texterkennung.
          </p>
        </div>
        
        <DialogFooter className="flex gap-3 sm:justify-between pt-4 border-t-2 border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="border-2 border-gray-300 font-semibold"
          >
            Abbrechen
          </Button>
          <Button 
            type="button" 
            onClick={() => selectedType && onChoice(selectedType === 'scanned')}
            disabled={!selectedType}
            className="bg-gradient-to-r from-[#058bc0] to-[#047ba8] hover:from-[#047ba8] hover:to-[#036a8f] text-white font-bold px-6 border-2 border-[#047ba8] shadow-lg disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

