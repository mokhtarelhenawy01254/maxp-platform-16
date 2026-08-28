# PHASE 11 — SCALABILITY ANALYSIS

All projections derived from CONFIRMED findings in Phases 2/3/5/6. No premature architecture changes proposed; every bottleneck below has a demonstrated code path.

## Growth assumptions
- Records = orders/messages/conversations per platform (all tenants share tables; companyId-scoped).
- Today: single PM2 fork, pool=80, Redis present but underused.

## Bottleneck sequence

### First to break: Order-creation write path (~10K–50K orders/day)
Evidence: P1 serial per-item queries (enhancedOrderService.js:1162-1394), T7 sequential-number row lock (orderService.js:694-727), RLS-style tx wrapper doubling round trips (sharedDatabase.js:191-213), back-pressure gate bypassed (P9).
Failure mode: order creation latency climbs from ~100ms to seconds; pool exhaustion → P2024 timeouts; PM2 restarts (1200M cap) drop in-flight checkouts. The settings-row lock makes throughput a hard ceiling independent of hardware.

### Second: Dashboards/analytics (100K–1M orders aggregate)
Evidence: P2 companyDashboardController fetches all period rows + items into Node heap; P3 getOrderStats unbounded histogram; P5 raw SQL with default TRUE date clause; zero caching on admin analytics (Phase 3 §3.6).
Failure mode: OOM at multi-hundred-K rows per request; dashboard endpoints time out first for the biggest tenants (noisy-neighbor effect on shared monolith).

### Third: Messaging/inbox (500K+ conversations, 1M+ messages)
Evidence: P6 conversation stats correlated subquery over all open conversations; OFFSET+COUNT pagination everywhere (conversationCrudController.js:263-332); missing `(sessionId,isArchived,lastMessageAt)` composite (unifiedInboxController.js:207-233); Message table grows unbounded with no archival.
Failure mode: inbox page loads degrade linearly with tenant message history; deep pages O(skip).

### Fourth: Background jobs & crons (concurrency × tenants)
Evidence: notification queue tick every SECOND (notificationQueueWorker.js:88-94); broadcasts/journeys run in-proc with in-memory mutexes (Phase 6 T10/T11) — cannot scale past one process; sync poller every 5s.
Failure mode: adding a second backend instance breaks dedup/broadcast semantics (double sends), while single process saturates event loop.

### Fifth: Data growth housekeeping (any size)
Evidence: 7+ ai_analytics log tables with no retention (ai_analytics.prisma), WhatsAppEventLog/ModeratorActivityLog/StoreVisit unbounded, soft-delete absent → TRASH rows accumulate forever, migrations via db push make index rollouts risky.

## At each scale

| Scale | What breaks | What survives |
|---|---|---|
| 100K records | Dashboards slow (>2s); bulk ops >10K rows timeout w/ partial state | Order creation OK; storefront cached OK |
| 500K records | Dashboards OOM-risky; inbox noticeably slow; pool pressure at peaks | Core CRUD fine |
| 1M records | Analytics fail; order-create lock contention visible; OFFSET pages unusable beyond page ~50 | Storefront (cached), single-order ops |
| 5M records | Sequential-scan dashboards take minutes; log tables dominate DB size; backup times explode | Only point reads |
| 10M records | Requires partitioning/archival regardless of app fixes; connection count forces pgbouncer | — |

## What does NOT need changing for scale
- Monolith itself (fine well past current bottlenecks — do NOT split into microservices).
- Postgres single-writer (adequate until far beyond these numbers once hot paths fixed).
- Prisma as ORM (problems are query-shape issues, not the ORM).
- BullMQ choice (correct tool; just needs DLQ + monitoring + moving broadcasts/journeys onto it).
- Storefront cache design already effective.
