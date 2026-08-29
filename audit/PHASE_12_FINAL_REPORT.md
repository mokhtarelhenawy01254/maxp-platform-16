# PHASE 12 — FINAL AUDIT REPORT

Full evidence in PHASE_01…11. Classifications: CONFIRMED / HIGH CONFIDENCE (HC) / POSSIBLE.

## 1. EXECUTIVE SUMMARY

**Overall architecture health: HIGH RISK** (functional today at current scale, but with confirmed exploitable security holes, non-transactional money handling, and an observability vacuum that lets failures happen invisibly).

Top 10 findings:
1. **CRITICAL — 4 unauthenticated/forged-payment paths**: platform subscription webhook, Kashier webhook + client-priced checkout, unsigned Turbo/Bosta shipping webhooks, default-off WhatsApp Meta signature (Phases 4/5).
2. **CRITICAL — Production DB credentials + service tokens committed to git** (docs/DATABASE_INFO.md:64,167; seed script; WC secret; admin passwords).
3. **CRITICAL — Wallet/cashback/loyalty money is Float and mutated via read-modify-write outside transactions** — lost updates, negative balances, double credits are all reachable now (walletService.js:47-140).
4. **CRITICAL — Arbitrary file read** via unauth debug endpoint with committed key (whatsappMetaWebhookController.js:361-382) + SSRF in public proxy-image.
5. **HIGH — Order state machine is advisory**: payment/shipping webhooks write status directly bypassing every transition rule; TRASH→DELIVERED etc. possible; scheduled-order cron resurrects cancelled orders.
6. **HIGH — Observability is a vacuum**: winston logger dead code, ~11.4K console statements, no Sentry/metrics/DLQ; failed webhook jobs evicted silently; the one DB integrity alert calls a nonexistent method.
7. **HIGH — Dashboards fetch entire periods into Node memory** (orders + items) instead of SQL GROUP BY — first OOM source at scale.
8. **HIGH — Tenant isolation depends on a 15-prefix allowlist while 60+ company-scoped prefixes are unprotected by global middleware**, plus controller-level `body.companyId` trust (service-orders IDOR confirmed).
9. **MEDIUM-HIGH — Schema integrity gaps**: no unique on conversation(customer,channel)/OrderItem lines/voucher conversion; wallet Float; Product→OrderItem cascade destroys order history; 221 companyId columns unindexed.
10. **MEDIUM — API surface chaos**: ≥18 alias mounts, 3-5 parallel implementations of order endpoints, ≥8 response shapes, zero validator adoption, hanging `res.status(201,{...})` bug.

## 2. CRITICAL BUGS

| Severity | Problem | Evidence | Impact | Fix |
|---|---|---|---|---|
| CRITICAL | Subscription webhook unauthenticated; idempotency pre-read racy → forged/double activation | platformSubscriptionController.js:723-886 | Free paid plans; double commissions | Verify Kashier HMAC; atomic status-gated update; recon sweep |
| CRITICAL | Kashier webhook unsigned + checkout trusts client totals; wallet-credit replay | kashierRoutes.js:79-81,173-261 | Pay-what-you-want; any order marked CAPTURED; arbitrary wallet credit | Signature middleware; price recompute from DB; once-only credit guard |
| CRITICAL | Arbitrary file read via debug endpoint (committed key, path traversal, reflected) | whatsappMetaWebhookController.js:361-382 | Full server file disclosure | Remove endpoint; rotate key |
| CRITICAL | Prod DB credentials in git-tracked docs/scripts | docs/DATABASE_INFO.md:64,167; reset-pass.js:12; swan-full-import.js:11 | Direct DB compromise | Rotate ALL credentials; purge git history |
| CRITICAL | Wallet RMW float ops, no tx | walletService.js:47-140; misc.prisma:244-246; products.prisma:466-468 | Balance drift, negative balances, lost updates | Atomic conditional decrement + ledger in one tx; Decimal migration |
| CRITICAL | Anonymous cross-tenant writes via public routes trusting body.companyId | globalSecurity.js:472 + serviceOrdersController.js:38; servicesController.js:5 | Data injection into any company | Remove from PUBLIC_ROUTES or derive company from verified context only |
| CRITICAL | SSRF full-read in public image proxy | proxyImageController.js:154-168,295-301 | Cloud metadata/internal network read | Strict host allowlist; block redirects |
| CRITICAL | Silent webhook event loss (empty catches pre-queue; jobs vanish post-retries) | webhookController.js:365-407; webhookQueue.js:36; removeOnFail eviction | Customer messages dropped without trace | Log+alert; DLQ; remove empty catches |

## 3. DATABASE PROBLEMS

| Table | Problem | Evidence | Risk | Fix |
|---|---|---|---|---|
| CustomerWallet/WalletTransaction | Float money, mutable balance | products.prisma:466-468; misc.prisma:244-246 | Drift/races | Decimal + tx + CHECK(balance>=0) |
| Payment | amount Float | orders.prisma:484 | Rounding | Decimal |
| OrderItem | No dedup unique; product Cascade deletes history | orders.prisma:213-240,233 | Totals inflate; history loss | @@unique(orderId,productId,variantId); SetNull |
| Conversation | No unique(company,customer,channel) | messaging.prisma:1-39 | Duplicate chats/double AI replies | Add unique + backfill merge |
| ReturnRequest.orderItemId | FK-less string | returns.prisma:33 | Orphans | Add relation |
| Shipment/GuestOrder/statuses (~110 cols) | Free-text statuses, mixed case vocabularies | products.prisma:729; orders.prisma:117; order_workflow.prisma:75 | Unqueryable state machines | Enums/constraints |
| OrderStatusHistory | Quoted camelCase table, missing map | orders.prisma:573-588 | Inconsistent naming | @@map |
| ai_analytics logs ×7 | Unbounded growth, no retention | ai_analytics.prisma | Bloat | expiresAt + pruning job (pattern exists: AiRuntimeLedger) |
| 221 models | companyId w/o index | schema-wide | Full scans per tenant | Composite (companyId,…hot column) indexes |
| InboxSettings/AiSetting/HRSettings/Payroll | JSON-in-String config blobs | whatsapp_inbox:238-245; hr:289-314,734-795 | Unvalidatable config | Json type + zod validation at write sites |
| UserCompany | Dual role systems | core.prisma:489-498 | Escalation ambiguity | Single source of truth |
| PlatformSubscription | Single row overwrite = no plan history | billing.prisma:3 | Lost billing history | History table |

## 4. PERFORMANCE PROBLEMS (top)

1. **Order creation N+1 chain** — enhancedOrderService.js:1162-1394; 30–50 round trips/order; breaks at 10K–50K orders/day. Fix: batch lookups + createMany. P0-P1.
2. **Dashboard full-period loads into JS** — companyDashboardController.js:195-320, enhancedOrderService.js:2067-2089, analyticsController.js:4424-4458; O(period rows); OOM at 100K+. Fix: SQL GROUP BY using existing effectiveOrderStatusSql. P1.
3. **Preparation queue scans all active orders** — preparationQueueService.js:1246-1336,1501-1518. Fix: status-filtered SQL + pagination. P1.
4. **RLS-wrapper tx doubling every tenant query** — sharedDatabase.js:191-213; pool pressure. Fix: SET LOCAL via pooled pattern or drop for reads. P1.
5. **Sequential-number lock serializes all orders** — orderService.js:694-727. Fix: UPDATE…RETURNING or sequence object. P1.
6. **OFFSET+COUNT pagination on big tables** — conversationCrudController.js:263-332 et al. Fix: keyset pagination. P2.
7. **Missing hot-path composites** — (companyId,createdAt) orders, (status,createdAt) history, WA inbox composite, attendance (companyId,date), trackingNumber. P1.
8. **1-second notification queue tick** — notificationQueueWorker.js:88-94. Fix: 15-30s tick or LISTEN/NOTIFY. P2.
9. **Bulk loops** — tag rename/delete (customerController.js:2191-2248), trash/restore (orderController.js:238-272): hours at scale + partial states. Fix: updateMany batches + tx. P2.
10. **Affiliate catalog pagination in memory** — productController.js:555-569. Fix: DB-level filter/paginate. P2.

## 5. RLS / SECURITY
Consolidated in Phase 4 (22 findings: S1–S22). Core themes: pre-globalSecurity mounts bypass everything; isolation allowlist covers ~15 of 75+ scoped prefixes; X-Company-Id fallback hole for companyId-less tokens; no login rate limiting; refresh tokens never invalidated; SUPER_ADMIN role from stale JWT claim.

## 6. BROKEN / INCOMPLETE FLOWS

| Flow | Expected | Actual | Failure scenario | Fix |
|---|---|---|---|---|
| Scheduled orders | Only pending→confirmed at date | Any status flipped to CONFIRMED (no status filter) | Cancelled order resurrects + ships | Status filter (scheduledOrderService.js:13-20) |
| POST /create-simple | Returns created order | Response never sent (`res.status(201,{...})`) | Client hangs/timeouts; retry creates dup order | res.status(201).json(...) (orders.js:6057) |
| Voucher discount | Consumed once per successful order | Burned pre-commit; concurrent reuse | Discount lost or double-applied | Claim-gate + release on failure |
| Return review | Reversals once | Unguarded flip; sequential swallowed reversals | Double deductions / partial reversal | WHERE isReviewed=false gate + journal |
| Broadcasts | Exactly-once sends | Send-then-mark; in-memory scheduling dies on restart | Duplicate chargeable WhatsApp messages; silently dropped campaigns | BullMQ + claim + per-recipient keys |
| WA journeys | Step sent once | Send-then-mark, no lease | Duplicate steps after crash/overlap | Claim-then-send; enrollment unique |
| Payroll regenerate | Preserve paid records | deleteMany deletes PAID payrolls | Irreversible payroll loss | Exclude PAID filter |
| Bulk order execute | Resumable batch | Stuck PROCESSING forever on crash | Batch never completes, no scanner exists | Chunked queue + cursor |

## 7. RACE CONDITIONS / CONCURRENCY
Wallet RMW lost updates & negative balances (walletService.js:47-140) · cashback reverse flag TOCTOU (cashbackService.js:274-302) · loyalty redeem negative points (:697-719) · voucher conversion double-credit (autoDiscountService.js:309-393) · FB message duplicate insert under worker concurrency=20 (allFunctions.js:1765-1812) · stock oversell RMW w/ Math.max clamp (inventoryController.js:998-999) · PO receiving triple-write divergence (purchaseOrderController.js:363-505) · payroll markAsPaid double pay (:628-692) · round-robin assignment pointer (:1053-1133) · AI suppression race during generation (allFunctions.js:2208-2243) · multi-instance hazards: in-memory mutexes/dedup sets everywhere.

## 8. TRANSACTION / DATA CONSISTENCY
Partial-state capable operations: checkout (guest/order/stock/cashback split-brain), kashier activation, payroll gen + rewards linking, PO receiving, return reversals, journey steps, broadcast cursors, bulk execution, customer deletion (swallowed FK errors), tag renames. Details + fix shapes in Phase 6 matrix T1–T15. House pattern to standardize: payFromWallet + finalizeCompanyWarehouseReservations (conditional decrement + count gate).

## 9. DUPLICATE CODE
Order endpoints ×3-5 implementations (canonical: orderController/orderService) · DB clients ×3 (canonical: sharedDatabase, 1212 refs) · dashboards ×3 (+1 dead) · message tables Message vs WhatsAppMessage · task stacks Task vs DevTask vs AiAgentTask vs Goal/DevGoal · lateness aggregates ×3 · response envelopes ×8 · frontend api shims (api.ts ×92 importers) · useSocket.tsx dead twin · Woo import hook dead twin.

## 10. ORPHANED / DEAD CODE
7 dead route files, ~12 dead services, 25+ zero-accessor Prisma models, 9 zero-import npm deps (+winston/pino effectively), 33 phantom env keys, orders.js.main_backup, .bak page, legacy_mysql/ (isolated), verify_schema/, schema.prisma.legacy, ~24MB repo-root temp debris, 787 backend scripts. Full lists Phase 9.

## 11. MISSING COMPONENTS
Idempotency keys (checkout/webhooks) · DLQ + failed-job alerting for BullMQ · error-tracking service (backend) · structured logging adoption (logger exists, unused) · metrics endpoint · cron heartbeat/last-success tracking · transition-validation enforcement (config exists, advisory) · retention/pruning jobs for log tables · soft-delete/anonymize for customers · request validation layer (joi/express-validator installed, unused) · external-call timeouts (kashier/facebook/aiSdk) · log rotation for PM2 stdout · CI test gate · auto-rollback after failed health check · unique constraints listed in §3.

## 12. WRONG ARCHITECTURAL DECISIONS (demonstrated problems only)

| Current | Why problematic | Better | Migration difficulty | Priority |
|---|---|---|---|---|
| Broadcasts/journeys/smart-campaigns in-proc (node-cron + Map/setTimeout) | Breaks on restart & multi-instance; duplicates chargeable sends | Move to BullMQ delayed/repeatable jobs | Medium | P2 |
| Isolation via 15-route allowlist + per-controller discipline | 60+ prefixes rely on each dev remembering companyId filters; proven IDORs | Default-deny isolation middleware (inverse list) + lint rule against body.companyId | Medium | P0 |
| db push --accept-data-loss as deploy/DB strategy | No migration safety, drift vs 82 migration folders, data-loss by design | prisma migrate deploy pipeline | Medium | P1 |
| Money in Float + app-layer balance math | Rounding + races (proven above) | Decimal + transactional ledger ops | Medium (backfill) | P0 |
| Two ORMs on one DB (Node Prisma + Python SQLAlchemy direct) | Constraint/business rules enforced inconsistently; ai-service can bypass backend invariants | Route all writes through Node API (already the stated intent); keep Python reads | Low-Medium | P2 |
| Nested dual QueryClient providers (frontend) | Wrong defaults silently applied; retry-3 on mutations amplifies load | Single provider | Trivial | P1 |

## 13. WHAT NOT TO CHANGE
- **The monolith** — no microservices justified; bottlenecks are query-shape and locking issues.
- **Postgres single-writer + Prisma** — adequate once hot paths fixed.
- **BullMQ choice & webhook queue topology** (attempts/backoff correct) — needs monitoring, not redesign.
- **Facebook webhook signature implementation** — solid and production-mandatory; copy its pattern to other webhooks.
- **globalAuthentication JWT-hardening** (companyId from token, timing-safe compare, cached lookup) — keep; just close the fallback holes.
- **Storefront caching design** (60s/300s Redis) — effective.
- **Customer portal token design** (DB-backed, pinned) — good.
- **payFromWallet / fulfillMerchantOrder / fulfillment reservation patterns** — make them the house standard, don't refactor them.
- **Post-deploy health-check gating** — keep, add rollback.
- **Upload path-traversal containment** — correct as-is (fix only content-type policy).

## 14. PRIORITIZED FIX PLAN

### P0 — Critical (security/data corruption; do immediately)
| Fix | Location | Why | Risk | Benefit | Depends on |
|---|---|---|---|---|---|
| Require signature/auth on subscription+kashier+turbo+bosta webhooks; enable META_WA_WEBHOOK_STRICT | platformSubscriptionController.js:723; kashierRoutes.js:173; turboWebhook.js:28; bostaWebhook.js:15; webhookSignature.js:59 | Forged payments/status/messages | Provider integration re-test | Closes free-plan/forged-event attacks | rotate secrets |
| Recompute prices server-side; once-only wallet credit guards | kashierRoutes.js:79-81; walletService.js | Pay-what-you-want + replay credit | None | Money integrity | — |
| Remove debug-log endpoint; fix service-orders/services companyId trust | whatsappMetaWebhookController.js:361-382; globalSecurity.js:471-472 | File disclosure; cross-tenant writes | None | Closes critical holes | — |
| Rotate ALL leaked credentials; purge git history (BFG) | docs/DATABASE_INFO.md; scripts/* | Direct DB access | Deployment env updates | Removes standing compromise | coordination |
| Wallet ops → single tx, conditional decrement, Decimal columns | walletService.js:47-140; schema | Prevent lost money | Backfill migration | Correct balances forever | maintenance window |
| Delete PAID-payroll destruction; scheduled-order status filter | payrollService.js:175-179; scheduledOrderService.js:13-20 | Data loss/resurrection | None | Stops silent corruption | — |

### P1 — Performance (production impact now)
| Fix | Location | Why | Risk | Benefit |
|---|---|---|---|---|
| Batch order-item creation; kill sequential-number lock (UPDATE…RETURNING) | enhancedOrderService.js:1162-1394; orderService.js:694-727 | Hottest write path | Moderate (core flow tests) | Latency + throughput ceiling lifted |
| Push dashboard aggregation into SQL (GROUP BY w/ effectiveOrderStatusSql); add LIMIT floors | companyDashboardController.js:195-320; enhancedOrderService.js:2067; analyticsController.js:4424 | OOM at scale | Low | Dashboards stable |
| Add hot composite indexes (list in Phase 3 §3.4) via prisma migrate (NOT db push) | schema files | Seq scans on hottest filters | Low (online creates) | Immediate query wins |
| Bypass RLS-style wrapper for read-only paths; route controllers through safeQuery gate | sharedDatabase.js:191-213,351-414 | Halve round trips; real back-pressure | Medium | Pool headroom |
| Single QueryClient provider; fix res.status(201,{}) hang | AdminAppBootstrap/AppProviders; orders.js:6057 | Correct defaults; broken endpoint | Trivial | Correctness |

### P2 — Reliability
DLQ + failed-job alerts + remove empty webhook catches · move broadcasts/journeys/bulk to BullMQ with claim semantics · enforce state-machine transitions centrally (single updateOrderStatus chokepoint incl. payment/shipping writers) · idempotency keys on checkout + webhook event table · adopt Claim pattern (T1-T15 matrix) across money/state ops · login rate limiting + refresh rotation with reuse detection · cron heartbeats + telegram alerts on failure · timeouts on kashier/facebook/aiSdk HTTP clients · keyset pagination on inbox/orders/customers · prune job for ai_analytics/log tables · CI test gate before deploy.

### P3 — Cleanup
Delete 7 dead routes + ~12 dead services + dead models (verify 4 HC items first) · collapse order-endpoint triplicates behind canonical router; remove alias mounts (incl. double wallet mount) · unify response envelope via shared helper · delete orders.js.main_backup/.bak/tmp debris; archive legacy_mysql/verify_schema · remove unused deps/env keys · codemod api.ts imports → apiClient · delete useSocket.tsx + dead hooks (20) + dead Woo hook · extract route-file business logic (top 20 files >400 lines) into services · i18n pass on 75 hardcoded admin pages.

---

### AUDIT SCORE

| Dimension | Score | Rationale |
|---|---|---|
| Architecture | 6/10 | Sound monolith shape, good patterns exist — but duplicated stacks, wrong-layer logic, in-proc scheduling |
| Database | 4/10 | Well-indexed partially (1,244 indexes) but Float money, missing core uniques, cascade dangers, enum chaos |
| Performance | 5/10 | Fine at current volume on hot reads (caching works) but write path + dashboards have hard ceilings |
| Security | 2/10 | Confirmed forged-payment/file-read/cross-tenant-write vectors + credentials in git |
| Reliability | 3/10 | Non-transactional money ops, advisory state machine, silent failure everywhere |
| Code quality | 4/10 | Massive duplication (routes 6.9KB files, 8 envelope shapes, 0% validator adoption) but strong domain coverage |
| Scalability | 5/10 | Clear known ceilings with cheap fixes; nothing requires re-architecture yet |

**TOP 5 THINGS TO FIX FIRST**
1. Close the four forged-payment/unauth webhook holes + enable Meta signature enforcement (P0, hours of work).
2. Rotate and purge all git-committed credentials (DB, service token, WC secret, admin passwords).
3. Make wallet/cashback operations transactional with atomic conditional decrements; convert money columns to Decimal.
4. Fix order-creation write path (batch items + replace settings-row lock) — removes the #1 throughput ceiling.
5. Replace dashboard/analytics full-table loads with SQL GROUP BY + add the six missing hot-path composite indexes.
