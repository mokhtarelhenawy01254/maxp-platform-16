# Customer Rating In-Flight & Pre-Shipment Cancellation Fix (2026-10-07)

## Summary
Fixes customer rating and health score calculations across the Orders Table and Order Details page (`/orders/:orderNumber`) so that:
1. **In-flight orders (not yet delivered)** are never counted as failed delivery attempts (`totalOrdersCount` is separated from `totalAttempts`).
2. **New customers with 0 completed shipments** display a clean, neutral `جديد` badge without a misleading `7.5` numeric score or amber warning color.
3. **Pre-shipment cancelled orders (`CANCELLED`)** do not penalize customer delivery rate (`deliverySuccessRate`) or health score.
4. **Single Order Details (`GET /orders-new/simple/:orderNumber`)** computes and returns the same unified customer health telemetry as the orders list endpoint.
