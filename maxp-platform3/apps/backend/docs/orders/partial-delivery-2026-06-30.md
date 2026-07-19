# Partial Delivery — Order Details Feature

**Date:** 2026-06-30

## Summary

Added a "Partial Delivery" (تسليم جزئي) option to the Order Details page, allowing
operators to record orders where only a subset of items was delivered to the customer.

## Changed Files

| File | Change |
|------|--------|
| `apps/frontend/src/pages/orders/components/PartialDeliveryModal.tsx` | New modal component for partial delivery |
| `apps/frontend/src/pages/orders/OrderDetails.tsx` | Added button, state, and handler for partial delivery |

## Behaviour

1. A new **"تسليم جزئي"** button appears in the quick-actions bar of every order that
   has at least one item (next to the existing "تأجيل الطلب" button).
2. Clicking the button opens `PartialDeliveryModal`, which lists every line-item with
   `+` / `−` controls to select how many units were actually delivered.
3. On confirmation:
   - **The current order** is updated via `PATCH /orders-new/simple/:orderNumber` to
     contain only the delivered items; its status transitions to `PARTIALLY_RETURNED`.
   - **A new PENDING order** is automatically created via `POST /orders-new/simple`
     containing the undelivered items, with `notes` referencing the originating order
     number (e.g. `مرتجع من الطلب ORD-XXXXXX-XXX`).
4. The UI refreshes the current order page and shows a success toast.

## No Backend Changes Required

This feature is fully implemented on the frontend using existing backend API endpoints:
- `PATCH /orders-new/simple/:orderNumber` — update items & status
- `POST /orders-new/simple` — create new order for returned items
