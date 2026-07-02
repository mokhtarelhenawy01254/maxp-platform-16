```tsx
import React from "react";
import tokenManager from "../../utils/tokenManager";

const API = "/api/v1/ai-admin";

var h = function () { return tokenManager.createAuthHeaders(); };
var hJson = function () { return tokenManager.createAuthHeaders({ "Content-Type": "application/json" }); };

const SuperAdminAIKeyManager = () => {
  var providers = React.useState([]);
  var keys = React.useState([]);
  var config = React.useState(null);
  var dashboard = React.useState(null);
  var error = React.useState(null);
  var loading = React.useState(true);
  var search = React.useState("");
  var provFilter = React.useState("all");
  var delConfirm = React.useState(null);
  var addOpen = React.useState(false);
  var addName = React.useState("");
  var addProvider = React.useState("GOOGLE");
  var addKeyVal = React.useState("");
  var saving = React.useState(false);
  var testResult = React.useState(null);
  var testing = React.useState(null);

  var fetchAll = function () {
    loading[1](true); error[1](null);
    Promise.all([
      fetch(API + "/providers", { headers: h() }),
      fetch(API + "/keys", { headers: h() }),
      fetch(API + "/config", { headers: h() }),
      fetch(API + "/dashboard", { headers: h() }),
    ]).then(function (res) {
      return Promise.all(res.map(function (r) { return r.ok ? r.json() : null; }));
    }).then(function (d) {
      if (d[0]) providers[1](d[0].data || d[0].providers || d[0] || []);
      if (d[1]) keys[1](d[1].data || d[1].keys || d[1] || []);
      if (d[2]) config[1](d[2].data || d[2].config || d[2] || null);
      if (d[3]) dashboard[1](d[3].data || d[3].stats || d[3] || null);
    }).catch(function (e) { error[1](e && e.message || "fetch error"); })
    .finally(function () { loading[1](false); });
  };

  React.useEffect(function () { fetchAll(); }, []);

  var toggleKey = function (id, cur) {
    fetch(API + "/keys/" + id + "/status", {
      method: "PATCH", headers: hJson(),
      body: JSON.stringify({ is_active: !cur }),
    }).then(function (r) {
      if (r.ok) keys[1](keys[0].map(function (k) {
        return k.id === id ? Object.assign({}, k, { is_active: !cur }) : k;
      }));
    }).catch(function () {});
  };

  var testKey = function (id) {
    testing[1](id);
    fetch(API + "/keys/" + id + "/test", { method: "POST", headers: h() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { testResult[1]({ id: id, data: d && (d.data || d) }); })
      .catch(function () {})
      .finally(function () { testing[1](null); });
  };

  var deleteKey = function (id) {
    fetch(API + "/keys/" + id, { method: "DELETE", headers: h() })
      .then(function () { keys[1](keys[0].filter(function (k) { return k.id !== id; })); })
      .catch(function () {});
    delConfirm[1](null);
  };

  var addKey = function () {
    if (!addName[0] || !addKeyVal[0]) return;
    saving[1](true);
    fetch(API + "/keys", {
      method: "POST", headers: hJson(),
      body: JSON.stringify({ name: addName[0], provider: addProvider[0], api_key: addKeyVal[0] }),
    }).then(function (r) {
      if (r.ok) {
        return r.json().then(function (d) {
          var nk = d.data || d.key || d;
          if (nk) keys[1](keys[0].concat([nk]));
          addOpen[1](false); addName[1](""); addProvider[1]("GOOGLE"); addKeyVal[1]("");
        });
      } else {
        return r.json().then(function (e) { error[1](e.message || e.detail || "add failed"); });
      }
    }).catch(function (e) { error[1](e && e.message || "add failed"); })
    .finally(function () { saving[1](false); });
  };

  var provOpts = providers[0].length > 0 ? providers[0] : [];
  if (provOpts.length === 0) {
    var seen = {};
    keys[0].forEach(function (k) { if (!seen[k.provider]) { seen[k.provider] = true; provOpts.push({ name: k.provider }); } });
  }

  var filtered = keys[0].filter(function (k) {
    if (search[0]) {
      var q = search[0].toLowerCase();
      if (k.name.toLowerCase().indexOf(q) < 0 && k.provider.toLowerCase().indexOf(q) < 0) return false;
    }
    if (provFilter[0] !== "all" && k.provider !== provFilter[0]) return false;
    return true;
  });

  if (loading[0] && keys[0].length === 0) {
    return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
      React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" }));
  }

  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto space-y-4" },

    /* Header */
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("div", null,
        React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
        React.createElement("p", { className: "text-sm text-gray-500" }, "Manage AI provider API keys")),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("button", { onClick: fetchAll, className: "px-3 py-1.5 border rounded text-sm hover:bg-gray-50" }, "Refresh"),
        React.createElement("button", { onClick: function () { addOpen[1](true); }, className: "px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700" }, "+ Add Key"))),

    /* Error banner */
    error[0] ? React.createElement("div", { className: "flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" },
      React.createElement("span", null, error[0]),
      React.createElement("button", { onClick: function () { error[1](null); }, className: "underline ml-auto" }, "Dismiss")) : null,

    /* Summary cards */
    React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
      React.createElement("div", { className: "border rounded p-3 bg-white" },
        React.createElement("p", { className: "text-xs text-gray-500" }, "Providers"),
        React.createElement("p", { className: "text-xl font-bold mt-1" }, providers[0].length)),
      React.createElement("div", { className: "border rounded p-3 bg-white" },
        React.createElement("p", { className: "text-xs text-gray-500" }, "Keys"),
        React.createElement("p", { className: "text-xl font-bold mt-1" }, keys[0].length)),
      React.createElement("div", { className: "border rounded p-3 bg-white" },
        React.createElement("p", { className: "text-xs text-gray-500" }, "Active"),
        React.createElement("p", { className: "text-xl font-bold mt-1" }, keys[0].filter(function (k) { return k.is_active; }).length)),
      React.createElement("div", { className: "border rounded p-3 bg-white" },
        React.createElement("p", { className: "text-xs text-gray-500" }, "Config"),
        React.createElement("p", { className: "text-xl font-bold mt-1" }, config[0] ? (config[0].default_provider || "ok") : "—"))),

    /* Search + Filter */
    React.createElement("div", { className: "flex gap-2 items-center" },
      React.createElement("input", { placeholder: "Search by name or provider...", value: search[0],
        onChange: function (e) { search[1](e.target.value); },
        className: "border rounded px-2 py-1.5 text-sm w-64" }),
      React.createElement("select", { value: provFilter[0],
        onChange: function (e) { provFilter[1](e.target.value); },
        className: "border rounded px-2 py-1.5 text-sm" },
        React.createElement("option", { value: "all" }, "All Providers"),
        provOpts.map(function (p) {
          return React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name);
        }))),

    /* Keys table */
    React.createElement("div", { className: "border rounded bg-white overflow-hidden" },
      filtered.length === 0 ?
      React.createElement("p", { className: "p-4 text-center text-gray-400" }, "No API keys found") :
      React.createElement("table", { className: "w-full text-sm" },
        React.createElement("thead", null,
          React.createElement("tr", { className: "border-b bg-gray-50" },
            React.createElement("th", { className: "text-left p-2" }, "Name"),
            React.createElement("th", { className: "text-left p-2" }, "Provider"),
            React.createElement("th", { className: "text-left p-2" }, "Key"),
            React.createElement("th", { className: "text-left p-2" }, "Status"),
            React.createElement("th", { className: "text-right p-2" }, "Actions"))),
        React.createElement("tbody", null,
          filtered.map(function (key) {
            return React.createElement(React.Fragment, { key: key.id },
              React.createElement("tr", { className: "border-b hover:bg-gray-50" },
                React.createElement("td", { className: "p-2 font-medium" }, key.name),
                React.createElement("td", { className: "p-2" },
                  React.createElement("span", { className: "text-xs bg-gray-100 px-1.5 py-0.5 rounded" }, key.provider)),
                React.createElement("td", { className: "p-2" },
                  React.createElement("code", { className: "text-xs bg-gray-100 px-1 py-0.5 rounded" },
                    (key.api_key_masked || "••••••••"))),
                React.createElement("td", { className: "p-2" },
                  React.createElement("button", { onClick: function () { toggleKey(key.id, key.is_active); },
                    className: "text-xs px-2 py-0.5 rounded " + (key.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") },
                    key.is_active ? "Active" : "Inactive")),
                React.createElement("td", { className: "p-2 text-right" },
                  React.createElement("button", { onClick: function () { testKey(key.id); }, disabled: testing[0] === key.id,
                    className: "text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 mr-1" },
                    testing[0] === key.id ? "Testing..." : "Test"),
                  React.createElement("button", { onClick: function () { delConfirm[1](key.id); },
                    className: "text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded hover:bg-red-100" }, "Delete"))),
              testResult[0] && testResult[0].id === key.id ?
              React.createElement("tr", { className: "bg-blue-50" },
                React.createElement("td", { colSpan: 5, className: "p-2 text-xs" },
                  "Test: " + (testResult[0].data?.status || "unknown") +
                  (testResult[0].data?.latency_ms ? " (" + testResult[0].data.latency_ms + "ms)" : "") +
                  (testResult[0].data?.error ? " Error: " + testResult[0].data.error : ""))) : null);
          })))),

    /* Config panel */
    config[0] ? React.createElement("div", { className: "border rounded bg-white p-4" },
      React.createElement("h2", { className: "font-semibold mb-2" }, "Provider Priority Config"),
      React.createElement("p", { className: "text-sm mb-1" }, "Default: " + (config[0].default_provider || "—")),
      React.createElement("p", { className: "text-sm mb-1" }, "Failover: " + (config[0].enable_failover ? "ON" : "OFF")),
      config[0].provider_priority ?
      React.createElement("div", { className: "flex flex-wrap gap-1 mt-2" },
        config[0].provider_priority.map(function (p, i) {
          return React.createElement("span", { key: p, className: "text-xs bg-gray-100 px-2 py-0.5 rounded" },
            "#" + (i + 1) + " " + p);
        })) : null) : null,

    /* Dashboard panel */
    dashboard[0] ? React.createElement("div", { className: "border rounded bg-white p-4" },
      React.createElement("h2", { className: "font-semibold mb-2" }, "Dashboard"),
      React.createElement("p", { className: "text-sm" }, "Total: " + dashboard[0].total_keys + " Active: " + dashboard[0].active_keys +
        " Today: " + dashboard[0].requests_today + " Failures: " + dashboard[0].failures_today)) : null,

    /* Delete confirmation modal */
    delConfirm[0] ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30 z-50" },
      React.createElement("div", { className: "bg-white p-4 rounded shadow-lg" },
        React.createElement("p", { className: "mb-3" }, "Delete this API key?"),
        React.createElement("button", { onClick: function () { deleteKey(delConfirm[0]); },
          className: "px-3 py-1 bg-red-600 text-white rounded text-sm mr-2" }, "Delete"),
        React.createElement("button", { onClick: function () { delConfirm[1](null); },
          className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,

    /* Add key modal */
    addOpen[0] ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30 z-50" },
      React.createElement("div", { className: "bg-white p-4 rounded shadow-lg w-96" },
        React.createElement("h2", { className: "text-lg font-bold mb-3" }, "Add API Key"),
        React.createElement("input", { placeholder: "Name", value: addName[0],
          onChange: function (e) { addName[1](e.target.value); },
          className: "border rounded px-2 py-1.5 text-sm w-full mb-2" }),
        React.createElement("select", { value: addProvider[0],
          onChange: function (e) { addProvider[1](e.target.value); },
          className: "border rounded px-2 py-1.5 text-sm w-full mb-2" },
          provOpts.map(function (p) {
            return React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name);
          })),
        React.createElement("input", { type: "password", placeholder: "API Key", value: addKeyVal[0],
          onChange: function (e) { addKeyVal[1](e.target.value); },
          className: "border rounded px-2 py-1.5 text-sm w-full mb-3" }),
        React.createElement("button", { onClick: addKey, disabled: saving[0],
          className: "px-3 py-1 bg-indigo-600 text-white rounded text-sm mr-2" },
          saving[0] ? "Saving..." : "Save"),
        React.createElement("button", { onClick: function () { addOpen[1](false); },
          className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,
  );
};

export default SuperAdminAIKeyManager;
