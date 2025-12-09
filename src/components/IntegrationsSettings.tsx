import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/config/firebase';
import { collection, getDocs, orderBy, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

const IntegrationsSettings: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [idsUrl, setIdsUrl] = useState('');
  const [idsToken, setIdsToken] = useState('');

  useEffect(() => {
    (async () => {
      if (!user?.concernID) return;
      const qs = await getDocs(query(collection(db, 'interfaceJobs'), where('concernId', '==', user.concernID), orderBy('timestamp', 'desc')));
      const list: any[] = [];
      qs.forEach(d => list.push({ id: d.id, ...d.data() }));
      setJobs(list.slice(0, 20));
    })();
  }, [user?.concernID]);

  const saveIds = async () => {
    if (!user?.concernID) return;
    await addDoc(collection(db, 'suppliers'), {
      concernId: user.concernID,
      idsSandboxUrl: idsUrl,
      idsApiToken: idsToken,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gaeb">
              <TabsList>
                <TabsTrigger value="gaeb">GAEB</TabsTrigger>
                <TabsTrigger value="datanorm">Datanorm</TabsTrigger>
                <TabsTrigger value="ids">IDS</TabsTrigger>
                <TabsTrigger value="datev">DATEV</TabsTrigger>
                <TabsTrigger value="lexware">Lexware</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
              </TabsList>

              <TabsContent value="gaeb">
                <div className="space-y-4">
                  <p>Import/Export GAEB XML. Export per Cloud Function endpoint.</p>
                  <a className="text-blue-600 underline" href="/__/functions/exportGaebForOffer?offerId=OFFER_ID">Export Endpoint (ersetzen Sie OFFER_ID)</a>
                </div>
              </TabsContent>

              <TabsContent value="datanorm">
                <div className="space-y-3">
                  <p>Datanorm CSV in Storage hochladen unter: concerns/{user?.concernID}/datanorm/yourfile.csv</p>
                  <p>Import startet automatisch (Cloud Function).</p>
                </div>
              </TabsContent>

              <TabsContent value="ids">
                <div className="space-y-3 max-w-md">
                  <Input placeholder="IDS Sandbox URL" value={idsUrl} onChange={(e)=>setIdsUrl(e.target.value)} />
                  <Textarea placeholder="IDS API Token" value={idsToken} onChange={(e)=>setIdsToken(e.target.value)} />
                  <Button onClick={saveIds}>Zugang speichern</Button>
                </div>
              </TabsContent>

              <TabsContent value="datev">
                <div className="space-y-2">
                  <p>DATEV Export (CSV + PDFs als ZIP) via Export-Dialog in Rechnungen auslösen.</p>
                </div>
              </TabsContent>

              <TabsContent value="lexware">
                <div className="space-y-2">
                  <p>Lexware CSV-Export über Export-Dialog (Buchungen/Debitoren).</p>
                </div>
              </TabsContent>

              <TabsContent value="api">
                <div className="space-y-2">
                  <p>Öffentliche REST API v1 (read-only): /api/v1/*</p>
                  <a className="text-blue-600 underline" href="/api/v1/openapi.json">OpenAPI JSON</a>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Letzte Interface-Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.map(j => (
                <div key={j.id} className="flex items-center justify-between border rounded p-2">
                  <div>{j.type}</div>
                  <div className="text-sm text-gray-600">{j.status}</div>
                  <div className="text-xs text-gray-500">{j.logText}</div>
                </div>
              ))}
              {jobs.length === 0 && <div className="text-sm text-gray-500">Keine Jobs</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IntegrationsSettings;












