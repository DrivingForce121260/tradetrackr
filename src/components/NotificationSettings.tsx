import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationPrefs, NotificationPrefsService } from '@/services/notificationPrefsService';

const NotificationSettings: React.FC<{ onBack?: ()=>void; onOpenMessaging?: ()=>void }>= ({ onBack, onOpenMessaging }) => {
  const { user } = useAuth();
  const uid = (user as any)?.uid;
  const [svc, setSvc] = useState<NotificationPrefsService | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ if (uid) setSvc(new NotificationPrefsService(uid)); }, [uid]);
  useEffect(()=>{ (async()=>{ if (!svc) return; setPrefs(await svc.get()); })(); }, [svc]);

  const save = async ()=>{ if (!svc || !prefs) return; setSaving(true); await svc.set(prefs); setSaving(false); };

  return (
    <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <span className="text-2xl">🔔</span>
          Benachrichtigungs-Präferenzen
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg">💻</span>
              In-App
            </div>
            <div className="text-sm text-gray-600 mt-1">Benachrichtigungen im Portal anzeigen</div>
          </div>
          <Switch 
            checked={!!prefs?.inApp} 
            onCheckedChange={v=>setPrefs(p=>p?{...p,inApp:v}:p)}
            aria-label="In-App Benachrichtigungen aktivieren oder deaktivieren"
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg">📱</span>
              Push
            </div>
            <div className="text-sm text-gray-600 mt-1">Push an mobile App senden</div>
          </div>
          <Switch 
            checked={!!prefs?.push} 
            onCheckedChange={v=>setPrefs(p=>p?{...p,push:v}:p)}
            aria-label="Push-Benachrichtigungen für mobile App aktivieren oder deaktivieren"
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg">📧</span>
              E-Mail
            </div>
            <div className="text-sm text-gray-600 mt-1">E-Mail-Benachrichtigungen (Transaktionsmails)</div>
          </div>
          <Switch 
            checked={!!prefs?.email} 
            onCheckedChange={v=>setPrefs(p=>p?{...p,email:v}:p)}
            aria-label="E-Mail-Benachrichtigungen aktivieren oder deaktivieren"
          />
        </div>
        <div className="pt-4 flex justify-end border-t-2 border-gray-300">
          <Button 
            onClick={save} 
            disabled={saving || !prefs}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            aria-label="Benachrichtigungseinstellungen speichern"
          >
            {saving?'💾 Speichern…':'✅ Speichern'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;



