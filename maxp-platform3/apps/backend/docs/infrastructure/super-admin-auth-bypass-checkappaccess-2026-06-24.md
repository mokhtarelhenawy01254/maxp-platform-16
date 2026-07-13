# Super Admin Auth Bypass for checkAppAccess and Sidebar Settings — 2026-06-24

## Summary

Fixed two authorization bugs that caused `SUPER_ADMIN` users (who have `companyId = null`)
to receive `401` and `403` errors when accessing the Unified Inbox and Sidebar Settings endpoints.

## Root Cause

`SUPER_ADMIN` role always has `companyId = null` in their JWT token by design.
Two middleware / route handlers were checking for companyId before checking the user's role:

1. `checkAppAccess.js` — returned **401** for any user without companyId, blocking SUPER_ADMIN
   from all unified-inbox endpoints (`/quick-replies`, `/conversations`, etc.)
2. `settingsRoutes.js /sidebar GET` — returned **403 COMPANY_ID_REQUIRED** for SUPER_ADMIN

## Changes

### `apps/backend/middleware/checkAppAccess.js`

Added a SUPER_ADMIN bypass at the top of the middleware, before the `companyId` existence check:

```js
// 👑 SUPER_ADMIN bypasses all app access checks (no companyId required)
if (req.user?.role === 'SUPER_ADMIN') {
  return next();
}
```

This mirrors the same pattern used in `verifyToken.requireRole` and `verifyToken.requireCompanyAccess`.

### `apps/backend/routes/settingsRoutes.js`

Added a SUPER_ADMIN branch inside the `/sidebar GET` handler when `companyId` is missing.
Instead of returning 403, returns default sidebar settings `{ layout: 'three-tier', settings: {} }`:

```js
if (!companyId) {
  if (req.user?.role === 'SUPER_ADMIN') {
    return res.json({ success: true, data: { layout: 'three-tier', settings: {} } });
  }
  return res.status(403).json({ ... });
}
```

## Affected Endpoints

| Endpoint | Previous Status | New Status |
|---|---|---|
| `GET /unified-inbox/quick-replies` | 401 | 200 |
| `GET /unified-inbox/conversations` | 401 | 200 |
| `GET /unified-inbox/stats` | 401 | 200 |
| `GET /settings/sidebar` | 403 | 200 |

## Commit

`fcb06e283` — fix(auth): allow SUPER_ADMIN to bypass checkAppAccess and sidebar settings
