import React from 'react';
import { Route, Navigate } from 'react-router-dom';

/**
 * ARCHITECTURAL NOTICE:
 * All storefront and settings routes are registered directly and centrally in `App.tsx`.
 * Do not declare routes here without importing them in `App.tsx`.
 */

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
const PostPurchaseOfferBuilderPage = React.lazy(() => import('../pages/marketing/PostPurchaseOfferBuilderPage'));

export const StorefrontRoutes = [
  <Route key="store-settings-redir" path="/store-settings" element={<Navigate to="/settings/store?tab=branches" replace />} />,
  <Route key="settings-store" path="/settings/store" element={<Layout><StoreSettings /></Layout>} />,
  <Route key="settings-post-purchase-offer" path="/settings/post-purchase-offer" element={<Layout><PostPurchaseOfferBuilderPage /></Layout>} />,
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
  <Route key="settings-conv-tools" path="/settings/conversion-tools" element={<Navigate to="/settings/store/tools" replace />} />,
  <Route key="settings-volume-discounts" path="/settings/volume-discounts" element={<Navigate to="/settings/store-promotion" replace />} />
];
