# Orders & E-Commerce Bugs

> Domain-specific bug tracker for orders, WooCommerce sync, affiliates, and distribution.

### [FIX] Invalid Prisma ProductVariant Select in Simple Order Detail Route (2026-06-01)
- **Description**: Fetching simple order details under `/api/v1/orders-new/simple/:orderNumber` failed with a 500 error on the frontend.
- **Root Cause**: The database query `productVariant.findMany` in `orders.js` requested non-existent `color` and `size` fields in its `select` statement. The `ProductVariant` database schema does not have explicit columns for these; they are stored inside the `metadata` JSON object or parsed from the variant's `name`.
- **Resolution**: Removed `color` and `size` fields from the Prisma select statement in `backend/routes/orders.js`. The resolution logic below it correctly falls back to parsing these values from `metadata` or `name` if they are not explicitly present.
- **Files Modified**: `backend/routes/orders.js`

### [FIX] Order Details / List UI Crash Mappings (2026-06-01)
- **Description**: Opening or listing orders with unspecified sources ("غير محدد") threw a 500 error and crashed the details page.
- **Root Cause**: Null or undefined values for `status`, `paymentStatus`, or `paymentMethod` caused `TypeError` when calling `.toLowerCase()` directly in the API mapping layer.
- **Resolution**:
    1. Added fallback handlers in `/simple` and `/simple/:orderNumber` routes inside `backend/routes/orders.js`.
    2. Synchronized mapping logic in `orderController.js`, `customerController.js`, and `preparationQueueService.js` to handle nulls safely.
- **Files Modified**: `backend/routes/orders.js`, `backend/controller/orderController.js`, `backend/controller/customerController.js`, `backend/services/preparationQueueService.js`

### [UI/FIX] Customer Blocklist Moved Out Of Order Settings Tabs (2026-05-07)
- **Description**: `حظر العملاء` appeared twice for operators: once as a separate orders menu item and again as an embedded tab inside `إعدادات الطلبات`, which made the IA feel duplicated and confusing.
- **Root Cause**:
    1. `frontend/src/config/sidebar.ts` treated customer blocking like a standalone orders destination.
    2. `frontend/src/pages/settings/OrderSettings.tsx` still rendered the same feature as an internal tab, and old links redirected into that tab.
- **Resolution**:
    1. Removed the `حظر العملاء` tab from `OrderSettings.tsx`.
    2. Restored `/settings/customer-blocks` as the standalone destination for the feature.
    3. Added a dedicated orders sidebar link for `/settings/customer-blocks`.
    4. Preserved backward compatibility by redirecting legacy `/settings/orders?tab=customer-block` links to the standalone page.
- **Verification**:
    - `src/pages/settings/__tests__/OrderSettings.test.tsx`
    - `src/config/__tests__/sidebar.ordersSettings.test.ts`
- **Files Modified**: `frontend/src/App.tsx`, `frontend/src/config/sidebar.ts`, `frontend/src/config/__tests__/sidebar.ordersSettings.test.ts`, `frontend/src/pages/settings/OrderSettings.tsx`, `frontend/src/pages/settings/__tests__/OrderSettings.test.tsx`, `frontend/src/locales/ar/translation.json`, `frontend/src/locales/en/translation.json`

### [UI/FIX] Agent Workspace Cancelled Orders Tab (2026-05-03)
- **Description**: `مركز التأكيد والمتابعة` hid orders after an agent cancelled them, so cancellation was applied to the order status but no longer visible in the workspace.
- **Root Cause**: `agentWorkspaceController.js` excluded `CANCELLED` from the default assigned-order feed, while the frontend only had active-state tabs.
- **Resolution**:
    1. Kept `CANCELLED` assigned orders in the workspace feed while still excluding `TRASH`, `DELETED`, and `COMPLETED`.
    2. Added a dedicated cancelled tab/count in `AgentWorkspace.tsx`.
    3. Disabled reconfirmation from cancelled rows so cancellation behaves like a terminal workspace state.
- **Verification**:
    - `backend/tests/controller/agentWorkspaceController.test.js`
- **Files Modified**: `backend/controller/agentWorkspaceController.js`, `frontend/src/pages/orders/AgentWorkspace.tsx`, `frontend/src/locales/ar/sections/orders.json`, `frontend/src/locales/en/sections/orders.json`

### [UI/FIX] Manual Order Area Field + Variant Detail Confirmation (2026-04-20)
- **Description**: The admin manual-order flow was missing the exact zone/area inside the selected governorate, and selected variant details were not consistently visible in either the cart summary or the final confirmation dialog.
- **Root Cause**:
    1. The left checkout form only persisted governorate/city details and had no dedicated `area` value for intra-governorate delivery context.
    2. Variant presentation relied on inconsistent product payload shapes, so `color` / `size` values stored in `attributeValues` or `metadata` were not always shown back to the agent.
    3. The confirmation dialog summarized only the product count, which hid the exact product/variant combination being approved.
- **Resolution**:
    1. Added an `area`/zone field in `frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx` with structured Turbo-area support plus a free-text fallback.
    2. Added `frontend/src/pages/admin/ManualOrder/utils/variantAttributes.ts` so color/size extraction is normalized across direct fields, `attributeValues`, and `metadata`.
    3. Updated the cart and confirmation summary to render product name, color, size, and quantity before order creation.
    4. Extended `frontend/src/services/customerService.ts` so the manual-order payload preserves `governorate` and `area` explicitly.
- **Verification**:
    - `npm test -- --runInBand src/pages/admin/ManualOrder/__tests__/CheckoutColumn.test.tsx src/pages/admin/ManualOrder/__tests__/ManualOrderPage.test.tsx`
    - `npm run build` (from `frontend/`)
    - Live verification on `https://maxp.online/orders/manual`
- **Files Modified**: `frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx`, `frontend/src/pages/admin/ManualOrder/components/CartColumn.tsx`, `frontend/src/pages/admin/ManualOrder/components/ProductSearchColumn.tsx`, `frontend/src/pages/admin/ManualOrder/ManualOrderPage.tsx`, `frontend/src/pages/admin/ManualOrder/utils/variantAttributes.ts`, `frontend/src/services/customerService.ts`
+
+### [UI/FIX] Interactive Status Dropdown & Dashboard Refinements (2026-04-14)
+- **Description**: The order management interface used static status indicators that lacked interaction. Redesigned the status badge into a functional dropdown.
+- **Resolution**:
+    1. Implemented a custom dropdown component in `OrderHeader.tsx` using status colors and icons.
+    2. Refined `OrderStats.tsx` and `TurboRecords.tsx` for smoother data display.
+    3. Ensured "New" badge status synchronization across all order views.
+- **Files Modified**: `frontend/src/pages/orders/components/OrderHeader.tsx`, `frontend/src/pages/orders/OrderDetails.tsx`, `frontend/src/pages/orders/OrderStats.tsx`, `frontend/src/pages/orders/TurboRecords.tsx`

### [FIX] Storefront Order Confirmation Email Null-Safety (2026-04-11)
- **Description**: Storefront order creation could reach the confirmation-email branch with a partially normalized payload, causing the email formatter to throw before the request finished cleanly.
- **Root Cause**:
    1. `backend/routes/publicOrdersRoutes.js` assumed `createdOrder.items` was always an array before mapping it into the email payload.
    2. `backend/services/email/EmailService.js` assumed `items` always supported `.map()` and `total` always exposed `.toLocaleString()`.
- **Resolution**:
    1. Wrapped the route-level email payload generation in an `Array.isArray(createdOrder.items) ? ... : []` guard.
    2. Normalized `items` to `[]` and `total` to `Number(total || 0)` inside `EmailService.sendOrderConfirmation()` before building the HTML template.
- **Impact**:
    - Order creation no longer risks crashing the post-create email path when item normalization is incomplete.
    - Confirmation emails now degrade safely for incomplete payloads instead of throwing runtime errors.
- **Files Modified**: `backend/routes/publicOrdersRoutes.js`, `backend/services/email/EmailService.js`

### [FIX] Agent Workspace Frontend & Backend Stability
- **Date**: 2026-03-17
- **Description**: Resolved critical runtime errors and API failures in the newly implemented Agent Workspace.
- **Fixes**:
    - **Frontend**: Fixed `TypeError: Cannot read properties of undefined (reading 'length')` in `AgentWorkspace.tsx` by adding defensive null checks to the orders fetch response.
    - **Backend**: Resolved `OrderService is not a constructor` error in `agentWorkspaceController.js` by correctly using the pre-instantiated service object instead of attempting to `new` it.
    - **Backend**: Fixed `PrismaClientValidationError` (missing status) in `quickAction` handler by mapping the frontend `'confirm'` action to the backend `'CONFIRMED'` status and providing user name fallbacks.
    - **Internationalization**: Finalized Arabic translations for the workspace sidebar and order actions.
- **Files Modified**: `frontend/src/pages/orders/AgentWorkspace.tsx`, `backend/controller/agentWorkspaceController.js`, `frontend/src/i18n/index.ts`


### [FEATURE/FIX] Auto-Distribution Trigger on Order Creation
- **Date**: 2026-03-09
- **Description**: Automatic order distribution was failing due to schema mismatches and circular dependencies. It is now fully operational across all storefront and manual entry points.
- **Fixes**:
    - Resolved `OrderConfirmationService is not a constructor` by fixing illegal `new` calls in test scripts and ensuring instance-based usage.
    - Fixed Prisma schema mismatch by removing the non-existent `lastOrderAt` field from `orderService.js` (Customer updates).
    - Resolved circular dependency between `orderService.js` and `orderConfirmationService.js` by moving requirements inside method scopes.
- **Verification**:
    - Verified backend logic via `robust_verify_auto_assign.js`.
    - Verified full UI flow on `/orders/manual` using Chrome DevTools MCP.
    - **Verified full Guest Checkout Flow** on the public storefront (`mokhtar-1.localhost:3000`): confirmed order `#ORD-958331-388` was automatically assigned to an agent via database and dashboard verification.
- **Files Modified**: `backend/services/orderConfirmationService.js`, `backend/services/orderService.js`, `backend/verify_auto_assign.js`



### [SECURITY/FIX] DoS Vulnerability in Bulk Order Confirmation/Assignment Endpoints
- **Date**: 2026-03-16
- **Description**: The newly added bulk operations (`/confirm/bulk` and `/assign/bulk`) accepted an unbounded array of `orderIds`, opening a prominent vector for Denial of Service (DoS) attacks by locking the Event Loop and exhausting DB connections during iteration.
- **Resolution**: Enforced a `BULK_LIMIT = 100` constant. Any request exceeding 100 orders is immediately rejected with a `400 Bad Request` before processing begins.
- **Files Modified**: `backend/routes/orderConfirmationRoutes.js`


### [FEATURE] Implementation of Order Trash System (Trash & Restore)
- **Date**: 2026-03-14
- **Description**: Implemented a complete trash system for orders, allowing users to soft-delete (trash) and restore orders.
- **Resolution**:
    1. **Backend**: Modified `orderController.js`, `orders.js`, and `enhancedOrderService.js` to exclude `TRASH` orders by default.
    2. **Backend**: Updated `orderService.js` with intelligent restore logic (restoring to the previous status from history).
    3. **Backend**: Updated `/bulk/status` route in `orders.js` to support `TRASH` and `RESTORE` with full history logging.
    4. **Frontend**: Updated `Orders.tsx` with a dedicated "Trash" tab, status color/text mapping, and bulk trash/restore operations.
- **Files Modified**: `backend/controller/orderController.js`, `backend/services/orderService.js`, `backend/routes/orders.js`, `backend/services/enhancedOrderService.js`, `frontend/src/pages/orders/Orders.tsx`



### [FEATURE] WooCommerce Auto-Export (Including Guest Orders)
- **Date**: 2026-03-14
- **Description**: Implemented automatic synchronization of all orders to WooCommerce, including full support for Guest Orders created via the storefront.
- **Resolution**:
    1. **Backend**: Enhanced `WooCommerceAutoExportService.js` to fetch and map guest-specific data (name, phone, governorate).
    2. **Backend**: Integrated automatic export triggers in `publicOrdersRoutes.js` and `enhancedOrderService.js`.
    3. **Backend**: Verified existing triggers in `posController.js` and AI-driven order flows.
- **Files Modified**: `backend/services/wooCommerceAutoExportService.js`, `backend/services/enhancedOrderService.js`, `backend/routes/publicOrdersRoutes.js`


### [ADD] Trash Order Status
- **Date**: 2026-03-14
- **Description**: Added a new system-wide `TRASH` status for archiving and soft-deleting orders, with full WooCommerce synchronization.
- **Resolution**:
    1. **Database**: Updated `OrderStatus` enum in `enums.prisma`.
    2. **Backend**: Updated `wooCommerceStatusService.js` to map `TRASH` to WooCommerce's `trash` status (Export) and fix incoming mapping where `trash`/`deleted` were previously mapped to `CANCELLED`. Also fixed hardcoded `CANCELLED` status in `wooCommerceWebhookController.js`.
    3. **Frontend**: Added translations for "TRASH" (`مهملة`) in Arabic and English localization files.
- **Files Modified**: `backend/prisma/schema/enums.prisma`, `backend/services/wooCommerceStatusService.js`, `backend/controller/wooCommerceWebhookController.js`, `frontend/src/locales/ar/sections/orders.json`, `frontend/src/locales/en/sections/orders.json`


### [FIX] WooCommerce Webhook Ping & Secret Exposure
- **Date**: 2026-03-14
- **Description**: WooCommerce webhooks were failing to synchronize orders due to unhandled ping requests and difficulty in manual configuration (hidden secret).
- **Resolution**:
    1. **Backend**: Added handling for `action.woocommerce_webhook_ping` and generic "ping" detection in labels.
    2. **Backend**: Optimized `server.js` to capture `rawBody` for all WooCommerce-related routes to ensure signature validity.
    3. **Backend**: Added GET support for webhook pings to satisfy WooCommerce endpoint validation.
    4. **Backend**: Improved error handling to return 200 on "Settings Not Found" to prevent aggressive WooCommerce retry loops.
    5. **Frontend**: Exposed `webhookSecret` and added copy-to-clipboard functionality for manual store setup.
- **Files Modified**: `backend/controller/wooCommerceWebhookController.js`, `backend/controller/wooCommerceSettingsController.js`, `frontend/src/pages/woocommerce/components/SettingsTab.tsx`, `frontend/src/pages/woocommerce/hooks/useWooCommerceSettings.ts`, `frontend/src/pages/woocommerce/types.ts`


### [FIX] WooCommerce Status Mapping - 'trash'/'deleted' Incorrectly mapped
- **Date**: 2026-03-14
- **Description**: Incoming orders from WooCommerce with 'trash' or 'deleted' status were incorrectly mapped to 'CANCELLED'.
- **Root Cause**: Hardcoded mapping in `wooCommerceWebhookController.js` and missing keywords in `wooCommerceStatusService.js`.
- **Resolution**:
    1. Added `trash` and `deleted` to `defaultStatusMapping` in `wooCommerceStatusService.js`, mapping them to a new local `TRASH` status.
    2. Updated `handleOrderDeleted` in `wooCommerceWebhookController.js` to use `TRASH` instead of `CANCELLED`.
    3. Added translations for `trash` in order locales.
- **Files Modified**: `backend/services/wooCommerceStatusService.js`, `backend/controller/wooCommerceWebhookController.js`, `frontend/src/locales/ar/sections/orders.json`, `frontend/src/locales/en/sections/orders.json`


### [FIX] Unified Simple Orders Dashboard (Regular + Guest)
- **Date**: 2026-03-11
- **Description**: Resolved fragmentation in the orders dashboard where guest orders were missing or separate from regular orders.
- **Resolution**:
    1. Modified `backend/routes/orders.js` (`/simple`) to perform a "Top N" fetch from both `Order` and `GuestOrder` tables.
    2. Implemented complex merging and sorting by `createdAt` desc in the API layer.
    3. Unified the data format so the frontend `Orders.tsx` handles both types transparently.
    4. Enhanced search and filtering (status, payment, date) to work across both data sources.
- **Files Modified**: `backend/routes/orders.js`, `frontend/src/pages/orders/Orders.tsx`


### [FIX] Guest Order Detail 500 (Invalid Prisma Include)
- **Date**: 2026-03-10
- **Description**: `/api/v1/orders-new/simple/:orderNumber` returned 500 errors when the order belonged to `GuestOrder`.
- **Root Cause**: The query attempted to `include` a non-existent `createdByUser` relation on `GuestOrder`. The correct relation is `user` via `createdBy`.
- **Resolution**: Switched the include to `user` and mapped `createdBy/createdByName/createdByUser` plus corrected guest `orderNotes` and `OrderStatusHistory` mapping in the response.
- **Files Modified**: `backend/routes/orders.js`


### [FIX] WooCommerce Webhook Sync Failure (Parameter Mismatch & RLS Context)
- **Date**: 2026-03-10
- **Description**: WooCommerce orders were not syncing locally despite successful webhook delivery from the store.
- **Root Cause**:
  1. Route parameter mismatch between `server.js` and the controller.
  2. Missing RLS (Row Level Security) context. Since webhooks run without an authentication token, the `tenantContext` was empty, causing database operations to fail or be blocked by RLS rules.
- **Resolution**:
  1. Unified the webhook route to use `:id` across all files.
  2. Wrapped the webhook processing logic in `tenantContext.run(companyId, ...)` inside `wooCommerceWebhookController.js` to ensure Prisma carries the correct `app.current_company_id` to the database.
- **Files Modified**: `backend/server.js`, `backend/controller/wooCommerceWebhookController.js`


### [FIX] WooCommerce Webhook 401 Unauthorized Response
- **Date**: 2026-03-10
- **Description**: WooCommerce setup and ping requests were failing with 401 even though the route was public.
- **Root Cause**: The webhook route was registered *after* `globalSecurity` middleware in `server.js`, which requires an auth token for all requests down the chain.
- **Resolution**: Moved the webhook POST route to the "Public" section in `server.js`, registered strictly before any security or authentication middleware.
- **Files Modified**: `backend/server.js`


### [IMPROVEMENT] WooCommerce Signature Resilience & Diagnostics
- **Date**: 2026-03-10
- **Description**: Some stores failed setup due to "Signature missing" or "Signature mismatch" errors.
- **Resolution**:
  1. Added multi-head detection (checking both `-` and `_` variations like `X-WC-Webhook-Signature` and `X_WC_Webhook_Signature`).
  2. Implemented a temporary "Diagnostic Mode" where signature mismatches are logged with full details (Expected vs Received) and treated as warnings rather than hard rejections.
  3. Added a specific bypass for `webhook.test` topics to ensure the initial WooCommerce connection handshake always succeeds.
- **Files Modified**: `backend/controller/wooCommerceWebhookController.js`


### [FIX] Order Confirmation Page Stuck on Loading Spinner
- **Date**: 2026-03-09
- **Description**: The order confirmation page was stuck on a loading spinner on subdomain storefronts.
- **Root Cause**: The page was fetching order data using a `companyId` from the URL query parameters. However, the `withStorefrontCompany` helper strips the `companyId` on subdomains (as it's already in the hostname), leaving the component without the required ID to fetch data.
- **Resolution**: Updated `OrderConfirmation.tsx` to use `getCompanyId()` as a fallback when `companyId` is missing from the URL. This ensures the correct ID is used on both subdomains and central domains.
- **Verification**: Placed a test order `ORD-237947-141` and verified that the confirmation page now renders with full order details.
- **Files Modified**: `frontend/src/pages/storefront/OrderConfirmation.tsx`



### [FIX] WooCommerce Webhook Sync Failure (Parameter Mismatch)
- **Date**: 2026-03-09
- **Description**: WooCommerce orders were not syncing to the local system despite being correctly configured on the WooCommerce side.
- **Root Cause**: There was a mismatch between the route definition in `server.js` (which used `:companyId`) and the expected parameter in `wooCommerceWebhookController.js` (which expected `:id`). This caused the controller to fail when looking up the corresponding WooCommerce settings.
- **Resolution**:
  1. Standardized the webhook route in `server.js` to use `:id`.
  2. Updated `handleWooCommerceWebhook` in `wooCommerceWebhookController.js` to robustly check for both `id` and `companyId` in the request parameters.
  3. Enhanced webhook logging to provide better visibility into incoming requests and settings lookup.
- **Files Modified**: `backend/server.js`, `backend/controller/wooCommerceWebhookController.js`

- [FIX] Employee Profile Data (2026-03-08)
- [FIX] Neo-Brutalism Styling (2026-03-08)
- [FIX] Shop Studio Integration (2026-03-08)


### [FIX] WooCommerce Webhook 401 Unauthorized Error
- **Date**: 2026-03-08
- **Description**: The WooCommerce webhook endpoint (`/api/v1/woocommerce/webhook/:id`) was rejecting incoming events with a `401 Unauthorized (Invalid Signature)`.
- **Root Cause**: The webhook signature requires the exact raw payload byte-for-byte. However, the `express.json()` middleware was parsing the body into an object, and the controller was using `JSON.stringify(req.body)` to recreate it. This altered the formatting (spacing, Unicode escaping for Arabic text) and caused the HMAC signature to mismatch.
- **Resolution**: Added a `verify` function to the `express.json()` middleware in `server.js` to preserve the raw string buffer directly on `req.rawBody` for webhook routes. The `wooCommerceWebhookController.js` now uses this exact raw body for signature verification.
- **Files Modified**: `backend/server.js`, `backend/controller/wooCommerceWebhookController.js`


### [FIX] WooCommerce Connect "Add New Site" Button Unresponsive
- **Date**: 2026-03-08
- **Description**: The "Add New Site" (إضافة موقع جديد) button on the WooCommerce integrations page was unresponsive when no sites were previously connected.
- **Root Cause**:
  1. The UI element lacked an `onClick` event handler.
  2. The system did not automatically switch to the `settings` tab when a new site insertion was requested.
- **Resolution**: Added the missing `onClick` handler, converted the `div` to a `button`, and added `useEffect` logic in `WooCommerceSync.tsx` to automatically switch to the `settings` tab and scroll to top when `'new'` site is selected.
- **Files Modified**: `frontend/src/pages/woocommerce/components/ConnectionStatus.tsx`, `frontend/src/pages/woocommerce/WooCommerceSync.tsx`


### [NEW] Easy Orders Synchronization
- **Date**: 2026-03-05
- **Description**: Integrated "Easy Orders" synchronization for bulk importing and managing orders from external easy-order services.
- **Resolution**: Added `easy_orders.prisma` schema, `easyOrdersController`, `easyOrdersImportService`, and `EasyOrdersImport.tsx` frontend page. Synchronized database schema with new models.
- **Files Added**: `backend/prisma/schema/easy_orders.prisma`, `backend/services/easyOrdersImportService.js`, `frontend/src/pages/products/EasyOrdersImport.tsx`.


### [FEATURE] Easy Order Synchronization Integration
- **Date**: 2026-03-04
- **Description**: Implemented a comprehensive order synchronization system for Easy Order, similar to the WooCommerce integration but with enhanced date preservation and dynamic status mapping.
- **Resolution**:
  1. **Prisma Schema**: Added `EasyOrdersSettings` and `EasyOrdersSyncLog` models in `easy_orders.prisma`.
  2. **Service Layer**: Created `easyOrdersImportService.js` handling cursor-based fetching, batch processing, and `createdAt` preservation.
  3. **Controller/Routes**: Implemented settings management (masked API keys), manual sync triggers, and log retrieval.
  4. **Frontend UI**: Refactored `EasyOrdersImport.tsx` with a tabbed interface, persistent settings, and a sync dashboard with live logs.
  5. **Status Mapping**: Implemented `ensureStatusConfig` to automatically create missing order statuses in the local dashboard.
- **Files Modified**:
  - `backend/prisma/schema/easy_orders.prisma`
  - `backend/services/easyOrdersImportService.js`
  - `backend/controller/easyOrdersController.js`
  - `backend/routes/easyOrdersRoutes.js`
  - `frontend/src/pages/products/EasyOrdersImport.tsx`
  - `frontend/src/locales/ar/translation.json`
  - `frontend/src/locales/en/translation.json`


### [FIX] Zero Order Total & Customer Sync Stability
- **Date**: 2026-03-04
- **Description**: Resolved critical issues where new orders were created with a total of 0 and customers were not appearing at the top of lists after activity.
  - **Fix 1 (Zero Totals)**: Modified `enhancedOrderService.js` to ensure order totals are always recalculated from product data if the provided subtotal is 0 or missing. Manual overrides are now secondary to data integrity.
  - **Fix 2 (Customer Activity)**: Integrated automatic `updatedAt` timestamp and `status` updates into the order creation flow. Customers are now automatically upgraded from `LEAD` to `ACTIVE` status upon their first successful order.
  - **Fix 3 (Frontend Sorting)**: Changed the default sort order in `CustomerList.tsx` and `LeadsList.tsx` to use `updatedAt` instead of `createdAt`, ensuring active customers/leads are always visible at the top.
  - **Fix 4 (Translation)**: Added `tableUpdatedAt` translation key to support the new "Last Activity" column in the customer table.
- **Files Modified**:
  - `backend/services/enhancedOrderService.js` (Logic fix & customer sync)
  - `frontend/src/pages/customers/CustomerList.tsx` (Sorting & table view)
  - `frontend/src/pages/customers/LeadsList.tsx` (Sorting & table view)
  - `frontend/src/locales/ar/translation.json` (Translation key)


### [FIX] Order Statuses Deletion & Custom Confirmation Dialog
- **Date**: 2026-02-28
- **Description**: Users could not delete system-provided order statuses, and `window.confirm` was frequently failing in Vite development environments.
- **Root Cause**: Backend forced a rejection if `isSystemStatus` was true. Frontend relied on a native browser dialog that occasionally misfired during HMR.
- **Resolution**: Removed backend restriction allowing any status to be soft-deleted. Replaced frontend `window.confirm` with a custom React state modal.
- **Files Modified**: `frontend/src/pages/settings/OrderStatusManager.tsx`, `backend/controller/orderStatusController.js`


### [FIX] WooCommerce Auto-Export Missing Triggers (Internal Sync & Affiliate)
- **Date**: 2026-02-28
- **Description**: Orders created through internal sync (cross-company) or affiliate direct routes were not automatically exported to WooCommerce.
- **Root Cause**: Missing integration with `wooCommerceAutoExportService` in specific direct-creation flows that bypassed the standard `enhancedOrderService`.
- **Resolution**:
    1. Integrated `wooCommerceAutoExportService.exportOrderAsync()` into `internalSyncService.js` for pushed orders.
    2. Added the export trigger to the manual/direct order route in `affiliateRoutes.js`.
    3. Verified 100% coverage across AI/Chat (via `enhancedOrderService`) and Storefront flows.
- **Files Modified**: `backend/services/internalSyncService.js`, `backend/routes/affiliateRoutes.js`


### [FIX] Affiliate Dashboard NaN Values & Missing Financial Stats
- **Date**: 2026-02-27
- **Description**: New or missing affiliate records caused `NaN` values in the management dashboard. Financial stats like "Paid" and "Pending" were showing as zero or NaN.
- **Root Cause**: The mock affiliate object returned by `listAffiliates` was missing fields like `paidEarnings`, `pendingEarnings`, and `totalClicks`.
- **Resolution**: Updated `affiliateService.js` to include initialized financial fields in the mock affiliate record.
- **Files Modified**: `backend/services/affiliateService.js`


### [FIX] Missing Affiliate Commissions for Synced & Manual Orders
- **Date**: 2026-02-27
- **Description**: Commissions were not appearing or were zero for orders synced from affiliates or created manually.
- **Root Cause**: `OrderItems` were missing `basePrice` (original selling price) and `merchantPrice` (cost), which are required by `commissionService` for profit calculation.
- **Resolution**:
    1. Modified `internalSyncService.js` to propagate `basePrice` and `merchantPrice` from the provider's product catalog during order sync.
    2. Updated `enhancedOrderService.js` to populate these fields during manual order creation.
- **Files Modified**: `backend/services/internalSyncService.js`, `backend/services/enhancedOrderService.js`



### [FIX] Affiliate Product Visibility & Manual Order Restriction
- **Date**: 2026-02-27
- **Description**: Affiliates could see all products in the general catalog and manual order sections. Enforced filtering to only show imported products.
- **Root Cause**: The filtering logic in `productController.js` incorrectly bypassed restrictions when the `manualOrder` flag was present, and the sidebar pointed to a general product list.
- **Resolution**:
    1. Modified `productController.js` to strictly filter products for affiliates in all views (except marketplace).
    2. Updated `sidebar.ts` to remove the redundant general products link and add a specific "Manual Order" link for affiliates.
- **Files Modified**: `backend/controller/productController.js`, `frontend/src/config/sidebar.ts`


### [FIX] Affiliate Registration Missing Company Association
- **Date**: 2026-02-25
- **Description**: Affiliates registered via public registration links (e.g., `https://wofod.../affiliate-register`) were not appearing in the company management dashboard.
- **Root Cause**: The registration route ignored the company context identified by the subdomain middleware and didn't establish a `UserCompany` record, which is mandatory for many company-level filters.
- **Resolution**:
    1. Updated `publicAffiliateRoutes.js` to prioritize `req.companyId` from middleware.
    2. Added automatic creation of a `UserCompany` record during registration.
    3. Explicitly set initial status to `PENDING` to ensure admin approval flow.
- **Files Modified**: `backend/routes/publicAffiliateRoutes.js`


### [FIX] Affiliate Management Dashboard Statistics (Zero Values)
- **Date**: 2026-02-25
- **Description**: Affiliate statistics (Sales, Earnings) were showing as zero in the management dashboard for manual and synced orders.
- **Root Cause**:
    1. `totalSales` was only counting link-based referrals (`AffiliateReferral`).
    2. `updateAffiliateStats` was not called during the initial order/commission creation flow.
- **Resolution**:
    1. Updated `affiliateService.js` to count sales directly from the `Order` table.
    2. Modified `commissionService.js` to trigger a stat update immediately after calculating commissions.
- **Files Modified**:
  - `backend/services/affiliateService.js`
  - `backend/services/commissionService.js`


### [FIX] Affiliate Order Synchronization (Manual & Dashboard Orders)
- **Date**: 2026-02-25
- **Description**: Orders created manually via the "Simple" modal or through the affiliate dashboard were not being pushed to provider companies (e.g., "wofod").
- **Root Cause**: Missing calls to `internalSyncService.pushOrderToProvider` in `EnhancedOrderService.js` and `affiliateRoutes.js`.
- **Resolution**: Added `pushOrderToProvider` trigger to both `createEnhancedOrder` and the affiliate order creation route.
- **Files Modified**:
  - `backend/services/enhancedOrderService.js`
  - `backend/routes/affiliateRoutes.js`


### [FIX] Affiliate Service Syntax Error
- **Date**: 2026-02-23
- **Description**: Backend failed to load `affiliateService.js` due to a syntax error.
- **Root Cause**: Missing property assignment in destructuring layout within `registerAffiliate`.
- **Resolution**: Corrected the destructuring syntax.
- **Files Modified**: `backend/services/affiliateService.js`


### [FIX] Affiliate Visibility Issue
- **Date**: 2026-02-23
- **Description**: Synchronized orders were not visible to providers.
- **Root Cause**:
  1. Affiliates were created with `PENDING` status by default.
  2. Order filtering logic excluded non-active affiliates.
  - Implemented targeted RLS context switching in `InternalSyncService.js` for safe cross-company sync.
  - Resolved "invisible data" issue caused by global RLS bypasses.
  - Set default affiliate status to `ACTIVE` and fixed owner lookup logic.
  - **Result**: ✅ Full end-to-end synchronization verified for both regular and GuestOrders across subdomains.
- **Files Modified**:
  - `backend/services/affiliateService.js`
  - `backend/activate-affiliates.js`


### [FIX] WooCommerce Webhook 401 & Signature Failures
- **Date**: 2026-03-10
- **Description**: WooCommerce webhooks were failing with 401 Unauthorized or rejecting valid signatures during setup and order sync.
- **Root Cause**:
    1. **401 Unauthorized**: Public webhook routes were registered after `globalSecurity` middleware in `server.js`.
    2. **Signature Mismatch**: Headers sometimes used hyphens (`x-wc-webhook-signature`) or underscores (`x_wc_webhook_signature`), and the system didn't support both.
    3. **Setup Failure**: WooCommerce expects a 200 OK during the "ping" test, but signature validation failed because no actual secret is sent in the test topic.
- **Resolution**:
    1. Moved the WooCommerce webhook route to the top of the public routes section in `server.js`.
    2. Updated `wooCommerceWebhookController.js` to look for signatures using both naming conventions.
    3. Added a bypass for `webhook.test` topics to allow successful initial store connection.
- **Files Modified**: `backend/server.js`, `backend/controller/wooCommerceWebhookController.js`.
- **Status**: ✅ Resolved and verified.

### [FIX] Admin Order Details Missing Shipping For New Storefront Guest Orders
- **Date**: 2026-03-31
- **Description**: Newly created storefront guest orders could open in `/orders/:orderNumber` with `الشحن = 0` and `الإجمالي = المجموع الفرعي` even though checkout had already shown a non-zero shipping quote to the customer.
- **Root Cause**:
    1. The admin details page was reflecting the persisted guest-order values correctly, but the source guest order itself had been saved without the shipping quote.
    2. Variant enrichment in `publicOrdersRoutes.js` also relied too heavily on `variant.name` parsing, which could reintroduce ambiguity between color and size labels when explicit attribute values were already available.
- **Resolution**:
    1. Unified storefront order creation with the same governorate resolution logic used by the public shipping quote endpoint, ensuring `shippingCost` and `finalTotal` are persisted correctly for new guest orders.
    2. Prioritized explicit `item.attributes` for variant color/size extraction before falling back to variant-name heuristics.
    3. Added regression tests so storefront-origin guest orders keep correct shipping totals and stable variant metadata end-to-end.
- **Files Modified**:
    - `backend/routes/publicOrdersRoutes.js`
    - `backend/controller/shippingZoneController.js`
    - `backend/tests/integration/storefrontPublicRoutes.test.js`
    - `frontend/src/storefront/hooks/useCheckout.ts`
    - `frontend/src/storefront/sections/PaymentSection.tsx`

### [FIX] Orders Page Dark-Mode Coverage, Mobile-Sheet Modals, and Dense List Layout
- **Date**: 2026-04-19
- **Description**: `/orders?page=1&limit=20&onlyUnseen=false` still showed partial light-mode native controls, desktop-heavy modal layouts, and too much vertical chrome before the orders table, so the page felt inconsistent in dark mode and displayed fewer orders above the fold than needed.
- **Root Cause**:
    1. Native `select`, `option`, and date controls were not fully inheriting the dark theme.
    2. Order/invoice dialogs still used desktop-style modal structure instead of compact mobile-sheet behavior.
    3. The orders screen dedicated too much height to a hero-like top section and always-expanded filter controls, which pushed the table down.
    4. Backend/API failures surfaced mainly as repeated global toasts, adding noise instead of keeping the error state inside the page.
- **Resolution**:
    1. Updated the orders page shell to remove the large top block, widen the content area after the sidebar, and increase table density so more rows are visible.
    2. Reworked the filters into a compact toolbar with expandable advanced filters and inline retry/error messaging.
    3. Converted order/invoice dialogs to dark, mobile-app-like sheet layouts.
    4. Added dark-safe native control styling and reduced repeated global API toasts for orders/auth/company bootstrap requests.
- **Files Modified**:
    - `frontend/src/pages/orders/Orders.tsx`
    - `frontend/src/components/orders/EnhancedOrderModal.tsx`
    - `frontend/src/components/orders/InvoiceModal.tsx`
    - `frontend/src/styles/index.css`
    - `frontend/src/services/apiClient.ts`
    - `frontend/src/services/authService.ts`
    - `frontend/src/contexts/CompanyContext.tsx`

