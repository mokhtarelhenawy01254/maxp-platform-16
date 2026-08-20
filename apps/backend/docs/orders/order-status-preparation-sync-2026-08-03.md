# Order Status → Preparation Metadata Sync (2026-08-03)

## Problem

The preparation queue (`/orders/preparation`) reads `metadata.preparationStatus` as its source of truth (`getEffectivePreparationStatus` in `preparationQueueService.js`), falling back to `order.status` only when the metadata key is absent.

Status changes made **outside** the preparation queue — quick-status (`/orders/quick-status`), the orders page, bulk updates for non-preparation statuses — went through `orderService.updateOrderStatus` / `updateGuestOrderStatus`, which updated `order.status` **only** and never touched `metadata.preparationStatus`.

Result: an order moved to `READY` from quick-status showed as `READY` on `/orders`, but the preparation page kept displaying the stale stage (e.g. `PACKAGED`) because the older metadata value won.

## Fix

### `backend/services/orderService.js`

- Added `PREPARATION_PIPELINE_STATUSES` — the set of statuses that live in the preparation pipeline (`PENDING_PREPARATION`, `PREPARING`, `PROCESSING`, `QUALITY_CHECK`, `PACKAGED`, `PACKED`, `READY`, `READY_TO_SHIP`, `STOCK_SHORTAGE`, `PENDING_STOCK`, `ON_HOLD_STOCK`, `ON_HOLD_PREP`).
- Added `parsePreparationMetadata` to safely parse the order JSON metadata.
- In `updateOrderStatus` and `updateGuestOrderStatus`, when the target status belongs to `PREPARATION_PIPELINE_STATUSES`, the update now also writes `metadata.preparationStatus` + `preparationStatusUpdatedAt` alongside `order.status`.

### `backend/scripts/backfill_preparation_status_metadata.js` (new)

One-off repair script for orders already stuck with a stale `metadata.preparationStatus`. For every order whose `order.status` is a preparation-pipeline status, it sets `metadata.preparationStatus` to match `order.status`. Supports `--dry-run` and `--companyId=<id>`.

## Covered paths

| Path | Result |
|------|--------|
| `POST /order-workflow/change-status` (quick-status) | syncs metadata via `updateOrderStatus` |
| `PATCH /orders-new/:orderNumber/status` | syncs metadata via `updateOrderStatus` |
| `POST /orders-new/bulk/status` (non-preparation targets) | syncs metadata via `updateOrderStatus` |
| Preparation-queue native updates (`PREPARATION_ONLY_STATUSES`) | already wrote metadata directly; unchanged |

## Outcome

Any external status change to a preparation-pipeline status is now reflected on the preparation queue immediately. Pre-existing stale orders can be repaired with the backfill script.

## Follow-up (same day): server-side enforcement + workflow respect

### `backend/services/preparationQueueService.js`

- Added and exported `assertPreparationStockRule({ orderId, companyId, targetStatus, prepSettings })` — mirrors the frontend `validateTransition` stock check. When `requireStockBeforePreparing` is on and `allowPartialPreparation` is off, moving an order to `QUALITY_CHECK` / `PACKAGED` / `handoffStatus` with missing items throws a 400. This makes the rule server-side so a direct API call cannot bypass it.

### `backend/routes/orders.js`

- `POST /orders-new/simple/:orderNumber/status` (preparation path) and `updateAnyOrderStatus` (bulk):
  - **Workflow respect (#6):** when `orderWorkflowConfig.enabled` and the company has configured `orderWorkflowTransition` rules for the current stage, the move now runs through `orderWorkflowService.validateStatusChange` (transition rules + approvals). If the result is `pending`, the API returns `workflowStatus: 'pending'` instead of applying the change. If the company has no transitions configured for the stage, it falls back to allowing the move so an empty workflow config never locks the queue.
  - **Stock rule (#1):** calls `assertPreparationStockRule` before applying the change.
- Company prep settings are read from `company.settings.orderPreparation` (parsed with the existing `parseOrderMetadata` helper).

### `frontend/src/pages/orders/PreparationQueue.tsx`

- `isOverride` is no longer hardcoded to `true`; it is now derived from the user's role (`OWNER`/`SUPER_ADMIN`/`COMPANY_ADMIN`/`MANAGER`), so lower-privilege queue users cannot silently bypass workflow/approval rules.

### Tests

- `tests/services/preparationQueueService.stockRule.test.js` (4 tests): complete stock → allowed; missing stock + partial disabled → 400; partial enabled → allowed; rule disabled → allowed.
- `tests/services/orderService.preparationSync.test.js` extended: move back to `CONFIRMED` syncs metadata.
