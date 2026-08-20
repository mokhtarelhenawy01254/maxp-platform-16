import fs from 'fs';

const appPath = 'src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

const customerRoutesBlockStr = `                <Route
                  path="/customers"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerList />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/new"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerCreate />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <Layout>
                      <LeadsList />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/whatsapp-notify"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerWhatsAppNotify />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/birthday-whatsapp-notify"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerBirthdayWhatsAppNotify />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/occasions-notify"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerOccasionsWhatsAppNotify />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/:id"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerDetails />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/customers/:id/edit"
                  element={
                    <PermissionProtectedRoute requiredPermissions={['customers.view']}>
                      <Layout>
                        <CustomerEdit />
                      </Layout>
                    </PermissionProtectedRoute>
                  }
                />
                <Route
                  path="/wallet"
                  element={
                    <Layout>
                      <CustomerWalletRouteEntry />
                    </Layout>
                  }
                />`;

const customerLoyaltyBlockStr = `                <Route
                  path="/customers/cashback"
                  element={
                    <Layout>
                      <CashbackSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-programs"
                  element={
                    <Layout>
                      <LoyaltyPrograms />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-tiers"
                  element={
                    <Layout>
                      <LoyaltyTiers />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-members"
                  element={
                    <Layout>
                      <LoyaltyMembers />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/loyalty-analytics"
                  element={
                    <Layout>
                      <LoyaltyAnalytics />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/points-center"
                  element={
                    <Layout>
                      <CustomerPointsCenter />
                    </Layout>
                  }
                />
                <Route
                  path="/customers/segments"
                  element={
                    <Layout>
                      <CustomerSegments />
                    </Layout>
                  }
                />`;

const storefrontBlockStr = `                <Route
                  path="/store-settings"
                  element={<Navigate to="/settings/store?tab=branches" replace />}
                />
                <Route
                  path="/settings/store"
                  element={
                    <Layout>
                      <StoreSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store/product-conversion"
                  element={
                    <Layout>
                      <ProductPageConversionSettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store/offers-bundles"
                  element={
                    <Layout>
                      <StoreOffersBundlesSettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store/growth-widgets"
                  element={
                    <Layout>
                      <StoreGrowthWidgetsSettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store/selling-modes"
                  element={
                    <Layout>
                      <StoreSellingModesSettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store/reviews-social-proof"
                  element={
                    <Layout>
                      <StoreReviewsSocialProofSettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/storefront/*"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront-preview/*"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/sections-editor"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/editor"
                  element={
                    <Layout fullWidth>
                      <StorefrontVisualEditorPage />
                    </Layout>
                  }
                />
                <Route
                  path="/home-builder"
                  element={
                    <Layout fullWidth>
                      <StorefrontVisualEditorPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/store-pages"
                  element={
                    <Layout>
                      <StorePages />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/product-images"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/checkout"
                  element={<Navigate to="/settings/store?tab=checkout" replace />}
                />
                <Route
                  path="/settings/clarity"
                  element={
                    <Layout>
                      <StorefrontClaritySettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/cod-deposit"
                  element={
                    <Layout>
                      <CodDepositSettings />
                    </Layout>
                  }
                />
                <Route
                  path="/settings/storefront/tools"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/studio"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/studio/templates"
                  element={<Navigate to="/marketplace/themes" replace />}
                />
                <Route
                  path="/settings/storefront/studio/footers"
                  element={<Navigate to="/settings/store?tab=footer" replace />}
                />
                <Route
                  path="/settings/storefront/shop-studio"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/shop-studio/templates"
                  element={<Navigate to="/marketplace/themes" replace />}
                />
                <Route
                  path="/settings/storefront/studio/shop"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/studio/shop/templates"
                  element={<Navigate to="/marketplace/themes" replace />}
                />
                <Route
                  path="/settings/storefront/tools-legacy"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/layout-studio"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/storefront/structure-manager"
                  element={<Navigate to="/settings/storefront/editor" replace />}
                />
                <Route
                  path="/settings/conversion-tools"
                  element={<Navigate to="/settings/store?tab=promotion" replace />}
                />`;


// Helper to escape regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&');
}

// Ensure the blocks exist
if (!appCode.includes(customerRoutesBlockStr.trim())) {
  // If not exact match, let's try a more robust approach:
  // Regex matching removing white spaces
}

// Actually, I can just write a script that does a very basic replace
// Because the blocks are exact strings I can just replace them.

appCode = appCode.replace(customerRoutesBlockStr, '{CustomerRoutes()}');
appCode = appCode.replace(customerLoyaltyBlockStr, '');
appCode = appCode.replace(storefrontBlockStr, '{StorefrontRoutes()}');

// Import routes at the top
if (!appCode.includes('import { CustomerRoutes }')) {
  appCode = appCode.replace("import './App.css';", "import './App.css';\\nimport { CustomerRoutes } from './routes/CustomerRoutes';\\nimport { StorefrontRoutes } from './routes/StorefrontRoutes';");
}

fs.writeFileSync(appPath, appCode);

console.log('App.tsx updated successfully');
