# Production Turbo Shipping Address Fix

Date: 2026-04-30

## Issue

Orders on `maxp.online` could show a full delivery address in the order details screen, but when the order was sent to Turbo the shipment address collapsed to the city only or a partial location.

## Root Cause

Two gaps combined to drop address fidelity before the Turbo payload was built:

1. `backend/services/turboService.js`
   - `createShipment()` rebuilt the shipping address from `address_1`, `address_2`, and `city` only.
   - newer storefront and guest checkout flows commonly persist the full address in `shippingAddress.address`, with supporting fields like `area`, `street`, and `governorate`.
   - when `address_1` was empty, Turbo received only the city fragment.

2. `backend/controller/turboController.js`
   - guest-order lookup paths synthesized order-like objects without preserving the original `shippingAddress` payload.
   - downstream Turbo formatting then had less structured data available for shipment creation and local waybill generation.

## Fix

Updated the Turbo integration to normalize shipping addresses from every supported stored shape:

- added shared shipping-address parsing helpers in `backend/services/turboService.js`
- now prefer `address`, `street`, `address_1`, `address_2`, `area`, and `landmark`
- now also read `addressLine1`, `address1`, `district`, and `neighborhood`
- choose the richest address between `shippingAddress` and `customerAddress` instead of using the first truthy value
- preserve cleaned `city` and `governorate` separately
- reuse the same normalization in:
  - `createShipment()`
  - `updateShipment()`
  - `generateLocalWaybill()`
  - `formatOrderForTurbo()`
- `generateLocalWaybill()` now puts the complete normalized address in `receiverAddress`, because the printed HTML template displays that field.
- `updateShipment()` now sends a numeric `invoice_number` to Turbo `/edit-order`, while keeping `second_client` as the readable order number.

Updated guest-order conversion in `backend/controller/turboController.js` so order-like objects keep:

- the raw `shippingAddress`
- a readable `customerAddress`
- the stored `city`

Also fixed the Turbo controller order-id fallback include from `items` to `orderItems`, so shipment create/update works when the frontend sends the internal order id instead of the order number.

## Regression Coverage

Added `backend/tests/services/turboService.address.test.js` to cover:

- full structured address extraction from JSON
- Turbo shipment payload using the full address instead of city-only
- local waybill generation using the same normalized address fields
- fallback to `customerAddress` JSON when `shippingAddress` is missing on the synthesized order object
- city-only `shippingAddress` falling back to a fuller `customerAddress`
- Turbo update payload using a full address and numeric invoice number

## Verification

Run locally:

```powershell
node --check backend/services/turboService.js
node --check backend/controller/turboController.js
npx jest backend/tests/services/turboService.address.test.js --runInBand
```

Production follow-up:

- deployed updated `backend/services/turboService.js` and `backend/controller/turboController.js` to `/var/www/backend2`
- reloaded `maxp-backend`
- production health check returned OK
- resynced existing screenshot shipment `ORD-839842-557` / `37406090`; Turbo accepted the update with full address `نزله الكهرباء  شارع حنفي ابو موسى, Giza`
