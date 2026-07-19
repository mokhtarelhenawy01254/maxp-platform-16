# WhatsApp Inbox Permissions Fix

**Date:** 2026-06-23

## Problem

Users with `role=OWNER` (and other built-in roles) got 403 `Insufficient permissions` when accessing `/whatsapp-inbox` even though the hardcoded PERMISSIONS map includes `inbox.view` for `COMPANY_ADMIN` (normalized from `OWNER`).

## Root Cause

`UserCompany.roleId` (FK to `Role` table) was never set when creating `UserCompany` records — all 12 create call sites omitted `roleId`. This caused `loadUserPermissions` and `getUserPermissions` to return `[]` because `roleRef` was null.

## Changes

| File | Line | Change |
|------|------|--------|
| `middleware/rbacMiddleware.js` | 139 | `requirePermission`: skip DB branch when `userPermissions` is empty → fallback to hardcoded map |
| `middleware/rbacMiddleware.js` | 185 | `requireDbPermission`: fallback to `hasPermission()` when DB permissions lack the key |
| `services/permissionService.js` | 220 | `getUserPermissions`: auto-resolve missing `roleId` by looking up built-in role, fix & return permissions |
| `utils/verifyToken.js` | 36 | `loadUserPermissions`: same auto-fix logic for missing `roleId` |

## Verification

- OWNER users should no longer see 403 on `/whatsapp-inbox`
- First API call triggers lazy `roleId` fix; subsequent calls use `roleRef` directly
- Custom roles (with proper `roleId`) continue to use DB permissions without fallback
