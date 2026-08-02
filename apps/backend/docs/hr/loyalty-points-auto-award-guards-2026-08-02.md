# Loyalty Points Auto-Award Guards (dedup, cap, reversal)

**Date**: 2026-08-02
**Domain**: HR — Customer Loyalty / Wallet
**Type**: Bugfix / Hardening

## Problem — missed scenarios

Three gaps existed in the loyalty points flow:

1. **No dedup (double award)** — `applyLoyaltyPointsForOrder` awarded points on
   every `DELIVERED` status change with no per-order guard. Toggling an order
   `DELIVERED → PENDING → DELIVERED` (or re-saving) credited points twice.
   Cashback already had dedup via `walletTransaction`; points did not.

2. **`maxPointsPerTransaction` ignored** — the program field exists but the
   award calculation never capped points by it, so large orders could exceed
   the configured per-order limit.

3. **Points not reversed on return/refund** — cashback had
   `reverseCashbackForReturn` wired into the return-review flow, but points had
   no reversal, so a returned order left the customer with the points.

## Fix

`apps/backend/services/hr/customerLoyaltyService.js`:

- `applyLoyaltyPointsForOrder`
  - Skips when `order.metadata.loyaltyPoints.applied` is already set
    (`reason: 'already_awarded'`).
  - Caps each program award by `program.maxPointsPerTransaction`.
  - Records `metadata.loyaltyPoints` (applied, appliedAt, per-program points)
    so dedup and proportional reversal are possible.
- New `subtractPoints(companyId, customerId, programId, points, reason)` —
  decrements `currentPoints` and increments `totalRedeemed`.
- New `reverseLoyaltyPointsForReturn({ returnRequestId, companyId, changedBy })`
  — reverses points proportional to the refund ratio, guards against double
  reversal, and records the reversal in `order.metadata.loyaltyPoints.reversals`.

`apps/backend/controller/returnController.js`:

- Wired `reverseLoyaltyPointsForReturn` next to `reverseCashbackForReturn` in
  both the manual review (`updateReturnRequest`) and the auto-approve paths.

## Tests

`apps/backend/tests/services/customerLoyaltyService.autoAward.test.js`:

- dedup: second award attempt returns `already_awarded` and does not credit.
- cap: `100000` subtotal with `pointsPerAmount=100` + `maxPointsPerTransaction=500`
  awards exactly `500`.
- reversal: full refund reverses all points and a second call is blocked with
  `already_reversed`.
