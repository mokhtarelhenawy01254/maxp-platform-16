# Auto-Discount Loyalty System (الخصم التلقائي)

**Date**: 2026-08-06
**Domain**: HR — Customer Loyalty
**Type**: Feature

## Overview

A second, switchable loyalty engine: instead of tier-based benefits, each
**delivered** order issues the customer a **% discount voucher** valid for a few
days on the **next** order. If the voucher expires unused, it **auto-converts to
cashback** in the customer's wallet.

Each company picks **one** system at a time (`Company.loyaltySystem` =
`TIERS` | `AUTO_DISCOUNT`). Activating one disables the other. The admin chooses
from the **إعدادات المستويات** tab via a selector; the auto-discount settings
form appears when `AUTO_DISCOUNT` is selected.

## Settings (`Company.loyaltySettings` JSON + `loyaltySystem`)

```jsonc
{
  "system": "AUTO_DISCOUNT",
  "enabled": true,
  "discountPercent": 10,          // خصم الأوردر الجاي
  "validityDays": 3,              // صلاحية الكوبون
  "convertExpiredToCashback": true,
  "pointsPerAmount": 5,           // 5ج لكل نقطة (كل 100ج → 20 نقطة)
  "pointsRedemptionValue": 1,     // كل نقطة = 1ج عند الاستبدال
  "redeemPointsEnabled": true
}
```

## New model: `CustomerLoyaltyVoucher`

Per delivered order → one voucher (`percent`, `amount`, `expiresAt`,
`status: ACTIVE | USED | EXPIRED | CONVERTED | CANCELLED`).

## Flows

- **Delivered order** (`orderService`): if `AUTO_DISCOUNT` active → issue voucher
  (10%, +3 days) instead of the instant cashback program. Points still awarded.
- **Checkout (public order)**: if the customer has an ACTIVE voucher → apply its
  % to the order, mark voucher `USED`, stamp `metadata.autoDiscount.usedVoucherId`.
- **Expiry** (`cron/autoDiscountVoucherCron.js`, every hour): ACTIVE vouchers past
  `expiresAt` → credit `amount` to wallet (`CONVERTED`) or mark `EXPIRED` if
  conversion disabled.
- **Cancel / return**: `reverseVoucherForOrder` cancels vouchers issued by the
  order and restores an ACTIVE voucher that this order consumed.

## API

- `GET  /api/v1/hr/customer-loyalty/system-settings` — current system + settings.
- `PUT  /api/v1/hr/customer-loyalty/system-settings` — pick system + save settings.

## Frontend

- `AutoDiscountSettings.tsx` — settings form (percent, days, convert toggle,
  points rates).
- `TierConfigTab.tsx` — system selector (نظام المستويات / الخصم التلقائي);
  renders the auto-discount form when selected.

## Follow-up (not in this change)

- Points redemption at checkout (1 point = `pointsRedemptionValue` EGP as a
  payment option) — service `redeemPoints` exists; storefront checkout UI not yet
  wired.
