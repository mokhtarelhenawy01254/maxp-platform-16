import React from "react";
import tokenManager from "../../utils/tokenManager";

const API = "/api/v1/ai-admin";

const SuperAdminAIKeyManager = () => {
  const [providers, setProviders] = React.useState([]);
  const [keys, setKeys] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [addName, setAddName] = React.useState("");
  const [addProv, setAddProv] = React.useState("GOOGLE");
  const [addKey, setAddKey] = React.useState("");

  React.useEffect(() => {
    var h = tokenManager.createAuthHeaders();
    Promise.all([
      fetch(API + "/providers", { headers: h }),
      fetch(API + "/keys", { headers: h }),
    ]).then(function (r) {
      return Promise.all([r[0].json(), r[1].json()]);
    }).then(function (d) {
      setProviders(d[0].data || d[0].providers || d[0] || []);
      setKeys(d[1].data || d[1].keys || d[1] || []);
    }).catch(function (e) { setError(e ? e.message : "err"); })
      .finally(function () { setLoading(false); });
  }, []);

  function toggleActive(id, cur) {
    fetch(API + "/keys/" + id + "/status", {
      method: "PATCH",
      headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ is_active: !cur }),
    }).then(function (r) {
      if (r.ok) setKeys(function (prev) { return prev.map(function (k) { return k.id === id ? { ...k, is_active: !cur } : k; }); });
    }).catch(function () {});
  }

  function delKey(id) {
    fetch(API + "/keys/" + id, { method: "DELETE", headers: tokenManager.createAuthHeaders() })
      .then(function () { setKeys(function (p) { return p.filter(function (k) { return k.id !== id; }); }); })
      .catch(function () {});
    setDeleteConfirm(null);
  }

  function addNewKey() {
    if (!addName || !addKey) return;
    fetch(API + "/keys", {
      method: "POST",
      headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: addName, provider: addProv, api_key: addKey }),
    }).then(function (r) {
      if (r.ok) {
        return r.json().then(function (d) {
          var nk = d.data || d.key || d;
          if (nk) setKeys(function (p) { return p.concat([nk]); });
          setShowAdd(false); setAddName(""); setAddProv("GOOGLE"); setAddKey("");
        });
      } else {
        return r.json().then(function (e) { setError(e.message || e.detail || "add failed"); });
      }
    }).catch(function (e) { setError(e && e.message || "add failed"); });
  }

  var providerOpts = providers.length > 0 ? providers : [];
  if (providerOpts.length === 0) {
    var seen = {};
    keys.forEach(function (k) { if (!seen[k.provider]) { seen[k.provider] = true; providerOpts.push({ name: k.provider }); } });
  }

  var filtered = keys.filter(function (k) {
    if (search) { var q = search.toLowerCase(); if (k.name.toLowerCase().indexOf(q) < 0 && k.provider.toLowerCase().indexOf(q) < 0) return false; }
    if (providerFilter !== "all" && k.provider !== providerFilter) return false;
    return true;
  });

  if (loading && keys.length === 0) {
    return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
      React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" }));
  }

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto space-y-4" },

    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
      React.createElement("button", { onClick: function () { setShowAdd(true); }, className: "px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700" }, "+ Add Key")),

    error ? React.createElement("div", { className: "text-sm text-red-600 bg-red-50 p-2 rounded flex items-center gap-2" },
      React.createElement("span", null, error),
      React.createElement("button", { onClick: function () { setError(null); }, className: "underline ml-auto" }, "Dismiss")) : null,

    React.createElement("div", { className: "flex gap-2 items-center" },
      React.createElement("input", { placeholder: "Search...", value: search, onChange: function (e) { setSearch(e.target.value); }, className: "border rounded px-2 py-1 text-sm w-48" }),
      React.createElement("select", { value: providerFilter, onChange: function (e) { setProviderFilter(e.target.value); }, className: "border rounded px-2 py-1 text-sm" },
        React.createElement("option", { value: "all" }, "All"),
        providerOpts.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name); }))),

    React.createElement("div", { className: "grid grid-cols-3 gap-2 text-sm" },
      React.createElement("div", { className: "border rounded p-2 bg-white" }, "Providers: " + providers.length),
      React.createElement("div", { className: "border rounded p-2 bg-white" }, "Keys: " + keys.length),
      React.createElement("div", { className: "border rounded p-2 bg-white" }, "Active: " + keys.filter(function (k) { return k.is_active; }).length)),

    React.createElement("div", { className: "border rounded bg-white overflow-hidden" },
      React.createElement("table", { className: "w-full text-sm" },
        React.createElement("thead", null,
          React.createElement("tr", { className: "border-b bg-gray-50" },
            React.createElement("th", { className: "text-left p-2" }, "Name"),
            React.createElement("th", { className: "text-left p-2" }, "Provider"),
            React.createElement("th", { className: "text-left p-2" }, "Status"),
            React.createElement("th", { className: "text-right p-2" }, "Actions"))),
        React.createElement("tbody", null,
          filtered.length === 0 ?
            React.createElement("tr", null, React.createElement("td", { colSpan: 4, className: "p-4 text-center text-gray-400" }, "No keys")) :
            filtered.map(function (key) {
              return React.createElement("tr", { key: key.id, className: "border-b hover:bg-gray-50" },
                React.createElement("td", { className: "p-2 font-medium" }, key.name),
                React.createElement("td", { className: "p-2" }, React.createElement("span", { className: "text-xs bg-gray-100 px-1.5 py-0.5 rounded" }, key.provider)),
                React.createElement("td", { className: "p-2" },
                  React.createElement("button", { onClick: function () { toggleActive(key.id, key.is_active); },
                    className: "text-xs px-2 py-0.5 rounded " + (key.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") }, key.is_active ? "Active" : "Inactive")),
                React.createElement("td", { className: "p-2 text-right" },
                  React.createElement("button", { onClick: function () { setDeleteConfirm(key.id); }, className: "text-xs text-red-600 underline" }, "delete")));
            })))),

    deleteConfirm ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30 z-50" },
      React.createElement("div", { className: "bg-white p-4 rounded shadow-lg" },
        React.createElement("p", { className: "mb-3" }, "Delete this key?"),
        React.createElement("button", { onClick: function () { delKey(deleteConfirm); }, className: "px-3 py-1 bg-red-600 text-white rounded text-sm mr-2" }, "Delete"),
        React.createElement("button", { onClick: function () { setDeleteConfirm(null); }, className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,

    showAdd ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30 z-50" },
      React.createElement("div", { className: "bg-white p-4 rounded shadow-lg w-96" },
        React.createElement("h2", { className: "text-lg font-bold mb-3" }, "Add API Key"),
        React.createElement("input", { placeholder: "Name", value: addName, onChange: function (e) { setAddName(e.target.value); }, className: "border rounded px-2 py-1 text-sm w-full mb-2" }),
        React.createElement("select", { value: addProv, onChange: function (e) { setAddProv(e.target.value); }, className: "border rounded px-2 py-1 text-sm w-full mb-2" },
          providerOpts.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name); })),
        React.createElement("input", { type: "password", placeholder: "API Key", value: addKey, onChange: function (e) { setAddKey(e.target.value); }, className: "border rounded px-2 py-1 text-sm w-full mb-3" }),
        React.createElement("button", { onClick: addNewKey, className: "px-3 py-1 bg-indigo-600 text-white rounded text-sm mr-2" }, "Save"),
        React.createElement("button", { onClick: function () { setShowAdd(false); }, className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,
  );
};

export default SuperAdminAIKeyManager;
