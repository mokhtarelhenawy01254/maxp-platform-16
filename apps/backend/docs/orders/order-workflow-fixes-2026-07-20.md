# Order Workflow Fixes — 2026-07-20

## Issues Fixed

### 1. QuickStatusChange bypassed workflow rules (P0)
- **Root cause:** Every status change from QuickStatusChange hard-coded `isOverride: true`, skipping all workflow validation (locks, transitions, role permissions, approvals).
- **Fix:** `apps/frontend/src/pages/orders/QuickStatusChange.tsx` now fetches the workflow config and only sets `isOverride: true` when the workflow is disabled.

### 2. StatusManagement tab unreachable (P0)
- **Root cause:** `StatusManagement.tsx` was fully implemented but never imported or rendered in the main workflow page.
- **Fix:** Added "إدارة الحالات" tab to `OrderWorkflow/index.tsx`, allowing users to create/edit/delete custom statuses.

### 3. PATCH /:orderNumber/status rejected custom statuses (P0)
- **Root cause:** Hard-coded whitelist of 9 statuses; custom workflow statuses were rejected before reaching the workflow engine.
- **Fix:** Expanded validation to use the 29 system statuses from `VALID_ORDER_STATUSES` + dynamically fetched custom statuses from DB.

### 4. System fallback statuses not matching transition rules (P1)
- **Root cause:** When a status was a system enum fallback (no `OrderStatusDefinition`), the transition lookup used the status code as ID, which never matched CUIDs.
- **Fix:** `evaluateStatusChange` now detects system fallbacks and re-searches transitions by code when the ID-based lookup fails.

## Files Changed
- `apps/backend/routes/orders.js` — expanded PATCH status validation
- `apps/backend/services/orderWorkflowService.js` — fallback transition lookup
- `apps/frontend/src/pages/admin/OrderWorkflow/index.tsx` — added StatusManagement tab
- `apps/frontend/src/pages/orders/QuickStatusChange.tsx` — conditional isOverride
