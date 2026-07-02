import React from "react";
import tokenManager from "../../utils/tokenManager";

var API = "/api/v1/ai-admin";

class SuperAdminAIKeyManager extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      providers: [], keys: [], error: null, loading: true,
      search: "", provFilter: "all", delConfirm: null,
      addOpen: false, addName: "", addProvider: "GOOGLE", addKeyVal: "",
      saving: false, testResult: null, testing: null, config: null,
    };
  }

  componentDidMount() {
    this.fetchAll();
  }

  fetchAll() {
    var self = this;
    self.setState({ loading: true, error: null });
    Promise.all([
      fetch(API + "/providers", { headers: tokenManager.createAuthHeaders() }),
      fetch(API + "/keys", { headers: tokenManager.createAuthHeaders() }),
      fetch(API + "/config", { headers: tokenManager.createAuthHeaders() }),
    ]).then(function (res) { return Promise.all(res.map(function (r) { return r.ok ? r.json() : null; })); })
      .then(function (d) {
        if (d[0]) self.setState({ providers: d[0].data || d[0].providers || d[0] || [] });
        if (d[1]) self.setState({ keys: d[1].data || d[1].keys || d[1] || [] });
        if (d[2]) self.setState({ config: d[2].data || d[2].config || d[2] || null });
      }).catch(function (e) { self.setState({ error: e && e.message || "error" }); })
      .finally(function () { self.setState({ loading: false }); });
  }

  toggleKey(id, cur) {
    var self = this;
    fetch(API + "/keys/" + id + "/status", {
      method: "PATCH",
      headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ is_active: !cur }),
    }).then(function (r) {
      if (r.ok) {
        self.setState(function (prev) {
          return { keys: prev.keys.map(function (k) { return k.id === id ? Object.assign({}, k, { is_active: !cur }) : k; }) };
        });
      }
    }).catch(function () {});
  }

  testKey(id) {
    var self = this;
    self.setState({ testing: id });
    fetch(API + "/keys/" + id + "/test", { method: "POST", headers: tokenManager.createAuthHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { self.setState({ testResult: { id: id, data: d && (d.data || d) } }); })
      .catch(function () {})
      .finally(function () { self.setState({ testing: null }); });
  }

  deleteKey(id) {
    var self = this;
    fetch(API + "/keys/" + id, { method: "DELETE", headers: tokenManager.createAuthHeaders() })
      .then(function () { self.setState(function (prev) { return { keys: prev.keys.filter(function (k) { return k.id !== id; }) }; }); })
      .catch(function () {});
    self.setState({ delConfirm: null });
  }

  addKey() {
    if (!this.state.addName || !this.state.addKeyVal) return;
    var self = this;
    self.setState({ saving: true });
    fetch(API + "/keys", {
      method: "POST",
      headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: self.state.addName, provider: self.state.addProvider, api_key: self.state.addKeyVal }),
    }).then(function (r) {
      if (r.ok) {
        return r.json().then(function (d) {
          var nk = d.data || d.key || d;
          if (nk) self.setState(function (prev) { return { keys: prev.keys.concat([nk]) }; });
          self.setState({ addOpen: false, addName: "", addProvider: "GOOGLE", addKeyVal: "" });
        });
      } else {
        return r.json().then(function (e) { self.setState({ error: e.message || e.detail || "add failed" }); });
      }
    }).catch(function (e) { self.setState({ error: e && e.message || "add failed" }); })
    .finally(function () { self.setState({ saving: false }); });
  }

  render() {
    var s = this.state;
    var filtered = s.keys.filter(function (k) {
      if (s.search) { var q = s.search.toLowerCase(); if (k.name.toLowerCase().indexOf(q) < 0 && k.provider.toLowerCase().indexOf(q) < 0) return false; }
      return s.provFilter === "all" || k.provider === s.provFilter;
    });
    var provOpts = s.providers.length > 0 ? s.providers : [];

    if (s.loading && s.keys.length === 0) {
      return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
        React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" }));
    }

    return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto space-y-4" },

      React.createElement("div", { className: "flex items-center justify-between" },
        React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", { onClick: this.fetchAll.bind(this), className: "px-3 py-1.5 border rounded text-sm" }, "Refresh"),
          React.createElement("button", { onClick: function () { this.setState({ addOpen: true }); }.bind(this), className: "px-3 py-1.5 bg-indigo-600 text-white rounded text-sm" }, "+ Add Key"))),

      s.error ? React.createElement("div", { className: "text-sm text-red-600 bg-red-50 p-2 rounded" }, s.error,
        React.createElement("button", { onClick: function () { this.setState({ error: null }); }.bind(this), className: "underline ml-2" }, "dismiss")) : null,

      React.createElement("div", { className: "grid grid-cols-3 gap-2" },
        React.createElement("div", { className: "border rounded p-2 bg-white" }, "Keys: " + s.keys.length),
        React.createElement("div", { className: "border rounded p-2 bg-white" }, "Providers: " + s.providers.length),
        React.createElement("div", { className: "border rounded p-2 bg-white" }, "Active: " + s.keys.filter(function (k) { return k.is_active; }).length)),

      React.createElement("div", { className: "flex gap-2" },
        React.createElement("input", { placeholder: "Search...", value: s.search, onChange: function (e) { this.setState({ search: e.target.value }); }.bind(this), className: "border rounded px-2 py-1 text-sm w-64" }),
        React.createElement("select", { value: s.provFilter, onChange: function (e) { this.setState({ provFilter: e.target.value }); }.bind(this), className: "border rounded px-2 py-1 text-sm" },
          React.createElement("option", { value: "all" }, "All"),
          provOpts.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name); }))),

      React.createElement("div", { className: "border rounded bg-white overflow-hidden" },
        React.createElement("table", { className: "w-full text-sm" },
          React.createElement("thead", null, React.createElement("tr", { className: "border-b bg-gray-50" },
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
                React.createElement("td", { className: "p-2" }, React.createElement("span", { className: "text-xs bg-gray-100 px-1 py-0.5 rounded" }, key.provider)),
                React.createElement("td", { className: "p-2" },
                  React.createElement("button", { onClick: function () { this.toggleKey(key.id, key.is_active); }.bind(this),
                    className: "text-xs px-2 py-0.5 rounded " + (key.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") }, key.is_active ? "Active" : "Inactive")),
                React.createElement("td", { className: "p-2 text-right" },
                  React.createElement("button", { onClick: function () { this.testKey(key.id); }.bind(this), className: "text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded mr-1" }, "Test"),
                  React.createElement("button", { onClick: function () { this.setState({ delConfirm: key.id }); }.bind(this), className: "text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded" }, "Delete")));
            })))),

      s.delConfirm ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30 z-50" },
        React.createElement("div", { className: "bg-white p-4 rounded shadow-lg" },
          React.createElement("p", { className: "mb-3" }, "Delete?"),
          React.createElement("button", { onClick: function () { this.deleteKey(s.delConfirm); }.bind(this), className: "px-3 py-1 bg-red-600 text-white rounded text-sm mr-2" }, "Delete"),
          React.createElement("button", { onClick: function () { this.setState({ delConfirm: null }); }.bind(this), className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,

      s.addOpen ? React.createElement("div", { className: "fixed inset-0 flex items-center justify-center bg-black/30 z-50" },
        React.createElement("div", { className: "bg-white p-4 rounded shadow-lg w-96" },
          React.createElement("h2", { className: "text-lg font-bold mb-3" }, "Add Key"),
          React.createElement("input", { placeholder: "Name", value: s.addName, onChange: function (e) { this.setState({ addName: e.target.value }); }.bind(this), className: "border rounded px-2 py-1 text-sm w-full mb-2" }),
          React.createElement("select", { value: s.addProvider, onChange: function (e) { this.setState({ addProvider: e.target.value }); }.bind(this), className: "border rounded px-2 py-1 text-sm w-full mb-2" },
            provOpts.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.display_name || p.name); })),
          React.createElement("input", { type: "password", placeholder: "API Key", value: s.addKeyVal, onChange: function (e) { this.setState({ addKeyVal: e.target.value }); }.bind(this), className: "border rounded px-2 py-1 text-sm w-full mb-3" }),
          React.createElement("button", { onClick: this.addKey.bind(this), className: "px-3 py-1 bg-indigo-600 text-white rounded text-sm mr-2" }, s.saving ? "Saving..." : "Save"),
          React.createElement("button", { onClick: function () { this.setState({ addOpen: false }); }.bind(this), className: "px-3 py-1 border rounded text-sm" }, "Cancel"))) : null,
    );
  }
}

export default SuperAdminAIKeyManager;
