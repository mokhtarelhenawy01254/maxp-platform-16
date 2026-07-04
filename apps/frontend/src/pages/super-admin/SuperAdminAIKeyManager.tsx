import React from "react";

function SuperAdminAIKeyManager() {
  return React.createElement("div", { className: "p-4 max-w-[1440px] mx-auto" },
    React.createElement("h1", { className: "text-2xl font-bold mb-4" }, "AI Key Manager"),
    React.createElement(KeyManagerContent, null));
}

function KeyManagerContent() {
  var providersRef = React.useRef([]);
  var keysRef = React.useRef([]);
  var errorRef = React.useRef(null);
  var rerender = React.useReducer(function (x) { return x + 1; }, 0);
  var done = rerender[0] > 0;
  var forceUpdate = rerender[1];

  React.useEffect(function () {
    var cancelled = false;
    var t = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";
    var h = { Authorization: "Bearer " + t };
    Promise.all([
      fetch("/api/v1/ai-admin/providers", { headers: h }).then(function (r) { return r.ok ? r.json() : []; }),
      fetch("/api/v1/ai-admin/keys", { headers: h }).then(function (r) { return r.ok ? r.json() : []; }),
    ]).then(function (d) {
      if (!cancelled) {
        providersRef.current = Array.isArray(d[0]) ? d[0] : [];
        keysRef.current = Array.isArray(d[1]) ? d[1] : [];
        forceUpdate();
      }
    }, function (err) {
      if (!cancelled) {
        errorRef.current = err;
        forceUpdate();
      }
    });
    return function () { cancelled = true; };
  }, []);

  if (errorRef.current) {
    return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
      React.createElement("div", { className: "text-red-500 text-center" },
        React.createElement("p", null, "Failed to load AI keys. Please try again.")));
  }

  if (!done) {
    return React.createElement("div", { className: "flex items-center justify-center min-h-[400px]" },
      React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" }));
  }

  return React.createElement("div", null,
    React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
      React.createElement("div", { className: "border rounded p-3 bg-white shadow-sm" },
        React.createElement("p", { className: "text-xs text-gray-500" }, "Providers"),
        React.createElement("p", { className: "text-xl font-bold" }, providersRef.current.length)),
      React.createElement("div", { className: "border rounded p-3 bg-white shadow-sm" },
        React.createElement("p", { className: "text-xs text-gray-500" }, "Keys"),
        React.createElement("p", { className: "text-xl font-bold" }, keysRef.current.length)),
      React.createElement("div", { className: "border rounded p-3 bg-white shadow-sm" },
        React.createElement("p", { className: "text-xs text-gray-500" }, "Active"),
        React.createElement("p", { className: "text-xl font-bold" }, keysRef.current.filter(function (k) { return k.is_active; }).length)),
    ),
    React.createElement("div", { className: "border rounded bg-white overflow-hidden" },
      React.createElement("table", { className: "w-full text-sm" },
        React.createElement("thead", null,
          React.createElement("tr", { className: "border-b bg-gray-50" },
            React.createElement("th", { className: "text-left p-2" }, "Name"),
            React.createElement("th", { className: "text-left p-2" }, "Provider"),
            React.createElement("th", { className: "text-left p-2" }, "Status"))),
        React.createElement("tbody", null, keysRef.current.length === 0 ?
          React.createElement("tr", null, React.createElement("td", { colSpan: 3, className: "p-4 text-center text-gray-400" }, "No keys")) :
          keysRef.current.slice(0, 20).map(function (k) {
            return React.createElement("tr", { key: k.id, className: "border-b hover:bg-gray-50" },
              React.createElement("td", { className: "p-2 font-medium" }, k.name),
              React.createElement("td", { className: "p-2" }, React.createElement("span", { className: "text-xs bg-gray-100 px-1.5 py-0.5 rounded" }, k.provider)),
              React.createElement("td", { className: "p-2" },
                React.createElement("span", { className: "text-xs px-2 py-0.5 rounded " + (k.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") }, k.is_active ? "Active" : "Inactive")));
          })))));
};

export default SuperAdminAIKeyManager;
