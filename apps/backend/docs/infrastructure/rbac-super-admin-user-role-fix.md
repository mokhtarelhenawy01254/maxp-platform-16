# Fix: RBAC Super-Admin User Role / Status 404 Error

**Date:** 2026-07-07  
**File:** `apps/backend/controller/rbacAdminController.js`

## Problem

When a SUPER_ADMIN attempted to update or toggle a company user's role/status via
`PATCH /api/v1/admin/rbac/users/:userId/role` (or `/status`), the endpoint always
returned **404 "User not found"**.

**Root cause:** Both `updateUserRole` and `toggleUserStatus` fetched the target
user with:

```js
where: { id: userId, companyId: req.user.companyId }
```

A SUPER_ADMIN token carries no `companyId` (it is `null`), so the Prisma
`findFirst` query matched nothing and the handler returned 404.

## Fix

Detect `req.user.role === 'SUPER_ADMIN'` and omit the `companyId` filter:

```js
const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
const userWhere = isSuperAdmin
  ? { id: userId }
  : { id: userId, companyId: req.user.companyId };
const user = await prisma.user.findFirst({ where: userWhere });
```

For `updateUserRole`, the `UserCompany.updateMany` now uses `user.companyId`
(resolved from the DB record) instead of `req.user.companyId` when called by a
SUPER_ADMIN.

For `toggleUserStatus`, the handler now derives `nextIsActive = !user.isActive`
when no explicit `isActive` value is sent in the request body.

## Additional Change

`validRoles` in `updateUserRole` now includes `'OWNER'` so super-admins can
assign the OWNER role without receiving a 400 error.
