# PHASE 5 — BUSINESS LOGIC AUDIT (flows, state machines, races)

## 5.1 Order state machine reality check

Statuses observed in code: PENDING…DELIVERED, CANCELLED, PENDING_CANCELLATION, TRASH, DUPLICATE_ORDER, WOO_TAGHEZ, SCHEDULED, SHORTAGE/FAILED, RETURNED/PARTIALLY_RETURNED, PARTIALLY_DELIVERED, REFUNDED/PARTIALLY_REFUNDED, RESTORE pseudo-status, + arbitrary custom codes via customStatusCode/mapsToSystem.

**Enforced rules (CONFIRMED):**
- allowedNextStatuses table only if merchant configured it; null = allow-all; skipped on isOverride/skipTransitionValidation (orderService.js:175-209, 1204-1211)
- call-attempt ≥3 guard before failure statuses (:115-134), bypassable via skipCallAttemptGuard
- PENDING_CANCELLATION blocks scanner progression (:1142-1147); late-cancel intercept (:1094-1109); DELIVERED downgrade block in turbo sync ONLY (turboStatusSyncService.js:345-352)

**NOT enforced (CONFIRMED):** TRASH→anything; any→TRASH→any; DELIVERED↔CANCELLED ping-pong (each hop fires cashback apply/reverse jobs). Kashier webhook (kashierRoutes.js:242-253) and COD deposit confirm (codDepositService.js:210-223) write status/paymentStatus via raw `order.update` bypassing ALL rules. Turbo sync uses isOverride=true unconditionally (:424). **Effective invariant = last write wins.**

## 5.2 Order creation flow — partial failure map

Flow: publicOrdersRoutes checkout → enhancedOrderService.createEnhancedOrder → getNextSequentialOrderNumber → createOrderItems → stock decrement → loyalty/cashback → shipping/Turbo check → notifications.
- FLOW-1 HIGH CONFIRMED: GuestOrder↔Order split-brain on partial failure (guest record written separately; failure mid-flow leaves guest without order or vice versa).
- FLOW-2 HIGH CONFIRMED: Stock oversell TOCTOU — decrement is read-modify-write, no conditional update; `Math.max(0,…)` clamping silently absorbs oversell (inventoryController.js:998-999).
- FLOW-3 HIGH CONFIRMED: `x-admin-convert` bypass reachable from PUBLIC order routes (publicOrdersRoutes.js:969/1080/1898-1938).
- FLOW-4 CRITICAL CONFIRMED: Kashier checkout trusts client-supplied subtotal/total (`Number(total) || computed`, kashierRoutes.js:79-81) — pay-what-you-want.
- No idempotency key anywhere on checkout — double-submit creates two orders (both charged).

## 5.3 Wallet / cashback / loyalty

- WALLET-1 CRITICAL: addToWallet/deductFromWallet are RMW outside tx (walletService.js:47-140) — lost updates, negative balance TOCTOU (details Phase 6).
- WALLET-2 HIGH CONFIRMED: Cashback double-credit race — cashback apply/reverse guarded by metadata flag checked BEFORE write (cashbackService.js reverseCashbackForReturn :274-302); concurrent invocations double-debit; swallowed debit failures leave permanent under-collection (:332-336).
- WALLET-3 HIGH CONFIRMED: Loyalty redeemPoints — no `currentPoints >= points` WHERE clause → negative points under concurrency; wallet credit outside tx with errors SWALLOWED (customerLoyaltyService.js:697-744); expiry processor sets points=0 absolutely from stale read (:1404-1415).
- WALLET-4 CRITICAL CONFIRMED: Voucher→wallet conversion idempotency pre-check OUTSIDE tx, unconditional update inside → double cashback on cron overlap (autoDiscountService.js:309-393); convertedWalletTxId has no unique constraint (products.prisma:583-608).
- WALLET-5 MEDIUM: Auto-discount voucher burned before order commit; concurrent orders both consume the same ACTIVE voucher; failure path never releases (orderService.js:365-387; markVoucherUsed unconditional autoDiscountService.js:297-304).

## 5.4 Payments

- PAY-1 CRITICAL: Platform subscription webhook unauthenticated + non-atomic idempotency (pre-read outside tx) → forged activation AND double activation/+30d extension on retry; commissions fired twice (platformSubscriptionController.js:723-886). No reconciliation job for payment-succeeded-but-update-failed.
- PAY-2 CRITICAL: Kashier webhook unsigned (Phase 4 S2); replay credits wallet repeatedly.
- Positive control: payFromWallet IS fully transactional (platformSubscriptionController.js:26-119) — house pattern to copy.

## 5.5 Webhook/AI reply pipelines

- WB-1 HIGH CONFIRMED: FB message dedup = findFirst on JSON metadata substring (allFunctions.js:1765-1812) → concurrent BullMQ workers (concurrency 20) double-insert same Meta-retried message; substring match false-positives; in-memory dedup Set is process-local and absent in webhookWorker process.
- WB-2 HC HIGH: Duplicate AI replies — AI pipeline runs detached via setImmediate fire-and-forget (:2156-2373); concurrent duplicate inbound messages each spawn independent debounced generation → two Messenger replies.
- WB-3 HC MEDIUM: Suppression race — human takeover/aiEnabled flip during LLM generation doesn't stop the stale send (flag checked at result time only :2232-2243); working-hours gate evaluated at trigger not send.
- WB-4 MEDIUM-HIGH CONFIRMED: Turbo sync lacks CANCELLED terminal guard and event ordering — stale/out-of-order webhooks resurrect cancelled orders or regress statuses (turboStatusSyncService.js:394-426). GuestOrder branch double-writes status (bypassing history path :211-250).
- Read receipts idempotent ✔ (updateMany, webhookService.js:35-90).

## 5.5 Scheduled/background semantics

- SCH-1 HIGH: Scheduled-order cron has NO status filter → resurrects CANCELLED/REFUNDED/TRASH orders to CONFIRMED when date passes (scheduledOrderService.js:6-97). Crash-safe marking itself OK (stamp written with transition).
- SCH-2 MEDIUM: Confirmation notify queue notifies THEN stamps confirmationNotifiedAt → duplicates on crash/multi-instance (orderConfirmationService.js:1187-1269). Round-robin assignment pointer read-then-write → same user picked concurrently (:1053-1133). Guest variant non-transactional vs regular transactional (inconsistent).
- Positive: orderStatusAutoChangeCron uses self-excluding updatedAt<=cutoff pattern (cron/orderStatusAutoChangeCron.js:52-110) — correct crash semantics, copy this.

## 5.6 Invalid-transition summary table (Order)

| From | Illegal-but-possible transitions | Guard |
|---|---|---|
| TRASH | → any status incl. DELIVERED | none |
| CANCELLED | → SHIPPED/PREPARING etc. (turbo stale events) | none (only DELIVERED protected) |
| DELIVERED | → CANCELLED → DELIVERED loop w/ cashback churn | none |
| customStatusCode | arbitrary mapsToSystem writes | merchant config optional |
