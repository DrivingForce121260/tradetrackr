// ============================================================================
// BUSINESS CARD REVIEW DIALOG - Manual Review for Low-Confidence Fields
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface BusinessCardReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (fields: any) => void;
  detectedFields: any;
  confidence: number;
}

const BusinessCardReviewDialog: React.FC<BusinessCardReviewDialogProps> = ({
  open,
  onClose,
  onApply,
  detectedFields,
  confidence
}) => {
  const [fields, setFields] = useState<any>({});

  useEffect(() => {
    if (open && detectedFields) {
      setFields({
        company: detectedFields.company || '',
        contactName: detectedFields.contact?.fullName || '',
        contactEmail: detectedFields.email || '',
        contactPhone: detectedFields.phones?.[0]?.number || '',
        notes: detectedFields.extras?.note || ''
      });
    }
  }, [open, detectedFields]);

  const handleApply = () => {
    onApply(fields);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          
          <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
            <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
              📇
            </div>
            <div className="flex-1">
              Visitenkarte überprüfen
              <div className="text-xs font-normal text-white/80 mt-1">
                Bitte prüfen und korrigieren Sie die erkannten Felder
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Confidence Warning */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-700" />
              <p className="text-sm font-semibold text-yellow-900">
                Erkennungsgenauigkeit: {Math.round(confidence * 100)}% - Bitte überprüfen Sie die Felder sorgfältig
              </p>
            </div>
          </div>

          {/* Detected Fields */}
          <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-3 border-blue-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">🏢</span>
                Erkannte Felder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="review-company" className="font-semibold text-gray-900">Firmenname</Label>
                <Input
                  id="review-company"
                  value={fields.company || ''}
                  onChange={(e) => setFields({ ...fields, company: e.target.value })}
                  className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                />
              </div>
              <div>
                <Label htmlFor="review-contactName" className="font-semibold text-gray-900">Ansprechpartner</Label>
                <Input
                  id="review-contactName"
                  value={fields.contactName || ''}
                  onChange={(e) => setFields({ ...fields, contactName: e.target.value })}
                  className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="review-email" className="font-semibold text-gray-900">E-Mail</Label>
                  <Input
                    id="review-email"
                    type="email"
                    value={fields.contactEmail || ''}
                    onChange={(e) => setFields({ ...fields, contactEmail: e.target.value })}
                    className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="review-phone" className="font-semibold text-gray-900">Telefon</Label>
                  <Input
                    id="review-phone"
                    type="tel"
                    value={fields.contactPhone || ''}
                    onChange={(e) => setFields({ ...fields, contactPhone: e.target.value })}
                    className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="review-notes" className="font-semibold text-gray-900">Zusätzliche Informationen</Label>
                <Textarea
                  id="review-notes"
                  value={fields.notes || ''}
                  onChange={(e) => setFields({ ...fields, notes: e.target.value })}
                  rows={3}
                  className="bg-white border-2 border-blue-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/30 font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
            >
              <span className="text-xl mr-2">❌</span> Abbrechen
            </Button>
            <Button
              onClick={handleApply}
              className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Felder übernehmen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessCardReviewDialog;











