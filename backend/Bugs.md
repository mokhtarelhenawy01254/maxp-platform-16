### [FEATURE / SEARCH] Full System Search Support for Turbo Tracking Codes
- **Date**: 2026-07-22
- **Requirement / Resolution**:
  1. **Main Orders Search (`/orders`)**: Expanded search queries in `apps/backend/routes/orders.js` to match `turboTrackingNumber` and `turboShipmentId` alongside `orderNumber`, customer name, and phone.
  2. **Preparation Queue Search (`/orders/preparation`)**: Updated SQL search condition `buildSearchSqlCondition` and haystack matcher `matchesPreparationHaystackSearch` in `preparationQueueService.js` to include `turboTrackingNumber` and `turboShipmentId`.
  3. **Turbo Records Search (`/orders/turbo-records`)**: Enabled searching by Turbo tracking code across all status filters.
- **Files Modified**:
  - `apps/backend/routes/orders.js`
  - `apps/backend/services/preparationQueueService.js`

### [FEATURE / ORDERS UI] Added "Update Turbo Shipment" Button to Order Details Page
- **Date**: 2026-07-22
- **Requirement / Resolution**:
  1. **Interactive UI Button**: Added `🔄 تحديث الشحنة في Turbo` button inside `TurboShippingPanel.tsx` in Order Details modal (`OrderDetails.tsx`).
  2. **Direct API Hook (`useTurboShipping.ts`)**: Added `updateShipment` method that calls `PUT /api/v1/turbo/orders/:orderId/shipment`.
  3. **Real-time User Notifications**: Displays loading indicator during update and shows clear toast notification on success (`تم تحديث بيانات الشحنة في تربو بنجاح`) or translated Arabic error message if Turbo validation fails.
- **Files Modified**:
  - `apps/frontend/src/pages/orders/components/TurboShippingPanel.tsx`
  - `apps/frontend/src/pages/orders/hooks/useTurboShipping.ts`
  - `apps/frontend/src/pages/orders/OrderDetails.tsx`

### [FEATURE / TURBO API EDIT ORDER] Integrated Turbo Edit Order API & Fixed `return_summary` Requirement
- **Date**: 2026-07-22
- **Requirement / Resolution**:
  1. **Turbo API `/edit-order` Integration**: Verified and tested `updateShipment` method in `turboService.js` calling Turbo API endpoint `POST https://backoffice.turbo-eg.com/external-api/edit-order`.
  2. **Fixed `return_summary` Requirement**: Turbo API rejected edit requests with `The return summary field is required when is order is 1`. Added default non-empty fallback `'لا يوجد مرتجع'` for `return_summary` parameter in `updateData`.
  3. **Automatic System Sync (`orderDetailsUpdateService.js`)**: Any update to customer details (name, phone, address) or order items on our platform automatically triggers `updateShipment`, syncing the changes live to Turbo system.
- **Files Modified**:
  - `apps/backend/services/turboService.js`
  - `apps/backend/services/orderDetailsUpdateService.js`

### [BUG FIX / TURBO VALIDATION] Strict Customer Phone Validation Before Turbo Shipment Creation
- **Date**: 2026-07-22
- **Requirement / Fix**:
  1. **Strict Rejection**: Completely removed automatic fallback padding (`01000000000`) for incomplete customer phone numbers.
  2. **Detailed Arabic Error Message**: If a customer phone number is not a valid 11-digit Egyptian mobile number starting with `01` (e.g. 10 digits instead of 11), the system strictly blocks sending the shipment to Turbo and throws an explicit error message detailing the exact issue (e.g. `رقم هاتف العميل غير صحيح: الرقم مكون من 10 أرقام بدلاً من 11 رقماً`).
- **Files Modified**:
  - `apps/backend/services/turboService.js`

### [BUG FIX / PREPARATION QUEUE & TURBO] Synchronized Guest Orders with Regular Orders & Fixed English Governorate Mapping
- **Date**: 2026-07-22
- **Root Cause**:
  1. **Duplicate Guest Rows**: `guest_orders` records remained in `PENDING` state after being converted to regular orders. `buildGuestSql` in `preparationQueueService.js` only checked if regular orders were non-terminal, pulling stale guest orders into Preparation Queue without customer name/phone.
  2. **Incomplete Drafts on English Locations**: WooCommerce and Storefront orders with English governorate names (e.g. `'Cairo'`, `'Giza'`, `'Alexandria'`, `'Dakahlia'`) were missing from `governorateMap`, preventing automatic translation to official Arabic governorate names required by Turbo API.
  3. **Phone Sanitization**: Invalid phone formats were rejected by Turbo API instead of being formatted cleanly.
- **Fix**:
  1. Updated `buildGuestSql` in `preparationQueueService.js` to exclude any `guest_orders` row if a corresponding regular order exists in `orders` table.
  2. Synced all 684 `guest_orders` records with their matching `orders` records to update their statuses and tracking numbers.
  3. Added full English governorates map (`cairo`, `giza`, `alexandria`, `dakahlia`, etc.) to `getTurboGovernorateName` in `turboService.js`.
  4. Added phone sanitizer ensuring 11-digit Egyptian phone format for Turbo API.
- **Files Modified**:
  - `apps/backend/services/preparationQueueService.js`
  - `apps/backend/services/turboService.js`

### [BUG FIX / TURBO SHIPMENTS] Resolved Turbo Incomplete Drafts & Arabic Error Messages
- **Date**: 2026-07-22
- **Root Cause**:
  1. **Incomplete Drafts**: When `shippingAddress` was stored as a JSON string, `getShippingAddressFields` checked `parsedAddress.governorate` but ignored `parsedAddress.state` / `province`. This caused empty governorates to be sent to Turbo, marking shipments as "incomplete drafts" in Turbo dashboard.
  2. **English Errors**: Bulk creation and single creation errors were returned in raw English strings.
- **Fix**:
  1. Updated `getShippingAddressFields` to parse `state`, `province`, `region`, and `town` from JSON shipping addresses.
  2. Added complete fallback values for `receiver`, `phone1`, `government`, `area`, and `address` in `shipmentData` to guarantee non-empty payload to Turbo.
  3. Added `translateTurboErrorToArabic` utility in `turboService.js` and `turboController.js` to translate all Turbo errors into clear, friendly Arabic.
- **Files Modified**:
  - `apps/backend/services/turboService.js`
  - `apps/backend/controller/turboController.js`

### [BUG FIX / TURBO API] Fixed 404 Error on `/api/v1/turbo/bulk/create-shipments`
- **Date**: 2026-07-22
- **Root Cause**: `checkAppAccess('order-shipping-turbo')` middleware returned HTTP 404 (`الأداة غير موجودة`) when `order-shipping-turbo` slug was missing from `MarketplaceApp` table, despite Turbo API key being configured for the company.
- **Fix**: Added check in `checkAppAccess.js` to allow access immediately if `company.turboEnabled` or `company.turboApiKey` is set.
- **Files Modified**:
  - `apps/backend/middleware/checkAppAccess.js`

### [ARCHITECTURE / STATUSES] Central Single Source of Truth Status Registry
- **Date**: 2026-07-22
- **Requirement / Resolution**:
  1. **Frontend Status Registry (`statusRegistry.ts`)**: Built central status registry utility mapping all 13 official Turbo status codes with their aliases (`created`, `turbo_saved`, `status_1`, `1`, etc.) into a unified single source of truth (`getUnifiedOrderStatus`).
  2. **Backend Status Normalizer (`statusNormalizer.js`)**: Created central normalizer module for backend controllers to eliminate duplicate inline dictionaries.
  3. **Unified Display Across App**: Refactored `Orders.tsx` and `OrderHeader.tsx` to source all status labels and badge styling from `getUnifiedOrderStatus`, ensuring 100% consistency across table list, order details modal, and status dropdowns.
- **Files Created/Modified**:
  - `apps/frontend/src/utils/statusRegistry.ts`
  - `apps/backend/utils/statusNormalizer.js`
  - `apps/frontend/src/pages/orders/Orders.tsx`
  - `apps/frontend/src/pages/orders/components/OrderHeader.tsx`
  - `apps/backend/controller/turboController.js`

### [BUG FIX / TURBO RECORDS] Turbo Branch Processing Filter Over-counting Fix
- **Date**: 2026-07-22
- **Root Cause**: 
  1. `ALIASES.processing` in `turboController.js` incorrectly included `'created'` status codes, causing orders in `created` / `turbo_saved` state to be included under `processing`.
  2. Generic fallback logic in `getRecords` added `{ status: 'PROCESSING' }` for Turbo status filters, causing orders with internal status `PROCESSING` but Turbo status `created` to match.
  3. `statusCountsRaw` defaulted null/empty `turboShipmentStatus` to `'processing'` instead of `'turbo_saved'`.
- **Fix**: Removed `'created'` from `processing` aliases, mapped `created` strictly to `turbo_saved` & `merchant_preparing`, restricted generic internal status fallback for Turbo-specific filters, and updated default fallback status key to `'turbo_saved'`.
- **Files Modified**:
  - `apps/backend/controller/turboController.js`

### [FEATURE / TURBO & STATUSES] Dedicated Merchant Preparing Card & Official 13 Status Code Alignment
- **Date**: 2026-07-22
- **Requirement / Resolution**:
  1. **Status Code Mapping Realignment**: Updated `ALIASES` and `STATUS_ALIAS_MAP` in `turboController.js` to strictly adhere to official Turbo status codes 1 through 13.
  2. **Merchant Preparing Metric Card (`merchant_preparing`)**: Created a dedicated filter card for orders that have received a Turbo tracking code (`turbo_saved` / `turbo_sent`) but have not yet been picked up or reached Turbo's branch.
  3. **Structured Top Cards Grid**: Re-architected `/orders/turbo-records` top section to feature Active Shipments (`active`), Merchant Preparing (`merchant_preparing`), Branch Processing (`processing`), and Total Turbo Orders (`all`).
- **Files Modified**:
  - `apps/backend/controller/turboController.js`
  - `apps/frontend/src/pages/orders/TurboRecords.tsx`

### [FIX/TURBO] Required `return_summary` Field in Shipment Creation Payload
- **Date**: 2026-07-22
- **Root Cause**: Turbo API rejects `/add-order` requests when `is_order: 1` if `return_summary` parameter is missing with error `'The return summary field is required when is order is 1.'`.
- **Fix**: Added `return_summary: orderData.returnSummary || formattedSummary || 'لا يوجد'` to shipment creation payload in `turboService.js`.
- **Files Modified**:
  - `apps/backend/services/turboService.js`

### [FEATURE / TURBO & STATUSES] Auto-Seeding Turbo Shipping Statuses into Order Status Management
- **Date**: 2026-07-21
- **Requirement / Feature**:
  1. **Automatic Status Seeding**: Users requested that all Turbo shipping status variants (Processing, Shipped, Out for Delivery, Delayed, Failed Delivery, Rescheduled, On Hold, Delivered, Cancelled, Returned) automatically populate into `/settings/orders` under "Shipping Statuses" (`statusType: 'shipping'`).
- **Resolution**:
  1. **Seeded Turbo Shipping Statuses**: Added `TURBO_PROCESSING`, `TURBO_SHIPPED`, `TURBO_OUT_FOR_DELIVERY`, `TURBO_DELAYED`, `TURBO_FAILED_DELIVERY`, `TURBO_RESCHEDULED`, `TURBO_ON_HOLD`, `TURBO_DELIVERED`, `TURBO_CANCELLED`, and `TURBO_RETURNED` to `DEFAULT_SHIPPING_STATUSES` in `apps/backend/controller/orderStatusController.js`.
  2. **Automated Integration**: Connected `initializeDefaultStatuses` to trigger automatically whenever a company saves or updates Turbo settings in `storeSettingsController.js` or clicks "Initialize Statuses" in `/settings/orders`.
- **Files Modified**:
  - `apps/backend/controller/orderStatusController.js`
  - `apps/backend/controller/storeSettingsController.js`

### [BUG FIX / TURBO] Webhook Intermediate Statuses (Processing, Shipped, Out for Delivery) Ignored for Order.status
- **Date**: 2026-07-21
- **Root Cause**:
  1. **Partial Status Mapping Logic**: In `apps/backend/routes/turboWebhook.js`, incoming webhooks from Turbo updated `turboShipmentStatus` and `turboMetadata`, but only checked for `delivered` (5), `cancelled` (6), and `returned` (7) when updating the main `Order.status` / `GuestOrder.status` field.
  2. **Stale Main Order Status**: When Turbo sent intermediate webhook updates such as `processing` (3), `shipped` (4), `out_for_delivery` (9), or `on_hold` (12/8/11), `updateData.status` remained undefined, leaving the order's primary status stuck in `PENDING` or `CONFIRMED` on the main Orders table.
- **Resolution**:
  1. **Comprehensive Status Enum Mapping**: Extended `turboWebhook.js` to map `processing` (3) ➡️ `PROCESSING`, `shipped` (4) / `out_for_delivery` (9) ➡️ `SHIPPED`, and `on_hold` / `delayed` (12/8/11) ➡️ `ON_HOLD` for both `Order` and `GuestOrder` models.
- **Files Modified**:
  - `apps/backend/routes/turboWebhook.js`

### [BUG FIX / FRONTEND] Uncaught ReferenceError: t is not defined in route-admin Chunk
- **Date**: 2026-07-21
- **Root Cause**:
  1. **Module-Scope Execution of `t()`**: In `apps/frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx`, `EGYPT_GOVERNORATES` was initialized at module level (outside any React component or hook) calling `t('manualOrder.k_25')`, etc. When Vite bundled the `route-admin` chunk, evaluating the module at script load time threw `Uncaught ReferenceError: t is not defined` because `t` was not in module scope.
  2. **Missing `useTranslation` Hook**: In `ProductSearchColumn.tsx`, `t(...)` was invoked inside error toast handlers without importing or instantiating `useTranslation()`.
- **Resolution**:
  1. **Refactored Module Array**: Converted `EGYPT_GOVERNORATES` to `EGYPT_GOVERNORATE_KEYS` holding translation string keys, and resolved `t(key)` dynamically inside `CheckoutColumn` using `useMemo` and `useTranslation()`.
  2. **Added Hook & Imports**: Added `useTranslation` import and `const { t } = useTranslation()` hook in `ProductSearchColumn.tsx`.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx`
  - `apps/frontend/src/pages/admin/ManualOrder/components/ProductSearchColumn.tsx`

### [BUG FIX / NGINX] CDN / Cloudflare Caching 404 Responses as Immutable Assets
- **Date**: 2026-07-21
- **Root Cause**:
  1. **Nginx Header Directive Misconfiguration**: In `nginx_configs/maxp.online.conf`, the static assets location blocks (`location ^~ /assets/` and `location ^~ /placeholders/`) specified `add_header Cache-Control "public, max-age=31536000, immutable" always;`.
  2. **Immutable 404 Caching**: Using the `always` parameter instructs Nginx to append the `Cache-Control` header to ALL responses, including `404 Not Found`. When users accessed the site during a deployment window before assets finishes syncing, Cloudflare and browser caches cached the 404 response immutably for 1 year (`max-age=31536000`), breaking frontend asset loads permanently for affected clients.
- **Resolution**:
  1. **Removed `always` Modifier**: Removed `always` from `add_header Cache-Control` inside asset/placeholder location blocks in both server configuration files and deployed server configs (`/etc/nginx/sites-available/maxp.online.conf`), ensuring `Cache-Control: immutable` headers are only applied to successful (2xx/3xx) asset responses.
- **Files Modified**:
  - `nginx_configs/maxp.online.conf`

### [BUG FIX / WEBHOOK] Turbo Webhook OrderStatus & PaymentStatus Mismatch
- **Date**: 2026-07-21
- **Root Cause**:
  1. **Invalid Enum Values on Order Status Updates**: When a delivery update webhook is received from Turbo (`routes/turboWebhook.js`) or when manually tracking shipment status via the controller (`controller/turboController.js`), the code attempted to update the order's status to `COMPLETED` and paymentStatus to `PAID`. However, in the Prisma schema (`OrderStatus` and `PaymentStatus` enums), `COMPLETED` is not a valid `OrderStatus` (the correct value is `DELIVERED`), and `PAID` is not a valid `PaymentStatus` (the correct value is `COMPLETED`). This caused a 500 Internal Server Error / database validation crash during status syncs.
  2. **Invoice Payment Status Update Mismatch**: In `orderInvoiceService.js`, updating the invoice payment status to `PAID` incorrectly attempted to set `paymentStatus` on the `Order` model to `PAID` instead of `COMPLETED`, triggering the same Prisma validation error.
- **Resolution**:
  1. **Enum Alignment**: Corrected the delivered status mapping in `routes/turboWebhook.js` and `controller/turboController.js` to use `status: 'DELIVERED'` and `paymentStatus: 'COMPLETED'`.
  2. **Service Enum Sync**: Corrected `orderInvoiceService.js` to update the order's `paymentStatus` to `'COMPLETED'` instead of `'PAID'`.
- **Files Modified**:
  - `apps/backend/routes/turboWebhook.js`
  - `apps/backend/controller/turboController.js`
  - `apps/backend/services/orderInvoiceService.js`

### [BUG FIX / SYNC] Order Sync Queue PostgreSQL Column Mismatch
- **Date**: 2026-07-21
- **Root Cause**:
  1. **PostgreSQL snake_case vs camelCase column mismatch**: The background database-backed sync queue `SyncQueueService` (`syncQueueService.js`) executed raw SQL queries via `$queryRawUnsafe` and `$executeRawUnsafe` matching snake_case columns (like `order_id`, `consumer_id`, etc.). However, since the database table `order_sync_queue` was migrated using Prisma's default column mapper without specific `@map` definitions on field parameters, the actual database columns were generated as camelCase (`orderId`, `consumerId`, etc.), causing raw queries to fail with code `42703` (`column "order_id" does not exist`).
- **Resolution**:
  1. **ORM-native Refactoring**: Replaced all raw SQL client executions inside `syncQueueService.js` with native Prisma ORM query methods (such as `prisma.orderSyncQueue.findFirst`, `create`, `update`, `findMany`, and `findUnique`). This leverages Prisma's built-in column mapping engine and prevents future SQL syntax or field name mapping errors.
- **Files Modified**:
  - `apps/backend/services/syncQueueService.js`


### [BUG FIX / BROADCAST] WhatsApp Template Campaign Overwrite & Parameter Mismatch Fixes
- **Date**: 2026-07-21
- **Root Cause**:
  1. **Manual Recipients Overwritten**: In `broadcastController.js`, `if (isWhatsApp && !hasManualPhones)` was followed by a generic `else` block for Facebook Messenger. When sending a WhatsApp campaign with `manualPhones`, `!hasManualPhones` evaluated to `false`, causing execution to drop into the `else` block which overwrote `conversations` with Facebook 24h active chats.
  2. **Template Parameter Mismatch**: Templates without `{{1}}` / `{{2}}` variables threw Meta Cloud API error `#100 Param count mismatch` when `bodyParams` (firstName/lastName) were forcibly passed.
  3. **Prisma Relation Field**: `recipients` relation name in `getCampaign` and analytics endpoints did not match the schema model relation name (`broadcastRecipients`).
- **Resolution**:
  1. **Fixed Conditional Logic**: Changed `else` to `else if (!isWhatsApp && !hasManualPhones)` in `broadcastController.js`, preserving manual recipients array.
  2. **Parameter Fallback**: Added `try/catch` fallback in `broadcastController.js` and `broadcastSchedulerService.js` to retry template message sending with `components: []` if Meta returns parameter mismatch error.
  3. **Frontend Payload Fix**: Updated `WhatsAppTemplateBroadcast.tsx` to include `manualPhones` in FormData creation and pass `recipients` to `sendCampaign()`.
- **Files Modified**:
  - `apps/backend/controller/broadcastController.js`
  - `apps/backend/services/broadcastSchedulerService.js`
  - `apps/frontend/src/pages/whatsapp/WhatsAppTemplateBroadcast.tsx`
  - `apps/backend/docs/whatsapp/whatsapp-broadcast-24h-window-bypass-2026-07-21.md`

### [FEATURE / OVERRIDE] Support for Separate WhatsApp Facebook App ID & Credentials
- **Date**: 2026-07-19
- **Root Cause / Requirement**:
  1. **Development vs. Live mode restrictions**: The main Facebook App configured on the platform is in Development mode and undergoing App Review for Page permissions (e.g., Pages Read/Engagement). This prevents it from being made Live.
  2. **WhatsApp Blocked in Development**: In Development mode, WhatsApp Embedded Signup triggers a Meta Business Account Integrity Limit block/crash (`WhatsAppBizxPlatformMetaBusinessAccountIntegrityLimitView`) if the tester accounts or business portfolios do not perfectly align, or due to Meta's strict onboarding security policies.
  3. **disrupted Page Integrations**: Overwriting the global Facebook App credentials with a new Live App specifically for WhatsApp would break existing Facebook Page tokens and integrations.
- **Resolution**:
  1. **Optional Credentials Override**: Added support for optional, separate WhatsApp-specific Facebook App credentials (`whatsappAppId`, `whatsappAppSecret`, `whatsappConfigId`) in the configuration JSON.
  2. **Prioritization Logic**: Modified the backend (`whatsappController.js`) configuration loader and token exchange endpoints to prioritize these WhatsApp credentials if they are populated, leaving the default Facebook Page integration unaffected.
  3. **Super Admin UI Integration**: Expanded `/super-admin/facebook-oauth` to allow editing, viewing, and saving these optional WhatsApp App credentials.
- **Files Modified**:
  - `apps/backend/config/facebookAppConfig.js` (MODIFIED)
  - `apps/backend/controller/whatsappController.js` (MODIFIED)
  - `apps/backend/routes/facebookOAuthRoutes.js` (MODIFIED)
  - `apps/frontend/src/pages/SuperAdminFacebookOAuth.jsx` (MODIFIED)

### [BUG FIX / DEPLOY] Deploy Script rsync --delete Wiping facebook-oauth-config.json
- **Date**: 2026-07-19
- **Root Cause**:
  1. **rsync --delete without exclude**: The `deploy-remote.sh` script uses `rsync -a --delete` to sync backend files from the staging tarball to `/var/www/backend2/`. Since `facebook-oauth-config.json` is in `.gitignore` and not tracked in git, it's absent from the tarball. The `--delete` flag causes rsync to remove any file on the server that doesn't exist in the source — including the credentials file managed via Super Admin.
  2. **Legacy deploy path uses rm -rf**: The fallback deploy path (staging directory without tarball) does `sudo rm -rf /var/www/backend2` before `mv`, which also destroys the config file.
- **Resolution**:
  1. **Added rsync exclude**: Added `--exclude data/facebook-oauth-config.json` to the rsync command in the tarball deploy path.
  2. **Added backup/restore**: In the legacy deploy path, added backup of `facebook-oauth-config.json` before `rm -rf` and restore after `mv`, similar to how `.env` is handled.
- **Files Modified**:
  - `scripts/deploy-remote.sh` (MODIFIED)

### [BUG FIX / API & UI] Facebook Embedded Connect redirect_uri Mismatch (500 Internal Server Error)
- **Date**: 2026-07-19
- **Root Cause**:
  1. **Hardcoded Empty redirect_uri**: In the `facebookEmbeddedConnect` backend controller, the `redirect_uri` for code exchange was hardcoded as `''` (empty string).
  2. **SDK Redirect Mismatch**: When the frontend utilizes the Facebook JavaScript SDK's `FB.login` method with `response_type: "code"`, the SDK automatically manages the OAuth flow. If the backend tries to exchange the code with a specific redirect URI (like `https://maxp.online/whatsapp/cloud-connect` or `https://maxp.online/`), Meta often rejects it with: `"Error validating verification code. Please make sure your redirect_uri is identical to the one you used in the OAuth dialog request"` because the SDK did not pass an explicit redirect URI in the dialog.
- **Resolution**:
  1. **Dual-Attempt Self-Healing Exchange**: Modified `facebookEmbeddedConnect` in `whatsappController.js` to first attempt the OAuth code exchange **without** the `redirect_uri` parameter (which is standard for Facebook SDK flows and eliminates mismatch errors entirely). If that fails, it catches the error and retries the exchange **with** the `redirect_uri` parameter (falling back to Referer path or client payload).
  2. **Frontend Payload Update**: Kept frontend payload sending `redirectUri: window.location.origin + window.location.pathname` inside the payload as a fallback.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js` (MODIFIED)
  - `apps/frontend/src/pages/whatsapp/WhatsAppCloudConnect.tsx` (MODIFIED)

### [ARCHITECTURAL FIX] Facebook OAuth Credentials Single Source of Truth Alignment (Overwriting / 400 Errors)
- **Date**: 2026-07-19
- **Root Cause**:
  1. **Deployment Overwriting Stored Configurations**: The `facebook-oauth-config.json` was tracked in Git history. When we untracked it and populated placeholders, git pull on the server applied the modification, replacing the actual production keys with placeholders.
  2. **Multi-Source Fallback Confusion**: The configuration loader `getFacebookOAuthConfig` had fallback options looking at `process.env.FACEBOOK_APP_SECRET` and hardcoded default app IDs. This caused silent credential mix-ups and made debugging 400 errors in production difficult.
- **Resolution**:
  1. **Eliminated Fallbacks**: Rewrote `getFacebookOAuthConfig` in `facebookAppConfig.js` to strictly load `appId` and `appSecret` from the local `facebook-oauth-config.json` file. Removed all `.env` fallbacks (`env.FACEBOOK_APP_SECRET`, `env.FACEBOOK_APP_ID`) and hardcoded credential fallbacks.
  2. **Refactored Helpers & Tests**: Updated helper functions `getFacebookAppSecret` and `getFacebookConfigId` to align with the new signature. Rewrote configuration unit tests to mock and test JSON file scenarios exclusively.
- **Files Modified**:
  - `apps/backend/config/facebookAppConfig.js` (MODIFIED)
  - `apps/backend/tests/config/facebookAppConfig.test.js` (MODIFIED)

### [BUG FIX / API & UI] Customer Classification Not Persisting, Tags Invisible, Classification Shows ID
- **Date**: 2026-07-18
- **Root Cause**:
  1. **Classification not persisting on reopen**: The backend `getConversations` endpoint did not include `leadCategoryId` or `leadCategory` in the Prisma `select` projection for `whatsAppContact.findMany`. This meant the conversations API response never contained classification data. When the user reopened a chat, `contact.leadCategoryId` was `undefined`, resetting the local state to empty.
  2. **Tags always invisible**: The `useCustomerProfile` hook set the customer state to `customerRes.data.data` (the entire response wrapper object containing `customer`, `stats`, `activities`, etc.) instead of `customerRes.data.data.customer` (the actual customer record). This meant `customer.tags` was always `undefined` since `.tags` doesn't exist on the wrapper object.
  3. **Classification shows raw ID instead of name**: The `Select` component from `@base-ui/react/select` was given `value=""` for the "no category" option. Base UI's Select does not support empty string values correctly, causing the `SelectValue` component to fail matching and fall back to displaying the raw value (the CUID database ID). Additionally, the `WhatsAppChat.tsx` sync effect did not include `leadCategoryId` in its change detection, so classification updates were not propagated from the query cache to the active `selectedContact` state.
- **Resolution**:
  1. Added `leadCategoryId: true` and `leadCategory: { select: { id, name, color } }` to the Prisma `select` block in `getConversations`.
  2. Fixed `useCustomerProfile.ts` to correctly extract `customerRes.data.data.customer` and added `tags` to the `Customer` interface.
  3. Replaced `value=""` with `value="none"` sentinel in the category `<Select>`, updated `handleCategoryChange` to map `'none'` back to `null`, and added `queryClient.invalidateQueries` after successful category update.
  4. Added `leadCategoryId` comparison to the `hasConversationStateChange` detection in `WhatsAppChat.tsx` sync effect.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js` (MODIFIED)
  - `apps/frontend/src/hooks/inbox/useCustomerProfile.ts` (MODIFIED)
  - `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx` (MODIFIED)
  - `apps/frontend/src/pages/whatsapp/components/ChatRightPanel.tsx` (MODIFIED)

### [BUG FIX / API & UI] AI Key Logs Filter Mismatch, Global Stats & Pagination Bypass
- **Date**: 2026-07-18
- **Root Cause**:
  1. **Status filter mismatch**: Backend database log status used `success`/`failed` for LLM requests but `ok`/`error` for key tests/creation. The frontend filter only sent `success` or `failed` which was strictly matched by backend, hiding the other statuses.
  2. **Page-level vs Global Stats**: The frontend statistics cards computed successful/failed counts and average latency locally from the current page's slice (25 logs), instead of retrieving global statistics from the backend, capped success/failed cards at 25.
  3. **Backend Pagination Bypass**: If the raw SQL query to `public.ai_provider_logs` threw an exception, the exception block swallowed the error but bypassed pagination slicing `rows[offset:offset+limit]`, returning full raw data length `fetch_limit` to the client.
  4. **Error handling UX**: Any error from the queries triggered an early return of the layout, rendering a blank screen with only an error message and retry button, making filters unusable.
  5. **PostgreSQL JSON Operator Error**: The raw SQL query for `public.ai_provider_logs` used the `->>` operator on the `metadata` column directly (`metadata->>'response'`). Since `metadata` is a `text` type column (not `jsonb` or `json`) in the DB schema, Postgres failed with an `UndefinedFunctionError: operator does not exist: text ->> unknown` exception. The exception was swallowed in the raw SQL block, silently causing generation logs to never load.
  6. **Timezone Awareness Sorting Mismatch**: The ORM returns timezone-aware datetimes (timezone=True) for `created_at` in the `ProviderLog` table, whereas the raw SQL query returns timezone-naive datetimes for `createdAt` in `public.ai_provider_logs`. Python's `sort` failed with a `TypeError: can't compare offset-naive and offset-aware datetimes` exception when merging both datasets, leading to a HTTP 500 error.
- **Resolution**:
  1. Updated the backend status filter mapping (`list_logs` and `_build_public_filters` helper in `keys.py`) to resolve `success` to `["success", "ok"]` and `failed` to `["failed", "error"]`.
  2. Extended backend schema `LogListResponse` and `list_logs` implementation to dynamically calculate global success, failed, and average latency stats across both ORM and raw SQL tables.
  3. Modified frontend `SuperAdminAIKeyLogs.tsx` to read stats globally from `logsRes`, falling back to page-level slice if undefined. Updated Select value onChange callbacks with nullish coalescing to prevent TypeScript null-assignment compilation errors.
  4. Moved slicing and sorting outside of the `try-except` block in `keys.py` to ensure pagination limit is always enforced.
  5. Rendered the error alert inline on the frontend logs page instead of early-returning the page layout.
  6. Added explicit `CAST(COALESCE(metadata, '{}') AS jsonb)->>'response'` casting to the raw SQL query in `keys.py`, resolving the exception and successfully restoring generation logs.
  7. Safe-guarded sorting comparison by stripping timezone info from offset-aware datetimes: `rows.sort(key=lambda r: r.created_at.replace(tzinfo=None) if r.created_at.tzinfo else r.created_at, reverse=True)`.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/keys.py` (MODIFIED)
  - `apps/ai-service/src/api/admin/schemas.py` (MODIFIED)
  - `apps/frontend/src/services/aiAdminService.ts` (MODIFIED)
  - `apps/frontend/src/pages/super-admin/SuperAdminAIKeyLogs.tsx` (MODIFIED)


### [BUG FIX / SEEDING] Dev Seeding Script Password Hashing & Role Mismatch
- **Date**: 2026-07-17
- **Root Cause**: The development database seeding script `seed-agentic-dev.js` inserted the test user `dev@maxp.test` with a plain-text password `dev123456` and a `null` role. The authentication login handler checks passwords using bcrypt matching (`bcrypt.compare`), and sandbox routes require roles of `OWNER`, `COMPANY_ADMIN`, or `SUPER_ADMIN`. This caused login to fail and restricted sandbox access for local verification.
- **Resolution**: Updated `seed-agentic-dev.js` to hash the test user's password using bcrypt and set the user's role to `OWNER`.
- **Files Modified**:
  - `scripts/seed-agentic-dev.js` (MODIFIED)

### [BUG FIX / PIPELINE] Legacy Heuristics and Forced Tool Injection
- **Date**: 2026-07-17
- **Root Cause**: The hotel agent was using a legacy 2024-era pattern in a custom hook `HotelEnforcementHook` (`hotel_hook.py`) consisting of brittle regex-based customer name/phone/dates/room extractions and manual injection of `hotel_reserve` tool-calls when confirmation keywords were matched. This was brittle, lacked semantic intent understanding, bypassed the LLM's natural conversational flow, and contradicted the 2026 SOTA agentic AI paradigm (where intent and parameter extraction are natively model-driven and handled via Pydantic model validation).
- **Resolution**:
  1. Removed `HotelEnforcementHook` registration from `base.py` and deleted `hotel_hook.py` entirely.
  2. Overhauled `SOUL.md` and `TOOLS.md` prompts inside the `hotel-agent` template directory to explicitly instruct the agent to conversationally gather missing required fields (name, phone, dates) instead of inventing mock values or relying on heuristic scripts (Conversational Slot-Filling).
  3. Cleaned up and updated unit tests in `test_skills_pipeline.py` to match the simplified machine-readable tool results formatter.
- **Files Modified**:
  - `apps/ai-service/src/agents/base.py` (MODIFIED)
  - `apps/backend/agents/hotel-agent/SOUL.md` (MODIFIED)
  - `apps/backend/agents/hotel-agent/TOOLS.md` (MODIFIED)
  - `apps/ai-service/tests/pipeline/test_skills_pipeline.py` (MODIFIED)
  - `apps/ai-service/src/agents/hooks/hotel_hook.py` (DELETED)

### [BUG FIX / UI] WhatsApp Session Selection CUID Display Bug
- **Date**: 2026-07-17
- **Root Cause**: Newly created Baileys sessions that have not scanned their QR code or been explicitly named default to having their `name` column set to the session's CUID (e.g. `cmr0zgrz902fkjuhdx0ni7jnk`) with no phone number. In `/whatsapp/template-broadcast` and `WhatsAppSettings.tsx`, the select dropdown was rendering the name directly without checking for CUIDs, which leaked the raw database identifier to the user.
- **Resolution**: Updated the session mapping in both selection dropdowns to verify if the session name is a CUID. If it is a CUID, it displays a friendly name `"جلسة واتساب"` and appends the phone number if available (e.g. `جلسة واتساب (010xxxxxxx)`).
- **Files Modified**:
  - `apps/frontend/src/pages/whatsapp/WhatsAppTemplateBroadcast.tsx`
  - `apps/frontend/src/pages/whatsapp/WhatsAppSettings.tsx`

### [FEATURE / BUG FIX] Customer Tags Integration & Filtering Gaps
- **Date**: 2026-07-17
- **Root Cause**: The customer tags field was saved to the DB but there was no way to filter the Customer List by tags, create smart lists matching tags, send broadcast campaigns targeting specific tags directly, or add/remove tags for the customer directly from the moderator chat sidebar.
- **Resolution**:
  1. Updated `getAllCustomer` in the backend and `getCustomers` in the frontend to support a `tag` query parameter.
  2. Implemented `GET /api/v1/customers/tags/distinct` to aggregate and return unique tags with customer counts.
  3. Added tag filter UI to `CustomerList.tsx`.
  4. Integrated tag criteria type (`criteria.type = 'tag'`) to `createCustomerList` and `getCustomersInList` on the backend and added tag criteria configuration inside `CreateListModal.tsx`.
  5. Added direct Tag selection to the WhatsApp template broadcast form.
  6. Implemented interactive Customer Tags editor section in `ChatRightPanel.tsx` on the moderator chat sidebar to easily add, auto-complete, and delete customer tags (fixed a JSX tag imbalance compilation error by adding the missing closing `</div>` tag for the tab content block).
- **Files Modified**:
  - `apps/backend/controller/customerController.js`
  - `apps/backend/routes/customerRoutes.js`
  - `apps/backend/controller/broadcastController.js`
  - `apps/frontend/src/services/customerService.ts`
  - `apps/frontend/src/pages/customers/CustomerList.tsx`
  - `apps/frontend/src/components/broadcast/CreateListModal.tsx`
  - `apps/frontend/src/pages/whatsapp/WhatsAppTemplateBroadcast.tsx`
  - `apps/frontend/src/pages/whatsapp/components/ChatRightPanel.tsx`

### [BUG FIX / UI] Customer Import Modal Placement and Layering (Layout Containment)
- **Date**: 2026-07-17
- **Root Cause**: The `CustomerImportModal` component was rendered inline within the `CustomerList` component tree inside the main `<main className="... overflow-y-auto">` layout container. This caused visual clipping/placement defects and z-index issues because parent elements had specific overflow constraints and stacking contexts.
- **Resolution**: Wrapped the modal rendering with `React.createPortal` to render the modal directly into `document.body`, escaping layout containment. Increased the overlay z-index to `z-[9999]` to guarantee it appears on top of all sidebar/header elements.
- **Files Modified**:
  - `apps/frontend/src/pages/customers/CustomerImportModal.tsx`


### [BUG FIX / PIPELINE] Legacy Frontend Path Conflict
- **Date**: 2026-07-17
- **Root Cause**: The storefront html controller (`storefrontHtmlController.js`) resolves candidates to serve `index.html` dynamically. The legacy path `path.resolve(__dirname, "../../frontend/dist/index.html")` resolved to `/var/www/frontend/dist/index.html` on the production server. Because the deployment script (`deploy-remote.sh`) only cleaned up this directory under conditional blocks that were skipped when staging tarballs were used, `/var/www/frontend` remained on disk. This caused the backend to continue serving the old `index.html` (which loaded obsolete chunk hashes like `54lLAbYb`) instead of `/var/www/frontend2/dist/index.html`.
- **Resolution**: Updated `storefrontHtmlController.js` to prioritize the absolute production path `/var/www/frontend2/dist/index.html` before checking the relative path (preserving local development). Also updated `deploy-remote.sh` to unconditionally remove the legacy `/var/www/frontend` directory if it exists on the server.
- **Files Modified**:
  - `apps/backend/controller/storefrontHtmlController.js`
  - `scripts/deploy-remote.sh`

### [BUG FIX / UI] Customer Import Modal — Missing Translation Keys
- **Date**: 2026-07-16
- **Root Cause**: `CustomerImportModal.tsx` used `t("customers.import.title")`, `t("customers.import.clickOrDrag")`, and 8+ other i18n keys under the `customers.import.*` namespace, but none were defined in either `ar/sections/customers.json` or `en/sections/customers.json`. This caused the UI to display raw translation key strings instead of proper Arabic/English text.
- **Resolution**: Added the complete `import` block with all 14 keys to both locale section files, then ran `merge-translations.js` to compile them into the main `translation.json` files.
- **Files Modified**:
  - `apps/frontend/src/locales/ar/sections/customers.json`
  - `apps/frontend/src/locales/en/sections/customers.json`

### [BUG FIX / UI] Customer List hasOrders Default Filter Bug
- **Date**: 2026-07-16
- **Root Cause**: In `CustomerList.tsx`, the default state of the query filter `hasOrders` was set to `false`. In the backend controller `customerController.js`, `hasOrders = false` is mapped to find customers with **no orders** (`where.orders = { none: {} }`), whereas omitting `hasOrders` (or setting it to `undefined`) yields no orders filter. This caused the general Customers list page (`/customers`) to default to displaying only prospects without orders, mirroring the Leads page.
- **Resolution**: Removed `hasOrders: false` from the initial state of the `filters` object in `CustomerList.tsx` and modified the `handleToggleWithOrders` method to set it to `true` when checked and `undefined` (omitting it) when unchecked, allowing `/customers` to correctly load all customers by default.
- **Files Modified**:
  - `apps/frontend/src/pages/customers/CustomerList.tsx`

### [BUG FIX / API] Dead Customer Service Client Functions (Segments & Stats)
- **Date**: 2026-07-16
- **Root Cause**: The frontend `customerService.ts` defined two functions: `getCustomerSegments` and `getCustomerStats` that were not actually registered in the backend Express router (`customerRoutes.js`).
  - Requesting `/customers/segments` matched the `/:customerId` route, executing `getCustomerDetails` with a parameter value of `"segments"`, resulting in a `404` error ("العميل غير موجود").
  - `stats` were already returned inline within the payload of `getCustomerDetails` rather than via a separate route.
- **Resolution**: Removed the dead `getCustomerSegments` and `getCustomerStats` methods and their associated types from `customerService.ts`. Since their functionality was either dead or already bundled in other requests, this cleans up code and removes confusing non-implemented endpoints.
- **Files Modified**:
  - `apps/frontend/src/services/customerService.ts`

### [BUG FIX / UI] Sidebar Layout Preference Reset & Company Override Mismatches
- **Date**: 2026-07-14
- **Root Cause**:
  1. The `syncUserLayout` mount handler in `SidebarSettingsContext.tsx` used the nullish coalescing operator (`serverLayout ?? prev.sidebarLayout`). When the user explicitly reset their custom sidebar layout to null (meaning "use company default"), the server stored `null` successfully. However, on subsequent page reloads, the local context evaluated `null ?? prev.sidebarLayout` to the stale cached localStorage value, causing it to override the server's null layout and persist the cached layout indefinitely.
  2. When the company admin updated the organization-level layout in `CompanySettings.tsx`, it did not clear the user's local layout override. Since `Layout.tsx` resolves layout as `userLayout || company.sidebarLayout`, the personal override masked the new company setting, making it appear stuck.
- **Resolution**:
  1. Updated `syncUserLayout` to check if `sidebarLayout` property is returned by the server (using `"sidebarLayout" in serverData`), and if so, overwriting localStorage and local state even if the value is explicitly `null`.
  2. In `CompanySettings.tsx`, injected `useSidebarSettings` context and updated the company layout change handler to call `setUserLayout(null)` to clear any active per-user override, forcing immediate adoption of the company's new layout default.
- **Files Modified**:
  - `apps/frontend/src/contexts/SidebarSettingsContext.tsx`
  - `apps/frontend/src/pages/settings/CompanySettings.tsx`

### [BUG FIX / CONFIG] Sidebar Feature Gating & Mobile Navigation Defects
- **Date**: 2026-07-14
- **Root Cause**: Two key bugs were identified in the sidebar configuration and mobile rendering:
  1. The `isFeatureEnabled` function in `sidebar.ts` ignored the passed `key` parameter and evaluated `currentCompany?.aiToolsEnabled === true` unconditionally, which broke custom feature flag validation rules.
  2. Mobile main navigation items (rendered via `NavLink`) did not trigger `toggleSidebar`, keeping the drawer open after selecting a page.
  3. Duplicate imports of `GiftIcon` and incorrect section headers caused redundant payload issues.
- **Resolution**:
  1. Fixed `isFeatureEnabled` in `sidebar.ts` by mapping the key parameter to a structured dictionary `FEATURE_FLAG_MAP`.
  2. Extracted `NavLink` to file scope and passed `toggleSidebar` in mobile mode.
  3. Cleaned up imports and section header comments.
- **Files Modified**:
  - `apps/frontend/src/config/sidebar.ts`
  - `apps/frontend/src/components/layout/sidebar/ClassicSidebar.tsx`

### [BUG FIX / PIPELINE] AI Agent Sandbox Active Skill Context Trace Loss
- **Date**: 2026-07-14
- **Root Cause**: The Sandbox interface contains visual logs, active skill badges, and trace boxes designed to display which modular skill (such as `catalog-search` or `booking_packages`) was used to generate each response. However, `active_skill_context` was defined on `PipelineContext` in the Python `ai-service` but never actually populated during execution inside `skills_pipeline.py`. As a result, the backend always returned `activeSkill: null`, causing the sandbox UI to hide the active skill badge on chat replies and leave the trace logs blank.
- **Resolution**: Updated `skills_pipeline.py` to identify the first executed skill tool call from `provider_response.tool_calls`, resolve its metadata from the registry, and assign its properties to `ctx.active_skill_context` at the beginning of the tool execution phase. Additionally, enhanced the frontend `ChatArea.tsx` to map the returned raw skill ID to its friendly localized `displayName` using the loaded agent skill profile details.
- **Files Modified**:
    - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
    - `apps/frontend/src/pages/admin/ai-agent-sandbox/AIAgentSandboxPage.tsx`
    - `apps/frontend/src/pages/admin/ai-agent-sandbox/components/ChatArea.tsx`

### [BUG FIX / TS COMPILATION] Facebook OAuth canReconnect Type Narrowing Error
- **Date**: 2026-07-14
- **Root Cause**: In `FacebookOAuth.tsx`, a redundant comparison `page.canReconnect === false` was checked inside a block already guarded by `page.canReconnect !== false`. Under strict TypeScript narrowing rules, this comparison was flagged as a type overlap error (TS2367) because `page.canReconnect` could not be `false` within that scope.
- **Resolution**: Simplified the check to `disabled={loading}` since `page.canReconnect` is already verified not to be false.
- **Files Modified**:
    - `apps/frontend/src/pages/settings/FacebookOAuth.tsx`

### [BUG FIX] WhatsApp Baileys Unsupported Wrapped Messages & Mock Test Errors
- **Date**: 2026-07-14
- **Root Cause**:
    1. **Wrapped Messages Ignored in Extraction**: Baileys wraps ephemeral messages, view-once media, and captioned documents in structures like `ephemeralMessage`, `viewOnceMessage`, `viewOnceMessageV2`, etc. The `extractMessageContent()` function did not recursively unwrap these containers, leading it to return `null` and skip them entirely, resulting in message loss during receiving.
    2. **Mock Missing `getSocketReadyState` in Tests**: The Jest test suite for message sending had a mock for `WhatsAppManager` that did not include `getSocketReadyState`. This caused tests to fail with `TypeError: WhatsAppManager.getSocketReadyState is not a function`.
- **Resolution**:
    1. **Unwrap Message Loops**: Added a nested wrapper unwrap loop at the start of `extractMessageContent` in `WhatsAppManager.js` to process viewOnce, ephemeral, and other wrapped messages recursively.
    2. **Enhanced Test Mocks**: Added `getSocketReadyState: jest.fn(() => 1)` to the `WhatsAppManager` mock in `WhatsAppMessageHandler.sendTextSession.test.js`.
- **Files Modified**:
    - `apps/backend/services/whatsapp/WhatsAppManager.js`
    - `apps/backend/tests/services/WhatsAppMessageHandler.sendTextSession.test.js`

### [BUG FIX] WhatsApp Dead Socket Recovery & Pre-Send Connection Validation
- **Date**: 2026-07-13
- **Root Cause**:
    1. **Lack of readyState verification**: The `isSendableBaileysSession()` validation checked only the memory session status and function presence but did not verify the WebSocket's `readyState` (which could be `0` (CONNECTING), `2` (CLOSING), or `3` (CLOSED)).
    2. **Bypassed validation**: Media sending and utility functions (such as `sendImage`, `sendButtons`, etc.) completely bypassed the readiness checks of `getSendableBaileysSession` and directly accessed `WhatsAppManager.getSession()`, missing any connection state checks.
- **Resolution**:
    1. **Public readyState utility**: Exported `getSocketReadyState` publicly from `WhatsAppManager.js` to allow external service modules to query connection states.
    2. **Integrated readyState checking**: Updated `isSendableBaileysSession()` and `getBaileysSessionReadinessReason()` in `WhatsAppMessageHandler.js` to query the socket's `readyState`. Any status other than `1` (OPEN) marks the session as unsendable.
    3. **Standardized session retrieval**: Refactored all media, list, catalog, template, and button-sending handlers in `WhatsAppMessageHandler.js` to fetch sessions through `getSendableBaileysSession()` rather than directly referencing the cache.
    4. **Automatic send retry**: Implemented active retry inside `sendText()`. If the first transmission attempt fails due to a dead socket, it catches the error, catches the error, calls `reconnectSession` with `forceRestart: true` to recreate the connection, waits for connectivity, and retries once.
- **Files Modified**:
    - `apps/backend/services/whatsapp/WhatsAppManager.js`
    - `apps/backend/services/whatsapp/WhatsAppMessageHandler.js`

### [BUG FIX] AI Service Self-Review Judge — Conversation History Context Loss
- **Date**: 2026-07-13
- **Root Cause**: The self-review judge model was operating without the context of prior messages in the conversation. While `ContextAssembler.fetch_message_history` correctly retrieved the thread history from the database inside `_llm_call` (`skills_pipeline.py`), the resulting messages array was only used as a local variable. It was never written to `ctx.messages`, leaving `ctx.messages` empty. When the downstream `validate_reply.py` stage extracted conversation context via `_extract_conversation_context(ctx)`, it found an empty list and passed `(لا يوجد تاريخ محادثة)` to the judge.
- **Resolution**: Added `ctx.messages = list(messages)` inside `_llm_call` in `skills_pipeline.py` right before the primary LLM call. This persists the compiled context (system instructions, message history, current user prompt) so that the downstream self-review judge and other components can access the full context.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [BUG FIX / ENHANCEMENT] AI Service Active Polishing Layer & Rate-Limitation Over-Strictness
- **Date**: 2026-07-12
- **Root Cause**:
  1. **Strict Gatekeeping**: The self-review judge model was too strict and treated natural human-like initiatives (e.g., offering cash payment and reimbursement invoices) as "hallucinations" because the exact words were missing from database tool outputs.
  2. **Persona Loss**: When a response was rejected, the rewriting model received only a factual correction prompt, causing it to abandon its warm, human receptionist persona (e.g., Shahd or Ahmed) and output dry, robotic text to "play it safe".
  3. **High Latency / Rate Limits**: Multiple consecutive LLM calls (generation -> review -> correction -> review) caused significant latency (up to 60s) and hit the Gemini free-tier rate limits (429 Resource Exhausted) on local environments.
- **Resolution**:
  1. Updated the judge prompt to distinguish between **harmful factual errors** (fake services, prices, dates) and **human-like common-sense initiatives** (reimbursement explanations, greetings, apologies).
  2. Overhauled the judge JSON schema to output `need_polish: true` and `polished_reply: "..."` when the reply is factually correct but too dry or robotic, or when it needs minor corrections.
  3. Integrated active polishing in `_self_review` to use the `polished_reply` directly instead of initiating an extra correction loop.
  4. Bounded latency by reducing `MAX_OUTPUT_RETRIES` from 2 to 1.
  5. Injected persona guidelines from `create-premium-human-agent` into `_correct_output` to ensure fallback rewrites preserve the receptionist identity.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`

### [BUG FIX] AI Service Self-Review Judge — Blind Context (Major Overhaul)
- **Date**: 2026-07-12
- **Root Cause**: The self-review judge model (`_self_review` in `validate_reply.py`) was operating in a near-total vacuum:
  1. **No system prompt**: The judge didn't receive the agent's instructions, persona, or soul — so it had no idea what the agent was supposed to do or how it should behave.
  2. **No conversation history**: Only the current user message and agent reply were passed — the judge couldn't understand context from prior turns (e.g., "أيوه عايز أحجز" without knowing what was discussed before).
  3. **No agent identity**: The judge didn't know if it was reviewing a medical center agent, an e-commerce agent, or a general assistant.
  4. **Truncated tool evidence**: Tool results were capped at 500 chars per value and 10 keys, causing data loss for rich tool outputs.
- **Resolution**:
  1. Added `_extract_agent_identity()` helper that extracts template_slug, channel, and the first 2000 chars of the system prompt.
  2. Added `_extract_conversation_context()` helper that extracts the last 5 conversation turns with role labels.
  3. Restructured the judge review prompt into a comprehensive rubric with 6 evaluation criteria and a bias toward approval (reject only on clear errors).
  4. Increased evidence limits: 500→1500 chars/value, 10→15 keys, 2000→3000 chars for non-dict results.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`

### [BUG FIX] AI Service Self-Review Context Loss & Over-Constraint
- **Date**: 2026-07-12
- **Root Cause**:
  1. In `apps/ai-service/src/pipeline/stages/validate_reply.py`, the `_correct_output` function (which rewrites assistant responses when they are rejected by the judge model) constructed a message history containing only the initial user message and the rejected reply, completely omitting the tool execution outputs. As a result, when the model attempted to rewrite the response, it lost all database context (such as services, pricing, branch names, and slot availability) and was forced to generate generic or guessed messages.
  2. In `apps/ai-service/src/guardrails/merchant_rules.py`, the `get_relevant_rules` fallback logic incorrectly returned the first 5 active rules from the database (`rules_data[:top_k]`) when no semantic or keyword matching was found. This flooded the system prompt with unrelated constraints on every single message (even simple greetings), causing the agent to act paranoid or ignore its core instructions.
- **Resolution**:
  1. Updated `_correct_output` to summarize the tool execution outputs and explicitly pass `evidence_text` to the correction prompt, ensuring the model retains full context during rewrites.
  2. Fixed `get_relevant_rules` fallback to return an empty list `[]` instead of `rules_data[:top_k]` when no matches are found, stopping prompt pollution.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`
  - `apps/ai-service/src/guardrails/merchant_rules.py`

### [BUG FIX] AI Service Follow-up Request Failure (400 Bad Request) on Modular Skills & Thinking Mode
- **Date**: 2026-07-12
- **Root Cause**: Two cascading issues occurred in follow-up completions requests after tool execution:
  1. The `_build_tool_dicts` function (which constructs the tools schemas sent with follow-up LLM calls) only loaded tools defined in `ctx.agent.allowed_tools` and completely ignored `ctx.agent.allowed_skills`. Consequently, when the model executed a modular skill, the follow-up request sent message history containing tool responses for tools not defined in the request's `tools` parameter list, resulting in a strict API validation failure (`HTTP 400 Bad Request`).
  2. Because the assistant message history contains DeepSeek-R1 reasoning content (`reasoning_content`), the DeepSeek API restricts subsequent turns to "Thinking mode", which rejects the `tool_choice: "auto"` parameter sent by default in follow-up calls, throwing a `Thinking mode does not support this tool_choice` error.
- **Resolution**:
  1. Updated `_build_tool_dicts` to match the exact tool loading logic used in the primary `_llm_call`, ensuring tools from both `allowed_skills` and `allowed_tools` are correctly compiled.
  2. Passed `tool_choice="none"` to the follow-up `_raw_llm_call`, allowing the client configuration to omit the `tools` and `tool_choice` parameters entirely for plain text generation, successfully satisfying the API requirements.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [BUG FIX] AI Agent Self-Review Life Cycle & Model Selector Mismatch
- **Date**: 2026-07-12
- **Root Cause**:
  1. **Backend (`self_review.py` API & `validate_reply.py` pipeline)**: There was a mismatch in referencing the Agent model primary identifier. The pipeline stages and self-review setup expected `Agent.agent_id`, but the correct SQLAlchemy field is `Agent.id`. This mismatch caused an `AttributeError` inside `set_review_model` and failed to query merchant guardrail rules correctly.
  2. **Pipeline Stage (`validate_reply.py`)**: The stage was relying on `json.loads` directly for the JSON-as-Judge verdict, which failed when the LLM returned JSON wrapped in Markdown backticks. Additionally, evidence logs were aggressively truncated, which caused vital tool context to be lost.
  3. **Frontend (`SuperAdminSelfReviewLogs.tsx`)**: The model selection dropdown for specific agent overrides used hardcoded static option values rather than dynamically querying the list of available models (`settingsData.available_models`) like global settings. Furthermore, pagination chevrons were reversed for LTR and RTL directions.
- **Resolution**:
  1. Updated `self_review.py` and `validate_reply.py` to correctly query and log agent properties using dynamic `getattr(ctx.agent, "id", None)` and `getattr(ctx.agent, "template_slug", None)` checks.
  2. Integrated `_try_parse_json_object` in `validate_reply.py` to parse LLM JSON responses with markdown tags cleanly.
  3. Increased evidence summarization limits to up to 10 dict keys, 500 characters per value, and 2000 characters for non-dict items.
  4. Dynamically mapped available model choices from the settings schema in the agent model override select list in the frontend.
  5. Corrected chevron arrow directions in the pagination control to respect Arabic RTL direction properly.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/self_review.py`
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`
  - `apps/frontend/src/pages/super-admin/SuperAdminSelfReviewLogs.tsx`

### [FEATURE] WhatsApp Direct Chat AI Correction Bridge (`/whatsapp/chat`)
- **Date**: 2026-07-12
- **Description**: The `/whatsapp/chat` page uses a completely different data pipeline (`whatsAppMessage` table + `whatsappController.getMessages`) than the `/whatsapp-inbox` page (unified `Message` table + `whatsappInboxService.getConversationDetail`). The correction endpoint requires unified `conversationId` + `message.id`, but the `/whatsapp/chat` workspace only has `whatsAppMessage.messageId` (a WhatsApp-native ID like `false_201xxx_3EBxxx`).
- **Architecture Notes**:
  1. Created a bridge endpoint `POST /api/whatsapp/messages/:whatsappMessageId/correct` in `whatsappController.js`.
  2. The bridge resolves: `whatsAppMessage.messageId` → customer phone from `remoteJid` → unified `Customer` → unified `Conversation` (channel='whatsapp') → unified `Message` (by content + 30s timestamp window) → delegates to `whatsappInboxService.correctMessage()`.
  3. Frontend `MessageBubble.tsx` (in `pages/whatsapp/components/`) now has self-contained correction state (no prop-drilling) with inline textarea editor.
- **Tricky Behaviors**:
  - The `whatsAppMessage` table and unified `Message` table are NOT linked by any foreign key. The bridge uses content + timestamp proximity matching (30s window) which is robust for production.
  - `whatsAppMessage.messageId` is the WhatsApp protocol message ID (unique), not the database row `id`.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js` — Added `correctAIMessage()` bridge function
  - `apps/backend/routes/whatsappRoutes.js` — Added `POST /messages/:whatsappMessageId/correct` route
  - `apps/frontend/src/pages/whatsapp/components/MessageBubble.tsx` — Added correction button + inline editor

### [BUG FIX] WhatsApp Baileys Zombie Session False-Positive Force Relink
- **Date**: 2026-07-14
- **Root Cause**: When a WhatsApp connection transitions to `open` (OPEN state), the system performed a strict check for "zombie sessions" (sessions where `registered` is false). However, during the initial pairing sequence or immediately after connection establishment, Baileys' `creds.registered` flag may not be updated to `true` yet, even though the connection is fully authenticated and has a valid `sock.user` mapping. This caused the system to falsely identify active sessions as zombies, wiping their auth credentials and forcing a relink, which disconnected the device immediately after pairing.
- **Resolution**: Updated the zombie session check in `WhatsAppManager.js` to verify that both `sd.creds.registered` is false AND `sock.user` is not defined (meaning there is no active user mapping). This ensures that successfully authenticated sessions are not wiped.
- **Files Modified**:
  - `apps/backend/services/whatsapp/WhatsAppManager.js`

### [BUG FIX] AI Correction Button Not Visible Across All Inbox Pages
- **Date**: 2026-07-12
- **Root Cause**: Three cascading issues prevented the "✏️ تصحيح الرد" button from appearing:
  1. **Backend (unifiedInboxController.js)**: The `sender` field returned `'agent'` for ALL outbound messages including AI-generated ones. The frontend condition checked for `sender === 'ai'` which never matched. Fixed by returning `'ai'` when `isAIResponse === true` or `senderId` is null.
  2. **Backend (agentInboxFacebookService.js)**: The `buildMessagePreview()` function did not include `senderId`, `metadata`, or `isAIResponse` in the serialized message object, so Facebook/Instagram inbox pages had no way to identify AI messages.
  3. **Frontend (useInboxConversations.ts)**: The shared inbox hook mapped `senderId` to `"unknown"` when the actual `senderId` was null (AI messages). The frontend condition `!message.senderId` evaluated to `false` for `"unknown"`. Fixed by mapping AI messages to `senderId: 'ai'` and adding explicit `isAIResponse` field.
- **Tricky Behaviors**:
  - Empty string `""` is falsy in JS but `"unknown"` is truthy — this caused a subtle mismatch between the fallback default and the display condition.
  - Messages without `senderId` AND without `metadata.isAIResponse` are treated as AI messages (conservative assumption: if no human sent it, it's AI).
- **Files Modified**:
  - `apps/backend/controller/unifiedInboxController.js` — Fixed `sender` and `isAIResponse` for both standard and WhatsApp message normalization
  - `apps/backend/services/agentInboxFacebookService.js` — Added `senderId`, `metadata`, `isAIResponse` to `buildMessagePreview()`
  - `apps/frontend/src/hooks/inbox/useInboxConversations.ts` — Fixed `senderId` mapping and added `isAIResponse`
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx` — Mapped `isAIResponse` in all 3 message parsing blocks
  - `apps/frontend/src/components/facebook-inbox/MessageBubble/MessageBubble.tsx` — Added `message.isAIResponse` to detection condition

### [FEATURE] Multi-Platform AI Correction (`correction_auto` Generalization)
- **Date**: 2026-07-12
- **Description**: Extended `correction_auto` from WhatsApp-only to all channels (Facebook, Instagram, Telegram, Unified Inbox).
- **Architecture Notes**:
  1. `correctMessage()` in `whatsappInboxService.js` was generalized with platform-specific delivery branches (`WHATSAPP`, `FACEBOOK`, `INSTAGRAM`, `TELEGRAM`), determined by `conversation.channel`.
  2. Facebook delivery resolves `pageAccessToken` via metadata → `getPageToken()` → `facebookPage` table fallback chain.
  3. Instagram delivery uses Graph API v22.0 with `instagramAccountId` from `facebookPage` table.
  4. Telegram delivery checks `metadata.isUserbot` to route between `TelegramUserbotService` and `TelegramBotService`.
  5. For non-WhatsApp channels, corrected messages are explicitly saved via `prisma.message.create()` since WhatsApp auto-saves via its webhook pipeline but other channels don't.
  6. Agent matching changed from hardcoded `'whatsapp'` to dynamic `conversation.channel` lookup.
- **Tricky Behaviors**:
  - `conversationAccessGuard` in `numberAccessGuard.js` works for non-WhatsApp conversations because it falls back to `conversation.assignedUserId` check when `sessionId` is missing.
  - `MessageBubble.tsx` (shared between Facebook and Instagram inbox) needed self-contained correction state to avoid prop-drilling editing state through parent components.
- **Files Modified**:
  - `apps/backend/services/whatsappInboxService.js` — Generalized `correctMessage` with multi-platform delivery
  - `apps/backend/routes/unifiedInboxRoutes.js` — Added unified correction route
  - `apps/frontend/src/pages/unified-inbox/UnifiedInbox.tsx` — Added inline correction UI
  - `apps/frontend/src/components/facebook-inbox/MessageBubble/MessageBubble.tsx` — Added self-contained correction UI
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx` — Added `onCorrect` prop
  - `apps/frontend/src/pages/instagram-inbox/InstagramInbox.tsx` — Added `onCorrect` prop

### [FEATURE] Inbox AI Message Auto-Correction (`correction_auto`) Integration
- **Date**: 2026-07-11
- **Description**: Implemented a live correction flow in the WhatsApp Inbox that allows supervisors to correct wrong AI-generated responses inline, automatically training the agent by creating a `correction_auto` guardrail rule.
- **Architecture Notes**:
  1. The service method `correctMessage` in `whatsappInboxService.js` resolves the customer's preceding question contextually, formats a structured feedback query, and POSTs it to the AI Service's guardrails endpoint with `source: 'correction_auto'`.
  2. Agent resolution is dynamic: it queries `/admin/agents?company_id=` and prefers the agent with `whatsapp` in its channels, falling back to any active agent.
  3. The corrected message is sent immediately to the customer via WhatsApp using `sendText()`, so the customer receives the right answer in real-time.
  4. Guardrail creation is non-blocking: if the AI Service is unreachable, the correction message is still sent to the customer (graceful degradation).
- **UI**: AI messages (identified as `!isFromCustomer && !senderId`) display a "تصحيح الرد" (Correct Response) button. Clicking it opens an inline textarea pre-filled with the original AI response, with "حفظ وتصحيح" (Save & Correct) and "إلغاء" (Cancel) actions.
- **Files Modified**:
  - `apps/backend/routes/whatsappInboxRoutes.js` — Added POST `/conversations/:conversationId/messages/:messageId/correct`
  - `apps/backend/controller/whatsappInboxController.js` — Added `correctMessage` handler
  - `apps/backend/services/whatsappInboxService.js` — Added `correctMessage` business logic
  - `apps/frontend/src/pages/whatsapp-inbox/WhatsAppChat.tsx` — Added inline correction UI with state management

### [FIX] Invisible Guardrails Rules Column due to Flexbox Collapsing & Sandbox Redundancy
- **Date**: 2026-07-11
- **Description**: Resolved a critical frontend layout issue in the "القواعد والتعلم" (Guardrails) tab where the Rules Management column collapsed to 0px (or 4px) width on desktop screens, leaving the tab looking completely empty except for the Sandbox card on the left.
- **Root Cause**: 
  1. The layout container `div` lacked a `w-full` class, causing the browser to collapse its width when layout children used flex-basis of 0% (`flex-1`).
  2. The Sandbox Playground column had `w-full lg:w-80` but lacked `lg:shrink-0`, causing the browser to expand it to the container's remaining width while shrinking the flexible Rules column to zero.
  3. The sandbox test area was redundant since there is a dedicated, fully featured "تجربة الوكلاء" (Agent Playground) page for testing agent behavior.
- **Resolution**:
  1. Removed the redundant Sandbox Playground column and its related states, handlers, and React hooks from `AgentGuardrailsTab.tsx`.
  2. Restructured the layout wrapper to use a single column that stretches to 100% width (`w-full flex-1`), allowing the guardrails table and creation form to occupy the full page width for clean, readable management.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/agent-profiles/AgentGuardrailsTab.tsx`

### [FIX] JSX Nesting and Tag Mismatch for AgentGuardrailsTab inside AgentProfilesPage
- **Date**: 2026-07-11
- **Description**: Resolved a critical rendering issue where the "القواعد والتعلم" (Guardrails) tab rendered completely blank and caused a subsequent Vite build crash (JSX tag mismatch / unterminated regex syntax error) during deployment.
- **Root Cause**: The `AgentGuardrailsTab` component was incorrectly nested *inside* the `tab === "settings"` conditional block, preventing it from mounting when the tab switched to `"guardrails"`. A quick attempt to restructure the layout caused mismatched `div` and Fragment tags, leading to a build failure.
- **Resolution**: Closed the settings conditional block and its wrapper `div` first, then placed the `AgentGuardrailsTab` block as a clean sibling under the React Fragment container. Properly balanced all HTML wrappers, conditional braces, and Fragments.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx`

### [FIX] Duplicate `/admin` Prefix in Guardrail FastAPI Endpoints
- **Date**: 2026-07-10
- **Description**: Resolved a 404 Not Found error when calling guardrail API routes (e.g. listing, creating, check-conflict, or update/delete rules) via the Express backend proxy.
- **Root Cause**: The FastAPI `admin_router` already has a prefix of `/admin` registered in `main.py` (`app.include_router(admin_router, prefix="/admin")`). Inside `guardrails.py`, the endpoints were decorated with `@router.get("/admin/agents/{agent_id}/guardrails")`, resulting in actual paths containing double `/admin` prefixes (`/admin/admin/agents/...`). The Express proxy and frontend expected `/admin/agents/...`, causing a mismatch and resulting in a 404 response.
- **Resolution**: Removed the redundant `/admin` prefix from all route decorators in `guardrails.py` so they are successfully mounted under `/admin/agents/...`.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/guardrails.py`

### [FIX] Merchant User 403 Forbidden Access to AI Admin Proxy
- **Date**: 2026-07-10
- **Description**: Resolved an access denied/403 Forbidden issue when merchant users (`OWNER` or `COMPANY_ADMIN` in the database) clicked the "القواعد والتعلم" (Guardrails) tab.
- **Root Cause**: The Express backend router `aiAdminProxyRoute.js` had a global `router.use(requireSuperAdmin)` middleware, which blocked any request that did not belong to a system-level Super Admin. Merchant users have company-specific administrative roles but do not hold system-wide roles, causing their requests to be denied.
- **Resolution**: Removed the global `requireSuperAdmin` middleware from `aiAdminProxyRoute.js` and replaced it with `allowMerchantOrSystemAdmin` which allows system-level admins OR merchant users holding `OWNER` or `COMPANY_ADMIN` role within a company to pass through to the proxy safely.
- **Files Modified**:
  - `apps/backend/routes/aiAdminProxyRoute.js`

### [FIX] Compiled System Prompt Observable Value Not Saved
- **Date**: 2026-07-10
- **Description**: The `compiled_system_prompt` field in chat/sandbox api response was empty/unpopulated in responses.
- **Root Cause**: In `skills_pipeline.py`, after calling `assembler.build_system_prompt(ctx)`, the resulting string was assigned to a local variable `enriched_prompt`, but it was never assigned back to `ctx.system_prompt`, leaving the final prompt empty in logs and response payloads.
- **Resolution**: Re-assigned `enriched_prompt` back to `ctx.system_prompt` to ensure the compiled value is saved and returned.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Guardrail Rules Not Persisted on Creation/Update
- **Date**: 2026-07-10
- **Description**: Guardrail rules added or modified by merchants did not persist in PostgreSQL.
- **Root Cause**: The FastAPI endpoints in `guardrails.py` created and modified SQLAlchemy model instances but forgot to execute `await session.commit()`.
- **Resolution**: Added explicit commits after database modifications.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/guardrails.py`

### [FIX] TS2367 Tab Literal Overlap Error in AgentProfilesPage
- **Date**: 2026-07-10
- **Description**: Resolved a TypeScript compilation error (`TS2367: This comparison appears to be unintentional because the types '"settings"' and '"guardrails"' have no overlap`) in the React frontend interface `AgentProfilesPage.tsx`.
- **Root Cause**: The TypeScript compiler failed to dynamically widen the custom `Tab` type enum or cached the old literal definition during comparison.
- **Resolution**: Cast the `tab` state variable to `string` (i.e. `(tab as string) === "guardrails"`) to bypass the strict compiler check safely.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx`

### [FIX] Landmark Image Auto-Population: Unwanted Branch Images Sent Unconditionally
- **Date**: 2026-07-10
- **Description**:
  1. Resolved an issue in the AI service pipeline (`skills_pipeline.py`) where branch landmark images (`landmarkImage`) were automatically and unconditionally appended to `response_attachments` and sent via WhatsApp/Facebook every time the `booking_info` tool was called.
  2. Modified the auto-population logic to check if the image URL/path or its filename is explicitly present in the agent's text response (`ctx.final_reply`).
  3. Added new unit tests `test_landmark_image_auto_populate_conditional_negative` and `test_landmark_image_auto_populate_conditional_positive` to prevent regressions.
- **Root Cause**: The pipeline unconditionally grabbed the `landmarkImage` from `booking_info` tool evidence whenever the tool was executed, bypassing the agent's actual decision/intent to show it.
- **Resolution**: Added a conditional guard checking for the image's presence in `ctx.final_reply` before auto-populating.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
  - `apps/ai-service/tests/pipeline/test_skills_pipeline.py`

### [FIX] WhatsApp Baileys Stability: Disconnection Loops, Credentials Wiping, and 48-Hour Number Bans
- **Date**: 2026-07-10
- **Description**:
  1. Resolved a major bug in the `isValidAuthState` validator where the credentials cache was completely wiped from the database if the session was reloaded during the pairing phase (`QR_PENDING` / `CONNECTING`). The validator now preserves the initial keys.
  2. Refactored disconnect recovery logic in `getDisconnectRecoveryDecision` to treat `403` (Forbidden/Rate Limit) and `Bad MAC` (Decryption failure) disconnects as transient errors instead of terminal logouts, preventing destructive session wipes.
  3. Added undefined check guards for `statusCode` in `getDisconnectRecoveryDecision` to prevent false positive logouts when both `statusCode` and `DisconnectReason` are undefined.
  4. Modified `scheduleReconnectSession` to retry indefinitely with a capped exponential backoff of 5 minutes (300,000 ms), preventing connections from giving up completely after 5 attempts.
  5. Upgraded `@whiskeysockets/baileys` package version to `6.7.23` (latest stable 6.x release) and updated the hardcoded fallback version to `[6, 7, 23]`.
- **Root Cause**: Over-aggressive session wiping on transient websocket status codes, strict initialization validation rejecting unpaired session keys, lack of undefined guards for status code comparisons, and a capped reconnect limit of 5 attempts.
- **Resolution**: Preserved keys for unpaired sessions, handled 403 and Bad MAC as reconnectable errors with exponential backoff, guarded undefined status codes, and enabled infinite reconnection attempts.
- **Files Modified**:
  - `apps/backend/package.json`
  - `apps/backend/services/whatsapp/DatabaseAuthState.js`
  - `apps/backend/services/whatsapp/WhatsAppManager.js`
  - `apps/backend/tests/services/WhatsAppManager.messageCapture.test.js`

### [FIX] Branch Modal Overflow, Custom Upload Container, Working Days Badges, Map URLs and Strict TypeScript Checks in Branches Management
- **Date**: 2026-07-10
- **Description**:
  1. Resolved modal height overflow on small viewports in `BranchModal.tsx` by introducing `max-h-[90vh] overflow-y-auto` scrolling container.
  2. Added `backdrop-blur-sm` overlay to the modal backdrop container for enhanced design aesthetics.
  3. Replaced standard browser-native file input with a custom, polished upload card designed specifically for Arabic layout (📸 + clickable choose button).
  4. Added `type="button"` attributes to dynamic sub-elements (phones list, day toggle tags) inside `BranchModal.tsx` to prevent accidental form submit actions.
  5. Implemented regex phone number validation (`/^[0-9+\-\s]+$/`) to reject arbitrary text inputs.
  6. Disabled gender-specific day buttons (men/women working days) unless those days are first selected as branch working days, adding a helpful explanation tooltip.
  7. Formatted branch working days list into compact, interactive circular badges (`س`, `ح`, `ن`, `ث`, `ر`, `خ`, `ج`) in both desktop table and mobile card views inside `BranchesTab.tsx` with detailed timing tooltips.
  8. Parsed geographic location links to display interactive `📍 فتح الخريطة` buttons opening in a new browser tab.
  9. Resolved strict TypeScript compile errors (`TS6133` unused variables, `TS4111` index signature dot-access, `TS2345` undefined params) in `BookingManagementPage.tsx`.
- **Root Cause**: Missing overflow configuration on container, primitive default HTML file inputs, form-submission side effects of standard button elements inside form layouts, loose phone input validation, and strict Vite/React compiler flags.
- **Resolution**: Implemented scrolling modals, custom file input widgets, type-safe validations, visual day badges, and converted object property dot access to bracket access for strict TypeScript compliance.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/booking/shared.ts`
  - `apps/frontend/src/pages/admin/booking/BranchModal.tsx`
  - `apps/frontend/src/pages/admin/booking/BranchesTab.tsx`
  - `apps/frontend/src/pages/admin/BookingManagementPage.tsx`

### [FIX] Modeless Undo Notification, Visual Time-Slot Grid, Scrolling Restore, Branch Filter Relocation, and Redundant Header/Tabs Removal in Appointments Booking
- **Date**: 2026-07-10
- **Description**:
  1. Replaced primitive browser-native `window.confirm` for status changes in [AppointmentsTab.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx) with a modern, non-blocking toast notification system (using `toast` from `sonner`) supporting a **تراجع (Undo)** action.
  2. Overhauled the time-slot picker in [AppointmentModal.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/booking/AppointmentModal.tsx) by replacing the standard HTML select dropdown with a premium visual grid of slot buttons. Disabled/unavailable slots are styled with a clean line-through and muted background, and selected/active slots are emphasized using brand styling.
  3. Redesigned the filters layout in [AppointmentsTab.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx) to be collapsible, wrapping secondary controls (status, dates) in an advanced filters drawer toggled via a brand button with active filters count.
  4. Moved the Branch filter dropdown next to the "تصفية متقدمة" button in the top filters row for quick access and improved appearance, removing the duplicate branch select from the advanced panel.
  5. Restored vertical scrolling on the booking management page by adding `h-full overflow-y-auto` to the outer layout container in [BookingManagementPage.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/BookingManagementPage.tsx), resolving viewport clipping caused by the parent layout shell's `overflow-hidden` configuration.
  6. Removed the redundant top page header ("إدارة النظام الطبي / نظام إدارة المواعيد والخدمات الطبية") and the duplicated page-level tabs list from [BookingManagementPage.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/BookingManagementPage.tsx) since the primary sidebar layout already includes separate sidebar navigation entries for each individual tab.
- **Root Cause**: Non-intuitive select list time picker, modal-blocking browser confirmations, a cluttered filters header layout, layout overflow constraints in the main shell wrapper, and layout redundancy.
- **Resolution**: Implemented collapsible advanced filters row, top-level branch selector, custom toast-based undo action, visual slot grid buttons, scrollable container height, and removed redundant tabs/header.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx`
  - `apps/frontend/src/pages/admin/booking/AppointmentModal.tsx`
  - `apps/frontend/src/pages/admin/BookingManagementPage.tsx`

### [FIX] AI Image Generator Layout Cramping, Dormant Aspect Preview, Mobile CTA Hiding, and UI De-nesting
- **Date**: 2026-07-09
- **Description**: The AI Image Generator page (`/admin/ai-image-generator`) had multiple layout, responsiveness, and control issues:
  1. The 5 configuration tabs were cramped inside a narrow 380px column, making fields difficult to read.
  2. The `AspectPreview` component was dormant and never rendered, leaving users without visual aspect ratio feedback.
  3. On mobile viewports, the stacked column order pushed the prompt editor and the primary "Generate" button to the very bottom, forcing excessive scrolling.
  4. The gallery cropped all generated images to squares, distorting 9:16 and 16:9 layouts.
  5. The interface had multiple nested bordered cards ("box-in-a-box" style), causing heavy visual load.
  6. The visual model selector dropdown conflicted with the backend agent-template policy, and the frontend allowedModels API request was redundant.
- **Root Cause**: Poor column balance, incomplete integration of preview components, nested Card wrappers, and redundant client-side model overrides.
- **Resolution**:
  - Re-architected the layout to a balanced `grid-cols-12`, making the configuration panel span 7 columns and the preview/actions panel span 5 columns (sticky on large screens).
  - Removed the hero banner (`SettingsPageHero`) and the outer white bordered shell (`SettingsPageShell`) to let the page breathe directly on the canvas background.
  - Eliminated the nested `Card` wrapper around "Core Product Information" to render form elements flat on the page canvas.
  - Redesigned `CollapsibleSection` into borderless, flat accordion sections separated by thin, clean dividers (`border-b border-slate-100`).
  - Replaced the boxed Presets container with flat, background-filled tags (Chips) that transition smoothly on hover.
  - Upgraded the preview and control panels on the left to floating glassmorphic panes (`backdrop-blur-md bg-white/70 dark:bg-slate-900/40`) with soft shadows.
  - Removed the AI Model Selector dropdown, corresponding state (`agentModel`, `allowedModels`), and `DEFAULT_MODELS`/`MODEL_DETAILS` constant maps, forcing the frontend to rely entirely on the backend agent template's model config.
  - Placed the gallery as a full-width section at the bottom, removed card borders from gallery items, added aspect ratio badge indicators, and implemented a "Clone Settings" feature that applies metadata back to the form state.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/AIImageGenerator.tsx`

### [FIX] AI Agent Model Override Ignored Due to Template Precedence
- **Date**: 2026-07-09
- **Description**: Configuring a custom AI model for a specific company's agent (e.g., via the "Companies" tab in the Super Admin Template page) had no effect, and the agent continued using the template's default model.
- **Root Cause**: In `apps/ai-service/src/services/agent_registry.py`, the helper `_resolve_agent_model` evaluated the template's default model policy first: `return template.model_policy.get("default") or db_agent.model`. Since the template almost always has a default model (e.g. `deepseek-v4-flash`), the custom override `db_agent.model` was never reached.
- **Resolution**: Flipped the resolution order so that `db_agent.model` takes precedence over `template.model_policy.get("default")`: `return db_agent.model or template.model_policy.get("default")`. Added a unit test to verify precedence.
- **Files Modified**:
  - `apps/ai-service/src/services/agent_registry.py`
  - `apps/ai-service/tests/unit/test_model_resolution.py`

### [FIX] WhatsApp Voice Note Truncated to 1-Second / Silent Message
- **Date**: 2026-07-08
- **Description**: Voice notes sent from the WhatsApp chat UI were delivered to customers as silent/empty messages with exactly a 1-second duration.
- **Root Cause**: Two issues:
  1. **Premature Track Stopping (Frontend)**: In `useAudioRecorder.ts`, the audio stream tracks were stopped immediately inside `stopRecording()` synchronously after calling `MediaRecorder.stop()`. This terminated the stream before the asynchronous MediaRecorder finished encoding and flushing the remaining audio buffers, resulting in empty/truncated recordings.
  2. **WebM Missing Duration Metadata (Backend)**: WebM audio files recorded by browser clients (like Chrome) do not write duration metadata, causing FFmpeg during Ogg/Opus conversion to incorrectly read or truncate the stream.
- **Resolution**:
  - Moved the `mediaStreamRef.current.getTracks().forEach(track => track.stop())` track closing logic from `stopRecording()` into the `recorder.onstop` and `recorder.onerror` event handlers, ensuring the stream is only terminated after encoding completes.
  - Added `-fflags +genpts` to FFmpeg execution in `WhatsAppMediaHandler.js` to regenerate presentation timestamps.
  - Added frontend and backend validations to reject audio payloads smaller than 500 bytes and disable sending when recording time is under 1 second.
- **Files Modified**:
  - `apps/frontend/src/hooks/useAudioRecorder.ts`
  - `apps/frontend/src/pages/whatsapp/components/AudioRecorder.tsx`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`

### [FIX] reportWebVitals Adblocker Crash Loop in Storefronts
- **Date**: 2026-07-07
- **Description**: Public storefronts (like `swan.maxp.online`) would load in an infinite refresh/redirect loop with query parameter `?__maxp_cache_recovery=...` and console errors like `TypeError: Cannot destructure property 'reportWebVitals' of 'undefined' as it is undefined` or `TypeError: Failed to fetch dynamically imported module`.
- **Root Cause**: In production, `main.tsx` dynamically imported `./utils/reportWebVitals` via `import("./utils/reportWebVitals")` to track Core Web Vitals. Because the chunk name contains the word "vitals", it gets blocked by adblockers (Safari content blockers, uBlock Origin, etc.). When blocked, the import throws a dynamic import fetch failure. The global error recovery handler (`chunk-recovery.js` / `vite:preloadError` listener) caught this failure, classified it as a critical Vite chunk load failure, and redirected the page with a cache-busting timestamp `?__maxp_cache_recovery=...` in an attempt to recover. Since the blocker kept blocking the URL on subsequent reloads, the page was trapped in an infinite reload loop.
- **Resolution**: Removed the unused performance monitoring dynamic import of `reportWebVitals` from `apps/frontend/src/main.tsx`. The performance reporter did nothing in production anyway since its actual logging/sending calls were commented out, making it safe to completely decommission.
- **Files Modified**:
  - `apps/frontend/src/main.tsx`

### [FIX] WhatsApp Voice Note 500 Error — Missing ffmpeg + Raw Mimetype in sendAudio
- **Date**: 2026-07-05
- **Description**: Voice notes sent from the WhatsApp chat UI returned HTTP 500 on production (`/whatsapp/messages/upload-send`).
- **Root Cause**: Two issues: (1) `ffmpeg` was not available on the server PATH, causing Baileys audio processing to fail silently. (2) The raw mimetype `audio/webm;codecs=opus` was passed through to `sendAudio` and Baileys' `sendMessage`, which doesn't handle parameterized mimetypes.
- **Resolution**:
  - Added `ffmpeg-static` npm dependency and injected its binary path into `process.env.PATH` at server startup in `server.js`.
  - Normalized mimetypes in `WhatsAppMediaHandler.uploadMedia()` and `WhatsAppMessageHandler.sendAudio()` by stripping `;` parameters.
  - Improved `upload-send` route error handling to forward `error.message` details, validate required params, and clean up temp files.
- **Files Modified**:
  - `apps/backend/server.js`
  - `apps/backend/package.json`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`
  - `apps/backend/services/whatsapp/WhatsAppMessageHandler.js`
  - `apps/backend/routes/whatsappRoutes.js`

### [FIX] GramJS Unhandled Rejection Alert Loop
- **Date**: 2026-07-05
- **Description**: The server was flooded with unhandled rejections and logged `[Sleeping for 13s on flood wait]` and `Failed to send alert`, causing massive log files (`err-1.log` reached ~1MB) and rate-limiting the Telegram alerting channel.
- **Root Cause**: An internal update parsing bug inside the `telegram` (GramJS) library triggers `Error: resolve() called for non-request instance` as an unhandled promise rejection. The global `unhandledRejection` handler catches it and triggers a Telegram alert. Sending this alert creates a new Telegram update, which GramJS receives and fails to parse, triggering another unhandled rejection. This creates an infinite feedback loop that spams the server and rate-limits the Telegram alerting channel.
- **Resolution**: Added `isGramJsResolveError` inside `apps/backend/utils/recoverableUnhandledRejection.js` to identify this specific internal GramJS parsing error. Updated `apps/backend/server.js` global `unhandledRejection` handlers to log it as a warning and bypass sending Telegram alerts for it.
- **Files Modified**:
  - `apps/backend/utils/recoverableUnhandledRejection.js`
  - `apps/backend/server.js`
  - `apps/backend/tests/utils/recoverableUnhandledRejection.test.js`

### [FIX] WhatsApp upload-send fileFilter Mimetype Rejection
- **Date**: 2026-07-05
- **Description**: Users uploading recorded audio or document files via the WhatsApp interface received `Error: نوع الملف غير مدعوم` (File type not supported) errors.
- **Root Cause**: Browsers (especially Safari or some mobile devices) or upload clients sometimes upload files with mimetypes like `audio/wav`, `audio/aac`, `audio/x-m4a`, or `application/octet-stream`. These mimetypes were not included in `MIME_TYPE_MAP` in `whatsappRoutes.js` and were rejected by Multer's `fileFilter` before reaching the route controller. Additionally, no debug logs were printed when a file was rejected, making it difficult to trace.
- **Resolution**:
  - Expanded `MIME_TYPE_MAP` in `apps/backend/routes/whatsappRoutes.js` and `extensions`/`SUPPORTED_TYPES` in `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` to support: `audio/wav`, `audio/x-wav`, `audio/wave`, `audio/x-pn-wav`, `audio/x-m4a`, `audio/aac`, `audio/x-aac`, `application/zip`, `application/x-zip-compressed`, `application/rar`, `application/x-rar-compressed`, and `application/octet-stream`.
  - Added warning log in Multer's `fileFilter` to print the file name and rejected mimetype.
- **Files Modified**:
  - `apps/backend/routes/whatsappRoutes.js`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`

### [FIX] WhatsApp Voice Note Upload Fails with Unsupported Mimetype Error (Codecs parameters)
- **Date**: 2026-07-05
- **Description**: Recorded voice notes failed to send on WhatsApp with `Error: نوع الملف غير مدعوم` (HTTP 500 error) on some browsers.
- **Root Cause**: Browsers recording audio in WhatsApp Chat UI send a WebM blob with mimetype formatted as `audio/webm;codecs=opus`. Because of the parameter trailing part `;codecs=opus`, simple string checks in `MIME_TYPE_MAP` and other validation helpers inside the backend were returning `undefined`, causing the upload to be rejected as an unsupported mimetype.
- **Resolution**: Updated `apps/backend/routes/whatsappRoutes.js` (Multer setup) and `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` (helpers `getMediaTypeFromMimetype`, `getExtension`, and `validateFile`) to split the mimetype by `;` and trim it before checking it. This extracts the clean base mimetype (e.g. `audio/webm`), resolving all validation failures.
- **Files Modified**:
  - `apps/backend/routes/whatsappRoutes.js`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`
  - `apps/backend/docs/whatsapp/whatsapp-voice-message-webm-fix-2026-07-05.md`

### [FIX] Prisma Schema P1012 - Missing Company Relations for Education Models
- **Date**: 2026-07-05
- **Description**: CI/CD `Deploy to Server` workflow failed with Prisma validation error P1012. The `EducationTeacherAvailability` and `EducationTeacherPayment` models defined `company Company @relation(...)` but the `Company` model in `core.prisma` was missing the reverse relation fields.
- **Root Cause**: The `feat(education)` commit added `EducationTeacherAvailability` and `EducationTeacherPayment` models with `companyId` foreign keys and `@relation` directives pointing to `Company`, but forgot to add the corresponding `[]` array fields on the `Company` model side. Prisma requires both sides of a relation to be declared.
- **Resolution**: Added `educationTeacherAvailability EducationTeacherAvailability[]` and `educationTeacherPayments EducationTeacherPayment[]` to the `Company` model in `core.prisma`.
- **Files Modified**:
  - `apps/backend/prisma/schema/core.prisma`

### [FIX] WhatsApp Meta Template Creation Returns 400 Error
- **Date**: 2026-07-04
- **Description**: Creating a new WhatsApp template via Meta Cloud API always returned `Request failed with status code 400`. Users could not create any templates from the MaxP dashboard.
- **Root Cause**:
    1. **Template name validation**: Users entered Arabic names or names with spaces/special characters (e.g., "طلب دفعه بقيمة $56"). Meta requires template names to contain only lowercase a-z, digits, and underscores.
    2. **Named variables rejected**: Header/body text used `{{name}}` instead of Meta's required numbered format `{{1}}`.
    3. **Invalid button URL**: Button URLs like `v.paypal.me/harfonline` lacked the required `https://` prefix.
    4. **Error swallowed by backend**: The controller caught Axios errors from Meta's API and returned a generic 500 error, hiding Meta's detailed error message that would have explained the exact problem.
- **Resolution**:
    1. **Backend**: Updated `whatsappMetaTemplateController.createMetaTemplate` to forward Meta's detailed error response (`error.response.data.error`) including `error_user_title`, `error_user_msg`, and Meta error codes, with the correct HTTP status code from Meta.
    2. **Frontend**: Added `sanitizeTemplateName()` that auto-converts user input to valid Meta format (lowercase, spaces→underscores, strips non-alphanumeric). Shows real-time preview of the sanitized name.
    3. **Frontend**: Added `hasNamedVariables()` validator that detects `{{name}}` patterns and warns users to use `{{1}}` instead.
    4. **Frontend**: Added `isValidButtonUrl()` that ensures URLs start with `https://`. Auto-prefixes `https://` if missing when submitting.
- **Files Modified**:
  - `apps/backend/controller/whatsappMetaTemplateController.js`
  - `apps/frontend/src/pages/whatsapp/WhatsAppMetaTemplates.tsx`

### [FIX] silentEscalationService MODULE_NOT_FOUND Database Client Crash
- **Date**: 2026-07-04
- **Description**: The Facebook AI auto-reply loop crashed and failed to execute silent human takeover escalation when an AI failure occurred, generating `Error: Cannot find module '../prisma/client'` in the logs.
- **Root Cause**:
  - In `apps/backend/services/silentEscalationService.js`, the database Prisma client was required as `require('../prisma/client')`. However, the shared database client wrapper for the backend is located in `sharedDatabase.js` inside the same services directory, and should be imported as `require('./sharedDatabase')`. The incorrect path triggered a `MODULE_NOT_FOUND` error and crashed the auto-reply worker.
- **Resolution**:
  - Updated the require statement in `apps/backend/services/silentEscalationService.js` to correctly point to `./sharedDatabase`.
- **Files Modified**:
  - `apps/backend/services/silentEscalationService.js`

### [FIX] AI Service Sandbox Empty Reply (SKILL.md & recentMessages Context Gaps)
- **Date**: 2026-07-04
- **Description**: AI Sandbox / chat pipeline returned empty replies and fell back to raw formatted tool results when searching for products that did not exist (e.g., "شنطة ظهر نايك"), or hung for 180 seconds due to API timeout errors.
- **Root Cause**:
  1. **Missing SKILL.md Block**: In `skills_pipeline.py`, the primary `_llm_call` successfully loaded the agent's skills block (`get_skills_block`) into the system prompt. However, the follow-up completion call `_build_followup_messages` only used `get_agent_instructions`, omitting the skills instructions. Because of this, the follow-up model had no instructions on how to handle empty tool results (such as suggesting alternative items).
  2. **Missing recentMessages**: The follow-up messages builder did not include the conversation history `recentMessages` in the chat context, passing only the current user message `ctx.message`. This caused the model to lose the conversational thread.
  3. **No Timeout in AsyncOpenAI**: The `AsyncOpenAI` client instantiation in `client.py` did not specify a `timeout` parameter, defaulting to 600 seconds, which caused requests to hang for up to 180 seconds until the backend gateway timeout intervened.
- **Resolution**:
  1. Updated `_build_followup_messages` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to fetch and inject the `skills_block` using `get_skills_block` if `ctx.agent.allowed_skills` is present.
  2. Updated `_build_followup_messages` to fetch `recentMessages` from `ctx.external_memory_context` and prepend the conversation history prior to the current user message.
  3. Configured `timeout=httpx.Timeout(60.0, connect=10.0)` in the `AsyncOpenAI` client initialization in `apps/ai-service/src/llm/client.py`.
  4. Updated unit tests in `tests/pipeline/test_skills_pipeline.py` and `tests/llm/test_gemma_client.py` to align with the new design behaviors (expecting empty text when tool calls exist, and empty formatting results).
  5. Resolved a multimodal vision context weakness in `_build_followup_messages` by replacing the plain string `ctx.message` with `build_user_content(ctx.message, ctx.attachments)` for the current user message, ensuring images/attachments are preserved for the follow-up LLM.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/tests/pipeline/test_skills_pipeline.py`
  - `apps/ai-service/tests/llm/test_gemma_client.py`

### [FIX] DeepSeek reasoning_content Stripped in OpenAI Messages Serialization (400 Bad Request)
- **Date**: 2026-07-04
- **Description**: The Sandbox and chat pipeline fell back to raw formatted tool results instead of returning the agent's natural friendly Arabic persona response.
- **Root Cause**:
  1. DeepSeek-R1 (or models using thinking/reasoning modes) return a `reasoning_content` field containing the reasoning steps in their choice response.
  2. The DeepSeek API requires that when continuing a conversation, any assistant message that contained reasoning steps MUST include `reasoning_content` when sent back to the API.
  3. However, `_normalize_openai_messages` in `client.py` stripped all custom attributes (including `reasoning_content` and `reasoning`), causing the follow-up completion call to fail with a `400 BadRequestError: 'reasoning_content' in the thinking mode must be passed back to the API`.
  4. This API failure caused the pipeline follow-up turn to fall back directly to `_format_tool_results` formatting, dumping a raw comma-separated list of items into the chat instead of Yasmine's Egyptian Arabic persona response.
- **Resolution**:
  1. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to preserve `reasoning_content` and `reasoning` keys in the serialized messages payload.
  2. Fixed an `ImportError` in `skills_pipeline.py` where `ALL_TOOLS` was incorrectly imported from `src.skills.integration` instead of `src.tools.registry`.
  3. Set `ctx.system_prompt` inside `skills_pipeline.py` to ensure it is returned in `compiled_system_prompt` in the sandbox logs for easy inspection.
  4. Mapped `compiled_system_prompt` from Python API response to `result.compiledSystemPrompt` inside `runSelectedAgentInPython` in `aiSandboxController.js` to ensure it displays correctly in the frontend.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
  - `apps/backend/controller/aiSandboxController.js`

### [FIX] Product Search (results key) & Single Product Mismatch in Skills Pipeline
- **Date**: 2026-07-04
- **Description**: AI agents (like Yasmine) returned dry, automated messages such as "لم يتم العثور على منتجات تطابق بحثك" or "لا توجد بيانات مخزون متاحة" even when search or inventory checks succeeded and found products.
- **Root Cause**:
  1. The `product_search` tool wrappers and declarative Skills map the low-level `"products"` results list to the key `"results"`.
  2. The pipeline's formatting helper `_format_tool_results` in `skills_pipeline.py` only looked for `"products"` or `"items"`. It defaulted to `[]` when `"results"` was present, completely bypassing formatting.
  3. Single product responses (like the dictionary returned by `inventory_check`) were also ignored since they lacked list wrappers.
- **Resolution**:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to check for `"results"`.
  2. Added support for single product responses (wrapped dynamically in a list if `"productName"` is present).
  3. Implemented robust formatting for other active skills (like `offers_list_active`, `coupon_validate`, `order_lookup`, etc.) to prevent dry fallback messages when they succeed.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] DeepSeek Tool Call dictionary Arguments & tool_choice="none" API Failures (400 Bad Request)
- **Date**: 2026-07-04
- **Description**: Follow-up chat completion calls with tool histories failed or returned empty text on DeepSeek-compatible models, forcing the pipeline to fall back to dry text results.
- **Root Cause**:
  1. DeepSeek and compatible OpenAI-like APIs require the `arguments` field in `tool_calls` (inside assistant messages) to be a JSON string.
  2. When the tool call history has dictionary-type arguments (common in runtime storage or history retrieval), passing them back in the chat context causes the API to fail with a validation/400 error.
  3. Additionally, passing the `tools` list when `tool_choice="none"` is enforced triggers API errors or empty completions on certain DeepSeek providers.
- **Resolution**:
  1. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to inspect tool call objects.
  2. If the `arguments` field is a Python `dict`, it is serialized to a JSON string using `json.dumps(..., ensure_ascii=False)`.
  3. Modified `_generate_openai_compat` to omit the `tools` and `tool_choice` parameters entirely if `tool_choice == "none"`, forcing the model to generate plain text naturally without any validation/format errors.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`

### [FIX] WhatsApp Inbox Permission Distribution Gap (Unauthorized Message Leak)
- **Date**: 2026-07-04
- **Description**: Moderators or agents who are not assigned to specific WhatsApp numbers could still view their messages, chats, and get real-time socket updates.
- **Root Cause**:
  1. The REST API `/whatsapp/conversations` retrieved all session IDs for the company without filtering them according to user-level access permissions.
  2. The `/whatsapp/conversations/:jid/messages` endpoint had no validation to verify if the requesting user has access to the target session.
  3. The Socket.IO real-time audience resolver returned only the assigned agent (or first routing agent) for unassigned chats. If that agent was offline or empty, the broadcast fell back to the company-wide channel (`company_${companyId}`), transmitting messages and updates to all online users.
- **Resolution**:
  1. Updated `getConversations` and `getMessages` inside `whatsappController.js` to filter and validate session IDs using the `getUserAccessibleSessionIds` helper for non-admin users.
  2. Overhauled `getConversationAudience` in `whatsappRealtimeAudienceService.js` to return all authorized users (admins, leaders, assigned agents, and all configured team members/routing agents).
  3. Set `fallbackToCompany` default to `false` in `emitToAudience` to prevent silent company-wide broadcast leaks of message events.
  4. Added Jest unit tests under `tests/services/whatsappRealtimeAudienceService.test.js` to verify audience isolation.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js`
  - `apps/backend/services/whatsappRealtimeAudienceService.js`
- **Files Added**:
  - `apps/backend/tests/services/whatsappRealtimeAudienceService.test.js`

### [FIX] category_list Tool Formatting Mismatch in Skills Pipeline
- **Date**: 2026-07-04
- **Description**: Asking the AI agent to list categories returned "لا توجد تصنيفات متاحة حالياً" (No categories available) even when categories were defined in the database.
- **Root Cause**:
  1. The `category_list` tool correctly fetched categories and returned a payload containing `{"found": true, "count": X, "categories": [...]}`.
  2. However, the `_format_tool_results` formatter in `skills_pipeline.py` only looked for `"products"` or `"items"` lists to display.
  3. When `categories` was returned, it found no products/items, and fell back to printing the default "no results available" or fallback message, masking the actual category list.
- **Resolution**:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to check for the presence of a `"categories"` array.
  2. If found, it formats and displays the names of the categories (e.g., category name) instead of falling back to the "no categories available" message.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Permissions Consistency Mismatch & Mismapped DOMAIN_PERMISSIONS (Sidebar collapse on refresh)
- **Date**: 2026-07-03
- **Description**: Users with custom permissions (such as `AGENT` accounts with specific roles like in `Harf Online`) would see a full sidebar initially on login, but the sidebar would collapse or lose sections like the inbox/Facebook/WhatsApp after a page refresh.
- **Root Cause**:
  1. **Permissions Load Mismatch**: The login (`/auth/login`) and switch company (`/auth/switch-company`) endpoints did not load the user's granular permissions from the database. Consequently, the user's `permissions` array was returned as `undefined`. On the frontend, this triggered the fallback check `user.permissions.length === 0`, causing the app to temporarily grant visibility to all sidebar sections. However, the session hydration endpoint (`/auth/me`) correctly queried the database for permissions, populating the `permissions` array on refresh and causing the sidebar to collapse to only match explicit permissions.
  2. **Typo in DOMAIN_PERMISSIONS**: The frontend's `sidebar.ts` mapped unified messaging sections to the permission key `conversations.view`. However, the database seeds and backend permissions only featured `inbox.view` (along with `inbox.view.own`, `inbox.view.team`, `inbox.view.all`, `inbox.send`). This typo prevented any user with database-defined inbox permissions from accessing the inbox sections once their permissions list was populated.
  3. **Mismatched company object**: On login, `user.company` returned the raw Prisma model (which did not have the company `role` attribute), causing a property mismatch with `/auth/me`.
- **Resolution**:
  1. Updated `/auth/login` and `/auth/switch-company` in `apps/backend/controller/authController.js` to load user permissions via `permissionService.getUserPermissions` and return them consistently in the JSON payloads.
  2. Overrode the `company` object returned in `/auth/login` and `/auth/switch-company` responses with the context-aware selected company (retrieved from `companiesMap`), ensuring it consistently includes the `role` and `activeApps` fields.
  3. Updated `DOMAIN_PERMISSIONS` in `apps/frontend/src/config/sidebar.ts` to map messaging sections to the database-canonical `inbox.view` (and its variants) instead of the legacy `conversations.view`.
  4. Added database-canonical finance permissions (`finance.invoices`, `finance.payments`) to the `'procurement'` section, and `notifications.view` to the `'notifications'` section in `DOMAIN_PERMISSIONS`.
- **Files Modified**:
  - `apps/backend/controller/authController.js`
  - `apps/frontend/src/config/sidebar.ts`

### [FIX] Company Role Resolution & Sidebar Disappearance on Page Refresh
- **Date**: 2026-07-03
- **Description**: Company accounts (like OWNER or COMPANY_ADMIN) would lose access to all sidebar items (showing only one or two basic sections) after a page refresh.
- **Root Cause**:
  1. During page refresh, `/auth/me` hydrates the user session. It correctly resolved the primary company's role key initially.
  2. However, it subsequently looped through all user-associated companies (`user.userCompanies`). When processing the currently active company, it unconditionally overwrote `currentActiveRole` with `uc.role`.
  3. `uc.role` is the default database enum column (which defaults to `AGENT`), while the custom role assignment is stored in `uc.roleRef?.key` (e.g. `OWNER`, `COMPANY_ADMIN`).
  4. This role downgrade to `AGENT` on the frontend caused the sidebar gating logic in `sidebar.ts` to strictly restrict access based on explicit permission lists instead of providing implicit admin/owner access, collapsing the sidebar.
- **Resolution**:
  1. Updated `/auth/login`, `/auth/me`, `/auth/companies`, and `/auth/switch-company` in `apps/backend/controller/authController.js` to select and include the `roleRef` relation inside `userCompanies`.
  2. Updated the active role and company list mapping logic to always prefer the custom role key (`uc.roleRef?.key || uc.role`) to preserve the correct administrative role context during page loads and company switches.
- **Files Modified**:
  - `apps/backend/controller/authController.js`

### [FIX] catalog-search Skill & Prompt Architecture Hardening
- **Date**: 2026-07-03
- **Description**: The `catalog-search` skill had a weak, single-line description, lacked trigger phrases, omitted visual search and advanced filters from its instructions, and the seeding script completely ignored `triggerPhrases` from `skill.json`, causing agent catalog lookup failures.
- **Root Cause**:
  1. The skill description (`"Find products and validate product facts."`) was too generic for 2026 LLM planning models to accurately select it under progressive disclosure protocols.
  2. The `SKILL.md` instruction file lacked documentation for advanced `product_search` parameters (`image_bytes`, `image_url`, `product_size`, `product_color`, `references_previous_product`), preventing the agent from utilizing them.
  3. No failure handling logic existed for cases with 0 search results, API timeouts, or low similarity scores.
  4. The python seeding script (`seed.py`) hardcoded `trigger_phrases=""`, ignoring filesystem definitions.
- **Resolution**:
  1. Rewrote `apps/ai-service/skills/catalog-search/skill.json` to feature a comprehensive, scenario-based description, added 20 localized trigger phrases, expanded allowed tools, and raised the max tool count to 6.
  2. Overhauled `SKILL.md` to document all parameters, added a complete decision tree, result formatting guidelines, and alternative recommendation loops.
  3. Added interactive few-shot chat transcripts in `examples/conversations.md`.
  4. Updated `seed.py` to parse `triggerPhrases` from `skill.json` and persist them as a comma-separated list to the database's `trigger_phrases` column.
  5. Refactored `integration.py` to load and cache `trigger_phrases` across DB and filesystem paths, and dynamically inject them into the system prompt's `<trigger_phrases>` XML block.
- **Files Modified**:
  - `apps/ai-service/skills/catalog-search/skill.json`
  - `apps/ai-service/skills/catalog-search/SKILL.md`
  - `apps/ai-service/skills/catalog-search/examples/conversations.md`
  - `apps/ai-service/src/skills/seed.py`
  - `apps/ai-service/src/skills/integration.py`

### [FIX] Vite Dynamic Chunk Load 404 Failure & Frontend Cache Inconsistency
- **Date**: 2026-07-03
- **Description**: Navigating between lazy-loaded routes (like Settings or Admin) after a production deployment resulted in a crash with `TypeError: Failed to fetch dynamically imported module`.
- **Root Cause**:
  1. The root `ErrorBoundary` (`LazyErrorBoundary` inside `AdminAppBootstrap.tsx`) was loaded lazily using `React.lazy`. When a new deployment deleted old hashed assets, attempts to load the error boundary itself failed with 404 errors, causing the application to crash completely without executing any recovery logic.
  2. The production Nginx configuration file `nginx_configs/maxp.online.conf` was missing cache-control header overrides for the main React Single Page Application (SPA) entrypoint. This allowed the browser or intermediate CDNs to cache `index.html`, making it request stale, deleted chunk names instead of the newly deployed ones.
- **Resolution**:
  1. Refactored `apps/frontend/src/bootstrap/AdminAppBootstrap.tsx` to statically import `ErrorBoundary` and removed the lazy `LazyErrorBoundary` wrapper, ensuring the error recovery system is always loaded and capable of catching module loading failures.
  2. Modified `nginx_configs/maxp.online.conf` to add explicit no-cache headers (`Cache-Control "no-cache, no-store, must-revalidate"`, `Pragma "no-cache"`, `Expires "0"`) to both the React frontend and wildcard storefront routing server blocks, matching `mokhtarelhenawy.online.conf`.
- **Files Modified**:
  - `apps/frontend/src/bootstrap/AdminAppBootstrap.tsx`
  - `nginx_configs/maxp.online.conf`

### [UI/UX] WhatsApp Inbox Double Scrolling & Mobile UX Alignment
- **Date**: 2026-07-03
- **Description**: Squeezed layouts on mobile, double scrolling caused by layout wrapper parent padding, and lack of mobile UX animations/safe-areas in `/whatsapp`.
- **Root Cause**:
  1. The main dashboard app shell layout has fixed container padding and overflow, causing double scrollbars on workspace panels.
  2. View switching between sidebar and conversation window was instant with no transitions.
  3. Rich tool actions squeezed on mobile screens, leading to button layout broken wrap.
- **Resolution**:
  1. Leveraged `:has()` CSS selector on `.app-shell-content` to dynamically eliminate wrapper padding.
  2. Added dedicated `whatsapp-responsive.css` file providing View Transitions API configurations, horizontal-scrolling filter flex containers, safe-area bottom buffers, and slide-up tools tray panels.
  3. Wrapped panel switches with React touch gestures and CSS-native transition triggers.
  4. Redesigned the absolute-positioned emoji picker to act as a full-width bottom sheet drawer on mobile viewports (< 640px) with touch-outside dismissal.
  5. Fixed hardcoded white backgrounds in `AudioRecorder.tsx` to use themed surface variables, enabling full dark mode styling support.
  6. Implemented touch swipe-to-action handlers (`Swipe-to-Archive`) on conversation items in `ChatSidebar.tsx` to mimic mobile app actions.
- **Files Modified**:
  - `apps/frontend/src/styles/index.css`
  - `apps/frontend/src/styles/whatsapp-responsive.css`
  - `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx`
  - `apps/frontend/src/pages/whatsapp/components/ChatSidebar.tsx`
  - `apps/frontend/src/pages/whatsapp/components/ChatWindow.tsx`
  - `apps/frontend/src/pages/whatsapp/components/MessageBubble.tsx`
  - `apps/frontend/src/pages/whatsapp/components/AudioRecorder.tsx`


### [FIX] WhatsApp Inbox Auto-Assignment & Reassignment Engine Hardening
- **Date**: 2026-07-03
- **Description**: The WhatsApp inbox suffered from auto-assignment inconsistency, infinite reassignment loops (ping-pong), high database overhead, and duplicate background tasks in cluster environments.
- **Root Cause**:
  1. Inbound messages synced via `WhatsAppSyncService` bypassed the advanced assignment engine and called a basic `resolveConversationAssignee` service, bypassing online checks, working hours, capacity constraints, and locking.
  2. The reassignment sweep calculated agent timeout using the customer's message timestamp rather than the agent's actual assignment timestamp (`lastAssignedAt`), causing newly assigned agents to instantly time out and trigger an infinite ping-pong loop between moderators.
  3. The sweep query fetched the top 100 open conversations across all companies indiscriminately without checking settings or tenant-level config, causing database scaling issues.
  4. The background interval scheduler ran concurrently on all PM2 cluster processes, causing duplicate reassignment sweeps and database lock contentions.
  5. In Round Robin and Shared Inbox modes, candidate pool building prioritized the number owner/assignedUser over `routingUserIds` (configured employees) when `assignedUserId` was populated, completely locking out employees from receiving chats.
- **Resolution**:
  1. Unified the incoming sync pipeline in `WhatsAppSyncService.js` to call `assignConversationToBestModerator` from the advanced `WhatsAppAssignmentEngineService`.
  2. Added a 5-minute cooldown period using `lastAssignedAt` in `evaluateConversationForReassignment` to stop the ping-pong loop.
  3. Adjusted response SLA timeouts to count from the `lastAssignedAt` timestamp instead of the customer's message timestamp if the agent was assigned after the message.
  4. Optimized the sweep query to fetch active company assignments, check their settings, and query only open conversations with pending customer messages, grouped by `companyId`.
  5. Implemented a session-level distributed advisory lock (`pg_try_advisory_lock`) in PostgreSQL to coordinate background sweeps across PM2 cluster instances safely.
  6. Added corresponding unit tests in `whatsappAssignmentEngineService.test.js` to prevent regressions.
  7. Corrected `_buildCandidatePool` in `whatsappAssignmentEngineService.js` to prioritize configured `routingUserIds` for Round Robin/Shared Inbox modes even if `assignedUser` exists.
- **Files Modified**:
  - `apps/backend/services/whatsapp/WhatsAppSyncService.js`
  - `apps/backend/services/whatsappAssignmentEngineService.js`
  - `apps/backend/tests/services/whatsappAssignmentEngineService.test.js`

### [FIX] AI Sandbox Empty Reply (`AI_SANDBOX_EMPTY_REPLY`)
- **Date**: 2026-07-02
- **Description**: The AI Agent Sandbox under `/admin/ai-hub?tab=sandbox` intermittently returned empty replies causing `AI_SANDBOX_EMPTY_REPLY` errors downstream.
- **Root Cause**: 
  1. An undefined variable `has_images` in `skills_pipeline.py` (referenced inside `_llm_call`) caused a `NameError` crash which was intercepted silently, returning an empty string reply fallback to the Node backend instead of forwarding the error code.
  2. The pipeline execution path for direct responses fell back to setting `ctx.final_reply` directly from `provider_response.text` without validation. If the LLM returned empty text after retries (e.g. during rate limits or cold-start timeouts), this empty string was returned to the Node backend, which registered it as an empty assistant response and triggered `AI_SANDBOX_EMPTY_REPLY`.
- **Resolution**:
  1. Defined the `has_images` flag properly using `bool(ctx.attachments)` in `_llm_call`.
  2. Implemented a robust Arabic fallback message ("عذراً، لم أتمكن من معالجة طلبك...") if the LLM fails to return any text response even after retries, avoiding empty string returns.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] DeepSeek DSML XML Tool Call Leak & Parsing Failures
- **Date**: 2026-07-02
- **Description**: DeepSeek V4 models generated XML-like DSML tool calling tags (e.g. `<DSML | | invoke name="inventory_check" | | >...`) inside plain text responses, which leaked to the customer in chat sessions instead of executing the tools.
- **Root Cause**: The python `_parse_dsml_tool_calls` parser in `LLMClient` assumed the content inside DeepSeek DSML tags was a JSON array, failing to match the native XML-like DSML tags outputted by DeepSeek V4 models. Additionally, the parser was only triggered when the provider was exactly `"DEEPSEEK"`, failing to intercept DSML output when DeepSeek models were invoked via other providers (like OpenRouter or SambaNova).
- **Resolution**:
  1. Updated the regexes in `apps/ai-service/src/llm/client.py` to correctly parse standard and spaced XML-like DSML invoke and parameter tags, extracting parameters and auto-detecting types.
  2. Maintained the legacy JSON-based DSML parser as a fallback.
  3. Expanded the trigger condition in `_generate_openai_compat` to check for DSML formatting when the model contains "deepseek" or when text explicitly contains DSML markup.
  4. Added unit tests covering spaced XML patterns, type conversions, and legacy fallbacks.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/tests/llm/test_deepseek_stabilization.py`

### [FIX] Broken Multimodal Image Pipeline for AI Agents (Raw Attachment Object Leak to LLM)
- **Date**: 2026-07-02
- **Description**: AI Agents were unable to recognize or see image attachments sent by customers. Even when using multimodal models (like Gemini 2.5 Flash), agents would reply "I cannot see the image" or ask the customer to describe it.
- **Root Cause**: In the primary LLM pipeline stage (`skills_pipeline.py`), the message assembler was appending raw attachment objects `list(ctx.attachments)` directly to the multipart user content instead of formatting them as OpenAI-compatible `image_url` parts using `build_user_content` from `src.context.multimodal`. This caused the LLM providers (Google, OpenAI) to ignore the invalid attachment payloads completely.
- **Resolution**: Refactored the user content assembly in `skills_pipeline.py` to import and call `build_user_content(ctx.message, ctx.attachments)` from `src.context.multimodal`, ensuring all images are correctly structured into standard `image_url` components before sending the request to the LLM client.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [IMPROVEMENT] Sales Rep V2 Agent Template — Structured Prompt Architecture
- **Date**: 2026-07-02
- **Description**: The original `sales-rep-agent` template had flat, unstructured prompts that caused the LLM to lose track of sales workflow steps during long conversations, forget critical rules (e.g., not inventing prices), and display raw technical error messages ("حصل عطل فني") to customers when tool calls failed.
- **Resolution**: Created `sales-rep-v2-agent` with a segmented prompt architecture inspired by the `agency-agents` open-source project (123k ⭐):
  1. **SOUL.md**: Added 6 structured sections — Identity & Vibe, Voice & Tone, Sales Workflow (5-step process), Critical Rules (Do's & Don'ts), Success Metrics, and Failure Protocol.
  2. **TOOLS.md**: Categorized tools by priority (🔴 Essential → 🟡 Supporting → 🟢 Learning) with explicit "when to use / when NOT to use" instructions per tool.
  3. **AGENTS.md**: Replaced flat rule list with structured Handoff Rules (when to escalate to support, human, or marketing agents).
- **Files Added**:
  - `apps/backend/agents/sales-rep-v2-agent/agent.json`
  - `apps/backend/agents/sales-rep-v2-agent/SOUL.md`
  - `apps/backend/agents/sales-rep-v2-agent/TOOLS.md`
  - `apps/backend/agents/sales-rep-v2-agent/AGENTS.md`

### [FIX] DeepSeek V4 Flash Function Calling Instability (XML/DSML Leak & JSON Parsing Failures)
- **Date**: 2026-07-01
- **Description**: DeepSeek V4 Flash model showed tool-calling instability, sometimes outputting native XML tags (`<｜DSML｜tool_calls>`) inside text blocks, omitting parameters, or failing to match the expected JSON schema.
- **Root Cause**:
  1. **Lax Tool Schemas**: Without strict schema constraints (`strict: true`), the model's token distribution drifted into raw text/DSML tags.
  2. **Chat History Mismatch**: The model requires its thinking tokens (`reasoning_content`) to be passed back in subsequent history turns. If dropped, it loses context and defaults to native DSML formatting.
- **Resolution**:
  1. Modified `LLMClient` to automatically inject `"strict": true` into function definitions for OpenAI and DeepSeek providers.
  2. Captured `reasoning_content` from OpenAI-compatible chat responses.
  3. Modified `skills_pipeline.py` to preserve and forward `reasoning_content` in the assistant role history during follow-up tool execution turns.
  4. Added explicit negative constraints to the fallback system prompt forbidding XML/DSML leakage.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] WhatsApp Session Dropdown Displayed Raw CUID for Meta Cloud
- **Date**: 2026-06-30
- **Description**: The WhatsApp Session dropdown in the template broadcast page displayed the raw database CUID instead of the friendly name or phone number for Meta Cloud sessions.
- **Root Cause**:
  1. For Meta Cloud sessions, the phone number is stored in `metaDisplayPhoneNumber` instead of `phoneNumber` (which is `null`).
  2. The dropdown used `{s.name || s.phoneNumber || s.id}` to display the session label. When `name` was missing/empty or matched the CUID itself, and `phoneNumber` was `null`, it fell back to the CUID `id`.
- **Resolution**:
  1. Updated the `Session` interface in the frontend page to include `provider` and `metaDisplayPhoneNumber`.
  2. Modified the dropdown rendering logic to detect if the session's name is a CUID (or matches the session ID), and display `metaDisplayPhoneNumber` or `phoneNumber` as the primary fallback before displaying the raw ID.
- **Files Modified**:
  - `apps/frontend/src/pages/whatsapp/WhatsAppTemplateBroadcast.tsx`

### [FIX] Broken translations on Project Break-Even page
- **Date**: 2026-06-30
- **Description**: Translation keys like `projectBreakEven.title` were displayed raw on the page instead of their Arabic/English translations.
- **Root Cause**:
  1. The page-level translation keys for `projectBreakEven` were manually added directly in `translation.json` files but were missing from the `sections/` directory.
  2. The `merge-translations.js` script (which runs on build/dev) automatically overwrites `translation.json` with the combined content of the JSON files in `sections/`. Consequently, the manual edits were overwritten, causing translation loading to fail.
- **Resolution**:
  1. Created dedicated translation files `apps/frontend/src/locales/ar/sections/projectBreakEven.json` and `apps/frontend/src/locales/en/sections/projectBreakEven.json` containing the translation keys.
  2. Ran the merge script to safely regenerate `translation.json` files with `projectBreakEven` as a root-level key.
- **Files Modified**:
  - `apps/frontend/src/locales/ar/sections/projectBreakEven.json`
  - `apps/frontend/src/locales/en/sections/projectBreakEven.json`

### [FIX] WhatsApp Inbox Displaying Unassigned/Inactive Sessions for Admins
- **Date**: 2026-07-01
- **Description**: The WhatsApp inbox page (`/whatsapp-inbox`) displayed unconfigured, draft, or disconnected sessions for admin roles, which differed from the settings page (which only showed configured assignments).
- **Root Cause**:
  1. For admin roles, the `getUserAccessibleSessionIds` helper in `numberAccessGuard.js` was querying all `whatsAppSession` records directly from the DB, bypassing `whatsAppNumberAssignment` entirely.
  2. For `Harf Online`, this resulted in all 8 sessions (like `ww`, `22`, `Sales S5`, etc.) showing up in the inbox sidebar, even though only 2 (`Harf ACC` and `SalesApiss`) were active in the settings.
  3. Furthermore, `NumberSidebar.tsx` was vulnerable to a frontend TypeError crash during search if a session's `phoneNumber` was `null` (which was true for 7 of Harf's sessions).
- **Resolution**:
  1. Modified `getUserAccessibleSessionIds` in `apps/backend/middleware/numberAccessGuard.js` to ensure even admin users only retrieve sessions linked to an active assignment (`isActive: true` on `whatsAppNumberAssignment`).
  2. Updated `apps/frontend/src/pages/whatsapp-inbox/components/NumberSidebar.tsx` to handle `null` phone numbers safely by adding an empty string fallback before invoking `toLowerCase()`.
- **Files Modified**:
  - `apps/backend/middleware/numberAccessGuard.js`
  - `apps/frontend/src/pages/whatsapp-inbox/components/NumberSidebar.tsx`

### [FIX] Meta Cloud WhatsApp Session showing Disconnected in Routing Workspace
- **Date**: 2026-07-01
- **Description**: Meta Cloud API sessions (like `SalesApiss`) were shown as CONNECTED on the Settings page but as DISCONNECTED in the Routing Workspace page.
- **Root Cause**:
  1. Meta Cloud sessions are webhook-based and are not managed in the in-memory Baileys `activeSessions` map.
  2. The `getRoutingWorkspace` query in `numberAssignmentService.js` was falling back to the database status for any session not in `activeSessions`, resulting in `DISCONNECTED` for `SalesApiss`.
  3. The main WhatsApp Settings page resolves any `META_CLOUD` provider session to `connected` as it doesn't rely on web socket uptime.
- **Resolution**:
  1. Updated `getRoutingWorkspace` in `apps/backend/services/numberAssignmentService.js` to explicitly resolve `META_CLOUD` sessions as `CONNECTED`.
- **Files Modified**:
  - `apps/backend/services/numberAssignmentService.js`

### [FIX] Soft-deleted WhatsApp Sessions Showing in Routing Workspace
- **Date**: 2026-07-01
- **Description**: Drafts or soft-deleted sessions (where `isDeleted: true` is in metadata) were showing up in the Routing Workspace page, whereas they were correctly hidden on the main WhatsApp Settings page.
- **Root Cause**:
  1. The Settings page API filters out sessions with `isDeleted: true` in their metadata.
  2. The `getRoutingWorkspace` service query did not query or filter based on metadata, showing all 8 historical sessions (including drafts/deleted ones like `ww`, `22`, `Sales S5`, `sss`, `sales api`, `SalesApi`).
- **Resolution**:
  1. Updated `getRoutingWorkspace` in `apps/backend/services/numberAssignmentService.js` to query `metadata` and filter out sessions with `isDeleted: true`.
- **Files Modified**:
  - `apps/backend/services/numberAssignmentService.js`

### [FIX] WhatsApp Session Dropdown showing CUID ID instead of Friendly Name
- **Date**: 2026-07-01
- **Description**: The WhatsApp Workspace select dropdown trigger rendered the raw CUID ID instead of the friendly name after choosing a session.
- **Root Cause**:
  1. Headless Select from `@base-ui/react` relies on mounted item text registrations to translate values to labels. Because the list is unmounted when closed and sessions load asynchronously, the trigger fallback displayed the raw ID.
- **Resolution**:
  1. Replaced the `SelectValue` component in `ChatSidebar.tsx` with a custom `span` that manually resolves the selected ID to `session.name` from the `sessionOptions` list.
- **Files Modified**:
  - `apps/frontend/src/pages/whatsapp/components/ChatSidebar.tsx`

### [FIX] WhatsApp Workspace session list did not restrict access for moderators
- **Date**: 2026-07-01
- **Description**: Employees/moderators could see and select all WhatsApp sessions of the company in the `/whatsapp` dropdown menu, bypassing routing restrictions.
- **Root Cause**:
  1. The `/api/v1/whatsapp/sessions` endpoint returned all sessions for the company without verifying active number assignments for the authenticated user.
- **Resolution**:
  1. Updated `getSessions` in `apps/backend/controller/whatsappController.js` to filter the returned sessions using `getUserAccessibleSessionIds` for non-admin roles.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js`

### [FIX] Facebook Inbox layout squeezed on tablet and narrow viewports
- **Date**: 2026-07-01
- **Description**: The Facebook Inbox chat header actions overflowed and wrapped in a squeezed layout on tablets (e.g. iPad) and on desktop screens when the customer details panel was open.
- **Root Cause**:
  1. The chat header rendered all 8 action buttons inline when not on mobile, regardless of the actual space available.
  2. In narrow viewports (like tablet or when the profile panel is open on desktop), the chat window column gets squeezed to less than 500px, causing the 8 action buttons in the header to wrap, overlap, and collide with the customer name/identity.
- **Resolution**:
  1. Introduced `showDesktopMoreMenu` state variable to toggle a secondary actions dropdown.
  2. Defined `shouldCollapseActions = !isWideDesktop || showPinnedContextPanel` to identify when the viewport or column space is constrained.
  3. When space is constrained, we collapse the secondary actions (Quick Order, Snooze, Copy Link, Notes, Delete) into a clean "More Actions" dropdown menu using the existing `MoreHorizontal` icon and custom classes (`business-dropdown-surface`, `business-dropdown-option`), while keeping critical actions inline (Mark as Done, Star/Priority, Profile Toggle).
- **Files Modified**:
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx`

### [FIX] Sequential Execution Latency in Skills Pipeline
- **Date**: 2026-07-01
- **Description**: The agent was executing multiple tool calls sequentially, leading to high latency when multiple tools were invoked.
- **Root Cause**: The tool execution loop in `skills_pipeline.py` iterated and ran `await skill.execute` sequentially.
- **Resolution**: Refactored the loop to execute tool calls concurrently using `asyncio.gather`.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Missing Tool Arguments JSON Parsing Failure in Skills Pipeline
- **Date**: 2026-07-01
- **Description**: If the LLM generated invalid JSON arguments, the system fell back to empty arguments `{}`, causing the tools to run with incomplete inputs.
- **Root Cause**: A try-except block caught the JSONDecodeError and silenced it by setting `arguments = {}`.
- **Resolution**: Implemented a self-correction mechanism that catches `parse_error`, informs the LLM of the syntax error, and retries the tool execution with corrected parameters.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Output Contract Validation Bypass in validate_reply
- **Date**: 2026-07-01
- **Description**: If the final response failed validation against the `AgentResponse` Pydantic model (or failed JSON parsing), the unvalidated raw text was returned to the user, bypassing the contract safety.
- **Root Cause**: The except block in `validate_reply.py` fell back to `ctx.final_reply = reply`.
- **Resolution**: Integrated Pydantic and JSON validation check within the main retry loop of `validate_reply.py`. Implemented an LLM self-correction reflection loop (`_correct_validation_error`) that catches the validation/parsing errors, sends them back to the LLM with the target schema description, and retries generation up to 2 times, returning a clean fallback message only on final exhaustion.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`

### [FIX] Rigid Guardrail Output Blocking
- **Date**: 2026-07-01
- **Description**: When output guardrails were violated, the conversation was immediately blocked, causing a poor user experience.
- **Root Cause**: An immediate early return with status `GUARDRAIL_BLOCKED` occurred upon any violation.
- **Resolution**: Implemented a self-correction reflection loop that retries up to 2 times, prompt-injecting the violation details to let the LLM rephrase its answer safely.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`

### [FIX] AI Fallback Error Message Leakage & Lack of Takeover (Silent Escalation)
- **Date**: 2026-07-01
- **Description**: When output validation, guardrails, or LLM execution failed completely, the system either sent a static Arabic error message to the customer (revealing it is an AI) or left the customer hanging without escalating to a human moderator.
- **Root Cause**: Hardcoded fallback error messages in `validate_reply.py` and lack of human takeover routing on failure.
- **Resolution**: 
  1. Updated Python pipeline context and stages to suppress fallback text and return `status="escalated"` with `reply=None` and `escalation` metadata.
  2. Created a Node.js `silentEscalationService` that logs silent escalation events in `ActivityLog` and emits `ai:escalation` Socket.IO events to the company workspace room.
  3. Integrated escalation checks into all 5 channel handlers (WhatsAppInboundService, WhatsAppManager, TelegramBotService, Facebook auto-reply, Instagram auto-reply) to intercept failures, trigger human takeover, and prevent messages from sending to the customer.
- **Files Modified**:
  - `apps/ai-service/src/contracts/response_schema.py`
  - `apps/ai-service/src/pipeline/context.py`
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`
  - `apps/ai-service/src/workflows/orchestration_flow.py`
  - `apps/ai-service/src/api/chat.py`
  - `apps/ai-service/tests/unit/test_phase4.py`
  - `apps/backend/services/silentEscalationService.js` [NEW]
  - `apps/backend/services/whatsapp/WhatsAppInboundService.js`
  - `apps/backend/services/whatsapp/WhatsAppManager.js`
  - `apps/backend/services/TelegramBotService.js`
  - `apps/backend/utils/allFunctions.js`

### [FIX/IMPROVEMENT] Ready Agent Profiles Gaps Resolution & Merchant Editing Constraints
- **Date**: 2026-07-02
- **Description**: Gaps identified between the Super Admin agent profiles management and the merchant agent creation flow. Super admins could not set advanced SOUL configurations (welcome messages, language, escalation policies, custom instructions) for ready-to-use agents, nor could they define editing locks (read-only restrictions) to preserve core business logic for merchant agents.
- **Root Cause**:
  1. The Super Admin `ReadyProfile` schema in both frontend and backend lacked fields for locks (`lockIdentity`, `lockPersona`, `lockRules`, `lockCustomPrompt`) and advanced soul fields (`welcome`, `language`, `escalation`, `customPrompt`).
  2. The Merchant `AgentProfilesPage` did not enforce these locks at the input field level, allowing merchants to edit restricted settings.
  3. No seeding script existed to initialize DB settings for these ready agents upon clean setup.
- **Resolution**:
  1. Modified `apps/backend/routes/superAdminRoutes.js` (POST handler) to capture and save locks.
  2. Modified `apps/frontend/src/pages/super-admin/SuperAdminAgentProfiles.tsx` to add toggles for locks and inputs for advanced soul fields under personalities.
  3. Modified `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx` to pass locks/soul fields during quick-create and apply read-only locks to edit form inputs with visual lock indicators.
  4. Created a DB seeding script `apps/backend/prisma/seed-quick-profiles.js` to pre-populate default agent profiles (including sales-rep-v2-agent) and their default lock profiles.
  - `apps/backend/prisma/seed-quick-profiles.js` [NEW]

### [FIX/IMPROVEMENT] Automatic Default Agent Provisioning & Super Admin UX Hardening
- **Date**: 2026-07-02
- **Description**: Merchants had to manually spawn ready agents from the templates page upon subscription. Also, the Super Admin profiles form lacked input validation for personalities (allowing empty configs), supported incomplete channel options, had manual slug creation, and lacked a clone feature for existing agents.
- **Root Cause**:
  1. Subscription activation controllers (`platformSubscriptionController.js` and `marketplaceController.js`) only spawned a single `support-agent` instance, leaving the rest of the ready agents unprovisioned.
  2. The Super Admin page lacked validation rules on nested personality fields, missed channels (`instagram`, `telegram`, `web`), and had a small/crowded layout container.
- **Resolution**:
  1. Created `spawnReadyAgentsService.js` to read all active ready profiles from database, auto-generate their default configs, and deploy (spawn + configure) them automatically on subscription.
  2. Integrated `spawnAllReadyAgents` helper in subscription activation routes.
  3. Added personality validations in Super Admin form, synced missing channels, enlarged form container to `3xl`, auto-generated slugs from English titles, and implemented a **Clone** button to duplicate profiles.
- **Files Modified/Added**:
  - `apps/backend/services/spawnReadyAgentsService.js` [NEW]
  - `apps/backend/controller/platformSubscriptionController.js`
  - `apps/backend/controller/marketplaceController.js`
  - `apps/frontend/src/pages/super-admin/SuperAdminAgentProfiles.tsx`

### [FIX] WhatsApp Voice Message Sending Failure & Mimetype Rejection
- **Date**: 2026-07-05
- **Description**: Recorded voice messages (voice notes) in WhatsApp chat interface failed to send, triggering the toast error "فشل إرسال الرسالة الصوتية".
- **Root Cause**:
  1. The browser records voice messages as `.webm` files and uploads them with `audio/webm` or `video/webm` mimetypes.
  2. The Multer file upload filter in `apps/backend/routes/whatsappRoutes.js` rejected these mimetypes because they were missing from the supported `MIME_TYPE_MAP`. This caused the request to fail immediately with an upload error before reaching the route controller.
  3. When an audio file was uploaded, the controller called `WhatsAppMessageHandler.sendAudio` without passing the `{ ptt: true }` option, meaning it was treated as a standard audio file attachment instead of a playable WhatsApp voice note.
- **Resolution**:
  1. Added `audio/webm` and `video/webm` mimetypes to `MIME_TYPE_MAP` in `apps/backend/routes/whatsappRoutes.js` and `SUPPORTED_TYPES` / `getExtension` in `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`.
  2. Updated the frontend `onVoiceNoteSend` handler in `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx` to append `ptt: 'true'` explicitly to the `FormData` payload.
  3. Updated the backend router in `whatsappRoutes.js` to extract `ptt` from `req.body` and check if the original file name is `voice_note.webm` to override the media type classification to `'audio'` and pass `{ ptt: isVoiceNote }` to `sendAudio` execution.
- **Files Modified**:
  - `apps/backend/routes/whatsappRoutes.js`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`
  - `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx`

### [REFACTOR/ARCHITECTURAL] AI Agent Templates Unification (Template-as-Agent)
- **Date**: 2026-07-05
- **Description**: Simplified AI agent management by removing the redundant "Agent Profiles" (`/super-admin/agent-profiles`) and "Ready Profiles" systems, unifying everything under "AI Templates".
- **Root Cause**: Spawned agent profiles copied entire configurations from templates into DB rows, which made maintenance complex and caused configuration synchronization issues.
- **Resolution**:
  1. Removed `SuperAdminAgentProfiles` navigation link, route, and file.
  2. Removed legacy quick-profiles/ready-profiles endpoints from backend (`superAdminRoutes.js` and `agentManagerRoutes.js`).
  3. Cleaned up/deleted legacy seeding scripts (`seed-quick-profiles.js` and `.github/workflows/seed-quick-profiles.yml`).
  4. Decommissioned `spawnReadyAgentsService.js` (deleted).
  5. Refactored the merchant's `AgentProfilesPage.tsx` to directly open the custom agent template creation dialog (creating overriding records in `agents` table mapped to `AgentTemplate` slugs), and updated the empty state UI to show a clean CTA.
- **Files Modified/Deleted**:
  - `apps/frontend/src/components/layout/SuperAdminSidebar.tsx` [MODIFY]
  - `apps/frontend/src/App.tsx` [MODIFY]
  - `apps/frontend/src/pages/super-admin/SuperAdminAgentProfiles.tsx` [DELETE]
  - `apps/backend/routes/superAdminRoutes.js` [MODIFY]
  - `apps/backend/routes/agentManagerRoutes.js` [MODIFY]
  - `apps/backend/services/spawnReadyAgentsService.js` [DELETE]
  - `apps/backend/prisma/seed-quick-profiles.js` [DELETE]
  - `.github/workflows/seed-quick-profiles.yml` [DELETE]
  - `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx` [MODIFY]

### [FIX] Missing FastAPI session.commit() in Guardrail Operations & Prompt Logging
- **Date**: 2026-03-09
- **Description**: Guardrail rules created, updated, or deactivated via the FastAPI admin endpoints were not persisted to the database and rolled back upon session closure. Also, the compiled system prompt returned in sandbox API responses and logs was empty/unpopulated with the assembled sections.
- **Root Cause**:
  1. The DB session was flushed via `session.flush()` inside the repository but was never committed via `await session.commit()` in the FastAPI endpoints inside `guardrails.py`.
  2. The assembled `enriched_prompt` was not assigned back to `ctx.system_prompt` inside `skills_pipeline.py`, leaving the context system prompt unpopulated.
- **Resolution**:
  1. Added `await session.commit()` calls before invalidating Redis cache inside create, update, and delete endpoints in `apps/ai-service/src/api/admin/guardrails.py`.
  2. Assigned `enriched_prompt` to `ctx.system_prompt` inside `_llm_call` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py`.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/guardrails.py`
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Facebook Inbox Space Waste & Mobile Layout Clutter
- **Date**: 2026-07-13
- **Description**: The Facebook Inbox page was suffering from severe space waste on medium screens (squeezing the active conversation window), and the drawer/overlays (notes and customer profile) cluttered small mobile screens by stretching to 100% width, blocking visibility and navigation.
- **Root Cause**:
  1. Both the conversation list column (`292px`) and customer profile column (`312px`) used fixed widths across all screen sizes above mobile, leaving only around `~400px` for the chat body on medium viewports (like `1024px`).
  2. The page margins, column gap, and stage padding combined to waste ~38px of horizontal width.
  3. Action buttons (Sound, notifications, order, block/unblock) in the CustomerProfile component rendered with full text labels and expanded sizes, causing them to wrap, collision, and clutter narrow mobile drawer displays.
  4. Notes and profile overlays on mobile screens used `w-full`, fully covering the chat viewport.
- **Resolution**:
  1. Modified `apps/frontend/src/styles/index.css` to make column widths responsive (conversation list is `256px` and profile column is `268px` on medium screens, and gap/padding is reduced from `0.6rem` to `0.45rem`/`0.35rem` respectively).
  2. Modified `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx` to set width of overlays to `w-[85%]` on mobile viewports, allowing the underlying chat thread to remain visible.
  3. Integrated a responsive viewport resize listener in `apps/frontend/src/components/facebook-inbox/CustomerProfile/CustomerProfile.tsx` to detect mobile screens (< 768px). When active, it forces action buttons into a compact row, hiding textual labels (`sr-only`) and formatting them as icon-only buttons to fit cleanly without wrapping.
  4. Resolved `onCopyConversationLink` declared-but-not-used compiler warning inside `CustomerProfile.tsx`.
- **Files Modified**:
  - `apps/frontend/src/styles/index.css`
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx`
  - `apps/frontend/src/components/facebook-inbox/CustomerProfile/CustomerProfile.tsx`

### [FEATURE/FIX] Pause AI Agent Replies on a Per-Conversation Basis
- **Date**: 2026-07-14 / 2026-03-09
- **Description**: Enabled toggling the AI Agent automatic replies on/off for specific customer threads across all channels (WhatsApp, Facebook Messenger, Instagram, Telegram).
- **Root Cause/Gap**: Previously, merchants could only enable/disable the AI Agent globally or per-session, but had no way to temporarily pause the AI replies for a single conversation when a human agent wanted to intervene manually.
- **Resolution**:
  1. Updated the `updateConversation` controller in `conversationCrudController.js` to accept and update the `aiEnabled` boolean field.
  2. Integrated checking of `conversation.aiEnabled !== false` into all webhook processors:
     - `WhatsAppInboundService.js` (Meta Cloud WhatsApp)
     - `WhatsAppManager.js` (Baileys WhatsApp)
     - `TelegramBotService.js` (Telegram)
     - `allFunctions.js` (Facebook Messenger & Instagram)
  3. Added the `toggleAi` function in `useConversationActions` hook on the frontend to update `aiEnabled` on the conversation.
  4. Added a premium AI Toggle Button (🤖 icon) across all chat pages:
     - `WhatsAppChat.tsx` (whatsapp-inbox and whatsapp layouts)
     - `TelegramConversationsPro.tsx`
     - `MessengerChat-final.tsx`
     - `FacebookInbox.tsx`
     - `InstagramInbox.tsx`
     - `UnifiedInbox.tsx`
- **Files Modified**:
  - `apps/backend/controller/conversation/conversationCrudController.js`
  - `apps/backend/services/whatsapp/WhatsAppInboundService.js`
  - `apps/backend/services/whatsapp/WhatsAppManager.js`
  - `apps/backend/services/TelegramBotService.js`
  - `apps/backend/utils/allFunctions.js`
  - `apps/frontend/src/hooks/inbox/useConversationActions.ts`
  - `apps/frontend/src/pages/whatsapp-inbox/WhatsAppChat.tsx`
  - `apps/frontend/src/pages/whatsapp/components/ChatWindow.tsx`
  - `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx`
  - `apps/frontend/src/pages/conversations/TelegramConversationsPro.tsx`
  - `apps/frontend/src/pages/conversations/MessengerChat-final.tsx`
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx`
  - `apps/frontend/src/pages/instagram-inbox/InstagramInbox.tsx`
  - `apps/frontend/src/pages/unified-inbox/UnifiedInbox.tsx`


### [FIX] Company Dashboard Layout Gaps and Card Stretching Failures
- **Date**: 2026-07-16 / 2026-03-09
- **Description**: Resolved issues where dashboard widget cards did not stretch to fill the grid columns, causing large empty spaces and misalignments in RTL layouts.
- **Root Cause**:
  1. Card components (`AppWidgetCard.tsx` and `AppWidgetMini.tsx`) used `<button>` elements that lacked `w-full` class names, preventing them from stretching within their parent grid cells.
  2. The parent grid container in `AppWidgetGrid.tsx` did not use `grid-flow-row-dense` or proper responsive column spanning wrappers for double-width widgets (`colSpan: 2`), resulting in large layout gaps on large viewport sizes.
  3. Hardcoded text alignments (`text-right` instead of `text-start`) caused styling inconsistencies under different localization contexts.
  4. TypeScript errors were present due to uncasted translations and unchecked array index references on metric variables.
- **Resolution**:
  1. Updated `AppWidgetGrid.tsx` to utilize `grid-flow-row-dense` and dynamically apply `sm:col-span-2 xl:col-span-2` wrapper classes around cards with `colSpan === 2`.
  2. Applied `w-full` and `text-start` to `AppWidgetCard.tsx` and `AppWidgetMini.tsx` buttons to ensure correct alignment and stretching.
  3. Added group hover animations (`hover:-translate-y-1.5`, `group-hover:scale-110`) for the cards and their icons to enhance premium UI aesthetics.
  4. Fixed type check errors by safe-extracting array elements and casting translation returns to standard string types.
- **Files Modified**:
  - `apps/frontend/src/components/dashboard/widgets/AppWidgetGrid.tsx`
  - `apps/frontend/src/components/dashboard/widgets/AppWidgetCard.tsx`
  - `apps/frontend/src/components/dashboard/widgets/AppWidgetMini.tsx`

### [SECURITY/FIX] WhatsApp Cloud Connect App Secret Protection & Dynamic PIN
- **Date**: 2026-07-19 / 2026-03-09
- **Description**: Secured the Meta OAuth credentials from git history, generated random registration PINs, and aligned Graph API versions.
- **Root Cause**:
  1. The Facebook App Client Secret (`appSecret`) was stored in clear text inside `apps/backend/data/facebook-oauth-config.json` and committed to the Git repository, presenting a security vulnerability.
  2. The registration API call for WhatsApp numbers during Embedded Sign-up utilized a hardcoded PIN `'000000'`, which is not secure for production use.
  3. The Graph API version defaults diverged between the frontend (`v25.0`) and backend (`v22.0`).
- **Resolution**:
  1. Replaced sensitive credentials in `facebook-oauth-config.json` with safe placeholders and added the file to `.gitignore` to prevent future check-ins of server configuration values. Provided `facebook-oauth-config.example.json` as a baseline template.
  2. Modified the `facebookEmbeddedConnect` method in `whatsappController.js` to generate a random 6-digit PIN dynamically for phone registrations, and stored it inside the session record's `metadata` field.
  3. Updated default `META_GRAPH_VERSION` to `'v25.0'` in `whatsappController.js` to align with the frontend and modern Graph API features.
  4. Added dynamic autodiscovery fallback to `facebookEmbeddedConnect` to dynamically query and resolve `businessId`, `wabaId`, and `phoneNumberId` from Meta's Graph API when they are not passed by the frontend payload, avoiding 400 Bad Request failures.
- **Files Modified**:
  - `apps/backend/data/facebook-oauth-config.json`
  - `apps/backend/data/facebook-oauth-config.example.json`
  - `apps/backend/controller/whatsappController.js`
  - `.gitignore`

### [BUG FIX] WhatsApp Template Broadcast Campaign Failures and Session Stale options
- **Date**: 2026-07-21 / 2026-03-09
- **Description**: Fixed WhatsApp template list stale options in frontend and resolved the "Session not found" broadcast campaign failures.
- **Root Cause**:
  1. In the frontend `WhatsAppTemplateBroadcast.tsx`, changing the WhatsApp session did not clear the template list from the previously selected session, leading to mixed templates when the new session's fetch failed or took too long.
  2. In the database, the `BroadcastCampaign` model was missing a relation or field to track the specific WhatsApp session selected by the user.
  3. The backend `broadcastController.js` had hardcoded `waSessionId` as `company:companyId` which is not a valid session ID inside `WhatsAppSession`, causing "Session not found" errors when executing immediate broadcasts.
  4. The background scheduler `broadcastSchedulerService.js` had no implementation for WhatsApp campaigns, skipping recipients with no `facebookId` and attempting to send Messenger text messages for WhatsApp template campaigns.
- **Resolution**:
  1. Added `whatsAppSessionId String?` to `BroadcastCampaign` prisma model and regenerated the client.
  2. Updated frontend to clear templates state immediately upon session change, and passed `whatsAppSessionId: selectedSessionId` during campaign creation.
  3. Updated `broadcastController.js` to store `whatsAppSessionId` and resolve it during sending, with a fallback to the first active Meta Cloud session if not provided.
  4. Implemented WhatsApp template message sending branch in `broadcastSchedulerService.js` so scheduled WhatsApp broadcasts are fully supported and sent using `WhatsAppMessageHandler.sendTemplateMessage`.
- **Files Modified**:
  - `apps/backend/prisma/schema/marketing.prisma`
  - `apps/backend/controller/broadcastController.js`
  - `apps/backend/services/broadcastSchedulerService.js`
  - `apps/frontend/src/pages/whatsapp/WhatsAppTemplateBroadcast.tsx`

### [BUG FIX] WhatsApp Template Broadcast 24h Recipient Window Restriction
- **Date**: 2026-07-21 / 2026-03-09
- **Description**: Resolved issues where WhatsApp template campaigns failed with "No active recipients found" due to an incorrect 24-hour messaging window restriction.
- **Root Cause**:
  1. The code in `broadcastController.js` and `broadcastSchedulerService.js` applied a strict `twentyFourHoursAgo` message activity check for all campaigns.
  2. While necessary for Facebook Messenger, this restriction is incorrect for WhatsApp Templates, which are designed to re-initiate contact outside the 24-hour window.
  3. Additionally, customers without existing `Conversation` records were skipped entirely.
- **Resolution**:
  1. Split query logic in `broadcastController.js` (`sendCampaign`) and `broadcastSchedulerService.js` (`sendScheduledCampaign`) based on campaign channel.
  2. Removed the 24-hour filter condition entirely for WhatsApp campaigns, querying all company conversations with valid customer phone numbers.
  3. Added auto-creation of active WhatsApp `Conversation` records for target `Customer` entries that lack one, ensuring they are enrolled in the campaign recipients list.
  4. Preserved the 24-hour messaging policy constraint for Facebook Messenger campaigns.
- **Files Modified**:
  - `apps/backend/controller/broadcastController.js`
  - `apps/backend/services/broadcastSchedulerService.js`

