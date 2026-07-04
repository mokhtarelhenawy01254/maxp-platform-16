# Late Cancellation — Dynamic Target Statuses

**Date:** 2026-07-04  
**Type:** Frontend enhancement  

## Summary

The "الحالات المستهدفة" (Target Statuses) section in the Late Cancellation settings page previously used a hardcoded list of 8 preparation statuses in `LateCancellationSettings.tsx`. This caused a mismatch when a company's actual order/preparation statuses differed from the hardcoded list.

## Change

`apps/frontend/src/pages/settings/LateCancellationSettings.tsx`

- Removed the hardcoded `PREPARATION_STATUSES` array
- Added `fetchOrderStatuses()` which calls `GET /api/v1/order-status?statusType=order` and `GET /api/v1/order-status?statusType=preparation` in parallel
- Filters out terminal statuses (CANCELLED, PENDING_CANCELLATION, TRASH, DRAFT, DUPLICATE_ORDER, RETURNED, REFUNDED, EXCHANGED, etc.)
- Merges and sorts both lists by `sortOrder`
- Renders the dynamic list with status `name` (Arabic label from DB) instead of the hardcoded `label`
- Displays a fallback message when no statuses are available

## Second Change (2026-07-04) — Settings Endpoint Decoupling

The late cancellation settings (`lateCancellationInterceptEnabled`, `lateCancellationTargetStatuses`) were previously loaded/saved via `GET/PUT /api/v1/order-settings`, which requires the paid **`order-invoicing`** marketplace app (129 EGP/month). Companies without this app received a 403 error, blocking the entire settings page.

**Changes:**

1. `apps/backend/routes/settingsRoutes.js` — Added two new endpoints:
   - `GET /api/v1/settings/cancellation` — reads late cancellation settings from the company's `settings` JSON field
   - `PUT /api/v1/settings/cancellation` — writes late cancellation settings to the company's `settings` JSON field
   - Only requires `authenticateToken` (no paid app check)

2. `apps/frontend/src/pages/settings/LateCancellationSettings.tsx` — Changed API calls from `/order-settings` to `/settings/cancellation`

## Impact

Companies now see exactly their own order and preparation statuses (including custom ones) instead of a fixed subset. The feature automatically adapts when new statuses are added or existing ones renamed. Settings can be saved/loaded without requiring the `order-invoicing` app.
