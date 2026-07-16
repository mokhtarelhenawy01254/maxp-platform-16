# Preparation Queue Shipment Data — 2026-07-16

## Summary

Added shipment fields to the preparation queue order mapping and frontend types/normalizers so the preparation UI can display Turbo shipment info and multi-shipment details.

## Changes

### Backend (`preparationQueueService.js`)
- `mapRegularOrderToSimple` now includes:
  - `turboTrackingNumber`, `turboShipmentId`, `turboShipmentStatus` from the order
  - `shipments[]` array with `trackingNumber`, `externalShipmentId`, `status`, `carrierType` per shipment (fetched via Prisma `shipments` relation)
- `mapGuestOrderToSimple` includes turbo fields + empty `shipments[]`
- `fetchPreparationBatchOrders` now includes `shipments` relation in the Prisma query with `trackingNumber`, `externalShipmentId`, `status`, `carrierType`

### Frontend
- **`types.ts`**: New `SimpleOrderShipment` and `ApiOrderShipmentResponse` interfaces
- **`normalizers.ts`**: `normalizeShipment()` helper; `normalizeSimpleOrder()` maps turbo fields and shipment arrays
- **`PreparationOrderCardHeader.tsx`**: Displays shipment info in the order card
- **`PreparationOrdersTable.tsx`**: Shows shipment data in table columns

## Verification

- Backend: existing order tests cover the queue service path transitively
- Frontend: build passes; type-check validates all new interfaces
