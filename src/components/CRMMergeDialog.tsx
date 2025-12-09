import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { CRMAccount } from '@/types/crm';

interface CRMMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: CRMAccount;
  incoming: Record<string, string>;
  onMerge: (merged: CRMAccountFormData) => Promise<void>;
  onSkip?: () => void;
}

interface CRMAccountFormData {
  name: string;
  legalForm?: string;
  vatId?: string;
  addresses: any[];
  billingEmail?: string;
  tags: string[];
  source: 'referral' | 'web' | 'phone' | 'other' | 'import';
}

const CRMMergeDialog: React.FC<CRMMergeDialogProps> = ({ open, onOpenChange, existing, incoming, onMerge, onSkip }) => {
  const [fieldChoices, setFieldChoices] = useState<Record<string, 'existing' | 'incoming' | 'combined'>>({
    name: existing.name && incoming.name ? 'existing' : (existing.name ? 'existing' : 'incoming'),
    legalForm: existing.legalForm && incoming.legalForm ? 'existing' : (existing.legalForm ? 'existing' : 'incoming'),
    vatId: existing.vatId && incoming.vatId ? 'existing' : (existing.vatId ? 'existing' : 'incoming'),
    billingEmail: existing.billingEmail && incoming.email ? 'existing' : (existing.billingEmail ? 'existing' : 'incoming'),
  });
  const [combinedValues, setCombinedValues] = useState<Record<string, string>>({
    name: existing.name || incoming.name || '',
    legalForm: existing.legalForm || incoming.legalForm || '',
    vatId: existing.vatId || incoming.vatId || incoming.vat || '',
    billingEmail: existing.billingEmail || incoming.email || '',
  });

  const handleFieldChoice = (field: string, choice: 'existing' | 'incoming' | 'combined') => {
    setFieldChoices({ ...fieldChoices, [field]: choice });
    if (choice === 'existing') {
      setCombinedValues({ ...combinedValues, [field]: (existing as any)[field] || '' });
    } else if (choice === 'incoming') {
      const incomingKey = field === 'billingEmail' ? 'email' : field === 'vatId' ? (incoming.vatId ? 'vatId' : 'vat') : field;
      setCombinedValues({ ...combinedValues, [field]: incoming[incomingKey] || '' });
    }
  };

  const handleCombinedChange = (field: string, value: string) => {
    setCombinedValues({ ...combinedValues, [field]: value });
  };

  const handleMerge = async () => {
    const merged: CRMAccountFormData = {
      name: fieldChoices.name === 'combined' ? combinedValues.name : (fieldChoices.name === 'existing' ? existing.name : (incoming.name || incoming.company || '')),
      legalForm: fieldChoices.legalForm === 'combined' ? combinedValues.legalForm : (fieldChoices.legalForm === 'existing' ? existing.legalForm : (incoming.legalForm || '')),
      vatId: fieldChoices.vatId === 'combined' ? combinedValues.vatId : (fieldChoices.vatId === 'existing' ? existing.vatId : (incoming.vatId || incoming.vat || '')),
      billingEmail: fieldChoices.billingEmail === 'combined' ? combinedValues.billingEmail : (fieldChoices.billingEmail === 'existing' ? existing.billingEmail : (incoming.email || '')),
      addresses: existing.addresses || [],
      tags: [...(existing.tags || []), ...(incoming.tags ? incoming.tags.split(',').map(s => s.trim()).filter(Boolean) : [])],
      source: existing.source,
    };
    await onMerge(merged);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Duplikat gefunden - Zusammenführen
          </DialogTitle>
          <DialogDescription>
            Ein Account mit gleicher VAT-ID oder E-Mail existiert bereits. Wählen Sie für jedes Feld, welcher Wert übernommen werden soll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
            <div>
              <Label className="font-semibold">Bestehend</Label>
              <div className="text-sm text-gray-600 mt-1">
                <div>Name: {existing.name || '-'}</div>
                <div>Rechtsform: {existing.legalForm || '-'}</div>
                <div>VAT: {existing.vatId || '-'}</div>
                <div>E-Mail: {existing.billingEmail || '-'}</div>
              </div>
            </div>
            <div>
              <Label className="font-semibold">Neu (CSV)</Label>
              <div className="text-sm text-gray-600 mt-1">
                <div>Name: {incoming.name || incoming.company || '-'}</div>
                <div>Rechtsform: {incoming.legalForm || '-'}</div>
                <div>VAT: {incoming.vatId || incoming.vat || '-'}</div>
                <div>E-Mail: {incoming.email || '-'}</div>
              </div>
            </div>
          </div>

          {(['name', 'legalForm', 'vatId', 'billingEmail'] as const).map((field) => {
            const existingVal = field === 'billingEmail' ? existing.billingEmail : (existing as any)[field];
            const incomingKey = field === 'billingEmail' ? 'email' : field === 'vatId' ? (incoming.vatId ? 'vatId' : 'vat') : field;
            const incomingVal = incoming[incomingKey];
            const label = field === 'billingEmail' ? 'E-Mail' : field === 'vatId' ? 'VAT-ID' : field === 'legalForm' ? 'Rechtsform' : 'Name';

            return (
              <div key={field} className="space-y-2 border-b pb-3">
                <Label className="font-medium">{label}</Label>
                <RadioGroup
                  value={fieldChoices[field]}
                  onValueChange={(v) => handleFieldChoice(field, v as any)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id={`${field}-existing`} />
                    <Label htmlFor={`${field}-existing`} className="flex-1 cursor-pointer">
                      Bestehend: <span className="text-gray-600">{existingVal || '(leer)'}</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="incoming" id={`${field}-incoming`} />
                    <Label htmlFor={`${field}-incoming`} className="flex-1 cursor-pointer">
                      Neu (CSV): <span className="text-gray-600">{incomingVal || '(leer)'}</span>
                    </Label>
                  </div>
                  {existingVal && incomingVal && existingVal !== incomingVal && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="combined" id={`${field}-combined`} />
                        <Label htmlFor={`${field}-combined`} className="cursor-pointer">Manuell bearbeiten:</Label>
                      </div>
                      <Input
                        value={combinedValues[field]}
                        onChange={(e) => handleCombinedChange(field, e.target.value)}
                        disabled={fieldChoices[field] !== 'combined'}
                        className="ml-6"
                      />
                    </div>
                  )}
                </RadioGroup>
              </div>
            );
          })}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => {
              onOpenChange(false);
              if (onSkip) onSkip();
            }}>Überspringen</Button>
            <Button onClick={handleMerge} className="bg-[#058bc0] hover:bg-[#047aa0] text-white">
              <CheckCircle className="h-4 w-4 mr-2" />
              Zusammenführen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CRMMergeDialog;

