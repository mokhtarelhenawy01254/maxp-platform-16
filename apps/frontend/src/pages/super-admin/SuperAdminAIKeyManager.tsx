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
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const [provRes, keysRes] = await Promise.all([
        fetch(`${API_BASE}/providers`, { headers }),
        fetch(`${API_BASE}/keys`, { headers }),
      ]);
      if (provRes.ok) { const d = await provRes.json(); setProviders(d); }
      if (keysRes.ok) { const d = await keysRes.json(); setKeys(d); }
    } catch {}
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return React.createElement("div", { className: "p-4" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager - 2 APIs + keys"),
    React.createElement("p", null, `Providers: ${providers.length}, Keys: ${keys.length}, Loading: ${loading}`),
  );
};

export default SuperAdminAIKeyManager;
