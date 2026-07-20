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

### 5. requireApprovalByDefault not enforced (P1)
- **Root cause:** The `requireApprovalByDefault` config field was saved to DB but never read by the workflow engine. Also, the approval check was gated on a transition existing, so status changes without a defined transition always bypassed approval.
- **Fix:** `evaluateStatusChange` now checks `config.requireApprovalByDefault` and returns `pending` when it's true (unless the transition explicitly says `requiresApproval: false`). The approval check was also moved outside the transition-exists block.

### 6. allowOverride toggle not enforced (P1)
- **Root cause:** The `allowOverride` config field was saved to DB and shown in the UI toggle, but `evaluateStatusChange` never checked it.
- **Fix:** Added `config.allowOverride === false` check in the override handling block, rejecting override requests when disabled.

### 7. System statuses not auto-seeded (P1)
- **Root cause:** When opening the workflow page for the first time, no `OrderStatusDefinition` records exist. Users had to create every status manually before they could define transitions.
- **Fix:** Added `POST /order-workflow/statuses/seed-defaults` endpoint (seeds 20 default statuses with names, colors, sort orders, terminal flags) and auto-call it in the workflow page when statuses are empty.

## Files Changed
- `apps/backend/routes/orders.js` — expanded PATCH status validation
- `apps/backend/services/orderWorkflowService.js` — fallback transition lookup, requireApprovalByDefault check, allowOverride enforcement, seedDefaultStatuses
- `apps/frontend/src/pages/admin/OrderWorkflow/index.tsx` — added StatusManagement tab + auto-seed
- `apps/frontend/src/pages/orders/QuickStatusChange.tsx` — conditional isOverride
- `apps/frontend/src/services/orderWorkflowService.ts` — added seedDefaultStatuses method
- `apps/backend/routes/orderWorkflowRoutes.js` — added POST /statuses/seed-defaults route
