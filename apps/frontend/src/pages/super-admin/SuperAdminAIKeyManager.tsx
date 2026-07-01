import React from "react";
import tokenManager from "../../utils/tokenManager";

const API_BASE = "/api/v1/ai-admin";

const SuperAdminAIKeyManager = () => {
  const [providers, setProviders] = React.useState<Record<string,any>[]>([]);
  const [keys, setKeys] = React.useState<Record<string,any>[]>([]);
  const [config, setConfig] = React.useState<Record<string,any>|null>(null);
  const [dashboard, setDashboard] = React.useState<Record<string,any>|null>(null);
  const [error, setError] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const headers = tokenManager.createAuthHeaders();
    setLoading(true);
    Promise.all([
      fetch(API_BASE + "/providers", { headers }),
      fetch(API_BASE + "/keys", { headers }),
      fetch(API_BASE + "/config", { headers }),
      fetch(API_BASE + "/dashboard", { headers }),
    ]).then(async ([a,b,c,d]) => {
      try {
        if (a.ok) { const d2 = await a.json(); setProviders(d2.data || d2.providers || d2 || []); }
        if (b.ok) { const d2 = await b.json(); setKeys(d2.data || d2.keys || d2 || []); }
        if (c.ok) { const d2 = await c.json(); setConfig(d2.data || d2.config || d2 || null); }
        if (d.ok) { const d2 = await d.json(); setDashboard(d2.data || d2.stats || d2 || null); }
      } catch(e: any) { setError(e?.message || "parse error"); }
    }).catch((e: any) => setError(e?.message || "fetch error"))
    .finally(() => setLoading(false));
  }, []);

  if (error) {
    return React.createElement("div", { className: "p-4" },
      React.createElement("p", { className: "text-red-600" }, "Error: " + error),
    );
  }

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    React.createElement("p", null, "Providers: " + providers.length + " Keys: " + keys.length + " Config: " + (config ? "yes" : "no") + " Dashboard: " + (dashboard ? "yes" : "no") + " Loading: " + (loading ? "yes" : "no")),
  );
};

export default SuperAdminAIKeyManager;
