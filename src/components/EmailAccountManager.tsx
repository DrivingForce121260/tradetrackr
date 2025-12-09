/**
 * Email Account Manager Component
 * Displays and manages connected email accounts
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsEU } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailAccount {
  id: string;
  orgId: string;
  provider: 'gmail' | 'm365' | 'imap';
  emailAddress: string;
  active: boolean;
  syncState?: {
    lastSyncedAt?: Date;
  };
  createdAt: Date;
}

const EmailAccountManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const orgId = user?.concernID || user?.ConcernID || '';
  
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'emailAccounts'),
      where('orgId', '==', orgId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountsData: EmailAccount[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orgId: data.orgId,
          provider: data.provider,
          emailAddress: data.emailAddress,
          active: data.active,
          syncState: data.syncState ? {
            lastSyncedAt: data.syncState.lastSyncedAt?.toDate(),
          } : undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
      setAccounts(accountsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const syncFunction = httpsCallable(functionsEU, 'syncEmailAccount');
      const result = await syncFunction({ accountId });
      
      toast({
        title: '✅ Synchronisierung erfolgreich',
        description: `${(result.data as any).messageCount} E-Mails synchronisiert`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: '❌ Synchronisierung fehlgeschlagen',
        description: 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (accountId: string, emailAddress: string) => {
    if (!confirm(`E-Mail-Konto "${emailAddress}" wirklich trennen?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'emailAccounts', accountId));
      
      toast({
        title: '✅ Konto getrennt',
        description: `${emailAddress} wurde entfernt`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: '❌ Fehler beim Trennen',
        description: 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gmail': return '📧';
      case 'm365': return '📮';
      case 'imap': return '📬';
      default: return '📧';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'gmail': return 'Gmail';
      case 'm365': return 'Microsoft 365';
      case 'imap': return 'IMAP';
      default: return provider;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Verbundene E-Mail-Konten</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#058bc0]"></div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Verbundene E-Mail-Konten</h3>
        <div className="text-center py-8">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Noch keine E-Mail-Konten verbunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Verbundene E-Mail-Konten ({accounts.length})
      </h3>
      
      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#058bc0] transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="text-3xl">{getProviderIcon(account.provider)}</div>
              <div>
                <div className="font-medium text-gray-900 flex items-center space-x-2">
                  <span>{account.emailAddress}</span>
                  {account.active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {getProviderName(account.provider)}
                  {account.syncState?.lastSyncedAt && (
                    <span className="ml-2">
                      • Zuletzt synchronisiert: {account.syncState.lastSyncedAt.toLocaleString('de-DE')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSync(account.id)}
                disabled={syncing === account.id}
                className="p-2 text-[#058bc0] hover:bg-[#058bc0] hover:text-white rounded-lg transition-colors disabled:opacity-50"
                title="Synchronisieren"
              >
                <RefreshCw className={`w-4 h-4 ${syncing === account.id ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => handleDelete(account.id, account.emailAddress)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Konto trennen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailAccountManager;

