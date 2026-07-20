# Order Status → Workflow Sync (2026-07-20)

## Problem

`settings/orders` (OrderStatusManager) saved statuses to the `orderStatusConfig` table.  
`settings/order-workflow` TransitionRules read from the `orderStatusDefinition` table.  
These were two separate tables with no link, so new statuses added from the Orders Settings page never appeared in the TransitionRules dropdowns.

## Fix

### `backend/controller/orderStatusController.js`

Added two helper functions:

- **`syncStatusToWorkflow(prisma, companyId, statusConfig)`** — upserts the status into `orderStatusDefinition` (the workflow table) so it immediately appears in TransitionRules.
- **`removeStatusFromWorkflow(prisma, companyId, code)`** — deletes the status from `orderStatusDefinition` when it is deactivated or deleted, unless active transition rules reference it (in which case it is kept to preserve referential integrity).

These helpers are called automatically inside:

| Handler | Trigger |
|---------|---------|
| `createStatus` | After creating a new status in `orderStatusConfig` |
| `updateStatus` | After updating; if `isActive` becomes `false`, tries to remove from workflow |
| `deleteStatus` | After soft-deleting (setting `isActive: false`) |
| `initializeStatuses` | After seeding default statuses, syncs all `order`-type statuses in bulk |

### `backend/routes/orderWorkflowRoutes.js`

**`GET /order-workflow/statuses`** now performs a **live backfill**:

1. Fetches all existing `orderStatusDefinition` entries for the company.
2. Fetches all active `order`-type entries from `orderStatusConfig`.
3. For any status in `orderStatusConfig` not yet present in `orderStatusDefinition`, creates it automatically (one-time backfill for existing data).
4. Returns the freshly merged list.

## Outcome

Any status added, edited, or deleted from `settings/orders` is automatically reflected in the TransitionRules dropdowns on `settings/order-workflow` — for both new and pre-existing statuses.
