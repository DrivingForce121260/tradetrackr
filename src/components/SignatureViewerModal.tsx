import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { storage } from '@/config/firebase';
import { getDownloadURL, getMetadata, ref } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { db } from '@/config/firebase';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';

interface SignatureViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documentId: string;
}

export const SignatureViewerModal: React.FC<SignatureViewerModalProps> = ({ open, onOpenChange, projectId, documentId }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!open) return;
      setLoading(true);
      setNotFound(false);
      try {
        const path = `projects/${projectId}/signatures/${documentId}.png`;
        const r = ref(storage, path);
        const [u, m] = await Promise.all([
          getDownloadURL(r),
          getMetadata(r).catch(() => null),
        ]);
        setUrl(u);
        setMeta((m?.customMetadata as any) || null);
        try {
          const q = query(
            collection(db, 'auditLogs'),
            where('targetPath', '==', path),
            orderBy('at', 'desc'),
            limit(20)
          );
          const snap = await getDocs(q);
          setAudit(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        } catch {
          setAudit([]);
        }
      } catch (e) {
        setUrl(null);
        setMeta(null);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, projectId, documentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Digitale Signatur</DialogTitle>
      </DialogHeader>
      <DialogContent className="sm:max-w-2xl">
        {loading && <div className="p-4 text-gray-600">Lade Signatur...</div>}
        {!loading && notFound && (
          <div className="p-4 text-gray-600">Keine Signatur gefunden.</div>
        )}
        {!loading && url && (
          <div className="space-y-3">
            <img src={url} alt="Signatur" className="border rounded-md max-h-96" />
            {meta && (
              <div className="text-sm text-gray-700 space-y-1">
                {meta.signerName && (<div>Unterschreiber: <Badge variant="secondary">{meta.signerName}</Badge></div>)}
                {meta.consent && (<div>Einwilligung: <Badge>{meta.consent === 'true' ? 'Ja' : 'Nein'}</Badge></div>)}
                {meta.signedAt && (<div>Datum/Zeit: {new Date(meta.signedAt).toLocaleString('de-DE')}</div>)}
                {meta.lat && meta.lng && (<div>GPS: {meta.lat}, {meta.lng}</div>)}
              </div>
            )}
            <div className="mt-4">
              <div className="font-medium mb-2">Audit-Trail</div>
              {audit.length === 0 ? (
                <div className="text-sm text-gray-500">Keine Einträge.</div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1 max-h-48 overflow-auto">
                  {audit.map(a => (
                    <li key={a.id}>
                      <span className="text-gray-500 mr-2">{a.at?.toDate ? a.at.toDate().toLocaleString('de-DE') : a.at || ''}</span>
                      <Badge variant="outline" className="mr-2">{a.action || 'sign'}</Badge>
                      {a.actorUid || ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignatureViewerModal;


