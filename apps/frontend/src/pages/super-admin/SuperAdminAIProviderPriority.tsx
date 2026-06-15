import React from "react";

const SuperAdminAIProviders = React.lazy(() => import("./SuperAdminAIProviders"));

const SuperAdminAIProviderPriority = () => (
  <SuperAdminAIProviders initialTab="priority" standalonePriority />
);

export default SuperAdminAIProviderPriority;
