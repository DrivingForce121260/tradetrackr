import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import CalendarService from '@/services/calendarService';
import { Copy, RefreshCw, Link2, Shield } from 'lucide-react';

const CalendarIntegration: React.FC = () => {
	const { user } = useAuth();
	const [svc, setSvc] = useState<CalendarService | null>(null);
	const [url, setUrl] = useState('');
	const [tokenActive, setTokenActive] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => { if (user) setSvc(new CalendarService(user)); }, [user]);

	useEffect(() => { (async () => {
		if (!user?.uid || !svc) return;
		const t = await svc.getToken(user.uid);
		if (t?.token && t.active) {
			setTokenActive(true);
			setUrl(svc.buildFeedUrl(user.uid, t.token));
		} else {
			setTokenActive(false);
			setUrl('');
		}
	})(); }, [svc, user?.uid]);

	const generate = async () => {
		if (!svc || !user?.uid) return;
		setLoading(true);
		try {
			const { token } = await svc.generateOrRotate(user.uid);
			setTokenActive(true);
			setUrl(svc.buildFeedUrl(user.uid, token));
		} finally { setLoading(false); }
	};

	const revoke = async () => {
		if (!svc || !user?.uid) return;
		setLoading(true);
		try {
			await svc.revoke(user.uid);
			setTokenActive(false);
			setUrl('');
		} finally { setLoading(false); }
	};

	return (
		<Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
			<CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
				<CardTitle className="text-lg font-bold flex items-center gap-2">
					<Link2 className="h-5 w-5" />
					<span className="text-2xl">📅</span>
					Kalender-Integration (ICS)
				</CardTitle>
			</CardHeader>
			<CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-6">
				<div className="p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
					<p className="text-sm text-gray-800 font-medium flex items-center gap-2">
						<span className="text-lg">ℹ️</span>
						Binden Sie persönliche Einsätze in Outlook/Google/Apple ein. Änderungen werden automatisch synchronisiert.
					</p>
				</div>
				
				<div className="flex gap-3">
					<Button 
						onClick={generate} 
						disabled={loading}
						className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
					>
						<RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 
						🔄 Link erzeugen/erneuern
					</Button>
					<Button 
						variant="outline" 
						onClick={revoke} 
						disabled={loading || !tokenActive}
						className="flex-1 border-2 border-red-300 hover:bg-red-50 font-semibold"
					>
						<Shield className="h-4 w-4 mr-2" /> 
						🚫 Link widerrufen
					</Button>
				</div>
				
				<div className="space-y-3 p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
					<div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
						<span className="text-lg">🔗</span>
						ICS-Feed URL
					</div>
					<div className="flex gap-2">
						<Input 
							readOnly 
							value={url} 
							placeholder="Noch kein Link erzeugt" 
							className="font-mono text-sm border-2 border-gray-300 bg-gray-50"
						/>
						<Button 
							variant="outline" 
							onClick={() => { if (url) navigator.clipboard.writeText(url); }} 
							disabled={!url}
							className="border-2 border-gray-300 hover:bg-gray-100"
						>
							<Copy className="h-4 w-4 mr-2" /> 
							📋 Kopieren
						</Button>
					</div>
				</div>
				
				<div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border-2 border-cyan-200">
					<div className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
						<span className="text-lg">💡</span>
						Anleitung für beliebte Kalender
					</div>
					<div className="space-y-2 text-xs text-gray-700">
						<p className="flex items-start gap-2">
							<span className="font-semibold min-w-[80px]">📅 Outlook:</span>
							<span>Kalender &rarr; Kalender hinzufügen &rarr; Aus dem Internet</span>
						</p>
						<p className="flex items-start gap-2">
							<span className="font-semibold min-w-[80px]">📅 Google:</span>
							<span>Weitere Kalender &rarr; Per URL</span>
						</p>
						<p className="flex items-start gap-2">
							<span className="font-semibold min-w-[80px]">🍎 Apple:</span>
							<span>Ablage &rarr; Neues Kalenderabonnement</span>
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default CalendarIntegration;
