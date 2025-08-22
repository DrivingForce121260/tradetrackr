import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Key, 
  Copy, 
  RefreshCw, 
  Building, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { concernService } from '@/services/firestoreService';

interface Concern {
  uid: string;
  concernName: string;
  concernEmail: string;
  verificationCode?: string;
  verificationCodeExpiry?: Date;
  verificationCodeActive?: boolean;
}

const VerificationCodeGenerator: React.FC = () => {
  const { toast } = useToast();
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConcernId, setSelectedConcernId] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    loadConcerns();
  }, []);

  const loadConcerns = async () => {
    try {
      setLoading(true);
      const allConcerns = await concernService.getAll();
      setConcerns(allConcerns);
    } catch (error) {

      toast({
        title: 'Fehler',
        description: 'Concerns konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    if (!selectedConcernId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wö¤hlen Sie ein Unternehmen aus.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const code = await concernService.generateVerificationCode(selectedConcernId);
      setGeneratedCode(code);
      
      toast({
        title: 'Code generiert',
        description: `Verifizierungscode ${code} wurde erfolgreich generiert.`,
      });
      
      // Aktualisiere die Concerns-Liste
      await loadConcerns();
      
    } catch (error) {

      toast({
        title: 'Fehler',
        description: 'Code konnte nicht generiert werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast({
        title: 'Code kopiert',
        description: 'Verifizierungscode wurde in die Zwischenablage kopiert.',
      });
    }
  };

  const deactivateCode = async (concernID: string) => {
    try {
      await concernService.deactivateVerificationCode(concernID);
      toast({
        title: 'Code deaktiviert',
        description: 'Verifizierungscode wurde erfolgreich deaktiviert.',
      });
      await loadConcerns();
    } catch (error) {

      toast({
        title: 'Fehler',
        description: 'Code konnte nicht deaktiviert werden.',
        variant: 'destructive',
      });
    }
  };

  const formatExpiryDate = (date: Date | undefined) => {
    if (!date) return 'Nicht gesetzt';
    return new Date(date).toLocaleString('de-DE');
  };

  const isCodeExpired = (date: Date | undefined) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-6 w-6" />
          Verifizierungscode-Generator
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Code generieren */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Neuen Code generieren</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="concern">Unternehmen auswö¤hlen</Label>
              <Select value={selectedConcernId} onValueChange={setSelectedConcernId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unternehmen wö¤hlen" />
                </SelectTrigger>
                <SelectContent>
                  {concerns.map((concern) => (
                    <SelectItem key={concern.uid} value={concern.uid}>
                      {concern.concernName} ({concern.concernEmail})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={generateCode} 
              disabled={loading || !selectedConcernId}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Code generieren
            </Button>
          </div>

          {generatedCode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-green-800">Generierter Code:</Label>
                  <div className="text-2xl font-mono text-green-900 mt-1">{generatedCode}</div>
                </div>
                <Button onClick={copyCode} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Kopieren
                </Button>
              </div>
              <p className="text-sm text-green-700 mt-2">
                Dieser Code ist 24 Stunden gültig und kann nur einmal verwendet werden.
              </p>
            </div>
          )}
        </div>

        {/* Bestehende Codes anzeigen */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Aktive Verifizierungscodes</h3>
          <div className="space-y-3">
            {concerns
              .filter(concern => concern.verificationCode && concern.verificationCodeActive)
              .map((concern) => (
                <div key={concern.uid} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{concern.concernName}</span>
                        <Badge variant="outline" className="text-xs">
                          {concern.verificationCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {concern.concernEmail}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatExpiryDate(concern.verificationCodeExpiry)}
                        </div>
                        {isCodeExpired(concern.verificationCodeExpiry) && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Abgelaufen
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!isCodeExpired(concern.verificationCodeExpiry) && (
                        <Button
                          onClick={() => deactivateCode(concern.uid)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deaktivieren
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            
            {concerns.filter(c => c.verificationCode && c.verificationCodeActive).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Keine aktiven Verifizierungscodes vorhanden</p>
                <p className="text-sm">Generieren Sie einen neuen Code für ein Unternehmen</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationCodeGenerator;

