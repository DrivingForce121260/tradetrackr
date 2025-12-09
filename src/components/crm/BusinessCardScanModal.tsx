// ============================================================================
// BUSINESS CARD SCAN MODAL - Camera Capture & OCR
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, RotateCcw, Send, X, Loader2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsQR from 'jsqr';

interface BusinessCardScanModalProps {
  open: boolean;
  onClose: () => void;
  onFieldsDetected: (fields: any) => void;
  accountId: string;
}

const BusinessCardScanModal: React.FC<BusinessCardScanModalProps> = ({
  open,
  onClose,
  onFieldsDetected,
  accountId
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState<'camera' | 'preview'>('camera');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Load available video devices and start camera
  useEffect(() => {
    if (open) {
      console.log('📷 Modal opened, loading devices...');
      loadDevicesAndStart();
    }
    return () => {
      console.log('📷 Modal closing, stopping stream...');
      stopStream();
    };
  }, [open]);

  const loadDevicesAndStart = async () => {
    try {
      console.log('📷 Enumerating devices...');
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      
      console.log('📷 Found video devices:', videoDevices);
      setDevices(videoDevices);
      
      // Prefer rear camera
      const rearCamera = videoDevices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      
      const deviceId = rearCamera?.deviceId || videoDevices[0]?.deviceId || '';
      console.log('📷 Selected device:', deviceId, 'isEmpty:', deviceId === '');
      setSelectedDeviceId(deviceId);
      
      // Start stream immediately - even if deviceId is empty (use default camera)
      await startStreamWithDevice(deviceId);
    } catch (error) {
      console.error('📷 Error loading camera devices:', error);
      toast({
        title: 'Fehler',
        description: 'Kamera-Geräte konnten nicht geladen werden',
        variant: 'destructive'
      });
    }
  };

  // Restart stream when device changes
  useEffect(() => {
    if (open && selectedDeviceId && step === 'camera' && devices.length > 0) {
      console.log('📷 Device changed, restarting stream...');
      startStreamWithDevice(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const startStreamWithDevice = async (deviceId: string) => {
    try {
      console.log('📷 Starting stream with device:', deviceId, 'isEmpty:', !deviceId);
      stopStream();
      
      // Higher resolution for 60cm distance - card will be smaller but in focus
      const constraints: MediaStreamConstraints = {
        video: (deviceId && deviceId !== '') ? {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },  // Higher resolution for distant cards
          height: { ideal: 1080 },
          // Enable autofocus for better business card scanning
          focusMode: { ideal: 'continuous' } as any,
          // Request higher resolution for better OCR
          advanced: [
            { focusDistance: { ideal: 0.6 } } as any,  // ~60cm for fixed-focus webcams
          ]
        } : {
          // Fallback: just request any video, let browser choose
          width: { ideal: 1920 },  // Higher resolution
          height: { ideal: 1080 },
          focusMode: { ideal: 'continuous' } as any
        }
      };

      console.log('📷 Requesting getUserMedia with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('📷 Stream obtained:', mediaStream);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('📷 Stream set to video element');
        
        // Ensure video plays
        try {
          await videoRef.current.play();
          console.log('📷 Video playing');
        } catch (playError) {
          console.error('📷 Video play error:', playError);
        }
      } else {
        console.warn('📷 Video ref is null!');
      }
    } catch (error: any) {
      console.error('📷 Error starting camera:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Kamera-Berechtigung verweigert',
          description: 'Bitte erlauben Sie den Zugriff auf die Kamera in Ihren Browser-Einstellungen',
          variant: 'destructive'
        });
      } else if (error.name === 'NotFoundError') {
        toast({
          title: 'Keine Kamera gefunden',
          description: 'Bitte schließen Sie eine Kamera an oder überprüfen Sie die Verbindung',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Kamera-Fehler',
          description: error.message || 'Kamera konnte nicht gestartet werden',
          variant: 'destructive'
        });
      }
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  // QR Code scanning loop - only scan center 50% area (capture area)
  useEffect(() => {
    if (!stream || step !== 'camera' || !videoRef.current) return;

    let animationId: number;
    const scanCanvas = document.createElement('canvas');
    const scanCtx = scanCanvas.getContext('2d');

    const scanQRCode = () => {
      if (!videoRef.current || !scanCtx || step !== 'camera') return;

      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Only scan center 50% (matching capture area)
        const cropScale = 0.5;
        const sourceWidth = video.videoWidth * cropScale;
        const sourceHeight = video.videoHeight * cropScale;
        const sourceX = (video.videoWidth - sourceWidth) / 2;
        const sourceY = (video.videoHeight - sourceHeight) / 2;

        scanCanvas.width = sourceWidth;
        scanCanvas.height = sourceHeight;
        scanCtx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, sourceWidth, sourceHeight
        );
        
        const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          console.log('📱 QR Code detected:', code.data);
          setQrCodeData(code.data);
          setIsScanning(false);
        }
      }

      if (step === 'camera') {
        animationId = requestAnimationFrame(scanQRCode);
      }
    };

    setIsScanning(true);
    scanQRCode();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [stream, step]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop to center 50% (smaller capture area so card fills frame at 60cm)
    const cropScale = 0.5; // Use only center 50% of camera view
    const sourceWidth = video.videoWidth * cropScale;
    const sourceHeight = video.videoHeight * cropScale;
    const sourceX = (video.videoWidth - sourceWidth) / 2;
    const sourceY = (video.videoHeight - sourceHeight) / 2;

    // Set canvas size to cropped area
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    // Draw cropped video frame (center portion only)
    ctx.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight,  // Source crop area
      0, 0, sourceWidth, sourceHeight               // Destination
    );

    // Convert to JPEG blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setStep('preview');
        stopStream();
      }
    }, 'image/jpeg', 0.9);
  };

  const retake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setConsent(false);
    setQrCodeData(null);
    setStep('camera');
  };

  const sendForAnalysis = async () => {
    if (!capturedImage || !consent) return;

    setIsAnalyzing(true);

    try {
      // Convert image URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('@/config/firebase');
      
      const timestamp = Date.now();
      const storagePath = `accounts/${accountId}/business_cards/${timestamp}/card.jpg`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, blob);
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
          ocrApplied: false
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
        documentId: docRef.id,
        qrCodeData: qrCodeData || undefined  // Include QR code data if available
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

      // Pass entire data object to parent (fields, confidence, needs_review)
      onFieldsDetected(data);
      onClose();

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

  const handleClose = () => {
    stopStream();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setConsent(false);
    setQrCodeData(null);
    setStep('camera');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl" aria-describedby="business-card-scan-description">
        <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-4 mb-4 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10">
            <div className="bg-white/25 p-2 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
              📇
            </div>
            <div className="flex-1">
              Visitenkarte scannen
              <div id="business-card-scan-description" className="text-xs font-normal text-white/80 mt-1">
                Erfassen Sie Kontaktdaten automatisch per Kamera
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'camera' && (
            <>
              {/* Camera Selection */}
              {devices.length > 1 && (
                <div className="mb-4">
                  <Label className="font-semibold text-gray-900">Kamera auswählen</Label>
                  <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                    <SelectTrigger className="bg-white border-2 border-blue-300 focus:border-[#058bc0] font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Kamera ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Camera Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '1.6', maxHeight: '50vh' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onClick={async (e) => {
                    // Tap to focus (if supported)
                    if (stream) {
                      const track = stream.getVideoTracks()[0];
                      const capabilities = track.getCapabilities();
                      if (capabilities.focusMode?.includes('continuous')) {
                        console.log('📷 Autofocus supported, refocusing...');
                        try {
                          await track.applyConstraints({
                            advanced: [{ focusMode: 'continuous' } as any]
                          });
                        } catch (err) {
                          console.log('📷 Focus constraint error:', err);
                        }
                      }
                    }
                  }}
                />
                
                {/* Overlay guide - shows the actual capture area (center 50%) */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Darken outer areas that won't be captured */}
                  <div className="absolute inset-0 bg-black/40" />
                  
                  {/* Capture frame - center 50% */}
                  <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border-4 border-green-400 rounded-lg bg-transparent shadow-2xl">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="border border-green-300/30" />
                      ))}
                    </div>
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400" />
                  </div>
                </div>

                {/* QR Code indicator */}
                {qrCodeData && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500 text-white font-bold px-3 py-2 shadow-lg">
                      <QrCode className="h-4 w-4 mr-2 inline" />
                      QR-Code erkannt
                    </Badge>
                  </div>
                )}

                {/* Hint text */}
                <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-white text-sm font-semibold bg-black/70 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                      📇 Karte im grünen Rahmen positionieren
                    </p>
                    <p className="text-white text-xs bg-black/70 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                      💡 Optimaler Abstand: 60-80cm | Karte füllt Rahmen aus
                    </p>
                    {isScanning && !qrCodeData && (
                      <p className="text-white text-xs bg-blue-500/80 inline-block px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
                        🔍 Scanne nach QR-Code...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="flex justify-end gap-3 pt-3 border-t-2 border-gray-300">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="border-2 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-6 py-5 text-sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-8 py-5 text-sm border-2 border-[#047ba8]"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Foto aufnehmen
                </Button>
              </div>
            </>
          )}

          {step === 'preview' && capturedImage && (
            <>
              {/* Image Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img src={capturedImage} alt="Captured business card" className="w-full h-auto" />
                
                {/* QR Code badge if detected */}
                {qrCodeData && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500 text-white font-bold px-3 py-2 shadow-lg">
                      <QrCode className="h-4 w-4 mr-2 inline" />
                      QR-Code vorhanden
                    </Badge>
                  </div>
                )}
              </div>

              {/* QR Code Data Display */}
              {qrCodeData && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <QrCode className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-900">QR-Code erkannt</p>
                      <p className="text-xs text-green-800 font-mono mt-1 break-all">{qrCodeData}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Consent */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked as boolean)}
                  />
                  <Label htmlFor="consent" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Ich stimme der Analyse dieser Aufnahme durch KI zu. Die Daten werden nur für die Kontaktverwaltung verwendet.
                  </Label>
                </div>
              </div>

              {/* Preview Controls */}
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
                  onClick={retake}
                  className="border-2 border-blue-400 text-blue-700 hover:bg-blue-100 hover:border-blue-600 font-bold shadow-md hover:shadow-lg transition-all px-6 py-5 text-sm"
                  disabled={isAnalyzing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Neu aufnehmen
                </Button>
                <Button
                  onClick={sendForAnalysis}
                  disabled={!consent || isAnalyzing}
                  className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-8 py-5 text-sm border-2 border-[#047ba8] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default BusinessCardScanModal;

