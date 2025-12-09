import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickActionContext } from '@/contexts/QuickActionContext';
import { MessagingProvider } from '@/contexts/MessagingContext';
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/ui/loading';
import LandingPage from './LandingPage';
import PrivateDashboard from './PrivateDashboard';
import GlobalCommandPalette from './GlobalCommandPalette';
import MobileBottomNavigation from './MobileBottomNavigation';
import Messaging from './Messaging';
import DesktopSidebar from './DesktopSidebar';
import SessionTimeout from './auth/SessionTimeout';

// Lazy load large components for better performance
const ProjectManagement = lazy(() => import('./ProjectManagement'));
const TaskManagement = lazy(() => import('./TaskManagement'));
const TaskBoard = lazy(() => import('./tasks/TaskBoard'));
const ProjectInformation = lazy(() => import('./ProjectInformation'));
const ReportsManagement = lazy(() => import('./ReportsManagement'));
const ReportsList = lazy(() => import('./reports/ReportsList'));
const ReportsBuilder = lazy(() => import('./reports/ReportsBuilder'));
const ReportsScheduler = lazy(() => import('./reports/ReportsScheduler'));
const CustomerManagement = lazy(() => import('./CustomerManagement'));
const MaterialManagement = lazy(() => import('./MaterialManagement'));
const UserManagement = lazy(() => import('./UserManagement'));
const Categories = lazy(() => import('./Categories'));
const CRM = lazy(() => import('./CRM'));
const InvoicingPortal = lazy(() => import('./invoicing/InvoicingPortal'));
const SchedulingBoard = lazy(() => import('./SchedulingBoard'));
const PersonnelOverview = lazy(() => import('./PersonnelOverview'));
const EmployeeDetail = lazy(() => import('./EmployeeDetail'));
const VacationCalendar = lazy(() => import('./VacationCalendar'));
const NotificationSettings = lazy(() => import('./NotificationSettings'));
const AuftraggeberDashboard = lazy(() => import('./AuftraggeberDashboard'));
const FirestoreAdmin = lazy(() => import('./FirestoreAdmin'));
const ConcernManagement = lazy(() => import('./ConcernManagement'));
const DocumentManagement = lazy(() => import('./DocumentManagement'));
const DocumentManagementPage = lazy(() => import('./DocumentManagementPage'));
const TimeAdminDashboard = lazy(() => import('./timeAdmin').then(m => ({ default: m.TimeAdminDashboard })));
const Approvals = lazy(() => import('./timeAdmin/Approvals'));
const Timesheets = lazy(() => import('./timeAdmin/Timesheets'));
const Exports = lazy(() => import('./timeAdmin/Exports'));
const LiveView = lazy(() => import('./timeOps').then(m => ({ default: m.LiveView })));
const ExceptionsView = lazy(() => import('./timeOps').then(m => ({ default: m.ExceptionsView })));
const ReportsView = lazy(() => import('./timeOps').then(m => ({ default: m.ReportsView })));
const TemplateManager = lazy(() => import('./templates/TemplateManager'));
const AutomationDashboard = lazy(() => import('./automation/AutomationDashboard').then(m => ({ default: m.AutomationDashboard })));
const ProjectWorkOrders = lazy(() => import('./workorders/ProjectWorkOrders'));
const SystemLogs = lazy(() => import('./admin/SystemLogs'));
const Settings = lazy(() => import('./Settings'));
const SmartInbox = lazy(() => import('./SmartInbox'));
const LoadingAndToastDemo = lazy(() => import('./LoadingAndToastDemo'));
const CategoryAnalytics = lazy(() => import('./analytics/CategoryAnalytics'));

// Loading fallback component
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 mt-4">Lade Seite...</p>
    </div>
  </div>
);

const MainAppContent: React.FC = () => {
  const { user, loading, getDefaultDashboard, syncLocalDataToFirestore, generateDemoDataForDemoUser } = useAuth();
  const { currentPage, navigateTo, goBack } = useNavigation();
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Check if current page is a quick action
  const isQuickAction = currentPage.startsWith('new-');
  const quickActionType = isQuickAction ? currentPage.replace('new-', '') : null;

  // Navigation state is handled by NavigationProvider

  // Vereinfachter useEffect für Demo-Daten und Sync
  useEffect(() => {
    if (user && !loading) {

      
      // Demo-Daten für Demo-Benutzer generieren
      if (user.email === 'demo@tradetrackr.com') {
        generateDemoDataForDemoUser();
      }
      
      // Lokale Daten mit Firestore synchronisieren (falls vorhanden)
      syncLocalDataToFirestore();
      

    }
  }, [user, loading, syncLocalDataToFirestore, generateDemoDataForDemoUser]);

  // Global navigation via custom event wird jetzt vom NavigationProvider gehandhabt

  // Wenn Benutzer nicht angemeldet ist, Landing Page anzeigen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade TradeTrackr...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const handleBackToDashboard = () => {
    goBack();
  };

  const handleMessagingToggle = () => {
    setIsMessagingOpen(!isMessagingOpen);
  };

  const renderCurrentPage = () => {
    // Check if this is a quick action route
    const isQuickAction = currentPage.startsWith('new-');
    
    switch (currentPage) {
      case 'users':
        return <Suspense fallback={<PageLoadingFallback />}><UserManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'categories':
        return <Suspense fallback={<PageLoadingFallback />}><Categories onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'crm':
        return <Suspense fallback={<PageLoadingFallback />}><CRM onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'materials':
        return <Suspense fallback={<PageLoadingFallback />}><MaterialManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'projects':
        return <Suspense fallback={<PageLoadingFallback />}><ProjectManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'project-info':
        return <Suspense fallback={<PageLoadingFallback />}><ProjectInformation onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'tasks':
        return <Suspense fallback={<PageLoadingFallback />}><TaskBoard onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'personnel':
        return <Suspense fallback={<PageLoadingFallback />}><PersonnelOverview onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case (currentPage.match(/^employee:.+/)?.input ?? ''):
        return <Suspense fallback={<PageLoadingFallback />}><EmployeeDetail empId={(currentPage.split(':')[1])} onBack={handleBackToDashboard} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'vacations':
        return <Suspense fallback={<PageLoadingFallback />}><VacationCalendar onBack={handleBackToDashboard} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'notification-settings':
        return <Suspense fallback={<PageLoadingFallback />}><NotificationSettings onBack={handleBackToDashboard} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'system-logs':
        return <Suspense fallback={<PageLoadingFallback />}><SystemLogs onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'settings':
        return <Suspense fallback={<PageLoadingFallback />}><Settings onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'category-analytics':
        return <Suspense fallback={<PageLoadingFallback />}><CategoryAnalytics onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'reports':
        return <Suspense fallback={<PageLoadingFallback />}><ReportsManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'reports-list':
        return <Suspense fallback={<PageLoadingFallback />}><ReportsList onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'reports-builder':
        return <Suspense fallback={<PageLoadingFallback />}><ReportsBuilder onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case (currentPage.match(/^reports-builder:.+/)?.input ?? ''):
        return <Suspense fallback={<PageLoadingFallback />}><ReportsBuilder templateId={currentPage.split(':')[1]} onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'reports-scheduler':
        return <Suspense fallback={<PageLoadingFallback />}><ReportsScheduler onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'customers':
        return <Suspense fallback={<PageLoadingFallback />}><CustomerManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'invoicing':
        return <Suspense fallback={<PageLoadingFallback />}><InvoicingPortal onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'scheduling':
        return <Suspense fallback={<PageLoadingFallback />}><SchedulingBoard onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'auftraggeber':
        return <Suspense fallback={<PageLoadingFallback />}><AuftraggeberDashboard onBack={handleBackToDashboard} /></Suspense>;
      case 'firestore-admin':
        return <Suspense fallback={<PageLoadingFallback />}><FirestoreAdmin /></Suspense>;
      case 'concern-management':
        return <Suspense fallback={<PageLoadingFallback />}><ConcernManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'documents':
        return <Suspense fallback={<PageLoadingFallback />}><DocumentManagementPage onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} initialTab="list" /></Suspense>;
      case 'upload-document':
        return <Suspense fallback={<PageLoadingFallback />}><DocumentManagementPage onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} initialTab="upload" /></Suspense>;
      case 'documents-old':
        return <Suspense fallback={<PageLoadingFallback />}><DocumentManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'templates':
        return <Suspense fallback={<PageLoadingFallback />}><TemplateManager onBack={handleBackToDashboard} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'automation':
        return <Suspense fallback={<PageLoadingFallback />}><AutomationDashboard onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case (currentPage.match(/^work-orders:.+/)?.input ?? ''):
        return <Suspense fallback={<PageLoadingFallback />}><ProjectWorkOrders projectId={currentPage.split(':')[1]} onBack={handleBackToDashboard} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'smart-inbox':
        return <Suspense fallback={<PageLoadingFallback />}><SmartInbox onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'time-admin':
        return <Suspense fallback={<PageLoadingFallback />}><TimeAdminDashboard onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'time-admin-approvals':
        return <Suspense fallback={<PageLoadingFallback />}><Approvals onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'time-admin-timesheets':
        return <Suspense fallback={<PageLoadingFallback />}><Timesheets onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'time-admin-exports':
        return <Suspense fallback={<PageLoadingFallback />}><Exports onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'time-ops-live':
        return <Suspense fallback={<PageLoadingFallback />}><LiveView onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'time-ops-exceptions':
        return <Suspense fallback={<PageLoadingFallback />}><ExceptionsView onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'time-ops-reports':
        return <Suspense fallback={<PageLoadingFallback />}><ReportsView onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-task':
        return <Suspense fallback={<PageLoadingFallback />}><TaskManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-report':
        return <Suspense fallback={<PageLoadingFallback />}><ReportsManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-user':
        return <Suspense fallback={<PageLoadingFallback />}><UserManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-customer':
        return <Suspense fallback={<PageLoadingFallback />}><CustomerManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-category':
        return <Suspense fallback={<PageLoadingFallback />}><Categories onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-material':
        return <Suspense fallback={<PageLoadingFallback />}><MaterialManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-project':
        return <Suspense fallback={<PageLoadingFallback />}><ProjectManagement onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'new-project-info':
        return <Suspense fallback={<PageLoadingFallback />}><ProjectInformation onBack={handleBackToDashboard} onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} /></Suspense>;
      case 'loading-toast-demo':
        return <Suspense fallback={<PageLoadingFallback />}><LoadingAndToastDemo onBack={handleBackToDashboard} /></Suspense>;
      case 'dashboard':
      default:
        return <PrivateDashboard onNavigate={navigateTo} onOpenMessaging={() => setIsMessagingOpen(true)} />;
    }
  };

              return (
                <MessagingProvider>
                  <QuickActionContext.Provider value={{ isQuickAction, quickActionType }}>
                    <div className="min-h-screen bg-gray-50 relative pb-16 lg:pb-0">
                      {/* Session Timeout - Only active when user is authenticated */}
                      {/* Loads configuration from orgSettings in Firestore */}
                      {user && <SessionTimeout />}
                      
                      {/* Desktop Sidebar - nur auf Desktop sichtbar */}
                      <div className="hidden lg:block">
                        <DesktopSidebar />
                      </div>
                      
                      {/* Main Content - mit Sidebar-Offset auf Desktop */}
                      <div className="lg:pl-64">
                        <GlobalCommandPalette 
                          isOpen={isCommandOpen}
                          onOpenChange={setIsCommandOpen}
                          onNavigate={navigateTo}
                          onOpenMessaging={() => setIsMessagingOpen(true)}
                        />
                        {renderCurrentPage()}
                      </div>
                      
                      {/* Mobile Bottom Navigation */}
                      <MobileBottomNavigation />
                      
                      {/* Messaging Overlay - Floating */}
                      {isMessagingOpen && (
                        <div className="fixed top-20 right-4 z-50 w-96 h-[600px]">
                          <Messaging 
                            isMinimized={false}
                            onToggleMinimize={handleMessagingToggle}
                            onClose={() => setIsMessagingOpen(false)}
                          />
                        </div>
                      )}
                    </div>
                  </QuickActionContext.Provider>
                </MessagingProvider>
              );
};

const MainApp: React.FC = () => {
  return (
    <ThemeProvider>
      <NavigationProvider initialPage="dashboard">
        <MainAppContent />
      </NavigationProvider>
    </ThemeProvider>
  );
};

export default MainApp;
