import React, { useState, useEffect, useCallback } from "react";
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
  Plus, Trash2, RefreshCw, FlaskConical, Search, ChevronDown, ChevronRight, Key, Activity, BarChart3, Settings, Save, AlertCircle, ChevronUp,
} from "lucide-react";

const API_BASE = "/api/v1/ai-admin";

type ProviderRead = { name: string; display_name: string; adapter_type: string; base_url: string | null; default_model: string | null; is_active: boolean };
type AiKeyRead = { id: string; name: string; provider: string; base_url: string | null; is_active: boolean; key_type: string; company_id: string | null; max_requests_per_day: number | null; current_usage: number | null; priority: number | null; last_used_at: string | null; last_tested_at: string | null; last_test_status: string | null; api_key_masked: string | null; created_at: string | null; updated_at: string | null };
type GlobalConfigRead = { id: string; default_provider: string; enable_failover: boolean; provider_priority: string[]; settings: Record<string, unknown>; updated_at: string | null };
type DashboardStats = { total_keys: number; active_keys: number; keys_by_provider: Record<string, number>; keys_by_company: Record<string, number>; requests_today: number; failures_today: number; last_24h_success_rate: number | null };
type TestResult = { id: string; status: string; latency_ms: number | null; error: string | null; tested_at: string };
type LogEntry = { id: string; key_id: string; provider: string; model: string | null; request_type: string | null; status: string; latency_ms: number | null; error_message: string | null; created_at: string };

const maskKey = (masked?: string | null) => masked || "••••••••";
const formatDate = (v: string | null | undefined) => v ? new Date(v).toLocaleString() : "—";
const formatLatency = (ms: number | null | undefined) => ms != null ? `${Math.round(ms)}ms` : "—";

const getStatusBadge = (status: string | null | undefined) => {
  if (!status) return React.createElement(Badge, { variant: "outline", key: "s" }, "Unknown");
  if (status === "success" || status === "healthy") return React.createElement(Badge, { key: "s", className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" }, status);
  if (status === "failed" || status === "error" || status === "critical") return React.createElement(Badge, { key: "s", variant: "destructive" }, status);
  return React.createElement(Badge, { key: "s", variant: "secondary" }, status);
};

const SuperAdminAIKeyManager = () => {
  const getAuthHeaders = useCallback((extra: Record<string, string> = {}) => tokenManager.createAuthHeaders(extra), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderRead[]>([]);
  const [keys, setKeys] = useState<AiKeyRead[]>([]);
  const [config, setConfig] = useState<GlobalConfigRead | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [showDashboard, setShowDashboard] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [logsCache, setLogsCache] = useState<Record<string, LogEntry[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<Set<string>>(new Set());
  const [testingKeys, setTestingKeys] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", provider: "", api_key: "", base_url: "", key_type: "CENTRAL", company_id: "", max_requests_per_day: 1500, priority: 1, is_active: true });
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    const headers = getAuthHeaders();
    try {
      const [provRes, keysRes, configRes, dashRes] = await Promise.all([
        fetch(`${API_BASE}/providers`, { headers }), fetch(`${API_BASE}/keys`, { headers }),
        fetch(`${API_BASE}/config`, { headers }), fetch(`${API_BASE}/dashboard`, { headers }),
      ]);
      if (provRes.ok) { const d = await provRes.json(); setProviders(d.data || d.providers || d || []); }
      if (keysRes.ok) { const d = await keysRes.json(); setKeys(d.data || d.keys || d || []); }
      if (configRes.ok) { const d = await configRes.json(); setConfig(d.data || d.config || d || null); }
      if (dashRes.ok) { const d = await dashRes.json(); setDashboard(d.data || d.stats || d || null); }
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load data"); }
    finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/keys/${keyId}/status`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ is_active: !currentActive }) });
      if (res.ok) setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, is_active: !currentActive } : k)));
    } catch { /* ignore */ }
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKeys((prev) => new Set(prev).add(keyId));
    try {
      const res = await fetch(`${API_BASE}/keys/${keyId}/test`, { method: "POST", headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setTestResults((prev) => ({ ...prev, [keyId]: data.data || data || {} })); }
    } catch { /* ignore */ }
    finally { setTestingKeys((prev) => { const next = new Set(prev); next.delete(keyId); return next; }); }
  };

  const handleDeleteKey = async (keyId: string) => {
    try { const res = await fetch(`${API_BASE}/keys/${keyId}`, { method: "DELETE", headers: getAuthHeaders() }); if (res.ok) { setKeys((prev) => prev.filter((k) => k.id !== keyId)); setDeleteConfirm(null); } }
    catch { /* ignore */ }
  };

  const toggleLogs = async (keyId: string) => {
    const next = new Set(expandedLogs);
    if (next.has(keyId)) { next.delete(keyId); }
    else {
      next.add(keyId);
      if (!logsCache[keyId]) {
        setLoadingLogs((prev) => new Set(prev).add(keyId));
        try { const res = await fetch(`${API_BASE}/logs?key_id=${keyId}&limit=50`, { headers: getAuthHeaders() }); if (res.ok) { const data = await res.json(); setLogsCache((prev) => ({ ...prev, [keyId]: data.logs || data.data || data || [] })); } }
        catch { /* ignore */ }
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
      const res = await fetch(`${API_BASE}/keys`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        const newKey = data.data || data.key || data;
        if (newKey) setKeys((prev) => [...prev, newKey]);
        setAddDialogOpen(false);
        setAddForm({ name: "", provider: "", api_key: "", base_url: "", key_type: "CENTRAL", company_id: "", max_requests_per_day: 1500, priority: 1, is_active: true });
      } else { const err = await res.json(); setError(err.message || err.detail || "Failed to add key"); }
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add key"); }
    finally { setSaving(false); }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/config`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ default_provider: config.default_provider, enable_failover: config.enable_failover, provider_priority: config.provider_priority }) });
      if (res.ok) { const data = await res.json(); setConfig(data.config || data.data || data); }
    } catch { /* ignore */ }
    finally { setSavingConfig(false); }
  };

  const filteredKeys = keys.filter((k) => {
    if (search) { const q = search.toLowerCase(); if (!k.name.toLowerCase().includes(q) && !k.provider.toLowerCase().includes(q)) return false; }
    if (providerFilter !== "all" && k.provider !== providerFilter) return false;
    return true;
  });

  const providerOptions = providers.length > 0 ? providers : [...new Set(keys.map((k) => k.provider))].map((name) => ({ name, display_name: name }));

  if (loading && keys.length === 0) {
    return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
      React.createElement(LoadingSpinner, { size: "lg" })
    );
  }

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto space-y-4" },
    React.createElement("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-3" },
      React.createElement("div", null,
        React.createElement("h1", { className: "text-2xl font-bold flex items-center gap-2" },
          React.createElement(Key, { className: "h-6 w-6 text-indigo-500" }), " AI Key Manager"
        ),
        React.createElement("p", { className: "text-sm text-muted-foreground" }, "Manage AI provider API keys")
      ),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement(Button, { variant: "outline", size: "sm", onClick: fetchAll }, React.createElement(RefreshCw, { className: "h-4 w-4 mr-1" }), " Refresh"),
        React.createElement(Button, { size: "sm", onClick: () => setAddDialogOpen(true) }, React.createElement(Plus, { className: "h-4 w-4 mr-1" }), " Add Key")
      )
    ),
    error ? React.createElement("div", { className: "flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" },
      React.createElement(AlertCircle, { className: "h-4 w-4 shrink-0" }), error,
      React.createElement(Button, { variant: "ghost", size: "sm", className: "ml-auto h-6", onClick: () => setError(null) }, "Dismiss")
    ) : null,
    React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
      ["Total Keys", dashboard?.total_keys ?? keys.length],
      ["Active Keys", dashboard?.active_keys ?? keys.filter((k) => k.is_active).length],
      ["Requests Today", dashboard?.requests_today ?? "—"],
      ["Success Rate", dashboard?.last_24h_success_rate != null ? `${(dashboard.last_24h_success_rate * 100).toFixed(1)}%` : "—"],
    ).map(([label, value]) =>
      React.createElement("div", { key: String(label), className: "rounded-xl border bg-card p-3" },
        React.createElement("p", { className: "text-xs text-muted-foreground" }, String(label)),
        React.createElement("p", { className: "text-xl font-bold mt-1" }, String(value))
      )
    ),
    dashboard ? React.createElement("div", { className: "rounded-xl border bg-card" },
      React.createElement("button", { className: "flex items-center justify-between w-full px-4 py-3 text-left", onClick: () => setShowDashboard(!showDashboard) },
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement(BarChart3, { className: "h-5 w-5 text-indigo-500" }),
          React.createElement("span", { className: "font-semibold" }, "Dashboard Stats")
        ),
        showDashboard ? React.createElement(ChevronUp, { className: "h-4 w-4" }) : React.createElement(ChevronDown, { className: "h-4 w-4" })
      ),
      showDashboard ? React.createElement("div", { className: "px-4 pb-4 space-y-3" },
        React.createElement(Separator, null),
        React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
          React.createElement("div", { className: "rounded-lg border p-3" }, React.createElement("p", { className: "text-xs text-muted-foreground" }, "Total Keys"), React.createElement("p", { className: "text-lg font-bold" }, dashboard.total_keys)),
          React.createElement("div", { className: "rounded-lg border p-3" }, React.createElement("p", { className: "text-xs text-muted-foreground" }, "Active Keys"), React.createElement("p", { className: "text-lg font-bold" }, dashboard.active_keys)),
          React.createElement("div", { className: "rounded-lg border p-3" }, React.createElement("p", { className: "text-xs text-muted-foreground" }, "Requests Today"), React.createElement("p", { className: "text-lg font-bold" }, dashboard.requests_today)),
          React.createElement("div", { className: "rounded-lg border p-3" }, React.createElement("p", { className: "text-xs text-muted-foreground" }, "Failures Today"), React.createElement("p", { className: "text-lg font-bold text-red-600" }, dashboard.failures_today)),
        ),
        React.createElement("div", null,
          React.createElement("p", { className: "text-sm font-medium mb-2" }, "Keys by Provider"),
          React.createElement("div", { className: "flex flex-wrap gap-2" },
            Object.entries(dashboard.keys_by_provider || {}).map(([provider, count]) =>
              React.createElement(Badge, { key: provider, variant: "outline", className: "text-sm px-3 py-1" }, provider, ": ", React.createElement("span", { className: "font-bold ml-1" }, String(count)))
            ),
            Object.keys(dashboard.keys_by_provider || {}).length === 0 ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "No data") : null
          )
        ),
        dashboard.last_24h_success_rate != null ? React.createElement("div", null,
          React.createElement("p", { className: "text-sm font-medium mb-1" }, "Last 24h Success Rate"),
          React.createElement("div", { className: "w-full bg-gray-200 rounded-full h-2.5" },
            React.createElement("div", { className: "h-2.5 rounded-full transition-all", style: { width: `${Math.min(dashboard.last_24h_success_rate * 100, 100)}%`, backgroundColor: dashboard.last_24h_success_rate > 0.95 ? "#22c55e" : dashboard.last_24h_success_rate > 0.8 ? "#eab308" : "#ef4444" } })
          ),
          React.createElement("p", { className: "text-xs text-muted-foreground mt-1" }, `${(dashboard.last_24h_success_rate * 100).toFixed(1)}% success rate`)
        ) : null
      ) : null
    ) : null,
    React.createElement("div", { className: "rounded-xl border bg-card" },
      React.createElement("button", { className: "flex items-center justify-between w-full px-4 py-3 text-left", onClick: () => setShowConfig(!showConfig) },
        React.createElement("div", { className: "flex items-center gap-2" }, React.createElement(Settings, { className: "h-5 w-5 text-indigo-500" }), React.createElement("span", { className: "font-semibold" }, "Provider Priority Config")),
        showConfig ? React.createElement(ChevronUp, { className: "h-4 w-4" }) : React.createElement(ChevronDown, { className: "h-4 w-4" })
      ),
      showConfig && config ? React.createElement("div", { className: "px-4 pb-4 space-y-4" },
        React.createElement(Separator, null),
        React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
          React.createElement("div", { className: "space-y-2" },
            React.createElement(Label, null, "Default Provider"),
            React.createElement(Select, { value: config.default_provider, onValueChange: (v: string) => setConfig({ ...config, default_provider: v }) },
              React.createElement(SelectTrigger, null, React.createElement(SelectValue, null)),
              React.createElement(SelectContent, null, providerOptions.map((p) => React.createElement(SelectItem, { key: p.name, value: p.name }, p.display_name || p.name)))
            )
          ),
          React.createElement("div", { className: "flex items-end space-x-2 pb-2" },
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement(Switch, { checked: config.enable_failover, onCheckedChange: (v: boolean) => setConfig({ ...config, enable_failover: v }), id: "failover-toggle" }),
              React.createElement(Label, { htmlFor: "failover-toggle" }, "Enable Failover")
            )
          )
        ),
        config.provider_priority && config.provider_priority.length > 0 ? React.createElement("div", null,
          React.createElement("p", { className: "text-sm font-medium mb-2" }, "Priority Order"),
          React.createElement("div", { className: "flex flex-wrap gap-1" }, config.provider_priority.map((p: string, i: number) => React.createElement(Badge, { key: p, variant: i === 0 ? "default" : "secondary", className: "text-xs" }, `#${i + 1} ${p}`)))
        ) : null,
        React.createElement(Button, { onClick: handleSaveConfig, disabled: savingConfig },
          savingConfig ? React.createElement(LoadingSpinner, { size: "sm" }) : React.createElement(Save, { className: "h-4 w-4 mr-1" }),
          " Save Config"
        )
      ) : null
    ),
    React.createElement("div", { className: "rounded-xl border bg-card" },
      React.createElement("div", { className: "p-4 space-y-3" },
        React.createElement("div", { className: "flex flex-col md:flex-row gap-2 items-start md:items-center justify-between" },
          React.createElement("div", { className: "flex gap-2 flex-1 w-full md:w-auto" },
            React.createElement("div", { className: "relative flex-1 md:w-64" },
              React.createElement(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }),
              React.createElement(Input, { placeholder: "Search by name or provider...", value: search, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), className: "pl-8" })
            ),
            React.createElement(Select, { value: providerFilter, onValueChange: setProviderFilter },
              React.createElement(SelectTrigger, { className: "w-40" }, React.createElement(SelectValue, { placeholder: "All providers" })),
              React.createElement(SelectContent, null,
                React.createElement(SelectItem, { value: "all" }, "All Providers"),
                providerOptions.map((p) => React.createElement(SelectItem, { key: p.name, value: p.name }, p.display_name || p.name))
              )
            )
          ),
          React.createElement("p", { className: "text-sm text-muted-foreground whitespace-nowrap" }, `${filteredKeys.length} / ${keys.length} keys`)
        ),
        filteredKeys.length === 0 ? React.createElement("div", { className: "text-center py-12 text-muted-foreground" },
          React.createElement(Key, { className: "h-8 w-8 mx-auto mb-2 opacity-40" }),
          React.createElement("p", null, "No API keys found")
        ) : React.createElement("div", { className: "overflow-x-auto" },
          React.createElement(Table, null,
            React.createElement(TableHeader, null,
              React.createElement(TableRow, null,
                React.createElement(TableHead, null, "Name"),
                React.createElement(TableHead, null, "Provider"),
                React.createElement(TableHead, null, "API Key"),
                React.createElement(TableHead, { className: "hidden md:table-cell" }, "Base URL"),
                React.createElement(TableHead, null, "Status"),
                React.createElement(TableHead, { className: "hidden md:table-cell" }, "Last Test"),
                React.createElement(TableHead, { className: "hidden lg:table-cell" }, "Type"),
                React.createElement(TableHead, { className: "text-right" }, "Actions")
              )
            ),
            React.createElement(TableBody, null, filteredKeys.map((key) =>
              React.createElement(React.Fragment, { key: key.id },
                React.createElement(TableRow, null,
                  React.createElement(TableCell, { className: "font-medium" }, key.name),
                  React.createElement(TableCell, null, React.createElement(Badge, { variant: "outline" }, key.provider)),
                  React.createElement(TableCell, null, React.createElement("code", { className: "text-xs bg-muted px-1.5 py-0.5 rounded" }, maskKey(key.api_key_masked))),
                  React.createElement(TableCell, { className: "hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate" }, key.base_url || "Default"),
                  React.createElement(TableCell, null,
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement(Switch, { checked: key.is_active, onCheckedChange: () => handleToggleActive(key.id, key.is_active) }),
                      React.createElement("span", { className: `text-xs ${key.is_active ? "text-green-600" : "text-red-600"}` }, key.is_active ? "Active" : "Inactive")
                    )
                  ),
                  React.createElement(TableCell, { className: "hidden md:table-cell" },
                    React.createElement("div", { className: "flex items-center gap-1" },
                      getStatusBadge(key.last_test_status),
                      key.last_tested_at ? React.createElement("span", { className: "text-xs text-muted-foreground block mt-0.5" }, formatDate(key.last_tested_at)) : null
                    )
                  ),
                  React.createElement(TableCell, { className: "hidden lg:table-cell text-sm" },
                    React.createElement(Badge, { variant: "outline", className: "text-xs" }, key.key_type || "CENTRAL")
                  ),
                  React.createElement(TableCell, { className: "text-right" },
                    React.createElement("div", { className: "flex items-center justify-end gap-1" },
                      React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", onClick: () => toggleLogs(key.id), title: "View logs" }, React.createElement(Activity, { className: "h-4 w-4" })),
                      React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", onClick: () => handleTestKey(key.id), disabled: testingKeys.has(key.id), title: "Test key" },
                        testingKeys.has(key.id) ? React.createElement(LoadingSpinner, { size: "sm" }) : React.createElement(FlaskConical, { className: "h-4 w-4" })
                      ),
                      React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50", onClick: () => setDeleteConfirm(key.id), title: "Delete key" }, React.createElement(Trash2, { className: "h-4 w-4" }))
                    )
                  )
                ),
                testResults[key.id] ? React.createElement(TableRow, { className: "bg-muted/30" },
                  React.createElement(TableCell, { colSpan: 8, className: "py-2" },
                    React.createElement("div", { className: "flex items-center gap-3 text-sm" },
                      React.createElement("span", { className: "font-medium" }, "Test:"),
                      getStatusBadge(testResults[key.id].status),
                      testResults[key.id].latency_ms != null ? React.createElement("span", { className: "text-muted-foreground" }, `Latency: ${formatLatency(testResults[key.id].latency_ms)}`) : null,
                      testResults[key.id].error ? React.createElement("span", { className: "text-red-600 text-xs max-w-md truncate" }, `Error: ${testResults[key.id].error}`) : null,
                      React.createElement("span", { className: "text-xs text-muted-foreground" }, formatDate(testResults[key.id].tested_at))
                    )
                  )
                ) : null,
                expandedLogs.has(key.id) ? React.createElement(TableRow, { className: "bg-muted/20" },
                  React.createElement(TableCell, { colSpan: 8, className: "p-0" },
                    React.createElement("div", { className: "px-4 py-3 border-t" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                        React.createElement(Activity, { className: "h-4 w-4 text-indigo-500" }),
                        React.createElement("span", { className: "text-sm font-medium" }, `Logs for ${key.name}`)
                      ),
                      loadingLogs.has(key.id) ? React.createElement("div", { className: "flex items-center gap-2 text-sm text-muted-foreground py-2" },
                        React.createElement(LoadingSpinner, { size: "sm" }), "Loading logs..."
                      ) : (logsCache[key.id] || []).length === 0 ? React.createElement("p", { className: "text-sm text-muted-foreground py-2" }, "No logs found") :
                      React.createElement("div", { className: "max-h-64 overflow-y-auto space-y-1" },
                        (logsCache[key.id] || []).slice(0, 50).map((log) =>
                          React.createElement("div", { key: log.id, className: "flex items-start gap-2 text-xs p-1.5 rounded bg-background border" },
                            React.createElement("span", { className: "text-muted-foreground shrink-0 w-16" }, formatLatency(log.latency_ms)),
                            getStatusBadge(log.status),
                            React.createElement("span", { className: "text-muted-foreground truncate flex-1" }, `${log.model || "—"} / ${log.request_type || "—"}`),
                            log.error_message ? React.createElement("span", { className: "text-red-500 truncate max-w-[200px]", title: log.error_message }, log.error_message) : null,
                            log.created_at ? React.createElement("span", { className: "text-muted-foreground shrink-0" }, new Date(log.created_at).toLocaleString()) : null
                          )
                        )
                      )
                    )
                  )
                ) : null
              )
            ))
          )
        )
      )
    ),
    deleteConfirm ? React.createElement(Dialog, { open: true, onOpenChange: (open: boolean) => !open && setDeleteConfirm(null) },
      React.createElement(DialogContent, null,
        React.createElement(DialogHeader, null, React.createElement(DialogTitle, null, "Delete API Key"), React.createElement(DialogDescription, null, "Are you sure you want to delete this API key? This action cannot be undone.")),
        React.createElement(DialogFooter, { className: "gap-2" },
          React.createElement(Button, { variant: "outline", onClick: () => setDeleteConfirm(null) }, "Cancel"),
          React.createElement(Button, { variant: "destructive", onClick: () => deleteConfirm && handleDeleteKey(deleteConfirm) }, React.createElement(Trash2, { className: "h-4 w-4 mr-1" }), " Delete")
        )
      )
    ) : null,
    addDialogOpen ? React.createElement(Dialog, { open: true, onOpenChange: setAddDialogOpen },
      React.createElement(DialogContent, { className: "max-w-lg" },
        React.createElement(DialogHeader, null, React.createElement(DialogTitle, null, "Add API Key"), React.createElement(DialogDescription, null, "Add a new AI provider API key")),
        React.createElement("div", { className: "space-y-4 py-2" },
          React.createElement("div", { className: "space-y-2" },
            React.createElement(Label, null, "Name *"),
            React.createElement(Input, { value: addForm.name, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, name: e.target.value }), placeholder: "My API Key" })
          ),
          React.createElement("div", { className: "space-y-2" },
            React.createElement(Label, null, "Provider *"),
            React.createElement(Select, { value: addForm.provider, onValueChange: (v: string) => { const p = providers.find((pr) => pr.name === v); setAddForm({ ...addForm, provider: v, base_url: p?.base_url || addForm.base_url }); } },
              React.createElement(SelectTrigger, null, React.createElement(SelectValue, { placeholder: "Select provider" })),
              React.createElement(SelectContent, null, providerOptions.map((p) => React.createElement(SelectItem, { key: p.name, value: p.name }, p.display_name || p.name)))
            )
          ),
          React.createElement("div", { className: "space-y-2" },
            React.createElement(Label, null, "API Key *"),
            React.createElement(Input, { type: "password", value: addForm.api_key, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, api_key: e.target.value }), placeholder: "sk-..." })
          ),
          React.createElement("div", { className: "space-y-2" },
            React.createElement(Label, null, "Base URL"),
            React.createElement(Input, { value: addForm.base_url, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, base_url: e.target.value }), placeholder: "https://api.example.com/v1" })
          ),
          React.createElement("div", { className: "grid grid-cols-2 gap-4" },
            React.createElement("div", { className: "space-y-2" },
              React.createElement(Label, null, "Key Type"),
              React.createElement(Select, { value: addForm.key_type, onValueChange: (v: string) => setAddForm({ ...addForm, key_type: v }) },
                React.createElement(SelectTrigger, null, React.createElement(SelectValue, null)),
                React.createElement(SelectContent, null,
                  React.createElement(SelectItem, { value: "CENTRAL" }, "CENTRAL"),
                  React.createElement(SelectItem, { value: "COMPANY" }, "COMPANY")
                )
              )
            ),
            addForm.key_type === "COMPANY" ? React.createElement("div", { className: "space-y-2" },
              React.createElement(Label, null, "Company ID"),
              React.createElement(Input, { value: addForm.company_id, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, company_id: e.target.value }), placeholder: "Company ID" })
            ) : null
          ),
          React.createElement("div", { className: "grid grid-cols-2 gap-4" },
            React.createElement("div", { className: "space-y-2" },
              React.createElement(Label, null, "Max Requests / Day"),
              React.createElement(Input, { type: "number", value: addForm.max_requests_per_day, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, max_requests_per_day: Number(e.target.value) }) })
            ),
            React.createElement("div", { className: "space-y-2" },
              React.createElement(Label, null, "Priority"),
              React.createElement(Input, { type: "number", value: addForm.priority, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, priority: Number(e.target.value) }) })
            )
          ),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(Switch, { checked: addForm.is_active, onCheckedChange: (v: boolean) => setAddForm({ ...addForm, is_active: v }), id: "add-key-active" }),
            React.createElement(Label, { htmlFor: "add-key-active" }, "Active on creation")
          )
        ),
        React.createElement(DialogFooter, { className: "gap-2" },
          React.createElement(Button, { variant: "outline", onClick: () => setAddDialogOpen(false) }, "Cancel"),
          React.createElement(Button, { onClick: handleAddKey, disabled: saving || !addForm.name || !addForm.provider || !addForm.api_key },
            saving ? React.createElement(LoadingSpinner, { size: "sm" }) : React.createElement(Plus, { className: "h-4 w-4 mr-1" }),
            " Save Key"
          )
        )
      )
    ) : null
  );
};

export default SuperAdminAIKeyManager;
