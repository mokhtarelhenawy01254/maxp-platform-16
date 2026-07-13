import React from "react";
import { Navigate, Routes, Route } from "react-router-dom";

const ConversationsRouter: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/conversations"
        element={<Navigate to="/facebook-inbox" replace />}
      />

      <Route
        path="/conversations-improved"
        element={<Navigate to="/facebook-inbox" replace />}
      />
    </Routes>
  );
};

export default ConversationsRouter;
