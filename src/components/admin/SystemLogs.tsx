import React, { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ManagementWithNavigationProps } from '@/types/common';
import { X, RefreshCw } from 'lucide-react';

interface AuditRow {
	id: string;
	entityType: string;
	entityId: string;
	action: string;
	actorId?: string;
	timestamp?: Date;
}

const SystemLogs: React.FC<ManagementWithNavigationProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
	const { hasPermission } = useAuth();
	const [rows, setRows] = useState<AuditRow[]>([]);
	const [entityType, setEntityType] = useState<string>('all');
	const [action, setAction] = useState<string>('all');
	const [actor, setActor] = useState<string>('');
	const [loading, setLoading] = useState(false);

	const canView = hasPermission('admin');

	const loadLogs = async () => {
		setLoading(true);
		try {
			const clauses: any[] = [];
			if (entityType !== 'all') clauses.push(where('entityType', '==', entityType));
			if (action !== 'all') clauses.push(where('action', '==', action.toUpperCase()));
			if (actor.trim()) clauses.push(where('actorId', '==', actor.trim()));
			const q = query(collection(db, 'auditLogs'), ...clauses, orderBy('timestamp', 'desc'), limit(200));
			const snap = await getDocs(q);
			setRows(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: (d.data() as any).timestamp?.toDate?.() })) as any);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadLogs(); }, [entityType, action, actor]);

	if (!canView) {
		return (
			<div className="min-h-screen tradetrackr-gradient-blue">
				<AppHeader title="System Logs" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging} />
				<div className="p-6">
					<div className="max-w-6xl mx-auto">
						<Card><CardContent className="p-6">Kein Zugriff.</CardContent></Card>
					</div>
				</div>
			</div>
		);
	}

	const getActionBadge = (action: string) => {
		if (action.includes('CREATE')) return <Badge className="bg-green-100 text-green-800 border-0">✅ {action}</Badge>;
		if (action.includes('UPDATE')) return <Badge className="bg-blue-100 text-blue-800 border-0">✏️ {action}</Badge>;
		if (action.includes('DELETE')) return <Badge className="bg-red-100 text-red-800 border-0">🗑️ {action}</Badge>;
		if (action.includes('EXPORT')) return <Badge className="bg-purple-100 text-purple-800 border-0">📤 {action}</Badge>;
		return <Badge variant="outline">{action}</Badge>;
	};

	const getEntityEmoji = (entityType: string): string => {
		const emojis: Record<string, string> = {
			'projects': '📁',
			'materials': '📦',
			'personnel': '👥',
			'clients': '🏢',
			'invoices': '💶',
			'tasks': '✅',
			'timeEntries': '⏱️'
		};
		return emojis[entityType] || '📄';
	};

	const getEntityName = (entityType: string): string => {
		const names: Record<string, string> = {
			'projects': 'Projekte',
			'materials': 'Material',
			'personnel': 'Personal',
			'clients': 'Kunden',
			'invoices': 'Rechnungen',
			'tasks': 'Aufgaben',
			'timeEntries': 'Zeiterfassung'
		};
		return names[entityType] || entityType;
	};

	return (
		<div className="min-h-screen tradetrackr-gradient-blue">
			<AppHeader 
				title="📋 System Logs" 
				showBackButton 
				onBack={onBack} 
				onOpenMessaging={onOpenMessaging}
			>
				<Button 
					onClick={loadLogs} 
					disabled={loading}
					className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
				>
					<RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
					🔄 Aktualisieren
				</Button>
			</AppHeader>
			<div className="p-6">
				<div className="max-w-7xl mx-auto space-y-6">
					{/* Statistics */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
							<CardContent className="pt-4 pb-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-white/90">Einträge geladen</p>
										<p className="text-3xl font-bold mt-2">{rows.length}</p>
									</div>
									<div className="text-4xl">📊</div>
								</div>
							</CardContent>
						</Card>
						<Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
							<CardContent className="pt-4 pb-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-white/90">Max. Einträge</p>
										<p className="text-3xl font-bold mt-2">200</p>
									</div>
									<div className="text-4xl">📝</div>
								</div>
							</CardContent>
						</Card>
						<Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
							<CardContent className="pt-4 pb-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-white/90">Filter aktiv</p>
										<p className="text-3xl font-bold mt-2">{(entityType !== 'all' || action !== 'all' || actor) ? 'Ja' : 'Nein'}</p>
									</div>
									<div className="text-4xl">🔍</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Filter Card */}
					<Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
						<CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
							<CardTitle className="text-lg font-bold flex items-center gap-2">
								<span className="text-2xl">🔍</span>
								Filter & Suche
								{(entityType !== 'all' || action !== 'all' || actor) && (
									<Badge className="ml-3 bg-yellow-400 text-gray-900 font-semibold border-0">
										🎯 Filter aktiv
									</Badge>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
							<div className="flex gap-3 flex-wrap">
								<div className="relative flex-1 min-w-[200px]">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📁</div>
									<Select value={entityType} onValueChange={setEntityType}>
										<SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
											<SelectValue placeholder="Entität" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">🎯 Alle Entitäten</SelectItem>
											{['projects','materials','personnel','clients','invoices','tasks','timeEntries'].map(et => (
												<SelectItem key={et} value={et}>
													{getEntityEmoji(et)} {getEntityName(et)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="relative flex-1 min-w-[180px]">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">⚡</div>
									<Select value={action} onValueChange={setAction}>
										<SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
											<SelectValue placeholder="Aktion" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">🎯 Alle</SelectItem>
											<SelectItem value="create">✅ CREATE</SelectItem>
											<SelectItem value="update">✏️ UPDATE</SelectItem>
											<SelectItem value="delete">🗑️ DELETE</SelectItem>
											<SelectItem value="export">📤 EXPORT</SelectItem>
											<SelectItem value="delete_confirmed">🔥 DELETE_CONFIRMED</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="relative flex-1 min-w-[220px]">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">👤</div>
									<Input 
										placeholder="Akteur UID suchen..." 
										value={actor} 
										onChange={e=>setActor(e.target.value)} 
										className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm" 
									/>
								</div>
							<Button 
								onClick={()=>{ setEntityType('all'); setAction('all'); setActor(''); }}
								className="border-2 border-red-300 hover:bg-red-50 font-semibold"
								variant="outline"
							>
								❌ Zurücksetzen
							</Button>
							</div>
						</CardContent>
					</Card>

					{/* Logs Table */}
					<Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
						<CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
							<CardTitle className="text-lg font-bold flex items-center gap-2">
								<span className="text-2xl">📋</span>
								Audit-Protokolle ({rows.length})
							</CardTitle>
						</CardHeader>
						<CardContent className="bg-white p-0">
							{loading ? (
								<div className="p-8 text-center">
									<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#058bc0] mx-auto mb-4"></div>
									<p className="text-gray-600 font-medium">Lade Protokolle...</p>
								</div>
							) : rows.length === 0 ? (
								<div className="p-12 text-center">
									<div className="text-6xl mb-4">📭</div>
									<p className="text-gray-600 font-medium">Keine Protokolleinträge gefunden</p>
									<p className="text-gray-500 text-sm mt-2">Passen Sie die Filter an oder warten Sie auf neue Aktivitäten</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow className="bg-gray-50">
												<TableHead className="font-semibold">🕒 Zeit</TableHead>
												<TableHead className="font-semibold">📁 Entität</TableHead>
												<TableHead className="font-semibold">⚡ Aktion</TableHead>
												<TableHead className="font-semibold">👤 Akteur</TableHead>
												<TableHead className="font-semibold">🔑 Entitäts-ID</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{rows.map(r => (
												<TableRow key={r.id} className="hover:bg-blue-50 transition-colors">
													<TableCell className="font-mono text-xs">
														{r.timestamp ? r.timestamp.toLocaleString('de-DE') : '-'}
													</TableCell>
													<TableCell className="font-medium">
														{getEntityEmoji(r.entityType)} {getEntityName(r.entityType)}
													</TableCell>
													<TableCell>{getActionBadge(r.action)}</TableCell>
													<TableCell className="font-mono text-xs">{r.actorId || '-'}</TableCell>
													<TableCell className="font-mono text-xs text-gray-600">{r.entityId}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Quick Action Sidebar */}
		</div>
	);
};

export default SystemLogs;
