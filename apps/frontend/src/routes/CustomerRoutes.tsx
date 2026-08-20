import React from 'react';
import { Route } from 'react-router-dom';
import { PermissionProtectedRoute } from '../components/protection/CompanyProtectedRoute';

const Layout = React.lazy(() => import('../components/layout/Layout'));

const CustomerList = React.lazy(() => import('../pages/customers/CustomerList'));
const CustomerCreate = React.lazy(() => import('../pages/customers/CustomerCreate'));
const LeadsList = React.lazy(() => import('../pages/customers/LeadsList'));
const CustomerWhatsAppNotify = React.lazy(() => import('../pages/customers/CustomerWhatsAppNotify'));
const CustomerBirthdayWhatsAppNotify = React.lazy(() => import('../pages/customers/CustomerBirthdayWhatsAppNotify'));
const CustomerOccasionsWhatsAppNotify = React.lazy(() => import('../pages/customers/CustomerOccasionsWhatsAppNotify'));
const CustomerDetails = React.lazy(() => import('../pages/customers/CustomerDetails'));
const CustomerEdit = React.lazy(() => import('../pages/customers/CustomerEdit'));
const CashbackSettings = React.lazy(() => import('../pages/customers/CashbackSettings'));
const LoyaltyPrograms = React.lazy(() => import('../pages/customers/LoyaltyPrograms'));
const LoyaltyTiers = React.lazy(() => import('../pages/customers/LoyaltyTiers'));
const LoyaltyMembers = React.lazy(() => import('../pages/customers/LoyaltyMembers'));
const LoyaltyAnalytics = React.lazy(() => import('../pages/customers/LoyaltyAnalytics'));
const CustomerPointsCenter = React.lazy(() => import('../pages/customers/CustomerPointsCenter'));
const CustomerSegments = React.lazy(() => import('../pages/customers/CustomerSegments'));
const CustomerWalletRouteEntry = React.lazy(() => import('../pages/wallet/WalletRouteEntry'));

export const CustomerRoutes = [
  <Route key="customer-list" path="/customers" element={<PermissionProtectedRoute requiredPermissions={['customers.view']}><Layout><CustomerList /></Layout></PermissionProtectedRoute>} />,
  <Route key="customer-new" path="/customers/new" element={<PermissionProtectedRoute requiredPermissions={['customers.view']}><Layout><CustomerCreate /></Layout></PermissionProtectedRoute>} />,
  <Route key="leads" path="/leads" element={<Layout><LeadsList /></Layout>} />,
  <Route key="customer-wa-notify" path="/customers/whatsapp-notify" element={<PermissionProtectedRoute requiredPermissions={['customers.view']}><Layout><CustomerWhatsAppNotify /></Layout></PermissionProtectedRoute>} />,
  <Route key="customer-bday-notify" path="/customers/birthday-whatsapp-notify" element={<PermissionProtectedRoute requiredPermissions={['customers.view']}><Layout><CustomerBirthdayWhatsAppNotify /></Layout></PermissionProtectedRoute>} />,
  <Route key="customer-occ-notify" path="/customers/occasions-notify" element={<PermissionProtectedRoute requiredPermissions={['customers.view']}><Layout><CustomerOccasionsWhatsAppNotify /></Layout></PermissionProtectedRoute>} />,
  <Route key="customer-details" path="/customers/:id" element={<PermissionProtectedRoute requiredPermissions={['customers.view']}><Layout><CustomerDetails /></Layout></PermissionProtectedRoute>} />,
  <Route key="customer-edit" path="/customers/:id/edit" element={<PermissionProtectedRoute requiredPermissions={['customers.view']}><Layout><CustomerEdit /></Layout></PermissionProtectedRoute>} />,
  <Route key="customer-wallet" path="/wallet" element={<Layout><CustomerWalletRouteEntry /></Layout>} />,
  <Route key="customer-cashback" path="/customers/cashback" element={<Layout><CashbackSettings /></Layout>} />,
  <Route key="customer-loyalty-prog" path="/customers/loyalty-programs" element={<Layout><LoyaltyPrograms /></Layout>} />,
  <Route key="customer-loyalty-tier" path="/customers/loyalty-tiers" element={<Layout><LoyaltyTiers /></Layout>} />,
  <Route key="customer-loyalty-memb" path="/customers/loyalty-members" element={<Layout><LoyaltyMembers /></Layout>} />,
  <Route key="customer-loyalty-anal" path="/customers/loyalty-analytics" element={<Layout><LoyaltyAnalytics /></Layout>} />,
  <Route key="customer-points" path="/customers/points-center" element={<Layout><CustomerPointsCenter /></Layout>} />,
  <Route key="customer-segments" path="/customers/segments" element={<Layout><CustomerSegments /></Layout>} />
];
