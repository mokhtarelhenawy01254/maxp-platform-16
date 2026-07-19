# Order Trash Permanent Delete - 2026-05-03

## Problem

When admins opened the orders trash view (`status=trash`) and clicked the bulk delete action, the frontend still called the normal trash move path. The backend accepted the request and set the selected orders to `TRASH` again, so the rows stayed visible in the trash list instead of being removed permanently.

## Fix

- `POST /api/v1/orders-new/bulk/delete` now accepts `permanent: true`.
- Without `permanent`, the endpoint keeps the existing behavior and moves regular plus guest orders to `TRASH`.
- With `permanent: true`, the endpoint only deletes orders that are already in trash.
- The delete helper removes order notes and unlinks optional records that should survive as historical logs, such as affiliate referrals, WhatsApp notification logs, wallet transactions, and customer journeys.
- The orders page sends `permanent: true` only when the current filter is `status=trash`, and changes the confirmation, success message, and button label to permanent-delete wording.

## Verification

- Added integration coverage for regular and guest orders moving to trash.
- Added integration coverage for permanent deletion from trash, including order-note cleanup so the database does not block the hard delete.
