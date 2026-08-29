# PHASE 7 — API / BACKEND AUDIT

(Security findings in Phase 4; performance in Phase 3 — not repeated.)

## 7.1 CRITICAL / runtime defects

| # | Class | Evidence | Finding |
|---|---|---|---|
| A1 | CONFIRMED | routes/orders.js:6057 (twin at orders.js.main_backup:4591) | `res.status(201, {...})` — payload silently discarded, no `.send()` → request HANGS until client timeout on `POST /create-simple` |
| A2 | CONFIRMED | services/simpleOrderService.js:425 saveOrderToFile ← routes/orders.js:6030 | Order creation writes DB + a FILE under `../../orders` from an HTTP handler — dual persistence, no cleanup/tx |

## 7.2 Duplicate endpoint implementations (functional overlap across routers)

| Job | Implementations |
|---|---|
| List orders | orderRoutes.js:13 (`/orders`) · orders.js:4396 (`/orders-v2`,`/orders-new`) · enhancedOrders.js:183 (`/orders-enhanced`) |
| Change status | orders.js:5588 · enhancedOrders.js:860 · orderWorkflowRoutes.js:207 |
| Bulk status | orders.js:6137 (+by-filters :6206) · bulkStatusUpdateRoutes.js:41 (CSV) |
| Delete orders | orders.js:6247 · enhancedOrders.js:995 · orderRoutes.js:16 `/all` |
| Create order | orders.js:5811 `/simple` → EnhancedOrderService · orders.js:6012 `/create-simple` → simpleOrderService(+file write) · orders.js:6074 `/create` (comment "للاختبار", still mounted) |
| Conversation stats | 3 places: enhancedOrders.js:1052, unifiedInboxRoutes.js:71, conversationRoutes.js:53 (original commented out :52) |
| Same handler twice verbatim | enhancedOrders.js:100 AND :143 `GET /manual-access` (second unreachable dead code) |

## 7.3 Response contract chaos

≥8 distinct envelope shapes sampled ({success,data} / {success,message,data} / {success,results,message} / +pagination / raw object / {error} only / {success:false,error,message} / {success:false,message} / {success,code,message} …). Evidence: controller/orderController.js:182,247; routes/enhancedOrders.js:132,187-191,1071,1105-1110; competitorPlatformRoutes.js:121-123; server.js:1309-1315,1400,1415.
Error handling: `asyncHandler` used by ZERO files; ad-hoc try/catch res.status(500).json in ~250 controllers + 76 route files. Validator adoption: express-validator ×1 controller, joi ×1 route file out of 265; middleware/inputValidation.js::validate imported by zero routes.

## 7.4 Missing validation (worst spots)
orders.js:6076-6081 (`customerId`+`companyId` from client body), publicOrdersRoutes.js:728+ (public unauth creation, dozens of fields unvalidated + logs full PII at :731), enhancedOrders.js:554, adminWhatsappAIgnoreListRoutes.js:36/56, orderWorkflowRoutes.js:38 PUT config, bulkStatusUpdateRoutes CSV rows.

## 7.5 External calls without timeouts
NO timeout config (CONFIRMED): kashierService.js (:193,:224 — payment-critical), facebookCatalogService (10 sites), facebookAdLibrary/AdTest/Audiences/Conversions, aiSdkClient.js, whatsappInboxService.js. Contrast: turbo/*, MetaCloudProvider, bostaService set timeouts.
Layering violation: routes/orders.js:2070-2078 backend makes blocking self-HTTP-call to its own public orders API mid-request.

## 7.6 Wrong-layer logic
20 route files >400 lines of inline prisma/handler logic; worst: orders.js 6,869 lines, facebookOAuthRoutes.js 3,112, publicOrdersRoutes.js 2,863, affiliateRoutes.js 2,027, publicProductsRoutes.js 1,690. enhancedOrders re-instantiates `new EnhancedOrderService()` per request while orderController serves same entity.

## 7.7 Dead/shadowed/stub endpoints
- server.js:1318-1320 `GET /users/roles` hardcoded stub, no auth, no data source
- server.js:1322-1388 permissions catalog UNREACHABLE (permissionRoutes already owns the prefix at :989)
- Two DIFFERENT routers share `/api/v1/notifications` (notifications-simple :966 then notificationRoutes :967) — shadowing, not aliasing
- paymentRoutes second mount at `/admin/payments` (:944) inherits non-admin semantics
- Migration leftovers mounted: enhancedOrders.js:360 `/migrate-from-files`, :1126 `/compare/systems`
- orders.js.main_backup ships inside routes dir [POSSIBLE deploy noise]

## 7.8 Layer responsibility verdict
Frontend: OK (pure consumer). Backend routes: massively over-loaded (should be thin). Database: status-transition logic half-in app half-in config tables (OrderStatusConfig advisory only). Background worker: under-used — broadcasts/journeys/bulk ops run in-request or in-proc cron instead of BullMQ (Phase 6).
