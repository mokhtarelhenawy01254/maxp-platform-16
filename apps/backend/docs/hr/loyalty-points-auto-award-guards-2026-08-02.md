# Loyalty Points Auto-Award Guards (dedup, cap, reversal)

**Date**: 2026-08-02
**Domain**: HR ΓÇö Customer Loyalty / Wallet
**Type**: Bugfix / Hardening

## Problem ΓÇö missed scenarios

Three gaps existed in the loyalty points flow:

1. **No dedup (double award)** ΓÇö `applyLoyaltyPointsForOrder` awarded points on
   every `DELIVERED` status change with no per-order guard. Toggling an order
   `DELIVERED ΓåÆ PENDING ΓåÆ DELIVERED` (or re-saving) credited points twice.
   Cashback already had dedup via `walletTransaction`; points did not.

2. **`maxPointsPerTransaction` ignored** ΓÇö the program field exists but the
   award calculation never capped points by it, so large orders could exceed
   the configured per-order limit.

3. **Points not reversed on return/refund** ΓÇö cashback had
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
- New `subtractPoints(companyId, customerId, programId, points, reason)` ΓÇö
  decrements `currentPoints` and `totalEarned` (not `totalRedeemed`).
- New `reverseLoyaltyPointsForReturn({ returnRequestId, companyId, changedBy })`
  ΓÇö reverses points proportional to the refund ratio, guards against double
  reversal, and records the reversal in `order.metadata.loyaltyPoints.reversals`.

`apps/backend/controller/returnController.js`:

- Wired `reverseLoyaltyPointsForReturn` next to `reverseCashbackForReturn` in
  both the manual review (`updateReturnRequest`) and the auto-approve paths.

`apps/backend/services/orderService.js`:

- On status `CANCELLED`, the background block now calls
  `reverseCashbackForOrder` and `reverseLoyaltyPointsForOrder` so points and
  cashback awarded at `DELIVERED` are clawed back when a delivered order is
  cancelled outright.

`apps/backend/services/cashbackService.js`:

- New `reverseCashbackForOrder({ orderId, companyId, changedBy })` ΓÇö deducts the
  awarded cashback from the customer wallet on order cancel and guards against
  double reversal via `metadata.cashback.cancelledReversed`.

## Fix: determineTier Decimal comparison bug

`determineTier` compared Prisma `Decimal` fields with `>=`/`<=` directly.
Prisma `Decimal` instances coerce via `valueOf()` to strings, so comparisons
were **lexicographic**, e.g. `"30" >= "100"` was `true`. That made a tier with a
higher `minPoints` (e.g. Platinum 100+) incorrectly match customers with far
fewer points.

Fixed by converting `points`/`minPoints`/`maxPoints` to `Number` before
comparing. Regression tests added in `customerLoyaltyService.autoAward.test.js`
(30ΓåÆGold, 100ΓåÆPlatinum, 10ΓåÆSilver, 5ΓåÆBronze).

## Tests

`apps/backend/tests/services/customerLoyaltyService.autoAward.test.js`:

- dedup: second award attempt returns `already_awarded` and does not credit.
- cap: `100000` subtotal with `pointsPerAmount=100` + `maxPointsPerTransaction=500`
  awards exactly `500`.
- reversal: full refund reverses all points and a second call is blocked with
  `already_reversed`.
- determineTier boundaries: 30ΓåÆGold (not Platinum), 100ΓåÆPlatinum, 10ΓåÆSilver,
  5ΓåÆBronze.
