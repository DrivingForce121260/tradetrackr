/**
 * Smart Inbox Component
 * Displays email summaries with filtering and actions
 */

import React, { useState } from 'react';
import { useEmailSummaries, useEmailActions } from '@/hooks/useEmailIntelligence';
import { useAuth } from '@/contexts/AuthContext';
import { 
  EmailCategory, 
  EmailSummaryStatus, 
  EmailPriority,
  EmailSummary,
} from '@/types/email';
import {
  getCategoryColor,
  getCategoryLabel,
  getPriorityColor,
  getStatusLabel,
} from '@/services/emailIntelligenceService';
import { Mail, AlertCircle, CheckCircle, Clock, Filter, User, Settings, Plus, RefreshCw, Archive, Inbox, Trash2, Sparkles, Reply } from 'lucide-react';
import EmailDetailDrawer from '@/components/EmailDetailDrawer';
import EmailReplyComposer from '@/components/EmailReplyComposer';
import AppHeader from '@/components/AppHeader';
import EmailAccountManager from '@/components/EmailAccountManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functionsEU } from '@/config/firebase';

interface SmartInboxProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const orgId = user?.concernID || user?.ConcernID || '';
  const uid = user?.uid || '';

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | undefined>();
  const [statusFilter, setStatusFilter] = useState<EmailSummaryStatus | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<EmailPriority | undefined>();
  const [showArchived, setShowArchived] = useState(false);

  // Selected email for detail view
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Show email account setup
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  
  // Re-analyzing state
  const [reanalyzingEmailId, setReanalyzingEmailId] = useState<string | null>(null);
  
  // Reply composer state
  const [replyComposerOpen, setReplyComposerOpen] = useState(false);
  const [currentReplyId, setCurrentReplyId] = useState<string | null>(null);
  const [generatingReplyForEmail, setGeneratingReplyForEmail] = useState<string | null>(null);

  // Fetch summaries - filtered by current user's owned accounts
  const { summaries, loading } = useEmailSummaries(orgId, {
    category: categoryFilter,
    status: showArchived ? ('archived' as any) : statusFilter,
    priority: priorityFilter,
    uid, // Filter by user's owned email accounts
  });

  // Debug logging removed for security - never log email content
  // Use safeLogger for production-safe logging if needed

  const { updateStatus, archive, unarchive, markAsRead } = useEmailActions();

  const handleStatusChange = async (emailId: string, status: EmailSummaryStatus) => {
    try {
      await updateStatus(emailId, status);
    } catch (error) {
      // Error logged without content for security
    }
  };

  const handleReanalyze = async (emailId: string) => {
    setReanalyzingEmailId(emailId);
    try {
      const reanalyzeFunction = httpsCallable(functionsEU, 'reanalyzeEmail');
      const result = await reanalyzeFunction({ emailId });
      
      const data = result.data as any;
      
      toast({
        title: '✅ Neu analysiert',
        description: `Kategorie: ${getCategoryLabel(data.category)} | Priorität: ${data.priority.toUpperCase()}`,
      });
    } catch (error: any) {
      // Error handling - no content logged
      const errorMessage = error.message || 'Bitte versuchen Sie es später erneut';
      
      toast({
        title: '❌ Analyse fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setReanalyzingEmailId(null);
    }
  };

  const handleGenerateReply = async (emailId: string) => {
    setGeneratingReplyForEmail(emailId);
    try {
      const generateReplyFunction = httpsCallable(functionsEU, 'generateEmailReplyDraft');
      const result = await generateReplyFunction({ 
        concernId: orgId,
        emailId,
        tone: 'neutral',
        language: 'de',
      });
      
      const data = result.data as any;
      
      toast({
        title: '✅ Antwort generiert',
        description: 'KI-Antwort wurde erstellt',
      });

      // Open reply composer
      setCurrentReplyId(data.replyId);
      setReplyComposerOpen(true);
    } catch (error: any) {
      // Error handling - no content logged
      toast({
        title: '❌ Generierung fehlgeschlagen',
        description: error.message || 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
    } finally {
      setGeneratingReplyForEmail(null);
    }
  };

  const getPriorityIcon = (priority: EmailPriority) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'normal':
        return <Clock className="w-4 h-4 text-gray-600" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: EmailSummaryStatus) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      {/* AppHeader */}
      <AppHeader
        title="Smart Inbox"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Card */}
        <Card className="bg-white border-2 border-gray-300 mb-6 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-[#058bc0] to-[#046a8f] rounded-xl shadow-lg">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {summaries.length} E-Mail{summaries.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm font-semibold text-gray-700">KI-gestützte E-Mail-Verwaltung</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 flex-wrap">
                <Button
                  onClick={() => setShowAccountSetup(true)}
                  className="bg-gradient-to-r from-[#058bc0] to-[#046a8f] text-white hover:from-[#046a8f] hover:to-[#058bc0] shadow-lg font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  E-Mail-Konto verbinden
                </Button>
                
                <Button
                  onClick={() => {
                    // Force re-render by toggling loading state
                    toast({
                      title: "Aktualisiert",
                      description: "Die E-Mail-Liste wird automatisch aktualisiert.",
                    });
                  }}
                  variant="outline"
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 shadow-md font-semibold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Aktualisieren
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Account Manager */}
        <EmailAccountManager />

        {/* Filters */}
        <Card className="mb-6 border-2 border-gray-300 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-[#058bc0]/10 to-[#046a8f]/10 border-b-2 border-gray-200">
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <div className="p-2 bg-[#058bc0] rounded-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">Filter & Ansicht</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <Label className="text-sm font-medium mb-2">Kategorie</Label>
                <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? undefined : value as EmailCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Kategorien" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    <SelectItem value="INVOICE">💰 Rechnung</SelectItem>
                    <SelectItem value="ORDER">📦 Bestellung</SelectItem>
                    <SelectItem value="SHIPPING">🚚 Versand</SelectItem>
                    <SelectItem value="CLAIM">⚠️ Reklamation</SelectItem>
                    <SelectItem value="COMPLAINT">😟 Beschwerde</SelectItem>
                    <SelectItem value="KYC">📄 Dokumente</SelectItem>
                    <SelectItem value="GENERAL">📝 Allgemein</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Label className="text-sm font-medium mb-2">Status</Label>
                <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as EmailSummaryStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="open">🟡 Offen</SelectItem>
                    <SelectItem value="in_progress">🔵 In Bearbeitung</SelectItem>
                    <SelectItem value="done">🟢 Erledigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div>
                <Label className="text-sm font-medium mb-2">Priorität</Label>
                <Select value={priorityFilter || 'all'} onValueChange={(value) => setPriorityFilter(value === 'all' ? undefined : value as EmailPriority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Prioritäten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Prioritäten</SelectItem>
                    <SelectItem value="high">🔴 Hoch</SelectItem>
                    <SelectItem value="normal">🟡 Normal</SelectItem>
                    <SelectItem value="low">🟢 Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Archive Toggle */}
              <div>
                <Label className="text-sm font-medium mb-2">Ansicht</Label>
                <Button
                  onClick={() => setShowArchived(!showArchived)}
                  variant={showArchived ? "default" : "outline"}
                  className="w-full"
                >
                  {showArchived ? <Inbox className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                  {showArchived ? 'Inbox anzeigen' : 'Archiv anzeigen'}
                </Button>
              </div>
            </div>

            {/* Reset Filters */}
            {(categoryFilter || statusFilter || priorityFilter) && (
              <div className="mt-4">
                <Button
                  onClick={() => {
                    setCategoryFilter(undefined);
                    setStatusFilter(undefined);
                    setPriorityFilter(undefined);
                  }}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Filter zurücksetzen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email List */}
        {loading ? (
          <Card className="border-2 border-gray-300 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center h-64 py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#058bc0] border-t-transparent"></div>
              <p className="mt-4 text-gray-600 font-medium">Lade E-Mails...</p>
            </CardContent>
          </Card>
        ) : summaries.length === 0 ? (
          <Card className="border-2 border-gray-300 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center h-96 py-12">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full mb-6">
                {showArchived ? <Archive className="w-20 h-20 text-[#058bc0]" /> : <Mail className="w-20 h-20 text-[#058bc0]" />}
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">
                {showArchived ? 'Keine archivierten E-Mails' : 'Keine E-Mails gefunden'}
              </p>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                {showArchived 
                  ? 'Sie haben noch keine E-Mails archiviert.'
                  : 'Verbinden Sie ein E-Mail-Konto oder passen Sie Ihre Filterkriterien an.'
                }
              </p>
              {!showArchived && (
                <Button onClick={() => setShowAccountSetup(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  E-Mail-Konto verbinden
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <Card
                key={summary.id}
                className="cursor-pointer hover:shadow-2xl transition-all hover:border-[#058bc0] border-2 border-gray-300 bg-white shadow-lg hover:-translate-y-1"
                onClick={() => {
                  setSelectedEmailId(summary.emailId);
                  if (summary.isNew) {
                    markAsRead(summary.emailId);
                  }
                }}
              >
                <CardContent className="p-6">
                  {/* Header with From and Subject */}
                  <div className="mb-4 pb-4 border-b-2 border-gray-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="p-1.5 bg-[#058bc0] rounded">
                            <Mail className="w-4 h-4 text-white flex-shrink-0" />
                          </div>
                          <span className="text-base font-bold text-gray-900 truncate">
                            {summary.emailFrom || 'Unbekannter Absender'}
                          </span>
                          {summary.emailTo && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              → {summary.emailTo}
                            </span>
                          )}
                          {summary.isNew && (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg animate-pulse">
                              NEU
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-800 truncate pl-8 bg-gray-50 px-3 py-1.5 rounded">
                          {summary.emailSubject || '(Kein Betreff)'}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg flex-shrink-0 ml-4">
                        {new Date(summary.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Tags and Status */}
                  <div className="flex items-center space-x-2 mb-4 flex-wrap gap-2">
                    {getPriorityIcon(summary.priority)}
                    <Badge className={`${getCategoryColor(summary.category)} font-semibold shadow-sm`}>
                      {getCategoryLabel(summary.category)}
                    </Badge>
                    <Badge className={`${getStatusColor(summary.status)} font-semibold shadow-sm`}>
                      {getStatusLabel(summary.status)}
                    </Badge>
                    {summary.assignedTo && (
                      <Badge variant="secondary" className="flex items-center space-x-1 font-semibold shadow-sm">
                        <User className="w-3 h-3" />
                        <span>Zugewiesen</span>
                      </Badge>
                    )}
                  </div>

                  {/* Summary Bullets */}
                  <div className="space-y-2 mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-l-4 border-[#058bc0]">
                    {summary.summaryBullets.map((bullet, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <span className="text-[#058bc0] mt-0.5 font-bold text-lg">•</span>
                        <span className="text-sm text-gray-900 font-medium">{bullet}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-wrap gap-2 pt-4 border-t-2 border-gray-300">
                    {!showArchived ? (
                      <>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(summary.emailId, 'in_progress');
                          }}
                          disabled={summary.status === 'in_progress'}
                          size="sm"
                          className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 shadow-md font-semibold"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          In Bearbeitung
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(summary.emailId, 'done');
                          }}
                          disabled={summary.status === 'done'}
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 shadow-md font-semibold"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Erledigt
                        </Button>
                        <Button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await archive(summary.emailId, user?.uid || '');
                              toast({
                                title: '🗄️ E-Mail archiviert',
                                description: 'E-Mail wurde aus der Inbox entfernt',
                              });
                            } catch (error) {
                              toast({
                                title: '❌ Fehler',
                                description: 'E-Mail konnte nicht archiviert werden',
                                variant: 'destructive',
                              });
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300 shadow-md font-semibold"
                        >
                          <Archive className="w-3 h-3 mr-1" />
                          Archivieren
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReanalyze(summary.emailId);
                          }}
                          disabled={reanalyzingEmailId === summary.emailId}
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 border-2 border-purple-300 shadow-md font-semibold disabled:opacity-50"
                        >
                          {reanalyzingEmailId === summary.emailId ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Analysiere...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              Neu analysieren
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateReply(summary.emailId);
                          }}
                          disabled={generatingReplyForEmail === summary.emailId}
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 hover:from-emerald-100 hover:to-teal-100 border-2 border-emerald-300 shadow-md font-semibold disabled:opacity-50"
                        >
                          {generatingReplyForEmail === summary.emailId ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Generiere...
                            </>
                          ) : (
                            <>
                              <Reply className="w-3 h-3 mr-1" />
                              AI Antwort erstellen
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await unarchive(summary.emailId);
                            toast({
                              title: '📥 E-Mail wiederhergestellt',
                              description: 'E-Mail wurde in die Inbox zurückgelegt',
                            });
                          } catch (error) {
                            toast({
                              title: '❌ Fehler',
                              description: 'E-Mail konnte nicht wiederhergestellt werden',
                              variant: 'destructive',
                            });
                          }
                        }}
                        size="sm"
                        className="bg-[#058bc0] hover:bg-[#046a8f] text-white shadow-md font-semibold"
                      >
                        <Inbox className="w-3 h-3 mr-1" />
                        Wiederherstellen
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Email Detail Drawer */}
      {selectedEmailId && (
        <EmailDetailDrawer
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
        />
      )}

      {/* Email Account Setup Modal */}
      {showAccountSetup && (
        <EmailAccountSetupModal onClose={() => setShowAccountSetup(false)} />
      )}

      {/* Reply Composer */}
      {replyComposerOpen && currentReplyId && (
        <EmailReplyComposer
          replyId={currentReplyId}
          onClose={() => {
            setReplyComposerOpen(false);
            setCurrentReplyId(null);
          }}
          onSent={() => {
            toast({
              title: '✅ E-Mail gesendet',
              description: 'Ihre Antwort wurde erfolgreich versendet',
            });
          }}
        />
      )}

      {/* Quick Action Sidebar - removed, using DesktopSidebar instead */}
    </div>
  );
};

// Email Account Setup Modal Component
const EmailAccountSetupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const orgId = user?.concernID || user?.ConcernID || '';
  const [provider, setProvider] = useState<'gmail' | 'm365' | 'imap'>('gmail');
  const [email, setEmail] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showImapCredentials, setShowImapCredentials] = useState(false);
  
  // IMAP-specific fields
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapUser, setImapUser] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapTls, setImapTls] = useState(true);
  const [testing, setTesting] = useState(false);
  
  const handleImapConnect = async () => {
    if (!email || !imapHost || !imapUser || !imapPassword) {
      toast({
        title: '⚠️ Fehlende Angaben',
        description: 'Bitte füllen Sie alle Felder aus',
        variant: 'destructive',
      });
      return;
    }
    
    setConnecting(true);
    try {
      const storeFunction = httpsCallable(functionsEU, 'storeImapAccount');
      const result = await storeFunction({
        orgId,
        emailAddress: email,
        host: imapHost,
        port: imapPort,
        user: imapUser,
        password: imapPassword,
        tls: imapTls,
      });
      
      toast({
        title: '✅ IMAP-Konto verbunden',
        description: (result.data as any).message,
      });
      
      onClose();
    } catch (error: any) {
      // Error handling - no credentials logged
      toast({
        title: '❌ Verbindung fehlgeschlagen',
        description: error.message || 'Bitte prüfen Sie Ihre Zugangsdaten',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  };
  
  const handleTestConnection = async () => {
    if (!imapHost || !imapUser || !imapPassword) {
      toast({
        title: '⚠️ Fehlende Angaben',
        description: 'Host, Benutzer und Passwort erforderlich',
        variant: 'destructive',
      });
      return;
    }
    
    setTesting(true);
    try {
      const testFunction = httpsCallable(functionsEU, 'testImapConnection');
      const result = await testFunction({
        host: imapHost,
        port: imapPort,
        user: imapUser,
        password: imapPassword,
        tls: imapTls,
      });
      
      toast({
        title: '✅ Verbindung erfolgreich',
        description: (result.data as any).message,
      });
    } catch (error: any) {
      // Error handling - no credentials logged
      toast({
        title: '❌ Verbindung fehlgeschlagen',
        description: error.message || 'Bitte prüfen Sie Ihre Zugangsdaten',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };
  
  const handleConnect = async () => {
    if (!email || !orgId) return;
    
    setConnecting(true);
    try {
      if (provider === 'imap') {
        // IMAP uses password-based auth, not OAuth
        // Show IMAP credential form
        setShowImapCredentials(true);
        setConnecting(false);
        return;
      }
      
      // Gmail or M365 - OAuth flow
      let authFunction: any;
      
      if (provider === 'gmail') {
        authFunction = httpsCallable(functionsEU, 'gmailOAuthInit');
      } else if (provider === 'm365') {
        authFunction = httpsCallable(functionsEU, 'm365OAuthInit');
      }
      
      const result = await authFunction({ emailAddress: email, orgId });
      const authUrl = (result.data as any).authUrl;
      
      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error: any) {
      // Error handling - no tokens logged
      toast({
        title: '❌ Verbindung fehlgeschlagen',
        description: error.message || 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-[#058bc0] to-[#046a8f] rounded-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">E-Mail-Konto verbinden</h2>
                <p className="text-sm text-gray-600">Wählen Sie Ihren E-Mail-Provider</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-2xl text-gray-400">×</span>
            </button>
          </div>

          {/* Provider Selection */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-gray-700">E-Mail Provider</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setProvider('gmail')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  provider === 'gmail'
                    ? 'border-[#058bc0] bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">📧</div>
                  <div className="font-medium text-gray-900">Gmail</div>
                  <div className="text-xs text-gray-500">Google Workspace</div>
                </div>
              </button>
              
              <button
                onClick={() => setProvider('m365')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  provider === 'm365'
                    ? 'border-[#058bc0] bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">📮</div>
                  <div className="font-medium text-gray-900">Microsoft 365</div>
                  <div className="text-xs text-gray-500">Outlook / Exchange</div>
                </div>
              </button>
              
              <button
                onClick={() => setProvider('imap')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  provider === 'imap'
                    ? 'border-[#058bc0] bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">📬</div>
                  <div className="font-medium text-gray-900">IMAP</div>
                  <div className="text-xs text-gray-500">Andere Provider</div>
                </div>
              </button>
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#058bc0] focus:border-[#058bc0] transition-all"
            />
          </div>

          {/* IMAP Credentials Form (shown only for IMAP) */}
          {showImapCredentials && provider === 'imap' && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IMAP Server
                  </label>
                  <input
                    type="text"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.example.com"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#058bc0] focus:border-[#058bc0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    placeholder="993"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#058bc0] focus:border-[#058bc0]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benutzername
                </label>
                <input
                  type="text"
                  value={imapUser}
                  onChange={(e) => setImapUser(e.target.value)}
                  placeholder="username oder email"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#058bc0] focus:border-[#058bc0]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <input
                  type="password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#058bc0] focus:border-[#058bc0]"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="imapTls"
                  checked={imapTls}
                  onChange={(e) => setImapTls(e.target.checked)}
                  className="w-4 h-4 text-[#058bc0] border-gray-300 rounded focus:ring-[#058bc0]"
                />
                <label htmlFor="imapTls" className="text-sm text-gray-700">
                  TLS/SSL verwenden (empfohlen)
                </label>
              </div>
              
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all disabled:opacity-50"
              >
                {testing ? 'Teste Verbindung...' : '🔍 Verbindung testen'}
              </button>
            </div>
          )}

          {/* Info Box */}
          {!showImapCredentials && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">ℹ️</div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">
                    {provider === 'imap' ? 'IMAP-Authentifizierung' : 'OAuth 2.0 Authentifizierung'}
                  </p>
                  <p>
                    {provider === 'imap' 
                      ? 'Ihre IMAP-Zugangsdaten werden verschlüsselt gespeichert.'
                      : `Sie werden zu ${provider === 'gmail' ? 'Google' : 'Microsoft'} weitergeleitet, um die Verbindung sicher zu autorisieren. Ihre Zugangsdaten werden nie bei uns gespeichert.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={showImapCredentials ? handleImapConnect : handleConnect}
              disabled={!email || connecting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#058bc0] to-[#046a8f] text-white rounded-xl hover:shadow-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? 'Verbinde...' : 'Verbinden'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SmartInbox;

