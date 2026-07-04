# Architectural & Design Decisions

<!-- Format:
## YYYY-MM-DD — Title
- Context: Why this decision was needed
- Decision: What was chosen
- Rationale: Why this over alternatives
- Rejected: What was considered but not chosen and why

## 2026-07-03 — Feature Toggle via Company Settings JSON
- Context: Need to enable/disable AI tools per company from the activation center without schema migrations for each new toggle
- Decision: Added `aiToolsEnabled` boolean toggled via Switch component in `CompanyActivationCenter`. Backend PUT `/:companyId/features` endpoint reads/writes a `features` JSON field inside `company.settings`
- Rationale: JSON field avoids schema changes per feature flag; simplest possible approach that works now
- Rejected: Creating a separate `company_features` table — overkill for a single boolean toggle; Prisma JSON field is sufficient

## 2026-07-04 — Order Workflow `isOverride` + Enum Status Fallback
- Context: QuickStatusChange page calls `POST /order-workflow/change-status` with enum value like "CONFIRMED", but the backend only finds DB-defined `OrderStatusDefinition` records, and workflow validation rejects the change because no transition rules are defined
- Decision: Modified both frontend (add `isOverride: true`) and backend (add `VALID_STATUSES` array fallback in route handler)
- Rationale: Minimal changes; `isOverride` already existed in the backend, just wasn't being sent; the VALID_STATUSES fallback handles companies without custom `OrderStatusDefinition` records
- Rejected: Creating default `OrderStatusDefinition` records for every company — too heavy; bypass is simpler and safe with `isOverride`
