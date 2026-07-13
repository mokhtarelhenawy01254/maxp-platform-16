# Turbo Shipment Unlink - 2026-05-03

## Summary

Added a local Turbo unlink action for order details. This is separate from cancelling a shipment at Turbo.

## Behavior

- `POST /api/v1/turbo/orders/:orderId/unlink` clears saved Turbo fields from the MaxP order:
  - `turboShipmentId`
  - `turboTrackingNumber`
  - `turboShipmentStatus`
  - `turboLabelUrl`
  - `turboMetadata`
  - `turboBranchId` for regular orders
- The endpoint supports regular `Order` rows and `GuestOrder` rows.
- The endpoint does not call Turbo's external API and does not cancel a live shipment.
- The frontend shows `إلغاء ربط Turbo` on linked, non-delivered Turbo shipments so an operator can return the order to the pre-link state and create/link a new shipment if needed.

## Verification

- Backend regression coverage: `backend/tests/controller/turboController.cancelShipment.test.js`.
- Frontend regression coverage: `frontend/src/pages/orders/components/TurboShippingPanel.test.tsx`.
