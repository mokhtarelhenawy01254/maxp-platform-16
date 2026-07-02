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
  Key, Activity, AlertCircle,
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

const Inner = () => {
  const [providers, setProviders] = React.useState<any[]>([]);
  const [keys, setKeys] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [expandedLogs, setExpandedLogs] = React.useState<Set<string>>(new Set());
  const [logsCache, setLogsCache] = React.useState<Record<string, any[]>>({});
  const [loadingLogs, setLoadingLogs] = React.useState<Set<string>>(new Set());
  const [testingKeys, setTestingKeys] = React.useState<Set<string>>(new Set());
  const [testResults, setTestResults] = React.useState<Record<string, any>>({});
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({ name: "", provider: "", api_key: "", base_url: "", key_type: "CENTRAL", company_id: "", max_requests_per_day: 1500, priority: 1, is_active: true });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const headers = tokenManager.createAuthHeaders();
    setLoading(true);
    Promise.all([
      fetch(API_BASE + "/providers", { headers }),
      fetch(API_BASE + "/keys", { headers }),
    ]).then(async ([a,b]) => {
      if (a.ok) { const d = await a.json(); setProviders(d.data || d.providers || d || []); }
      if (b.ok) { const d = await b.json(); setKeys(d.data || d.keys || d || []); }
    }).catch((e: any) => setError(e?.message || "fetch error"))
    .finally(() => setLoading(false));
  }, []);

  const toggleKey = async (keyId: string, current: boolean) => {
    try {
      const res = await fetch(API_BASE + "/keys/" + keyId + "/status", { method: "PATCH", headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ is_active: !current }) });
      if (res.ok) setKeys((prev: any[]) => prev.map((k: any) => (k.id === keyId ? { ...k, is_active: !current } : k)));
    } catch {}
  };

  const testKey = async (keyId: string) => {
    setTestingKeys((prev) => new Set(prev).add(keyId));
    try {
      const res = await fetch(API_BASE + "/keys/" + keyId + "/test", { method: "POST", headers: tokenManager.createAuthHeaders() });
      if (res.ok) { const d = await res.json(); setTestResults((prev) => ({ ...prev, [keyId]: d.data || d || {} })); }
    } catch {}
    finally { setTestingKeys((prev) => { const n = new Set(prev); n.delete(keyId); return n; }); }
  };

  const deleteKey = async (keyId: string) => {
    try { await fetch(API_BASE + "/keys/" + keyId, { method: "DELETE", headers: tokenManager.createAuthHeaders() }); setKeys((prev: any[]) => prev.filter((k: any) => k.id !== keyId)); setDeleteConfirm(null); } catch {}
  };

  const toggleLogs = async (keyId: string) => {
    const next = new Set(expandedLogs);
    if (next.has(keyId)) { next.delete(keyId); } else {
      next.add(keyId);
      if (!logsCache[keyId]) {
        setLoadingLogs((prev) => new Set(prev).add(keyId));
        try { const res = await fetch(API_BASE + "/logs?key_id=" + keyId + "&limit=50", { headers: tokenManager.createAuthHeaders() }); if (res.ok) { const d = await res.json(); setLogsCache((prev) => ({ ...prev, [keyId]: d.logs || d.data || d || [] })); } } catch {}
        finally { setLoadingLogs((prev) => { const n = new Set(prev); n.delete(keyId); return n; }); }
      }
    }
    setExpandedLogs(next);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6 text-indigo-500" /> AI Key Manager</h1>
          <p className="text-sm text-muted-foreground">Manage AI provider API keys</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Key</Button>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">Providers</p><p className="text-xl font-bold mt-1">{providers.length}</p></div>
        <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">Keys</p><p className="text-xl font-bold mt-1">{keys.length}</p></div>
        <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold mt-1">{keys.filter((k: any) => k.is_active).length}</p></div>
      </div>
      <div className="rounded-xl border bg-card">
        <div className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
            <div className="flex gap-2 flex-1 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-8" />
              </div>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {providerOptions.map((p: any) => <SelectItem key={p.name} value={p.name}>{p.display_name || p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filteredKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Key className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No keys</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Status</TableHead>
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
                        <TableCell>
                          <Switch checked={key.is_active} onCheckedChange={() => toggleKey(key.id, key.is_active)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleLogs(key.id)} title="Logs"><Activity className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => testKey(key.id)} disabled={testingKeys.has(key.id)} title="Test">
                            {testingKeys.has(key.id) ? <LoadingSpinner size="sm" /> : <FlaskConical className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteConfirm(key.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                      {testResults[key.id] && (
                        <TableRow className="bg-muted/30"><TableCell colSpan={5} className="py-2">
                          <span className="text-sm font-medium">Test: </span><StatusBadge status={testResults[key.id].status} />
                          {testResults[key.id].latency_ms != null && <span className="ml-2 text-muted-foreground text-sm">{formatLatency(testResults[key.id].latency_ms)}</span>}
                          {testResults[key.id].error && <span className="ml-2 text-red-600 text-xs">{testResults[key.id].error}</span>}
                        </TableCell></TableRow>
                      )}
                      {expandedLogs.has(key.id) && (
                        <TableRow className="bg-muted/20"><TableCell colSpan={5} className="p-3 border-t">
                          {loadingLogs.has(key.id) ? <LoadingSpinner size="sm" /> :
                          ((logsCache[key.id] || []).length === 0 ? <p className="text-sm text-muted-foreground">No logs</p> :
                          (logsCache[key.id] || []).slice(0, 20).map((log: any) => (
                            <div key={log.id} className="text-xs p-1 flex gap-2 border-b">
                              <StatusBadge status={log.status} />
                              <span className="text-muted-foreground">{log.model || "—"}</span>
                              {log.error_message && <span className="text-red-500 truncate">{log.error_message}</span>}
                            </div>
                          )))}
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
      {deleteConfirm && (
        <Dialog open onOpenChange={(o: boolean) => !o && setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Key</DialogTitle><DialogDescription>Are you sure?</DialogDescription></DialogHeader>
            <DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteKey(deleteConfirm)}>Delete</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {addDialogOpen && (
        <Dialog open onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Key</DialogTitle><DialogDescription>Add a new API key</DialogDescription></DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Name <Input value={addForm.name} onChange={(e: any) => setAddForm({...addForm, name: e.target.value})} /></Label>
              <Label>Provider <Select value={addForm.provider} onValueChange={(v: string) => setAddForm({...addForm, provider: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{providerOptions.map((p: any) => <SelectItem key={p.name} value={p.name}>{p.display_name || p.name}</SelectItem>)}</SelectContent>
              </Select></Label>
              <Label>API Key <Input type="password" value={addForm.api_key} onChange={(e: any) => setAddForm({...addForm, api_key: e.target.value})} /></Label>
              <Button onClick={async () => {
                if (!addForm.name || !addForm.provider || !addForm.api_key) return;
                setSaving(true);
                try {
                  const res = await fetch(API_BASE + "/keys", { method: "POST", headers: tokenManager.createAuthHeaders({"Content-Type":"application/json"}), body: JSON.stringify(addForm) });
                  if (res.ok) { const d = await res.json(); const nk = d.data || d.key || d; if (nk) setKeys((p: any[]) => [...p, nk]); setAddDialogOpen(false); }
                  else { const e2 = await res.json(); setError(e2.message || "Failed"); }
                } catch (e2: any) { setError(e2?.message || "Failed"); }
                finally { setSaving(false); }
              }} disabled={saving}>{saving ? <LoadingSpinner size="sm" /> : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const SuperAdminAIKeyManager = () => {
  try {
    return React.createElement("div", null,
      React.createElement(Inner, null)
    );
  } catch (e: any) {
    return React.createElement("pre", { className: "p-4 text-red-600" }, "Render error: " + (e?.message || String(e)) + "\n" + (e?.stack || ""));
  }
};

export default SuperAdminAIKeyManager;
