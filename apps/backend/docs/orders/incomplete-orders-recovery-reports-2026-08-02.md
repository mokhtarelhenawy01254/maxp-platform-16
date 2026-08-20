# Incomplete Orders Recovery Reports & Phone Filter Fix

Date: 2026-08-02
Area: `orders` ΓÇö incomplete orders (`/orders/incomplete`)

## Problem

### 1. Empty-phone carts leak into the recovery list

The storefront checkout draft always writes a flat `phone` key into `checkoutData`
(`publicOrdersRoutes.js` ΓÇö `normalizeCheckoutDraftText` returns `""` when blank).
The old `hasPhone` filter only checked **key presence** in the JSON string:

```js
{ checkoutData: { contains: '"phone"' } }
```

So a cart with `"phone":""` passed the filter, appeared in the UI with "╪║┘è╪▒ ┘à╪¡╪»╪»"
phone, and had its call/WhatsApp/convert actions disabled.

### 2. No way to measure recovery (conversions + team performance)

- `GuestCart` had no link to the real order created by `convert`.
- The convert endpoint (`POST /orders-new/incomplete/:cartId/convert`) creates an
  order through the internal public orders API, which **deletes the GuestCart row**
  after success (`publicOrdersRoutes.js` `shouldDeleteCart`).
- Because the cart is deleted, there was no durable record to count conversions,
  compute a conversion rate, or attribute recovered revenue to an employee.

## Changes

### Backend

- `routes/orders.js` ΓÇö `GET /orders-new/incomplete`
  - `hasPhone=true` now requires a **non-empty** phone value:
    key present AND NOT empty-value pattern (`"phone":""`).
  - `hasPhone=false` returns carts with no phone key or only empty phone values.
  - Omit `hasPhone` to get all carts.

- `prisma/schema/orders.prisma` ΓÇö new model `CartConversionLog`
  (`cart_conversion_logs`) recording:
  - `cartId`, `orderId`, `orderNumber`
  - `employeeId`, `employeeName` (who performed the convert)
  - `companyId`, `cartValue`, `governorate`, `channel` (`admin-convert`)
  - `convertedAt`

- `prisma/schema/core.prisma` ΓÇö added `cartConversionLogs` back-relation on `Company`.

- `routes/orders.js` ΓÇö `POST /orders-new/incomplete/:cartId/convert`
  - After a successful internal order creation, writes a `CartConversionLog`
    (captures `req.user.id` + name). Non-fatal if logging fails.

- `routes/orders.js` ΓÇö new `GET /orders-new/incomplete/reports?days=N`
  (registered **before** `/incomplete/:cartId` to avoid route capture). Returns:
  - `pipeline`: current snapshot `total / active / lost / totalValue / activeValue / lostValue`
  - `recovery`: `converted`, `convertedValue`, `avgConvertedValue`, `recoveryRate`
  - `team`: per-employee `conversions`, `value`, `avgValue` (sorted by value)
  - `trend`: daily conversions + value over the period
  - `recent`: last 20 conversions with order number, employee, value, governorate

### Frontend

- `src/pages/orders/IncompleteOrders.tsx`
  - New tri-state phone filter: `with_phone` (default) / `no_phone` / `all`,
    mapped to `hasPhone=true|false|omitted`.
  - Header "╪º┘ä╪¬┘é╪º╪▒┘è╪▒" (Reports) link to `/orders/incomplete/reports`.

- `src/pages/orders/IncompleteReports.tsx` (new page)
  - Period selector (7/30/90 days).
  - Recovery overview cards (converted, recovered value, conversion rate, avg).
  - Pipeline snapshot cards (active/lost carts, recoverable value, total value).
  - Conversion trend bar chart (recharts) + recent conversions list.
  - Team performance table (employee, conversions, recovered value, average).

- `src/App.tsx` ΓÇö route `/orders/incomplete/reports` registered before `/:cartId`.

- i18n: new `orders.incomplete*` keys in `locales/ar` and `locales/en`.

### Tests

- `apps/backend/tests/integration/incompleteOrdersRoute.test.js`
  - `hasPhone=true` excludes carts with empty phone values.
  - `hasPhone=false` returns only carts without a usable phone.
  - convert records a `CartConversionLog` with the acting employee.
  - `/incomplete/reports` returns pipeline, recovery, team and trend.

## Deployment note

The deploy pipeline runs `prisma db push --schema=prisma/schema` on the server, so
the new `cart_conversion_logs` table is created automatically on deploy. No manual
migration is required.

## Rollback

- Reverting the `hasPhone` behavior: restore the old key-presence-only filter.
- Reverting tracking: the `CartConversionLog` writes are non-fatal; removing the
  model requires dropping the `cart_conversion_logs` table.

## Status tabs (incomplete vs lost) + accurate status logic

### Problem

The `active`/`lost` classification was computed with `OR` clauses that could
classify the same cart as **both** active and lost. For example a cart that
`checkoutStartedAt` 3 days ago but `checkoutUpdatedAt` 1 hour ago (customer came
back) matched the old `lostClause` (because `checkoutStartedAt < threshold`) even
though it had recent activity. This made tab counts double-count and misclassify
returning customers as lost.

Also, the server-side `stats` were scoped to the active status filter, so switching
tabs would change the counts, making stable tab badges impossible.

### Changes

- `routes/orders.js` ΓÇö `GET /orders-new/incomplete` and `/incomplete/reports`:
  - `activeClause` / `lostClause` now follow the per-row `lastActivity` rule
    (`COALESCE(checkoutUpdatedAt, checkoutStartedAt, updatedAt)`):
    - active = recent checkoutUpdatedAt, OR (null checkoutUpdatedAt AND recent
      checkoutStartedAt), OR (both null AND recent updatedAt).
    - lost = the exact negation (old timestamps), so active + lost are mutually
      exclusive and exhaustive.
  - The list query still applies the selected `status` filter, but the `stats`
    aggregates are computed from the base filters **without** the status filter,
    so `active`/`lost` tab counts stay stable while switching tabs.

### How returning customers behave

Cart status is **not stored** ΓÇö it is derived at query time from the last-activity
timestamp versus `incompleteOrderLostAfterHours` (default 24h). The storefront
checkout-draft save always sets `checkoutUpdatedAt = now`
(`publicOrdersRoutes.js`), so:

- A customer returns and updates checkout ΓåÆ `checkoutUpdatedAt` refreshes ΓåÆ the
  cart is classified **active** again automatically (moves from "lost" to
  "incomplete"). This is observable in the "╪ó╪«╪▒ ┘å╪┤╪º╪╖" column.
- A customer never returns ΓåÆ the cart stays **lost**.
- A customer places the order ΓåÆ the cart is converted to a real order and removed
  (the GuestCart row is deleted by the internal create-order flow).

### Frontend

- `src/pages/orders/IncompleteOrders.tsx`: the status filter dropdown was replaced
  with two tabs **╪║┘è╪▒ ┘à┘â╪¬┘à┘ä / ┘à┘ü┘é┘ê╪»**, each with a live count badge fed by the
  global `stats.active` / `stats.lost`. Default tab is **╪║┘è╪▒ ┘à┘â╪¬┘à┘ä** (active).

### Tests

- `apps/backend/tests/integration/incompleteOrdersRoute.test.js` ΓÇö new describe
  "Incomplete orders status tabs (active vs lost)":
  - `status=active` returns a cart updated recently even when it started long ago.
  - `status=lost` returns only carts with no recent activity.
  - stats do not double-count (`active + lost === total`).

## Natural conversions, contact tracking & priority list

### 1. Natural checkout conversions are now logged

Previously only admin `convert` actions were logged in `CartConversionLog`. When a
customer completed checkout on their own, the cart was deleted but never recorded,
understating recovery. Now `publicOrdersRoutes.js` logs a `CartConversionLog` with
`channel: 'natural'` (no employee) when a cart is deleted through the normal checkout
flow. Requests carrying `x-admin-convert` are skipped (already logged by the convert
endpoint). The recovery report now breaks down `recovery.byTeam` vs `recovery.natural`.

### 2. Contact tracking (team outreach)

- New model `CartContactLog` (`cart_contact_logs`): `cartId`, `companyId`,
  `employeeId`, `employeeName`, `method` (call/whatsapp/email), `result`
  (answered/no_reply/busy/wrong_number), `note`, `createdAt`.
- New endpoint `POST /orders-new/incomplete/:cartId/contact` ΓÇö records an outreach
  attempt (captures `req.user`).
- Reports `team` section now includes per-employee `contacts`, `responses`
  (result = answered) and `responseRate` (responses / contacts), in addition to
  conversions and recovered value. Natural conversions are excluded from team stats.

### 3. Priority recovery list

- `GET /orders-new/incomplete` supports `sortBy=priority` which orders by
  `total DESC, checkoutUpdatedAt ASC` ΓÇö highest-value carts first, and among equal
  value the most stale (closest to being lost) first.
- The incomplete orders page adds a "Priority" sort option (default) and a
  **Log contact** action per row that opens a small modal (method / result / note).

### Frontend

- `src/pages/orders/IncompleteOrders.tsx` ΓÇö "Log contact" button + modal.
- `src/pages/orders/IncompleteReports.tsx` ΓÇö byTeam/natural breakdown chips and team
  contacts/responses/response-rate columns.

## Report period range (presets + custom)

`GET /orders-new/incomplete/reports` now supports either:

- `days=N` ΓÇö last N days (default 30), or
- `from=YYYY-MM-DD&to=YYYY-MM-DD` ΓÇö a custom inclusive date range (`to` covers the
  whole day up to 23:59:59.999). When `from` is provided it takes precedence over
  `days`.

The response includes `from` / `to` (resolved timestamps) and `periodDays` (null for
a custom range). The reports page offers presets (7/14/30/90/365 days) plus a
"custom period" option with from/to date pickers.
