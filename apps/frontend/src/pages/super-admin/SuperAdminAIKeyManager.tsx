import React from "react";
import { Button } from "../../components/ui/button";

const SuperAdminAIKeyManager = () => {
  var a = React.useState(0);
  var providers = React.useState([]);
  var keys = React.useState([]);
  var error = React.useState(null);
  var loading = React.useState(true);

  React.useEffect(function () {
    a[1](1);
    fetch("/api/v1/ai-admin/providers", {
      headers: { Authorization: "Bearer " + (localStorage.getItem("accessToken") || "") }
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { providers[1](d && d.data ? d.data : []); })
      .catch(function (e) { error[1](e.message); })
      .finally(function () { loading[1](false); });
  }, []);

  return React.createElement("div", { className: "p-4" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    React.createElement(Button, { onClick: function () { a[1](a[0] + 1); } }, "Count: " + a[0]),
    React.createElement("p", null, "Providers: " + providers[0].length + " Keys: " + keys[0].length),
  );
};

export default SuperAdminAIKeyManager;
