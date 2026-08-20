# Loyalty Points Auto-Award Fix

**Date**: 2026-08-02
**Domain**: HR — Customer Loyalty
**Type**: Bugfix

## Problem

Loyalty points were never awarded automatically when an order reached `DELIVERED`
status, even with an active `POINTS` loyalty program configured. The points column
stayed empty and no `CustomerLoyaltyRecord` was ever created.

Root cause was a Prisma unique-input name mismatch:

- The schema defines `@@unique([customerId, programId])` on
  `CustomerLoyaltyRecord`, so the generated Prisma client exposes the compound
  unique input as `customerId_programId`.
- The service code referenced the non-existent key `customer_program_unique` in
  every loyalty DB operation.
- Every call threw `Unknown argument customer_program_unique`, and the
  auto-award call in `orderService.updateOrderStatus` wraps the loyalty hook in
  `.catch()`, so the error was swallowed silently and no record/points were written.

## Fix

Replaced `customer_program_unique` with the correct generated name
`customerId_programId` in:

- `apps/backend/services/hr/customerLoyaltyService.js` — 6 sites:
  `enrollCustomer`, `addPoints`, `redeemPoints`, `updateCustomerTier`,
  `applyLoyaltyPointsForOrder`, `adjustPoints`
- `apps/backend/services/cashbackService.js` — 1 site (tier-override lookup)

Verified via the live API that manual `enroll`/`add-points` previously returned
500 with the unknown-argument error; after the fix the correct input name matches
the generated client (`CustomerLoyaltyRecordCustomerIdProgramIdCompoundUniqueInput`).

## Verification

- After deploying, mark an order `DELIVERED` for a customer with an active
  `POINTS` program and confirm a `CustomerLoyaltyRecord` is created with
  `currentPoints` > 0.
- Program rule used in validation: `pointsPerAmount = 100`, `pointsPerPurchase = 1`
  (1 point per 100 EGP of order value).
