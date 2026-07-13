# Super Admin Dev Task External API

Date: 2026-05-07

## Purpose

This feature adds a production-facing API surface for the super-admin development task system. It is separate from the existing company task integration stack and is intended for external websites or internal tools that need to create and monitor dev tasks directly.

## Management Surface

Super admins manage credentials from:

- `GET /api/v1/super-admin/dev/task-integrations/credentials`
- `POST /api/v1/super-admin/dev/task-integrations/credentials`
- `PUT /api/v1/super-admin/dev/task-integrations/credentials/:credentialId`
- `POST /api/v1/super-admin/dev/task-integrations/credentials/:credentialId/rotate`
- `DELETE /api/v1/super-admin/dev/task-integrations/credentials/:credentialId`

The matching frontend page is:

- `frontend/src/pages/super-admin/DevTaskIntegrations.tsx`
- Route: `/super-admin/dev-task-integrations`

## Credential Model

`DevTaskApiCredential` stores:

- `keyPrefix` + `keyHash` instead of storing the raw key
- `scopes` as JSON text
- `isActive`, `expiresAt`, `revokedAt`, `revokedReason`
- default routing fields:
  - `defaultReporterMemberId`
  - `defaultAssigneeMemberId`
  - `defaultProjectId`

The raw key is revealed only on create/rotate. Current key prefix format is `dtk_<public>_<secret>`.

## External API Surface

Mounted in `backend/server.js`:

- `GET /api/v1/external/dev-tasks/projects`
- `GET /api/v1/external/dev-tasks/team-members`
- `GET /api/v1/external/dev-tasks`
- `GET /api/v1/external/dev-tasks/:id`
- `POST /api/v1/external/dev-tasks`
- `PATCH /api/v1/external/dev-tasks/:id/status`

Authentication accepts either:

- `x-api-key: dtk_...`
- `Authorization: Bearer dtk_...`

## Scopes

Supported scopes:

- `dev-tasks:read`
- `dev-tasks:write`

Read is required for lookup/list/fetch endpoints. Write is required for task creation and task status updates.

## Behavioral Rules

- Write-capable keys must have a default reporter member.
- Reporter and assignee defaults must point to active dev team members backed by active users.
- Every key must be bound to one `defaultProjectId`; external reads and writes are restricted to that project.
- If a request does not supply `assigneeId`, the API falls back to the credential defaults.
- Revoked, inactive, malformed, expired, or hash-mismatched keys are rejected before controller execution.
- Assignee filters and writes are limited to the bound project's manager/team members plus the credential defaults.
- Successful external create/status actions emit `DevTaskActivity` rows for traceability.

## 2026-05-09 Production Hotfix

- During production verification, `POST /api/v1/dev-tasks/projects` failed because `devTaskController.js` and `devTaskController_minimal.js` still referenced the old Prisma relation alias `manager`.
- The current schema exposes the manager relation as `dev_team_member`, and project counters as `_count.dev_tasks` / `_count.dev_releases`.
- Both controllers were updated to use the current relation names, which restores project creation and project listing on production and unblocks external dev-task API key generation.
- Regression added: `backend/tests/controller/devTaskProjectController.test.js`.

## Regression Coverage

Backend tests added:

- `backend/tests/services/devTaskIntegrationService.test.js`
- `backend/tests/integration/superAdminDevTaskIntegrations.test.js`
- `backend/tests/routes/devTaskExternalRoutes.test.js`

Validation executed locally before ship:

- `npx prisma validate --schema=prisma/schema`
- `npm run check:syntax`
- focused Jest suites above
- `frontend npm run build`
