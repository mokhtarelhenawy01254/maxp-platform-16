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
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (provRes.ok) { const data = await provRes.json(); setProviders(data.providers || data.data || data || []); }
      if (keysRes.ok) { const data = await keysRes.json(); setKeys(data.keys || data.data || data || []); }
      if (configRes.ok) { const data = await configRes.json(); setConfig(data.config || data.data || data || null); }
      if (dashRes.ok) { const data = await dashRes.json(); setDashboard(data.stats || data.data || data || null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const providerOptions = providers.length > 0
    ? providers
    : [...new Set(keys.map((k: any) => k.provider))].map((name: any) => ({ name, display_name: name }));

  const filteredKeys = keys.filter((k: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (!k.name.toLowerCase().includes(q) && !k.provider.toLowerCase().includes(q)) return false;
    }
    if (providerFilter !== "all" && k.provider !== providerFilter) return false;
    return true;
  });

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto space-y-4" },
    React.createElement("h1", { className: "text-2xl font-bold flex items-center gap-2" }, "AI Key Manager"),
    React.createElement("p", { className: "text-sm text-muted-foreground" }, `Providers: ${providers.length}, Keys: ${keys.length}, Dashboard: ${dashboard ? "loaded" : "null"}`),
    React.createElement("div", null,
      React.createElement("input", {
        type: "text",
        placeholder: "Search...",
        value: search,
        onChange: (e: any) => setSearch(e.target.value),
        className: "border px-2 py-1 rounded",
      }),
    ),
    React.createElement("div", null,
      React.createElement("span", null, `Filtered: ${filteredKeys.length}`),
      React.createElement("span", null, ` | Options: ${providerOptions.length}`),
    ),
    error && React.createElement("p", { className: "text-red-500" }, error),
  );
};

export default SuperAdminAIKeyManager;
