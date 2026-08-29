# PHASE 3 — DATABASE PERFORMANCE AUDIT

Evidence-based; complexity n = rows per company unless noted.

## 3.1 Top findings (ranked)

| # | Sev | Class | Evidence | Problem | Breaks at |
|---|---|---|---|---|---|
| P1 | CRITICAL | CONFIRMED | services/enhancedOrderService.js `createOrderItems()` L1162–1394 | Per line item: product.findUnique + variant.findUnique + orderItem.create serially (no createMany); `findProductByName` L1477 uses `contains` (seq scan) | 100K orders/day → pool saturation; latency ∝ basket size |
| P2 | CRITICAL | CONFIRMED | controller/companyDashboardController.js L195–320 | Fetches ALL orders in period + ALL order items to aggregate in JS (status counts, revenue-by-day bucketing) | 100K+ orders/month: multi-second/GB responses, GC pressure |
| P3 | HIGH | CONFIRMED | services/enhancedOrderService.js getOrderStats L2067–2089 | No take/date bound → entire order history shipped to Node for status histogram (SQL GROUP BY possible via existing `effectiveOrderStatusSql`) | 1M orders → OOM/timeout |
| P4 | HIGH | CONFIRMED | services/preparationQueueService.js L1246-1336, 1501-1518 | `while(true)` batches of 150 + deep includes over ALL non-terminal orders, in-memory sort/filter for one page | Worst endpoint under load; degrades linearly with active orders |
| P5 | HIGH | CONFIRMED | controller/analyticsController.js getStatusSummaryReport L4424–4458 | Raw SQL with `dateClause='TRUE'` default → full-company scan w/ per-order LATERAL join, aggregated in JS | 1M orders → minutes |
| P6 | HIGH | CONFIRMED | controller/conversation/conversationStatsController.js L52–137 | All open conversations w/ correlated last-message subquery + all today's messages grouped in JS + user lookup in loop | 100K open conversations → timeout on inbox load |
| P7 | HIGH | CONFIRMED | server.js:959/1025 walletRoutes double-mount aside — services/orderService.js getNextSequentialOrderNumber L694–727 | Interactive tx read-then-write on single settings row = highest-frequency lock; every order creation queues behind previous | Order throughput serialization under concurrency |
| P8 | HIGH | CONFIRMED | services/sharedDatabase.js:191-213 | RLS-style wrapper wraps EVERY tenant query in interactive transaction (`BEGIN/set_config/query/COMMIT`) → ~2× round trips, pool pinning | Pool (80 conns) saturation at high concurrency |
| P9 | MEDIUM-HIGH | CONFIRMED | sharedDatabase.js:351-414 vs proxy 506-567 | Concurrency gate (MAX_CONCURRENT_QUERIES=80) applies only via safeQuery/executeWithRetry; most controllers call the raw proxy → back-pressure bypassed | Spikes hit Postgres directly |
| P10 | MEDIUM | CONFIRMED | workers/notificationQueueWorker.js:88-94,112 | WhatsApp notification queue tick runs EVERY SECOND (BullMQ repeat `* * * * * *`; comment claims 60s) → reaper updateMany + findMany 86k/day baseline | Constant DB churn; grows if (status,scheduledAt) unindexed |
| P11 | MEDIUM | CONFIRMED | controller/ownerController.js getDashboardData L109–231 | 9 queries × C companies incl. unbounded attendance.findMany filtered in JS | Owner w/ 50 companies = ~450 queries/page |
| P12 | MEDIUM | CONFIRMED | customerController.js renameTag/deleteTag L2191–2248 | Fetch ALL tagged customers then 2 sequential updates each, no transaction, no batching | Hours at 100K customers; partial renames |
| P13 | MEDIUM | CONFIRMED | orderController.js moveOrdersToTrash/restore L238–272; preparationQueueService bulk L1835–1849 | Full per-order status pipeline looped serially (5–10 queries × n) | Minutes-long requests at n=500 |
| P14 | MEDIUM | CONFIRMED | productController.js getAllProducts affiliate branch L555–569 | Whole catalog fetched then sliced in JS for pagination (non-affiliate branch is correct) | 100K products → whole catalog per page view |
| P15 | LOW-MED | CONFIRMED | growthMarketingController.js getDashboard L26–82 | Five sequential full-orders aggregates; repeat-customer query returns row-per-customer just to `.length` it | Seconds each at 1M orders |

## 3.2 N+1 census
149 loop-with-prisma-await sites found across controller/services. Worst confirmed beyond table above: commissionService.js:155/245/463, googleSheetsController.js:710 (3 awaits/row export), internalSyncService.js:488/519, companyConnectionController.js:498/715/758, hr/customerLoyaltyService.js:854/1391/1468.

## 3.3 Unbounded queries census
132 hot-table findMany sites without `take` (34 also without `select`). Worst 10 listed in agent report: companyDashboardController.js:209/300, enhancedOrderService.js:2067, analyticsController.js:4424, productController.js:555, conversationStatsController.js:52, customerController.js:2191/2241, whatsappInboxController.js:355/379, ownerController.js:190, turboReportController.js:266 / easyOrdersController.js:834 / wooCommerceExportController.js:71.

## 3.4 Index ↔ query mismatches (code vs schema evidence)

| Query path | Code evidence | Missing index |
|---|---|---|
| Dashboard "today" ranges | analyticsController.js:4836-4845, 1728-1733 | `(companyId, createdAt)` and any index on `updatedAt` (orders.prisma:413-429 lacks both) |
| Status history dashboards | analyticsController.js:4769-4774 | `(status, createdAt)` on OrderStatusHistory (only orderId/guestOrderId indexes, orders.prisma:592-593) |
| WA inbox contact list | unifiedInboxController.js:207-233 | `(sessionId, isArchived, lastMessageAt)` composite (messaging.prisma:180-186 singles only) |
| Customer list default sort | customerController.js:28,119 | `updatedAt` unindexed on Customer; leading-wildcard contains search unindexable |
| Product admin list | productController.js:491-596 | `(companyId, isActive, createdAt)` |
| HR attendance reports | hrController.js:6486-6496 | `(companyId, date[, userId])` — OR(userId,employeeId) defeats singles |
| Wallet statements | walletController.js:91-113 | `[walletId, createdAt]` composite |
| Order list `isViewed` filter | routes/orders.js:4413 | no index |
| Shipment trackingNumber lookup | Phase 2 | not indexed |

## 3.5 Connection pool / clients

- Shared singleton: connection_limit=80, pool_timeout=30 (sharedDatabase.js:156-158). ✔
- EXTRA PrismaClient pools confirmed: postgresDatabase.js:36 (eagerly instantiated at require, server.js:436, NO connection_limit), competitorAdService.js:3, competitorPlatformService.js:3, competitorSocialService.js:3 (+ dead optimizedSharedDatabase.js:38). Combined worst case ≈ 80+~20+30 connections/process.
- PM2 fork mode, 1 instance today — multiplication contained but latent.

## 3.6 Caching reality

Cached (Redis w/ in-process Map fallback): public product feed TTL 300s (publicProductsRoutes.js:1000/1145), storefront settings TTL 60s (publicStorefrontController.js:421/545), moderator dashboard 30s, order-confirmation grouping 30s.
NOT cached: ALL admin analytics/dashboards, inbox lists, orders/customers/products lists, preparation queue, HR reports.
Caveat: REDIS_URL unset ⇒ silent per-process Map fallback (redisCacheService.js:18-22) — stale-window + memory creep (entries swept only on read, :69-74).

## 3.7 Pagination

OFFSET + COUNT(*) everywhere on big tables: orders (orderController.js:26-38), conversations incl. second unreplied count (conversationCrudController.js:263-332), messages, customers, legacy tasks raw SQL, analytics drill-down with literal OFFSET interpolation (analyticsController.js:4548-4573, parseInt-guarded). Deep pages O(skip). Keyset pagination nowhere.

## 3.8 Positive findings (do NOT change)
- Raw SQL is parameterized at inspected sites (tagged templates or $n arrays); company filtering present in main aggregates.
- preparationQueueService.fetchPreparationBatchOrders properly ID-limited (L1349-1398).
- globalSecurity user→company cache 60s works (globalSecurity.js:204-250).
- startMemoryMonitor overhead negligible (server.js:1496-1523).
- Storefront feed caching exists and is effective.

## 3.9 What breaks first (scaling sequence)
1. Order creation write path (P1+P7+P12-settings) — latency & lock queueing.
2. Dashboards/analytics (P2/P3/P5/P15) — O(period rows) between 100K–1M orders.
3. Bulk ops (P12/P13) — timeouts + partial state past ~10K rows.
4. Inbox/stats endpoints (P6, whatsappInboxController stats) — degrade with message volume.
