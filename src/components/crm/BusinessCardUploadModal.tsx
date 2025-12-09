// ============================================================================
// BUSINESS CARD UPLOAD MODAL - File Upload & OCR
// ============================================================================

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, RotateCcw, Send, X, Loader2, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BusinessCardUploadModalProps {
  open: boolean;
  onClose: () => void;
  onFieldsDetected: (fields: any) => void;
  accountId: string;
}

const BusinessCardUploadModal: React.FC<BusinessCardUploadModalProps> = ({
  open,
  onClose,
  onFieldsDetected,
  accountId
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ungültiger Dateityp',
        description: 'Bitte wählen Sie eine Bilddatei aus',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Datei zu groß',
        description: 'Maximale Dateigröße ist 10MB',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setConsent(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const sendForAnalysis = async () => {
    if (!selectedFile || !consent) return;

    setIsAnalyzing(true);

    try {
      // Upload to Firebase Storage
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('@/config/firebase');
      
      const timestamp = Date.now();
      const storagePath = `accounts/${accountId}/business_cards/${timestamp}/card.jpg`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Create document in Firestore
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      const docRef = await addDoc(collection(db, 'documents'), {
        type: 'client.business_card',
        projectId: null,
        clientId: accountId,
        status: 'uploaded',
        storagePath,
        downloadURL,
        meta: {
          ocrApplied: false,
          uploadedFromDevice: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Call Cloud Function for analysis
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/config/firebase');
      
      const analyzeBusinessCard = httpsCallable(functions, 'analyzeBusinessCard');
      const result = await analyzeBusinessCard({
        accountId,
        imagePath: storagePath,
        documentId: docRef.id
      });

      const data = result.data as any;

      if (data.needs_review) {
        toast({
          title: 'Überprüfung erforderlich',
          description: 'Einige Felder konnten nicht sicher erkannt werden',
        });
      } else {
        toast({
          title: 'Erfolg',
          description: 'Visitenkarte erfolgreich analysiert',
        });
      }

      // Pass entire data object to parent
      onFieldsDetected(data);
      handleClose();

    } catch (error: any) {
      console.error('Error analyzing business card:', error);
      toast({
        title: 'Analyse fehlgeschlagen',
        description: error.message || 'Bitte versuchen Sie es erneut',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-purple-50 via-white to-pink-50 border-4 border-purple-500 shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 text-white -mx-6 -mt-6 px-6 py-4 mb-4 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10">
            <div className="bg-white/25 p-2 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
              📤
            </div>
            <div className="flex-1">
              Visitenkarte hochladen
              <div className="text-xs font-normal text-white/80 mt-1">
                Laden Sie ein Foto Ihrer Visitenkarte hoch
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!previewUrl ? (
            <>
              {/* Upload Area */}
              <div 
                className="border-4 border-dashed border-purple-300 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileImage className="h-16 w-16 mx-auto text-purple-400 mb-4" />
                <p className="text-lg font-bold text-gray-900 mb-2">
                  Visitenkarte auswählen
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Klicken Sie hier oder ziehen Sie eine Datei hierher
                </p>
                <p className="text-xs text-gray-500">
                  📱 Empfohlen: Foto mit Handy aufnehmen für beste Qualität
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Unterstützte Formate: JPG, PNG • Max. 10MB
                </p>
                <Button
                  className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Datei auswählen
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          ) : (
            <>
              {/* Image Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img src={previewUrl} alt="Selected business card" className="w-full h-auto" />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-purple-500 text-white font-bold px-3 py-2 shadow-lg">
                    <FileImage className="h-4 w-4 mr-2 inline" />
                    {selectedFile?.name}
                  </Badge>
                </div>
              </div>

              {/* File Info */}
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-purple-900">Dateigröße:</span>
                  <span className="text-purple-800">
                    {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0'} MB
                  </span>
                </div>
              </div>

              {/* Consent */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent-upload"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked as boolean)}
                  />
                  <Label htmlFor="consent-upload" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Ich stimme der Analyse dieser Aufnahme durch KI zu. Die Daten werden nur für die Kontaktverwaltung verwendet.
                  </Label>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-end gap-3 pt-3 border-t-2 border-gray-300">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="border-2 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-6 py-5 text-sm"
                  disabled={isAnalyzing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-2 border-purple-400 text-purple-700 hover:bg-purple-100 hover:border-purple-600 font-bold shadow-md hover:shadow-lg transition-all px-6 py-5 text-sm"
                  disabled={isAnalyzing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Andere Datei
                </Button>
                <Button
                  onClick={sendForAnalysis}
                  disabled={!consent || isAnalyzing}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-8 py-5 text-sm border-2 border-purple-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Senden zur Analyse
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessCardUploadModal;











