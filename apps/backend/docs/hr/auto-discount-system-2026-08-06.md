# Auto-Discount Loyalty System (╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è)

**Date**: 2026-08-06
**Domain**: HR ΓÇö Customer Loyalty
**Type**: Feature

## Overview

A second, switchable loyalty engine: instead of tier-based benefits, each
**delivered** order issues the customer a **% discount voucher** valid for a few
days on the **next** order. If the voucher expires unused, it **auto-converts to
cashback** in the customer's wallet.

Each company picks **one** system at a time (`Company.loyaltySystem` =
`TIERS` | `AUTO_DISCOUNT`). Activating one disables the other. The admin chooses
from the **╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬** tab via a selector; the auto-discount settings
form appears when `AUTO_DISCOUNT` is selected.

## Settings (`Company.loyaltySettings` JSON + `loyaltySystem`)

```jsonc
{
  "system": "AUTO_DISCOUNT",
  "enabled": true,
  "discountPercent": 10,          // ╪«╪╡┘à ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º┘ä╪¼╪º┘è
  "validityDays": 3,              // ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘â┘ê╪¿┘ê┘å
  "convertExpiredToCashback": true,
  "pointsPerAmount": 5,           // 5╪¼ ┘ä┘â┘ä ┘å┘é╪╖╪⌐ (┘â┘ä 100╪¼ ΓåÆ 20 ┘å┘é╪╖╪⌐)
  "pointsRedemptionValue": 1,     // ┘â┘ä ┘å┘é╪╖╪⌐ = 1╪¼ ╪╣┘å╪» ╪º┘ä╪º╪│╪¬╪¿╪»╪º┘ä
  "redeemPointsEnabled": true
}
```

## New model: `CustomerLoyaltyVoucher`

Per delivered order ΓåÆ one voucher (`percent`, `amount`, `expiresAt`,
`status: ACTIVE | USED | EXPIRED | CONVERTED | CANCELLED`).

## Flows

- **Delivered order** (`orderService`): if `AUTO_DISCOUNT` active ΓåÆ issue voucher
  (10%, +3 days) instead of the instant cashback program. Points still awarded.
- **Checkout (public order)**: if the customer has an ACTIVE voucher ΓåÆ apply its
  % to the order, mark voucher `USED`, stamp `metadata.autoDiscount.usedVoucherId`.
- **Expiry** (`cron/autoDiscountVoucherCron.js`, every hour): ACTIVE vouchers past
  `expiresAt` ΓåÆ credit `amount` to wallet (`CONVERTED`) or mark `EXPIRED` if
  conversion disabled.
- **Cancel / return**: `reverseVoucherForOrder` cancels vouchers issued by the
  order, reverses a converted voucher's wallet cashback, restores an ACTIVE
  voucher that this order consumed, and `restoreRedeemedPointsForOrder` returns
  the points the customer paid with (stored in `metadata.pointsRedemption` on
  both the guest order and the primary order).

## API

- `GET  /api/v1/hr/customer-loyalty/system-settings` ΓÇö current system + settings.
- `PUT  /api/v1/hr/customer-loyalty/system-settings` ΓÇö pick system + save settings.

## Frontend

- `AutoDiscountSettings.tsx` ΓÇö settings form (percent, days, convert toggle,
  points rates).
- `TierConfigTab.tsx` ΓÇö system selector (┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ / ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è);
  renders the auto-discount form when selected.

## Follow-up (not in this change)

- ~~Points redemption at checkout~~ ΓåÆ **Done**: storefront `redeemPoints` flag;
  backend (public order) deducts `min(points, floor(total/value))` and applies
  `pointsUsed ├ù pointsRedemptionValue` to the final total; stamped in
  `metadata.pointsRedemption` and echoed in the response
  (`pointsRedemptionApplied`, `pointsUsed`, `pointsValue`). UI toggle shown in
  `PaymentSection` when the customer has points.
