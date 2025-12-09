// ============================================================================
// SESSION TIMEOUT SETTINGS COMPONENT
// ============================================================================
// Allows admins/managers to configure session timeout values

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Save, Clock, AlertTriangle, Info, Lock, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SessionTimeoutConfig {
  timeoutMinutes: number;
  warningSeconds: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  timeoutMinutes: 30,
  warningSeconds: 60,
  enabled: true
};

const MIN_TIMEOUT_MINUTES = 5;
const MAX_TIMEOUT_MINUTES = 480; // 8 hours
const MIN_WARNING_SECONDS = 10;
const MAX_WARNING_SECONDS = 300; // 5 minutes

const SessionTimeoutSettings: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<SessionTimeoutConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDisableWarning, setShowDisableWarning] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState(true);

  const canEdit = hasPermission('admin_access') || user?.role === 'admin' || user?.role === 'manager';
  const orgId = user?.concernID || user?.ConcernID || '';

  useEffect(() => {
    const loadConfig = async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const configDoc = await getDoc(doc(db, 'orgSettings', orgId));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setConfig({
            timeoutMinutes: data.sessionTimeoutMinutes || DEFAULT_CONFIG.timeoutMinutes,
            warningSeconds: data.sessionTimeoutWarningSeconds || DEFAULT_CONFIG.warningSeconds,
            enabled: data.sessionTimeoutEnabled !== false // Default to true
          });
        } else {
          // Use defaults
          setConfig(DEFAULT_CONFIG);
        }
      } catch (error: any) {
        console.error('[SessionTimeoutSettings] Failed to load config:', error);
        toast({
          title: 'Fehler',
          description: 'Einstellungen konnten nicht geladen werden.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [orgId, toast]);

  const handleSave = async () => {
    if (!orgId || !canEdit) return;

    // Validation
    if (config.timeoutMinutes < MIN_TIMEOUT_MINUTES || config.timeoutMinutes > MAX_TIMEOUT_MINUTES) {
      toast({
        title: 'Ungültiger Wert',
        description: `Timeout muss zwischen ${MIN_TIMEOUT_MINUTES} und ${MAX_TIMEOUT_MINUTES} Minuten liegen.`,
        variant: 'destructive'
      });
      return;
    }

    if (config.warningSeconds < MIN_WARNING_SECONDS || config.warningSeconds > MAX_WARNING_SECONDS) {
      toast({
        title: 'Ungültiger Wert',
        description: `Warnung muss zwischen ${MIN_WARNING_SECONDS} und ${MAX_WARNING_SECONDS} Sekunden liegen.`,
        variant: 'destructive'
      });
      return;
    }

    if (config.warningSeconds >= config.timeoutMinutes * 60) {
      toast({
        title: 'Ungültiger Wert',
        description: 'Warnung muss vor dem Timeout erscheinen.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'orgSettings', orgId),
        {
          sessionTimeoutMinutes: config.timeoutMinutes,
          sessionTimeoutWarningSeconds: config.warningSeconds,
          sessionTimeoutEnabled: config.enabled,
          updatedAt: new Date(),
          updatedBy: user?.uid
        },
        { merge: true }
      );

      toast({
        title: 'Gespeichert',
        description: 'Session-Timeout-Einstellungen wurden erfolgreich aktualisiert.',
      });

      // Reload page to apply new settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('[SessionTimeoutSettings] Failed to save config:', error);
      toast({
        title: 'Fehler',
        description: `Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  if (loading) {
    return (
      <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#058bc0] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Einstellungen...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl">
        <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white">
          <CardTitle className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            Session-Timeout Einstellungen
          </CardTitle>
          <CardDescription className="text-white/90">
            Konfigurieren Sie die automatische Abmeldung bei Inaktivität
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {!canEdit && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Sie haben keine Berechtigung, diese Einstellungen zu ändern.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Nur Administratoren und Manager können Session-Timeout-Einstellungen anpassen.
                </p>
              </div>
            </div>
          )}

          {/* Enable/Disable Switch */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="enabled" className="text-base font-semibold flex items-center gap-2">
                  Session-Timeout aktivieren
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Automatische Abmeldung nach Inaktivität aktivieren oder deaktivieren
                </p>
              </div>
              <Switch
                id="enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Enabling is safe, no confirmation needed
                    setConfig(prev => ({ ...prev, enabled: true }));
                  } else {
                    // Disabling requires confirmation
                    setPendingEnabled(false);
                    setShowDisableWarning(true);
                  }
                }}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Security Warning when disabled */}
          {!config.enabled && (
            <div className="mb-6 p-6 bg-gradient-to-br from-red-50 to-red-100 border-4 border-red-500 rounded-lg shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-red-500 rounded-full animate-pulse">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                    KRITISCHE SICHERHEITSWARNUNG: Session-Timeout deaktiviert
                  </h4>
                  <div className="space-y-3 text-sm text-red-900">
                    <div className="p-4 bg-white border-2 border-red-400 rounded-lg">
                      <p className="font-bold text-base mb-2 text-red-900">
                        ⚠️ Das Deaktivieren des Session-Timeouts stellt ein ERHEBLICHES Sicherheitsrisiko dar:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>
                          <strong>Unbefugter Zugriff:</strong> Wenn ein Benutzer seinen Arbeitsplatz verlässt, 
                          bleibt die Sitzung aktiv. Unbefugte Personen können auf sensible Daten zugreifen, 
                          Projekte ändern oder löschen, und vertrauliche Informationen einsehen.
                        </li>
                        <li>
                          <strong>DSGVO-Compliance-Verstoß:</strong> Fehlende automatische Abmeldung kann gegen 
                          Datenschutzbestimmungen (DSGVO Art. 32) verstoßen, insbesondere bei personenbezogenen Daten. 
                          Dies kann zu rechtlichen Konsequenzen und Bußgeldern führen.
                        </li>
                        <li>
                          <strong>Datenverlustrisiko:</strong> Offene Sitzungen können zu versehentlichen 
                          Änderungen oder Löschungen führen, wenn andere Personen den Computer nutzen. 
                          Kritische Geschäftsdaten können unwiderruflich verloren gehen.
                        </li>
                        <li>
                          <strong>Audit-Trail-Probleme:</strong> Aktivitäten können nicht eindeutig einem Benutzer 
                          zugeordnet werden, wenn Sitzungen nicht automatisch ablaufen. Dies erschwert 
                          Compliance-Prüfungen und Sicherheitsanalysen erheblich.
                        </li>
                        <li>
                          <strong>Verstoß gegen Unternehmensrichtlinien:</strong> Viele Unternehmen verlangen 
                          automatische Abmeldungen nach Inaktivität als Teil ihrer Sicherheitsrichtlinien. 
                          Die Deaktivierung kann gegen interne Richtlinien verstoßen.
                        </li>
                        <li>
                          <strong>Haftungsrisiko:</strong> Bei Sicherheitsvorfällen oder Datenlecks kann die 
                          fehlende automatische Abmeldung als Fahrlässigkeit ausgelegt werden und zu 
                          Haftungsansprüchen führen.
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                      <p className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        💡 Empfehlung:
                      </p>
                      <p className="text-yellow-900">
                        Aktivieren Sie den Session-Timeout für alle Benutzer. Ein Timeout von 30 Minuten 
                        bietet einen guten Kompromiss zwischen Sicherheit und Benutzerfreundlichkeit. 
                        Für Umgebungen mit besonders sensiblen Daten sollten kürzere Timeouts (15 Minuten) 
                        in Betracht gezogen werden.
                      </p>
                    </div>
                    <div className="p-3 bg-red-200 border border-red-500 rounded-lg">
                      <p className="font-bold text-red-900 text-center">
                        🔒 Diese Einstellung sollte nur in Ausnahmefällen deaktiviert werden und erfordert 
                        eine dokumentierte Sicherheitsbewertung.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.enabled && (
            <>
              {/* Timeout Minutes */}
              <div className="mb-6">
                <Label htmlFor="timeoutMinutes" className="text-base font-semibold flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  Timeout (Minuten)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="timeoutMinutes"
                    type="number"
                    min={MIN_TIMEOUT_MINUTES}
                    max={MAX_TIMEOUT_MINUTES}
                    value={config.timeoutMinutes}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeoutMinutes: parseInt(e.target.value) || MIN_TIMEOUT_MINUTES }))}
                    disabled={!canEdit}
                    className="max-w-[200px]"
                  />
                  <Badge variant="outline" className="text-sm">
                    {MIN_TIMEOUT_MINUTES} - {MAX_TIMEOUT_MINUTES} Minuten
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Zeit in Minuten, nach der ein inaktiver Benutzer automatisch abgemeldet wird.
                </p>
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-xs text-blue-800">
                      <strong>Empfohlen:</strong> 30 Minuten für normale Nutzung, 15 Minuten für erhöhte Sicherheit.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Seconds */}
              <div className="mb-6">
                <Label htmlFor="warningSeconds" className="text-base font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warnung vor Abmeldung (Sekunden)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="warningSeconds"
                    type="number"
                    min={MIN_WARNING_SECONDS}
                    max={MAX_WARNING_SECONDS}
                    value={config.warningSeconds}
                    onChange={(e) => setConfig(prev => ({ ...prev, warningSeconds: parseInt(e.target.value) || MIN_WARNING_SECONDS }))}
                    disabled={!canEdit}
                    className="max-w-[200px]"
                  />
                  <Badge variant="outline" className="text-sm">
                    {MIN_WARNING_SECONDS} - {MAX_WARNING_SECONDS} Sekunden
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Zeit in Sekunden, bevor die Abmeldung erfolgt, wird eine Warnung angezeigt.
                </p>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      <strong>Hinweis:</strong> Die Warnung muss vor dem Timeout erscheinen. 
                      Empfohlen: 60 Sekunden (1 Minute).
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Vorschau der Einstellungen
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timeout nach Inaktivität:</span>
                    <span className="font-semibold text-gray-900">{config.timeoutMinutes} Minuten</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Warnung erscheint:</span>
                    <span className="font-semibold text-gray-900">
                      {Math.floor(config.warningSeconds / 60)} Min {config.warningSeconds % 60} Sek vor Abmeldung
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aktiver Timeout:</span>
                    <Badge className={config.enabled ? 'bg-green-500' : 'bg-gray-400'}>
                      {config.enabled ? 'Aktiviert' : 'Deaktiviert'}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          {canEdit && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#058bc0] hover:bg-[#0470a0] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Speichere...' : 'Einstellungen speichern'}
              </Button>
              <Button
                onClick={handleReset}
                disabled={saving}
                variant="outline"
              >
                Auf Standard zurücksetzen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Disabling */}
      <AlertDialog open={showDisableWarning} onOpenChange={setShowDisableWarning}>
        <AlertDialogContent className="max-w-2xl border-2 border-red-500">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-full">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-2xl text-red-900">
                Sicherheitswarnung: Session-Timeout deaktivieren?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-4 pt-4">
              <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                <p className="font-bold text-red-900 mb-2">
                  ⚠️ Sie sind dabei, eine kritische Sicherheitsfunktion zu deaktivieren!
                </p>
                <p className="text-red-800 mb-3">
                  Das Deaktivieren des Session-Timeouts stellt ein erhebliches Sicherheitsrisiko dar:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800 ml-2">
                  <li>Unbefugte Personen können auf offene Sitzungen zugreifen</li>
                  <li>Möglicher Verstoß gegen DSGVO-Compliance-Anforderungen</li>
                  <li>Erhöhtes Risiko für Datenverlust und unbefugte Änderungen</li>
                  <li>Probleme bei Audit-Trails und Compliance-Prüfungen</li>
                  <li>Möglicher Verstoß gegen Unternehmensrichtlinien</li>
                </ul>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="font-semibold text-yellow-900 mb-2">
                  💡 Empfehlung:
                </p>
                <p className="text-yellow-900 text-sm">
                  Bitte aktivieren Sie den Session-Timeout. Ein Timeout von 30 Minuten bietet einen 
                  guten Kompromiss zwischen Sicherheit und Benutzerfreundlichkeit.
                </p>
              </div>
              <p className="font-bold text-red-900 text-center pt-2">
                Sind Sie sicher, dass Sie den Session-Timeout deaktivieren möchten?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setShowDisableWarning(false);
                setPendingEnabled(true);
              }}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200"
            >
              Abbrechen (Empfohlen)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfig(prev => ({ ...prev, enabled: false }));
                setShowDisableWarning(false);
                setPendingEnabled(true);
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Trotzdem deaktivieren (Nicht empfohlen)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Card */}
      <Card className="border-2 border-gray-300">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Wie funktioniert der Session-Timeout?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
            <p>
              Der Timer wird bei jeder Benutzeraktivität zurückgesetzt (Mausbewegung, Tastendruck, Klick, Scrollen).
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
            <p>
              Wenn keine Aktivität für die eingestellte Zeit erkannt wird, erscheint eine Warnung.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
            <p>
              Der Benutzer kann die Session fortsetzen oder sich sofort abmelden.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
            <p>
              Wenn keine Aktion erfolgt, wird der Benutzer automatisch abgemeldet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionTimeoutSettings;

