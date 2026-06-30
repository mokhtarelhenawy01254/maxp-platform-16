# Manual Order Request Type

## Overview
Added a **"نوع الطلب" (Request Type)** selector to the manual order creation page (`/orders/manual`).

## What Changed

### Frontend — `CheckoutColumn.tsx`
- Added `requestType` state (default: `"delivery"`).
- Added a dropdown UI with three options: **طلب تسليم (delivery)**, **طلب مرتجع (return)**, **طلب استبدال (exchange)**.
- Added `RETURNED` as an option in the status dropdown.
- When `requestType` changes to `"return"`, the order status auto-sets to `RETURNED`.
- When `requestType` changes to `"exchange"` or `"delivery"`, the order status auto-sets to `PENDING`.
- `requestType` is included in the payload sent to `POST /api/v1/orders-enhanced`.

### Frontend — `OrderSourceCard.tsx`
- Added a **"نوع الطلب" badge** (red) that appears in the order details page whenever `requestType` is `"return"` or `"exchange"`.
- Safely parses `metadata` as a JSON string (since the DB stores it stringified).
- Renamed the existing affiliate-source label from "نوع الطلب" to "تصنيف الطلب" to avoid collision.

### Backend — `enhancedOrderService.js`
- `prepareOrderData` now reads `data.requestType` and stores it in the order's `metadata` JSON alongside other contextual fields.
