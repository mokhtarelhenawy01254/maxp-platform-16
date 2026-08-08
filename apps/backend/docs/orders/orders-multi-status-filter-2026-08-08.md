# Multi-Status Filtering on /orders

**Date:** 2026-08-08

## Summary

The `/orders` list now lets a user select **more than one order status** in the
status filter at the same time. The selection combines with OR semantics — an
order shows if it matches *any* of the selected statuses. A manual refresh
button + "last updated" indicator was also added to the page toolbar so users
don't have to hard-refresh the browser.

## Frontend (`apps/frontend/src/pages/orders/`)

- `OrdersFilters.status` changed from `string` to `string[]`.
  - URL round-trip: `?status=CONFIRMED,SHIPPED` (comma-separated). The old
    single-value form (`?status=CONFIRMED`) still parses.
  - localStorage sanitization accepts arrays.
- `OrdersToolbar.tsx` replaces the single `<select>` with a **multi-select
  dropdown** (searchable, checkboxes, select-all / clear-all, trash option)
  built on the existing base-ui `Popover` + `Checkbox` components.
- `FilterChips.tsx` renders **one chip per selected status**, each removable
  independently.
- Refresh UX: a circular refresh button (spins while `loading`) plus a "آخر
  تحديث: HH:MM:SS" label and a live/offline dot driven by the socket
  connection state.
- `src/test/setup.ts` gained a guarded `PointerEvent` polyfill (base-ui
  Popover needs it in jsdom).

## Backend

- **`apps/backend/utils/orderStatusFilter.js`** (new): pure, unit-testable
  parsing of the `status` query value. Owns `PRISMA_ORDER_STATUS_ENUM`,
  `PREP_FILTER_STATUSES`, `TURBO_STATUS_ALIASES`, `isTurboStatusCode`, and
  `parseStatusFilter`. Selected codes are partitioned into:
  - `plainEnumStatuses` — typed Prisma `status: { in: [...] }`
  - `customStatuses` — raw SQL `COALESCE(preparationStatus, status) IN (...)`
  - `turboAliasValues` — `turboShipmentStatus: { in: [...] }`
  - pseudo-statuses `incomplete` / `lost` stay **single-selection only**.
- **`apps/backend/routes/orders.js`** `GET /orders-new/simple`:
  - Accepts `status` as a comma-separated list.
  - Multiple groups combine via `whereClause.OR` (and a mirror `OR` for guest
    orders), so enum + prep + turbo statuses can be mixed.
  - The custom-status raw SQL was generalized from `= $2` to `IN (...)` and now
    merges its ID set into the OR when other status groups are selected.
  - Pagination total uses `order.count` when the filter mixes groups.
- **`apps/backend/services/enhancedOrderService.js`** `GET /orders-enhanced`:
  - `where.status = { in: [...] }` for comma-separated values.

## Tests

- Backend: `tests/utils/orderStatusFilter.test.js` (25 cases) covering single /
  multi / mixed partitions, turbo aliases, unknown codes, and pseudo-statuses.
- Frontend: `OrdersToolbar.test.tsx` (multi-select open/combine/clear + refresh
  button), `FilterChips.test.tsx` (per-status chips), plus the existing orders
  suites still green (20 suites, 93 tests).

## Notes / Limitations

- `incomplete` / `lost` are pseudo-statuses backed by the guest-cart query; they
  cannot be combined with stored statuses in the same filter.
- Prep statuses (e.g. `PREPARING`, `CONFIRMED`, `PENDING`) still route through
  the COALESCE path, matching the previous single-status behavior.
- Enum-named turbo codes (e.g. `delivered`) keep the pre-existing enum-path
  behavior (matching `order.status`), consistent with the old filter.
