import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { FirestoreSetup } from '@/utils/setupFirestore';
import { 
  Database, 
  Users, 
  MessageSquare, 
  Settings, 
  Play, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const FirestoreAdmin: React.FC = () => {
  const { user } = useAuth();
  const [concernID, setConcernID] = useState('default');
  const [adminUserId, setAdminUserId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setAdminUserId(user.uid || 'admin');
      setConcernID((user as any).concernID || 'default');
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInitializeDatabase = async () => {
    if (!concernID || !adminUserId) {
      showMessage('error', 'Bitte füllen Sie alle Felder aus');
      return;
    }

    setIsLoading(true);
    try {
      await FirestoreSetup.initializeDatabase(concernID, adminUserId);
      showMessage('success', 'Datenbank erfolgreich initialisiert!');
      await checkDatabaseStatus();
    } catch (error) {
      showMessage('error', `Fehler: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!employeeId || !employeeName || !concernID) {
      showMessage('error', 'Bitte füllen Sie alle Mitarbeiter-Felder aus');
      return;
    }

    setIsLoading(true);
    try {
      await FirestoreSetup.addEmployeeToChats(employeeId, employeeName, concernID);
      showMessage('success', `Mitarbeiter ${employeeName} erfolgreich hinzugefügt!`);
      await checkDatabaseStatus();
      setEmployeeId('');
      setEmployeeName('');
    } catch (error) {
      showMessage('error', `Fehler: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('âš ï¸ Sind Sie sicher? Dies lö¶scht alle Daten!')) return;

    setIsLoading(true);
    try {
      await FirestoreSetup.resetDatabase(concernID);
      showMessage('success', 'Datenbank zurückgesetzt!');
      await checkDatabaseStatus();
    } catch (error) {
      showMessage('error', `Fehler: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const status = await FirestoreSetup.checkDatabaseStatus(concernID);
      setDatabaseStatus(status);
    } catch (error) {

    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, [concernID]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Database className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Firestore Admin</h1>
      </div>

      {/* Nachrichten */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Datenbank-Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Datenbank-Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {databaseStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Badge variant="outline" className="text-lg">
                  <Users className="h-4 w-4 mr-2" />
                  {databaseStatus.users || 0}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">Benutzer</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-lg">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {databaseStatus.chats || 0}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">Chats</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-lg">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {databaseStatus.messages || 0}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">Nachrichten</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-lg">
                  <Users className="h-4 w-4 mr-2" />
                  {databaseStatus.chat_participants || 0}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">Teilnehmer</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Lade Datenbank-Status...
            </div>
          )}
          <Button 
            onClick={checkDatabaseStatus} 
            variant="outline" 
            className="mt-4"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Status aktualisieren
          </Button>
        </CardContent>
      </Card>

      {/* Datenbank initialisieren */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-green-600" />
            <span>Datenbank initialisieren</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="concernID">Concern ID</Label>
              <Input
                id="concernID"
                value={concernID}
                onChange={(e) => setConcernID(e.target.value)}
                placeholder="concern123"
              />
            </div>
            <div>
              <Label htmlFor="adminUserId">Admin User ID</Label>
              <Input
                id="adminUserId"
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                placeholder="admin123"
              />
            </div>
          </div>
          <Button 
            onClick={handleInitializeDatabase} 
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Datenbank initialisieren
          </Button>
        </CardContent>
      </Card>

      {/* Mitarbeiter hinzufügen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Mitarbeiter hinzufügen</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeId">Mitarbeiter ID</Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="emp123"
              />
            </div>
            <div>
              <Label htmlFor="employeeName">Mitarbeiter Name</Label>
              <Input
                id="employeeName"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Max Mustermann"
              />
            </div>
          </div>
          <Button 
            onClick={handleAddEmployee} 
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Mitarbeiter hinzufügen
          </Button>
        </CardContent>
      </Card>

      {/* Datenbank zurücksetzen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            <span>Datenbank zurücksetzen</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            âš ï¸ Achtung: Dies lö¶scht alle Daten in der Datenbank!
          </p>
          <Button 
            onClick={handleResetDatabase} 
            variant="destructive"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Datenbank zurücksetzen
          </Button>
        </CardContent>
      </Card>

      {/* Anleitung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <span>Anleitung</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <h4>Schritte zur Einrichtung:</h4>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Firebase Console ö¶ffnen:</strong> Gehen Sie zu{' '}
                <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  console.firebase.google.com
                </a>
              </li>
              <li>
                <strong>Projekt erstellen:</strong> Erstellen Sie ein neues Firebase-Projekt
              </li>
              <li>
                <strong>Firestore aktivieren:</strong> Gehen Sie zu "Firestore Database" und aktivieren Sie es
              </li>
              <li>
                <strong>Konfiguration kopieren:</strong> Kopieren Sie die Konfiguration aus dem Projekt-Einstellungen
              </li>
              <li>
                <strong>Konfiguration aktualisieren:</strong> Aktualisieren Sie <code>src/config/firebase.ts</code>
              </li>
              <li>
                <strong>Security Rules setzen:</strong> Setzen Sie die Firestore Security Rules
              </li>
              <li>
                <strong>Datenbank initialisieren:</strong> Verwenden Sie den "Datenbank initialisieren" Button oben
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirestoreAdmin;


