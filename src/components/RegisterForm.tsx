import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { concernService, userService } from '@/services/firestoreService';

interface RegisterFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
  onShowAGB?: () => void;
  onShowDatenschutz?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onBack, onShowAGB, onShowDatenschutz }) => {
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'customer-type' | 'verification-code' | 'form'>('customer-type');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedCompanyEmail, setVerifiedCompanyEmail] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    address: '',
    city: '',
    postalCode: '',
    country: 'Deutschland',
    // Unternehmensfelder
    // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
    acceptTerms: false,
    acceptPrivacy: false,
    acceptMarketing: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Fehler',
        description: 'Die Passwö¶rter stimmen nicht überein.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Erweiterte Passwort-Validierung
    if (formData.password.length < 8) {
      toast({
        title: 'Fehler',
        description: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Mindestens ein GroöŸbuchstabe
    if (!/[A-Z]/.test(formData.password)) {
      toast({
        title: 'Fehler',
        description: 'Das Passwort muss mindestens einen GroöŸbuchstaben enthalten.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Mindestens eine Zahl
    if (!/\d/.test(formData.password)) {
      toast({
        title: 'Fehler',
        description: 'Das Passwort muss mindestens eine Zahl enthalten.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Für bestehende Kunden sind AGB und Datenschutz nicht erforderlich
    if (!isExistingCustomer && (!formData.acceptTerms || !formData.acceptPrivacy)) {
      toast({
        title: 'Fehler',
        description: 'Bitte akzeptieren Sie die AGB und Datenschutzerklö¤rung.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      if (isExistingCustomer) {
        // WICHTIG: Für bestehende Kunden NUR den Verifizierungscode-Prozess verwenden
        // KEINE Standard-Registrierung über signUp!
        

        
        // Verwende den gespeicherten Verifizierungscode für die Registrierung
        const storedConcernId = localStorage.getItem('temp_concern_id');
        
        if (!storedConcernId) {
          throw new Error('Verifizierungscode-Informationen fehlen. Bitte starten Sie den Prozess neu.');
        }
        
        // Erstelle den Benutzer mit dem Verifizierungscode
        // Füge das Passwort zu userData hinzu
        const userDataWithPassword: any = {
          ...formData,
          password: formData.password
        };
        

        
        try {
          const newUserId = await userService.createWithVerificationCode(userDataWithPassword, verificationCode);

          
          // WICHTIG: Bereinige doppelte Benutzer-Eintrö¤ge
          try {

            
            // Verwende die gespeicherte ConcernID als bevorzugte ConcernID
            const storedConcernId = localStorage.getItem('temp_concern_id');
            if (storedConcernId) {

              await userService.cleanupDuplicateUsersWithConcernID(verifiedCompanyEmail, storedConcernId);
            } else {

              await userService.cleanupDuplicateUsers(verifiedCompanyEmail);
            }
            

          } catch (cleanupError) {

            // Fahre trotzdem fort - der Benutzer wurde erfolgreich erstellt
          }
          
          // Lö¶sche die temporö¤ren Daten
          localStorage.removeItem('temp_concern_id');
          
          // WICHTIG: KEINE automatische Anmeldung nach Verifizierungscode-Registrierung
          // Der Benutzer soll sich manuell anmelden, um den Fallback-Mechanismus zu vermeiden

          
          toast({
            title: 'Registrierung erfolgreich',
            description: 'Ihr Account wurde erfolgreich erstellt. Bitte melden Sie sich jetzt an.',
          });
          
          // Zurück zum Login-Formular
          if (onSuccess) {
            onSuccess();
          }
          
        } catch (verificationError) {

          
          // Detaillierte Fehlerbehandlung
          let errorMessage = 'Fehler bei der Registrierung.';
          
          if (verificationError instanceof Error) {
            if (verificationError.message.includes('Firebase Auth Fehler')) {
              errorMessage = 'Fehler bei der Firebase-Authentifizierung. Bitte versuchen Sie es erneut.';
            } else if (verificationError.message.includes('Ungültiger oder abgelaufener Verifizierungscode')) {
              errorMessage = 'Der Verifizierungscode ist ungültig oder abgelaufen. Bitte überprüfen Sie den Code.';
            } else if (verificationError.message.includes('Passwort ist erforderlich')) {
              errorMessage = 'Passwort ist erforderlich. Bitte füllen Sie alle Felder aus.';
            } else {
              errorMessage = `Registrierungsfehler: ${verificationError.message}`;
            }
          }
          
          toast({
            title: 'Registrierung fehlgeschlagen',
            description: errorMessage,
            variant: 'destructive',
          });
          
          throw verificationError; // Re-throw für die ö¤uöŸere catch-Block
        }
        
      } else {
        // Standard-Registrierung für neue Kunden
        // Create user data for Firebase
        const userData: any = {
          displayName: `${formData.firstName} ${formData.lastName}`,
          vorname: formData.firstName,
          nachname: formData.lastName,
          tel: formData.phone,
          role: formData.role,
          concernID: '', // Will be set when concern is created
          mitarbeiterID: Math.floor(Math.random() * 10000) + 1000, // Generate random ID
          rechte: formData.role === 'admin' ? 5 : formData.role === 'manager' ? 4 : 2,
          isActive: true,
          // Unternehmensfelder
          // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
        };

        await signUp(formData.email, formData.password, userData);
        
        // Für neue Kunden: Der AuthContext übernimmt die Navigation nach der Registrierung
        toast({
          title: 'Registrierung erfolgreich',
          description: 'Sie werden automatisch zum Dashboard weitergeleitet.',
        });
        

      }
    } catch (error: any) {
      toast({
        title: 'Registrierung fehlgeschlagen',
        description: error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (registrationStep === 'customer-type') {
      if (onBack) {
        onBack();
      }
    } else if (registrationStep === 'verification-code') {
      setRegistrationStep('customer-type');
    } else if (registrationStep === 'form') {
      if (isExistingCustomer) {
        setRegistrationStep('verification-code');
      } else {
        setRegistrationStep('customer-type');
      }
    }
  };

  const handleCustomerTypeSelection = (isExisting: boolean) => {
    setIsExistingCustomer(isExisting);
    if (isExisting) {
      setRegistrationStep('verification-code');
    } else {
      setRegistrationStep('form');
    }
  };

  const handleVerificationCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, accept any 8-character code
      if (verificationCode.length === 8) {
        try {
          // Echte Firestore-Suche nach Verifizierungscode

          
          // Verwende die Firestore-Service-Funktion
          const existingUser = await userService.findUserByVerificationCode(verificationCode);
          
          if (existingUser && existingUser.email) {
            setVerifiedCompanyEmail(existingUser.email);

            
            // Speichere die Concern-ID für die spö¤tere Registrierung
            localStorage.setItem('temp_concern_id', existingUser.concernID);
            
            toast({
              title: 'Code verifiziert',
              description: 'Ihr Verifizierungscode wurde erfolgreich bestö¤tigt.',
            });
            
          } else {

            
            toast({
              title: 'Ungültiger Code',
              description: `Der Verifizierungscode "${verificationCode}" wurde nicht gefunden. Bitte überprüfen Sie den Code oder kontaktieren Sie den Administrator.`,
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
          
        } catch (error) {

          
          // Detaillierte Fehlerinformationen für Debugging
          let errorMessage = 'Fehler beim öberprüfen des Verifizierungscodes.';
          
          if (error instanceof Error) {
            errorMessage += ` Details: ${error.message}`;
          }
          
          toast({
            title: 'Fehler',
            description: errorMessage,
            variant: 'destructive',
          });
          
          setIsLoading(false);
          return;
        }
        
        toast({
          title: 'Code verifiziert',
          description: 'Ihr Verifizierungscode wurde erfolgreich bestö¤tigt.',
        });
        setRegistrationStep('form');
      } else {
        toast({
          title: 'Ungültiger Code',
          description: 'Bitte geben Sie einen gültigen 8-stelligen Verifizierungscode ein.',
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

  // Customer Type Selection View
  if (registrationStep === 'customer-type') {
    return (
      <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/TradeTrackrLogo.jpg"
              alt="TradeTrackr Logo"
              className="h-12 w-auto"
            />
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <UserPlus className="h-6 w-6 text-green-600" />
              Registrierungstyp
            </CardTitle>
            <p className="text-sm text-gray-600 max-w-md">
              Wö¤hlen Sie aus, ob Sie sich als neuer Kunde oder als Mitarbeiter eines bestehenden Kunden registrieren.
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <Button
              onClick={() => handleCustomerTypeSelection(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 h-auto"
            >
              <div className="flex flex-col items-center gap-2">
                <Building className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Neuer Kunde</div>
                  <div className="text-sm opacity-90">Ich registriere mich für ein neues Unternehmen</div>
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleCustomerTypeSelection(true)}
              variant="outline"
              className="w-full border-green-300 text-green-700 hover:bg-green-50 font-medium py-4 h-auto"
            >
              <div className="flex flex-col items-center gap-2">
                <User className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Bestehender Kunde</div>
                  <div className="text-sm opacity-90">Ich bin Mitarbeiter eines bestehenden Kunden</div>
                </div>
              </div>
            </Button>
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zum Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verification Code View
  if (registrationStep === 'verification-code') {
    return (
      <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/TradeTrackrLogo.jpg"
              alt="TradeTrackr Logo"
              className="h-12 w-auto"
            />
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Shield className="h-6 w-6 text-green-600" />
              Verifizierungscode
            </CardTitle>
            <p className="text-sm text-gray-600 max-w-md">
              Geben Sie den 8-stelligen Verifizierungscode ein, den Sie per SMS oder E-Mail erhalten haben.
            </p>


          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleVerificationCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verifizierungscode *</Label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="z.B. ABC12345"
                maxLength={8}
                className="text-center text-lg font-mono tracking-widest"
                required
              />
              <p className="text-xs text-gray-500 text-center">
                Der Code wurde an Ihr Unternehmen gesendet
              </p>
            </div>
            

            
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
              disabled={isLoading || verificationCode.length !== 8}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Code wird verifiziert...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Code verifizieren
                </div>
              )}
            </Button>
          </form>



          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main Registration Form View
  if (isExistingCustomer) {
    // Vereinfachte Mitarbeiter-Registrierung für bestehende Kunden
    return (
      <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/TradeTrackrLogo.jpg"
              alt="TradeTrackr Logo"
              className="h-12 w-auto"
            />
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <UserPlus className="h-6 w-6 text-green-600" />
              Mitarbeiter Registrierung
            </CardTitle>
            <p className="text-sm text-gray-600 text-center">
              Registrieren Sie sich als Mitarbeiter Ihres verifizierten Unternehmens.
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Verifizierungsbestö¤tigung */}
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Verifizierungscode bestö¤tigt</span>
              </div>
              <p className="text-sm text-green-700">
                Ihr Unternehmen wurde erfolgreich über den Verifizierungscode bestö¤tigt.
              </p>
            </div>

            {/* E-Mail */}
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-gray-800 font-mono">
                  {verifiedCompanyEmail}
                </p>
              </div>
            </div>

            {/* Passwort für Firebase Authentication */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                <Shield className="h-5 w-5 text-purple-600" />
                Password Authentication
              </h3>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mindestens 8 Zeichen"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                <PasswordStrengthIndicator password={formData.password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestö¤tigen *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Passwort wiederholen"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Registrierung lö¤uft...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Mitarbeiter registrieren
                </div>
              )}
            </Button>
          </form>

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vollstö¤ndige Registrierung für neue Kunden
  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/TradeTrackrLogo.jpg"
            alt="TradeTrackr Logo"
            className="h-12 w-auto"
          />
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <UserPlus className="h-6 w-6 text-green-600" />
            TradeTrackr Registrierung
          </CardTitle>
          <p className="text-sm text-gray-600 max-w-md">
            Erstellen Sie Ihr kostenloses TradeTrackr Konto und starten Sie mit der 7-tö¤gigen Testversion.
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <User className="h-5 w-5 text-blue-600" />
              Persö¶nliche Informationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Vorname eingeben"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Nachname eingeben"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ihre.email@beispiel.de"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <Building className="h-5 w-5 text-green-600" />
              Unternehmensinformationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Unternehmen *</Label>
                <Input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Firmenname eingeben"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="z.B. Projektleiter, Geschö¤ftsführer"
                />
              </div>
            </div>
            
            {/* Zusö¤tzliche Unternehmensfelder für neue Unternehmen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unternehmensname</Label>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Wird zentral in der Concern Collection gespeichert
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unternehmenstelefon</Label>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Wird zentral in der Concern Collection gespeichert
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Unternehmens-E-Mail</Label>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Wird zentral in der Concern Collection gespeichert
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <MapPin className="h-5 w-5 text-orange-600" />
              Adressinformationen
            </h3>
            <div className="space-y-2">
              <Label htmlFor="address">StraöŸe & Hausnummer</Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="MusterstraöŸe 123"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">PLZ</Label>
                <Input
                  id="postalCode"
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="12345"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Musterstadt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Land</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Deutschland">Deutschland</SelectItem>
                      <SelectItem value="ö–sterreich">ö–sterreich</SelectItem>
                      <SelectItem value="Schweiz">Schweiz</SelectItem>
                                              <SelectItem value="Andere">Andere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Company Address Information - nur für neue Unternehmen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <Building className="h-5 w-5 text-green-600" />
              Unternehmensadresse
            </h3>
            <div className="space-y-2">
              <Label>Unternehmensadresse</Label>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Wird zentral in der Concern Collection gespeichert
                </p>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <Shield className="h-5 w-5 text-purple-600" />
              Account-Informationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rolle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: string) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rolle auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Mitarbeiter</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Passwort *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mindestens 8 Zeichen"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                <PasswordStrengthIndicator password={formData.password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestö¤tigen *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Passwort wiederholen"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Bedingungen & Datenschutz
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
                />
                <Label htmlFor="acceptTerms" className="text-sm">
                  Ich akzeptiere die <button type="button" onClick={onShowAGB} className="text-blue-600 hover:underline">Allgemeinen Geschö¤ftsbedingungen</button> *
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptPrivacy"
                  checked={formData.acceptPrivacy}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptPrivacy: checked as boolean })}
                />
                <Label htmlFor="acceptPrivacy" className="text-sm">
                  Ich akzeptiere die <button type="button" onClick={onShowDatenschutz} className="text-blue-600 hover:underline">Datenschutzerklö¤rung</button> *
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptMarketing"
                  checked={formData.acceptMarketing}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptMarketing: checked as boolean })}
                />
                <Label htmlFor="acceptMarketing" className="text-sm">
                  Ich mö¶chte über Neuigkeiten und Updates per E-Mail informiert werden
                </Label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Registrierung lö¤uft...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Kostenlos registrieren
              </div>
            )}
          </Button>
        </form>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zum Login
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-gray-600 space-y-2">
          <p>
            <strong>7-tö¤gige kostenlose Testversion</strong> â€¢ Keine Kreditkarte erforderlich
          </p>
          <p>
            Nach der Testversion: <strong>17,50â‚¬ pro Benutzer/Monat</strong>
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              DSGVO-konform
            </Badge>
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              ISO 27001
            </Badge>
            <Badge variant="outline" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              24/7 Support
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
