import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import WorkOrderService from '@/services/workOrderService';
import type { WorkOrder, WorkOrderFormData, WorkOrderStatus } from '@/types/workorder';

interface ProjectWorkOrdersProps {
	onBack: () => void;
	onOpenMessaging?: () => void;
	projectId: string;
}

const statusColors: Record<WorkOrderStatus, string> = {
	'draft': 'bg-gray-200 text-gray-800',
	'assigned': 'bg-blue-100 text-blue-700',
	'in-progress': 'bg-amber-100 text-amber-700',
	'completed': 'bg-green-100 text-green-700',
};

const ProjectWorkOrders: React.FC<ProjectWorkOrdersProps> = ({ onBack, onOpenMessaging, projectId }) => {
	const { user } = useAuth();
	const [svc, setSvc] = useState<WorkOrderService | null>(null);
	const [items, setItems] = useState<WorkOrder[]>([]);
	const [loading, setLoading] = useState(false);
	const [showEditor, setShowEditor] = useState(false);
	const [editing, setEditing] = useState<WorkOrder | null>(null);
	const [form, setForm] = useState<WorkOrderFormData>({
		projectId,
		title: '',
		description: '',
		checklist: [],
		materials: [],
		assignedUsers: [],
		safetyNotes: '',
		safetyDocUrl: '',
		dueDate: '',
		status: 'draft',
	});

	useEffect(() => {
		if (user) setSvc(new WorkOrderService(user));
	}, [user]);

	useEffect(() => {
		const load = async () => {
			if (!svc) return;
			setLoading(true);
			try {
				const rows = await svc.listByProject(projectId);
				setItems(rows);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [svc, projectId]);

	const openNew = () => {
		setEditing(null);
		setForm({
			projectId,
			title: '',
			description: '',
			checklist: [],
			materials: [],
			assignedUsers: [],
			safetyNotes: '',
			safetyDocUrl: '',
			dueDate: '',
			status: 'draft'
		});
		setShowEditor(true);
	};

	const save = async () => {
		if (!svc) return;
		if (editing) {
			await svc.update(editing.id, form);
		} else {
			await svc.create(form);
		}
		setShowEditor(false);
		const rows = await svc.listByProject(projectId);
		setItems(rows);
	};

	return (
		<div className="min-h-screen tradetrackr-gradient-blue">
			<AppHeader title="Arbeitsaufträge" showBackButton={true} onBack={onBack} onOpenMessaging={onOpenMessaging} />
			<div className="p-6">
				<div className="max-w-7xl mx-auto">
					<div className="flex items-center justify-between mb-4">
						<h1 className="text-2xl font-bold">Arbeitsaufträge</h1>
						<Button onClick={openNew} className="bg-[#058bc0] hover:bg-[#047aa0] text-white">Neu</Button>
					</div>
					<Card>
						<CardHeader>
							<CardTitle>Liste</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="border rounded">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>#</TableHead>
											<TableHead>Titel</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Fällig</TableHead>
											<TableHead>Aktionen</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.length === 0 ? (
											<TableRow><TableCell colSpan={5} className="text-center text-gray-500">Keine Aufträge</TableCell></TableRow>
										) : items.map((wo) => (
											<TableRow key={wo.id}>
												<TableCell>{wo.orderNumber || '-'}</TableCell>
												<TableCell>{wo.title}</TableCell>
												<TableCell><span className={`px-2 py-1 rounded text-xs ${statusColors[wo.status]}`}>{wo.status}</span></TableCell>
												<TableCell>{wo.dueDate ? new Date(wo.dueDate).toLocaleDateString('de-DE') : '-'}</TableCell>
												<TableCell>
													<Button variant="ghost" size="sm" onClick={() => { setEditing(wo); setForm({ ...wo } as any); setShowEditor(true); }}>Bearbeiten</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>

					{/* Editor */}
					<Dialog open={showEditor} onOpenChange={setShowEditor}>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle>{editing ? 'Auftrag bearbeiten' : 'Neuer Auftrag'}</DialogTitle>
							</DialogHeader>
							<div className="space-y-3">
								<div>
									<Label>Titel</Label>
									<Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
								</div>
								<div>
									<Label>Beschreibung</Label>
									<Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label>Status</Label>
										<Select value={form.status} onValueChange={v => setForm({ ...form, status: v as WorkOrderStatus })}>
											<SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
											<SelectContent>
												<SelectItem value="draft">Entwurf</SelectItem>
												<SelectItem value="assigned">Zugewiesen</SelectItem>
												<SelectItem value="in-progress">In Arbeit</SelectItem>
												<SelectItem value="completed">Abgeschlossen</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div>
										<Label>Fälligkeitsdatum</Label>
										<Input type="date" value={form.dueDate ? form.dueDate.substring(0,10) : ''} onChange={e => setForm({ ...form, dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
									</div>
								</div>

								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={() => setShowEditor(false)}>Abbrechen</Button>
									<Button onClick={save} className="bg-[#058bc0] hover:bg-[#047aa0] text-white">Speichern</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</div>
	);
};

export default ProjectWorkOrders;












