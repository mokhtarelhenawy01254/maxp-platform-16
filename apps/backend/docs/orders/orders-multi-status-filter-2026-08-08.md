# Multi-Status Filtering on /orders

**Date:** 2026-08-08

## Summary

The `/orders` list now lets a user select **more than one value** in each list
filter at the same time. Every multi-value selection combines with OR semantics ΓÇö
an order shows if it matches *any* of the selected values. A manual refresh
button + "last updated" indicator was also added to the page toolbar so users
don't have to hard-refresh the browser.

## Frontend (`apps/frontend/src/pages/orders/`)

- The following filters changed from a single `string` to `string[]`:
  `status`, `paymentStatus`, `sourceType`, `merchantId`, `affiliateId`,
  `fulfillmentSource`, `merchantOperationStatus`, `merchantSettlementStatus`.
  - URL round-trip is comma-separated (e.g.
    `?status=CONFIRMED,SHIPPED&paymentStatus=completed,failed`).
  - localStorage sanitization accepts arrays.
- New generic component `MultiSelectFilter.tsx` (searchable, checkboxes,
  select-all / clear-all, optional color dot) built on base-ui `Popover` +
  `Checkbox`. It replaces the old single `<select>`s for every list filter in
  `OrdersToolbar.tsx`. The popover uses an **explicit solid background** (the
  app does not define the `--popover` token, so `bg-popover` renders
  transparent ΓÇö the fix avoids a see-through dropdown).
- `FilterChips.tsx` renders **one chip per selected value** for every multi
  filter, each removable independently.
- Refresh UX: a circular refresh button (spins while `loading`) plus a "╪ó╪«╪▒
  ╪¬╪¡╪»┘è╪½: HH:MM:SS" label and a live/offline dot driven by the socket
  connection state.
- `src/test/setup.ts` gained a guarded `PointerEvent` polyfill (base-ui
  Popover needs it in jsdom).

## Backend

- **`apps/backend/utils/orderStatusFilter.js`** (new): pure, unit-testable
  parsing of the `status` query value. Owns `PRISMA_ORDER_STATUS_ENUM`,
  `PREP_FILTER_STATUSES`, `TURBO_STATUS_ALIASES`, `isTurboStatusCode`, and
  `parseStatusFilter`. Selected codes are partitioned into:
  - `plainEnumStatuses` ΓÇö typed Prisma `status: { in: [...] }`
  - `customStatuses` ΓÇö raw SQL `COALESCE(preparationStatus, status) IN (...)`
  - `turboAliasValues` ΓÇö `turboShipmentStatus: { in: [...] }`
  - pseudo-statuses `incomplete` / `lost` stay **single-selection only**.
- **`apps/backend/routes/orders.js`** `GET /orders-new/simple` accepts
  comma-separated values for all list filters:
  - `status` ΓÇö OR across enum / prep / turbo branches (see above).
  - `paymentStatus` ΓÇö `paymentStatus: { in: [...] }`.
  - `sourceType` ΓÇö OR across the per-source conditions (extracted to
    `buildRegularSourceCondition`); guests are excluded unless the only source
    is `storefront`.
  - `merchantId` / `fulfillmentSource` ΓÇö `{ in: [...] }` on `merchantOrders`.
  - `merchantOperationStatus` ΓÇö `{ OR: [buildMerchantOperationWhere(...)] }`.
  - `merchantSettlementStatus` ΓÇö OR across the commission / merchant-order
    conditions (`settlementFilterConditions` pushed as one `{ OR: [...] }`).
  - `affiliateId` ΓÇö `{ in: [...] }` (AFFILIATE-role users are still locked to
    their own affiliate).
- **`apps/backend/services/enhancedOrderService.js`** + route
  `GET /orders-enhanced`: comma support for `status`, `paymentStatus`
  (now actually applied), and `sourceType`.

## Tests

- Backend: `tests/utils/orderStatusFilter.test.js` (25 cases).
- Frontend: `OrdersToolbar.test.tsx` (multi-select open/combine/clear + refresh
  button), `FilterChips.test.tsx` (per-value chips across status + payment
  status + operation status), plus the existing orders suites still green
  (20 suites, 95 tests).

## Notes / Limitations

- `incomplete` / `lost` are pseudo-statuses backed by the guest-cart query; they
  cannot be combined with stored statuses in the same filter.
- Prep statuses (e.g. `PREPARING`, `CONFIRMED`, `PENDING`) still route through
  the COALESCE path.
- The date filter (`timeRange` + custom range) stays single-select by nature.
- The merchant settlement summary bar only loads when exactly **one** merchant
  is selected.

