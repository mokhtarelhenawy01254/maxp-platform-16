# Order Analytics Guest Order Field Fix (2026-10-11)

## Summary
Fixed a 500 Internal Server Error in `/reports/orders-detailed` caused by querying `paymentStatus: true` on `prisma.guestOrder.findMany`. The `GuestOrder` schema in PostgreSQL does not have a `paymentStatus` column, which triggered `PrismaClientValidationError` and led to zeroed-out analytics dashboards (`/orders/analytics`).

## Changes
1. **`apps/backend/controller/reportsController.js`**:
   - Removed `paymentStatus: true` from `prisma.guestOrder.findMany` select clause.
   - Preserved fallback payment status resolution (`guest.paymentStatus || 'PENDING'`).

2. **`apps/backend/tests/controller/reportsController.test.js`**:
   - Added assertion verifying that `mockPrisma.guestOrder.findMany` is not called with `paymentStatus: true`.

3. **`apps/frontend/src/pages/orders/analytics/useOrdersAnalyticsData.ts`**:
   - Hardened error handling so that when order stats fail, user-facing error state is populated instead of silently leaving all counters at 0.
