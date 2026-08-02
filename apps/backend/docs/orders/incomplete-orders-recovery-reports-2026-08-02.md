# Incomplete Orders Recovery Reports & Phone Filter Fix

Date: 2026-08-02
Area: `orders` — incomplete orders (`/orders/incomplete`)

## Problem

### 1. Empty-phone carts leak into the recovery list

The storefront checkout draft always writes a flat `phone` key into `checkoutData`
(`publicOrdersRoutes.js` — `normalizeCheckoutDraftText` returns `""` when blank).
The old `hasPhone` filter only checked **key presence** in the JSON string:

```js
{ checkoutData: { contains: '"phone"' } }
```

So a cart with `"phone":""` passed the filter, appeared in the UI with "غير محدد"
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

- `routes/orders.js` — `GET /orders-new/incomplete`
  - `hasPhone=true` now requires a **non-empty** phone value:
    key present AND NOT empty-value pattern (`"phone":""`).
  - `hasPhone=false` returns carts with no phone key or only empty phone values.
  - Omit `hasPhone` to get all carts.

- `prisma/schema/orders.prisma` — new model `CartConversionLog`
  (`cart_conversion_logs`) recording:
  - `cartId`, `orderId`, `orderNumber`
  - `employeeId`, `employeeName` (who performed the convert)
  - `companyId`, `cartValue`, `governorate`, `channel` (`admin-convert`)
  - `convertedAt`

- `prisma/schema/core.prisma` — added `cartConversionLogs` back-relation on `Company`.

- `routes/orders.js` — `POST /orders-new/incomplete/:cartId/convert`
  - After a successful internal order creation, writes a `CartConversionLog`
    (captures `req.user.id` + name). Non-fatal if logging fails.

- `routes/orders.js` — new `GET /orders-new/incomplete/reports?days=N`
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
  - Header "التقارير" (Reports) link to `/orders/incomplete/reports`.

- `src/pages/orders/IncompleteReports.tsx` (new page)
  - Period selector (7/30/90 days).
  - Recovery overview cards (converted, recovered value, conversion rate, avg).
  - Pipeline snapshot cards (active/lost carts, recoverable value, total value).
  - Conversion trend bar chart (recharts) + recent conversions list.
  - Team performance table (employee, conversions, recovered value, average).

- `src/App.tsx` — route `/orders/incomplete/reports` registered before `/:cartId`.

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
