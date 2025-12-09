import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Smartphone, Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorAuthProps {
  onSuccess: () => void;
  onBack: () => void;
  email: string;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onSuccess, onBack, email }) => {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Nur ein Zeichen pro Feld
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Automatisch zum nö¤chsten Feld springen
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      // Zum vorherigen Feld springen bei Backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie den vollstö¤ndigen 6-stelligen Code ein.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulate 2FA verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo: Akzeptiere jeden 6-stelligen Code
      if (code.length === 6) {
        toast({
          title: 'Verifizierung erfolgreich',
          description: 'Zwei-Faktor-Authentifizierung erfolgreich abgeschlossen.',
        });
        onSuccess();
      } else {
        toast({
          title: 'Ungültiger Code',
          description: 'Der eingegebene Code ist nicht korrekt.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setCanResend(false);
    setTimeLeft(30);

    try {
      // Simulate resending code
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Code erneut gesendet',
        description: 'Ein neuer Verifizierungscode wurde an Ihre E-Mail gesendet.',
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Der Code konnte nicht erneut gesendet werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-lg">
            Zwei-Faktor-Authentifizierung
          </CardTitle>
          <p className="text-sm text-gray-600 text-center">
            Wir haben einen 6-stelligen Verifizierungscode an <strong>{email}</strong> gesendet.
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Verifizierungscode</Label>
            <div className="flex justify-center gap-2">
              {verificationCode.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-mono border-2 focus:border-purple-500"
                  placeholder="â€¢"
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              Geben Sie den 6-stelligen Code ein
            </p>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3"
            disabled={isLoading || verificationCode.join('').length !== 6}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Wird verifiziert...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Verifizieren
              </div>
            )}
          </Button>
        </form>

        {/* Resend Code */}
        <div className="text-center">
          {canResend ? (
            <Button
              variant="ghost"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-purple-600 hover:text-purple-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              Code erneut senden
            </Button>
          ) : (
            <p className="text-sm text-gray-500">
              Code erneut senden in {timeLeft} Sekunden
            </p>
          )}
        </div>

        {/* Demo Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Demo-Modus:</p>
              <p>Jeder 6-stellige Code wird akzeptiert. In der Produktion wird der Code per E-Mail gesendet.</p>
            </div>
          </div>
        </div>

        <Button
          onClick={onBack}
          variant="outline"
          className="w-full text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </CardContent>
    </Card>
  );
};

export default TwoFactorAuth;

