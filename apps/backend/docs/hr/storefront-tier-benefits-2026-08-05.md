# Storefront Tier Benefits: Display, Progress & Auto-Apply

**Date**: 2026-08-05
**Domain**: HR — Customer Loyalty / Storefront Checkout
**Type**: Feature

## Overview

Customers now **see and benefit from** their loyalty tier inside the storefront
checkout:

1. **See it** — a tier banner shows the customer's current level, its benefits,
   and progress to the next level ("فاضل X نقطة وتترقى لمستوى كذا وتحصل على...").
2. **Benefit automatically** — free shipping and the tier discount % are applied
   automatically when the order is created (no coupon code needed).

## ORDER_COUNT method (4th calculation method)

Tiers can now be calculated by **number of DELIVERED orders**:

- `calculationType: "ORDER_COUNT"` reuses `minItems/maxItems` for thresholds.
- `computeTierMetric` counts DELIVERED orders via `prisma.order.aggregate`.
- `resolveTierMethod`, `updateDefaultTierMethod` and the override update accept
  `ORDER_COUNT`.
- TierConfigTab exposes a new option "بعدد الأوردرات" and renders
  "الحد الأدنى/الأقصى (أوردرات)" for it.

## Public tier-progress endpoint

`GET /api/v1/public/loyalty/tier-progress?phone=...` (new `publicLoyaltyRoutes.js`,
mounted at `/api/v1/public/loyalty`; automatically public via `GET/POST /api/v1/public/*`
allowlist; resolves the company via subdomain middleware with `?companyId=` fallback).

Returns (or `data: null` if the phone has no customer):

```jsonc
{
  "method": "POINTS" | "SPENT" | "ITEMS" | "ORDER_COUNT",
  "metricLabel": "نقطة" | "ج.م" | "قطعة" | "أوردر",
  "currentMetric": 40,
  "tier": { "id", "name", "nameAr", "color", "icon", "benefits" },
  "nextTier": { "id", "name", "nameAr", "targetMetric", "remainingMetric", "benefits" },
  "rewards": { "freeShipping": false, "discountPercent": 10 }
}
```

Built by new `customerLoyaltyService.getCustomerTierProgress(companyId, customerId)`.

## Server-side auto-apply at storefront checkout

In `publicOrdersRoutes.js` `POST /` (public order creation), after the coupon and
store-promotion discounts:

- The customer is resolved by `guestPhone` via `findCustomerByPhone`.
- `getCustomerActiveRewards` + `getCustomerTierProgress` give the effective rewards.
- `rewards.freeShipping` → shipping set to 0 (`freeShippingAdjustment.source = "loyalty_tier"`).
- `rewards.discountPercent` → `loyaltyDiscount = cartTotal * pct / 100`, added to
  the running `discountAmount`.
- Both are stamped into `orderMetadata.loyalty`
  (`tierName`, `tierNameAr`, `discountPercent`, `discountAmount`, `freeShipping`)
  and echoed in the response (`loyaltyDiscount`, `loyaltyFreeShipping`, `loyaltyTierName`).

The server is the source of truth: the frontend only previews the numbers.

## Frontend (storefront)

- `useCheckoutStore` gained `tierProgress` state + `setTierProgress`.
- `storefrontApi.getTierProgress(phone)` calls the public endpoint (with `companyId`
  query fallback).
- `hooks/useTierProgress.ts` fetches on a valid Egyptian phone and clears on invalid.
- `components/TierProgressBanner.tsx` renders the tier pill + progress message
  ("فاضل X {نقطة/ج.م/قطعة/أوردر} وتترقى لمستوى ... وتحصل على ...").
- `CheckoutForm` fetches tier-progress when the phone field loses focus and shows
  the banner.
- `OrderSummary` + `PaymentSection` show the banner, apply free shipping in the
  summary (shipping = 0 / "مجاني (مستوى الولاء)"), and render a
  "خصم مستوى {name} ({pct}%)" row. Totals account for `effectiveShipping` and
  `loyaltyDiscount`.

## Docs

- `tier-calculation-config-2026-08-05.md` — the configurable methods/benefits feature.
