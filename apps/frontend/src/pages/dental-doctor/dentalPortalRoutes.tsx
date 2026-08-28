import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { getPortalToken } from "./shared";
import DentalPortalLayout from "./DentalPortalLayout";
import DentalPortalLoginPage from "./DentalPortalLoginPage";
import DentalPortalDashboardPage from "./DentalPortalDashboardPage";
import DentalPortalCatalogPage from "./DentalPortalCatalogPage";
import DentalPortalCartPage from "./DentalPortalCartPage";
import DentalPortalNewOrderPage from "./DentalPortalNewOrderPage";
import DentalPortalCasesPage from "./DentalPortalCasesPage";
import DentalPortalCaseDetailPage from "./DentalPortalCaseDetailPage";
import DentalPortalInvoicesPage from "./DentalPortalInvoicesPage";

const RequireDentalAuth: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  if (!getPortalToken()) {
    return <Navigate to="/dental-portal/login" replace />;
  }
  return <>{children}</>;
};

const DentalPortalIndex: React.FC = () => {
  const token = getPortalToken();
  return (
    <Navigate
      to={token ? "/dental-portal/dashboard" : "/dental-portal/login"}
      replace
    />
  );
};

export const DentalPortalRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<DentalPortalIndex />} />
      <Route path="login" element={<DentalPortalLoginPage />} />
      <Route element={<DentalPortalLayout />}>
        <Route
          path="dashboard"
          element={
            <RequireDentalAuth>
              <DentalPortalDashboardPage />
            </RequireDentalAuth>
          }
        />
        <Route
          path="catalog"
          element={
            <RequireDentalAuth>
              <DentalPortalCatalogPage />
            </RequireDentalAuth>
          }
        />
        <Route
          path="new-order"
          element={
            <RequireDentalAuth>
              <DentalPortalNewOrderPage />
            </RequireDentalAuth>
          }
        />
        <Route
          path="cart"
          element={
            <RequireDentalAuth>
              <DentalPortalCartPage />
            </RequireDentalAuth>
          }
        />
        <Route
          path="cases"
          element={
            <RequireDentalAuth>
              <DentalPortalCasesPage />
            </RequireDentalAuth>
          }
        />
        <Route
          path="cases/:id"
          element={
            <RequireDentalAuth>
              <DentalPortalCaseDetailPage />
            </RequireDentalAuth>
          }
        />
        <Route
          path="invoices"
          element={
            <RequireDentalAuth>
              <DentalPortalInvoicesPage />
            </RequireDentalAuth>
          }
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to="/dental-portal" replace />}
      />
    </Routes>
  );
};

export default DentalPortalRoutes;