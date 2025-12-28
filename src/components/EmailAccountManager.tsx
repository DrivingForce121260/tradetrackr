/**
 * Email Account Manager Component
 * Displays and manages connected email accounts
 * 
 * ISOLATION: Only shows accounts owned by the current user.
 * Uses user-scoped path: concerns/{concernId}/users/{uid}/emailAccounts/*
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsEU } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSyncErrorMessage } from '@/services/emailIntelligenceService';

interface EmailAccount {
  id: string;
  orgId: string;
  ownerUid?: string;
  provider: 'gmail' | 'm365' | 'imap';
  emailAddress: string;
  emailKey?: string;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    host: 'imap.ionos.de',
    port: '993',
    user: '',
    password: '',
    tls: true,
  });

  // Get the current user's UID
  const uid = user?.uid || '';

  useEffect(() => {
    if (!orgId || !uid) {
      setLoading(false);
      return;
    }

    // Query USER-SCOPED email accounts
    // Path: concerns/{concernId}/users/{uid}/emailAccounts/*
    const userEmailAccountsRef = collection(
      db, 
      `concerns/${orgId}/users/${uid}/emailAccounts`
    );

    const unsubscribe = onSnapshot(userEmailAccountsRef, (snapshot) => {
      const accountsData: EmailAccount[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Validate required fields
        if (!data.provider || (!data.email && !data.emailAddress)) {
          // Skip invalid accounts silently - no PII logged
            hasEmail: !!(data.email || data.emailAddress),
          });
          continue;
        }
        
        accountsData.push({
          id: docSnap.id,
          orgId: data.concernId || orgId,
          ownerUid: data.ownerUid || uid,
          provider: data.provider,
          emailAddress: data.email || data.emailAddress,
          emailKey: data.emailKey,
          active: data.active !== false && data.status !== 'disconnected',
          syncState: data.lastSyncAt ? {
            lastSyncedAt: data.lastSyncAt?.toDate?.() || data.lastSyncAt,
          } : (data.syncState?.lastSyncedAt ? {
            lastSyncedAt: data.syncState.lastSyncedAt?.toDate?.() || data.syncState.lastSyncedAt,
          } : undefined),
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      }
      // Accounts loaded - count only, no email addresses logged
      setAccounts(accountsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId, uid]);

  const handleSync = async (account: EmailAccount) => {
    // Sync triggered - no credentials logged
    setSyncing(account.id);
    try {
      const syncFunction = httpsCallable(functionsEU, 'syncEmailAccount');
      const result = await syncFunction({ 
        concernId: orgId,
        accountId: account.id,
      });
      
      const resultData = result.data as any;
      
      // Build success message with details
      let description = `${resultData.messageCount || 0} E-Mails synchronisiert`;
      
      // Add processing results
      if (resultData.processed !== undefined) {
        description = `${resultData.processed} E-Mails verarbeitet`;
        if (resultData.failed > 0) {
          description += ` (${resultData.failed} Fehler)`;
        }
      }
      
      // Notify if more emails are waiting
      if (resultData.hasMore) {
        description += `. Weitere ${resultData.skippedCount || 'mehrere'} E-Mails vorhanden - erneut synchronisieren.`;
      }
      
      toast({
        title: '✅ Synchronisierung erfolgreich',
        description,
      });
    } catch (error: any) {
      // Error handling - no credentials or email content logged
      
      // Use centralized error message mapping
      const userMessage = getSyncErrorMessage(error);

      toast({
        title: '❌ Synchronisierung fehlgeschlagen',
        description: userMessage,
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
      // Step 1: Unassign email from user (releases the assignment for others)
      try {
        const unassignFunction = httpsCallable(functionsEU, 'unassignEmailAccount');
        await unassignFunction({
          concernId: orgId,
          email: emailAddress,
        });
      } catch (unassignError) {
        // Continue with deletion even if unassignment fails - no credentials logged
      }

      // Step 2: Delete user-scoped account document
      // Path: concerns/{concernId}/users/{uid}/emailAccounts/{accountId}
      try {
        await deleteDoc(doc(db, `concerns/${orgId}/users/${uid}/emailAccounts`, accountId));
        // Account deleted - no PII logged
      } catch (err) {
        // Deletion error - no credentials logged
      }

      // Step 3: Also delete legacy account document (for cleanup)
      try {
        await deleteDoc(doc(db, 'emailAccounts', accountId));
        // Legacy account deleted - no PII logged
      } catch (err) {
        // May not exist - that's OK
      }
      
      toast({
        title: '✅ Konto getrennt',
        description: `${emailAddress} wurde entfernt`,
      });
    } catch (error) {
      // Error handling - no credentials logged
      toast({
        title: '❌ Fehler beim Trennen',
        description: 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      // Store IMAP account (server enforces email uniqueness via transaction)
      const storeFunction = httpsCallable(functionsEU, 'storeImapAccount');
      const result = await storeFunction({
        orgId,
        emailAddress: formData.email,
        host: formData.host,
        port: parseInt(formData.port),
        user: formData.user || formData.email, // Default user to email if not provided
        password: formData.password,
        tls: formData.tls,
      });

      toast({
        title: '✅ E-Mail-Konto verbunden',
        description: (result.data as any).message || 'Konto erfolgreich hinzugefügt',
      });

      // Reset form and close
      setFormData({
        email: '',
        host: 'imap.ionos.de',
        port: '993',
        user: '',
        password: '',
        tls: true,
      });
      setShowAddForm(false);
    } catch (error: any) {
      // Error handling - no credentials logged
      
      // Check for EMAIL_ALREADY_ASSIGNED error (server-side enforcement)
      const isEmailTaken = 
        error.code === 'functions/failed-precondition' ||
        error.message?.includes('EMAIL_ALREADY_ASSIGNED');
      
      if (isEmailTaken) {
        toast({
          title: '❌ E-Mail bereits vergeben',
          description: 'Dieses E-Mail-Konto ist bereits einem anderen Benutzer in diesem Unternehmen zugewiesen.',
          variant: 'destructive',
        });
        return;
      }
      
      const errorMessage = error.message || 'Bitte überprüfen Sie Ihre Eingaben';
      
      toast({
        title: '❌ Verbindung fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Verbundene E-Mail-Konten ({accounts.length})
        </h3>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant="outline"
          size="sm"
          className="border-2 border-[#058bc0] text-[#058bc0] hover:bg-[#058bc0] hover:text-white"
        >
          {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showAddForm ? 'Abbrechen' : 'Konto hinzufügen'}
        </Button>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <form onSubmit={handleAddAccount} className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-[#058bc0]">
          <h4 className="font-semibold text-gray-900 mb-4">IMAP-Konto hinzufügen</h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail-Adresse *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ihre-email@domain.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">IMAP Server *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="imap.ionos.de"
                  required
                />
              </div>
              <div>
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  placeholder="993"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="user">Benutzername (optional)</Label>
              <Input
                id="user"
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                placeholder="Leer lassen für E-Mail-Adresse"
              />
              <p className="text-xs text-gray-500 mt-1">
                Standard: Ihre E-Mail-Adresse wird als Benutzername verwendet
              </p>
            </div>

            <div>
              <Label htmlFor="password">Passwort *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Ihr IMAP-Passwort"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Bei 2FA: App-spezifisches Passwort verwenden
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="tls"
                type="checkbox"
                checked={formData.tls}
                onChange={(e) => setFormData({ ...formData, tls: e.target.checked })}
                className="w-4 h-4 text-[#058bc0] border-gray-300 rounded focus:ring-[#058bc0]"
              />
              <Label htmlFor="tls" className="font-normal">SSL/TLS verwenden (empfohlen)</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={adding}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={adding}
                className="bg-[#058bc0] hover:bg-[#047ba8] text-white"
              >
                {adding ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verbinde...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Konto verbinden
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
      
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
                onClick={() => handleSync(account)}
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

