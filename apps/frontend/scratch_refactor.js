const fs = require('fs');

const appPath = 'src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

const customerRoutesContent = `import React from 'react';
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
`;

const storeRoutesContent = `import React from 'react';
import { Route, Navigate } from 'react-router-dom';
const Layout = React.lazy(() => import('../components/layout/Layout'));

const StoreSettings = React.lazy(() => import('../pages/settings/StoreSettings'));
const ProductPageConversionSettingsPage = React.lazy(() => import('../pages/settings/ProductPageConversionSettingsPage'));
const StoreOffersBundlesSettingsPage = React.lazy(() => import('../pages/settings/StoreOffersBundlesSettingsPage'));
const StoreGrowthWidgetsSettingsPage = React.lazy(() => import('../pages/settings/StoreGrowthWidgetsSettingsPage'));
const StoreSellingModesSettingsPage = React.lazy(() => import('../pages/settings/StoreSellingModesSettingsPage'));
const StoreReviewsSocialProofSettingsPage = React.lazy(() => import('../pages/settings/StoreReviewsSocialProofSettingsPage'));
const StorefrontVisualEditorPage = React.lazy(() => import('../pages/settings/StorefrontVisualEditorPage'));
const StorePages = React.lazy(() => import('../pages/settings/StorePages'));
const StorefrontClaritySettings = React.lazy(() => import('../pages/settings/StorefrontClaritySettings'));
const CodDepositSettings = React.lazy(() => import('../pages/settings/CodDepositSettings'));

export const StorefrontRoutes = [
  <Route key="store-settings-redir" path="/store-settings" element={<Navigate to="/settings/store?tab=branches" replace />} />,
  <Route key="settings-store" path="/settings/store" element={<Layout><StoreSettings /></Layout>} />,
  <Route key="settings-store-prod-conv" path="/settings/store/product-conversion" element={<Layout><ProductPageConversionSettingsPage /></Layout>} />,
  <Route key="settings-store-offers" path="/settings/store/offers-bundles" element={<Layout><StoreOffersBundlesSettingsPage /></Layout>} />,
  <Route key="settings-store-growth" path="/settings/store/growth-widgets" element={<Layout><StoreGrowthWidgetsSettingsPage /></Layout>} />,
  <Route key="settings-store-selling" path="/settings/store/selling-modes" element={<Layout><StoreSellingModesSettingsPage /></Layout>} />,
  <Route key="settings-store-reviews" path="/settings/store/reviews-social-proof" element={<Layout><StoreReviewsSocialProofSettingsPage /></Layout>} />,
  <Route key="settings-storefront-redir" path="/settings/storefront/*" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-storefront-prev" path="/settings/storefront-preview/*" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-storefront-sec" path="/settings/storefront/sections-editor" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-storefront-edit" path="/settings/storefront/editor" element={<Layout fullWidth><StorefrontVisualEditorPage /></Layout>} />,
  <Route key="home-builder" path="/home-builder" element={<Layout fullWidth><StorefrontVisualEditorPage /></Layout>} />,
  <Route key="settings-store-pages" path="/settings/store-pages" element={<Layout><StorePages /></Layout>} />,
  <Route key="settings-prod-img" path="/settings/product-images" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-checkout" path="/settings/checkout" element={<Navigate to="/settings/store?tab=checkout" replace />} />,
  <Route key="settings-clarity" path="/settings/clarity" element={<Layout><StorefrontClaritySettings /></Layout>} />,
  <Route key="settings-cod" path="/settings/cod-deposit" element={<Layout><CodDepositSettings /></Layout>} />,
  <Route key="settings-sf-tools" path="/settings/storefront/tools" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-sf-studio" path="/settings/storefront/studio" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-sf-studio-tpl" path="/settings/storefront/studio/templates" element={<Navigate to="/marketplace/themes" replace />} />,
  <Route key="settings-sf-studio-foot" path="/settings/storefront/studio/footers" element={<Navigate to="/settings/store?tab=footer" replace />} />,
  <Route key="settings-sf-shop" path="/settings/storefront/shop-studio" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-sf-shop-tpl" path="/settings/storefront/shop-studio/templates" element={<Navigate to="/marketplace/themes" replace />} />,
  <Route key="settings-sf-studio-shop" path="/settings/storefront/studio/shop" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-sf-studio-shop-tpl" path="/settings/storefront/studio/shop/templates" element={<Navigate to="/marketplace/themes" replace />} />,
  <Route key="settings-sf-tools-leg" path="/settings/storefront/tools-legacy" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-sf-layout" path="/settings/storefront/layout-studio" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-sf-struct" path="/settings/storefront/structure-manager" element={<Navigate to="/settings/storefront/editor" replace />} />,
  <Route key="settings-conv-tools" path="/settings/conversion-tools" element={<Navigate to="/settings/store?tab=promotion" replace />} />
];
`;

fs.mkdirSync('src/routes', { recursive: true });
fs.writeFileSync('src/routes/CustomerRoutes.tsx', customerRoutesContent);
fs.writeFileSync('src/routes/StorefrontRoutes.tsx', storeRoutesContent);

console.log('Files created');
