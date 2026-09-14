# Prevent Duplicate Shipping Dispatches Architecture (Turbo, Bosta, QP Express)
**Date:** 2026-09-14
**Scope:** `apps/backend`, `apps/frontend`

## 1. Context & Incident Summary
In September 2026, several merchants (such as Swan Company) reported duplicated parcels sent to shipping providers (specifically Turbo Courier, where couriers returned secondary parcels with reason `"طرد مكرر لنفس العميل"`).

### Root Causes Identified:
1. **Ghost Abandoned Carts post-checkout**: Immediately after a customer placed an order, front-end debounces or navigation re-posted to `/checkout-draft`, creating a `GuestCart` with the customer's phone number.
2. **Unchecked Abandoned Cart Conversion**: When call center / sales agents converted incomplete carts (`POST /incomplete/:cartId/convert`), the system generated orders without checking if the customer had placed a confirmed/active order within the last 48 hours.
3. **Short Duplicate Window**: The default duplicate order detection window was only 60 minutes (`duplicateOrderWindowMinutes: 60`), allowing orders submitted the following morning to bypass duplicate checks.
4. **Unfiltered Bulk & Single Shipment Creation**:
   - Neither single nor bulk shipping handlers in `turbo/shipmentHandlers.js`, `qpExpressController.js`, or `bostaController.js` validated order status. Orders marked `DUPLICATE_ORDER`, `CANCELLED`, `RETURNED`, or `REFUNDED` were eligible for courier dispatch.
   - Bulk dispatch did not perform phone deduplication across the candidate batch.
   - Turbo shipment creation did not check if the customer already had an active, undelivered shipment in the system.

## 2. Multi-Layer Guard Architecture

### Layer 1: Abandoned Cart Conversion & Draft Protection
- **`apps/backend/routes/orders.js` (`POST /incomplete/:cartId/convert`)**:
  - Checks for existing orders within the last 48 hours for the cart's phone number.
  - If found with non-terminal status (`CONFIRMED`, `SHIPPED`, `DELIVERED`, `PENDING`, etc.), returns HTTP 409 `EXISTING_CUSTOMER_ORDER` with details of the existing order.
  - Requires explicit `force: true` to override.
- **`apps/backend/routes/publicOrdersRoutes.js` (`POST /checkout-draft`)**:
  - Drops draft creation if an order was placed by the same phone number within the last 20 minutes.

### Layer 2: Frontend Operator Warning
- **`apps/frontend/src/pages/orders/IncompleteOrders.tsx` & `IncompleteOrderDetails.tsx`**:
  - Intercepts 409 `EXISTING_CUSTOMER_ORDER`.
  - Prompts the user with explicit modal warning detailing existing order number, status, amount, and date.
  - Allows conscious override with `force: true` if confirmed.

### Layer 3: Courier Shipment Dispatch Guards
- **Single Dispatch (`createShipment`)**:
  - Rejects orders with status: `DUPLICATE_ORDER`, `CANCELLED`, `RETURNED`, `REFUNDED`, `TRASH`, `LOST`.
  - Turbo: Rejects if an active Turbo shipment exists for the same phone unless `forceDuplicateShipping: true`.
- **Bulk Dispatch (`bulkCreateShipments`)**:
  - Database filter: `status: { notIn: [...] }`.
  - In-batch phone deduplication: `processedPhonesInBatch` tracks seen phones; duplicates in the batch are skipped with an explanatory warning.
  - Turbo: Queries existing active shipments for batch phones in parallel and skips orders whose customer already has an active delivery.
