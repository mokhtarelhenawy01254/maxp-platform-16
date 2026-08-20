# Configurable Customer Tier Calculation + Per-Customer Benefits

**Date**: 2026-08-05
**Domain**: HR — Customer Loyalty / Tiers
**Type**: Feature

## Overview

Admins can now choose **how a customer's tier is calculated** and define
**benefits per tier**, plus assign custom benefits to a specific customer.
Configured from a new **إعدادات المستويات** tab in the Segmentation hub
(`/customers/segments`).

## Three calculation methods

Each loyalty tier has a `calculationType`:

- `POINTS` — based on loyalty points (`currentPoints`).
- `SPENT` — based on total money paid on **DELIVERED** orders.
- `ITEMS` — based on total quantity of pieces on **DELIVERED** orders.

Each tier stores the thresholds for its method (`minPoints/maxPoints`,
`minSpent/maxSpent`, `minItems/maxItems`).

## Company default + per-customer override

- `CustomerLoyaltyProgram.defaultTierMethod` — company-wide default (defaults to
  `POINTS`).
- `Customer.tierMethod` — per-customer override; when set it wins over the
  program default.
- Resolution order: `customer.tierMethod` → `program.defaultTierMethod` →
  `POINTS`.

## Benefits

Both tiers (`CustomerLoyaltyTier.benefits`) and per-customer overrides
(`Customer.tierBenefits`) store a JSON object:
`{ freeShipping, discountPercent, priorityShipping, customText }`.

## Backend

`apps/backend/prisma/schema/products.prisma`:

- `CustomerLoyaltyTier`: added `calculationType`, `minSpent`, `maxSpent`,
  `minItems`, `maxItems`; `minPoints` now optional.
- `CustomerLoyaltyProgram`: added `defaultTierMethod`.
- `Customer`: added `tierMethod`, `tierBenefits`.

`apps/backend/services/hr/customerLoyaltyService.js`:

- `determineTier(companyId, programId, metricValue, method)` — matches only
  tiers of the given `calculationType`, converts Decimals to `Number`.
- `resolveTierMethod`, `computeTierMetric` (points / delivered total / delivered
  item quantity).
- `updateCustomerTier` / `enrollCustomer` now resolve the customer's method and
  compute the correct metric.
- `createTier` / `updateTier` accept the new fields.
- New `getTierConfig`, `updateDefaultTierMethod`, `getCustomerTierOverride`,
  `updateCustomerTierOverride`.

`apps/backend/controller/customerLoyaltyController.js` + routes:

- `GET/PUT /hr/customer-loyalty/tier-config`
- `GET/PUT /hr/customer-loyalty/customers/:customerId/tier-override`

## Frontend

`apps/frontend/src/pages/customers/TierConfigTab.tsx` (new) added as an
**إعدادات المستويات** tab in `CustomerSegments.tsx`:

- Program selector + company default method.
- Tier editor: name, calculation type, method thresholds, benefits
  (free shipping, priority shipping, discount %, custom text).
- Per-customer: search by phone → set method override + benefits.

## Tests

`customerLoyaltyService.autoAward.test.js` — `determineTier` for `POINTS`
boundaries, `SPENT` thresholds, `ITEMS` thresholds, and that only tiers of the
requested `calculationType` match.

## Security & regression fixes applied during review

- Per-customer tier override endpoints (`get/updateCustomerTierOverride`) and
  `resolveTierMethod` are scoped by `companyId` (tenant isolation).
- `enrollCustomer` keeps using the passed `initialPoints` for the `POINTS`
  method (regression fix); other methods use `computeTierMetric`.
- Existing tier-benefit consumers (`LoyaltyTiers.tsx`) normalize benefits
  between the old array format and the new object format.
- `getCustomerActiveRewards` now merges the customer's current **tier benefits**
  and **per-customer override benefits** so they are available to order logic.

## Known follow-up

The configured benefits (`freeShipping`, `discountPercent`,
`priorityShipping`) are stored and exposed via `getCustomerActiveRewards`, but
applying them inside checkout/shipping/order-total logic is a separate
integration step not included here.
