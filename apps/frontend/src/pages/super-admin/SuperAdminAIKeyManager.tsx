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
  Plus, Trash2, CheckCircle, XCircle, RefreshCw, FlaskConical, Search, ChevronDown, ChevronRight, Key, Activity, BarChart3, Settings, Save, AlertCircle, Eye, EyeOff, ChevronUp,
} from "lucide-react";

const API_BASE = "/api/v1/ai-admin";

type ProviderRead = {
  name: string;
  display_name: string;
  adapter_type: string;
  base_url: string | null;
  default_model: string | null;
  is_active: boolean;
};

type AiKeyRead = {
  id: string;
  name: string;
  provider: string;
  base_url: string | null;
  is_active: boolean;
  key_type: string;
  company_id: string | null;
  max_requests_per_day: number | null;
  current_usage: number | null;
  priority: number | null;
  last_used_at: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
  api_key_masked: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type GlobalConfigRead = {
  id: string;
  default_provider: string;
  enable_failover: boolean;
  provider_priority: string[];
  settings: Record<string, unknown>;
  updated_at: string | null;
};

type DashboardStats = {
  total_keys: number;
  active_keys: number;
  keys_by_provider: Record<string, number>;
  keys_by_company: Record<string, number>;
  requests_today: number;
  failures_today: number;
  last_24h_success_rate: number | null;
};

type TestResult = {
  id: string;
  status: string;
  latency_ms: number | null;
  error: string | null;
  tested_at: string;
};

type LogEntry = {
  id: string;
  key_id: string;
  provider: string;
  model: string | null;
  request_type: string | null;
  status: string;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
};

const maskKey = (masked?: string | null) => masked || "••••••••";

const formatDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString() : "—";

const formatLatency = (ms: number | null | undefined) =>
  ms != null ? `${Math.round(ms)}ms` : "—";

const getStatusBadge = (status: string | null | undefined) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  if (status === "success" || status === "healthy")
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">{status}</Badge>;
  if (status === "failed" || status === "error" || status === "critical")
    return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const SuperAdminAIKeyManager = () => {
  const getAuthHeaders = useCallback(
    (extra: Record<string, string> = {}) => tokenManager.createAuthHeaders(extra),
    [],
  );

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
  const [expandedLogs, setExpandedLogs] = useState<string[]>([]);
  const [logsCache, setLogsCache] = useState<Record<string, LogEntry[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [testingKeys, setTestingKeys] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    provider: "",
    api_key: "",
    base_url: "",
    key_type: "CENTRAL",
    company_id: "",
    max_requests_per_day: 1500,
    priority: 1,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const [savingConfig, setSavingConfig] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = getAuthHeaders();
    try {
      const [provRes, keysRes, configRes, dashRes] = await Promise.all([
        fetch(`${API_BASE}/providers`, { headers }),
        fetch(`${API_BASE}/keys`, { headers }),
        fetch(`${API_BASE}/config`, { headers }),
        fetch(`${API_BASE}/dashboard`, { headers }),
      ]);
      if (provRes.ok) {
        const data = await provRes.json();
        setProviders(data.providers || data.data || data || []);
      }
      if (keysRes.ok) {
        const data = await keysRes.json();
        setKeys(data.keys || data.data || data || []);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config || data.data || data || null);
      }
      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashboard(data.stats || data.data || data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/keys/${keyId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, is_active: !currentActive } : k)),
        );
      }
    } catch { /* ignore */ }
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKeys((prev) => [...prev, keyId]);
    try {
      const res = await fetch(`${API_BASE}/keys/${keyId}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults((prev) => ({ ...prev, [keyId]: data.data || data || {} }));
        setKeys((prev) =>
          prev.map((k) =>
            k.id === keyId
              ? {
                  ...k,
                  last_tested_at: data.data?.tested_at || new Date().toISOString(),
                  last_test_status: data.data?.status || data.status || "unknown",
                }
              : k,
          ),
        );
      }
    } catch { /* ignore */ }
    finally {
      setTestingKeys((prev) => prev.filter((id) => id !== keyId));
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const res = await fetch(`${API_BASE}/keys/${keyId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
        setDeleteConfirm(null);
      }
    } catch { /* ignore */ }
  };

  const toggleLogs = async (keyId: string) => {
    const isExpanded = expandedLogs.includes(keyId);
    if (isExpanded) {
      setExpandedLogs((prev) => prev.filter((id) => id !== keyId));
    } else {
      setExpandedLogs((prev) => [...prev, keyId]);
      if (!logsCache[keyId]) {
        setLoadingLogs((prev) => [...prev, keyId]);
        try {
          const res = await fetch(`${API_BASE}/logs?key_id=${keyId}&limit=50`, {
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            setLogsCache((prev) => ({
              ...prev,
              [keyId]: data.logs || data.data || data || [],
            }));
          }
        } catch { /* ignore */ }
        finally {
          setLoadingLogs((prev) => prev.filter((id) => id !== keyId));
        }
      }
    }
  };

  const handleAddKey = async () => {
    if (!addForm.name || !addForm.provider || !addForm.api_key) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: addForm.name,
        provider: addForm.provider,
        api_key: addForm.api_key,
        key_type: addForm.key_type,
        max_requests_per_day: addForm.max_requests_per_day,
        priority: addForm.priority,
        is_active: addForm.is_active,
      };
      if (addForm.base_url) body.base_url = addForm.base_url;
      if (addForm.key_type === "COMPANY" && addForm.company_id) body.company_id = addForm.company_id;
      const res = await fetch(`${API_BASE}/keys`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setKeys((prev) => [...prev, data.data || data.key || data]);
        setAddDialogOpen(false);
        setAddForm({
          name: "",
          provider: "",
          api_key: "",
          base_url: "",
          key_type: "CENTRAL",
          company_id: "",
          max_requests_per_day: 1500,
          priority: 1,
          is_active: true,
        });
      } else {
        const err = await res.json();
        setError(err.message || err.detail || "Failed to add key");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add key");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          default_provider: config.default_provider,
          enable_failover: config.enable_failover,
          provider_priority: config.provider_priority,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || data.data || data);
      }
    } catch { /* ignore */ }
    finally {
      setSavingConfig(false);
    }
  };

  const filteredKeys = keys.filter((k) => {
    if (search) {
      const q = search.toLowerCase();
      if (!k.name.toLowerCase().includes(q) && !k.provider.toLowerCase().includes(q)) return false;
    }
    if (providerFilter !== "all" && k.provider !== providerFilter) return false;
    return true;
  });

  const providerOptions = providers.length > 0
    ? providers
    : [...new Set(keys.map((k) => k.provider))].map((name) => ({ name, display_name: name }));

  if (loading && keys.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-[1440px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-indigo-500" />
            AI Key Manager
          </h1>
          <p className="text-sm text-muted-foreground">Manage AI provider API keys</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Key
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total Keys", dashboard?.total_keys ?? keys.length],
          ["Active Keys", dashboard?.active_keys ?? keys.filter((k) => k.is_active).length],
          ["Requests Today", dashboard?.requests_today ?? "—"],
          ["Success Rate", dashboard?.last_24h_success_rate != null ? `${(dashboard.last_24h_success_rate * 100).toFixed(1)}%` : "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Dashboard Section */}
      {dashboard && (
        <div className="rounded-xl border bg-card">
          <button
            className="flex items-center justify-between w-full px-4 py-3 text-left"
            onClick={() => setShowDashboard(!showDashboard)}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <span className="font-semibold">Dashboard Stats</span>
            </div>
            {showDashboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showDashboard && (
            <div className="px-4 pb-4 space-y-3">
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Keys</p>
                  <p className="text-lg font-bold">{dashboard.total_keys}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Active Keys</p>
                  <p className="text-lg font-bold">{dashboard.active_keys}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Requests Today</p>
                  <p className="text-lg font-bold">{dashboard.requests_today}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Failures Today</p>
                  <p className="text-lg font-bold text-red-600">{dashboard.failures_today}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Keys by Provider</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(dashboard.keys_by_provider || {}).map(([provider, count]) => (
                    <Badge key={provider} variant="outline" className="text-sm px-3 py-1">
                      {provider}: <span className="font-bold ml-1">{count}</span>
                    </Badge>
                  ))}
                  {Object.keys(dashboard.keys_by_provider || {}).length === 0 && (
                    <p className="text-sm text-muted-foreground">No data</p>
                  )}
                </div>
              </div>
              {dashboard.last_24h_success_rate != null && (
                <div>
                  <p className="text-sm font-medium mb-1">Last 24h Success Rate</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(dashboard.last_24h_success_rate * 100, 100)}%`,
                        backgroundColor: dashboard.last_24h_success_rate > 0.95 ? "#22c55e" : dashboard.last_24h_success_rate > 0.8 ? "#eab308" : "#ef4444",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(dashboard.last_24h_success_rate * 100).toFixed(1)}% success rate
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Provider Priority Config */}
      <div className="rounded-xl border bg-card">
        <button
          className="flex items-center justify-between w-full px-4 py-3 text-left"
          onClick={() => setShowConfig(!showConfig)}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold">Provider Priority Config</span>
          </div>
          {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showConfig && config && (
          <div className="px-4 pb-4 space-y-4">
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Provider</Label>
                <Select
                  value={config.default_provider}
                  onValueChange={(v) => setConfig({ ...config, default_provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.display_name || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end space-x-2 pb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.enable_failover}
                    onCheckedChange={(v) => setConfig({ ...config, enable_failover: v })}
                    id="failover-toggle"
                  />
                  <Label htmlFor="failover-toggle">Enable Failover</Label>
                </div>
              </div>
            </div>
            {config.provider_priority && config.provider_priority.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Priority Order</p>
                <div className="flex flex-wrap gap-1">
                  {config.provider_priority.map((p, i) => (
                    <Badge key={p} variant={i === 0 ? "default" : "secondary"} className="text-xs">
                      #{i + 1} {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4 mr-1" />}
              Save Config
            </Button>
          </div>
        )}
      </div>

      {/* Keys Table */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
            <div className="flex gap-2 flex-1 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or provider..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.display_name || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredKeys.length} / {keys.length} keys
            </p>
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
                    <TableHead>Provider</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead className="hidden md:table-cell">Base URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Last Test</TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map((key) => (
                    <React.Fragment key={key.id}>
                      <TableRow>
                        <TableCell>
                          <Badge variant="outline">{key.provider}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {maskKey(key.api_key_masked)}
                          </code>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                          {key.base_url || "Default"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={key.is_active}
                              onCheckedChange={() => handleToggleActive(key.id, key.is_active)}
                            />
                            <span className={`text-xs ${key.is_active ? "text-green-600" : "text-red-600"}`}>
                              {key.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            {getStatusBadge(key.last_test_status)}
                            {key.last_tested_at && (
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {formatDate(key.last_tested_at)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          <Badge variant="outline" className="text-xs">
                            {key.key_type || "CENTRAL"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleLogs(key.id)}
                              title="View logs"
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleTestKey(key.id)}
                              disabled={testingKeys.includes(key.id)}
                              title="Test key"
                            >
                              {testingKeys.includes(key.id) ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <FlaskConical className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteConfirm(key.id)}
                              title="Delete key"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Test result row */}
                      {testResults[key.id] && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={8} className="py-2">
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-medium">Test:</span>
                              {getStatusBadge(testResults[key.id].status)}
                              {testResults[key.id].latency_ms != null && (
                                <span className="text-muted-foreground">
                                  Latency: {formatLatency(testResults[key.id].latency_ms)}
                                </span>
                              )}
                              {testResults[key.id].error && (
                                <span className="text-red-600 text-xs max-w-md truncate">
                                  Error: {testResults[key.id].error}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(testResults[key.id].tested_at)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Logs row */}
                      {expandedLogs.includes(key.id) && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-4 py-3 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-4 w-4 text-indigo-500" />
                                <span className="text-sm font-medium">Logs for {key.name}</span>
                              </div>
                              {loadingLogs.includes(key.id) ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                  <LoadingSpinner size="sm" />
                                  Loading logs...
                                </div>
                              ) : (logsCache[key.id] || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">No logs found</p>
                              ) : (
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                  {(logsCache[key.id] || []).slice(0, 50).map((log) => (
                                    <div
                                      key={log.id}
                                      className="flex items-start gap-2 text-xs p-1.5 rounded bg-background border"
                                    >
                                      <span className="text-muted-foreground shrink-0 w-16">
                                        {formatLatency(log.latency_ms)}
                                      </span>
                                      {getStatusBadge(log.status)}
                                      <span className="text-muted-foreground truncate flex-1">
                                        {log.model || "—"} / {log.request_type || "—"}
                                      </span>
                                      {log.error_message && (
                                        <span className="text-red-500 truncate max-w-[200px]" title={log.error_message}>
                                          {log.error_message}
                                        </span>
                                      )}
                                      {log.created_at && (
                                        <span className="text-muted-foreground shrink-0">
                                          {new Date(log.created_at).toLocaleString()}
                                        </span>
                                      )}
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDeleteKey(deleteConfirm)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Key dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>Add a new AI provider API key</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="My API Key"
              />
            </div>
            <div className="space-y-2">
              <Label>Provider *</Label>
              <Select
                value={addForm.provider}
                onValueChange={(v) => {
                  const p = providers.find((pr) => pr.name === v);
                  setAddForm({
                    ...addForm,
                    provider: v,
                    base_url: p?.base_url || addForm.base_url,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.display_name || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key *</Label>
              <Input
                type="password"
                value={addForm.api_key}
                onChange={(e) => setAddForm({ ...addForm, api_key: e.target.value })}
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={addForm.base_url}
                onChange={(e) => setAddForm({ ...addForm, base_url: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Key Type</Label>
                <Select
                  value={addForm.key_type}
                  onValueChange={(v) => setAddForm({ ...addForm, key_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CENTRAL">CENTRAL</SelectItem>
                    <SelectItem value="COMPANY">COMPANY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {addForm.key_type === "COMPANY" && (
                <div className="space-y-2">
                  <Label>Company ID</Label>
                  <Input
                    value={addForm.company_id}
                    onChange={(e) => setAddForm({ ...addForm, company_id: e.target.value })}
                    placeholder="Company ID"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Requests / Day</Label>
                <Input
                  type="number"
                  value={addForm.max_requests_per_day}
                  onChange={(e) => setAddForm({ ...addForm, max_requests_per_day: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={addForm.priority}
                  onChange={(e) => setAddForm({ ...addForm, priority: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={addForm.is_active}
                onCheckedChange={(v) => setAddForm({ ...addForm, is_active: v })}
                id="add-key-active"
              />
              <Label htmlFor="add-key-active">Active on creation</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddKey} disabled={saving || !addForm.name || !addForm.provider || !addForm.api_key}>
              {saving ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4 mr-1" />}
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminAIKeyManager;
