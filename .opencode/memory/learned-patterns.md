## Late Cancellation — Dynamic Statuses (2026-07-04)

- `LateCancellationSettings.tsx` had a hardcoded `PREPARATION_STATUSES` array that didn't match actual company statuses
- Fixed by fetching from `GET /api/v1/order-status?statusType=order` + `?statusType=preparation`
- Terminal statuses excluded: CANCELLED, PENDING_CANCELLATION, TRASH, DRAFT, DUPLICATE_ORDER, RETURNED, REFUNDED, EXCHANGED, etc.
- Company settings (late cancellation config) stored in `company.settings` JSON field, accessed via `PUT /api/v1/order-settings` (requires `order-invoicing` app access)
- Order statuses fetched from `GET /api/v1/order-status` (requires `order-core` app access)
