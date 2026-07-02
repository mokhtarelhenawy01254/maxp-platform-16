import React from "react";

const SuperAdminAIKeyManager = () => {
  var a = React.useState(0);
  var data = React.useState(null);
  var loading = React.useState(true);

  React.useEffect(function () {
    a[1](1);
    fetch("/api/v1/ai-admin/providers", { headers: { Authorization: "Bearer " + (localStorage.getItem("accessToken") || "") } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { data[1](d); })
      .finally(function () { loading[1](false); });
  }, []);

  return React.createElement("div", { className: "p-4" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    React.createElement("p", null, "Status: " + (a[0] ? "Working" : "Loading")),
    React.createElement("p", null, "Data: " + (data[0] ? JSON.stringify(data[0]).substring(0, 100) : (loading[0] ? "loading..." : "none"))),
  );
};

export default SuperAdminAIKeyManager;
