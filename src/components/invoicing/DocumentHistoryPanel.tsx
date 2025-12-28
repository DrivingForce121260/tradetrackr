/**
 * Document History Panel
 * 
 * Unified history panel for offers, orders, and invoices.
 * Displays timeline entries from the document's history subcollection.
 * 
 * Subcollection paths:
 * - offers/{offerId}/history
 * - orders/{orderId}/history (if implemented)
 * - invoices/{invoiceId}/history (if implemented)
 */

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Clock, User, FileText, Mail, Lock, Edit, Plus, Loader2, AlertCircle, FileWarning } from 'lucide-react';
import { normalizeTimestamp } from '@/types/offerHistory';

export type DocumentType = 'offer' | 'order' | 'invoice';

interface HistoryEntry {
  id: string;
  type: string;
  at: any;
  byUserId?: string;
  byUserName?: string;
  summary?: string;
  changes?: Array<{
    field: string;
    fieldLabel?: string;
    from?: any;
    to?: any;
  }>;
}

interface DocumentHistoryPanelProps {
  docType: DocumentType;
  docId: string;
  docNumber?: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  CREATED: <Plus className="h-4 w-4 text-green-600" />,
  UPDATED: <Edit className="h-4 w-4 text-blue-600" />,
  PDF_GENERATED: <FileText className="h-4 w-4 text-purple-600" />,
  SENT: <Mail className="h-4 w-4 text-indigo-600" />,
  FINALIZED: <Lock className="h-4 w-4 text-amber-600" />,
  PAYMENT: <FileText className="h-4 w-4 text-emerald-600" />,
};

const EVENT_COLORS: Record<string, string> = {
  CREATED: 'bg-green-100 border-green-300',
  UPDATED: 'bg-blue-100 border-blue-300',
  PDF_GENERATED: 'bg-purple-100 border-purple-300',
  SENT: 'bg-indigo-100 border-indigo-300',
  FINALIZED: 'bg-amber-100 border-amber-300',
  PAYMENT: 'bg-emerald-100 border-emerald-300',
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Erstellt',
  UPDATED: 'Bearbeitet',
  PDF_GENERATED: 'PDF erstellt',
  SENT: 'Versendet',
  FINALIZED: 'Finalisiert',
  PAYMENT: 'Zahlung erfasst',
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  offer: 'Angebot',
  order: 'Auftrag',
  invoice: 'Rechnung',
};

const COLLECTION_NAMES: Record<DocumentType, string> = {
  offer: 'offers',
  order: 'orders',
  invoice: 'invoices',
};

export function DocumentHistoryPanel({ docType, docId, docNumber }: DocumentHistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [docType, docId]);

  async function loadHistory() {
    if (!docId) {
      setError('Keine Dokument-ID angegeben.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotAvailable(false);

    try {
      const collectionName = COLLECTION_NAMES[docType];
      const historyRef = collection(db, collectionName, docId, 'history');
      const q = query(historyRef, orderBy('at', 'desc'));
      
      const snapshot = await getDocs(q);
      
      const entries: HistoryEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as HistoryEntry));
      
      setHistory(entries);
      
      // If no entries and not an offer, show "not available" message
      // (since only offers have history implemented currently)
      if (entries.length === 0 && docType !== 'offer') {
        setNotAvailable(true);
      }
    } catch (err: any) {
      console.error('Error loading document history:', err);
      
      // Check for permission error
      if (err?.code === 'permission-denied') {
        setError('Keine Berechtigung für Verlauf.');
      } else if (err?.message?.includes('index')) {
        // Missing index - still show empty state
        setHistory([]);
      } else {
        setError('Verlauf konnte nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp: any): string {
    const date = normalizeTimestamp(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatTime(timestamp: any): string {
    const date = normalizeTimestamp(timestamp);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const docTypeLabel = DOC_TYPE_LABELS[docType];
  const title = docNumber ? `${docTypeLabel} ${docNumber}` : docTypeLabel;

  return (
    <div className="max-h-[500px] overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Verlauf wird geladen...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />
          <p className="text-red-500 font-medium">{error}</p>
          <button 
            onClick={loadHistory}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      ) : notAvailable ? (
        <div className="text-center py-8 text-gray-500">
          <FileWarning className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Für diesen Dokumenttyp ist noch kein Verlauf vorhanden.</p>
          <p className="text-sm mt-2">
            Der Verlauf wird automatisch erfasst, sobald das Dokument bearbeitet wird.
          </p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Noch keine Verlaufseinträge vorhanden.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="relative pl-14">
                {/* Timeline dot */}
                <div className={`absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${EVENT_COLORS[entry.type] || 'bg-gray-100 border-gray-300'}`}>
                  {EVENT_ICONS[entry.type] || <Clock className="h-3 w-3 text-gray-500" />}
                </div>
                
                {/* Entry card */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {entry.summary || EVENT_LABELS[entry.type] || entry.type}
                      </div>
                      
                      {/* Changes list */}
                      {entry.changes && entry.changes.length > 0 && (
                        <ul className="mt-2 text-sm text-gray-600 space-y-1">
                          {entry.changes.map((change, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-gray-400">•</span>
                              <span className="font-medium">{change.fieldLabel || change.field}:</span>
                              {change.from !== undefined && (
                                <span className="line-through text-red-400">{String(change.from)}</span>
                              )}
                              {change.to !== undefined && (
                                <span className="text-green-600">→ {String(change.to)}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    
                    {/* Timestamp & user */}
                    <div className="text-right text-xs text-gray-500 flex-shrink-0">
                      <div className="font-medium">{formatDate(entry.at)}</div>
                      <div>{formatTime(entry.at)} Uhr</div>
                      {entry.byUserName && (
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <User className="h-3 w-3" />
                          <span>{entry.byUserName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentHistoryPanel;



