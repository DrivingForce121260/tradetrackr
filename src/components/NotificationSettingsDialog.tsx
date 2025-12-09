import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationPrefs, NotificationPrefsService } from '@/services/notificationPrefsService';
import { useToast } from '@/hooks/use-toast';
import { Bell, Monitor, Smartphone, Mail, Save, X } from 'lucide-react';

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationSettingsDialog: React.FC<NotificationSettingsDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = (user as any)?.uid;
  const [svc, setSvc] = useState<NotificationPrefsService | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      setSvc(new NotificationPrefsService(uid));
    }
  }, [uid]);

  useEffect(() => {
    const loadPrefs = async () => {
      if (!svc) return;
      setLoading(true);
      try {
        const loadedPrefs = await svc.get();
        setPrefs(loadedPrefs);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast({
          title: 'Fehler',
          description: 'Einstellungen konnten nicht geladen werden.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (open && svc) {
      loadPrefs();
    }
  }, [svc, open, toast]);

  const save = async () => {
    if (!svc || !prefs) return;
    setSaving(true);
    try {
      await svc.set(prefs);
      toast({
        title: 'Gespeichert',
        description: 'Benachrichtigungs-Präferenzen wurden erfolgreich gespeichert.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: 'Fehler',
        description: 'Einstellungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-3 border-blue-300 shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg -m-6 mb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <Bell className="h-6 w-6" />
            Benachrichtigungs-Präferenzen
          </DialogTitle>
          <DialogDescription className="text-white/90 mt-1">
            Verwalten Sie Ihre Benachrichtigungseinstellungen
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Lade Einstellungen...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* In-App Notifications */}
            <div className="flex items-center justify-between p-5 bg-white rounded-xl border-3 border-blue-200 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Monitor className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    In-App Benachrichtigungen
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Benachrichtigungen direkt im Portal anzeigen
                  </div>
                </div>
              </div>
              <Switch 
                checked={!!prefs?.inApp} 
                onCheckedChange={(v) => setPrefs(p => p ? { ...p, inApp: v } : p)}
                aria-label="In-App Benachrichtigungen aktivieren oder deaktivieren"
                className="ml-4"
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between p-5 bg-white rounded-xl border-3 border-blue-200 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    Push-Benachrichtigungen
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Push-Benachrichtigungen an mobile App senden
                  </div>
                </div>
              </div>
              <Switch 
                checked={!!prefs?.push} 
                onCheckedChange={(v) => setPrefs(p => p ? { ...p, push: v } : p)}
                aria-label="Push-Benachrichtigungen aktivieren oder deaktivieren"
                className="ml-4"
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-5 bg-white rounded-xl border-3 border-blue-200 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    E-Mail-Benachrichtigungen
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    E-Mail-Benachrichtigungen für wichtige Ereignisse (Transaktionsmails)
                  </div>
                </div>
              </div>
              <Switch 
                checked={!!prefs?.email} 
                onCheckedChange={(v) => setPrefs(p => p ? { ...p, email: v } : p)}
                aria-label="E-Mail-Benachrichtigungen aktivieren oder deaktivieren"
                className="ml-4"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex justify-end gap-3 border-t-2 border-blue-200 mt-6">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-2 border-gray-300 hover:border-gray-400 font-semibold"
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button 
                onClick={save} 
                disabled={saving || !prefs || loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 px-6"
                aria-label="Benachrichtigungseinstellungen speichern"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettingsDialog;







