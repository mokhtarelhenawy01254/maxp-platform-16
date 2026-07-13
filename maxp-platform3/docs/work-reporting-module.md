# Work Reporting Module

This module adds a configurable employee reporting flow for operational teams.

## Pages

- `/hr/reporting/forms`
  - Admin dashboard for listing report forms and jumping to edit, preview, fill, and records.
- `/hr/reporting/forms/new`
  - Form builder for creating report templates.
- `/hr/reporting/forms/:formId/edit`
  - Edit an existing template.
- `/hr/reporting/forms/:formId/preview`
  - Preview how the form appears before publishing or sharing.
- `/hr/reporting/forms/:formId/fill`
  - Employee-facing submission screen.
- `/hr/reporting/forms/:formId/records`
  - Submitted records plus analytics and CSV export.

## Field Source Types

- `SYSTEM`
  - Pulled automatically at submission time.
- `MANUAL`
  - Filled by the employee.
- `CALCULATED`
  - Evaluated from a formula that references field keys.

## Supported System Fields

- `CURRENT_USER_NAME`
- `CURRENT_USER_EMAIL`
- `REPORT_DATE`
- `REPLIED_MESSAGES_COUNT`
- `REPLIED_CONVERSATIONS_COUNT`
- `CREATED_ORDERS_COUNT`

## Formula Notes

- Formulas reference field keys, not display labels.
- Supported operators:
  - `+`
  - `-`
  - `*`
  - `/`
  - parentheses
- Example:
  - `(orders_count / replied_conversations_count) * 100`

## Backend Endpoints

- `GET /api/hr/reporting/forms`
- `POST /api/hr/reporting/forms`
- `GET /api/hr/reporting/forms/:id`
- `PUT /api/hr/reporting/forms/:id`
- `DELETE /api/hr/reporting/forms/:id`
- `GET /api/hr/reporting/forms/:id/fill-context`
- `POST /api/hr/reporting/forms/:id/submit`
- `GET /api/hr/reporting/forms/:id/records`

## Initial Use Case

The builder includes a preset for:

- daily message-response team reporting
- automatic message and order counts
- automatic conversion-rate calculation
- manual achievement, blocker, and next-target fields
