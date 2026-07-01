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
      if (provRes.ok) { const d = await provRes.json(); setProviders(d); }
      if (keysRes.ok) { const d = await keysRes.json(); setKeys(d); }
      if (configRes.ok) { const d = await configRes.json(); setConfig(d); }
      if (dashRes.ok) { const d = await dashRes.json(); setDashboard(d); }
    } catch {}
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return React.createElement("div", { className: "p-4" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager - 4 APIs"),
    React.createElement("p", null, `P:${providers.length} K:${keys.length} C:${config ? "ok" : "no"} D:${dashboard ? "ok" : "no"} L:${loading}`),
  );
};

export default SuperAdminAIKeyManager;
