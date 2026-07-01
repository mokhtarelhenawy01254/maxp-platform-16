import React from "react";
import tokenManager from "../../utils/tokenManager";

const API_BASE = "/api/v1/ai-admin";

class KeyManagerErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("🔴 KMEB caught:", error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return React.createElement("div", { className: "p-8" },
        React.createElement("h2", { className: "text-xl font-bold text-red-600" }, "Error Caught"),
        React.createElement("pre", { className: "mt-4 text-sm whitespace-pre-wrap max-w-full overflow-auto bg-gray-100 p-4 rounded" },
          `Message: ${this.state.error.message}\n\nStack:\n${this.state.error.stack}`
        )
      );
    }
    return this.props.children;
  }
}

const PROVIDERS = [
  "GOOGLE","DEEPSEEK","OPENAI","ANTHROPIC","HUGGINGFACE","OLLAMA","GROQ",
  "OPENROUTER","NVIDIA","CEREBRAS","GITHUB","SAMBANOVA","MISTRAL",
];

const Inner = () => {
  const getAuthHeaders = React.useCallback(
    (extra: Record<string, string> = {}) => tokenManager.createAuthHeaders(extra), []
  );

  const [providers, setProviders] = React.useState<any[]>(PROVIDERS.map(p => ({ name: p, display_name: p })));
  const [keys, setKeys] = React.useState<any[]>([]);
  const [config, setConfig] = React.useState<Record<string, any>>({});
  const [dashboard, setDashboard] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch(`${API_BASE}/providers`, { headers }),
      fetch(`${API_BASE}/keys`, { headers }),
      fetch(`${API_BASE}/config`, { headers }),
      fetch(`${API_BASE}/dashboard`, { headers }),
    ]).then(async ([provRes, keysRes, configRes, dashRes]) => {
      if (provRes.ok) { const d = await provRes.json(); setProviders(d.data || d.providers || d || PROVIDERS.map(p => ({name:p,display_name:p}))); }
      if (keysRes.ok) { const d = await keysRes.json(); setKeys(d.data || d.keys || d || []); }
      if (configRes.ok) { const d = await configRes.json(); setConfig(d.data || d.config || d || {}); }
      if (dashRes.ok) { const d = await dashRes.json(); setDashboard(d.data || d.stats || d || {}); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [getAuthHeaders]);

  const filteredKeys = keys.filter((k) => true);
  const providerOptions = providers.length > 0 ? providers : [];

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto space-y-4" },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    ),
    React.createElement("p", null, `P:${providers.length} K:${keys.length} C:${config?"ok":"no"} D:${dashboard?"ok":"no"} L:${loading}`),
    React.createElement("div", null,
      providerOptions.map((p: any) => React.createElement("span", { key: p.name, className: "inline-block px-2 py-1 bg-gray-100 rounded mr-1 text-sm" }, p.name)),
    ),
  );
};

const SuperAdminAIKeyManager = () => {
  return React.createElement(KeyManagerErrorBoundary, null,
    React.createElement(Inner, null)
  );
};

export default SuperAdminAIKeyManager;
