import React from "react";
import tokenManager from "../../utils/tokenManager";

const API_BASE = "/api/v1/ai-admin";

class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Boundary caught:", error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return React.createElement("pre", { className: "p-4 text-red-600 whitespace-pre-wrap text-sm" },
        "Error: " + this.state.error.message + "\n\n" + this.state.error.stack
      );
    }
    return this.props.children;
  }
}

const Inner = () => {
  const [providers, setProviders] = React.useState<{name:string;display_name:string}[]>([]);
  const [keys, setKeys] = React.useState<any[]>([]);
  const [config, setConfig] = React.useState<any>(null);
  const [dashboard, setDashboard] = React.useState<any>(null);
  const [error, setError] = React.useState<string|null>(null);

  React.useEffect(() => {
    const headers = tokenManager.createAuthHeaders();
    Promise.all([
      fetch(API_BASE + "/providers", { headers }),
      fetch(API_BASE + "/keys", { headers }),
      fetch(API_BASE + "/config", { headers }),
      fetch(API_BASE + "/dashboard", { headers }),
    ]).then(async ([a,b,c,d]) => {
      if (a.ok) { const d2 = await a.json(); setProviders(d2.data || d2.providers || d2 || []); }
      if (b.ok) { const d2 = await b.json(); setKeys(d2.data || d2.keys || d2 || []); }
      if (c.ok) { const d2 = await c.json(); setConfig(d2.data || d2.config || d2 || null); }
      if (d.ok) { const d2 = await d.json(); setDashboard(d2.data || d2.stats || d2 || null); }
    }).catch((e:any) => setError(e?.message || "Fetch failed"));
  }, []);

  if (error) {
    return React.createElement("div", { className: "p-4" },
      React.createElement("p", { className: "text-red-600" }, "Error: " + error),
    );
  }

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    React.createElement("p", null, "P:" + providers.length + " K:" + keys.length + " C:" + (config ? "ok" : "no") + " D:" + (dashboard ? "ok" : "no")),
  );
};

const SuperAdminAIKeyManager = () => {
  return React.createElement(ErrorBoundary, null,
    React.createElement(Inner, null)
  );
};

export default SuperAdminAIKeyManager;
