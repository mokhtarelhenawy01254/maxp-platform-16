# PHASE 6 — TRANSACTION / CONSISTENCY AUDIT

Pattern legend: RMW = read-modify-write; Claim = conditional `updateMany` + count gate (the correct house pattern, already used in fulfillmentService.finalizeCompanyWarehouseReservations:249-294 and payFromWallet:26-119).

## 6.1 Findings matrix

| # | Sev | Flow | Transactional? | Defect | Dup/retry risk | Required fix |
|---|---|---|---|---|---|---|
| T1 | CRITICAL | Wallet credit/debit (walletService.js:47-140) | NO | Absolute-value RMW; ledger row separate statement; TOCTOU insufficient-funds | Lost updates; negative balances; balance-without-ledger on crash | One tx: conditional decrement `{balance:{gte:amount}}` + count check + ledger insert; CHECK constraint balance>=0 |
| T2 | CRITICAL | Voucher→cashback cron (autoDiscountService.js:309-393) | Half | Idempotency pre-check outside tx; unconditional update inside | Double cashback on cron overlap | Claim-gate voucher (`status='ACTIVE' AND convertedWalletTxId=null`) |
| T3 | CRITICAL | Kashier subscription webhook (platformSubscriptionController.js:723-886) | Activation only | No signature; idempotency pre-read outside tx; fire-and-forget commissions | Forged/double activation +30d each; no reconciliation for captured-but-pending | Sig verify + status-gated update + PENDING recon sweep |
| T4 | HIGH | Payroll markAsPaid (hr/payrollService.js:628-692) | Yes | Status guard pre-read outside tx; advance deduction RMW | Double pay + double advance deduction | `updateMany where status != PAID` gate; decrement ops |
| T4b | HIGH | Payroll forceRegenerate (:175-179) | NO | deleteMany month w/o status filter → **deletes PAID payroll records** | Irreversible data loss | Exclude PAID |
| T5 | HIGH | Scheduled-order cron (scheduledOrderService.js:6-97) | No | No status filter in eligibility WHERE | Resurrects cancelled/refunded orders | Add status filter |
| T6 | HIGH | Inventory manual adjust (inventoryController.js:885-1056) | Yes | Read-compute-write inside tx; no lock; Math.max(0) absorbs races | Lost stock updates | increment/decrement + conditional WHERE + count check |
| T7 | HIGH | PO receiving (purchaseOrderController.js:363-505) | Per-inventory-row only | 3 separate write units/item (PO qty RMW, product.stock RMW, inventory tx); no idempotency key | Double receiving / PO-inventory divergence | One tx per item + receipt idempotency key |
| T8 | MEDIUM-HIGH | Return review reversals (returnController.js:485-576) | NO | Unguarded isReviewed flip; reversal chain sequential with individual try/catch swallows | Double cashback/points reversal; partial reversal states | `WHERE isReviewed=false` gate; journal + compensation |
| T9 | MEDIUM | Loyalty redeem (customerLoyaltyService.js:672-772) | NO | Points TOCTOU → negative; wallet credit swallowed | Silent cash loss | Count-gated decrement + same-tx wallet credit |
| T10 | MEDIUM | WA journeys (WhatsAppJourneyService.js:189-350) | NO | Send-then-mark; no lease/currentStep guard; enrollment check-then-create | Duplicate step messages every 30-min tick after crash; duplicate ACTIVE journeys | Claim-then-send; unique index on enrollments |
| T11 | MEDIUM | Broadcasts (broadcastSchedulerService.js:70,128,239,602; broadcastController.js:512,846; customerWhatsAppController.js:843-873) | NO | In-proc node-cron + in-memory Map state; no DB claim; recipient marked AFTER send; smart-campaign schedules die with process restarts | Duplicate chargeable WhatsApp sends; silently lost schedules | DB campaign claim + BullMQ delayed jobs + per-recipient idempotency |
| T12 | MEDIUM | Bulk-order execute (bulkOrderService.js:570-639) | NO | Synchronous in-request loop; stuck PROCESSING forever (no resume scanner); successCount wrong; delete = two statements no tx | Stuck batches; split writes | Chunked queue + item cursor + resume |
| T13 | LOW-MED | Customer delete (customerController.js:1667-1758) | Yes | Wallet deleted first; blanket .catch swallows FK failures inside loop; orders/conversations orphaned; no merge flow exists | Ledger orphans; opaque 500s on deleteAllCustomers | Soft-delete/anonymize; ordered cleanup |
| T14 | LOW-MED | Confirmation notify queue (orderConfirmationService.js:1187-1269) | NO | Notify-then-stamp | Duplicate notifications multi-instance | Stamp-then-notify / claim |
| T15 | MEDIUM | Auto-discount voucher burn (orderService.js:365-387; publicOrdersRoutes.js:1387-1395) | NO | Burn before commit; unconditional markUsed | Discount consumed on failed orders; double-use concurrent | Count-gate + release in catch |

## 6.2 Cross-cutting observations

1. **The codebase contains the correct pattern but applies it inconsistently** — payFromWallet, fulfillMerchantOrder (merchantService.js:956-1017), finalizeCompanyWarehouseReservations (conditional decrement + count!==1 rejection) are textbook. Most other money/state paths ignore it.
2. **Idempotency keys absent platform-wide** — no client-supplied idempotency on checkout, webhooks rely on pre-read checks (racy), no processed-event table.
3. **Multi-instance hazard**: everything assumes single instance (in-memory mutexes: broadcastSchedulerService isRunning :128-131, messagingController processedMessages Set, rateLimiter in-memory store). Second PM2 instance or horizontal scale breaks dedup/broadcast/journey semantics.
4. **Fire-and-forget side effects** (setImmediate AI replies allFunctions.js:2157; distributeCommissions :853-856; several notification paths) are unobservable and unretryable on failure — ties into Phase 10.

## 6.3 Operations that can leave partial data (consolidated)
Checkout (guest vs order vs stock vs cashback), kashier webhook activation, payroll generation+rewards linking (applyRewardsToPayroll outside tx, payrollService.js:98-101), PO receiving, return review reversals, journey steps, broadcast recipient cursors, bulk order execution, customer deletion, tag rename/delete loops (Phase 3 P12).
