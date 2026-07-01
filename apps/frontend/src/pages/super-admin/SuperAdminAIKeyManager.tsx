import React from "react";

const SuperAdminAIKeyManager = () => {
  const [count, setCount] = React.useState(0);
  return React.createElement("div", null,
    React.createElement("h1", null, "AI Key Manager - Minimal Test"),
    React.createElement("p", null, "Count: ", count),
    React.createElement("button", { onClick: () => setCount(c => c + 1) }, "Increment"),
  );
};

export default SuperAdminAIKeyManager;
