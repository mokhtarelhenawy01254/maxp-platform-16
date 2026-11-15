# Dental Lab Unsubscription & App Deactivation Isolation (2026-11-15)

## Overview
Ensures that unsubscribed or cancelled vertical apps (specifically `dental-lab-app` for company `huinzo`) do not remain visible in the dashboard sidebar or retain active technician configurations.

## Problem
A company not subscribed to `dental-lab-app` (e.g. `huinzo`) could still see the "معمل الأسنان" module in the sidebar due to:
1. `sanitizeInstalledApps` in `authController.js` retaining `CompanyApp` records even when `status === 'CANCELLED'`, returning them into `installedAppSlugs`.
2. Auth login and `/me` company queries querying `installedApps` without filtering out cancelled records.
3. Frontend sidebar not excluding cancelled app slugs when constructing `installedAppSlugs`.

## Changes Made
1. **`apps/backend/controller/authController.js`**:
   - `sanitizeInstalledApps`: Filtered out `ca.status === 'CANCELLED'`.
   - `installedApps`: Added `where: { status: { in: ['ACTIVE', 'TRIAL', 'EXPIRED'] } }` consistently to primary and secondary company queries in `login` and `me`.
2. **`apps/frontend/src/config/sidebar.ts`**:
   - Filtered out any app with `status === 'CANCELLED'` from `installedApps` and pruned `cancelledSlugs` from `installedAppSlugs`.
3. **`apps/backend/scripts/one-off/remove-dental-from-huinzo.js`**:
   - Added automated cleanup script to remove any lingering `CompanyApp` dental records, reset dental business specialty if present, clear dental technician user flags, and invalidate caches.
4. **`.github/workflows/remove-dental-from-huinzo.yml`**:
   - Workflow dispatch to run the cleanup script safely against the production environment.
