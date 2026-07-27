# Infrastructure & Platform Bugs

> Domain-specific bug tracker for Prisma, auth, deployment, AI, billing, and general platform issues.

### [FIX] AI Sandbox Chat — Product List Rendered as Blank Lines (2026-06-09)
- **Description**: The AI agent sandbox chat (`/admin/ai-hub?tab=sandbox`) showed "المنتجات المتاحة حالياً عندنا هي:" followed by blank lines where product names should appear, even though the tool returned 20 products with correct names and the LLM response stored in the DB was correct.
- **Root Cause**: `filterChainOfThought()` in `ChatArea.tsx` contained a catch-all guard `if (trimmed.startsWith('*')) return false` that was intended to filter chain-of-thought reasoning lines. It stripped every markdown bullet list item (e.g. `* **Platform Sneakers** بسعر 499 جنيه.`), replacing them with empty strings and leaving visible blank lines in the rendered output.
- **Resolution**: Removed the catch-all `startsWith('*')` guard. The three specific chain-of-thought patterns (`* Role:`, `* Task:`, `* Thinking:`) are still filtered by their explicit guards above it.
- **Files Modified**: `frontend/src/pages/admin/ai-agent-sandbox/components/ChatArea.tsx`


### [FIX] AI Intent Classifier — CLASSIFIER_UNAVAILABLE Due to Missing Agent Model Key (2026-06-09)
- **Description**: The AI agent intent classifier returned `CLASSIFIER_UNAVAILABLE` for all messages, causing the pipeline to skip tool execution (product search never ran). The classifier would occasionally work when an active key happened to be selected, but most requests failed silently.
- **Root Cause**:
  1. Agent `agent_95qi23_24` had `preferredModel = 'deepseek-chat'` in its DB config. The classifier used this as the model for classification, but there was no active `ai_model_configs` entry for `deepseek-chat`, so `get_next_key()` returned nothing and the LLM client was `null`.
  2. Groq models `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` do not support the `json_schema` response format required by the classifier, causing 400 errors that tripped the circuit breaker.
  3. The Google key `cmo07mmy0464hjunrfksbjn4a` (which has a valid `gemini-2.5-flash` model config) was set to `keyType='COMPANY'` scoped to a different company, so it was filtered out for the test company.
- **Resolution**:
  1. Changed classifier to always use `gemini-2.5-flash` with `provider=None`, ignoring the agent's `preferredModel`/`preferredProvider` entirely — classification is infrastructure, not per-agent config.
  2. Changed Google key `cmo07mmy0464hjunrfksbjn4a` from `keyType='COMPANY'` → `keyType='CENTRAL'` so all companies can use it for classification.
- **Files Modified**: `apps/ai-service/src/intent/classifier.py`
- **DB Changes**: `ai_keys` — updated `keyType` on key `cmo07mmy0464hjunrfksbjn4a` to `CENTRAL`


### [UX/FIX] WooCommerce Product Import Shows Clear Bulk Selection Controls (2026-05-09)
- **Description**: The WooCommerce products import view needed a clearly visible `Select All` control next to the import action, while still keeping per-product selection available.
- **Root Cause**:
  1. The page relied on row-level checkboxes for one-by-one selection, but the bulk-selection affordance was not obvious enough in the filtered products workflow.
  2. Operators had no quick summary showing how many visible products were selected versus products already selected outside the active filter.
- **Resolution**:
  1. Added a clearer bulk-selection action beside the import button in `ProductsTab`.
  2. Added a live selection summary showing visible selected products and any selections hidden by the active filter.
- **Impact**:
  - Operators can now select all visible WooCommerce products faster without losing the option to pick products individually.
  - The selection state is clearer before triggering import, especially when using variation filters.
- **Files Modified**: `frontend/src/pages/woocommerce/components/ProductsTab.tsx`

### [UX/FIX] Marketplace Mobile Layout Harmonized For Narrow Screens (2026-05-09)
- **Description**: `/marketplace` felt cramped on narrow mobile widths, with uneven top-tab wrapping, crowded mobile chips, and a trial banner that could expose raw i18n keys instead of readable copy.
- **Root Cause**:
  1. The page relied on generic flex wrapping for primary marketplace tabs and mobile filter chips, which produced awkward line breaks on 320px-390px widths.
  2. Toolbar controls had no dedicated narrow-screen rhythm, so the search/sort/action stack looked dense compared with native-style mobile app lists.
  3. `Layout.tsx` used `t("billing.*") || fallback`, but missing i18n keys return the key string itself, so the fallback never rendered.
- **Resolution**:
  1. Added mobile-first marketplace hero, tab, toolbar, and chip-row styling so the page reads more like a native app surface on small screens.
  2. Split mobile chips into two horizontally scrollable rows: one for primary collections and one for categories.
  3. Added resilient translation fallback handling for the trial banner and tuned the banner to wrap cleanly on mobile.
- **Impact**:
  - Marketplace now keeps better spacing and hierarchy across narrow mobile viewports.
  - Trial users no longer see raw `billing.trialBanner` / `billing.upgradeNow` keys in the shell banner.
- **Files Modified**: `frontend/src/components/layout/Layout.tsx`, `frontend/src/pages/marketplace/Marketplace.tsx`, `frontend/src/styles/index.css`

### [FIX] Marketplace DB Search Referenced Catalog-Only `nameEn` Field (2026-04-29)
- **Description**: Searching `/api/v1/marketplace/apps` in production DB mode could return `500` with `Unknown argument nameEn` when a category and search term were present, e.g. `category=ECOMMERCE&search=c`.
- **Root Cause**:
    1. Production defaults `CATALOG_SOURCE` to `db`, so `getAllApps` builds a Prisma `marketplaceApp.findMany` filter directly against the `MarketplaceApp` schema.
    2. The DB-backed `MarketplaceApp` model has `name` and `description`, but `nameEn` is catalog metadata only and is not a persisted model field.
- **Resolution**:
    1. Removed the invalid `nameEn` filter from the DB-backed marketplace app search while keeping the file catalog search path unchanged.
    2. Added controller regression coverage for `CATALOG_SOURCE=db` with category/search filters to prevent Prisma query drift.
- **Impact**:
    - Marketplace app search no longer crashes in DB mode.
    - Catalog/file mode can still search catalog `nameEn` through `marketplaceCatalogService`.
- **Files Modified**: `backend/controller/marketplaceController.js`, `backend/tests/controller/marketplaceController.hybrid.test.js`

### [FIX] Deploy Storefront HTTPS Smoke Test Needed TLS SNI (2026-04-18)
- **Description**: GitHub Actions kept failing the post-reload wildcard storefront SEO verification even after the public `swan.maxp.online` storefront was already returning the correct tenant-specific `<title>` and canonical tags.
- **Root Cause**:
    1. The deploy workflow queried `https://127.0.0.1/shop` with only `Host: swan.maxp.online`, which is not enough for HTTPS vhost selection because Nginx chooses the certificate/server block using TLS SNI before it sees the HTTP `Host` header.
    2. That local probe could terminate on the default SSL server block and return the generic platform SPA shell, producing a false negative while the real public hostname path was healthy.
- **Resolution**:
    1. Updated `.github/workflows/deploy.yml` to use `curl --resolve "${TEST_HOST}:443:127.0.0.1" "https://${TEST_HOST}/shop"` for the Nginx smoke test.
    2. Kept the backend direct HTML probe in place so the workflow still distinguishes backend-shell regressions from Nginx routing regressions.
- **Impact**:
    - Deploy verification now matches real browser traffic for wildcard HTTPS storefronts.
    - Future storefront SEO failures in CI should point to actual routing/metadata regressions instead of local TLS host-selection artifacts.
- **Files Modified**: `.github/workflows/deploy.yml`

### [FIX] Storefront Product SEO Shell Was Selecting Missing Prisma Fields (2026-04-18)
- **Description**: Public wildcard product pages such as `https://swan.maxp.online/product/boot-swan` returned `500` even though the homepage, shop, and collections SEO shells were already healthy.
- **Root Cause**:
    1. `backend/controller/storefrontHtmlController.js` queried `prisma.product.findFirst(... select: { metaTitle, metaDescription })`, but the current `Product` Prisma model does not expose those fields.
    2. Prisma raised `Unknown field metaTitle for select statement on model Product`, which aborted the storefront HTML shell before it could inject fallback SEO tags.
- **Resolution**:
    1. Updated `backend/controller/storefrontHtmlController.js` to build the product `select` dynamically from the runtime Prisma `Product` field list so the storefront shell only requests fields the deployed client actually supports.
    2. Updated `backend/services/storefrontSeoService.js` to derive SEO overrides from `product.metadata.metaTitle`, `product.metadata.metaDescription`, or `product.metadata.seo.*` when those values exist, while keeping product-name/description fallback intact.
    3. Added regression coverage in `backend/tests/services/storefrontSeoService.test.js`.
- **Impact**:
    - Public product pages no longer fail with `500` during wildcard storefront HTML rendering.
    - Product SEO stays resilient even when schema/client versions do not provide dedicated product meta columns.
- **Files Modified**: `backend/controller/storefrontHtmlController.js`, `backend/services/storefrontSeoService.js`, `backend/tests/services/storefrontSeoService.test.js`

### [FIX] Wildcard Storefront SEO Shell Was Bypassed By Static SPA Fallback (2026-04-18)
- **Description**: Production storefront previews on wildcard subdomains such as `swan.maxp.online` kept returning the generic platform `<title>`/`og:*` tags even after the backend SEO controller shipped successfully.
- **Root Cause**:
    1. Wildcard Nginx storefront configs still used `try_files $uri $uri/ @storefront_spa;`, which allowed the built SPA shell to win before the backend SEO injection path for some HTML requests.
    2. `backend/middleware/globalSecurity.js` evaluated storefront HTML before subdomain extraction and returned `401` for anonymous tenant-shell requests like `/shop`, so even direct backend storefront probes could not reach the SEO controller.
    3. GitHub Actions reported a healthy deploy, but there was no post-reload verification that Nginx and the backend were actually serving company-specific metadata through the live storefront path.
- **Resolution**:
    1. Updated wildcard storefront server blocks in `nginx_configs/maxp.online.conf`, `nginx_configs/mokhtarelhenawy.online.conf`, and `mokhtarelhenawy.online.conf` so non-asset requests proxy directly to the backend storefront shell.
    2. Updated `backend/middleware/globalSecurity.js` to treat extensionless `GET` requests on tenant subdomains as public storefront-shell traffic, allowing the SEO HTML route to execute before any auth requirement.
    3. Extended `.github/workflows/deploy.yml` with a storefront SEO smoke test that captures backend/Nginx status codes and titles separately after reload, then fails the deployment if the route still returns `401`, keeps the generic title, or misses the canonical tag.
    4. Hardened the deploy workflow to relink the intended site files in `sites-enabled` and temporarily disable legacy loaded configs that still advertise the old combined apex+wildcard hostnames, with automatic restore if `nginx -t` fails.
- **Impact**:
    - Storefront HTML for wildcard tenants now consistently reaches the metadata injection layer.
    - Future regressions in production storefront SEO should fail the deployment immediately instead of surfacing later in Facebook/WhatsApp previews.
- **Files Modified**: `.github/workflows/deploy.yml`, `backend/middleware/globalSecurity.js`, `nginx_configs/maxp.online.conf`, `nginx_configs/mokhtarelhenawy.online.conf`, `mokhtarelhenawy.online.conf`

### [FIX] Deploy Artifact Copy & Runtime Logs Preservation (2026-04-11)
- **Description**: The deployment flow was hardened so repeated releases do not wipe staged frontend assets unexpectedly and the backend always has a writable `logs` directory before PM2 starts.
- **Root Cause**:
    1. `.github/workflows/deploy.yml` removed or moved frontend artifact directories during extraction, which made retries less idempotent and increased the chance of empty `dist` states between steps.
    2. Backend sync logic recreated `/var/www/backend2` from artifacts without consistently recreating `/var/www/backend2/logs`.
    3. `backend/deploy.sh` assumed the local runtime `logs` directory already existed before the process manager opened log files.
- **Resolution**:
    1. Updated `.github/workflows/deploy.yml` to copy frontend artifacts into the destination `dist` folder instead of destructive moves, exclude backend `logs` from rsync replacement, and recreate `/var/www/backend2/logs` after deployment.
    2. Updated root `deploy.sh` to provision `$DEPLOY_PATH/backend2/logs` on the remote host before file transfer.
    3. Updated `backend/deploy.sh` to run `mkdir -p logs` before Prisma generation and PM2 startup.
- **Impact**:
    - Frontend deploy retries are safer and less likely to leave an empty runtime `dist`.
    - Backend releases consistently preserve a valid log target for PM2 and application writes.
- **Files Modified**: `.github/workflows/deploy.yml`, `deploy.sh`, `backend/deploy.sh`

### [FIX] Production Media Integrity, Uploads 404 Semantics & HTTPS Delivery (2026-04-07)
- **Description**: Stabilized the production media surface after diagnosing broken `/uploads/...` references, false `401` responses for missing assets, and Facebook attachment failures caused by local/non-canonical media URLs.
- **Fixes**:
    - Enabled trusted proxy handling in `backend/server.js` and replaced the permissive static fallback with explicit upload-path resolution that returns a direct JSON `404` for missing files.
    - Hardened `production-facebook-fix.js` to convert local upload paths into public HTTPS URLs and to block outbound sends when the underlying file is missing.
    - Guarded `sendExistingImage` so the system no longer saves outbound image messages for assets that disappeared from disk.
    - Added and executed `backend/scripts/repair_media_integrity.js` to clean stale product and image-gallery references in production.
- **Impact**:
    - Missing uploads now fail accurately with `404`, not `401`.
    - External media consumers receive reachable HTTPS asset URLs.
    - Production media data was reconciled to zero missing product-upload references after repair.

### [FIX] Skill Management & PowerShell Compatibility (2026-03-19)
- **Description**: Cleaned up the agent's `skills` directory by removing the deprecated `browser_troubleshooter` skill.
- **Fixes**: Resolved a PowerShell alias conflict where `rmdir` (aliased to `Remove-Item`) was used with legacy CMD flags (`/s /q`), which caused a `ParameterBindingException`. Corrected to `Remove-Item -Recurse -Force`.
- **Impact**: Improved agent capability hygiene and fixed a potential automation failure on Windows environments.


### [FIX] Architecture Audit V2 - Broken Bridges (2026-03-19)
- **Description**: Addressed critical issues found in the post-token refinement architecture audit, specifically targeting "broken bridges" where data wasn't reaching components or legacy logic persisted.
- **Fixes**:
    - **BuyBox Functional Purity**: Removed residual CSS string inspection (`includes("bg-black")`) from `HeadlessBuyBox.tsx`. The component now strictly respects boolean flags (`showCartIcon`) and explicit strings (`buttonText`).
    - **Gallery Token Propagation**: Passed `themeTokens.gallery` to `HeadlessProductGallery` across `LayoutStandard`, `LayoutEditorial`, and `LayoutAdvanced` ensuring gallery styles apply.
    - **Variant-Aware Images in Standard/Advanced**: Added `useMemo` logic to parse and display variant-specific images when a user selects a variant in `LayoutStandard` and `LayoutAdvanced`, matching the behavior of `LayoutEditorial`.
    - **Linting**: Removed unused `themeTokens` warning in `LayoutStandardUntitled`.
- **Impact**: The Design Tokens system is now fully integrated into the gallery and buybox across all primary layouts, and the visual feedback for variant selection is consistent across themes.


### [FIX] Translation Sync & Merge Conflicts
- **Date**: 2026-03-17
- **Description**: Resolved `backend/server.js` Git merge conflict by keeping the new Agent Workspace Automation cron job alongside the optimized WhatsApp notification queue processor (30s interval).
- **Localization**: Synced English and Arabic translation files mapping to correct locales to prevent missing translation keys during CI build.
- **Files Modified**: `backend/server.js`, `frontend/src/locales/ar/translation.json`, `frontend/src/locales/en/translation.json`


### [FIX] Task Management System - Pagination & Modal Stability
- **Date**: 2026-03-17
- **Description**: Resolved performance issues in the task management suite when dealing with large datasets and fixed UI state propagation in task modals.
- **Fixes**:
    - **Backend**: Implemented server-side pagination (`page`, `limit`) in `taskController.js` to prevent memory-exhaustion when fetching thousands of tasks.
    - **Backend**: Enhanced user relation queries to include `phone` data and prioritized `COMPANY_ADMIN` sorting in task selection lists.
    - **Frontend**: Integrated `FilterSidebar` for advanced discovery and modularized task details into `ProjectDetailsModal` and `EditProjectModal`.
    - **Frontend**: Fixed a critical payload bug in `updateTask` where read-only properties (e.g., `projectName`) were being sent back to the server, causing validation failures.
- **Files Modified**: `backend/controller/taskController.js`, `frontend/src/pages/tasks/Tasks.tsx`


## Recent Resolved Issues (2026-03-17)


### [FIX] EnhancedOrderModal Crash (Rendered fewer hooks than expected)
- **Date**: 2026-03-17
- **Description**: The `/orders/workspace` page crashed when attempting to open the order details modal with the error `Uncaught Error: Rendered fewer hooks than expected`.
- **Root Cause**: An early return `if (!isOpen || !order) return null;` in `EnhancedOrderModal.tsx` was placed *before* a `useState` and `useEffect` hook pair (used for fetching turbo governments). React requires hooks to be called in the exact same order on every render.
- **Resolution**: Moved the early return statement safely below all hook declarations in the component file.
- **Files Modified**: `frontend/src/components/orders/EnhancedOrderModal.tsx`


## Recent Resolved Issues (2026-03-16)


### [FIX] Prisma Early Loading & Circular Dependencies in Admin Controller
- **Date**: 2026-03-16
- **Description**: The `adminCompnayController.js` was attempting to load the shared Prisma client at the module level, which sometimes caused crashes during server startup if database services weren't fully initialized.
- **Resolution**: Refactored `adminCompnayController.js` to use dynamic loading via `getSharedPrismaClient()` within individual request handlers.
- **Files Modified**: `backend/controller/adminCompnayController.js`


### [SECURITY] Comprehensive Security Audit (19 Critical/High Issues)
- **Date**: 2026-03-16
- **Description**: A deep-dive security audit identified 19 vulnerabilities across the system, including JWT secret exposure, bypasses in WhatsApp endpoints, and open CORS policies.
- **Status**: Audit complete. Findings documented in `SECURITY_ISSUES.md`. Immediate fixes for JWT Fallback and Debug Routes are in progress.
- **Reference**: [SECURITY_ISSUES.md](file:///h:/max_p_new/SECURITY_ISSUES.md)


### [DEVOPS] NPM Peer-Dependency Conflict (react-image-lightbox)
- **Date**: 2026-03-16
- **Description**: CI `npm ci` failed with ERESOLVE because `react-image-lightbox@5.1.4` requires React 16/17 while the project runs React 18.
- **Resolution**: Added root `.npmrc` with `legacy-peer-deps=true` to allow installation without downgrading React. Consider swapping the library to a React 18–compatible fork in a future cleanup.
- **Files Modified**: `.npmrc`


## Recent Resolved Issues (2026-03-15)


### [FIX] Redundant 401 Console Errors on Auth Pages
- **Date**: 2026-03-09
- **Description**: The `AuthProvider` was making `/auth/me` requests even when the JWT was already expired, leading to red 401 errors in the developer console.
- **Resolution**: Implemented a local JWT expiration check (`payload.exp`) in `useAuthSimple.tsx` to skip the server request if the token is already expired.
- **Files Modified**: `frontend/src/hooks/useAuthSimple.tsx`


## Recent Resolved Issues (2026-03-15)


## Recent Resolved Issues (2026-03-14)


### [FEATURE] 7-Day Free Trial Implementation
- **Date**: 2026-03-14
- **Description**: Implemented a 7-day PRO trial for all new users.
- **Resolution**:
    1. Modified `billingService.js` to support `trialDays`.
    2. Updated `authController.js` to create a `TRIAL` subscription upon registration.
    3. Enhanced `Layout.tsx` with a globally visible trial banner.
- **Files Modified**: `backend/services/billingService.js`, `backend/controller/authController.js`, `frontend/src/components/layout/Layout.tsx`


## Recent Resolved Issues (2026-03-13)
- **Description**: Requests to `/api/v1/storefront-settings` returned 500 with Prisma error `"Engine is not yet connected"`.
- **Root Cause**: `storefrontSettingsController` used the sync `getSharedPrismaClient()` before a guaranteed connection was established.
- **Resolution**: Switched controller access to `getSharedPrismaClientAsync()` and awaited initialization for all Prisma usage.
- **Files Modified**: `backend/controller/storefrontSettingsController.js`


### [FIX] Prisma Engine Empty Response Not Retried
- **Date**: 2026-03-13
- **Description**: Intermittent 500s still occurred with `"Response from the Engine was empty"` or `"Engine is not yet connected"`.
- **Root Cause**: Retry logic only treated basic connection errors as retryable, so these engine-level errors failed without reconnect.
- **Resolution**: Expanded connection-error detection to include these Prisma engine messages, triggering reconnect + retry.
- **Files Modified**: `backend/services/sharedDatabase.js`


### [FIX] Avoid Subdomain Lookup For Authenticated Requests
- **Date**: 2026-03-13
- **Description**: Authenticated dashboard requests to `/api/v1/storefront-settings` were failing after `getCompanyFromSubdomain` queried Prisma and hit engine errors.
- **Root Cause**: The global company middleware ran for all requests, including authenticated admin API calls, and performed a Prisma lookup before auth.
- **Resolution**: Skip subdomain lookup when an `Authorization` header is present.
- **Files Modified**: `backend/middleware/companyMiddleware.js`


### [FIX] Promotion Settings Prisma Retry Wrapper
- **Date**: 2026-03-13
- **Description**: `/api/v1/promotion-settings` returned 500 with `"Response from the Engine was empty"`.
- **Root Cause**: `promotionSettingsController` used direct Prisma calls without retry/queue handling.
- **Resolution**: Routed all promotion settings queries through `safeQuery` with reconnect + retry on engine errors.
- **Files Modified**: `backend/controller/promotionSettingsController.js`


### [FIX] Homepage Activation Logic - Mode Not Updating
- **Date**: 2026-03-13
- **Description**: Activating a homepage template in the admin panel did not reflect on the storefront because the `StorefrontSettings.designTokens.storefrontPageAssignments.homepage.mode` was not being updated to `'template-page'`.
- **Root Cause**: The activation process only toggled the `isActive` flag on the template but did not synchronize the storefront's display mode.
- **Resolution**:
    1. Modified `homepageController.js` to automatically set `designTokens.storefrontPageAssignments.homepage.mode` to `'template-page'` whenever a template is activated via `setActiveHomepage`, created via `createDemoTemplate`, or imported via `importSystemTemplate`.
    2. Ensured that existing `designTokens` are preserved and correctly handled if they are stored as JSON strings in the database.
    3. Fixed a critical scope issue in `createDemoTemplate` where `tx` was incorrectly referenced outside a transaction (switched to `prisma`).
- **Files Modified**: `backend/controller/homepageController.js`



### [FIX] Product Listing Page - Multiple Default Exports & Component Path Resolution
- **Date**: 2026-03-13
- **Description**: After refactoring `Products.tsx` to a modular architecture, the page failed to load due to multiple `export default` statements in the main file and incorrect relative paths for shared types (`ProductsTypes.ts`) in the newly created sub-components.
- **Root Cause**: Faulty code generation during file replacement and inheritance of relative path assumptions from the previous monolithic structure.
- **Resolution**:
    1. Removed redundant `export default Products` from `Products.tsx`.
    2. Corrected import paths in `ProductsTable.tsx` and `ProductTableRow.tsx` to `./ProductsTypes` (local directory).
    3. Restored accidentally removed hooks (`useRef`) and icons (`PhotoIcon`) in the main component.
- **Files Modified**: `frontend/src/pages/products/Products.tsx`, `frontend/src/pages/products/components/ProductsTable.tsx`, `frontend/src/pages/products/components/ProductTableRow.tsx`


### [FIX] Product Creation Page Crash (Object-to-Primitive TypeError)
- **Date**: 2026-03-13
- **Description**: The product creation page (`/products/new`) crashed with `TypeError: Cannot convert object to primitive value` immediately upon loading.
- **Root Cause**: `ProductNewFinal.tsx` was missing its `default export`. Since it was being imported using `React.lazy` in `App.tsx`, and Vite's development server generates warnings when lazy components are missing default exports, these warnings triggered a React crash during the serialization of the (missing) component object.
- **Resolution**: Added `export default ProductNewFinal` to the end of `frontend/src/pages/products/ProductNewFinal.tsx`.
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`


### [2026-03-13] Fixed Product Creation/Edit Flows
- **Issue**: Missing default export in `ProductNewFinal.tsx` caused the page to fail loading.
- **Fix**: Added `export default ProductNewFinal;`.
- **Issue**: Missing `description` field and translation keys for product placeholders.
- **Fix**: Restored `description` field in `BasicTab.tsx` and added missing keys to `products.json`.
- **Issue**: `TypeError: Cannot read properties of undefined (reading 'length')` in `ProductSelect.tsx` when opening "Advanced" tab.
- **Fix**: Fixed prop name mismatch in `AdvancedTab.tsx` (changed `products`/`setProducts` to `selectedIds`/`onChange`) and added defensive checks to `ProductSelect.tsx`.


### [FIX] Missing Product Translations & UI Labels
- **Date**: 2026-03-13
- **Description**: Several UI labels (tabs like SEO/WhatsApp, save buttons, placeholders) in the new modular product forms were displaying as raw translation keys (e.g., `products.save`).
- **Resolution**:
    1. Identified and added missing keys (`editTitle`, `save`, `placeholders.*`, `slugHelp`, `tags`, `activeStatus`) and their Arabic translations to `locales/ar/sections/products.json`.
    2. Synchronized the main `translation.json` files using the `merge-translations.js` script.
    3. Verified correct rendering of all 12 tabs and form labels in the browser.
- **Files Modified**: `frontend/src/locales/ar/sections/products.json`, `frontend/src/locales/ar/translation.json`, `frontend/src/locales/en/translation.json`



### [REFACTOR] Modular Architecture for Product Management
- **Date**: 2026-03-13
- **Description**: The `ProductNewFinal.tsx` file was a monolithic components with over 1500 lines, making it difficult to maintain and causing frequent type errors and linting issues.
- **Resolution**:
    1. **Modularization**: Extracted UI tabs into separate components in `frontend/src/pages/products/components/tabs/`.
    2. **Logic Extraction**: Moved state management and API logic into custom hooks: `useProductForm`, `useProductVariants`, `useProductApi`, and `useProductMedia`.
    3. **Standardization**: Introduced `TagsInput` and `ProductSelect` components for consistent field behavior.
    4. **Type Safety**: Resolved all TypeScript type mismatches, particularly around `TFunction` return types and complex metadata access.
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`, `frontend/src/pages/products/hooks/*.ts`, `frontend/src/pages/products/components/tabs/*.tsx`


### [FIX] Syntax Error in ProductNewFinal.tsx Fetch Logic
- **Date**: 2026-03-13
- **Description**: After the modular refactoring, a syntax error was introduced in the `fetchProduct` function due to a misplaced closing brace, leading to scope errors and rendering failures.
- **Resolution**: Corrected the nested scope within the `fetchProduct` function by properly closing the metadata parsing block and removing the dangling brace.
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`


### [FIX] Recurring Infinite Loop in CompanyDashboard
- **Date**: 2026-03-13
- **Description**: The CompanyDashboard was still experiencing a "Maximum update depth exceeded" error despite a previous fix.
- **Root Cause**: The `fetchDashboardData` function (wrapped in `useCallback`) listed `dashboardData` as a dependency. Since `fetchDashboardData` updates `dashboardData`, it created a cyclic dependency that triggered `useEffect` indefinitely.
- **Resolution**: Removed `dashboardData` from the `useCallback` dependency array. This prevents the function reference from changing when the data is updated, breaking the loop.
- **Files Modified**: `frontend/src/pages/CompanyDashboard.jsx`


## Recent Resolved Issues (2026-03-13)


## Recent Resolved Issues (2026-03-13)


### [IMPROVEMENT] ProductNewFinal.tsx — Inventory & Shipping Tab Restructure
- **Date**: 2026-03-13
- **Description**: The Inventory tab was missing a Barcode field, had no clear sections, and the SKU was incorrectly placed in the Basic tab. The Shipping tab had a confusing "show/hide" toggle for dimensions and was missing shipping class and free-shipping exclusion options.
- **Resolution**:
  - **Inventory tab**: Reorganized into 4 clear sections — Identifiers (SKU + Barcode), Stock Tracking, Fake Stock FOMO, Pre-order.
  - **Shipping tab**: Replaced the show/hide dimensions toggle with an always-visible 4-column grid (weight + length + width + height). Added Shipping Class selector and Exclude-from-Free-Shipping toggle.
  - **SKU**: Moved from Basic tab → Inventory tab.
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`




### [FIX] Structural JSX Errors & Unbalanced Tags in ProductNewFinal.tsx
- **Date**: 2026-03-12
- **Description**: After complex tab merges, the file contained unbalanced `<div>` tags and a missing closing tag in the SEO preview section, causing build and render failures.
- **Resolution**:
    1. **Frontend**: Systematic pass through `ProductNewFinal.tsx` to balance all conditional rendering blocks.
    2. **Refinement**: Fixed the missing `</div>` in the Google Search Preview and correctly wrapped the misplaced "Tags" section within its designated tab condition.
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`


## Recent Resolved Issues (2026-03-12)


### [FIX] TurboSettings ReferenceError: showApiKey is not defined
- **Date**: 2026-03-12
- **Description**: `/settings/turbo` crashed with `ReferenceError: showApiKey is not defined` after the ticket migration removed this state without removing its JSX usage.
- **Root Cause**: During ticket tab removal, the `showApiKey` state declaration was deleted but the toggle button referencing it in the API Key section was not.
- **Resolution**:
    1. **Frontend**: Re-added `const [showApiKey, setShowApiKey] = useState(false);` to `TurboSettings.tsx`.
    2. **Frontend**: Removed duplicate `ArrowLeftIcon` import that caused an additional TS error.
    3. **Frontend**: Rebuilt `TurboTickets.tsx` with the full ticket submission UI including inquiry type dropdown, textarea, and pagination.
- **Files Modified**: `frontend/src/pages/settings/TurboSettings.tsx`, `frontend/src/pages/settings/TurboTickets.tsx`


### [FEATURE] Dedicated Turbo Records Page & Tickets Migration
- **Date**: 2026-03-12
- **Description**: Created a dedicated page for managing Turbo shipping records and isolated the ticket management functionality from the global settings page.
- **Resolution**:
    1. **Frontend**: Created `TurboRecords.tsx` with filtering (All/Shipped/Unshipped) and search by tracking code/order number functionalities.
    2. **Refactoring**: Migrated the "Tickets" tab out of `TurboSettings.tsx` into a standalone `/tickets` page (`TurboTickets.tsx`).
    3. **Navigation**: Updated `sidebar.ts` and `App.tsx` routing to point to the new pages for cleaner system architecture.
- **Files Added**: `frontend/src/pages/orders/TurboRecords.tsx`, `frontend/src/pages/settings/TurboTickets.tsx`
- **Files Modified**: `frontend/src/pages/settings/TurboSettings.tsx`, `frontend/src/config/sidebar.ts`, `frontend/src/App.tsx`


### [FIX] Unclear Variant Selections & Linting Cleanup
- **Date**: 2026-03-12
- **Description**: Variant selectors in `VariantSelector.tsx` and `CompositeVariantSelector.tsx` were displaying redundant information (index numbers) and triggering lint warnings due to unused `priceDiff` variables and the `getPriceDifference` function.
- **Resolution**:
    1. **Frontend**: Removed index labels from `CompositeVariantSelector.tsx` to provide a cleaner UI.
    2. **Cleanup**: Systematically removed all unused `priceDiff` declarations and the `getPriceDifference` function from `VariantSelector.tsx`, resolving multiple ESLint warnings.
- **Files Modified**: `frontend/src/components/storefront/VariantSelector.tsx`, `frontend/src/components/storefront/CompositeVariantSelector.tsx`


### [FIX] Shipping Calculation & Price Breakdown UI
- **Date**: 2026-03-12
- **Description**: The Flatsome product page lacked a clear price breakdown (subtotal, shipping, total) and the mobile sticky bar did not reflect the grand total.
- **Resolution**:
    1. **Frontend**: Integrated a dynamic price breakdown section in the checkout form of `FlatsomeProductPage.tsx`.
    2. **UX**: Updated the mobile sticky action bar to display the grand total (subtotal + shipping).
- **Files Modified**: `frontend/src/pages/storefront/FlatsomeProductPage.tsx`


### [FIX] Syntax Errors & UI Refinement in ProductNewFinal.tsx
- **Date**: 2026-03-12
- **Description**: Encountered syntax errors (unbalanced braces/parentheses) after complex UI edits in the Phase 2 implementation.
- **Resolution**:
    1. **Frontend**: Fixed mapping callback syntax for `relatedProducts`, `upsellProducts`, and `crossSellProducts`.
    2. **Verification**: Successfully re-rendered the page and verified the "Preview" button, searchable dropdowns, and "Hidden" status logic in the browser.
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`


### [FIX] Customer Loyalty & Wallet Aggregate Security
- **Date**: 2026-03-12
- **Description**: Identified a potential security leak in wallet aggregation where `CASHBACK` totals were calculated without strict `companyId` filtering in the aggregate query.
- **Resolution**:
    1. **Backend**: Updated `customerLoyaltyController.js` and `walletController.js` to explicitly include `companyId` from the authenticated user context in all Prisma aggregation filters.
    2. **Security**: Hardened the multi-tenant isolation for financial KPI calculations.
- **Files Modified**: `backend/controller/customerLoyaltyController.js`, `backend/controller/walletController.js`


### [FIX] Raw Translation Keys in Customer Details Sidebar
- **Date**: 2026-03-12
- **Description**: The Customer Details page sidebar displayed raw keys (e.g., `sidebar.conversations`) instead of translated text.
- **Root Cause**: The keys were missing from both the `translation.json` monolithic files and were not correctly being merged from the split `sidebar.json` sections during development.
- **Resolution**:
  1. Manually added the `sidebar` object with `conversations` and `orders` keys to `frontend/src/locales/ar/translation.json` and `frontend/src/locales/en/translation.json`.
  2. Verified and added the missing keys to the split sections `frontend/src/locales/ar/sections/sidebar.json` and `frontend/src/locales/en/sections/sidebar.json` to ensure future merges remain consistent.
- **Files Modified**: `frontend/src/locales/ar/translation.json`, `frontend/src/locales/en/translation.json`, `frontend/src/locales/ar/sections/sidebar.json`, `frontend/src/locales/en/sections/sidebar.json`

### [FIX] TypeScript Linting Error in App.tsx
- **Date**: 2026-03-12
- **Description**: Resolved `@typescript-eslint/no-explicit-any` warning in `App.tsx` triggered by legacy debug code.
- **Resolution**: Replaced `(window as any)` with a typed unknown cast.
- **Files Modified**: `frontend/src/App.tsx`


### [FIX] Task System Prisma Relations & Form Experience
- **Date**: 2026-03-12
- **Description**: Tasks could not be saved or fetched correctly due to Prisma relation naming errors and frontend payload issues. Also, the date field order and default type were counter-intuitive.
- **Root Cause**:
    1. **Backend**: `getTaskDetails` and `getKanbanTasks` used invalid Prisma relations (e.g. `parentTask` instead of `task`, `subTasks` instead of `other_tasks`).
    2. **Frontend**: The `updateTask` function sent the entire task object containing read-only fields (e.g., `projectName`) back to the server, which failed validation.
- **Resolution**:
    1. **Backend**: Corrected all Prisma `include` relation names to match the schema mapping in `taskController.js`, including changing `users` to `user` for relations like `taskAttachments`, `taskActivities`, `taskWatchers`, and `timeEntries`.
    2. **Frontend**: Modified `updateTask` in `Tasks.tsx` to only construct and send editable fields.
    3. **Frontend**: Swapped the display order of `startDate` and `dueDate` in the creation and editing forms.
    4. **Frontend**: Changed the default task `type` to `"manual"`.
- **Files Modified**: `backend/controller/taskController.js`, `frontend/src/pages/tasks/Tasks.tsx`



### [FIX] TaskDetails Crash (reading 'firstName' of undefined)
- **Date**: 2026-03-12
- **Description**: The Task Details page (`/tasks/:id`) crashed with `TypeError: Cannot read properties of undefined (reading 'firstName')` when opening a task that had a null or missing `createdByUser`.
- **Root Cause**: The frontend component `TaskDetails.tsx` attempted to render `{task.createdByUser.firstName}` and `{task.createdByUser.lastName}` directly without checking if `task.createdByUser` existed.
- **Resolution**: Added optional chaining (`?.`) and fallback strings (`"غير معروف"`) to safely render the user name when `createdByUser` is `null` or undefined.
- **Files Modified**: `frontend/src/pages/tasks/TaskDetails.tsx`


### [FIX] Prisma ValidationError when Updating Tasks with Tags
- **Date**: 2026-03-12
- **Description**: Updating a task that included empty tags resulted in `PrismaClientValidationError` because the backend `tags` field expects `String?` but received an array `[]`.
- **Root Cause**: The frontend was sending `tags: []` while the backend schema defined `tags` as `String?` lacking an automatic array conversion before the `updateMany` Prisma call.
- **Resolution**: Updated `updateTask` in `taskController.js` to stringify the `tags` array to JSON (`Array.isArray(tags) ? JSON.stringify(tags) : tags`) before passing it to `prisma.task.updateMany()`.
- **Files Modified**: `backend/controller/taskController.js`


## Recent Resolved Issues (2026-03-11)


### [FIX] Ticket Details "undefined undefined" & Message Alignment
- **Date**: 2026-03-11
- **Description**: Ticket detail page displayed "undefined undefined" and all messages were aligned to the left regardless of the sender.
- **Root Cause**:
    1. Property mismatch between Turbo API response and frontend mapping (API uses `content` and `user`).
    2. truthy string comparison for `is_client_message` causing incorrect alignment.
- **Resolution**:
    1. Updated `TicketDetails.tsx` to correctly map `content` and `user` properties.
    2. Implemented explicit numeric comparison for `is_client_message` to correctly align and style messages.
- **Files Modified**: `frontend/src/pages/settings/TicketDetails.tsx`


### [FEATURE] Product Image Reordering (Drag and Drop)
- **Date**: 2026-03-11
- **Description**: Added the ability to manually reorder product images during creation and editing using an intuitive drag-and-drop interface.
- **Resolution**:
    1. Integrated `@dnd-kit/core` and `@dnd-kit/sortable` into `ProductNewFinal.tsx`.
    2. Created a `SortableImageItem` wrapper for the image cards adding a grip handle (`Bars4Icon`) for dragging.
    3. Handled array repositioning accurately preserving the Main Image designation correctly without relying on manual arrow buttons.
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`


### [FIX] Incorrect Sidebar Navigation Labels
- **Date**: 2026-03-09
- **Description**: Several sidebar menu items had incorrect or duplicate labels (e.g., multiple "Store Settings" pointing to different pages).
- **Resolution**:
    1. Added specific translation keys for `displayStudio`, `layoutStudio`, `productImages`, `checkoutSettings`, `footerSettings`, `pageTemplates`, `shopTemplates`, and `storefrontStudio` in both Arabic and English.
    2. Updated `frontend/src/config/sidebar.ts` to map routes to these new specific keys.
    3. Removed hardcoded Arabic strings from the configuration.
- **Files Modified**: `frontend/src/config/sidebar.ts`, `frontend/src/locales/ar/sections/sidebar.json`, `frontend/src/locales/en/sections/sidebar.json`




### [FIX] Build Failure in CompanyDashboard.jsx
- **Date**: 2026-03-11
- **Description**: Production build failed due to syntax error in `CompanyDashboard.jsx` (accidental insertion of literal `\r\n` characters).
- **Resolution**: Restored file content with proper line breaks and verified build success.
- **Files Modified**: `frontend/src/pages/CompanyDashboard.jsx`


### [FIX] Set Default Company Persistence
- **Date**: 2026-03-11
- **Description**: "Set as Default" company selection was not persisting across sessions for users with multi-company access.
- **Resolution**: Hardened the backend `setDefaultCompany` endpoint to ensure atomic updates and verified the `isDefault` flag propagation in `MyCompaniesDashboard.tsx`.
- **Files Modified**: `backend/controller/authController.js`, `frontend/src/pages/hr/MyCompaniesDashboard.tsx`


- **Build Maintenance (FIX)**: Resolved production build failure by fixing a critical syntax error in `CompanyDashboard.jsx`. Corrected accidental literal `\r\n` characters from a previous sync.


## Recent Resolved Issues (2026-03-11)


### [FIX] Maximum Update Depth Exceeded in CompanyDashboard
- **Date**: 2026-03-11
- **Description**: The CompanyDashboard crashed the React app with a "Maximum update depth exceeded" infinite loop warning on load.
- **Root Cause**: The `fetchDashboardData` useCallback hook depended on the `dashboardData` state variable. When an API call succeeded, it called `setDashboardData`, which created a new `fetchDashboardData` reference, which triggered the `useEffect` to fetch data again, causing an infinite loop.
- **Resolution**: Removed `dashboardData` from the `useCallback` dependency array and implemented a `useRef` hook (`isInitialLoad`) to handle loading spinner states without triggering re-renders.
- **Files Modified**: `frontend/src/pages/CompanyDashboard.jsx`


### [FIX] Remote Server Connectivity & Prisma Client Initialization
- **Date**: 2026-03-11
- **Description**: The remote backend (`mokhtarelhenawy.online`) was unresponsive to health checks and logs were flooded with `Prisma client not ready` warnings.
- **Root Cause**: The Prisma client had not been generated for the production environment on the remote server, and the connection backlog was full due to initialization hangs.
- **Resolution**:
    1. Regenerated the Prisma client on the remote server using the correct schema.
    2. Verified database connectivity with a standalone diagnostic script.
    3. Restarted the `maxp-backend` process via PM2 with `--update-env`.
    4. Verified the root endpoint is responding with the correct API status.
- **Files Modified/Affected**: `backend/remote_db_test.js` (added for verification), `backend/prisma/generated/*` (regenerated on server).


## Recent Resolved Issues (2026-03-10)


### [FIX] Prisma v6 Extension Crash (extendedClient.$use is not a function)
- **Date**: 2026-03-10
- **Description**: Backend startup looped with `extendedClient.$use is not a function` after Prisma v6, because `$extends()` returns a client without `$use`.
- **Resolution**: Moved the Order webhook side-effect into the `$extends` query handler and removed the `$use` middleware call. This keeps RLS behavior and restores backend startup stability.
- **Files Modified**: `backend/services/sharedDatabase.js`


### [FIX] Incomplete Orders UI Translations & Frontend Build Warnings
- **Date**: 2026-03-10
- **Description**: The incomplete orders page and sidebar displayed raw translation keys, and the frontend build emitted repeated warnings due to module-level directives and sourcemap resolution noise.
- **Resolution**:
  1. Added missing translation keys for incomplete orders (labels, filters, empty state) in both English and Arabic section files and re-merged translations.
  2. Switched `scripts/merge-translations.js` to CommonJS to avoid Node ESM warnings during `i18n:merge`.
  3. Suppressed noisy Rollup warnings for `use client` directives and sourcemap resolution in `vite.config.ts`.
  4. Fixed a missing `react-toastify` import by using the existing `react-hot-toast` in `StorefrontClaritySettings.tsx` to stabilize the build.
- **Files Modified**: `frontend/src/locales/en/sections/orders.json`, `frontend/src/locales/ar/sections/orders.json`, `frontend/src/locales/en/sections/sidebar.json`, `frontend/src/locales/ar/sections/sidebar.json`, `frontend/src/locales/en/translation.json`, `frontend/src/locales/ar/translation.json`, `scripts/merge-translations.js`, `frontend/vite.config.ts`, `frontend/src/pages/settings/StorefrontClaritySettings.tsx`


- **Date**: 2026-03-10
- **Description**: Implemented functionality to allow users with multiple companies to set a default company that loads automatically upon login.
- **Resolution**:
    1. Added `setDefaultCompany` endpoint in `authController.js` and registered it in `authRoutes.js`.
    2. Modified `getOwnerDashboard` in `ownerController.js` to include `isDefault` status for each company.
    3. Updated `useAuthSimple.tsx` frontend hook to include `setDefaultCompany` API call.
    4. Enhanced `MyCompaniesDashboard.tsx` UI with "Default" badges and "Set as Default" buttons.
- **Files Modified**: `backend/controller/authController.js`, `backend/routes/authRoutes.js`, `backend/controller/ownerController.js`, `frontend/src/hooks/useAuthSimple.tsx`, `frontend/src/pages/hr/MyCompaniesDashboard.tsx`


### [FIX] Facebook OAuth [BG-OAuth] ReferenceError: existingPagesMap
- **Date**: 2026-03-10
- **Description**: Background processing of Facebook pages failed with `existingPagesMap is not defined` after successful OAuth.
- **Root Cause**: The variable `existingPagesMap` was used in the `setImmediate` block but was never defined or initialized.
- **Resolution**: Initialized `existingPagesMap` by fetching existing pages from the database and creating a Map for efficient lookup.
- **Files Modified**: `backend/routes/facebookOAuthRoutes.js`


### [UTILITY] Facebook Page Removal Script
- **Date**: 2026-03-10
- **Description**: Created a safe script to remove specific Facebook pages from the database by name.
- **Resolution**: Developed `remove_page.js` which searches for pages by name (e.g., "Swan EG") and deletes them, handling cascading relations automatically.
- **Files Added**: `backend/remove_page.js`


### [FIX] Dark Mode Styles Overridden by Provider Inline Styles & MUI Baseline
- **Date**: 2026-03-10
- **Description**: Switching between Midnight, Classic, and OLED dark modes failed to apply the correct background colors.
- **Root Cause**:
  1. `VisualThemeProvider` was injecting background/foreground variables as inline styles on `documentElement`, which have higher specificity than CSS classes.
  2. MUI's `CssBaseline` was hardcoding a dark gray background (`#111827`) when `mode: 'dark'` was used in `createTheme`.
- **Resolution**:
  1. Updated `VisualThemeProvider` to skip inline background/foreground overrides when in dark mode + default theme.
  2. Updated `MuiThemeWrapper.tsx` to use CSS variables (`rgb(var(--color-background))`) for its palette instead of hardcoded hex values.
  3. Added `!important` to dark mode overrides in `index.css` as a fail-safe against other inline styles.
- **Files Modified**: `frontend/src/contexts/VisualThemeContext.tsx`, `frontend/src/components/theme/MuiThemeWrapper.tsx`, `frontend/src/styles/index.css`


### [FIX] Settings.tsx File Corruption After UI Edits
- **Date**: 2026-03-10
- **Description**: `Settings.tsx` became corrupted with mangled characters and missing sections after previous tool-based edits.
- **Root Cause**: Likely an encoding mismatch or partial write failure during complex multi-line replacements.
- **Resolution**: Restored `Settings.tsx` from the last clean git commit and reapplied the new "Appearance Settings" changes in a single clean pass. Verified line count and syntax visibility.
- **Files Modified**: `frontend/src/pages/settings/Settings.tsx`


### [FIX] ProductDetails hook-sync & Variant Type Stability
- **Date**: 2026-03-18
- **Description**: Refactored `ProductDetails.tsx` to correctly sync with the centralized `useCart` hook and resolved a persistent TypeScript indexing error in the variant mapping.
- **Fixes**:
    - **useCart Integration**: Replaced manual `storefrontApi` calls with `addToCartAsync` and `clearCartAsync` from the hook, ensuring global state synchronization across all storefront components.
    - **Type Integrity**: Resolved `as any` indexing warnings and properly typed the mapped product variants to prevent runtime crashes.
    - **Redundant State Removal**: Eliminated `cartTotal` local state and `fetchCartTotal` function, relying on the live hook data.
- **Files Modified**: `frontend/src/pages/storefront/ProductDetails.tsx`.


### [FIX] Translation System Refactor — Empty Arabic File & Maintenance Nightmare
- **Date**: 2026-03-09
- **Description**: The Arabic translation file (`ar/translation.json`) was completely empty (just `{}`), and the English file was a single monolithic 3,652-line JSON that was error-prone to edit. Emergency fix scripts (`merge_json.js`, `merge_json_en.js`) existed to repair recurring duplicate-key corruption.
- **Root Cause**:
  1. All 76 translation namespaces were crammed into a single file per language, making manual editing risky and merge conflicts frequent.
  2. The Arabic translation file had been wiped at some point and never recovered.
  3. No tooling existed to detect missing keys between languages.
  4. Manual translation of Batch 3 files introduced structural divergence (arrays converted to objects, mismatched keys) causing 174 sync issues.
- **Resolution**:
  1. Created `scripts/split-translations.js` to split the monolithic file into 76 per-namespace section files under `locales/{lang}/sections/`.
  2. Created `scripts/merge-translations.js` to auto-merge sections back into `translation.json` (runs via `predev`/`prebuild` npm hooks).
  3. Created `scripts/generate-ar-placeholders.js` to generate Arabic placeholder files mirroring all English keys.
  4. Created `scripts/i18n-check.js` to detect missing/extra keys between languages.
  5. Added npm scripts: `i18n:merge`, `i18n:split`, `i18n:check`.
  6. Wrote a data mapping script `translate-batch3.js` to strictly enforce translation application over perfect English structural clones, resolving all 174 array/object nesting mismatch errors.
- **Verification**: Both languages verified with 3,062 keys in perfect sync. Merge script tested successfully.
- **Files Added**: `scripts/split-translations.js`, `scripts/merge-translations.js`, `scripts/generate-ar-placeholders.js`, `scripts/i18n-check.js`, `scripts/translate-batch3.js`, `frontend/src/locales/en/sections/*.json` (76 files), `frontend/src/locales/ar/sections/*.json` (76 files)
- **Files Modified**: `frontend/package.json`


### [FIX] Translation System Loss After Merge Conflict
- **Date**: 2026-03-10
- **Description**: The translation refactor (split files) was lost during a merge conflict, and the project reverted to a monolithic `translation.json`.
- **Resolution**: Re-implemented the splitting scripts and auto-merge hooks based on the design from 2026-03-09. Split the monolithic file back into 76 sections per language.
- **Files Added**: `scripts/split-translations.js`, `scripts/merge-translations.js`, `scripts/i18n-check.js`
- **Files Modified**: `frontend/package.json`, `frontend/src/locales/*/translation.json` (split into sections)

### [FIX] Browser Purchase Event No Longer Fails Hard on Unsupported Currency Without CAPI
- **Date**: 2026-03-09
- **Description**: Meta browser runtime warned `Parameter 'currency' is invalid for event 'Purchase'` on Swan when currency resolved to `EGP` and CAPI was not enabled.
- **Root Cause**:
  1. `trackPurchase` in `frontend/src/utils/facebookPixel.ts` always attached `value` + `currency`.
  2. Existing guard only skipped browser purchase when server-side fallback (CAPI) was enabled.
- **Resolution**:
  1. Kept existing skip behavior when CAPI fallback is available.
  2. Added a browser-only fallback for unsupported currencies when CAPI is unavailable: send `Purchase` without monetary fields instead of sending an invalid currency payload.
  3. Centralized purchase event payload construction to keep both immediate and retry paths consistent.
- **Verification**:
  - Frontend production build passed.
  - Runtime flow preserves `Purchase` dispatch path while avoiding forced invalid-currency payload composition.
- **Files Modified**:
  - `frontend/src/utils/facebookPixel.ts`


### [FIX] Live Swan Order Still Produced `finalTotal=0` Until Variant Null-Price Guard Was Deployed
- **Date**: 2026-03-09
- **Description**: After analytics fixes were deployed, a real production order on Swan (`ORD-604970-208`) still returned `createdOrderFinalTotal = "0"` despite product base price being `499`.
- **Root Cause**:
  1. Production build did not yet include the null-variant-price fallback patch in `backend/routes/publicOrdersRoutes.js`.
  2. Variant records on Swan often have `price = null`, and legacy coercion path interpreted missing variant price as `0` instead of falling back to product price.
- **Resolution**:
  1. Deployed the guarded price-selection logic in `publicOrdersRoutes.js`:
     - Variant price is used only when explicitly present.
     - Otherwise fallback to product base price.
  2. Re-ran live analytics tracking checks to ensure purchase events can still be recorded separately.
- **Verification**:
  - Reproduced issue with live order `ORD-604970-208` before deploying this patch.
  - Patch prepared for immediate deploy in isolated commit.
- **Files Modified**:
  - `backend/routes/publicOrdersRoutes.js`


### [FIX] Duplicate and Incorrect Sidebar Menu Labels
- **Date**: 2026-03-09
- **Description**: Sidebar menu items had duplicate names (multiple "Store Settings" and "Store Pages") and incorrect labels in the Products and Inventory sections.
- **Root Cause**:
    1. **Hardcoded Strings**: Some labels were hardcoded in `sidebar.ts` instead of using the translation system.
    2. **Overused Keys**: Multiple unique URLs were sharing the same generic translation keys like `sidebar.storeSettings`.
    3. **Duplicate Registration**: The `/settings/storefront/studio` route was registered in both the Products and Inventory sections.
- **Resolution**:
    1. **New Translation Keys**: Added specific keys (`storefrontStudio`, `pageTemplates`, `shopPageStudio`, `footerSettings`, `layoutStudio`) to `translation.json`.
    2. **Config Update**: Updated `frontend/src/config/sidebar.ts` to use these specific keys and removed the duplicate entry from the Inventory section.
    3. **Internationalization**: replaced remaining hardcoded Arabic strings with translation calls.
- **Verification**: Manually verified that each sidebar item now has a unique and descriptive label in the UI.
- **Files Modified**: `frontend/src/config/sidebar.ts`, `frontend/src/locales/ar/translation.json`, `frontend/src/locales/en/translation.json`


### [FIX] Missing Sales in Store Analytics
- **Date**: 2026-03-09
- **Description**: Sales were not appearing in the store analytics page, especially for guest orders on subdomain storefronts.
- **Root Cause**:
  1. **Subdomain Identification**: Analytics routes were registered in `server.js` after the `globalSecurity` middleware and lacked proper `companyId` resolution from subdomains.
  2. **Guest Order Mismatch**: The `ConversionEvent` model has a foreign key to the `Order` table, but guest checkouts create `GuestOrder` records. This caused purchase tracking to fail for guest orders.
  3. **Duplicate Routes**: Duplicate analytics route definitions in `server.js` bypassed the necessary company identification middleware.
- **Resolution**:
  1. **Route Consolidation**: Consolidated all analytics routes into `analyticsRoutes.js` and registered them BEFORE `globalSecurity` in `server.js` to ensure public accessibility and proper subdomain resolution.
  2. **Guest Order Support**: Modified `analyticsService.js` to handle `GuestOrder` records. If a regular `Order` is not found, the system now checks for a `GuestOrder` and stores its ID in the `metadata` field of the `ConversionEvent`, bypassing the foreign key constraint.
  3. **Fallback Tracking**: Added a fallback call to `analyticsService.trackPurchase` in `OrderConfirmation.tsx` to ensure events are recorded even if the primary tracking mechanism is missed.
- **Verification**: Verified using a Node.js simulation script that sends a purchase event from a subdomain host. Confirmed the event is correctly recorded in the database and associated with the right company.
- **Files Modified**: `backend/server.js`, `backend/routes/analyticsRoutes.js`, `backend/controller/analyticsController.js`, `backend/services/analyticsService.js`, `frontend/src/pages/storefront/OrderConfirmation.tsx`



### [REF] Dark Mode CSS Variable Refactor
- **Date**: 2026-03-10
- **Description**: Refactored the entire project to use semantic CSS variables for dark mode instead of hardcoded hex values and `!important` overrides.
- **Root Cause**: N/A (Refactor for maintainability).
- **Fix**: Defined RGB variables in `index.css` and updated `tailwind.config.cjs` to use them.


### [FIX] Customer Account 401 Unauthorized & 500 Internal Server Error
- **Date**: 2026-03-09
- **Description**: Customers were unable to access their account page (401) or view their orders (500).
- **Root Cause**:
  - **401 Error**: `verifyToken.js` middleware only checked the `USER` table, ignoring `CUSTOMER` roles stored in the `customer` table.
  - **500 Error**: `/me/orders` query in `publicCustomerRoutes.js` used non-existent field names (`totalAmount`, `shippingCity`, `items`) that did not match the Prisma `Order` and `OrderItem` models.
- **Resolution**:
  - Refactored `authenticateToken` in `verifyToken.js` to look up customers in the `customer` table when the JWT role is `CUSTOMER`.
  - Updated the Prisma query in `publicCustomerRoutes.js` to use correct schema fields (`total`, `city`, `orderItems`).
  - Implemented result mapping to alias database fields back to the format expected by the frontend (`totalAmount`, `shippingCity`, `items`).
- **Verification**: Confirmed successful profile loading and order history retrieval on `http://mokhtar-1.lvh.me:3000/account`.
- **Files Modified**:
  - `backend/utils/verifyToken.js`
  - `backend/routes/publicCustomerRoutes.js`


## Recent Resolved Issues (2026-03-09)


### [FEATURE] Documentation Synchronization Rule & AI Guardrails
- **Date**: 2026-03-09
- **Description**: Implemented a mandatory rule for AI assistants to update core documentation before pushing to GitHub or deploying.
- **Resolution**:
  - Created `.cursorrules` in the root directory to enforce the policy globally.
  - Added `.agent/rules/documentation-sync.md` for specialized agent instructions.
  - Linked these rules to the existing `scripts/verify-docs.js` CI check.
  - Updated `Bugs.md`, `Structure.md`, and `TEAM_SYNC.md` as the first act of compliance.
- **Files Added**: `.cursorrules`, `.agent/rules/documentation-sync.md`
- **Files Modified**: `backend/Bugs.md`, `backend/TEAM_SYNC.md`


### [FIX] EyeSlashIcon Missing Import causing ErrorBoundary Crash
- **Date**: 2026-03-09
- **Description**: The Products page crashed in production when loading a hidden product because `EyeSlashIcon` was used but not imported.
- **Root Cause**: The developer added hidden product UI support but forgot to add `EyeSlashIcon` to the `@heroicons/react/24/outline` import array.
- **Resolution**: Added `EyeSlashIcon` to the import list in `Products.tsx` and verified the build.
- **Files Modified**: `frontend/src/pages/products/Products.tsx`


### [FIX] Profile Data Persistence & Logic (Gender, BirthDate, ID)
- **Date**: 2026-03-08
- **Description**: Resolved issues where personal data (Gender, Date of Birth, National ID) modified on the Profile page was not being saved to the database.
- **Resolution**:
  - Updated `hrController.js` to include `gender`, `dateOfBirth`, and `nationalId` in updated fields.
  - Implemented upsert logic to create an `Employee` record if it doesn't exist when updating a profile.
  - Fixed date conversion logic for `dateOfBirth` to handle various formats and null values.
- **Files Modified**: `backend/controller/hrController.js`, `backend/services/hr/employeeService.js`.


### [FIX] SSH Deployment Handshake Failed (Authentication)
- **Date**: 2026-03-08
- **Description**: GitHub Actions deployment was failing with `ssh: handshake failed: unable to authenticate` during the SSH connection test.
- **Root Cause**: Mismatch or missing SSH keys in the server's `authorized_keys` or incorrect `SERVER_SSH_KEY` in GitHub Secrets.
- **Resolution**: Provided an automated script to generate a modern `ed25519` key pair on the server, add the public key to `authorized_keys`, and instructions to update GitHub Secrets with the new private key.
- **Tools Provided**: One-liner bash script for automatic key generation and setup.


## Recent Resolved Issues (2026-03-07)


### [FEATURE] Customer Points Center Dashboard
- **Date**: 2026-03-07
- **Description**: Premium loyalty points management dashboard (`CustomerPointsCenter.tsx`) inspired by Starbucks, Sephora, and Hilton loyalty models.
- **Features**:
  - KPI cards: Active Members, Total Balance, Redemption Rate, At-Risk Customers
  - Customer list with search by name/email/phone, sorted by points
  - Tier progress bar (points to next tier)
  - Manual Add / Redeem / Adjust points actions per customer
  - At-risk customer detection (near-expiry alert)
  - Full dark mode support
- **Routes Added**: `/customers/points-center`
- **Files Added**: `frontend/src/pages/customers/CustomerPointsCenter.tsx`


### [FIX] CI Build Failure — Missing Frontend Files
- **Date**: 2026-03-07
- **Description**: The GitHub Actions CI was failing with `Could not resolve './pages/customers/CustomerBirthdayWhatsAppNotify'` because existing `App.tsx` imports were referencing files that existed locally but were never committed to the repo.
- **Resolution**: Added the 3 missing files to Git tracking and pushed them.



### [FIX] Facebook Comment Auto-Filter Not Deleting Comments
- **Date**: 2026-03-07
- **Description**: The automated comment filtering system was failing to delete negative comments and was still saving them to the database despite the logic being present.
- **Root Cause**:
  1. **Prisma Crash**: When receiving webhook events, `pageId` was occasionally `null`. The `prisma.facebookPage.findUnique({ where: { pageId: null } })` query crashed inside a `try...catch` block. The `catch` bypassed the filter logic silently and allowed the comment to be saved to the database.
  2. **Missing UI & Endpoints**: The UI lacked settings to enable `autoFilterEnabled` in the database, meaning the filter was disabled by default.
- **Resolution**:
  1. **Fixed Prisma Crash**: Modified the `handleFacebookComment` logic in `allFunctions.js` to gracefully check if `pageId` is valid before querying `facebookPage`, and default to AI Settings if the page token check fails.
  2. **Added Static Bad Words**: Implemented a hardcoded list of over 200 negative/abusive Arabic keywords directly into `allFunctions.js` to ensure the core filter works independently of database configuration.
  3. **Added Filter Settings API**: Created `getGlobalFilterSettings`, `updateGlobalFilterSettings`, `getPageFilterSettings`, `updatePageFilterSettings`, and `transferPageSettings` in `commentController.js` and exported them to `commentRoutes.js`.
  4. **Fixed Manual AI Filter**: Adjusted `filterCommentAI` to match the correct Prisma schema fields (`isFiltered` and `filterReason`) instead of non-existent fields (`sentiment` and `isNegative`).
- **Files Modified**:
  - `backend/utils/allFunctions.js`
  - `backend/controller/commentController.js`
  - `backend/routes/commentRoutes.js`


### [FEATURE] AI-Powered Negative Comment Filtering (Manual)
- **Date**: 2026-03-07
- **Description**: Implemented a dashboard button for manual AI moderation of Facebook comments.
- **Resolution**:
  1. **Manual AI Trigger**: Users can now trigger sentiment analysis on-demand from the Unified Comments Management dashboard.
  2. **Sentiment Logic**: Uses Gemini/GPT to classify comments and determine if action (Hide/Delete) is required based on company rules.
  3. **Social Actions**: Integrated with Facebook Graph API to hide or delete negative comments.
- **Files Modified**:
  - `backend/services/aiAgent/contextManager.js`
  - `backend/utils/allFunctions.js`
  - `backend/controller/commentController.js`
  - `frontend/src/pages/comments/PostComments.jsx`


### [FIX] 404 API Fix & Comment Controller Hoisting
- **Date**: 2026-03-07
- **Description**: Resolved persistent 404 errors on comment-related API routes.
- **Resolution**:
  - Moved `app.use("/api/v1/comments", commentRoutes)` to a higher priority in `server.js`.
  - Moved `filterCommentAI` definition to the end of `commentController.js` and ensured it is hoisted correctly by using proper function declarations.
  - Added request logging in `commentRoutes.js`.


### [FIX] Frontend Build Failure (commentService.js)
- **Date**: 2026-03-07
- **Description**: Fixed a "Parse error @:1:1" during `npm run build` caused by a missing closing brace in `commentService.js`.
- **Resolution**: Restored the missing brace and verified class structure.


### [FIX] User Company Association & Data Integrity
- **Date**: 2026-03-07
- **Description**: Corrected incorrect company associations and deleted redundant test data.
- **Resolution**:
  1. Re-associated `shrouk9@gmail.com` with the correct company ("m22").
  2. Deleted test user `shrouk99@gmail.com` and its associated company ("k3") to maintain database integrity.
- **Files Modified**: Database corrected via manual SQL scripts and `backend/delete-shrouk99-and-company.js`.



## Recent Resolved Issues (2026-03-06)


### [FIX] Wallet Management — NaN Bug & Approval Reliability
- **Date**: 2026-03-06
- **Description**: Resolved a critical bug where the "Total Deposit" field displayed as `NaN` in the Super Admin dashboard and fixed the unreliable receipt approval process.
  - **Resolution 1 (Schema Update)**: Added `totalDeposited` column to the `CompanyWallet` model in `orders.prisma` and manually provisioned it in the database.
  - **Resolution 2 (Atomic Transactions)**: Refactored the `/review-receipt` endpoint in `walletPayment.js` to use a Prisma Transaction block. This ensures that marking a receipt as approved, updating the invoice to 'PAID', creating the payment record, and incrementing the wallet balance/deposit fields all succeed or fail together.
  - **Resolution 3 (Type Safety)**: Implemented explicit `Number()` conversion for currency amounts to prevent `NaN` results during database upserts.
  - **Resolution 4 (API Optimization)**: Updated `adminWalletRoutes.js` to format the `totalDeposited` response and provide a default of 0, ensuring consistent UI display.
- **Files Modified**:
  - `backend/prisma/schema/orders.prisma`
  - `backend/routes/walletPayment.js`
  - `backend/routes/adminWalletRoutes.js`


### [FIX] Database Data Integrity & Account Audit
- **Date**: 2026-03-06
- **Description**: Identified and resolved data type inconsistencies and orphan account records in the PostgreSQL database.
- **Resolution**: Implemented specialized diagnostic scripts (`account_audit.sql`, `check_datatypes.sql`) to detect NULL company IDs and invalid roles. Applied fixes via `final_fix.sql` and verified with `final_verify.sh`.
- **Files Added**: `backend/account_audit.sql`, `backend/check_datatypes.sql`, `backend/final_fix.sql`, `backend/final_verify.sh`.


## Recent Resolved Issues (2026-03-05)


### [FIX] Sidebar Icon Import — DevicePhoneMobileIcon
- **Date**: 2026-03-04
- **Description**: The sidebar crashed with a `ReferenceError: DevicePhoneMobileIcon is not defined` because the newly added icon was not imported from `@heroicons/react`.
- **Resolution**: Added `DevicePhoneMobileIcon` to the imports in `frontend/src/config/sidebar.ts`.
- **Files Modified**: `frontend/src/config/sidebar.ts`.


### [FIX] Timer Stop Issue in Active Users Monitor
- **Date**: 2026-03-04
- **Description**: The "Stop Timer" button in the "Active Users Monitor" failed with a 404 error when an admin tried to stop another user's timer.
- **Resolution**: Updated the backend `stopDevTaskTimer` to accept an optional `timerId` from the request body. Updated the frontend `ActiveUsersMonitor.jsx` to send the specific `entryId` as `timerId`.
- **Files Modified**: `backend/controller/superAdminController.js`, `frontend/src/components/ActiveUsersMonitor.jsx`.


### [FIX] Super Admin Store Pages — Routing & Mounting Fix
- **Date**: 2026-03-04
- **Description**: Resolved a 404 error when accessing the new Super Admin Store Pages management section.
- **Resolution**: Corrected the route registration order in `server.js` and ensured the super-admin middleware properly authorized the request before reaching the store-pages controller.
- **Files Modified**: `backend/server.js`, `backend/routes/superAdminStorePagesRoutes.js`


## Recent Resolved Issues (2026-03-03)


## Recent Resolved Issues (2026-03-02)
- **Date**: 2026-03-02
- **Description**: Built a complete Growth Marketing module to identify, analyze, and re-engage repeat customers and at-risk customers.
  - **Fix 1**: Resolved `MODULE_NOT_FOUND` by switching to `sharedDatabase` for automatic RLS.
  - **Fix 2**: Corrected Raw SQL Case Sensitivity (PostgreSQL) by globally quoting camelCase columns (e.g., `"firstName"`, `"lastName"`, `"customerId"`, `"createdAt"`).
  - **Fix 3**: Aligned column names with schema (e.g., `totalAmount` -> `total`).
  - **Fix 4**: Removed `deletedAt` conditions (unsupported in these models).
  - **Fix 5**: Resolved Prisma `count()` validation issues by using `$queryRaw` for all statistical calculations, ensuring 100% database compatibility.
- **Files Added**:
  - **Backend**: Created `controller/growthMarketingController.js` (4 endpoints) integrated with `sharedDatabase`. Optimized Raw SQL for PostgreSQL (quoted camelCase columns, correct field names). Fixed Prisma `count()` filter validation. Created `routes/growthMarketingRoutes.js` (using `requireAuth`) and registered in `server.js`. — Registered `growthMarketingRoutes` at `/api/v1/growth-marketing`
  - `frontend/src/config/sidebar.ts` — Added "التسويق للنمو" section with 3 items
  - `frontend/src/App.tsx` — Added 3 lazy-loaded protected routes
- **Files Modified**:
  - `backend/server.js` — Registered `growthMarketingRoutes` at `/api/v1/growth-marketing`
  - `frontend/src/config/sidebar.ts` — Added "التسويق للنمو" section with 3 items
  - `frontend/src/App.tsx` — Added 3 lazy-loaded protected routes


### [FIX] Facebook Image Upload Failure & Domain Mismatch
- **Date**: 2026-03-02
- **Description**: Images were not being sent in the Facebook Inbox. Root causes were a `ReferenceError` in `messagingController.js` and a default `MAIN_DOMAIN` mismatch in `environment.js`.
- **Resolution**:
    - Moved `conversation` fetch to start of `uploadFile` in `messagingController.js`.
    - Unified `MAIN_DOMAIN` in `environment.js` with `mokhtarelhenawy.online`.
    - Fixed image message type in socket emission (changed `IMAGE` to `image`) to ensure correct rendering in the frontend.
    - Added explicit logging for prepared image attachment URLs and local absolute file paths to verify file existence and assist with Nginx `alias` configuration.
- **Files Modified**: `backend/controller/conversation/messagingController.js`, `backend/config/environment.js`.


## Recent Resolved Issues (2026-03-01)


### [FIX] AI Management & Model Manager Stability
- **Date**: 2026-03-01
- **Description**: Multiple fixes for the AI Management page and Model Manager to ensure stability and correct API key handling.
- **Resolution**: Refactored Model Manager and fixed AI management page UI/API integration.
- **Files Modified**: `frontend/src/pages/ai-management`, `backend/services/aiAgent/settingsManager.js`


### [FIX] Facebook Message Saving
- **Date**: 2026-03-01
- **Description**: Resolved issues with Facebook messages not saving correctly to the database.
- **Resolution**: Updated webhook and conversation controllers to handle message persistence more reliably.
- **Files Modified**: `backend/controller/webhookController.js`, `backend/controller/conversationController.js`


### [FIX] Turbo API Authentication & Data Retrieval
- **Date**: 2026-03-01
- **Description**: Resolved 500 errors on the Turbo settings page (tickets list) and ensured correct governorate/area pull.
- **Root Cause**:
    1. Special characters in the API key were not URL-encoded in GET requests.
    2. `main_client_code` was missing from both GET and POST requests.
    3. Missing `requireAuth` middleware on `/governments`, `/label`, and `/parse-address` routes, while the controller required `req.user.companyId`.
- **Resolution**:
    1. Implemented `encodeURIComponent(apiKey)` for all Turbo GET requests.
    2. Added `main_client_code` (defaulting to 37321) to all Turbo API interactions.
    3. Added `requireAuth` and `checkAppAccess('order-shipping-turbo')` to all relevant routes in `turboRoutes.js`.
    4. Verified governorates/areas are correctly matched against Turbo API data during order creation.
- **Files Modified**: `backend/services/turboService.js`, `backend/routes/turboRoutes.js`


### [DONE] Facebook Image Upload Fix (2026-03-02)
- **Problem**: Images failed to send in Facebook Inbox.
- **Root Cause**: `ReferenceError` in `messagingController.js` and incorrect default `MAIN_DOMAIN` in `environment.js`.
- **Fix**: Fetched `conversation` early, unified domain configuration, fixed frontend display (Socket message type), and added absolute path logging for server-side debugging.
- **Impact**: Images should now be successfully uploaded, rendered correctly in the frontend, and sent to recipients via Facebook Messenger.


### [FIX] Turbo Ticket API Alignment & 404 Resolution
- **Date**: 2026-03-01
- **Description**: Aligned ticket creation, category retrieval, and detail views with the new Turbo API spec, resolving 404 "Not Found" errors.
- **Root Cause**: Outdated endpoints and strict query parameter ordering requirements in the Turbo API.
- **Resolution**:
    1. Updated `getInquiriesTypes` to use `GET /external-api/tickets/categories`.
    2. Updated `addTicket` to use `POST /external-api/tickets/create` with new field mapping (`description` -> `content`, `type` -> `category_id`).
    3. Updated `getTicket` to use `GET /tickets/${ticketId}/show`.
    4. Updated `getTicketLog` to use `GET /tickets/${ticketId}/log`.
    5. **Strict Parameter Order**: Ensured all GET requests follow the pattern `?authentication_key=...&main_client_code=...`.
    6. **Graceful Error Handling**: Updates methods to handle "غير موجود" (Not Found) responses from Turbo as 404s/success:true (empty data) instead of throwing 500 server errors.
- **Files Modified**: `backend/services/turboService.js`, `backend/controller/turboController.js`




## Recent Resolved Issues (2026-03-11)


### [FIX] Sidebar Navigation Labels & Organization (UX IMPROVEMENT)
- **Date**: 2026-03-11
- **Description**: Sidebar menu items for storefront customization were inconsistently named (literal translations) and scattered across unrelated sections (Products/Inventory).
- **Resolution**:
    1. **Professionalized Arabic Labels**: Refined translations to industry standards (e.g., "Design Studio" instead of "Storefront Studio", "Page Layout" instead of "Layout Studio").
    2. **Structural Reorganization**: Created a dedicated "Storefront Design" sidebar group to consolidate all visual tools (Studio, Templates, Layout, Display, Footer, Product Images) in one logical location.
    3. **Translation Namespace Sync**: Re-merged all 76 translation namespaces to ensure consistent localization across the dashboard.
- **Files Modified**: `frontend/src/config/sidebar.ts`, `frontend/src/locales/ar/sections/sidebar.json`, `frontend/src/locales/en/sections/sidebar.json`, `frontend/src/locales/ar/translation.json`, `frontend/src/locales/en/translation.json`, `backend/Structure.md`

## Resolved Issues


### [FIX] Frontend Production Build (Dialog Nesting Syntax Error)
- **Date**: 2026-03-01
- **Description**: Production build (`npm run build`) failed due to a JSX syntax error in the Payroll module. Core components (Dialog/DialogContent) were improperly nested.
- **Resolution**: Restructured the component hierarchy in `Payroll.tsx`, ensuring each Dialog is explicitly closed before the next sibling begins. Validated JSX nesting for Fragments and conditional blocks.
- **Files Modified**: `frontend/src/pages/hr/Payroll.tsx`


### [FIX] Prisma Relation Name Conflict (AI Keys)
- **Date**: 2026-02-28
- **Description**: Adding a new AI Key (e.g., Gemini) failed with a `PrismaClientValidationError`.
- **Root Cause**: Mismatch between the Prisma schema relation name (`aiModelConfigs`) and the name used in the controller and services (`ai_model_configs`).
- **Resolution**: Renamed all occurrences of `ai_model_configs` to `aiModelConfigs` in `superAdminAiController.js`, `modelManager.js`, and `SuperAdminAIProviders.tsx`.


### [FIX] Company AI Key Management (aiController.js)
- **Date**: 2026-02-28
- **Description**: Managing Gemini keys in company settings (`/ai-management`) failed with `TypeError` and Prisma validation error.
- **Root Cause**: `aiController.js` was using incorrect model accessor `aIKey` (instead of `aiKey`) and legacy relation name `models` (instead of `aiModelConfigs`).
- **Resolution**: Updated `aiController.js` to use `aiKey` and `aiModelConfigs`.
- **Files Modified**: `backend/controller/aiController.js`


### [FIX] Facebook Messages Crash (TypeError: Cannot read properties of undefined)
- **Date**: 2026-02-28
- **Description**: Receiving any Facebook message caused a `TypeError: Cannot read properties of undefined (reading 'findFirst')` and the message was not saved.
- **Root Cause**: The AI-enabled code path in `utils/allFunctions.js` (starting at the `handleFacebookMessage` function) used bare `prisma.xxx` queries without first calling `getSharedPrismaClient()`, so `prisma` was always `undefined` in that scope.
- **Resolution**: Wrapped all bare `prisma.xxx` calls in the AI-enabled path inside `safeQuery(async () => { const prisma = getSharedPrismaClient(); ... })`, consistent with the non-AI code path in the same function.
- **Files Modified**: `backend/utils/allFunctions.js`


### [FIX] AI Management Page Frontend Crash (toLocaleString on undefined)
- **Date**: 2026-02-28
- **Description**: The `/ai-management` page crashed with `TypeError: Cannot read properties of undefined (reading 'toLocaleString')`, triggered by the Error Boundary.
- **Root Cause**: `AIManagement.tsx` called `model.usage.used.toLocaleString()` without null-checking `model.usage`. Newly added AI model configs have no usage data yet.
- **Resolution**: Used optional chaining and nullish coalescing: `(model.usage?.used ?? 0).toLocaleString()`.
- **Files Modified**: `frontend/src/pages/ai/AIManagement.tsx`


### [FIX] SimpleKeyRotator Crash After 429 Rate Limit (this.failedKeys is not iterable)
- **Date**: 2026-02-28
- **Description**: After a key received a 429 rate limit, the rotator correctly marked it as cooling down in Redis, but the next attempt crashed with `TypeError: this.failedKeys is not iterable` in `getStatus()`.
- **Root Cause**: `SimpleKeyRotator.js` was migrated to use Redis via `stateManager`, but `getStatus()` and `clearAll()` still referenced the old removed `this.failedKeys` local Map.
- **Resolution**: Updated `getStatus()` to return a safe empty `{ totalFailed: 0, failures: [] }` and `clearAll()` to be a no-op (Redis TTLs expire naturally).
- **Files Modified**: `backend/services/aiAgent/SimpleKeyRotator.js`


### [FIX] Company Key Lookup Not Finding Company-Added Keys
- **Date**: 2026-02-28
- **Description**: Company-level AI keys added via the company settings page were not being picked up by the AI engine, causing it to always fall back to Super Admin keys.
- **Root Cause**: The key selection query in `modelManager.js` filtered on `keyType: 'COMPANY'` only, but keys added before the fix were stored with `keyType: 'CENTRAL'`. Also the central fallback did not exclude keys with a `companyId`.
- **Resolution**: Rewrote `getNextKeySimple` in `modelManager.js` to strictly prioritize keys with `companyId`. If ANY active keys are found for the company, the query returns immediately. Only if ZERO company keys exist does it fall back to an an explicit separate query for `CENTRAL` keys (where `companyId: null`). This prevents any race condition or accidental sharing of central keys when company keys are available.
- **Files Modified**: `backend/services/aiAgent/modelManager.js`


### [FIX] Queue Settings Crash - getSharedPrismaClient() Called Without Null Check
- **Date**: 2026-02-28
- **Description**: `MessageQueueManager.getCompanyQueueSettings` crashed with `TypeError: Cannot read properties of undefined (reading 'findUnique')` when Prisma was not yet initialized.
- **Root Cause**: `getSharedPrismaClient()` was chained directly without a null check: `getSharedPrismaClient().aiSettings.findUnique(...)`.
- **Resolution**: Stored result in a variable with an explicit null guard before use.
- **Files Modified**: `backend/routes/queueRoutes.js`


### [FIX] Embedding Helper Using Removed `geminiKey` Model
- **Date**: 2026-02-28
- **Description**: Embedding API key lookup crashed with `Cannot read properties of undefined (reading 'findMany')` because it referenced `prisma.geminiKey` which no longer exists in the schema.
- **Root Cause**: `embeddingHelper.js` was never updated when `GeminiKey` model was replaced by the unified `AiKey` model.
- **Resolution**: Updated `getAllAvailableApiKeys` and `getActiveApiKey` to use `prisma.aiKey` with the same company→central fallback logic.
- **Files Modified**: `backend/services/embeddingHelper.js`


### [FIX] PG-Vector SQL Using snake_case Column Names
- **Date**: 2026-02-28
- **Description**: `postgresVectorService.js` raw SQL queries used `company_id`, `is_active`, `category_id` but Prisma-managed PostgreSQL stores them as `companyId`, `isActive`, `categoryId` (camelCase). PostgreSQL treated the unquoted names as lowercase, causing `column "company_id" does not exist`.
- **Resolution**: Changed all raw SQL column references to use quoted camelCase: `"companyId"`, `"isActive"`, `"categoryId"`.
- **Files Modified**: `backend/services/postgresVectorService.js`


### [FIX] Failover Settings Query Crash in getCurrentActiveModel
- **Date**: 2026-02-28
- **Description**: `ModelManager.getCurrentActiveModel` crashed with `TypeError: Cannot read properties of undefined (reading 'findUnique')` at line 1317.
- **Root Cause**: `getSharedPrismaClient()` returned `undefined` when the failover variables were being retrieved.
- **Resolution**: Added a `if (prisma)` null guard and a `try/catch` block around the database query to prevent crashes and ensure default failover behavior when the DB is unavailable.
- **Files Modified**: `backend/services/aiAgent/modelManager.js`


### [FIX] Raw SQL Case Sensitivity in AI Response Monitor
- **Date**: 2026-02-28
- **Description**: `aiResponseMonitor.js` raw SQL queries failed with `column "companyid" does not exist`.
- **Root Cause**: PostgreSQL folds unquoted identifiers to lowercase. Prisma's camelCase columns (e.g., `companyId`) must be double-quoted in raw SQL.
- **Resolution**: Added double quotes to all camelCase column names in `aiResponseMonitor.js` and re-enabled `saveFailureLog` to database.
- **Files Modified**: `backend/services/aiResponseMonitor.js`

# Team Sync & Daily Notes

## Current Focus (2026-03-17)
- **Asset Management Suite (FEATURE/FIX)**: [2026-03-17] Launched the **Asset Cloning** functionality. Resolved 404/500 backend errors by fixing route priorities in `server.js` and correcting `ReferenceError` in the controller. On the frontend, implemented a robust list refresh mechanism that eliminates "Duplicate Key" warnings by using a Map-based de-duplication strategy in `AssetList.tsx`.
- **Homepage Activation Logic Fix (FIX)**: [2026-03-13] Resolved the issue where activating a homepage template did not reflect on the storefront. Modified `homepageController.js` to synchronize `StorefrontSettings` mode to `'template-page'` during template activation, creation, and import.
- **Company Dashboard Stability (FIX)**: Resolved a recurring "Maximum update depth exceeded" infinite loop in `CompanyDashboard.jsx` by refactoring `useCallback` hook dependencies to remove cyclic state updates.
- **Product Page UI Final Refinement (FEATURE)**: Completed the restoration and enhancement of the `Description` and `SEO` tabs. The SEO tab now includes meta title/description, canonical URL, tags management, and a live Google Search preview.
- **Code Quality & Linting (FIX)**: Performed a comprehensive cleanup of `ProductNewFinal.tsx`, resolving `TFunction` type mismatches and removing over 15 unused state variables and functions identified by the build pipeline.
- **Enterprise Task Management Scalability (FIX/UPGRADE)**: [2026-03-17] Finalized scalability upgrades for the Tasks module.
    1. **Backend**: Implemented server-side pagination and advanced filtering in `taskController.js` to support enterprise-scale task lists without UI lag.
    2. **Frontend**: Modularized the monolithic `Tasks.tsx` by extracting detail views and filters into standalone components (`FilterSidebar`, `ProjectDetailsModal`).
    3. **Bug Fix**: Patched a critical API error in `updateTask` where the frontend was inadvertently sending un-writeable Prisma relations (e.g. `projectName`) back to the server.
- **Deployment & Synchronization (DEVOPS)**: [2026-03-17] Resolved Git merge conflicts in `backend/server.js` while preserving the new Agent Workspace background cron and optimized notification logic. Addressed CI/CD documentation compliance block by properly documenting locale updates and server resolutions.

### [INFO] Repository Cleanup & Maintenance
- **Date**: 2026-02-26
- **Description**: Staged deletion of temporary diagnostic/debug scripts (`debug_*.js`, `find_*.js`) and correctly ignored local `public/uploads/` directories in `.gitignore`. Verified documentation compliance.
- **Files Modified**: `.gitignore`, `backend/Structure.md`, `backend/TEAM_SYNC.md`


### [FIX] CSS Import Order & Build Optimization
- **Date**: 2026-02-26
- **Description**: Production build was failing because `@import` statements were not at the top of the file in `index.css`.
- **Root Cause**: Manual additions to the top of `index.css` pushed existing imports down, violating CSS specification rules.
- **Resolution**: Reorganized `index.css` to ensure all `@import` statements (fonts, Tailwind, themes) are at the very top.
- **Files Modified**: `frontend/src/styles/index.css`


### [FIX] SuperAdmin AI Configuration Syntax Error
- **Date**: 2026-02-26
- **Description**: Frontend build failed with `Unexpected ')'` in `SuperAdminAIProviders.tsx`.
- **Root Cause**: A stray closing parenthesis was left in the JSX return statement during a previous edit.
- **Resolution**: Removed the redundant parenthesis and verified the component's render logic.
- **Files Modified**: `frontend/src/pages/SuperAdminAIProviders.tsx`


### [FIX] UserCompany Association & Data Integrity
- **Date**: 2026-02-26
- **Description**: Identified missing `UserCompany` associations for existing users, which caused data visibility issues in company dashboards. Deleted obsolete helper files and established migration scripts.
- **Root Cause**: Manual user creation or incomplete registration flows left some users without a valid link to their respective companies in the `UserCompany` pivot table.
- **Resolution**:
    1. Implemented `backend/scripts/migrateExistingUsersToUserCompany.js` to systematically link orphans.
    2. Added `backend/scripts/checkUserCompanies.js` for data integrity validation.
    3. Removed `backend/update-facebook-sdk.bat` and `frontend/public/task-request-builder.html` as they were redundant or superseded.
- **Files Modified**:
  - `backend/scripts/migrateExistingUsersToUserCompany.js`
  - `backend/scripts/checkUserCompanies.js`
  - `backend/scripts/manageQuota.js`


### [FIX] Advance Service Syntax Error (Duplicate Declaration)
- **Date**: 2026-02-24
- **Description**: Backend failed to start with `SyntaxError: Identifier 'where' has already been declared`.
- **Root Cause**: Duplicate `const where = { companyId };` and status filter logic within `getAllAdvances` in `advanceService.js`.
- **Resolution**: Removed the redundant declaration.
- **Files Modified**: `backend/services/hr/advanceService.js`


### [FIX] Remote Server Connectivity Fix
- **Date**: 2026-02-26
- **Description**: Resolved a critical "Prisma client not ready" issue on the production server by regenerating the Prisma client and clearing the process backlog. Confirmed database connectivity and verified the health check endpoint.
- **Files Modified**: N/A (Server configuration, Prisma client regeneration)


### [FIX] Prisma Validation & Schema Misalignment (test_lux_company script)
- **Date**: 2026-02-26
- **Description**: Provisioning script for test company failed due to missing required fields and incorrect relationship mapping.
- **Root Cause**: Changes in Prisma models (`User`, `Company`, `StorefrontSettings`) weren't reflected in the script.
- **Resolution**: Updated `create_lux_company.js` to include `firstName`, `lastName`, and `supportedLanguages`. Corrected `user -> company` link from `ownerId` to `companyId`.
- **Files Modified**: `backend/create_lux_company.js`


### [FIX] Production Deploy Regression: Missing Prisma Compatibility Client
- **Date**: 2026-03-30
- **Description**: Production backend failed to boot after deploy, `maxp-backend` entered a PM2 restart loop, and both local/public health checks failed until the Prisma compatibility client was restored.
- **Root Cause**:
  1. Prisma generation targets the custom output directory `backend/prisma/generated/postgresql_v2`.
  2. The deploy completed with that generated directory present, but without `backend/node_modules/.prisma/client`.
  3. A few startup-path modules still loaded `@prisma/client` at require-time, so Node resolved `node_modules/@prisma/client/default.js` which immediately failed on missing `.prisma/client/default`.
- **Resolution**:
  1. Rebuilt `node_modules/.prisma/client` on the server by syncing it from `prisma/generated/postgresql_v2`.
  2. Removed unused top-level `@prisma/client` imports from `conversationStatsController.js`, `whatsappController.js`, and `subscriptionRenewalService.js`.
  3. Hardened all deploy entry points (`.github/workflows/deploy.yml`, `deploy.sh`, `deploy_automated.ps1`) to copy the generated client into `node_modules/.prisma/client` and fail fast if `default.js` is missing.
- **Files Modified**:
  - `backend/controller/conversation/conversationStatsController.js`
  - `backend/controller/whatsappController.js`
  - `backend/services/subscriptionRenewalService.js`
  - `.github/workflows/deploy.yml`
  - `deploy.sh`
  - `deploy_automated.ps1`


### [FIX] Backend Startup SyntaxError
- **Date**: 2026-02-15
- **Description**: Backend fails to start with error `SyntaxError: Identifier 'prisma' has already been declared`.
- **Root Cause**: Duplicate `const prisma = getSharedPrismaClient();` declarations in `backend/controller/conversationController.js`.
- **Resolution**: Removed redundant declarations and kept only one at the start of the function.
- **Files Modified**: `backend/controller/conversationController.js`


### [FIX] GuestOrder Synchronization Failure
- **Date**: 2026-02-23
- **Description**: Guest orders were not reaching provider companies during synchronization.
- **Root Cause**:
  1. `internalSyncService.js` was using `externalId` instead of `id` for local product lookups in guest orders.
  2. `sharedDatabase.js` had a "context sticking" issue where RLS context (`app.current_company_id`) wasn't explicitly reset when `companyId` was null.
  3. `PrismaClientValidationError` occurred because the `CommissionType` enum was missing `AFFILIATE`, `MERCHANT`, and `PLATFORM` values.
- **Resolution**:
  1. Updated `internalSyncService.js` to correctly normalize guest order items using `productId` for unique lookup.
  2. Modified `sharedDatabase.js` to explicitly reset `app.current_company_id = ''` in a transaction when no company context is provided.
  3. Updated `backend/prisma/schema/enums.prisma` to include the missing `CommissionType` values.
- **Files Modified**:
  - `backend/services/internalSyncService.js`
  - `backend/services/sharedDatabase.js`
  - `backend/prisma/schema/enums.prisma`


### [FIX] RLS Context and Subdomain Sync Failure (Targeted Switching)
- **Date**: 2026-02-23
- **Description**: Guest orders on public store subdomains were not synchronizing to providers because the RLS context was either empty or incorrectly bypassed.
- **Root Cause**:
  1. `subdomainMiddleware.js` didn't set the initial tenant context.
  2. `InternalSyncService.js` used a `null` bypass which, under the current RLS policy, hides all records with a `companyId`.
- **Resolution**:
  1. Updated `InternalSyncService.js` to use `tenantContext.run(companyId)` for targeted switching between consumer and provider contexts.
  2. Updated `affiliateService.js` to switch to consumer context when looking up owners.
  3. Ensured `subdomainMiddleware.js` wraps the entire route in the company context.
- **Files Modified**:
  - `backend/services/internalSyncService.js`
  - `backend/services/affiliateService.js`
- [ ] Check if the app is properly installed on the page
- [ ] Check if the page admin has granted the necessary permissions


### [FIX] Prisma Model Rename: AiSettings → AiSetting
- **Date**: 2026-02-24
- **Description**: All Prisma calls to `prisma.aiSettings` were throwing runtime errors after the schema model was renamed.
- **Root Cause**: The Prisma model `AiSettings` was renamed to `AiSetting` (singular) in `backend/prisma/schema/ai_analytics.prisma` and `backend/prisma/schema/core.prisma`, but `settingsManager.js` still referenced the old accessor `prisma.aiSettings`.
- **Resolution**: Updated all 6 occurrences of `prisma.aiSettings` → `prisma.aiSetting` (findFirst, findUnique, update, create) and updated the null guard checks accordingly.
- **Files Modified**:
  - `backend/services/aiAgent/settingsManager.js`
  - `backend/prisma/schema/ai_analytics.prisma`
  - `backend/prisma/schema/core.prisma`


### [FIX] Homepage Public Route Noisy Debug Logging
- **Date**: 2026-02-24
- **Description**: Every hit to `/api/v1/homepage/public/:companyId` was emitting 3 verbose `console.log` lines to stdout in production.
- **Root Cause**: Debug middleware was left in-place on the route definition in `homepageRoutes.js`.
- **Resolution**: Removed the inline debug middleware; the route now calls the controller directly.
- **Files Modified**: `backend/routes/homepageRoutes.js`


### [FIX] Product Creation ReferenceError
-   **Date**: 2026-02-24
-   **Description**: Backend crashes with `ReferenceError: transliterateArabicToFranco is not defined` when creating/products.
-   **Root Cause**: The transliteration function was defined locally within another function, making it inaccessible to `createProduct`.
-   **Resolution**: Moved `transliterateArabicToFranco` and its mapping to the file scope in `productController.js`.
-   **Files Modified**: `backend/controller/productController.js`


### [FIX] Facebook Message Reliability & Server Restarts
-   **Date**: 2026-02-24
-   **Description**: Intermittent failure in receiving Facebook messages and frequent backend restarts (33+ times).
-   **Root Cause**:
    1.  High memory pressure caused PM2 to restart the process frequently, clearing in-memory caches.
    2.  Lack of detailed logging for "ignored" webhook events made it difficult to verify delivery.
-   **Resolution**:
    1.  Increased PM2 memory limit to 1GB (`max_memory_restart: 1G`) to prevent unnecessary restarts.
    2.  Enhanced logging in `webhookController.js` to track message reception and explain "ignored" reasons.
    3.  Applied code fixes directly to the server to ensure 100% availability.
-   **Files Modified**:
    -   `backend/controller/webhookController.js`
    -   Server PM2 configuration


### [FIX] 403 Forbidden on Customer Block Status Check
- **Date**: 2026-02-24
- **Description**: Users received a 403 Forbidden error when opening a Facebook conversation, specifically from the `checkCustomerBlockStatus` call.
- **Root Cause**: The authorization logic was too strict, comparing the user's `companyId` with the `facebookPage.companyId`. If the page was not yet fully linked to the specific company ID in the database (`companyId` was `null`), the check `null !== companyId` returned true, triggering a 403.
- **Resolution**:
    1. Added detailed server-side logging (`console.log`, `console.warn`) for easier debugging of permission issues.
    2. Refined the authorization logic to allow access if:
        - The user is a `SUPER_ADMIN`.
        - The user's `companyId` matches the page's `companyId`.
        - The page's `companyId` is `null` (unclaimed/newly connected page), allowing authenticated company users to check status.
- **Files Modified**: `backend/controller/customerController.js`
- **Update (2026-02-24)**: Added comprehensive diagnostic logging in `customerController.js` and `verifyToken.js` to trace `req.user` state, `companyId` resolution from headers vs. token, and entrance to the block-status check.


### [FIX] 404 API Route Not Found: Facebook Comments Filter
- **Date**: 2026-03-07
- **Description**: POST requests to `/api/v1/comments/facebook-comments/:id/filter` were returning 404 despite the route being defined.
- **Root Cause**:
    1. **Route Precedence**: The `commentRoutes` were registered late in `server.js`, potentially being intercepted or ignored by other middleware/routes.
    2. **Hoisting & Export Issues**: The `filterCommentAI` function in `commentController.js` was defined using a `const` after the `module.exports` block in some iterations, leading to an `undefined` reference when the router attempted to bind it.
- **Resolution**:
    1. **Prioritization**: Moved `app.use("/api/v1/comments", commentRoutes)` to a higher position in `server.js` (above most company-specific routes).
    2. **Code Reorganization**: Rewrote `commentController.js` to use function declarations (properly hoisted) and moved `module.exports` to the absolute end of the file.
    3. **Diagnostic Layer**: Added a diagnostic middleware in `server.js` and `commentRoutes.js` to log hits to the comments API.
    4. **Version Footprint**: Added `VERSION: 2026-03-07-2111` to the server startup log to verify the active code branch.
- **Files Modified**:
    - `backend/server.js`
    - `backend/controller/commentController.js`
    - `backend/routes/commentRoutes.js`
- **Status**: ✅ Resolved and Diagnostic-Ready.


### [FEATURE] Task Management System Upgrades
- **Date**: 2026-03-10
- **Description**: Enhanced the HR task system with full lifecycle tracking and proactive notifications.
- **Key Improvements**:
    1. **Timeline Tracking**: Added `startDate` field to tasks (Backend & Frontend).
    2. **Ownership Visibility**: Displayed "Created By" information in task lists and details.
    3. **Automated Notifications**: Integrated `taskNotificationService.js` to send multi-channel alerts (In-app & WhatsApp) for creation, comments, and status changes.
    4. **Proactive Reminders**: Created `taskDeadlineCron.js` to send daily WhatsApp reminders for tasks due within 24 hours.
- **Files Modified**:
    - `backend/controller/taskController.js`
    - `backend/services/taskNotificationService.js`
    - `backend/cron/taskDeadlineCron.js`
    - `backend/server.js`
    - `frontend/src/pages/tasks/Tasks.tsx`
    - `frontend/src/pages/tasks/TaskDetails.tsx`
- **Status**: ✅ Deployed and operational.


### [FIX] Frontend Production Build Failure (JSX & CSS)
- **Date**: 2026-03-10
- **Description**: Production build failed due to syntax errors in `Tasks.tsx` and CSS import order violations.
- **Root Cause**: 
    1. **Tasks.tsx**: Missing opening `<div>` tag was introduced in line 1564 during the task creator display upgrade.
    2. **CSS**: CSS `@import` statements were placed after `@config` directives in `storefront-content.css` and `storefront-commerce.css`, which is disallowed by Vite/PostCSS.
- **Resolution**:
    1. Restored the missing `<div className="flex items-center">` in `Tasks.tsx`.
    2. Reordered CSS files to ensure all `@import` statements precede `@config` or other statements.

### [FIX] Turbo Express Order Status Synchronization & Fallback Hardening
- **Date**: 2026-03-09
- **Description**: Resolved critical status mutations, invalid Prisma enum values (`COMPLETED`/`PAID`), and Cairo fallback risks across Turbo shipping integrations.
- **Root Cause**:
    1. `turboTrackingScheduler.js` wrote invalid Prisma enum values `status: 'COMPLETED'` and `paymentStatus: 'PAID'` instead of `DELIVERED` and `COMPLETED`.
    2. `turboWebhook.js` had duplicated and inconsistent status update logic between standard `Order` and `GuestOrder`.
    3. `turboService.js` fell back silently to `"القاهرة"` when governorates were missing or unmapped, creating wrong shipment destinations.
- **Resolution**:
    1. Created unified `turboStatusSyncService.js` to handle all Turbo status updates for both `Order` and `GuestOrder` consistently.
    2. Updated `statusNormalizer.js` with `getSystemStatusFromTurbo` mapping valid Prisma `OrderStatus` and `PaymentStatus` enums (`DELIVERED`, `SHIPPED`, `PROCESSING`, `CANCELLED`, `RETURNED`, `ON_HOLD`, `COMPLETED`).
    3. Modified `turboService.js` to eliminate silent fallback to Cairo, throwing a clear Arabic error if governorate is missing/unresolvable.
- **Files Modified**:
    - `backend/services/turboStatusSyncService.js`
    - `backend/utils/statusNormalizer.js`
    - `backend/routes/turboWebhook.js`
    - `backend/services/turboTrackingScheduler.js`
    - `backend/services/turboService.js`
- **Status**: ✅ Resolved and syntax verified.


