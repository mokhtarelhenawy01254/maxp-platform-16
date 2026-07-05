## Late Cancellation — Dynamic Statuses (2026-07-04)

- `LateCancellationSettings.tsx` had a hardcoded `PREPARATION_STATUSES` array that didn't match actual company statuses
- Fixed by fetching from `GET /api/v1/order-status?statusType=order` + `?statusType=preparation`
- Terminal statuses excluded: CANCELLED, PENDING_CANCELLATION, TRASH, DRAFT, DUPLICATE_ORDER, RETURNED, REFUNDED, EXCHANGED, etc.
- Company settings (late cancellation config) stored in `company.settings` JSON field, accessed via `PUT /api/v1/order-settings` (requires `order-invoicing` app access)
- Order statuses fetched from `GET /api/v1/order-status` (requires `order-core` app access)

## Deploy Workflow — SSH Timeout Retry (2026-07-04)
- `Deploy to Server` workflow sometimes fails at `Test SSH Connection (with retry)` step with `Connection timed out` (exit code 255)
- This is a transient SSH connectivity issue — re-running the workflow from GitHub UI typically succeeds
- GitHub Actions runner IP changes each run, so whitelisting a single IP won't fix it permanently
- If persistent across multiple retries, check server firewall (ufw/iptables) or GitHub Actions meta IP range at `https://api.github.com/meta`

## Order Workflow — `isOverride` Required (2026-07-04)
- Companies with `orderWorkflowConfig.enabled: true` + `enforceTransitions: true` block direct status changes
- The `POST /api/v1/order-workflow/change-status` endpoint requires `isOverride: true` in the request body to bypass transition validation
- Without `isOverride`, the backend throws "الحالة المستهدفة غير موجودة في تعريفات المسار"
- Also: backend's `findStatusByCode` only matches DB-defined `OrderStatusDefinition` records. For raw Prisma enum values, a fallback to `VALID_STATUSES` array is needed in the route handler. See `routes/orderWorkflowRoutes.js:154`
