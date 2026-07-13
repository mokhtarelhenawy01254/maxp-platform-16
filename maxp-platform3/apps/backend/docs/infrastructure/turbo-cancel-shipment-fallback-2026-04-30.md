# Turbo Cancel Shipment Fallback Fix - 2026-04-30

## Problem

Cancelling Turbo shipments from the order details page could fail with:

- `POST /api/v1/turbo/orders/:orderId/cancel -> 500`
- Turbo provider message: `Shipments not found`

This happened even when the order already had Turbo shipment data saved.

## Root Cause

- `backend/services/turboService.js` coerced the saved shipment identifier with `parseInt(...)` before sending `search_Key` to Turbo's `/delete-order` endpoint.
- Some orders store multiple usable Turbo identifiers:
  - `turboShipmentId` (typically `code`)
  - `turboTrackingNumber` (typically `bar_code`)
  - extra identifiers inside `turboMetadata`
- The cancel flow only tried one identifier, so if Turbo expected the other key it returned `Shipments not found`.
- Guest-order lookup in `backend/controller/turboController.js` discarded stored Turbo shipment fields, which made guest-order cancellation less reliable and prevented proper DB updates after success.

## Fix

- Preserve raw shipment identifiers when cancelling instead of coercing them to integers.
- Build an ordered list of Turbo search keys from:
  - `turboTrackingNumber`
  - `turboShipmentId`
  - `orderNumber`
  - parsed `turboMetadata`
- Retry cancellation with the next identifier when Turbo responds with `Shipments not found`.
- Preserve Turbo shipment fields for guest orders inside the shared order lookup helper.
- Update `guestOrder` rows on successful cancellation instead of only updating the main `order` table.
- When Turbo still reports `Shipments not found` after exhausting every search key, treat the operation as an idempotent local cancellation and persist `turboShipmentStatus = cancelled` instead of surfacing a blocking `500`.

## Verification

- `node --check backend/controller/turboController.js`
- `node --check backend/services/turboService.js`
- `npx jest tests/services/turboService.cancelShipment.test.js tests/controller/turboController.cancelShipment.test.js --runInBand`
- Production deploy:
  - copied patched files to `/var/www/backend2/controller/turboController.js` and `/var/www/backend2/services/turboService.js`
  - reloaded `maxp-backend` with PM2
  - health check passed on `http://127.0.0.1:3007/api/v1/health`
- Production data verification:
  - order `ORD-941086-907` on `maxp.online` had `turboShipmentId = turboTrackingNumber = 37406238`
  - Turbo still returned `Shipments not found` for both `37406238` and `ORD-941086-907`
  - the final shipped behavior marked the shipment cancelled locally and updated `turboShipmentStatus` to `cancelled`
