# Order Status Auto-Change Rules — 2026-07-01

## Feature

Adds a rule-based automatic order status transition system to the Orders page.

## How It Works

1. **Rules**: Each company can define rules of the form: "after X minutes/hours/days in status A, automatically move to status B".
2. **Cron**: A backend cron job (`orderStatusAutoChangeCron`) runs every minute, fetches all active rules, finds qualifying orders, and batch-updates their status.
3. **History**: Each auto-transition is logged to `OrderStatusHistory` with `changedBy: SYSTEM_AUTO`.

## API

- `GET  /api/v1/order-status-rules` — list all rules for the authenticated company
- `POST /api/v1/order-status-rules` — create a new rule `{ fromStatus, toStatus, waitTime, timeUnit }`
- `DELETE /api/v1/order-status-rules/:id` — delete a rule

## Database

New model: `OrderStatusAutoChangeRule` (table: `order_status_auto_change_rules`)

Fields: `id, companyId, fromStatus, toStatus, waitTime, timeUnit, isActive, createdAt, updatedAt`

## Frontend

Button **"أتمتة الحالات"** added to the Orders page header.
Opens `OrderStatusAutoChangeModal` — a dark-themed modal with add/delete rule UI and live preview.
