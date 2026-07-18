# Order Analytics Breakdown

## Summary
Added `getOrderBreakdown` method to `analyticsService.js` that returns order-level analytics (total count, status distribution, COD vs prepaid split) alongside existing store analytics in the `getStoreAnalytics` response.

## What changed
- New method `getOrderBreakdown(companyId, startDate, endDate)` queries both `Order` and `GuestOrder` tables
- Deduplicates guest orders against regular orders by order number
- Maps OrderStatus enum values (`DELIVERED`, `PROCESSING`, `PENDING`, `CANCELLED`, `REFUNDED`, `RETURNED`, `PARTIALLY_REFUNDED`, `PARTIALLY_RETURNED`, `ON_HOLD`) to frontend-friendly keys (`completed`, `processing`, `pending`, `cancelled`, `refunded`, `on-hold`)
- Adds `totalOrders`, `ordersByStatus`, `codOrders`, `prepaidOrders`, `cancelledOrders`, `rejectedOrders` to the `getStoreAnalytics` return object

## Affected endpoint
`GET /analytics/store` (and `/public/analytics/store`)

## Why
The `/analytics/orders/orders` page was showing all zeros because the frontend expected order-specific fields that the backend didn't return. The existing `getStoreAnalytics` only returned visit/conversion funnel data.

## Performance optimization
Rewrote `getOrderBreakdown` to use Prisma `groupBy` for aggregations (status, paymentMethod) instead of `findMany` + manual counting. Order numbers are still fetched for guest-order dedup, but only the indexed `orderNumber` column (lightweight).

## Period comparison
`getOrderBreakdown` now also computes the same breakdown for the previous period of equal length and returns it as `prevPeriod` (totalOrders, codOrders, prepaidOrders, cancelledOrders). The frontend displays the % change.

## Trend improvements
Frontend now maps `totalPurchases` → `orders` for the trend chart. Weekly/monthly aggregation is computed client-side from daily data. All three views (يومي/أسبوعي/شهري) work correctly.
