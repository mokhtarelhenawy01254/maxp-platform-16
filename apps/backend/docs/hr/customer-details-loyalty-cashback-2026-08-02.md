# Customer Details: Loyalty Points & Cashback Display

**Date**: 2026-08-02
**Domain**: HR — Customer Loyalty / Wallet
**Type**: Feature

## Overview

Admins can now see a customer's loyalty points and cashback/wallet balance
directly on the customer details page (`/customers/:id`), the page reached from
the eye icon in the customers list.

## Backend

`apps/backend/controller/customerController.js` — `getCustomerDetails` now also
returns:

- `loyalty`: array of `CustomerLoyaltyRecord` rows (points, totalEarned,
  program name/type, tier name, status).
- `wallet`: the customer's active `CustomerWallet` (balance, totalEarned,
  totalSpent, currency), or `null`.
- `cashbackTotal`: sum of `WalletTransaction` rows of type `CASHBACK` for the
  customer's wallet.

## Frontend

`apps/frontend/src/pages/customers/CustomerDetails.tsx`:

- Added two stat cards next to the existing ones:
  - **نقاط الولاء** (total points across loyalty programs)
  - **الكاش باك (رصيد المحفظة)** (cashback total + wallet balance)
- Added a **الولاء والنقاط / المحفظة والكاش باك** block inside the Info tab
  showing per-program points/tier and wallet balance + total cashback.

## Verification

- Open `/customers/:id` for a customer who has a delivered order with the
  loyalty program and cashback configured; both cards and the Info-tab block
  reflect the correct values.
