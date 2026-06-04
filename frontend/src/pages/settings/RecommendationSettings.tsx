import React from "react";
import { Navigate } from "react-router-dom";

const RecommendationSettings: React.FC = () => (
  <Navigate to="/my-apps/conversion-suite/settings?focus=upsell&section=manual-links" replace />
);

export default RecommendationSettings;
