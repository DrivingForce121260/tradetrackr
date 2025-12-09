// ============================================================================
// DOCUMENT MANAGEMENT PAGE - Main Portal Page
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Upload as UploadIcon, 
  List, 
  BarChart3, 
  Settings, 
  FileText, 
  FolderOpen, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  RefreshCw,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from './AppHeader';
import UploadDocument from './documents/UploadDocument';
import { DocumentList } from './documents/DocumentList';
import { DocRecord, UploadContext } from '@/types/documents';
import { DocumentManagementService } from '@/services/documentManagementService';

interface DocumentManagementPageProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
  initialTab?: 'upload' | 'list' | 'analytics';
  initialContext?: UploadContext;
}

export default function DocumentManagementPage({
  onBack,
  onNavigate,
  onOpenMessaging,
  initialTab = 'list',
  initialContext
}: DocumentManagementPageProps) {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDocument, setSelectedDocument] = useState<DocRecord | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    needsReview: 0,
    thisWeek: 0,
    stored: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Get concernID from user object or fallback to localStorage (like other pages do)
  const getConcernID = () => {
    const fromUser = user?.concernID || user?.ConcernID;
    if (fromUser) return fromUser;
    
    // Fallback: Try to get from localStorage users collection
    try {
      const usersData = localStorage.getItem('users');
      if (usersData && user?.uid) {
        const users = JSON.parse(usersData);
        const currentUser = users.find((u: any) => u.uid === user.uid || u.id === user.uid);
        if (currentUser?.concernID) return currentUser.concernID;
        if (currentUser?.ConcernID) return currentUser.ConcernID;
      }
    } catch (error) {
      console.error('[DocumentManagementPage] Failed to get concernID from localStorage:', error);
    }
    
    return '';
  };
  
  const concernId = getConcernID();
  const userId = user?.uid || '';

  console.log('[DocumentManagementPage] Rendering with user:', { 
    concernId, 
    userId, 
    hasUser: !!user,
    userConcernID: user?.concernID,
    userConcernIDCaps: user?.ConcernID,
    userObject: user 
  });

  // Load statistics
  useEffect(() => {
    if (!concernId || !userId) {
      console.warn('[DocumentManagementPage] Missing concernId or userId, cannot load stats');
      setLoadingStats(false);
      return;
    }
    
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const docService = new DocumentManagementService(concernId, userId);
        
        // Load all documents for stats
        const allDocs = await docService.listRecentDocuments(1000);
        
        // Calculate stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        setStats({
          total: allDocs.length,
          needsReview: allDocs.filter(d => d.status === 'needs_review').length,
          thisWeek: allDocs.filter(d => {
            try {
              const createdAt = d.createdAt?.toDate?.() || new Date(0);
              return createdAt >= weekAgo;
            } catch {
              return false;
            }
          }).length,
          stored: allDocs.filter(d => d.status === 'stored').length
        });
      } catch (error) {
        console.error('[DocumentManagementPage] Failed to load stats:', error);
        // Set default stats on error
        setStats({ total: 0, needsReview: 0, thisWeek: 0, stored: 0 });
      } finally {
        setLoadingStats(false);
      }
    };
    
    loadStats();
  }, [concernId, userId]);

  // Early return if no user
  if (!user) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue flex items-center justify-center">
        <Card className="p-6">
          <p className="text-gray-500">Bitte melden Sie sich an, um fortzufahren.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      {/* AppHeader with consistent styling */}
      <AppHeader
        title="Dokumentenverwaltung"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <p className="text-sm text-white/95 font-semibold mt-1 drop-shadow-md">
          Intelligentes Upload- und Routing-System mit KI-Unterstützung
        </p>
      </AppHeader>

      {/* Quick Action Sidebar */}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Info Banner - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-2 border-[#058bc0] shadow-md bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-[#058bc0] to-[#047ba8] text-white rounded-lg p-2 shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Intelligente Dokumentenerkennung</h3>
                  <p className="text-xs text-gray-600">
                    Automatische Erkennung • 26 Dokumenttypen • DSGVO-konform
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-400 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-purple-900 mb-1">KI-Unterstützung</h3>
                  <p className="text-xs text-purple-700">
                    Optional • Nur mit Zustimmung
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs with bold styling */}
        <Card className="overflow-hidden border-2 border-gray-300 shadow-lg">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <CardHeader className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <TabsList className="grid w-full grid-cols-3 lg:w-[600px] h-12 border-2 border-gray-300">
                <TabsTrigger 
                  value="list" 
                  className="flex items-center gap-2 font-semibold data-[state=active]:bg-[#058bc0] data-[state=active]:text-white"
                >
                  <List className="h-5 w-5" />
                  Dokumente
                </TabsTrigger>
                <TabsTrigger 
                  value="upload" 
                  className="flex items-center gap-2 font-semibold data-[state=active]:bg-[#058bc0] data-[state=active]:text-white"
                >
                  <UploadIcon className="h-5 w-5" />
                  Upload
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center gap-2 font-semibold data-[state=active]:bg-[#058bc0] data-[state=active]:text-white"
                >
                  <BarChart3 className="h-5 w-5" />
                  Statistik
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {/* List Tab */}
              <TabsContent value="list" className="m-0 space-y-6">
                <DocumentList
                  onDocumentSelect={(doc) => {
                    setSelectedDocument(doc);
                    console.log('Selected document:', doc);
                  }}
                />
              </TabsContent>

              {/* Upload Tab */}
              <TabsContent value="upload" className="m-0 space-y-6">
                <UploadDocument
                  initialContext={initialContext}
                  onUploadComplete={(docIds) => {
                    console.log('Uploaded documents:', docIds);
                    if (docIds.length > 0) {
                      setActiveTab('list');
                      // Refresh stats
                      window.location.reload();
                    }
                  }}
                />
              </TabsContent>

              {/* Analytics Tab - Enhanced with bold borders */}
              <TabsContent value="analytics" className="m-0 space-y-6">
                {/* Document Type Distribution */}
                <Card className="border-2 border-[#058bc0] shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="border-b-2 border-[#058bc0]/30 bg-gradient-to-r from-blue-50 to-white">
                    <CardTitle className="flex items-center gap-3 text-lg font-bold">
                      <div className="bg-[#058bc0] p-2 rounded-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      Dokumenttyp-Verteilung
                    </CardTitle>
                    <CardDescription className="text-sm font-medium">
                      Überblick über alle klassifizierten Dokumenttypen
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-semibold text-gray-600">Statistiken werden berechnet...</p>
                      <p className="text-sm mt-2 text-gray-500">Laden Sie weitere Dokumente hoch, um Statistiken zu sehen</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Routing Performance */}
                <Card className="border-2 border-green-500 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="border-b-2 border-green-400/50 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="flex items-center gap-3 text-lg font-bold">
                      <div className="bg-green-600 p-2 rounded-lg shadow-md">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      Routing-Performance
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-green-900">
                      Effizienz der automatischen Dokumentenerkennung
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-green-400 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600 p-2 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-bold text-gray-900">Automatisch geroutet</span>
                        </div>
                        <Badge className="bg-green-600 text-white px-4 py-1 text-base font-bold border-2 border-green-700">
                          {stats.stored > 0 ? Math.round((stats.stored / stats.total) * 100) : 0}%
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-amber-400 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-600 p-2 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-bold text-gray-900">Manuelle Prüfung</span>
                        </div>
                        <Badge className="bg-amber-600 text-white px-4 py-1 text-base font-bold border-2 border-amber-700">
                          {stats.total > 0 ? Math.round((stats.needsReview / stats.total) * 100) : 0}%
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-purple-400 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-600 p-2 rounded-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-bold text-gray-900">KI-gestützt</span>
                        </div>
                        <Badge className="bg-purple-600 text-white px-4 py-1 text-base font-bold border-2 border-purple-700">
                          0%
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-4 border-t-2 border-gray-300 mt-4">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-300">
                        <p className="text-base text-gray-900">
                          <strong className="text-green-700">Erfolgsquote:</strong> {stats.total > 0 ? Math.round((stats.stored / stats.total) * 100) : 0}% der Dokumente werden automatisch klassifiziert
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Trend */}
                <Card className="border-2 border-blue-500 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="border-b-2 border-blue-400/50 bg-gradient-to-r from-blue-50 to-cyan-50">
                    <CardTitle className="flex items-center gap-3 text-lg font-bold">
                      <div className="bg-blue-600 p-2 rounded-lg shadow-md">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      Wöchentlicher Trend
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-blue-900">
                      Uploads der letzten 7 Tage
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl border-2 border-blue-400">
                      <div>
                        <p className="text-5xl font-bold text-blue-700">{stats.thisWeek}</p>
                        <p className="text-base text-blue-900 mt-2 font-semibold">Neue Dokumente</p>
                      </div>
                      <div className="bg-blue-600 p-4 rounded-full">
                        <TrendingUp className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

