import React, { useState, useCallback, useEffect } from "react";
import tokenManager from "../../utils/tokenManager";

const API_BASE = "/api/v1/ai-admin";

const SuperAdminAIKeyManager = () => {
  const getAuthHeaders = useCallback(
    (extra: Record<string, string> = {}) => tokenManager.createAuthHeaders(extra),
    [],
  );

  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const res = await fetch(`${API_BASE}/providers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch {}
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  return React.createElement("div", null,
    React.createElement("h1", null, "AI Key Manager - Single API"),
    React.createElement("p", null, `Providers: ${providers.length}, Loading: ${loading}`),
  );
};

export default SuperAdminAIKeyManager;
