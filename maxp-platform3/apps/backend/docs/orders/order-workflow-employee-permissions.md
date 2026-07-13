# Order Workflow — Employee-Level Permissions

## Overview

The order workflow system now supports granting permissions to **individual employees** (by user ID) in addition to roles. This allows fine-grained control over who can perform status transitions and override workflow restrictions.

## Changes (2026-07-07)

### `orderWorkflowService.js`

#### `changeStatus()`
- `allowedRoles` field in `OrderWorkflowTransition` can now contain either role strings (`OWNER`, `MANAGER`, etc.) **or** user UUIDs.
- The check now passes if `allowedRoles.includes(userRole) || allowedRoles.includes(userId)`.
- Same logic applies to `overrideRoles` in the workflow config.

#### `getAllowedTransitions()`
- When filtering transitions for a user, both `userRole` and `userId` are checked against `allowedRoles`.
- Transitions assigned to a specific employee will show up for that employee only.

## Frontend Changes

### `OverridePermissions.tsx`
- Added employee list fetched from `GET /companies/:id/users?limit=100`.
- Admins can now select individual employees to grant override rights alongside roles.
- Selected employee IDs are stored in `overrideRoles` JSON string.

### `TransitionRules.tsx`
- Added employee list in transition rule form.
- Employees can be selected alongside roles in the "Allowed Roles" field.
- Display layer resolves UUIDs back to employee names when rendering transition cards.

### `index.tsx` (OrderWorkflow)
- Removed the "إدارة الحالات" (Status Management) tab from the sidebar — it was redundant.
