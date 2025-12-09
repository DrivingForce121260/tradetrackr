import React, { lazy, Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import NotificationSettings from './NotificationSettings';
import RetentionSettings from './settings/RetentionSettings';
import CategoryManager from './settings/CategoryManager';
import SessionTimeoutSettings from './settings/SessionTimeoutSettings';
import { ManagementWithNavigationProps } from '@/types/common';

const CalendarIntegration = lazy(() => import('@/components/settings/CalendarIntegration'));

const Settings: React.FC<ManagementWithNavigationProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
	const { hasPermission } = useAuth();
	return (
		<div className="min-h-screen tradetrackr-gradient-blue">
			<AppHeader
				title="⚙️ Einstellungen"
				showBackButton={true}
				onBack={onBack}
				onOpenMessaging={onOpenMessaging}
			/>
			<div className="p-6">
				<div className="max-w-5xl mx-auto">
					<Tabs defaultValue="notifications" className="space-y-6">
						<TabsList className="bg-white border-2 border-[#058bc0] shadow-lg p-1" role="tablist" aria-label="Einstellungs-Kategorien">
							<TabsTrigger 
								value="notifications"
								className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold"
								aria-label="Benachrichtigungs-Einstellungen"
							>
								🔔 Benachrichtigungen
							</TabsTrigger>
							<TabsTrigger 
								value="calendar"
								className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold"
								aria-label="Kalender-Integration"
							>
								📅 Kalender-Integration
							</TabsTrigger>
							<TabsTrigger 
								value="retention"
								className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold"
								aria-label="Aufbewahrungs-Einstellungen"
							>
								🗄️ Aufbewahrung
							</TabsTrigger>
							<TabsTrigger 
								value="categories"
								className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold"
								aria-label="Kategorien verwalten"
							>
								📁 Kategorien
							</TabsTrigger>
							<TabsTrigger 
								value="session-timeout"
								className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#058bc0] data-[state=active]:to-[#0470a0] data-[state=active]:text-white font-semibold"
								aria-label="Session-Timeout Einstellungen"
							>
								⏱️ Session-Timeout
							</TabsTrigger>
						</TabsList>
						<TabsContent value="notifications">
							<NotificationSettings onBack={onBack} onOpenMessaging={onOpenMessaging} />
						</TabsContent>
						<TabsContent value="calendar">
							<Suspense fallback={
								<div className="p-8 text-center bg-white rounded-lg border-2 border-[#058bc0] shadow-lg">
									<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#058bc0] mx-auto mb-4"></div>
									<p className="text-gray-600 font-medium">Lade Kalender-Integration...</p>
								</div>
							}>
								<CalendarIntegration />
							</Suspense>
						</TabsContent>
						<TabsContent value="retention">
							<RetentionSettings />
						</TabsContent>
						<TabsContent value="categories">
							<CategoryManager onBack={onBack} onOpenMessaging={onOpenMessaging} />
						</TabsContent>
						<TabsContent value="session-timeout">
							<SessionTimeoutSettings />
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{/* Quick Action Sidebar */}
		</div>
	);
};

export default Settings;

