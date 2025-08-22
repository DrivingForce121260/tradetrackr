import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickActionContext } from '@/contexts/QuickActionContext';
import { MessagingProvider } from '@/contexts/MessagingContext';
import LandingPage from './LandingPage';
import PrivateDashboard from './PrivateDashboard';
import ProjectManagement from './ProjectManagement';
import TaskManagement from './TaskManagement';
import ProjectInformation from './ProjectInformation';
import ReportsManagement from './ReportsManagement';
import CustomerManagement from './CustomerManagement';
import MaterialManagement from './MaterialManagement';
import UserManagement from './UserManagement';
import Categories from './Categories';
import Messaging from './Messaging';
import AuftraggeberDashboard from './AuftraggeberDashboard';
import FirestoreAdmin from './FirestoreAdmin';
import ConcernManagement from './ConcernManagement';
import DocumentManagement from './DocumentManagement';

const MainApp: React.FC = () => {
  const { user, loading, getDefaultDashboard, syncLocalDataToFirestore, generateDemoDataForDemoUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  // Check if current page is a quick action
  const isQuickAction = currentPage.startsWith('new-');
  const quickActionType = isQuickAction ? currentPage.replace('new-', '') : null;

  // Debug-Logs für Navigation
  useEffect(() => {

  }, [user, loading, currentPage]);

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
    setCurrentPage('dashboard');
  };

  const handleMessagingToggle = () => {
    setIsMessagingOpen(!isMessagingOpen);
  };

  const renderCurrentPage = () => {
    // Check if this is a quick action route
    const isQuickAction = currentPage.startsWith('new-');
    
    switch (currentPage) {
      case 'users':
        return <UserManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'categories':
        return <Categories onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'materials':
        return <MaterialManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'projects':
        return <ProjectManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'project-info':
        return <ProjectInformation onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'tasks':
        return <TaskManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'reports':
        return <ReportsManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'customers':
        return <CustomerManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;

      case 'auftraggeber':
        return <AuftraggeberDashboard onBack={handleBackToDashboard} />;
      
      case 'firestore-admin':
        return <FirestoreAdmin />;
      case 'concern-management':
        return <ConcernManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'documents':
        return <DocumentManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'upload-document':
        return <DocumentManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      
      // Quick Action Routes - Direct to creation forms
      case 'new-task':
        return <TaskManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'new-report':
        return <ReportsManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'new-user':
        return <UserManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'new-customer':
        return <CustomerManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'new-category':
        return <Categories onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'new-material':
        return <MaterialManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'new-project':
        return <ProjectManagement onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'new-project-info':
        return <ProjectInformation onBack={handleBackToDashboard} onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
      case 'dashboard':
      default:
        return <PrivateDashboard onNavigate={setCurrentPage} onOpenMessaging={() => setIsMessagingOpen(true)} />;
    }
  };

  return (
    <MessagingProvider>
      <QuickActionContext.Provider value={{ isQuickAction, quickActionType }}>
        <div className="min-h-screen bg-gray-50 relative">
          {renderCurrentPage()}
          
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

export default MainApp;
