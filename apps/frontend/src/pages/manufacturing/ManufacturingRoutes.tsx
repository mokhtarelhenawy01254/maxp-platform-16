import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ManufacturingDashboardPage from './ManufacturingDashboardPage';
import ManufacturingBomsPage from './boms/ManufacturingBomsPage';
import ManufacturingOrdersPage from './orders/ManufacturingOrdersPage';
import ManufacturingOrderDetailPage from './orders/ManufacturingOrderDetailPage';
import ManufacturingReportsPage from './reports/ManufacturingReportsPage';
import ManufacturingSettingsPage from './settings/ManufacturingSettingsPage';

export const ManufacturingRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ManufacturingDashboardPage />} />
      <Route path="/orders" element={<ManufacturingOrdersPage />} />
      <Route path="/orders/:id" element={<ManufacturingOrderDetailPage />} />
      <Route path="/boms" element={<ManufacturingBomsPage />} />
      <Route path="/reports" element={<ManufacturingReportsPage />} />
      <Route path="/settings" element={<ManufacturingSettingsPage />} />
      <Route path="*" element={<Navigate to="/manufacturing" replace />} />
    </Routes>
  );
};

export default ManufacturingRoutes;
