import React, { useEffect, useMemo, useState } from 'react';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { createTemplate, exportReportFile, getTemplate, runReport, updateTemplate } from '@/services/reportService';
import type { ExecuteReportResponse, ReportTemplate } from '@/types/reporting';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Download, ArrowLeft, FileText } from 'lucide-react';

interface ReportsBuilderProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  templateId?: string | null;
  onOpenMessaging?: () => void;
}

const DATASETS = ['timeEntries', 'materials', 'invoices', 'projects', 'personnel'] as const;

const ReportsBuilder: React.FC<ReportsBuilderProps> = ({ onBack, onNavigate, templateId, onOpenMessaging }) => {
  const { user } = useAuth();
  const [tmpl, setTmpl] = useState<ReportTemplate>({
    name: '',
    createdBy: '',
    concernID: '',
    dataset: 'timeEntries',
    fields: [],
    filters: [],
    visualization: 'table',
    exportFormats: ['csv'],
    schedule: null,
  });
  const [preview, setPreview] = useState<ExecuteReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [personId, setPersonId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!user) return;
      if (templateId) {
        const t = await getTemplate(templateId);
        if (t) setTmpl(t);
      } else {
        setTmpl((prev) => ({ ...prev, createdBy: user.uid, concernID: (user as any).concernID }));
      }
    })();
  }, [user, templateId]);

  const availableFields = useMemo(() => {
    // minimal field registry
    const registry: Record<string, string[]> = {
      timeEntries: ['date', 'projectId', 'userId', 'hours', 'status'],
      materials: ['date', 'projectId', 'material', 'quantity', 'cost'],
      invoices: ['invoiceNumber', 'projectId', 'date', 'gross', 'status'],
      projects: ['number', 'name', 'status', 'customerId'],
      personnel: ['userId', 'displayName', 'role'],
    };
    return registry[tmpl.dataset] || [];
  }, [tmpl.dataset]);

  // Build filters from UI controls
  useEffect(() => {
    const filters: any[] = [];
    if (dateFrom || dateTo) {
      filters.push({ field: 'date', op: 'between', value: dateFrom ? new Date(dateFrom).toISOString() : undefined, valueTo: dateTo ? new Date(dateTo).toISOString() : undefined });
    }
    if (projectId) filters.push({ field: 'projectId', op: '==', value: projectId });
    if (personId) filters.push({ field: tmpl.dataset === 'personnel' ? 'userId' : 'userId', op: '==', value: personId });
    if (status && status !== 'all') filters.push({ field: 'status', op: '==', value: status });
    // preserve first simple contains filter if present as free text search
    const contains = tmpl.filters.find((f) => (f as any).op === 'contains');
    setTmpl((prev) => ({ ...prev, filters: contains ? [contains, ...filters] : filters }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, projectId, personId, status]);

  const handlePreview = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await runReport({ template: tmpl, preview: true, limit: 200 });
      setPreview(res);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      if (tmpl.id) {
        await updateTemplate(tmpl.id, tmpl);
      } else {
        const id = await createTemplate({ ...tmpl, createdBy: user.uid, concernID: (user as any).concernID });
        setTmpl((t) => ({ ...t, id }));
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title={templateId ? "Report-Vorlage bearbeiten" : "Neue Report-Vorlage"} 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-0">
                  {templateId ? "Report-Vorlage bearbeiten" : "Neue Report-Vorlage"}
                </h1>
                <p className="text-gray-600 mb-0">
                  Konfigurieren Sie Dataset, Felder, Filter und Visualisierung
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onNavigate('reports-list')}
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Liste
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          </div>

          {/* Builder Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Grunddaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={tmpl.name}
                    onChange={(e) => setTmpl({ ...tmpl, name: e.target.value })}
                    placeholder="Vorlagenname"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataset">Dataset</Label>
                  <Select value={tmpl.dataset} onValueChange={(v) => setTmpl({ ...tmpl, dataset: v as any, fields: [] })}>
                    <SelectTrigger id="dataset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATASETS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Felder</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableFields.map((f) => {
                      const active = tmpl.fields.includes(f);
                      return (
                        <Badge
                          key={f}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setTmpl((t) => ({
                              ...t,
                              fields: active ? t.fields.filter((x) => x !== f) : [...t.fields, f],
                            }));
                          }}
                        >
                          {f}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Filter & Aggregation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Filter</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="dateFrom" className="text-xs">Von</Label>
                      <Input type="date" id="dateFrom" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="dateTo" className="text-xs">Bis</Label>
                      <Input type="date" id="dateTo" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                    <Input placeholder="Projekt-ID" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
                    <Input placeholder="Mitarbeiter-ID" value={personId} onChange={(e) => setPersonId(e.target.value)} />
                    <Select value={status || undefined} onValueChange={(v) => setStatus(v || '')}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="open">open</SelectItem>
                        <SelectItem value="approved">approved</SelectItem>
                        <SelectItem value="pending">pending</SelectItem>
                        <SelectItem value="paid">paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Aggregation</Label>
                  <Select value={tmpl.aggregation?.op || undefined} onValueChange={(v) => setTmpl({ ...tmpl, aggregation: v === 'none' ? undefined : v ? { op: v as any, field: tmpl.aggregation?.field } : undefined })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Keine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine</SelectItem>
                      <SelectItem value="count">count</SelectItem>
                      <SelectItem value="sum">sum</SelectItem>
                      <SelectItem value="avg">avg</SelectItem>
                      <SelectItem value="groupBy">groupBy</SelectItem>
                    </SelectContent>
                  </Select>
                  {(tmpl.aggregation?.op === 'sum' || tmpl.aggregation?.op === 'avg') && (
                    <Select value={tmpl.aggregation.field || ''} onValueChange={(v) => setTmpl({ ...tmpl, aggregation: { ...(tmpl.aggregation as any), field: v } })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Feld wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {tmpl.aggregation?.op === 'groupBy' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Group by Feld</Label>
                      <Select value={(tmpl.aggregation as any)?.groupBy?.[0] || ''} onValueChange={(v) => setTmpl({ ...tmpl, aggregation: { op: 'groupBy', groupBy: [v] } as any })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Feld wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ausgabe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="visualization">Visualisierung</Label>
                  <Select value={tmpl.visualization} onValueChange={(v) => setTmpl({ ...tmpl, visualization: v as any })}>
                    <SelectTrigger id="visualization">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Tabelle</SelectItem>
                      <SelectItem value="bar">Balkendiagramm</SelectItem>
                      <SelectItem value="line">Liniendiagramm</SelectItem>
                      <SelectItem value="pie">Kreisdiagramm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Exportformate</Label>
                  <div className="flex flex-wrap gap-3">
                    {(['csv', 'xlsx', 'pdf'] as const).map((fmt) => (
                      <div key={fmt} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`fmt-${fmt}`}
                          checked={tmpl.exportFormats?.includes(fmt)}
                          onChange={(e) => {
                            setTmpl((t) => {
                              const set = new Set(t.exportFormats || []);
                              if (e.target.checked) set.add(fmt); else set.delete(fmt);
                              return { ...t, exportFormats: Array.from(set) as any };
                            });
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`fmt-${fmt}`} className="text-sm font-normal cursor-pointer">{fmt.toUpperCase()}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handlePreview}
                  disabled={loading}
                  className="w-full bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {loading ? 'Vorschau...' : 'Vorschau anzeigen'}
                </Button>
                {tmpl.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={async () => {
                        const f = await exportReportFile(tmpl, 'csv');
                        window.open(f.url, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={async () => {
                        const f = await exportReportFile(tmpl, 'pdf');
                        window.open(f.url, '_blank');
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Card */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle>Vorschau ({preview.rows.length} Zeilen)</CardTitle>
              </CardHeader>
              <CardContent>
                {tmpl.visualization === 'table' && (
                  <div className="overflow-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {Object.keys(preview.rows[0] || {}).map((c) => (
                            <th key={c} className="px-3 py-2 text-left border-b font-semibold text-gray-700">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 50).map((r, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {Object.keys(preview.rows[0] || {}).map((c) => {
                              const v = (r as any)[c];
                              const isCurrency = ['gross', 'cost', 'amount', 'total', 'sum'].some((k) =>
                                c.toLowerCase().includes(k)
                              );
                              const formatted =
                                typeof v === 'number' && isCurrency
                                  ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)
                                  : v;
                              return (
                                <td key={c} className="px-3 py-2 border-b text-gray-700">
                                  {formatted as any}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tmpl.visualization !== 'table' && (
                  <div className="border rounded p-4 bg-white">
                    <ChartContainer config={{ value: { label: 'Wert', color: '#058bc0' } }}>
                      {tmpl.visualization === 'bar' && (
                        <BarChart data={preview.rows}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={Object.keys(preview.rows[0] || { x: 'x' })[0]} />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey={Object.keys(preview.rows[0] || { value: 'value' })[1] || 'value'} fill="#058bc0" />
                          <ChartLegend content={<ChartLegendContent />} />
                        </BarChart>
                      )}
                      {tmpl.visualization === 'line' && (
                        <LineChart data={preview.rows}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={Object.keys(preview.rows[0] || { x: 'x' })[0]} />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey={Object.keys(preview.rows[0] || { value: 'value' })[1] || 'value'} stroke="#058bc0" strokeWidth={2} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </LineChart>
                      )}
                      {tmpl.visualization === 'pie' && (
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={preview.rows}
                            dataKey={Object.keys(preview.rows[0] || { value: 'value' })[1] || 'value'}
                            nameKey={Object.keys(preview.rows[0] || { name: 'name' })[0]}
                            outerRadius={100}
                            label
                          >
                            {preview.rows.slice(0, 12).map((_, i) => (
                              <Cell key={i} fill={`hsl(${(i * 40) % 360} 70% 55%)`} />
                            ))}
                          </Pie>
                          <ChartLegend content={<ChartLegendContent />} />
                        </PieChart>
                      )}
                    </ChartContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsBuilder;


