import React from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import tokenManager from "../../utils/tokenManager";
import {
  Plus, Trash2, RefreshCw, FlaskConical, Search, ChevronDown, ChevronUp,
  Key, Activity, BarChart3, Settings, Save, AlertCircle,
} from "lucide-react";

const API_BASE = "/api/v1/ai-admin";

const maskKey = (masked?: string | null) => masked || "••••••••";
const formatDate = (v: string | null | undefined) => v ? new Date(v).toLocaleString() : "—";
const formatLatency = (ms: number | null | undefined) => ms != null ? `${Math.round(ms)}ms` : "—";

const StatusBadge = ({ status }: { status: string | null | undefined }) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  if (status === "success" || status === "healthy") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">{status}</Badge>;
  if (status === "failed" || status === "error" || status === "critical") return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const SuperAdminAIKeyManager = () => {
  const [providers, setProviders] = React.useState<any[]>([]);
  const [keys, setKeys] = React.useState<any[]>([]);
  const [config, setConfig] = React.useState<any>(null);
  const [dashboard, setDashboard] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [showDashboard, setShowDashboard] = React.useState(true);
  const [showConfig, setShowConfig] = React.useState(false);
  const [expandedLogs, setExpandedLogs] = React.useState<Set<string>>(new Set());
  const [logsCache, setLogsCache] = React.useState<Record<string, any[]>>({});
  const [loadingLogs, setLoadingLogs] = React.useState<Set<string>>(new Set());
  const [testingKeys, setTestingKeys] = React.useState<Set<string>>(new Set());
  const [testResults, setTestResults] = React.useState<Record<string, any>>({});
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({ name: "", provider: "", api_key: "", base_url: "", key_type: "CENTRAL", company_id: "", max_requests_per_day: 1500, priority: 1, is_active: true });
  const [saving, setSaving] = React.useState(false);

  const fetchAll = React.useCallback(async () => {
    setLoading(true); setError(null);
    const headers = tokenManager.createAuthHeaders();
    try {
      const [provRes, keysRes, configRes, dashRes] = await Promise.all([
        fetch(`${API_BASE}/providers`, { headers }),
        fetch(`${API_BASE}/keys`, { headers }),
        fetch(`${API_BASE}/config`, { headers }),
        fetch(`${API_BASE}/dashboard`, { headers }),
      ]);
      if (provRes.ok) { const d = await provRes.json(); setProviders(d.data || d.providers || d || []); }
      if (keysRes.ok) { const d = await keysRes.json(); setKeys(d.data || d.keys || d || []); }
      if (configRes.ok) { const d = await configRes.json(); setConfig(d.data || d.config || d || null); }
      if (dashRes.ok) { const d = await dashRes.json(); setDashboard(d.data || d.stats || d || null); }
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleKey = async (keyId: string, current: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/keys/${keyId}/status`, { method: "PATCH", headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ is_active: !current }) });
      if (res.ok) setKeys((prev: any[]) => prev.map((k: any) => (k.id === keyId ? { ...k, is_active: !current } : k)));
    } catch {}
  };

  const testKey = async (keyId: string) => {
    setTestingKeys((prev) => new Set(prev).add(keyId));
    try {
      const res = await fetch(`${API_BASE}/keys/${keyId}/test`, { method: "POST", headers: tokenManager.createAuthHeaders() });
      if (res.ok) { const d = await res.json(); setTestResults((prev) => ({ ...prev, [keyId]: d.data || d || {} })); }
    } catch {}
    finally { setTestingKeys((prev) => { const n = new Set(prev); n.delete(keyId); return n; }); }
  };

  const deleteKey = async (keyId: string) => {
    try { await fetch(`${API_BASE}/keys/${keyId}`, { method: "DELETE", headers: tokenManager.createAuthHeaders() }); setKeys((prev: any[]) => prev.filter((k: any) => k.id !== keyId)); setDeleteConfirm(null); } catch {}
  };

  const toggleLogs = async (keyId: string) => {
    const next = new Set(expandedLogs);
    if (next.has(keyId)) { next.delete(keyId); }
    else {
      next.add(keyId);
      if (!logsCache[keyId]) {
        setLoadingLogs((prev) => new Set(prev).add(keyId));
        try {
          const res = await fetch(`${API_BASE}/logs?key_id=${keyId}&limit=50`, { headers: tokenManager.createAuthHeaders() });
          if (res.ok) { const d = await res.json(); setLogsCache((prev) => ({ ...prev, [keyId]: d.logs || d.data || d || [] })); }
        } catch {}
        finally { setLoadingLogs((prev) => { const n = new Set(prev); n.delete(keyId); return n; }); }
      }
    }
    setExpandedLogs(next);
  };

  const handleAddKey = async () => {
    if (!addForm.name || !addForm.provider || !addForm.api_key) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: addForm.name, provider: addForm.provider, api_key: addForm.api_key, key_type: addForm.key_type, max_requests_per_day: addForm.max_requests_per_day, priority: addForm.priority, is_active: addForm.is_active };
      if (addForm.base_url) body.base_url = addForm.base_url;
      if (addForm.key_type === "COMPANY" && addForm.company_id) body.company_id = addForm.company_id;
      const res = await fetch(`${API_BASE}/keys`, { method: "POST", headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
      if (res.ok) {
        const d = await res.json();
        const nk = d.data || d.key || d;
        if (nk) setKeys((prev: any[]) => [...prev, nk]);
        setAddDialogOpen(false);
        setAddForm({ name: "", provider: "", api_key: "", base_url: "", key_type: "CENTRAL", company_id: "", max_requests_per_day: 1500, priority: 1, is_active: true });
      } else { const err = await res.json(); setError(err.message || err.detail || "Failed to add key"); }
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add key"); }
    finally { setSaving(false); }
  };

  const filteredKeys = keys.filter((k: any) => {
    if (search) { const q = search.toLowerCase(); if (!k.name.toLowerCase().includes(q) && !k.provider.toLowerCase().includes(q)) return false; }
    if (providerFilter !== "all" && k.provider !== providerFilter) return false;
    return true;
  });

  const providerOptions = providers.length > 0 ? providers : [...new Set(keys.map((k: any) => k.provider))].map((name) => ({ name, display_name: name }));

  if (loading && keys.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-4 max-w-[1440px] mx-auto space-y-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6 text-indigo-500" /> AI Key Manager</h1>
          <p className="text-sm text-muted-foreground">Manage AI provider API keys</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Key</Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">Total Keys</p><p className="text-xl font-bold mt-1">{dashboard?.total_keys ?? keys.length}</p></div>
        <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">Providers</p><p className="text-xl font-bold mt-1">{providers.length}</p></div>
        <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">Keys</p><p className="text-xl font-bold mt-1">{keys.length}</p></div>
        <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold mt-1">{keys.filter((k: any) => k.is_active).length}</p></div>
      </div>

      {/* Dashboard Panel */}
      {dashboard && (
        <div className="rounded-xl border bg-card">
          <button className="flex items-center justify-between w-full px-4 py-3 text-left" onClick={() => setShowDashboard(!showDashboard)}>
            <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /><span className="font-semibold">Dashboard Stats</span></div>
            {showDashboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showDashboard && (
            <div className="px-4 pb-4 space-y-3">
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total Keys</p><p className="text-lg font-bold">{dashboard.total_keys}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Active Keys</p><p className="text-lg font-bold">{dashboard.active_keys}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Requests Today</p><p className="text-lg font-bold">{dashboard.requests_today}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Failures Today</p><p className="text-lg font-bold text-red-600">{dashboard.failures_today}</p></div>
              </div>
              {dashboard.last_24h_success_rate != null && (
                <div>
                  <p className="text-sm font-medium mb-1">Last 24h Success Rate</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(dashboard.last_24h_success_rate * 100, 100)}%`, backgroundColor: dashboard.last_24h_success_rate > 0.95 ? "#22c55e" : dashboard.last_24h_success_rate > 0.8 ? "#eab308" : "#ef4444" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{(dashboard.last_24h_success_rate * 100).toFixed(1)}% success rate</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Keys Table */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
            <div className="flex gap-2 flex-1 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or provider..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-8" />
              </div>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All providers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providerOptions.map((p: any) => <SelectItem key={p.name} value={p.name}>{p.display_name || p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">{filteredKeys.length} / {keys.length} keys</p>
          </div>

          {filteredKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No API keys found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead className="hidden md:table-cell">Base URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Last Test</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map((key: any) => (
                    <React.Fragment key={key.id}>
                      <TableRow>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell><Badge variant="outline">{key.provider}</Badge></TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{maskKey(key.api_key_masked)}</code></TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{key.base_url || "Default"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={key.is_active} onCheckedChange={() => toggleKey(key.id, key.is_active)} />
                            <span className={`text-xs ${key.is_active ? "text-green-600" : "text-red-600"}`}>{key.is_active ? "Active" : "Inactive"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <StatusBadge status={key.last_test_status} />
                            {key.last_tested_at && <span className="text-xs text-muted-foreground block mt-0.5">{formatDate(key.last_tested_at)}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleLogs(key.id)} title="View logs"><Activity className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => testKey(key.id)} disabled={testingKeys.has(key.id)} title="Test key">
                              {testingKeys.has(key.id) ? <LoadingSpinner size="sm" /> : <FlaskConical className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(key.id)} title="Delete key"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {testResults[key.id] && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="py-2">
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-medium">Test:</span>
                              <StatusBadge status={testResults[key.id].status} />
                              {testResults[key.id].latency_ms != null && <span className="text-muted-foreground">Latency: {formatLatency(testResults[key.id].latency_ms)}</span>}
                              {testResults[key.id].error && <span className="text-red-600 text-xs max-w-md truncate">Error: {testResults[key.id].error}</span>}
                              <span className="text-xs text-muted-foreground">{formatDate(testResults[key.id].tested_at)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {expandedLogs.has(key.id) && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-4 py-3 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-4 w-4 text-indigo-500" />
                                <span className="text-sm font-medium">Logs for {key.name}</span>
                              </div>
                              {loadingLogs.has(key.id) ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><LoadingSpinner size="sm" /> Loading logs...</div>
                              ) : (logsCache[key.id] || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">No logs found</p>
                              ) : (
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                  {(logsCache[key.id] || []).slice(0, 50).map((log: any) => (
                                    <div key={log.id} className="flex items-start gap-2 text-xs p-1.5 rounded bg-background border">
                                      <span className="text-muted-foreground shrink-0 w-16">{formatLatency(log.latency_ms)}</span>
                                      <StatusBadge status={log.status} />
                                      <span className="text-muted-foreground truncate flex-1">{log.model || "—"} / {log.request_type || "—"}</span>
                                      {log.error_message && <span className="text-red-500 truncate max-w-[200px]" title={log.error_message}>{log.error_message}</span>}
                                      {log.created_at && <span className="text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleString()}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Dialog open onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete API Key</DialogTitle><DialogDescription>Are you sure you want to delete this API key? This action cannot be undone.</DialogDescription></DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteKey(deleteConfirm)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Key dialog */}
      {addDialogOpen && (
        <Dialog open onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add API Key</DialogTitle><DialogDescription>Add a new AI provider API key</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Name *</Label><Input value={addForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, name: e.target.value })} placeholder="My API Key" /></div>
              <div className="space-y-2">
                <Label>Provider *</Label>
                <Select value={addForm.provider} onValueChange={(v: string) => { const p = providers.find((pr: any) => pr.name === v); setAddForm({ ...addForm, provider: v, base_url: p?.base_url || addForm.base_url }); }}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>{providerOptions.map((p: any) => <SelectItem key={p.name} value={p.name}>{p.display_name || p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>API Key *</Label><Input type="password" value={addForm.api_key} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, api_key: e.target.value })} placeholder="sk-..." /></div>
              <div className="space-y-2"><Label>Base URL</Label><Input value={addForm.base_url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, base_url: e.target.value })} placeholder="https://api.example.com/v1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Key Type</Label>
                  <Select value={addForm.key_type} onValueChange={(v: string) => setAddForm({ ...addForm, key_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="CENTRAL">CENTRAL</SelectItem><SelectItem value="COMPANY">COMPANY</SelectItem></SelectContent>
                  </Select>
                </div>
                {addForm.key_type === "COMPANY" && <div className="space-y-2"><Label>Company ID</Label><Input value={addForm.company_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, company_id: e.target.value })} placeholder="Company ID" /></div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Max Requests / Day</Label><Input type="number" value={addForm.max_requests_per_day} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, max_requests_per_day: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Priority</Label><Input type="number" value={addForm.priority} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, priority: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={addForm.is_active} onCheckedChange={(v: boolean) => setAddForm({ ...addForm, is_active: v })} id="add-key-active" />
                <Label htmlFor="add-key-active">Active on creation</Label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddKey} disabled={saving || !addForm.name || !addForm.provider || !addForm.api_key}>
                {saving ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4 mr-1" />} Save Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
};

export default SuperAdminAIKeyManager;
