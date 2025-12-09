import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Play, LogIn, Eye, EyeOff, Users, Shield, Building, Wrench, UserCheck, X, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ForgotPasswordForm from './ForgotPasswordForm';


import { LoginFormProps } from '@/types';

interface DemoRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  icon: React.ReactNode;
  color: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onNavigateToRegister }) => {
  const { signIn, enterDemoMode } = useAuth();
  const { toast } = useToast();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showDemoRoles, setShowDemoRoles] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'admin'
  });
  const [showPassword, setShowPassword] = useState(false);



  // Demo roles configuration
  const demoRoles: DemoRole[] = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Vollzugriff auf alle Funktionen - Projektverwaltung, Benutzerverwaltung, Berichte',
      permissions: ['Alle Berechtigungen', 'Projektverwaltung', 'Benutzerverwaltung', 'Berichtsverwaltung', 'Systemeinstellungen'],
      icon: <Shield className="h-5 w-5" />,
      color: 'bg-red-500'
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Verwaltung von Projekten und Berichten - Keine Benutzerverwaltung',
      permissions: ['Projektverwaltung', 'Berichtsverwaltung', 'Kundenverwaltung', 'Berichte genehmigen'],
      icon: <Building className="h-5 w-5" />,
      color: 'bg-blue-500'
    },
    {
      id: 'employee',
      name: 'Mitarbeiter',
      description: 'Projektverwaltung und Berichte für eigene Projekte',
      permissions: ['Projektverwaltung', 'Berichtsverwaltung', 'Teamverwaltung', 'Berichte genehmigen'],
      icon: <UserCheck className="h-5 w-5" />,
      color: 'bg-green-500'
    },
    {
      id: 'service_technician',
      name: 'Servicetechniker',
      description: 'Spezialisierte Aufgaben und Wartungsarbeiten',
      permissions: ['Wartungsarbeiten', 'Serviceberichte', 'Technische Dokumentation'],
      icon: <Wrench className="h-5 w-5" />,
      color: 'bg-purple-500'
    },
    {
      id: 'auftraggeber',
      name: 'Auftraggeber',
      description: 'Projektübersicht und Berichte einsehen',
      permissions: ['Projektübersicht', 'Berichte einsehen', 'Fortschritt verfolgen'],
      icon: <Eye className="h-5 w-5" />,
      color: 'bg-orange-500'
    }
  ];

  const handleRegisteredUser = () => {
    setShowLoginForm(true);
    setShowDemoRoles(false);
    setSelectedRole(null);
  };

  const handleDemoAccess = () => {
    setShowDemoRoles(true);
    setShowLoginForm(false);
    setSelectedRole(null);
  };

  const handleRegister = () => {
    if (onNavigateToRegister) {
      onNavigateToRegister();
    }
  };

  const handleRoleSelect = (role: DemoRole) => {
    setSelectedRole(role);
  };

  const handleEnterDemo = async () => {
    if (!selectedRole) return;
    

    setIsLoading(true);

    try {
      // Demo mode direkt aktivieren
      enterDemoMode(selectedRole.id);
      toast({
        title: 'Demo-Login erfolgreich',
        description: `Willkommen zum TradeTrackr Demo als ${selectedRole.name}! Sie werden automatisch weitergeleitet.`,
      });
      // Navigation wird automatisch durch AuthContext gehandhabt
    } catch (error: any) {

      toast({
        title: 'Demo-Login fehlgeschlagen',
        description: 'Demo-Modus konnte nicht aktiviert werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {


      await signIn(formData.email, formData.password);

      toast({
        title: 'Login erfolgreich',
        description: 'Willkommen zurück! Sie werden automatisch weitergeleitet.',
      });
      // Navigation wird automatisch durch AuthContext gehandhabt
    } catch (error: any) {

      toast({
        title: 'Login fehlgeschlagen',
        description: error.message || 'E-Mail oder Passwort ist falsch.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (showDemoRoles && selectedRole) {
      // If we're in demo roles and have a selected role, go back to role selection
      setSelectedRole(null);
    } else {
      // Otherwise go back to initial view
      setShowLoginForm(false);
      setShowDemoRoles(false);
      setSelectedRole(null);
    }
  };

  // Initial state - show three buttons
  if (!showLoginForm && !showDemoRoles) {
    return (
      <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/TTroundLogo.jpg"
              alt="TradeTrackr Logo"
              className="h-12 w-auto"
            />
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <LogIn className="h-5 w-5 text-blue-600" />
              TradeTrackr Portal
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRegisteredUser}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
          >
            <User className="h-4 w-4 mr-2" />
            Registrierte Benutzer
          </Button>
          <Button
            onClick={handleRegister}
            variant="outline"
            className="w-full border-green-300 text-green-700 hover:bg-green-50 font-medium py-3"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Registrierung
          </Button>
          <Button
            onClick={handleDemoAccess}
            variant="outline"
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 font-medium py-3"
          >
            <Play className="h-4 w-4 mr-2" />
            Demo-Zugang
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Demo roles selection
  if (showDemoRoles) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/TTroundLogo.jpg"
              alt="TradeTrackr Logo"
              className="h-12 w-auto"
            />
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <Play className="h-5 w-5 text-purple-600" />
              Demo-Zugang - Rolle auswö¤hlen
            </CardTitle>
            <p className="text-sm text-gray-600 max-w-2xl">
              Wö¤hlen Sie eine Rolle aus, um das TradeTrackr Portal aus der Perspektive verschiedener Benutzertypen zu testen.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {demoRoles.map((role) => (
              <Button
                key={role.id}
                variant="outline"
                className={`h-16 flex flex-col items-center justify-center gap-2 border-2 hover:border-purple-300 transition-all duration-200 ${
                  selectedRole?.id === role.id ? 'border-purple-400 bg-purple-50' : ''
                }`}
                onClick={() => handleRoleSelect(role)}
              >
                <div className={`p-1.5 rounded-lg ${role.color} text-white`}>
                  {role.icon}
                </div>
                <span className="text-sm font-medium">{role.name}</span>
              </Button>
            ))}
          </div>

          {/* Role Description Box */}
          {selectedRole && (
            <Card className="border-2 border-purple-200 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className={`p-2 rounded-lg ${selectedRole.color} text-white`}>
                      {selectedRole.icon}
                    </div>
                    {selectedRole.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRole(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600">{selectedRole.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Berechtigungen:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {selectedRole.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={handleEnterDemo}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Lade...' : `Als ${selectedRole.name} Demo starten`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-800"
            >
              Zurück
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Forgot password form
  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onBack={() => setShowForgotPassword(false)}
      />
    );
  }

  // Login form
  return (
    <Card className="w-full max-w-md mx-auto bg-white border-2 border-gray-300 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/TTroundLogo.jpg"
            alt="TradeTrackr Logo"
            className="h-12 w-auto"
          />
          <CardTitle className="flex items-center justify-center gap-2 text-lg text-gray-900">
            <LogIn className="h-5 w-5 text-blue-600" />
            Registrierte Benutzer
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-900 font-medium">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="E-Mail eingeben"
              className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-900 font-medium">Passwort</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Passwort eingeben"
                className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gray-100 rounded-l-none border-l"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-700" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-700" />
                )}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-600 hover:text-blue-700 text-sm px-0"
              >
                Passwort vergessen?
              </Button>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
            disabled={isLoading}
          >
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </Button>
        </form>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleBack}
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            Zurück
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
