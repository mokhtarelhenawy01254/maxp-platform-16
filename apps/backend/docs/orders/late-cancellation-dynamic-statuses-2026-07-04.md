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

## Impact

Companies now see exactly their own order and preparation statuses (including custom ones) instead of a fixed subset. The feature automatically adapts when new statuses are added or existing ones renamed.
