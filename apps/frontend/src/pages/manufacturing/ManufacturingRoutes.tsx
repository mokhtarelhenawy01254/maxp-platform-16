import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ManufacturingDashboardPage from './ManufacturingDashboardPage';
import ManufacturingBomsPage from './boms/ManufacturingBomsPage';
import ManufacturingOrdersPage from './orders/ManufacturingOrdersPage';
import ManufacturingOrderDetailPage from './orders/ManufacturingOrderDetailPage';
import CustomerOrdersListPage from './customerOrders/CustomerOrdersListPage';
import CustomerOrderDetailPage from './customerOrders/CustomerOrderDetailPage';
import PartnerFactoriesPage from './partner-factories/PartnerFactoriesPage';
import ManufacturingReportsPage from './reports/ManufacturingReportsPage';
import ManufacturingSettingsPage from './settings/ManufacturingSettingsPage';
import FabricCalculatorPage from './fabric/FabricCalculatorPage';
import FactoryMediaReviewPage from './reviews/FactoryMediaReviewPage';

export const ManufacturingRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<ManufacturingDashboardPage />} />
      <Route path="customer-orders" element={<CustomerOrdersListPage />} />
      <Route path="customer-orders/:id" element={<CustomerOrderDetailPage />} />
      <Route path="orders" element={<ManufacturingOrdersPage />} />
      <Route path="orders/:id" element={<ManufacturingOrderDetailPage />} />
      <Route path="partner-factories" element={<PartnerFactoriesPage />} />
      <Route path="reviews" element={<FactoryMediaReviewPage />} />
      <Route path="boms" element={<ManufacturingBomsPage />} />
      <Route path="fabric-calculator" element={<FabricCalculatorPage />} />
      <Route path="reports" element={<ManufacturingReportsPage />} />
      <Route path="settings" element={<ManufacturingSettingsPage />} />
      <Route path="*" element={<Navigate to="/manufacturing" replace />} />
    </Routes>
  );
};

export default ManufacturingRoutes;
