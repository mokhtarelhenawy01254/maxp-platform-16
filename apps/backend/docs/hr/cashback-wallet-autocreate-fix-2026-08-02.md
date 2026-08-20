# Cashback Auto-Create Wallet Fix

**Date**: 2026-08-02
**Domain**: HR ΓÇö Customer Loyalty / Wallet
**Type**: Bugfix

## Problem

Cashback was never applied to orders placed through the public storefront
(checkout / COD). `applyCashbackForPaidOrder` calls
`WalletService.addCashback` ΓåÆ `addToWallet`, which threw
`Wallet not found` when the customer had no `CustomerWallet` row, and the
error was swallowed by the `.catch()` in `orderService.updateOrderStatus`.

Root cause: the public checkout flow creates customers via
`prisma.customer.create` in `publicOrdersRoutes.js` **without** creating a
wallet (unlike `customerController.createCustomer`, which calls
`WalletService.createWallet`). As a result any storefront-created customer had
no wallet, so cashback silently failed. Loyalty *points* still worked because
`applyLoyaltyPointsForOrder` does not depend on the wallet.

## Fix

`apps/backend/services/walletService.js` ΓÇö `addToWallet` now auto-creates a
wallet for the customer when none exists (resolving `companyId` from the
customer record and delegating to `WalletService.createWallet`), instead of
throwing `Wallet not found`. This makes cashback (and any other wallet credit)
work for every customer regardless of how they were created, including legacy
customers who predate wallet creation.

## Verification

- Regression tests added: `apps/backend/tests/services/walletService.autoCreate.test.js`
  - credits a new wallet after auto-creating it when the customer has none
  - reuses the existing wallet when present
- Manual check: place an order through `{slug}.maxp.online` checkout, mark it
  `DELIVERED`, and confirm the order metadata contains
  `cashback: { applied: true, percent, amount }` and a `CASHBACK` wallet
  transaction was created.
