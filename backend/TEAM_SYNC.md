# Team Sync Updates

## 2026-07-22 / 2026-03-09
- **Fixed Actual Shipping Cost & Updated Turbo Status Display to "غير مكتمل" (BUG FIX / COMPLETE):**
  1. Resolved issue where Turbo actual shipping cost showed "غير متوفر" by fixing endpoint URL `/turbo/calculate` and auto-populating shipping comparison upon opening order details.
  2. Updated `TurboShippingPanel.tsx` to display **"غير مكتمل"** for initial/saved Turbo shipment statuses (`1`, `0`, `created`, `saved`, `incomplete`), matching Turbo Dashboard.
- **Fixed Shipment Type Becoming "Partial Return" on Update (BUG FIX / COMPLETE):**
  1. Resolved issue where updating a shipment in Turbo changed its type from regular delivery ("تسليم عادياً") to partial return ("مرتجع جزئي").
  2. Fixed `return_amount` in `turboService.js` to default to 0 instead of shipping fee, and set `return_summary` to `'لا يوجد مرتجع'`, guaranteeing Turbo API classifies updated orders as `is_order: 1` ("تسليم عادياً").
  3. Verified on order `#ORD-638014-156` (Turbo Code `38125791`).
- **Fixed Price Resetting to 0 on Turbo Shipment Update (BUG FIX / COMPLETE):**
  1. Resolved issue where updating a shipment in Turbo reset `amount_to_be_collected` to 0 EGP for orders with paymentMethod `'cod'` or `'cash_on_delivery'`.
  2. Updated `updateShipment` in `turboService.js` to preserve full order total (`619 EGP`) and `is_order: 1` for all Cash-on-Delivery payment variations.
  3. Tested and verified on Order `#ORD-638014-156` (Turbo Code `38125791`).
- **Full System Search Support for Turbo Tracking Codes (FEATURE / COMPLETE):**
  1. Enabled searching by Turbo tracking code (`38124937`, `38069771`, etc.) across main orders page (`/orders`), preparation queue (`/orders/preparation`), and Turbo records (`/orders/turbo-records`).
  2. Updated `orders.js` and `preparationQueueService.js` to match `turboTrackingNumber` and `turboShipmentId` in search filters.
- **Added "Update Turbo Shipment" Button to Order Details Page (FEATURE / COMPLETE):**
  1. Built interactive button `🔄 تحديث الشحنة في Turbo` in `TurboShippingPanel.tsx`.
  2. Integrated `updateShipment` method in `useTurboShipping.ts` hook calling `PUT /api/v1/turbo/orders/:orderId/shipment`.
  3. Added toast notifications for loading, success (`تم تحديث بيانات الشحنة في تربو بنجاح`), and error messages.
- **Verified & Updated Turbo Edit Order API Integration (FEATURE / COMPLETE):**
  1. Verified Turbo API `/edit-order` endpoint support in `turboService.js` (`updateShipment`).
  2. Fixed `return_summary` requirement error when `is_order: 1` by setting `'لا يوجد مرتجع'` default.
  3. Integrated with `orderDetailsUpdateService.js`: Editing customer details or address on our platform automatically syncs live to Turbo API.
  4. Successfully tested and verified live on Order `#ORD-026429-146` (`38124937`), returning `{ success: true, message: 'success' }` from Turbo.
- **Strict Customer Phone Validation & Blocking Invalid Shipments to Turbo (BUG FIX / COMPLETE):**
  1. Removed all automatic phone fallbacks (`01000000000`).
  2. Implemented strict validation in `turboService.js`: Any order with an invalid phone (e.g. 10 digits instead of 11) is strictly blocked from being sent to Turbo.
  3. Throws explicit detailed Arabic error message returned to user/UI: `رقم هاتف العميل غير صحيح: الرقم مكون من X أرقام بدلاً من 11 رقماً`.
- **Synchronized Guest Orders with Regular Orders & Fixed English Governorate Mapping (BUG FIX / COMPLETE):**
  1. Resolved duplicate `guest_orders` appearing in Preparation Queue by updating `buildGuestSql` in `preparationQueueService.js` to exclude any guest row with a matching regular order.
  2. Synced all 684 `guest_orders` records with their matching `orders` records in DB, updating statuses and Turbo tracking numbers.
  3. Added full English governorate mappings (`cairo`, `giza`, `alexandria`, `dakahlia`, etc.) to `getTurboGovernorateName` in `turboService.js`.
  4. Added phone sanitizer ensuring 11-digit Egyptian phone format for Turbo API.
- **Resolved Turbo Incomplete Draft Shipments & Added Arabic Error Messages (BUG FIX / COMPLETE):**
  1. Updated `getShippingAddressFields` in `turboService.js` to parse `state`, `province`, `region`, and `town` from JSON shipping addresses, ensuring governorate is never lost.
  2. Added fallback defaults for `receiver`, `phone1`, `government`, `area`, and `address` so shipments never arrive as incomplete drafts in Turbo dashboard.
  3. Added `translateTurboErrorToArabic` utility in `turboService.js` and `turboController.js` to translate all raw Turbo errors into clear, friendly Arabic messages.

- **Fixed 404 Error on Turbo Bulk Create Shipments Endpoint (BUG FIX / COMPLETE):**
  1. Resolved HTTP 404 error when sending bulk shipments to Turbo (`/api/v1/turbo/bulk/create-shipments`).
  2. Updated `checkAppAccess.js` middleware to grant access if `company.turboEnabled` or `company.turboApiKey` is set.

- **Central Single Source of Truth Status Registry (ARCHITECTURE / COMPLETE):**
  1. Built central frontend status registry (`statusRegistry.ts`) and backend normalizer (`statusNormalizer.js`).
  2. Integrated `getUnifiedOrderStatus` across `Orders.tsx` and `OrderHeader.tsx` to guarantee zero conflict between list view, order details header, and dropdown options.

- **Fixed Turbo Branch Processing Filter Over-counting (BUG FIX / COMPLETE):**
  1. Resolved issue where 175 orders were showing under 'processing' filter instead of 39.
  2. Removed 'created' status codes from 'processing' aliases, mapped 'created' to 'turbo_saved' & 'merchant_preparing', and updated default fallback status key in `turboController.js`.

- **Included All Official Turbo Shipping Statuses in Status Selection Dropdowns & Order Lookups (FEATURE / COMPLETE):**
  1. Updated `DEFAULT_ORDER_STATUSES` in `Orders.tsx` and `useOrderDetails.ts` to include all 13 official Turbo status codes (`turbo_saved`, `turbo_sent`, `processing`, `out_for_delivery`, `returned_to_company`, `cancelled`, `delivered`, `remitted`, `archived`, `returned_resent`, `returned_missing`, `returned_destroyed`, `delayed`).
  2. Changed API lookup `/order-status?statusType=order` to `/order-status` in `useOrderDetails.ts`, ensuring all Turbo statuses are fetched and dynamically populated in status selection dropdowns across the order views and `/settings/orders`.

- **Unified Order Details Header Status Display (`OrderHeader.tsx`) (FEATURE / COMPLETE):**
  1. Consolidated dual status badges into a single unified status badge in the order details header modal (`OrderHeader.tsx`).
  2. When `turboShipmentStatus` is available, it now replaces the default status label in the primary badge (e.g. `🚚 شحن تربو: مرتجعات بالشركة (كود 5)`), eliminating redundant secondary badges and providing a unified status display across all views.

- **Added Dedicated Merchant Preparing Card & Aligned Official Turbo 13 Status Codes (FEATURE / COMPLETE):**
  1. **Merchant Preparing Card (`merchant_preparing`)**: Added a dedicated top card for orders that received a Turbo tracking code (`turbo_saved` / `turbo_sent`) but are still being prepared by the merchant before pickup/reaching Turbo branch.
  2. **Top Metric Cards Grid**: Restructured `/orders/turbo-records` top section to present 4 key metrics: Active Shipments (`active`), Merchant Preparing (`merchant_preparing`), Branch Processing (`processing`), and Total Turbo Orders (`all`).
  3. **Official 13 Status Code Realignment**: Corrected `ALIASES` & `STATUS_ALIAS_MAP` in `turboController.js` to match Turbo codes 1-13 cleanly across backend & frontend.

- **Fixed Turbo Order Creation Failure (BUG FIX):** Added required `return_summary` parameter when `is_order: 1` in `turboService.js`. Creating shipments now succeeds 100% and generates Turbo Tracking Codes!


- **Fixed Prisma OrderStatus Enum 500 Error in Turbo Records Filter (BUG FIX)**:
  1. **Enum Validation**: Fixed a 500 error when clicking custom Turbo status filters (e.g. `returned_resent`) by validating `filterType` against standard `OrderStatus` enum values before passing to Prisma `status` query.

- **Full Automatic System Order Status Synchronization with Turbo (FEATURE / COMPLETE)**:
  1. **Automated OrderStatus Updates**: Fully mapped all 20 Turbo statuses to dynamically update main system `Order.status` (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`, `ON_HOLD`) and `paymentStatus` upon webhook arrival or manual status refresh.
  2. **Zero Manual Work**: Updating Turbo status on Turbo dashboard or via API instantly reflects across all system order lists & dashboard widgets.

- **Auto-Seeding Turbo Shipping Statuses into Order Status Management (FEATURE / COMPLETE)**:
  1. **Seeded Turbo Statuses**: Added all 10 Turbo shipping status codes (`TURBO_PROCESSING`, `TURBO_SHIPPED`, `TURBO_OUT_FOR_DELIVERY`, `TURBO_DELAYED`, `TURBO_FAILED_DELIVERY`, `TURBO_RESCHEDULED`, `TURBO_ON_HOLD`, `TURBO_DELIVERED`, `TURBO_CANCELLED`, `TURBO_RETURNED`) into `DEFAULT_SHIPPING_STATUSES` in `orderStatusController.js`.
  2. **Automated Integration**: Hooked `initializeDefaultStatuses(companyId)` into `storeSettingsController.js` so any company connecting or configuring Turbo auto-populates all Turbo shipping statuses into `/settings/orders`.

- **Turbo Webhook Intermediate Status Mapping Fix (BUGFIX / COMPLETE)**:
  1. **Root Cause Resolved**: Fixed issue where Turbo webhooks arriving at `/api/v1/turbo-webhook/webhook` logged activity and updated `turboShipmentStatus`, but failed to update main `Order.status` / `GuestOrder.status` for intermediate statuses (`processing`, `shipped`, `out_for_delivery`, `on_hold`).
  2. **Comprehensive Mapping**: Mapped `processing` (3) to `PROCESSING`, `shipped` (4) and `out_for_delivery` (9) to `SHIPPED`, and `on_hold` / `delayed` (12/8/11) to `ON_HOLD` in `apps/backend/routes/turboWebhook.js`.

- **Frontend Admin Bundle `t is not defined` Fix (BUGFIX / COMPLETE)**:
  1. **Fixed Module Scope `t()` Execution**: Fixed runtime crash `Uncaught ReferenceError: t is not defined` in `route-admin-*.js` by removing module-level `t(...)` execution in `CheckoutColumn.tsx` and dynamically mapping `EGYPT_GOVERNORATE_KEYS` inside component body using `useMemo` and `useTranslation()`.
  2. **Fixed Missing Hook**: Added `useTranslation` import and hook instantiation in `ProductSearchColumn.tsx`.

- **Nginx Cache-Control 404 Caching Fix (BUGFIX / COMPLETE)**:
  1. **Fixed CDN/Cloudflare Immutable 404 Caching**: Removed `always` modifier from `add_header Cache-Control "public, max-age=31536000, immutable"` in asset and placeholder location blocks in `nginx_configs/maxp.online.conf` and on the production server (`/etc/nginx/sites-available/maxp.online.conf`). This prevents Nginx from attaching 1-year immutable cache headers to `404 Not Found` responses when assets are requested during deployment windows.
  2. **Verified Nginx Reload**: Reloaded Nginx configuration safely on production.

- **Turbo Webhook & Controller Order/Payment Status Alignment (BUGFIX / COMPLETE)**:
  1. **Fixed Webhook and Controller Status Mismatch**: Resolved a 500 database validation error when receiving Turbo webhook status updates or manually tracking shipment status. Changed order status update to `DELIVERED` (from `COMPLETED`) and paymentStatus to `COMPLETED` (from `PAID`) to align with `OrderStatus` and `PaymentStatus` Prisma enums.
  2. **Fixed Invoice Payment Sync**: Fixed `orderInvoiceService.js` to update the order's `paymentStatus` to `COMPLETED` instead of `PAID` to match the `PaymentStatus` enum.
  3. **Verified Deploy and logs**: Verified clean server restart and successful API resolution.

- **Order Sync Queue PostgreSQL Mismatch (BUGFIX / COMPLETE)**:
  1. **PostgreSQL Column Naming Fix**: Resolved the `column "order_id" does not exist` production database mapping error inside `SyncQueueService` by migrating all background sync queue SQL queries from `$queryRawUnsafe` / `$executeRawUnsafe` to native Prisma Client ORM query methods (like `prisma.orderSyncQueue.findFirst`, `create`, `update`, `findMany`).
  2. **Code Safety**: Re-aligned queries with camelCase column structures generated dynamically by Prisma, eliminating SQL syntax injection risks and raw DB queries.
  3. **Verified Syntax & Tests**: Ran syntax checking and full backend validation test suites successfully.

- **WhatsApp Template Broadcast Campaign Failures (BUGFIX / COMPLETE)**:
  1. **24h Activity Window Bypass**: Removed 24-hour activity limitation for WhatsApp campaigns so campaigns reach all company contacts.
  2. **Session Resolution & DB Column Fix**: Fixed database migration sync issue where `whatsAppSessionId` column was missing in `broadcast_campaigns`.
  3. **Prisma Relation Bug Fix**: Fixed Prisma relation name `recipients` -> `broadcastRecipients` in `getCampaign` and analytics controllers.
  4. **Template Body Parameter Fallback**: Added automatic fallback in `broadcastController.js` and `broadcastSchedulerService.js` to retry template sending without body parameters if Meta Cloud API returns parameter count mismatch.
  5. **Manual Recipients Fix**: Updated `WhatsAppTemplateBroadcast.tsx` to pass `manualPhones` in payload, and fixed critical backend `else if` branch that previously overwritten manual recipients with Facebook active chats. Verified single recipient delivery (`sentCount: 1`).


## 2026-07-20 / 2026-03-09
- **Repository Migration (DEPLOY / COMPLETE)**:
  1. **Purpose**: Switched active development from the old repository `maxp-platform3` to the new repository `maxp-platform4` due to exhausted GitHub Actions quota on the old account.
  2. **Migration Details**: Renamed old origin to `old-origin`, configured `maxp-platform4` as the new `origin`, pushed all active local branches (`main`, `staging`, and `codex/*` dev branches), and updated upstream tracking for all branches.

## 2026-07-19 / 2026-03-09
- **Separate WhatsApp Facebook App Credentials (FEATURE / COMPLETE)**:
  1. **Purpose**: Solved the limitation where the main Facebook App is in Development mode and undergoing App Review (blocking switching to Live).
  2. **Override Mechanism**: Created optional overrides (`whatsappAppId`, `whatsappAppSecret`, `whatsappConfigId`) in the configuration JSON.
  3. **Backend Logic**: Updated `whatsappController.js` to automatically prioritize these overrides for the WhatsApp OAuth exchange, avoiding disruptions to existing Facebook Page integrations.
  4. **Super Admin Dashboard**: Extended `/super-admin/facebook-oauth` to allow super admins to edit, view, and save these optional credentials.

- **Deploy Script: Preserve facebook-oauth-config.json (BUGFIX / COMPLETE)**:
  1. **Root Cause**: `deploy-remote.sh` uses `rsync --delete` which deletes server files not present in the git-tracked tarball. Since `facebook-oauth-config.json` is in `.gitignore`, every deploy wiped the Super Admin credentials.
  2. **Fix (tarball path)**: Added `--exclude data/facebook-oauth-config.json` to the `rsync` command.
  3. **Fix (legacy path)**: Added backup/restore logic for `facebook-oauth-config.json` before `rm -rf` and after `mv`, mirroring how `.env` is handled.

- **WhatsApp Cloud Connect Security & Dynamic PIN Registration (FEATURE/FIX / COMPLETE)**:
  1. **Secured Credentials**: Cleared production Meta App Client Secret (`appSecret`) and App ID from git-tracked `facebook-oauth-config.json` and replaced them with placeholders. Added the config file to `.gitignore` to prevent developers from accidentally pushing server configurations back to Git, and provided `facebook-oauth-config.example.json` as a baseline template.
  2. **Dynamic Registration PIN**: Upgraded `facebookEmbeddedConnect` in `whatsappController.js` to generate a random 6-digit PIN dynamically for every phone number registration instead of using the insecure hardcoded `'000000'` value.
  3. **Metadata Storage**: Stored the dynamically generated registration PIN inside the `WhatsAppSession` record's `metadata` field as a JSON string (`JSON.stringify({ registrationPin })`).
  4. **Graph API Alignment**: Standardized `META_GRAPH_VERSION` default to `'v25.0'` in `whatsappController.js` to match the frontend version.
  5. **Autodiscover Fallback**: Added auto-discovery logic inside `facebookEmbeddedConnect` to query Meta's Graph API for missing WABA, business, and phone IDs when they are omitted in the frontend payload (e.g. if the iframe postMessage was blocked or lost), preventing 400 Bad Request failures.
  6. **Diagnostic Logging**: Added structured logging to `facebookEmbeddedConnect` for request payload inspection, Facebook config validation, and detailed error messages to diagnose 400 errors in production (e.g. missing appSecret after deployment).
  7. **Single Source of Truth Realignment**: Modified `getFacebookOAuthConfig` in `facebookAppConfig.js` to read credentials strictly from the local `facebook-oauth-config.json` configuration file. Completely removed all `.env` fallsbacks and hardcoded credential backups, ensuring the `/super-admin/facebook-oauth` dashboard acts as the absolute single source of truth.
  8. **redirect_uri Mismatch Fix**: Resolved Meta OAuth code exchange 500 error by updating `facebookEmbeddedConnect` in `whatsappController.js` to accept `redirectUri` from the payload, falling back to the Origin/Referer header, and sending the page origin from `WhatsAppCloudConnect.tsx`.
  9. **Verification**: Updated config unit tests and ran test suites successfully to verify the strict JSON loading mechanism.

## 2026-07-18 / 2026-03-09
- **Customer Classification & Tags Sync Bugs Fix (BUGFIX / COMPLETE)**:
  1. **Backend `getConversations` projection gap**: Added `leadCategoryId` and `leadCategory` (with `id`, `name`, `color`) to the Prisma `select` block in the conversations API, ensuring classification data flows to the frontend on every page load.
  2. **`useCustomerProfile` data extraction bug**: Fixed the hook to extract `customerRes.data.data.customer` instead of the entire wrapper object, restoring `tags` visibility.
  3. **Base UI Select empty value fix**: Replaced `value=""` with `value="none"` sentinel for the "no classification" option. Updated `handleCategoryChange` to map `'none'` back to `null`.
  4. **Query cache invalidation**: Added `queryClient.invalidateQueries` for the conversations query key after successful classification updates, ensuring the parent `WhatsAppChat` component's sync effect picks up the change.
  5. **Sync effect coverage**: Extended the `hasConversationStateChange` detection in `WhatsAppChat.tsx` to include `leadCategoryId`, propagating category changes from the query cache to `selectedContact`.

- **AI Key Logs Analysis Page & API Fixes (BUGFIX / COMPLETE)**:
  1. **Global stats computation**: Overhauled `/ai-admin/logs` endpoint (`keys.py`) to query and sum success, failed, and average latency stats across both ORM and raw SQL tables for the filtered query, returning them globally to the frontend.
  2. **Dropdown selection null-checks**: Updated `SuperAdminAIKeyLogs.tsx` select components onValueChange handlers with null-checks (`v || ""`) and casted companies select query response to `any`, resolving all local TypeScript compiler warnings and errors.
  3. **Pagination bypass fix**: Reordered sorting and slicing instructions in keys.py to execute outside the public logs database try-except block, guaranteeing pagination limits are always enforced when queries throw exceptions.
  4. **Status mapping alignment**: Resolved status filtering discrepancies between client and server: `success` filters map to both `["success", "ok"]` and `failed` filters map to `["failed", "error"]`.
  5. **UX inline error handling**: Replaced early return layout with inline alert components, allowing administrators to still toggle filters and retry requests.
  6. **Postgres metadata casting**: Resolved UndefinedFunctionError exception in the raw SQL query to `public.ai_provider_logs` by explicitly casting the text-based `metadata` column: `CAST(COALESCE(metadata, '{}') AS jsonb)->>'response'`, which successfully restored generation logs to the view.
  7. **Datetime timezone naive/aware sorting**: Prevented sorting failures on date comparison between timezone-aware and timezone-naive objects by stripping the tzinfo component: `.replace(tzinfo=None)` during sorting.
  8. **Stats cards UI/UX polishing**: Redesigned statistics cards to align symmetrically in a single row on desktop devices (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`). Integrated inline percentage rates and proportional progress bars representing success/failure ratios.
- **Marketplace Visual Overhaul & Premium Redesign (UI/UX / COMPLETE)**:
  1. **Category Color Coding**: Added unique color accents and gradients for all application categories (Ecommerce, HR, CRM, Analytics, Marketing, Integration, etc.) to visually group related apps.
  2. **Featured Apps Redesign**: Overhauled the featured section to use a horizontal snap scroll carousel layout with large, beautifully detailed hero cards.
  3. **App Cards overhaul**: Redesigned individual app cards with responsive padding, gradient-styled icon containers, visual category indicators, premium hover elevation, and distinct price tag chips.
  4. **Filter Bar improvements**: Simplified search, sorting, and filter pill selectors to prevent layout clutter and improve navigation.
  5. **Animations and theme integration**: Created `marketplace-premium.css` to manage custom oklch color values, micro-animations, and hover glow transitions. Loaded style sheets natively inside `index.css`.

## 2026-07-17 / 2026-03-09
- **Agent Refactoring to SOTA 2026 paradigms & Removal of Legacy Heuristics (REFACTOR / COMPLETE)**:
  1. **Hook & File Deletion**: Completely removed `HotelEnforcementHook` registration in `base.py` and deleted the hook file `hotel_hook.py` from `apps/ai-service/src/agents/hooks/`. This eliminates 150+ lines of brittle regex-based parsing, hardcoded Arabic month translations, and manual `hotel_reserve` tool-call injection.
  2. **LLM-Native Tool Calling & Slot-Filling**: Shifted the `hotel-agent` behavior to be natively model-driven. The agent now relies on the database-backed conversation history to extract parameters (name, phone, dates, room) and invoke the `hotel_reserve` tool.
  3. **Conversational Prompts Overhaul**: Updated `SOUL.md` and `TOOLS.md` instructions inside the `hotel-agent` template directory to instruct the agent to ask the customer politely for missing required fields (Conversational Slot-Filling) instead of utilizing scripts to guess values.
  4. **Pydantic ValidationError Handling**: Upgraded `_execute_one_tool` inside the skills pipeline (`skills_pipeline.py`) to catch validation errors (`ValidationError`) from Pydantic input models during tool calling, formats them into a structured human-readable parameter-by-parameter error description, and feeds them back as a tool execution error to the LLM to guide self-correction.
  5. **Seeding & Credentials Resolution**: Fixed a database credentials mismatch where the dev seeding script `seed-agentic-dev.js` inserted unhashed passwords and null roles. Re-secured the test user account `dev@maxp.test` with standard bcrypt hashing and designated the `OWNER` role, unblocking login and API sandbox authentication access.
  6. **End-to-End Sandbox Verification**: Completed manual verification of the hotel agent dialog flow inside the sandbox API session. Confirmed that requesting a booking ("عايز أحجز أوضة ديلوكس لشخصين") prompts the receptionist to warmly request the customer's name, phone, and dates in Egyptian Arabic dialect, and executes `hotel_reserve` only after the customer gives confirmation ("تمام موافق احجزلي").
  7. **Unit Tests Cleared**: Updated all obsolete unit tests in `test_skills_pipeline.py` to match the simplified machine-readable JSON formatting output of `_format_tool_results`.
- **WhatsApp Session Dropdown CUID Display Name Fix (BUGFIX / COMPLETE)**:
  1. **Template Broadcast Session Select**: Updated `WhatsAppTemplateBroadcast.tsx` to identify if a session name is a CUID (25-character alphanumeric format) and fallback to displaying the friendly name `"جلسة واتساب"` and appending the phone number if available, preventing raw CUID leakage.
  2. **WhatsApp Settings Session Select**: Updated `WhatsAppSettings.tsx` default session selection list to also format CUID names in a user-friendly manner with phone numbers.
- **Customer Tags Activation & Campaign Integration (FEATURE / COMPLETE)**:
  1. **Backend Filtering**: Added support for filtering customer lists by tag via `GET /customers?tag=tag_name` and query validation in `getAllCustomer`.
  2. **Distinct Tags API**: Implemented `GET /customers/tags/distinct` to extract all unique tags from company customers with counts for UI dropdown aggregation.
  3. **Customer Lists Tag Criteria**: Expanded database criteria queries (`createCustomerList` and `getCustomersInList`) to support dynamic tag lists (`criteria.type === 'tag'`) using relational filters.
  4. **Frontend Tags Filter**: Integrated tag select filters inside `CustomerList.tsx` and custom lists creator `CreateListModal.tsx`.
  5. **WhatsApp Template Broadcast Tags**: Added tag-based recipient filtering dropdown to the template broadcast campaign page, enabling quick targeting.
  6. **Moderator Sidebar Tags Editor**: Added an interactive Customer Tags editor section in `ChatRightPanel.tsx` inside the WhatsApp Inbox/Chat sidebar, allowing agents/moderators to view, add with auto-completion suggestions, and delete tags for the active customer directly from their ongoing conversation workspace (fixed a JSX tag imbalance compilation error by adding the missing closing `</div>` tag for the tab content block).
- **Customer Import Modal Portal Rendering & Z-Index (BUGFIX / COMPLETE)**:
  1. **Portal Rendering**: Wrapped `CustomerImportModal` inside `React.createPortal` rendering to the `document.body` level. This completely resolves the layout isolation constraints and ensures the modal escapes parent `overflow` or `transform` containment blocks from the layout.
  2. **Z-Index Layering**: Elevated overlay z-index to `z-[9999]` to guarantee overlay sits correctly above all other elements like the HeaderBar and Sidebar navigation layout columns.
- **Legacy Frontend Path Conflict (BUGFIX / COMPLETE)**:
  1. **Storefront HTML Controller Fix**: Updated `storefrontHtmlController.js` to prioritize the absolute production folder path `/var/www/frontend2/dist/index.html` as the candidate location before evaluating relative path candidates. This ensures the correct, recently deployed frontend code takes precedence over any legacy directories on the server.
  2. **Deployment Script Cleanup**: Enhanced `deploy-remote.sh` to unconditionally remove the legacy `/var/www/frontend` directory if it exists on the server, eliminating any potential path resolution conflicts and freeing up disk space.

## 2026-07-16 / 2026-03-09
- **Customer Import Modal — Excel/CSV/Paste Support & Translation Fix (FEATURE / COMPLETE)**:
  1. **Excel Import**: Integrated `xlsx` (SheetJS) library into `CustomerImportModal.tsx` to support `.xlsx` and `.xls` file uploads alongside existing `.csv` support. The parser reads the first worksheet and maps headers automatically (Arabic/English).
  2. **Direct Paste Tab**: Added a second tab "لصق مباشر للبيانات" allowing users to copy-paste rows directly from Excel or any text editor. Auto-detects delimiter (Tab for Excel copy, Comma for CSV text).
  3. **CSV Template Download**: Added a "تحميل نموذج CSV" button that generates and downloads a UTF-8 BOM-encoded CSV template with Arabic headers and a sample data row.
  4. **Translation Keys Fix**: Populated all missing `customers.import.*` i18n keys (title, clickOrDrag, requiredColumns, foundCount, success, importing, importButton, noValidData, readError, downloadTemplate, tabFile, tabPaste, pastePlaceholder, parseButton) in both `ar` and `en` locale section files.
  5. **TypeScript Safety**: Fixed multiple TS compiler errors (TS2532, TS2538, TS2769, TS2345) related to nullable checks, type casting, and i18next `DefaultTFuncReturn` compatibility.
  6. **UI Overlay Bug**: Resolved a CSS stacking issue where a sibling `fixed inset-0 bg-black/50` overlay rendered on top of the modal content card, making it invisible. Restructured the modal DOM to apply overlay styles directly to the parent flex container and added event propagation controls to make the modal card fully visible.
- **Customer vs. Lead Separation & Code Cleanup (FEATURE / COMPLETE)**:
  1. Clarified the architectural separation: both concepts share the single `Customer` database table, distinguished solely by the `status` enum field (defaulting to `LEAD` when created automatically via `WhatsAppSyncService` from new numbers, and auto-promoted to `ACTIVE` upon order creation inside `enhancedOrderService`).
  2. Documented the system boundaries in `Structure.md` for team onboarding and future agent iterations.
  3. Cleaned up dead client service code from `customerService.ts`, removing `getCustomerSegments` and `getCustomerStats` methods and types that were never registered or implemented in backend Express routing (stats are already inline within `getCustomerDetails` payload).
  4. Logged the bugs and routes mismatch in `Bugs.md`.
  5. Fixed a default filtering bug in `CustomerList.tsx` where the general Customers page incorrectly defaulted to `hasOrders: false`, displaying only prospects without orders (mirroring the Leads page). It now defaults to `undefined` showing all customers with or without orders by default.

### [BUG FIX / UI] Customer Import Modal — Missing Translation Keys
- **Date**: 2026-07-16
- **Root Cause**: `CustomerImportModal.tsx` used `t("customers.import.title")`, `t("customers.import.clickOrDrag")`, and 8+ other i18n keys under the `customers.import.*` namespace, but none were defined in either `ar/sections/customers.json` or `en/sections/customers.json`. This caused the UI to display raw translation key strings (e.g., `customers.import.title`) instead of proper Arabic/English text.
- **Resolution**: Added the complete `import` block with all 14 keys to both locale section files, then ran `merge-translations.js` to compile them into the main `translation.json` files.
- **Files Modified**:
  - `apps/frontend/src/locales/ar/sections/customers.json`
  - `apps/frontend/src/locales/en/sections/customers.json`
  - `apps/frontend/src/locales/ar/translation.json`
  - `apps/frontend/src/locales/en/translation.json`

### [BUG FIX / UI] Customer List hasOrders Default Filter Bug
- **Date**: 2026-07-16
- **Root Cause**: The general Customers page incorrectly defaulted to `hasOrders: false`, displaying only prospects without orders (mirroring the Leads page).
- **Resolution**: It now defaults to `undefined` showing all customers with or without orders by default.

## 2026-07-14 / 2026-03-09
- **Sidebar Layout Persistence & Company Override Resolution (UI/UX / COMPLETE)**: Fixed the sidebar layout "getting stuck" when changing layouts:
  1. Resolved a race condition in `SidebarSettingsContext.tsx` where the nullish coalescing operator `serverLayout ?? prev.sidebarLayout` overrode `null` server responses with stale localStorage layouts, preventing users from resetting layout to default.
  2. Integrated `useSidebarSettings` in `CompanySettings.tsx` to automatically call `setUserLayout(null)` when the company admin changes the organization-level layout template, clearing active per-user overrides and ensuring immediate alignment with the new corporate layout default.
- **Sidebar Architecture & Path Matching Overhaul (UI/UX / COMPLETE)**: Audited and resolved 18 weaknesses across the sidebar config and components:
  1. Decoupled `NavLink` from `ClassicSidebar` to prevent performance drops and unnecessary re-mounts on render.
  2. Implemented general sub-path matching inside `isSidebarPathActive` to highlight parent sidebar links when visiting sub-routes (e.g. `/orders/123` highlights `/orders`), while keeping base dashboards isolated.
  3. Upgraded sidebar search filter to scan item URLs and nested child links.
  4. Configured mobile view to auto-close the sidebar when main navigation links are selected.
  5. Cleaned up duplicated imports, hardcoded Arabic strings, and section numbering comments in `sidebar.ts`.
- **AI Agent Sandbox Skills Display & Tracing (UI/UX / COMPLETE)**: Added a dedicated skills display bar below the HeaderBar in the Sandbox testing tab (`/admin/ai-hub?tab=sandbox`) to show the display name and description of all skills assigned to the currently selected agent. Additionally, resolved an active skill trace loss bug in the Python `ai-service` pipeline (`skills_pipeline.py`) by setting `ctx.active_skill_context` upon skill execution, and updated the frontend `ChatArea.tsx` to map raw skill IDs to localized friendly display names (`displayName`) on chat bubble badges.
- **Facebook OAuth App Config Consolidation (FEATURE / COMPLETE)**: Unified fallback Facebook app configurations by reading `appId` and `appSecret` dynamically from `facebook-oauth-config.json` as the single source of truth, removing hardcoded credentials from `facebookAppConfig.js`, and ensuring Meta webhook verification reads the correct secret.
- **Facebook Connected Account Profile Display (FEATURE / COMPLETE)**: Enhanced the Facebook OAuth settings page to display the profile details (name and avatar) of the currently authenticated Facebook personal account:
  1. Updated backend `GET /facebook-oauth/status` in `facebookOAuthRoutes.js` to query Meta's `/me` Graph API endpoint dynamically if the company possesses a valid `facebookUserAccessToken`.
  2. Enhanced frontend `FacebookOAuth.tsx` to render a profile card showing the Facebook user's profile picture and name in both the connected and disconnected UI states.
  3. Resolved a pre-existing TypeScript compiler type narrowing mismatch (TS2367) on `canReconnect` by simplifying the disabled condition inside the outer check.
- **AI Agent Pause Toggle System (FEATURE / COMPLETE)**: Implemented conversation-level toggling to pause/resume AI replies across all channels (WhatsApp, Facebook, Instagram, Telegram):
  1. Updated `conversationCrudController.js` and `unifiedInboxController.js` to support updating `aiEnabled` on specific conversation rows.
  2. Added `aiEnabled !== false` validation checks before triggering agent auto-replies in `WhatsAppInboundService.js`, `WhatsAppManager.js`, `TelegramBotService.js`, and `allFunctions.js`.
  3. Integrated client toggle support in `useConversationActions.ts` hook.
  4. Added premium visual toggle buttons (🤖 icon) in `WhatsAppChat.tsx`, `ChatWindow.tsx`, `TelegramConversationsPro.tsx`, `MessengerChat-final.tsx`, `FacebookInbox.tsx`, `InstagramInbox.tsx`, and `UnifiedInbox.tsx`.
- **WhatsApp Baileys Wrapped Messages Support (BUGFIX / CRITICAL)**: Added support for incoming wrapped messages (such as `viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`, `ephemeralMessage`, and `documentWithCaptionMessage`) by recursively unwrapping them in `extractMessageContent` in `WhatsAppManager.js` before processing, avoiding message loss.
- **WhatsApp Message Handler Mocking (BUGFIX)**: Fixed failing tests in `WhatsAppMessageHandler.sendTextSession.test.js` by adding `getSocketReadyState` to the mocked `WhatsAppManager` to resolve `TypeError: WhatsAppManager.getSocketReadyState is not a function`.
- **WhatsApp Baileys Zombie Session Detection Hardening (BUGFIX / CRITICAL)**: Resolved a critical issue where active, newly authenticated sessions were incorrectly identified as zombie sessions and wiped immediately after opening. Added a check to verify that both `creds.registered` is false AND `sock.user` is not defined before declaring a session as a zombie.

## 2026-07-13 / 2026-03-09
- **Facebook Inbox Space Optimization & Mobile Layout Clutter (FIX)**: Overhauled the layout structure of the Facebook Inbox page to eliminate wasted space on desktop and resolve cluttered displays on mobile viewports:
  1. Made the left conversation list column and right customer details column widths responsive. The conversation list reduces to `256px` and the profile column to `268px` on medium screens, freeing up over 60px of screen width for the chat thread.
  2. Reduced main workspace gap and padding (stage margins) to maximize content container space.
  3. Re-configured notes and profile drawers to occupy `85%` of mobile screens instead of `100%`, keeping the chat viewport visible in the background and making back-navigation more intuitive.
  4. Implemented viewport resize monitoring inside `CustomerProfile.tsx` to automatically transition action buttons (Sound, notifications, order, block) into a compact row on screens < 768px, hiding their labels (`sr-only`) to avoid wrapping and collision.
  5. Cleaned up typescript declared-but-unused compiler errors inside the profile component.
- **WhatsApp Dead Socket & Pre-Send Validation (BUGFIX / CRITICAL)**: Hardened unofficial WhatsApp connection stability and message delivery:
  1. Exported `getSocketReadyState` helper from `WhatsAppManager.js` to enable explicit check of WebSocket state.
  2. Integrated `readyState` verification inside `isSendableBaileysSession()` and `getBaileysSessionReadinessReason()` in `WhatsAppMessageHandler.js` to treat non-open socket connections (CONNECTING, CLOSING, CLOSED) as unsendable.
  3. Standardized session retrieval across all media, interactive buttons, list, and catalog sending actions in `WhatsAppMessageHandler.js` to fetch sessions through `getSendableBaileysSession()` rather than raw cache lookup, ensuring connection checks are performed before every type of outbound call.
  4. Added automatic retry mechanism in `sendText()`: if sending fails due to a dead socket connection, the system force-restarts the WhatsApp session in the background (`forceRestart: true`), waits for reconnect, and retries transmission once.

## 2026-07-12 / 2026-03-09
- **AI Service Self-Review Judge — Conversation History Context Fix (BUGFIX / CRITICAL)**: Fixed a bug where the self-review judge was operating without conversation history. Updated `_llm_call` in `skills_pipeline.py` to persist the assembled messages array (containing DB-backed conversation history and customer message) to `ctx.messages`. This ensures downstream stages (like the self-review judge) can access the full context of prior turns.
- **AI Service Active Polishing & Refinement Layer (FEATURE / COMPLETE)**: Overhauled the self-review judge pipeline in `validate_reply.py` to act as an active editor/polishing layer rather than a strict gatekeeper:
  1. Restructured the review judge prompt and guidelines to explicitly distinguish between harmful factual hallucinations (fake services, prices, doctors, branches) and natural human-like conversational initiative (paying cash, invoice retrieval, friendly greetings, apologies).
  2. Upgraded the judge JSON schema to output `need_polish` and `polished_reply` fields alongside the approved status.
  3. Modified `_self_review` logic to use the `polished_reply` directly when available, bypassing the redundant, slow, and dry fallback correction call to the main model (saving up to 30s of response latency).
  4. Reduced the maximum output retries (`MAX_OUTPUT_RETRIES`) from 2 to 1 to bound latency and prevent timeouts under heavy load.
  5. Enhanced `_correct_output` with persona-preserving instructions and guidelines from `create-premium-human-agent` to ensure fallback replies remain warm, natural, and human-like.
- **AI Service Self-Review Judge — Blind Context Overhaul (BUGFIX / CRITICAL)**: Major rewrite of the LLM-as-Judge self-review system in `validate_reply.py`:
  1. The judge now receives the agent's system prompt (first 2000 chars including persona, soul, and core instructions) via `_extract_agent_identity()`.
  2. The judge now receives the last 5 conversation turns via `_extract_conversation_context()` to understand context.
  3. The judge now receives the agent's template type and channel for tone/style evaluation.
  4. Tool evidence limits increased (500→1500 chars/value, 10→15 keys) to prevent data loss in rich responses.
  5. The review prompt was restructured into a 6-criteria rubric with explicit bias toward approval (reject only on clear factual errors, not style preferences).
- **AI Service Follow-up Request Tool Resolution & Thinking Mode Fix (BUGFIX / CRITICAL)**: Resolved DeepSeek follow-up API validation errors (400 Bad Request) after tool execution:
  1. Updated the follow-up tool definitions builder (`_build_tool_dicts`) in the AI Service pipeline (`skills_pipeline.py`) to resolve and include schemas from `allowed_skills` alongside `allowed_tools`.
  2. Set the follow-up call's default `tool_choice` to `"none"` in `_raw_llm_call`, allowing client.py to omit the `tools` and `tool_choice` parameters entirely for plain text generation. This prevents "Thinking mode does not support this tool_choice" errors when the chat history contains DeepSeek-R1 reasoning content.
- **AI Service Self-Review Context Retention & Guardrail Rule Refinement (BUGFIX / CRITICAL)**: Fixed the self-review/judge pipeline to prevent context loss and over-constraining the agent:
  1. Updated `_correct_output` in `validate_reply.py` to summarize and inject active tool execution results (`evidence_text`) into the correction prompt. This ensures that the rewriting model has full visibility of the database data (like services and prices) and prevents context-free hallucinations.
  2. Corrected the fallback match logic in `get_relevant_rules` (`merchant_rules.py`) to return an empty list `[]` instead of returning the first 5 active rules indiscriminately when there are no semantic or keyword matches. This stops unrelated business rules from polluting the agent's prompt on every single message.
- **AI Agent Self-Review Life Cycle & Model Selector Mismatch (BUGFIX / CRITICAL)**: Resolved a critical database model query mismatch in the AI self-review logs:
  1. Fixed the API `set_review_model` and `validate_reply.py` pipeline stage to query `Agent.id` instead of the non-existent `Agent.agent_id` property, stopping silent SQL failures and enabling proper guardrails checks.
  2. Implemented flexible JSON block parsing via `_try_parse_json_object` in the pipeline validation stage, resolving crashes when the model responds with Markdown-wrapped JSON.
  3. Increased evidence summarization limits to up to 10 keys, 500 characters per value, and 2000 characters for list/raw results, preserving tool execution context.
  4. Updated the Super Admin model selector override interface to dynamically fetch options from the backend `settingsData` object instead of using hardcoded lists.
  5. Corrected the LTR/RTL pagination control chevron arrow direction in the Arabic logs viewer dashboard.
- **WhatsApp Direct Chat AI Correction Bridge (FEATURE / COMPLETE)**: Added AI correction capabilities directly into the direct WhatsApp chat page (`/whatsapp/chat` workspace):
  1. Built a bridge endpoint `POST /api/whatsapp/messages/:whatsappMessageId/correct` that resolves native WhatsApp message ID to unified conversation and message records using proximity matching and customer identification.
  2. Implemented inline correction UI in `MessageBubble.tsx` (the one under `pages/whatsapp/components/` used by the direct WhatsApp workspace) allowing users to correct AI replies, which dynamically triggers learning for the AI agent.
- **AI Correction Button Visibility Fix (BUGFIX / CRITICAL)**: Fixed a 3-layer cascading bug that prevented the "✏️ تصحيح الرد" button from appearing on ANY inbox page (Unified, Facebook, Instagram, WhatsApp):
  1. Backend `sender` field returned `'agent'` instead of `'ai'` for AI-generated messages — frontend condition `sender === 'ai'` never matched.
  2. `agentInboxFacebookService.buildMessagePreview()` omitted `senderId`, `metadata`, and `isAIResponse` fields from serialized messages.
  3. Frontend `useInboxConversations` hook defaulted `senderId` to `"unknown"` (truthy) for AI messages — `!message.senderId` evaluated to `false`.
  4. Added `message.isAIResponse` as a third detection path in `MessageBubble.tsx` for maximum resilience.
- **Multi-Platform AI Correction (`correction_auto` Generalization) (FEATURE / COMPLETE)**: Extended the WhatsApp-only `correction_auto` feature to work across ALL inbox channels (Facebook, Instagram, Telegram, and Unified Inbox):
  1. Generalized `correctMessage()` in `whatsappInboxService.js` with multi-platform delivery: WhatsApp (via `sendText`), Facebook (via `sendProductionFacebookMessage`), Instagram (via Graph API), and Telegram (via `TelegramBotService` / `TelegramUserbotService`).
  2. Agent lookup now matches `conversation.channel` dynamically instead of hardcoded 'whatsapp'.
  3. Added `POST /conversations/:conversationId/messages/:messageId/correct` route in `unifiedInboxRoutes.js` with `conversationAccessGuard` middleware.
  4. Built inline correction UI in `UnifiedInbox.tsx` — AI messages show "🤖 رد تلقائي من الوكيل" badge with "✏️ تصحيح الرد" button.
  5. Built self-contained correction UI in `MessageBubble.tsx` (shared component) — used by both `FacebookInbox.tsx` and `InstagramInbox.tsx` with `onCorrect` callback for message reload.
  6. For non-WhatsApp channels, corrected messages are saved to DB via `prisma.message.create` (WhatsApp auto-saves via webhook).
  7. All channel failures are gracefully degraded: correction is saved even if platform delivery fails.

## 2026-07-11 / 2026-03-09
- **Inbox AI Message Auto-Correction Feature (`correction_auto`) (FEATURE / COMPLETE)**: Implemented a live correction flow in the WhatsApp Inbox enabling supervisors to correct wrong AI responses on-the-fly:
  1. Added `POST /conversations/:conversationId/messages/:messageId/correct` endpoint in Express backend with `conversationAccessGuard` and `inbox.send` permission.
  2. Implemented `correctMessage` service logic that: resolves the customer's preceding question, formats structured feedback, calls the AI Service guardrails API with `source: 'correction_auto'`, sends the corrected text to WhatsApp, and updates conversation state.
  3. Built inline correction UI in `WhatsAppChat.tsx` — AI messages (no `senderId`) show a "تصحيح الرد" button that opens a pre-filled textarea with "حفظ وتصحيح" / "إلغاء" actions.
  4. Guardrail creation is gracefully degraded: if the AI service is unreachable, the correction is still sent to the customer.
  5. Auto-generated rules appear in the "القواعد والتعلم" tab with source tag "تعلم تلقائي" for full auditability.
- **Agent Guardrails Sandbox Removal & Full-Width Layout Refactor (UX / IMPROVEMENT)**: Refactored the "القواعد والتعلم" (Guardrails) tab in Agent Profiles based on admin feedback:
  1. Removed the redundant Sandbox Playground chat area from the tab, deferring all testing activities to the dedicated "تجربة الوكلاء" (Agent Playground) page to reduce UI clutter.
  2. Redesigned the guardrails layout to occupy 100% width, resolving a flexbox layout collapse bug where the rules list shrank to zero width, and giving the manager a spacious table and input forms.
  3. Cleaned up unused state variables, event handlers, and Lucide icons to reduce bundle size and maintain code hygiene.
- **Agent Profiles Settings & Guardrails Layout Fix (BUGFIX / FRONTEND)**: Resolved a critical frontend layout and tag mismatch compilation bug on the Merchant Dashboard:
  1. Fixed JSX nesting where the newly added "القواعد والتعلم" (Guardrails) tab block was erroneously wrapped inside the settings conditional div, preventing it from mounting or rendering when clicked.
  2. Restructured the JSX hierarchy inside `AgentProfilesPage.tsx` to mount the `AgentGuardrailsTab` as a direct sibling of the settings block under the common Fragment.
  3. Balanced all closing `div` and Fragment tags, fixing the Vite production build failure (esbuild JSX tag mismatch and regex syntax error).
  4. Verified layout loading, components structure, and successful API integration with the FastAPI backend through headless browser tests.

## 2026-07-10 / 2026-03-09
- **Merchant Agent Guardrails & Dynamic Learning System (FEATURE / COMPLETE)**: Completed the full end-to-end architecture for merchant-defined conversational guardrails:
  1. Created `AgentGuardrailRule` SQLAlchemy model in `guardrail.py` and registered it in the models package.
  2. Implemented `GuardrailRepository` for CRUD and retrieval operations.
  3. Developed `MerchantRuleGuardrail` for vector-based similarity matching, caching (via Redis), and markdown prompt assembly.
  4. Created `GuardrailTranslator` to auto-translate plain Arabic dialect merchant feedback to structured JSON and detect rule conflicts.
  5. Integrated rule injection into the `ContextAssembler` compilation pipeline and rule validation checks in `validate_reply`.
  6. Created admin REST API router under `apps/ai-service/src/api/admin/guardrails.py` and registered it in the API routes index.
  7. Implemented keyword-based intersection fallback matching in `MerchantRuleGuardrail` when embeddings are unavailable.
  8. Built `AgentGuardrailsTab.tsx` frontend dashboard component with rule CRUD grid, conflict detection dialog, and inline sandbox chat playground.
  9. Integrated the tab into `AgentProfilesPage.tsx` as "القواعد والتعلم" with Lucide Lock icon, passing `agentId`, `companyId`, and model config.
  10. Created unit tests (`test_merchant_rules.py`) for cosine similarity, prompt formatting, and conflict detection — 3/3 passing.
  11. Lowered the default similarity threshold to `0.65` inside `MerchantRuleGuardrail` to ensure robust matching against Egyptian dialect messages on production.
  12. Fixed database commit rollback bug by adding `await session.commit()` in the guardrail REST API routes.
  13. Fixed compiled system prompt logging by re-assigning the fully assembled system prompt (`enriched_prompt`) back to the `PipelineContext.system_prompt` field in `skills_pipeline.py`.
  14. Removed the redundant `/admin` prefix from guardrail routes in `apps/ai-service/src/api/admin/guardrails.py` to fix 404 API errors under the FastAPI `/admin` router.
  15. Modified `aiAdminProxyRoute.js` to allow merchant users (`OWNER` / `COMPANY_ADMIN` company roles) to access the AI proxy, resolving the 403 Forbidden permission error on the "القواعد والتعلم" (Guardrails) tab.

- **Conditional Landmark Image Auto-Population in AI Pipeline (FIX / IMPROVEMENT)**: Fixed a bug where branch landmark images were unconditionally sent to the user as WhatsApp/Facebook attachments every time the `booking_info` tool was executed (e.g., when the user just greeted the bot or asked for working hours):
  1. Updated `skills_pipeline.py` to check if the image URL/path or its filename is explicitly present in the final reply text (`ctx.final_reply`) before populating `ctx.response_attachments`.
  2. Added unit tests `test_landmark_image_auto_populate_conditional_negative` and `test_landmark_image_auto_populate_conditional_positive` inside `test_skills_pipeline.py` to verify this behavior.
  3. Deployed the fix to the production server (`maxp-ai-service`) and verified successful operation.
- **WhatsApp Baileys Stability & Reconnection Overhaul (IMPROVEMENT / STABILITY)**: Hardened the unofficial WhatsApp integration (`@whiskeysockets/baileys`) against connection drops, pairing failures, and rate limits:
  1. Upgraded `@whiskeysockets/baileys` package version to `6.7.23` (latest stable 6.x release) and updated the hardcoded fallback version to `[6, 7, 23]`.
  2. Fixed a critical session wipe bug in `isValidAuthState` validator where the credentials cache was completely deleted from the database if the session was reloaded during the pairing phase (`QR_PENDING` / `CONNECTING`). The validator now preserves the initial keys.
  3. Refactored disconnect recovery logic in `getDisconnectRecoveryDecision` to treat `403` (Forbidden/Rate Limit) and `Bad MAC` (Decryption failure) disconnects as transient errors instead of terminal logouts, preventing destructive session wipes.
  4. Added undefined check guards for `statusCode` in `getDisconnectRecoveryDecision` to prevent false positive logouts when both `statusCode` and `DisconnectReason` are undefined.
  5. Overhauled `scheduleReconnectSession` to retry indefinitely with an exponential backoff capped at 5 minutes (300,000 ms), preventing connections from giving up completely after 5 attempts.
- **Appointments Management UI/UX & Visual Slot Picker (UI/UX / IMPROVEMENT)**: Refactored the appointments page (`/admin/booking/appointments`) and the booking modal to resolve space utilization and usability issues:
  1. Replaced browser-native blocking `window.confirm` alerts for status transitions (confirming, cancelling, completing bookings) with clean, non-blocking toast notifications (via `toast` from `sonner`) featuring a **تراجع (Undo)** action for immediate and frictionless state recovery.
  2. Redesigned the available slots selector in `AppointmentModal.tsx` to display as an interactive grid of buttons grouped side-by-side, replacing the primitive HTML select dropdown. Styled unavailable slots with line-throughs and muted backgrounds, and styled selected slots with high-contrast active backgrounds.
  3. Cleaned up the table filters header in `AppointmentsTab.tsx` by wrapping secondary status and date filters into a collapsible advanced filters drawer. The drawer is toggled by a brand button showing the number of active filters.
  4. Moved the Branch filter dropdown from the collapsible advanced panel to the top filters row next to "تصفية متقدمة", making it always visible for quick access with a clean, compact appearance.
  5. Restored vertical scrolling on the booking management page by adding `h-full overflow-y-auto` to the outer container in `BookingManagementPage.tsx`, fixing viewport clipping caused by the parent layout shell's `overflow-hidden` on the `<main>` wrapper.
  6. Removed redundant top page header ("إدارة النظام الطبي / نظام إدارة المواعيد والخدمات الطبية") and page-level tabs list from `BookingManagementPage.tsx`, as they duplicated the primary sidebar navigation.
- **Branches Management UI/UX & Modal Usability Overhaul (UI/UX / FEATURE)**: Redesigned the branches tab (`/admin/booking/branches`) and the branch form modal to align with 2026 UI aesthetics and address several functional constraints:
  1. Resolved viewport clipping on mobile/small displays by implementing a scroll container with a max height limit (`max-h-[90vh] overflow-y-auto`) and a `backdrop-blur-sm` overlay for the modal backdrop container.
  2. Upgraded the file upload field from a standard browser file input to a custom, modern Arabic-first card (with clear visual hints, a clickable choose button, and size limits verification).
  3. Formatted working days in desktop and mobile views from a verbose plain text column to compact, interactive circular day badges (`س`, `ح`, `ن`, `ث`, `ر`, `خ`, `ج`) with dynamic hover tooltips.
  4. Parsed location field URLs to display inline `📍 فتح الخريطة` buttons opening in a new browser tab.
  5. Resolved strict TypeScript compilation errors across `shared.ts`, `BranchModal.tsx`, `BranchesTab.tsx`, and `BookingManagementPage.tsx`.

## 2026-07-09 / 2026-03-09
- **Company Dashboard Welcome State Removal (UI/UX)**: Removed the `DashboardWelcomeState` component and its import/rendering rules from the main dashboard (`MainDashboardPage.tsx`) so that the core dashboard metrics and charts are always visible to new users or companies without the ecommerce application active. Deleted the unused `DashboardWelcomeState.tsx` file.
- **AI Image Generator Interface Redesign & 2026 Style Overhaul (UI/UX / FEATURE)**: Refactored the AI Image Generator page (`/admin/ai-image-generator`) layout to adopt a borderless 12-column split-canvas design. Removed the heavy header banner (`SettingsPageHero`) and the outer wrapper (`SettingsPageShell`) to let the workspace flow freely on the background canvas. Replaced all nested card wrappers ("box-in-a-box" style) by placing core inputs flat on the layout grid and converting `CollapsibleSection` components into borderless macOS-style settings accordions separated by thin dividers (`border-b border-slate-100`). Restructured quick presets into a simple borderless row of clean chips, and upgraded the preview panel and prompt control deck into floating glassmorphic panes (`backdrop-blur-md bg-white/70`) with soft, layered ambient shadows. Activated the dormant `AspectPreview` mockup visualizer, removed the redundant client-side model selector dropdown and associated state/constants, and cleaned up the allowedModels API sync to rely completely on backend template model config policies.
- **WhatsApp Workspace UI/UX Overhaul & Edge-to-Edge Desktop Layout (IMPROVEMENT)**: Overhauled the WhatsApp workspace interface for a premium, distraction-free desktop/laptop experience. Merged the sidebar header into a single horizontal bar (height `h-14`) and removed the workspace title and descriptions. Placed the session selector in a clean sub-bar below the header. Added support for edge-to-edge full viewport presentation (removing all margins and paddings around the panel relative to the app-shell sidebar and global header) by updating `Layout.tsx` (`shouldRemovePadding`) and making the outer container in `WhatsAppChat.tsx` borderless and shadowless. Changed the chat background in light mode to pure white (`#ffffff`), and modified the light-mode incoming message bubble color to light grey (`#f0f2f5`) to maintain contrast.
- **AI Agent Model Override Precedence (FIX)**: Fixed a bug where custom model configurations for specific company agents were ignored in favor of the template's default model policy. Flipped the resolution order in `agent_registry.py` to check `db_agent.model` first before falling back to `template.model_policy.get("default")`. Added corresponding unit tests in `test_model_resolution.py`.
- **Ollama Gemma4 Model Routing (FIX)**: Fixed `is_gemma_model()` in `gemma_chat_template.py` incorrectly routing Ollama-style Gemma models (e.g. `gemma4:31b-cloud`) to Google's Generative Language API instead of the Ollama provider. Added a `:` guard to exclude Ollama tag-format model names.

## 2026-07-08 / 2026-03-09
- **WhatsApp Voice Note Truncated to 1-Second / Silent Message (FIX)**: Fixed a critical bug where recorded WhatsApp voice notes were sent as empty/silent 1-second messages.
  1. **Frontend Stream Lifecycle Fix**: In `useAudioRecorder.ts`, moved track stopping logic from `stopRecording` into `onstop` and `onerror` handlers, preventing stream termination before the MediaRecorder completes encoding.
  2. **Backend FFmpeg Timing Restoration**: In `WhatsAppMediaHandler.js`, added `-fflags +genpts` before `-i` in the FFmpeg Ogg conversion command to force regeneration of presentation timestamps for WebM files (which lack duration headers).
  3. **Payload Size & Duration Validations**: Added validation to block empty/small uploads (<500 bytes) on both frontend and backend, and disabled the frontend send button if the recording duration is under 1 second (`recordingTime < 1`).

## 2026-07-07 / 2026-03-09
- **reportWebVitals Adblocker Crash Loop Fix (FIX)**: Fixed an infinite refresh/redirect loop (`?__maxp_cache_recovery=...`) affecting public storefronts (like `swan.maxp.online`) for users using adblockers (Safari content blockers, uBlock Origin, etc.). Removed the dynamic import of `reportWebVitals` from `apps/frontend/src/main.tsx` which was blocked by adblockers and triggered a critical chunk load error. The dynamic import was safe to remove as the reporting code was commented out in production anyway.

## 2026-07-05 / 2026-03-09
- **WhatsApp Voice Note 500 Fix — ffmpeg-static + Mimetype Normalization (FIX)**: Fixed production 500 error on `/whatsapp/messages/upload-send` for voice notes. Added `ffmpeg-static` dependency and injected its binary into `process.env.PATH` at startup. Normalized raw mimetypes (stripping `;codecs=opus`) in both `uploadMedia` and `sendAudio`. Improved route error handling with `error.message` forwarding, param validation, and temp file cleanup.
- **Merchant Agent Management & Creation Interface Simplification (UI/UX)**: Simplified the merchant's `AgentProfilesPage.tsx` interface to hide complex/system configurations (such as persona, goals, tasks, boundaries, welcome messages, escalation options, and language). The merchant now views and edits only **3 essential items**: **Agent Name**, **Tone / Way of Replying**, and **Additional Instructions**. Additionally, streamlined the agent creation wizard from a multi-step flow down to a **single step** (Template + Name + Icon Picker), with all other prompt instructions dynamically driven by the templates and fully preserved inside the `SOUL.md` database records during edits.
- **AI Agent Templates Unification (REFACTOR)**: Decommissioned the redundant ready-profiles and constraints/locks systems to treat AI templates (`AgentTemplate`) as the primary agent definition. Removed `SuperAdminAgentProfiles` navigation, routes, and components. Deleted `spawnReadyAgentsService.js` and legacy seeding scripts. Refactored the merchant's `AgentProfilesPage.tsx` to directly select and configure from AI templates, saving overriding records in the `agents` table mapped to `AgentTemplate` slugs.
- **GramJS Unhandled Rejection Alert Loop (FIX)**: Fixed an infinite feedback loop where GramJS `resolve() called for non-request instance` unhandled rejections triggered Telegram alerts, which in turn created new Telegram updates that re-triggered the same error. This flooded the server error logs (~1MB in `err-1.log`), rate-limited the alerting channel (`A wait of 237 seconds is required`), and consumed CPU. Added `isGramJsResolveError` classifier in `recoverableUnhandledRejection.js` and updated both `unhandledRejection` handlers in `server.js` to silently log and skip alerting for this internal GramJS parsing bug. Added regression tests.
- **WhatsApp upload-send Mimetype Expansion (FIX)**: Expanded the Multer `MIME_TYPE_MAP` whitelist and `WhatsAppMediaHandler` supported types to cover additional audio formats (`audio/wav`, `audio/x-wav`, `audio/wave`, `audio/x-pn-wav`, `audio/x-m4a`, `audio/aac`, `audio/x-aac`), archive formats (`application/zip`, `application/x-zip-compressed`, `application/rar`, `application/x-rar-compressed`), generic binary (`application/octet-stream`), and additional images (`image/svg+xml`, `image/bmp`). Added detailed `console.error` logging in the Multer `fileFilter` for rejected file uploads to facilitate future debugging.
- **WhatsApp Voice Note Mimetype Parameters Normalization (FIX)**: Fixed a bug where voice notes failed to send with an unsupported mimetype error (`Error: نوع الملف غير مدعوم`) on some browsers due to codecs parameters (e.g., `audio/webm;codecs=opus`):
  1. Updated `apps/backend/routes/whatsappRoutes.js` (Multer filename & fileFilter) to split and clean incoming mimetypes by stripping parameters before validation.
  2. Updated `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` (`getMediaTypeFromMimetype`, `getExtension`, and `validateFile`) to strip codecs parameters, ensuring correct matching of file types and extensions (saving as `.webm` instead of `.bin`).
- **Prisma Schema P1012 Fix (FIX)**: Fixed CI/CD deployment failure caused by missing reverse relation fields on the `Company` model for `EducationTeacherAvailability` and `EducationTeacherPayment`. Added both `[]` array fields to `core.prisma`. Validated with `npx prisma validate`.
- **WhatsApp Voice Note Send Fix (FIX)**: Fixed a bug where recording and sending a voice message in WhatsApp chat failed with "فشل إرسال الرسالة الصوتية":
  1. Updated `apps/backend/routes/whatsappRoutes.js` and `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` to support `audio/webm` and `video/webm` mimetypes, preventing Multer from rejecting uploaded voice messages.
  2. Configured `.webm` extensions in `WhatsAppMediaHandler.js` for webm audio/video types so they save cleanly without using the `.bin` fallback.
  3. Added explicit `ptt: 'true'` parameter to `FormData` on the frontend (`WhatsAppChat.tsx`) and extracted it on the backend, falling back to checking if the original name is `'voice_note.webm'`.
  4. Passed `{ ptt: isVoiceNote }` to `WhatsAppMessageHandler.sendAudio` in the router so recorded voice notes are delivered to WhatsApp as native voice messages (Push-To-Talk) instead of regular audio attachment files.

## 2026-07-04 / 2026-03-09
- **WhatsApp Meta Template Creation 400 Error Fix (FIX)**: Fixed a critical bug where template creation requests to Meta Cloud API returned a 400 bad request error:
  1. Updated `apps/backend/controller/whatsappMetaTemplateController.js` to forward Meta's detailed error responses (with parameters like `error_user_title`/`error_user_msg`) and correct status codes back to the frontend instead of swallowing them under a generic 500 status.
  2. Implemented name input sanitization helper on the frontend (`WhatsAppMetaTemplates.tsx`) to auto-format templates to Meta's strict conventions (lowercase, underscores, no special characters/spaces).
  3. Added frontend validation and warning prompts for numbered variable structures (`{{1}}` vs named parameters like `{{name}}`) and dynamic button link protocols (`https://`).
- **silentEscalationService Import Fix (FIX)**: Fixed a server crash in the Facebook auto-reply escalation loop:
  1. Updated `apps/backend/services/silentEscalationService.js` to correctly import the shared database client wrapper from `./sharedDatabase` instead of the non-existent `../prisma/client`, resolving `MODULE_NOT_FOUND` runtime crashes during human takeover handoffs.
- **AI Service Sandbox Empty Reply Fix (FIX)**: Fixed `AI_SANDBOX_EMPTY_REPLY` errors, context gaps, and multimodal image mapping issues in follow-up chat completions:
  1. Updated `_build_followup_messages` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to inject the `skills_block` using `get_skills_block` so the follow-up LLM can see the full skill instructions (such as offering alternatives for empty results).
  2. Injected conversation history (`recentMessages`) in the follow-up messages context to prevent the LLM from losing conversational context.
  3. Added a 60-second request timeout and 10-second connect timeout for `AsyncOpenAI` in `apps/ai-service/src/llm/client.py` using `httpx.Timeout` to prevent requests from hanging indefinitely.
  4. Updated unit tests in `tests/pipeline/test_skills_pipeline.py` and `tests/llm/test_gemma_client.py` to align with the design decisions of the pipeline.
  5. Resolved a multimodal context gap in `_build_followup_messages` by swapping the plain text `ctx.message` for `build_user_content(ctx.message, ctx.attachments)` for the current user message, ensuring vision-capable models retain access to attached images in the follow-up completion.
- **DeepSeek reasoning_content Sandbox Fix (FIX)**: Fixed a bug where DeepSeek-R1 (thinking mode) follow-up completions failed on tools synthesis turns, returning raw lists instead of Yasmine's Egyptian Arabic sales rep replies:
  1. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to preserve `reasoning_content` and `reasoning` keys in the serialized assistant messages array. This satisfies DeepSeek's validation requirement that assistant messages carrying reasoning steps must pass them back in consecutive turns, resolving the 400 Bad Request API errors.
  2. Fixed an `ImportError` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` where `ALL_TOOLS` was incorrectly imported from `src.skills.integration` instead of `src.tools.registry`.
  3. Cached the system prompt inside `ctx.system_prompt` during execution so that `compiled_system_prompt` is returned correctly in sandbox trace logs for easier debugging.
  4. Mapped `compiled_system_prompt` from the Python response to `result.compiledSystemPrompt` inside `runSelectedAgentInPython` in `aiSandboxController.js` to ensure system prompt visualization in the Sandbox UI.
- **WhatsApp Inbox Permission Distribution Fix (FIX)**: Fixed a bug where moderators/agents could see conversations, read messages, and receive real-time updates for WhatsApp numbers they are not assigned to:
  1. Updated `getConversations` and `getMessages` in `apps/backend/controller/whatsappController.js` to validate and filter session IDs using `getUserAccessibleSessionIds` for non-admin accounts.
  2. Refactored `getConversationAudience` in `apps/backend/services/whatsappRealtimeAudienceService.js` to build a precise list of authorized users (admins, leaders, assigned agents, and team/routing pool members).
  3. Set `fallbackToCompany` default to `false` in `emitToAudience` to restrict socket message events delivery only to authorized users.
  4. Added backend unit tests in `apps/backend/tests/services/whatsappRealtimeAudienceService.test.js` to secure and verify role/session isolation.
- **Product Search & DeepSeek Tool Calls Pipeline Fixes (FIX)**: Fixed catalog search, product discovery, and formatting mismatches for AI agents (like Yasmine) on the Swan store:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to support the `"results"` key returned by product search repository wrappers, preventing it from defaulting to an empty list and falling back to a dry "No products found" message.
  2. Wrapped single product response dictionaries (e.g. from `inventory_check`) in a list to format product details correctly instead of printing "No stock data available".
  3. Added robust formatting mapping for `offers_list_active` and `coupon_validate` tools to properly describe active promotions/coupons.
  4. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to inspect the `tool_calls` in assistant messages and serialize dictionary arguments to JSON strings, preventing DeepSeek API 400 Bad Request/Validation failures in follow-up chat completions.
  5. Updated `_generate_openai_compat` in `apps/ai-service/src/llm/client.py` to omit the `tools` and `tool_choice` parameters entirely if `tool_choice == "none"`, forcing DeepSeek models to naturally generate plain text and avoiding validation errors.
  6. Added comprehensive unit tests in `apps/ai-service/tests/pipeline/test_skills_pipeline.py` to verify the new formatting behaviors.
- **category_list Tool Formatting Mismatch Fix (FIX)**: Fixed a bug where requesting categories from the agent returned "لا توجد تصنيفات متاحة حالياً" (No categories available) even when categories were defined:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to correctly identify and process the `"categories"` key returned by the `category_list` tool.
  2. Extracted and formatted category names to display nicely in the agent's summary instead of falling back to the default "no results" message.
  3. Updated `apps/ai-service/docs/skills-pipeline-architecture.md` to document the category result formatting behavior.
- **Yasmine Greeting Repetition Prevention (REFACTOR)**: Addressed greeting repetition behavior in the Yasmine/sales-rep-v2 agent template:
  1. Added a strict instruction in `apps/backend/agents/sales-rep-v2-agent/SOUL.md` under the "Voice & Tone" section to prohibit repeating the greeting once the conversation is already in progress and the user has been initially greeted.


## 2026-07-16 / 2026-03-09
- **Company Dashboard Layout & Styling Redesign (FIX/UI/UX)**: Resolved layout gaps, alignment issues, and card stretching failures in the company dashboard page, especially under RTL configurations:
  1. Updated `AppWidgetGrid.tsx` to utilize `grid-flow-row-dense` and properly handle responsive `colSpan` sizes (using `sm:col-span-2 xl:col-span-2` wrapper divs) to prevent empty grid cells.
  2. Redesigned `AppWidgetCard.tsx` to set button widths to `w-full` for full stretch capability, corrected text alignment to `text-start` for standard RTL/LTR support, and added group-hover translations (`hover:-translate-y-1.5`) and transition animations for a premium visual feel.
  3. Redesigned `AppWidgetMini.tsx` to set width to `w-full`, corrected text alignment to `text-start`, and improved hover animations.
  4. Fixed TypeScript compilation errors (`TS2322` and `TS2532`) inside `AppWidgetGrid.tsx` and `AppWidgetMini.tsx` by casting translation values to strings and safe-extracting the first metrics item with non-null checks.


## 2026-07-03 / 2026-03-09
- **Company Role Resolution & Sidebar Fix (FIX)**: Fixed a critical bug where company accounts (OWNER, COMPANY_ADMIN) would lose sidebar access after page refresh, showing only 1–2 items instead of the full menu:
  1. Updated `/auth/login`, `/auth/me`, `/auth/companies`, and `/auth/switch-company` in `authController.js` to include the `roleRef` relation in `userCompanies` queries.
  2. Updated all role mapping logic to prefer `uc.roleRef?.key || uc.role` over the bare `uc.role` enum (which defaults to `AGENT`), preserving correct OWNER/COMPANY_ADMIN access context.
  3. Added `plan` field fallback in `buildCompanyResponseWithOnboarding()` (`companyOnboarding.js`) to ensure the company response always includes a plan.
  4. Set up `test_communication_platform` test database with full schema push. All 15 login tests pass.
  5. Resolved a critical permissions mismatch where `/auth/login` and `/auth/switch-company` did not load user permissions, causing the frontend to show all sidebar sections initially (due to fallback on empty permissions list) but collapse them upon page refresh (since `/auth/me` does load permissions). Permissions are now consistently loaded in all three auth endpoints.
  6. Aligned frontend `sidebar.ts` `DOMAIN_PERMISSIONS` keys with actual backend database values (changing legacy `conversations.view` to the database-seeded `inbox.view`, adding database-canonical `finance.invoices`/`finance.payments` to `procurement`, and `notifications.view` to `notifications`), securing consistent sidebar items visibility on reload.
- **Catalog Search Skill & Seeding Hardening (IMPROVEMENT/FIX)**: Standardized the `catalog-search` declarative skill for 2026 progressive disclosure:
  1. Rewrote `skill.json` to feature a comprehensive, scenario-based description, added 20 localized trigger phrases (Arabic and English), expanded allowed tools, and raised the max tool count to 6.
  2. Overhauled `SKILL.md` to document all parameters (including visual search and size/color attributes), added a complete decision tree, result formatting guidelines, and alternative recommendation loops.
  3. Added few-shot interactive dialog examples in `examples/conversations.md`.
  4. Updated `seed.py` to parse `triggerPhrases` from `skill.json` and persist them as a comma-separated list to the database's `trigger_phrases` column, enabling SQL intent routing.
  5. Refactored `integration.py` to load and cache `trigger_phrases` across DB and filesystem paths, and dynamically inject them into the system prompt's `<trigger_phrases>` XML block.
- **WhatsApp Workspace Responsive Overhaul (UI/UX)**: Implemented complete responsive layout harmony and mobile-native UX patterns for the WhatsApp module (`/whatsapp`) utilizing modern 2026 CSS features:
  1. Added dedicated `whatsapp-responsive.css` file containing: View Transitions API animations for smooth panel switching, `@starting-style` entry effects, Container Queries (`@container`) for responsive bubble scaling, scroll-driven header compression, glassmorphism headers, and mobile safe-area overrides.
  2. Integrated touch gesture swipe zones (`onTouchStart`/`onTouchEnd`) in `ChatWindow.tsx` and `WhatsAppChat.tsx` to swipe back to list on mobile.
  3. Replaced fixed grid layout with horizontal scrolling flex strip for filter pills on mobile with larger touch targets.
  4. Added a slide-up tray modal overlay (`wa-rich-tools-tray`) for chat input tools on mobile screens.
  5. Implemented container `:has(.whatsapp-workspace-root)` overrides in `index.css` to dynamically strip out dashboard container paddings and double scrolls.
  6. Added dark-mode theme compatibility to `AudioRecorder.tsx` by replacing hardcoded white backgrounds with themed surface variables.
  7. Redesigned the `EmojiPicker` on mobile screens to act as a full-width bottom sheet drawer with smooth slide-up animations and touch-outside dismissal support.
  8. Integrated touch swipe gestures (`Swipe-to-Archive`) on conversation cards inside the chat list sidebar on mobile screens with spring physics, auto-closing behaviors, and full RTL layout directions.
- **WhatsApp Inbox Auto-Assignment & Reassignment Hardening (FIX)**: Fixed bugs in the WhatsApp auto-routing and reassignment sweep mechanism:
  1. Unified incoming webhook sync `WhatsAppSyncService` to delegate all auto-assignments to the advanced `WhatsAppAssignmentEngineService`, ensuring online checks, capacity limits, working hours, and advisory locks are respected.
  2. Resolved the infinite 60-second reassignment loop (ping-pong) by adding a 5-minute cooldown period and making the SLA response timeout window start relative to `lastAssignedAt` if the agent was assigned after the message.
  3. Optimized the background sweep query to dynamically query active company assignments and filter by pending customer messages, cutting full table scan DB overhead.
  4. Secured the background interval against concurrent execution across PM2 cluster instances using PostgreSQL distributed advisory locks (`pg_try_advisory_lock`).
  5. Added Jest unit tests to verify reassignment cooldown and SLA timeout behaviors.
  6. Fixed a candidate pool building bug that prioritized direct `assignedUser` (number owner) over configured `routingUserIds` in Round Robin / Shared Inbox modes, ensuring correct distribution to employee agents.
- **Vite Chunk Load Recovery & Nginx Cache Control (FIX)**: Fixed frontend crashes on navigation after deployment where old chunks failed to fetch (404):
  1. Refactored `AdminAppBootstrap.tsx` to import `ErrorBoundary` statically instead of dynamically with `React.lazy`, ensuring the recovery mechanism is always active and doesn't fail to load itself when old chunks are deleted.
  2. Configured both `location /` blocks in `nginx_configs/maxp.online.conf` with Cache-Control headers (`no-cache, no-store, must-revalidate`, `Pragma "no-cache"`, `Expires "0"`) to prevent the browser from caching `index.html` and force it to fetch updated assets.

## 2026-07-21 / 2026-03-09
- **WhatsApp Template Broadcast & Session Resolution Fix (FIX)**: Fixed WhatsApp template list stale options in frontend and resolved the "Session not found" broadcast campaign failures.
  1. Updated frontend `WhatsAppTemplateBroadcast.tsx` to immediately clear templates and reset the selected template upon changing WhatsApp sessions, preventing stale options from previously loaded sessions on network delay or load failures.
  2. Passed the selected `whatsAppSessionId` in the body payload from frontend to the campaign creation API endpoint (`POST /api/v1/broadcast/campaigns`).
  3. Added `whatsAppSessionId String?` optional field to the `BroadcastCampaign` prisma model and generated the updated client.
  4. Updated `broadcastController.js` to store the selected `whatsAppSessionId` on campaign creation and retrieve it when triggering campaigns, falling back dynamically to the first available Meta Cloud session if not provided.
  5. Completely refactored `broadcastSchedulerService.js` to support the WhatsApp channel, enabling scheduled campaigns to resolve the WhatsApp session and send messages using `WhatsAppMessageHandler.sendTemplateMessage` instead of attempting to send Facebook Messenger text messages.
- **WhatsApp Broadcast 24-Hour Recipient Window Bypass (FIX)**: Fixed campaign failure (`No active recipients found`) caused by enforcing Facebook's 24-hour customer activity restriction on WhatsApp templates.
  1. Separated recipient query logic in `broadcastController.js` (`sendCampaign`) and `broadcastSchedulerService.js` (`sendScheduledCampaign`) by channel type.
  2. Removed the 24-hour message filter requirement for WhatsApp campaigns to allow messaging any valid customer contact outside the 24h window as intended by WhatsApp Business templates.
  3. Added dynamic `Conversation` creation for target `Customer` entries without prior conversations so they are successfully enrolled in broadcast recipient lists.

## 2026-07-02 / 2026-03-09
- **AI Agent Sandbox Empty Reply Fix (FIX)**: Fixed `AI_SANDBOX_EMPTY_REPLY` errors on the sandbox testing tab (`/admin/ai-hub?tab=sandbox`). Resolved a `NameError` crash in `skills_pipeline.py` caused by an undefined `has_images` variable reference inside `_llm_call`, and implemented a fallback Arabic response when the LLM returns an empty message after multiple retries (due to provider timeouts or rate limits), preventing empty replies from reaching downstream backend pipelines.
- **DeepSeek DSML XML Tool Call Parsing (FIX)**: Fixed the bug where DeepSeek V4 models generated XML-like DSML tool calling markup inside plain text responses, which leaked to customers in chat sessions. Replaced the JSON-based DSML parser in `client.py` with a robust regex parser that correctly extracts tool calls and parameter values from spaced or standard XML DSML markup, performs automatic type coercion, and falls back to JSON-in-DSML legacy structures. Trigger conditions were also expanded to intercept DSML format leaks across alternative providers hosting DeepSeek models (e.g., OpenRouter, SambaNova).
- **Multimodal Image Pipeline Fix (FIX)**: Fixed a structural bug in `skills_pipeline.py` where customer image attachments were being passed as raw objects to the LLM instead of being formatted as OpenAI/Gemini compatible `image_url` parts via `build_user_content`. This resolved the issue where vision-capable models (like Gemini 2.5 Flash) could not see or recognize images sent in the chat.
- **Sales Rep V2 Agent Template (NEW TEMPLATE)**: Created a new structured agent template `sales-rep-v2-agent` based on prompt engineering best practices from the `agency-agents` open-source project (123k ⭐). Key improvements: 5-step Sales Workflow (Discovery → Presentation → Objection Handling → Data Collection → Close), Critical Rules (Do's & Don'ts), Success Metrics, Failure Protocol (graceful degradation instead of "حصل عطل فني"), prioritized tool categorization (🔴→🟡→🟢), and structured Handoff Rules for multi-agent coordination.
- **Ready Agent Profiles & Merchant Locks (NEW FEATURE/GAP RESOLUTION)**:
  1. Resolved gaps in ready-to-use agents settings by adding advanced soul fields (welcome messages, language selections, and escalation strategies) to personalities.
  2. Implemented field-level editing locks (`lockIdentity`, `lockPersona`, `lockRules`, `lockCustomPrompt`) to prevent merchant tampering with core prompt templates.
  3. Integrated visual lock indicators (🔒) in merchant edit forms with dynamic read-only input behavior.
  4. Added PostgreSQL seeding for automatic DB state preparation with optimized template configs.
  5. Implemented `spawnReadyAgentsService.js` to automatically provision and configure all active ready profiles for new company activations (free and paid bundles) instead of requiring manual creation.
  6. Hardened the Super Admin profiles editor page with personality field validation, synced channels, auto-slug generation, and profile cloning/duplication.
- **Documentation & Architecture Review**: Documented the multi-file agent template contract pattern (agent.json + SOUL.md + TOOLS.md + AGENTS.md → single XML agent_contract at runtime) and updated Structure.md with the agent templates architecture.

## 2026-07-01 / 2026-03-09
- **DeepSeek V4 Flash Tool Calling Stabilization (FIX/OPTIMIZATION)**: Implemented strict tool schema enforcement (`"strict": True`) for DeepSeek/OpenAI LLM clients and enabled capturing and forwarding of `reasoning_content` (thinking process) in the multi-turn agent chat history to prevent DSML XML tag leakage and formatting errors.
- **Agent Execution Pipeline Improvements (FIX/OPTIMIZATION)**: Refactored `skills_pipeline.py` and `validate_reply.py` to support parallel tool execution (via `asyncio.gather`), LLM JSON parse self-correction loops, strict fallback for failed output contracts, and output guardrail self-correction with reflection retries.
- **Silent Escalation and Takeover System (NEW FEATURE)**: Implemented a silent handoff system when AI agents encounter guardrail violations, schema formatting errors, or exceptions. Suppressed visible fallback error messages to customers and added Socket.IO events (`ai:escalation`) and DB logs (`ActivityLog`) to notify human moderators to take over the conversation seamlessly on WhatsApp, Telegram, Facebook, and Instagram channels.
- **Facebook Inbox Layout Responsiveness (FIX)**: Resolved the layout squeezed and action button collision/wrapping issues in `/facebook-inbox` on tablets and narrow viewports by collapsing secondary actions into a "More Actions" dropdown menu when screen space is limited.
- **WhatsApp Inbox Session Alignment Fix (FIX)**: Fixed `/whatsapp-inbox` displaying unassigned/draft WhatsApp sessions for admin roles. The list is now filtered to show only sessions that have an active assignment configured in settings.
- **NumberSidebar Search Crash Fix (FIX)**: Fixed potential null pointer TypeError in the settings page when searching numbers with missing `phoneNumber` fields.
- **Meta Cloud Status Resolution Fix (FIX)**: Fixed `META_CLOUD` provider sessions resolving to `DISCONNECTED` on the routing workspace page. Meta Cloud sessions are now resolved to `CONNECTED` identically to the WhatsApp Settings page.
- **Soft-Deleted Sessions Filtering Fix (FIX)**: Fixed soft-deleted/draft sessions (where `isDeleted: true` in metadata) displaying in the Routing Workspace page by mirroring the metadata filter used in the Settings page.
- **WhatsApp Workspace Dropdown Display Fix (FIX)**: Fixed selected WhatsApp session showing as database CUID ID instead of its friendly name in the select trigger after choosing a session on `/whatsapp`.
- **WhatsApp Workspace Session RBAC Access Fix (FIX)**: Fixed `/whatsapp` session selection list exposing all company numbers to moderators; it now filters the dropdown to only show the sessions assigned to the active moderator.

## 2026-06-30 / 2026-03-09
- **WhatsApp Template Broadcast UI Fix (FIX)**: Resolved the bug where the WhatsApp Session dropdown displayed the raw database CUID instead of the friendly name or display phone number for Meta Cloud sessions.
- **Project Break-Even Translation Fix (FIX)**: Resolved raw translation keys (like `projectBreakEven.title`) showing on the break-even page by creating dedicated locale section files (`projectBreakEven.json`) for Arabic and English to prevent them from being overwritten during i18n merge operations.
- **Documentation Sync**: Created the backend synchronization docs (`Bugs.md`, `Structure.md`, `TEAM_SYNC.md`) to comply with CI/CD rules and documented the fix.
