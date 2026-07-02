import React from "react";
import tokenManager from "../../utils/tokenManager";

const API_BASE = "/api/v1/ai-admin";

const SuperAdminAIKeyManager = () => {
  const [providers, setProviders] = React.useState<any[]>([]);
  const [keys, setKeys] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [addForm, setAddForm] = React.useState({ name: "", provider: "GOOGLE", api_key: "" });
  const [showAdd, setShowAdd] = React.useState(false);

  React.useEffect(() => {
    const h = tokenManager.createAuthHeaders();
    Promise.all([
      fetch(API_BASE + "/providers", { headers: h }),
      fetch(API_BASE + "/keys", { headers: h }),
    ]).then(async ([a, b]) => {
      if (a.ok) { const d = await a.json(); setProviders(d.data || d.providers || d || []); }
      if (b.ok) { const d = await b.json(); setKeys(d.data || d.keys || d || []); }
    }).catch((e) => setError(e?.message || "err"))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (id: string, cur: boolean) => {
    try {
      const r = await fetch(API_BASE + "/keys/" + id + "/status", {
        method: "PATCH",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ is_active: !cur }),
      });
      if (r.ok) setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: !cur } : k)));
    } catch {}
  };

  const delKey = async (id: string) => {
    try { await fetch(API_BASE + "/keys/" + id, { method: "DELETE", headers: tokenManager.createAuthHeaders() }); setKeys((p) => p.filter((k) => k.id !== id)); } catch {}
    setDeleteConfirm(null);
  };

  const addKey = async () => {
    if (!addForm.name || !addForm.api_key) return;
    try {
      const r = await fetch(API_BASE + "/keys", {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: addForm.name, provider: addForm.provider, api_key: addForm.api_key }),
      });
      if (r.ok) { const d = await r.json(); const nk = d.data || d.key || d; if (nk) setKeys((p) => [...p, nk]); setShowAdd(false); setAddForm({ name: "", provider: "GOOGLE", api_key: "" }); }
      else { const e = await r.json(); setError(e.message || e.detail || "add failed"); }
    } catch (e: any) { setError(e?.message || "add failed"); }
  };

  const filtered = keys.filter((k) => {
    if (search) { const q = search.toLowerCase(); if (!k.name.toLowerCase().includes(q) && !k.provider.toLowerCase().includes(q)) return false; }
    if (providerFilter !== "all" && k.provider !== providerFilter) return false;
    return true;
  });

  const providerOpts = providers.length > 0 ? providers : [...new Set(keys.map((k) => k.provider))].map((n) => ({ name: n, display_name: n }));

  if (loading && keys.length === 0) {
    return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
      React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" }));
  }

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto space-y-4" },

    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
      React.createElement("button", { onClick: () => setShowAdd(true), className: "px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700" }, "+ Add Key")),

    error ? React.createElement("div", { className: "text-sm text-red-600 bg-red-50 p-2 rounded" },
      error, React.createElement("button", { onClick: () => setError(null), className: "ml-2 underline" }, "dismiss")) : null,

    React.createElement("div", { className: "flex gap-2 items-center mb-2" },
      React.createElement("input", { placeholder: "Search...", value: search, onChange: (e: any) => setSearch(e.target.value), className: "border rounded px-2 py-1 text-sm w-48" }),
      React.createElement("select", { value: providerFilter, onChange: (e: any) => setProviderFilter(e.target.value), className: "border rounded px-2 py-1 text-sm" },
        React.createElement("option", { value: "all" }, "All"),
        providerOpts.map((p: any) => React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name)))),

    React.createElement("div", { className: "grid grid-cols-3 gap-2 text-sm" },
      React.createElement("div", { className: "border rounded p-2 bg-white" }, "Providers: " + providers.length),
      React.createElement("div", { className: "border rounded p-2 bg-white" }, "Keys: " + keys.length),
      React.createElement("div", { className: "border rounded p-2 bg-white" }, "Active: " + keys.filter((k) => k.is_active).length)),

    React.createElement("div", { className: "border rounded bg-white" },
      React.createElement("table", { className: "w-full text-sm" },
        React.createElement("thead", null,
          React.createElement("tr", { className: "border-b" },
            React.createElement("th", { className: "text-left p-2" }, "Name"),
            React.createElement("th", { className: "text-left p-2" }, "Provider"),
            React.createElement("th", { className: "text-left p-2" }, "Status"),
            React.createElement("th", { className: "text-right p-2" }, "Actions"))),
        React.createElement("tbody", null,
          filtered.length === 0 ?
            React.createElement("tr", null,
              React.createElement("td", { colSpan: 4, className: "p-4 text-center text-gray-400" }, "No keys")) :
            filtered.map((key) =>
              React.createElement("tr", { key: key.id, className: "border-b hover:bg-gray-50" },
                React.createElement("td", { className: "p-2 font-medium" }, key.name),
                React.createElement("td", { className: "p-2" },
                  React.createElement("span", { className: "text-xs bg-gray-100 px-1.5 py-0.5 rounded" }, key.provider)),
                React.createElement("td", { className: "p-2" },
                  React.createElement("button", { onClick: () => toggleActive(key.id, key.is_active),
                    className: "text-xs px-2 py-0.5 rounded " + (key.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") }, key.is_active ? "Active" : "Inactive")),
                React.createElement("td", { className: "p-2 text-right" },
                  React.createElement("button", { onClick: () => setDeleteConfirm(key.id), className: "text-xs text-red-600 underline" }, "delete")))))),

    deleteConfirm ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30" },
      React.createElement("div", { className: "bg-white p-4 rounded shadow-lg" },
        React.createElement("p", { className: "mb-3" }, "Delete this key?"),
        React.createElement("button", { onClick: () => delKey(deleteConfirm), className: "px-3 py-1 bg-red-600 text-white rounded text-sm mr-2" }, "Delete"),
        React.createElement("button", { onClick: () => setDeleteConfirm(null), className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,

    showAdd ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30" },
      React.createElement("div", { className: "bg-white p-4 rounded shadow-lg w-96" },
        React.createElement("h2", { className: "text-lg font-bold mb-3" }, "Add API Key"),
        React.createElement("input", { placeholder: "Name", value: addForm.name, onChange: (e: any) => setAddForm({ ...addForm, name: e.target.value }), className: "border rounded px-2 py-1 text-sm w-full mb-2" }),
        React.createElement("select", { value: addForm.provider, onChange: (e: any) => setAddForm({ ...addForm, provider: e.target.value }), className: "border rounded px-2 py-1 text-sm w-full mb-2" },
          providerOpts.map((p: any) => React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name))),
        React.createElement("input", { type: "password", placeholder: "API Key", value: addForm.api_key, onChange: (e: any) => setAddForm({ ...addForm, api_key: e.target.value }), className: "border rounded px-2 py-1 text-sm w-full mb-3" }),
        React.createElement("button", { onClick: addKey, className: "px-3 py-1 bg-indigo-600 text-white rounded text-sm mr-2" }, "Save"),
        React.createElement("button", { onClick: () => setShowAdd(false), className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,
  );
};

export default SuperAdminAIKeyManager;
