import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { ArrowLeft, Filter, RefreshCw, Key } from "lucide-react";

const PROVIDERS = ["", "GOOGLE", "GROQ", "OPENROUTER", "NVIDIA", "OPENAI", "ANTHROPIC", "DEEPSEEK", "HUGGINGFACE", "OLLAMA", "CEREBRAS", "GITHUB", "SAMBANOVA", "MISTRAL"];
const STATUSES = ["", "success", "failed", "warning", "info"];
const SCOPES = ["", "runtime", "admin", "diagnostic"];
const DEFAULT_FILTERS = { provider: "", keyId: "", companyId: "", action: "", status: "", scope: "", sinceHours: "24", limit: "200" };

const statusVariant = (s) => s === "success" ? "default" : s === "failed" ? "destructive" : s === "warning" ? "secondary" : "outline";
const formatDate = (v) => v ? new Date(v).toLocaleString() : "Never";
const formatMetadata = (m) => { if (!m || Object.keys(m).length === 0) return ""; try { return JSON.stringify(m, null, 2); } catch { return String(m); } };

const SummaryCard = ({ label, value }) => (
  <div className="rounded-xl border bg-card p-3 min-h-[86px]">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-bold mt-0.5">{value}</p>
  </div>
);

const SuperAdminAIProviderLogs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo(() => {
    const f = { ...DEFAULT_FILTERS };
    Object.keys(f).forEach(k => { const v = searchParams.get(k); if (v) f[k] = v; });
    return f;
  }, [searchParams]);
  const [filters, setFilters] = useState(initialFilters);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthHeaders = useCallback(() => tokenManager.createAuthHeaders({ "Content-Type": "application/json" }), []);

  const loadLogs = useCallback(async (source) => {
    setLoading(true); setError(null);
    try {
      const query = new URLSearchParams(Object.entries(source).filter(([, v]) => String(v || "").trim()));
      const response = await fetch(buildApiUrl(`super-admin/ai/provider-logs?${query}`), { headers: getAuthHeaders() });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Failed to load provider logs");
      setLogs(payload.data?.logs || []); setSummary(payload.data?.summary || null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Failed to load provider logs"); }
    finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { setFilters(initialFilters); loadLogs(initialFilters); }, [initialFilters, loadLogs]);

  const applyFilters = () => { const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => String(v || "").trim())); setSearchParams(q); loadLogs(filters); };
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setSearchParams(new URLSearchParams()); loadLogs(DEFAULT_FILTERS); };

  const summaryByProvider = summary?.byProvider ? Object.entries(summary.byProvider).slice(0, 4) : [];
  const summaryByAction = summary?.byAction ? Object.entries(summary.byAction).slice(0, 5) : [];

  return (
    <div className="p-3 max-w-[1500px] mx-auto">
      <div className="flex flex-col lg:flex-row justify-between gap-2 mb-3">
        <div className="space-y-1">
          <Button variant="link" asChild className="p-0 h-auto"><RouterLink to="/super-admin/ai-providers"><ArrowLeft className="size-4" /> Back to AI providers</RouterLink></Button>
          <h1 className="text-2xl font-bold">AI provider runtime logs</h1>
          <p className="text-sm text-muted-foreground">سجل فعلي لاختيار المفاتيح، نجاح التوليد، فشل الـ fallback، واختبارات المفاتيح.</p>
        </div>
        <Button variant="outline" onClick={() => loadLogs(filters)} disabled={loading}><RefreshCw className="size-4" /> Refresh</Button>
      </div>

      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="rounded-xl border bg-card p-3 mb-2">
        <div className="flex flex-col md:flex-row gap-2 flex-wrap items-start">
          <Select value={filters.provider} onValueChange={v => setFilters(p => ({ ...p, provider: v }))}><SelectTrigger className="min-w-[170px]"><SelectValue placeholder="Provider" /></SelectTrigger><SelectContent>{PROVIDERS.map(p => <SelectItem key={p || "all"} value={p}>{p || "All providers"}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Key ID" value={filters.keyId} onChange={e => setFilters(p => ({ ...p, keyId: e.target.value }))} className="min-w-[220px]" />
          <Input placeholder="Company ID" value={filters.companyId} onChange={e => setFilters(p => ({ ...p, companyId: e.target.value }))} className="min-w-[220px]" />
          <Input placeholder="Action" value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))} className="min-w-[200px]" />
          <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v }))}><SelectTrigger className="min-w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s || "all"} value={s}>{s || "All statuses"}</SelectItem>)}</SelectContent></Select>
          <Select value={filters.scope} onValueChange={v => setFilters(p => ({ ...p, scope: v }))}><SelectTrigger className="min-w-[150px]"><SelectValue placeholder="Scope" /></SelectTrigger><SelectContent>{SCOPES.map(s => <SelectItem key={s || "all"} value={s}>{s || "All scopes"}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Since hours" value={filters.sinceHours} onChange={e => setFilters(p => ({ ...p, sinceHours: e.target.value }))} className="w-[130px]" />
          <Input placeholder="Limit" value={filters.limit} onChange={e => setFilters(p => ({ ...p, limit: e.target.value }))} className="w-[110px]" />
          <Button onClick={applyFilters} disabled={loading}><Filter className="size-4" /> Apply</Button>
          <Button variant="ghost" onClick={resetFilters} disabled={loading}>Reset</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
        <SummaryCard label="Total events" value={summary?.total ?? 0} />
        <SummaryCard label="Success" value={summary?.success ?? 0} />
        <SummaryCard label="Failed" value={summary?.failed ?? 0} />
        <SummaryCard label="Warnings" value={summary?.warning ?? 0} />
        <SummaryCard label="Avg latency" value={Number.isFinite(Number(summary?.avgLatencyMs)) ? `${summary?.avgLatencyMs}ms` : "No samples"} />
      </div>

      <div className="rounded-xl border bg-card">
        <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Provider</TableHead><TableHead>Key</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead><TableHead>Model</TableHead><TableHead>Latency</TableHead><TableHead>Scope</TableHead><TableHead>Message</TableHead><TableHead>Metadata</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={10} className="text-center py-6"><LoadingSpinner /></TableCell></TableRow> : logs.length === 0 ? <TableRow><TableCell colSpan={10}><Alert><AlertDescription>No provider logs match the current filters.</AlertDescription></Alert></TableCell></TableRow> : logs.map(log => <TableRow key={log.id}><TableCell className="whitespace-nowrap">{formatDate(log.createdAt)}</TableCell><TableCell><Badge variant="outline">{log.provider}</Badge></TableCell><TableCell className="min-w-[180px]">{log.keyId ? <Button variant="link" asChild className="p-0 h-auto text-xs"><RouterLink to={`/super-admin/ai-providers/keys/${log.keyId}`}><Key className="size-3" /> {log.keyName || log.keyId}</RouterLink></Button> : "—"}</TableCell><TableCell>{log.action}</TableCell><TableCell><Badge variant={statusVariant(log.status)}>{log.status}</Badge></TableCell><TableCell>{log.model || "—"}</TableCell><TableCell>{Number.isFinite(Number(log.latencyMs)) ? `${log.latencyMs}ms` : "—"}</TableCell><TableCell>{log.scope || "runtime"}</TableCell><TableCell className="max-w-[340px]"><p className="text-sm truncate" title={log.message || ""}>{log.message || "—"}</p></TableCell><TableCell className="max-w-[320px]"><pre className="m-0 max-h-[120px] overflow-auto whitespace-pre-wrap text-xs font-mono">{formatMetadata(log.metadata) || "—"}</pre></TableCell></TableRow>)}</TableBody></Table>
      </div>
    </div>
  );
};

export default SuperAdminAIProviderLogs;