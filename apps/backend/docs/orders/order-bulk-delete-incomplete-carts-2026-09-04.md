# Incomplete Carts Bulk Delete Support - 2026-09-04

## Problem

When merchants have the setting `showIncompleteCartsInOrders` enabled, abandoned checkouts / incomplete carts from `guest_carts` are displayed as rows in the main orders list (`/orders`). When selecting these incomplete carts and triggering bulk deletion, `/api/v1/orders-new/bulk/delete` failed with `404: الطلب غير موجود` because the deletion logic only queried `orders` and `guest_orders`, omitting `guest_carts`. Furthermore, the frontend `handleBulkDelete` did not validate individual `results` and gave a false success notification while the rows remained visible.

## Fix

- `permanentlyDeleteIncompleteCart` helper added to find and delete `guestCart` records by `id` or `cartId` within the merchant's company.
- `updateAnyOrderStatus` updated to support `TRASH` moves for incomplete carts by deleting them from `guestCart` so they are immediately cleared from the active orders view.
- `permanentlyDeleteAnyOrder` updated to fall back to `permanentlyDeleteIncompleteCart`.
- `POST /api/v1/orders-new/bulk/delete` now counts deleted carts in `data.cartDeleted` and factors them into `data.successCount`.
- Frontend `handleBulkDelete` updated in `Orders.tsx` to validate `successCount` and display accurate failure messages when individual items cannot be deleted.

## Verification

- Added integration test in `ordersGuestTotals.test.js` validating that `POST /bulk/delete` deletes incomplete carts and removes them from `guestCart`.
- Verified backend syntax passes with `npm run check:syntax`.
