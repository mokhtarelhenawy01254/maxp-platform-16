import React, { useState, useCallback, useEffect } from "react";
import tokenManager from "../../utils/tokenManager";

const API_BASE = "/api/v1/ai-admin";

const SuperAdminAIKeyManager = () => {
  const getAuthHeaders = useCallback(
    (extra: Record<string, string> = {}) => tokenManager.createAuthHeaders(extra),
    [],
  );

  const [providers, setProviders] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
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
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading && keys.length === 0) {
    return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
      React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" }));
  }

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    error ? React.createElement("p", { className: "text-red-600" }, error) : null,
    React.createElement("p", null, `Providers: ${providers.length}, Keys: ${keys.length}, Config: ${config ? "ok" : "no"}, Dashboard: ${dashboard ? "ok" : "no"}, Loading: ${loading ? "yes" : "no"}`),
    dashboard ? React.createElement("p", null, `Total: ${dashboard.total_keys}, Active: ${dashboard.active_keys}, Requests: ${dashboard.requests_today}`) : null,
    React.createElement("p", null, `FilteredKeys computed: ${keys.length} total`),
  );
};

export default SuperAdminAIKeyManager;
