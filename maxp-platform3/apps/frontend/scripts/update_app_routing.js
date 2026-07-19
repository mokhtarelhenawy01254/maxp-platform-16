const fs = require('fs');
const path = require('path');

const appPath = path.join('h:', 'max_p_new', 'frontend', 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Add new imports
const newImports = `
// Phase 3: New Storefront Pages
const StorefrontShell = React.lazy(() => import('./storefront/layouts/StorefrontShell'));
const HomePage = React.lazy(() => import('./storefront/pages/HomePage'));
const ShopPage = React.lazy(() => import('./storefront/pages/ShopPage'));
const ProductPage = React.lazy(() => import('./storefront/pages/ProductPage'));
const CartPage = React.lazy(() => import('./storefront/pages/CartPage'));
const CheckoutPage = React.lazy(() => import('./storefront/pages/CheckoutPage'));
`;

// Insert new imports after 'const ModernLogin ...'
content = content.replace(/(const ModernLogin = React\.lazy\(\(\) => import\('\.\/pages\/auth\/ModernLogin'\)\);\r?\n)/, `$1\n${newImports}\n`);

// 2. Remove broken legacy imports
const importsToRemove = [
  /const StorefrontLayout = .*\n/g,
  /const StorefrontPageRuntime = .*\n/g,
  /const ComposableStorePreview = .*\n/g,
  /const StorePage = .*\n/g,
  /const HomepagePreview = .*\n/g,
  /const V3PreviewEngine = .*\n/g,
  /const ProductImageSettingsPage = .*\n/g,
  /const CheckoutSettingsPage = .*\n/g,
  /const ConversionToolsPage = .*\n/g,
  /const StorefrontDashboard = .*\n/g,
  /const UXSettingsPage = .*\n/g,
  /const ProductContentPage = .*\n/g,
  /const TechnicalSettingsPage = .*\n/g,
  /const StorefrontFeaturesSettings = .*\n/g,
  /const StorefrontClaritySettings = .*\n/g,
  /import {[^}]*HomepageSkeleton[^}]*} from '.\/components\/storefront\/StorefrontSkeleton';\r?\n/g,
];

importsToRemove.forEach(regex => {
  content = content.replace(regex, '');
});

// Remove Suspense fallbacks since we removed StorefrontSkeleton
content = content.replace(/<Suspense fallback=\{<[^>]+Skeleton \/>\}>/g, '<Suspense>');

// 3. Replace the routing block for Storefront
const newRouting = `            {/* Main Storefront Layout Wrapper */}
            <Route element={<StorefrontShell />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/products/:id" element={<ProductPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/shop/cart" element={<CartPage />} />
              <Route path="/shop/checkout" element={<CheckoutPage />} />
              <Route path="/about" element={<div className="container py-8">عن المتجر</div>} />
              <Route path="/contact" element={<div className="container py-8">اتصل بنا</div>} />
              <Route path="/faq" element={<div className="container py-8">الأسئلة الشائعة</div>} />
              <Route path="/blog" element={<div className="container py-8">المدونة</div>} />
              <Route path="/account/wallet" element={<WalletPageBilling />} />
              <Route path="/account/whatsapp" element={<CustomerWhatsApp />} />
              <Route path="/cart" element={<Navigate to="/shop/cart" replace />} />
              <Route path="/checkout" element={<Navigate to="/shop/checkout" replace />} />
              
              {/* Marketing & Landing Pages */}
              <Route path="/marketing" element={<MarketingLandingHub />} />
              <Route path="/marketing/:slug" element={<MarketingSectionLanding />} />
              <Route path="/lp/employees" element={<EmployeesLanding />} />
              <Route path="/start" element={<MainAdsLanding />} />
              <Route path="/lp/maxp" element={<MainAdsLanding />} />
            </Route>
`;

content = content.replace(/<Route element=\{<StorefrontLayout \/>\}>[\s\S]*?<\/Route>/, newRouting);

// Also replace the single occurrence of `<StorefrontLayout>...` interceptor
content = content.replace(/<StorefrontLayout>.*?<\/StorefrontLayout>/g, '<StorefrontShell><HomePage /></StorefrontShell>');

// Clean up dead routes
content = content.replace(/<Route path="\/home-no-layout".*?>\r?\n/g, '');
content = content.replace(/<Route path="\/settings\/homepage\/:id".*?\/>\r?\n/g, '');
content = content.replace(/<Route path="\/preview\/homepage\/:id".*?\/>\r?\n/g, '');
content = content.replace(/<Route path="\/preview\/engine\/\*".*?\/>\r?\n/g, '');
content = content.replace(/<Route path="\/settings\/storefront-features".*?\/>\r?\n/g, '');
content = content.replace(/<Route path="\/settings\/clarity".*?\/>\r?\n/g, '');

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.tsx updated successfully');
