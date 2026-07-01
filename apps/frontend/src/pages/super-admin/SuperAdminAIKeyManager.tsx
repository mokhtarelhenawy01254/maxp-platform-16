import React, { useState, useCallback, useEffect } from "react";
import tokenManager from "../../utils/tokenManager";

const SuperAdminAIKeyManager = () => {
  const [count, setCount] = useState(0);
  const auth = tokenManager.getAccessToken();
  
  const increment = useCallback(() => setCount(c => c + 1), []);
  
  useEffect(() => { document.title = `Count: ${count}`; }, [count]);

  return React.createElement("div", null,
    React.createElement("h1", null, "AI Key Manager - Test hooks+imports"),
    React.createElement("p", null, "Count: ", count),
    React.createElement("p", null, "Auth: ", auth ? "yes" : "no"),
    React.createElement("button", { onClick: increment }, "+1"),
  );
};

export default SuperAdminAIKeyManager;
