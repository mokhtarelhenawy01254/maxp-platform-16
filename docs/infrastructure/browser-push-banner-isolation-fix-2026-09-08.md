# Browser Push Banner Isolation Fix (2026-09-08)

## Problem
An orange notification banner ("تنبيه لشركة أميرال: لتصلك إشعارات الطلبات والرسائل الجديدة بصوت عالي حتى عندما يكون المتصفح مغلقاً، يرجى تفعيل إشعارات المتصفح الآن") was unintentionally showing across all merchants and companies platform-wide.

## Root Cause
In `apps/frontend/src/components/notifications/BrowserPushBanner.tsx`, while `isAmeerelle` was computed for `ahmedfares61994@gmail.com` / company `cmteva12p00lrjuwxpufr4k8w`, the early return check omitted `!isAmeerelle`. As a result, any authenticated user on the platform with `Notification.permission === 'default'` was presented with the company-specific banner.

## Resolution
1. Added strict `isAmeerelle` guard:
   - Evaluates `user?.companyId === 'cmteva12p00lrjuwxpufr4k8w'`, `user?.email === 'ahmedfares61994@gmail.com'`, case-insensitive email matches, and associated company IDs.
   - If `!isAmeerelle`, the component immediately returns `null` and suppresses event listeners.
2. Added comprehensive unit tests in `apps/frontend/src/components/notifications/__tests__/BrowserPushBanner.test.tsx` verifying complete isolation.
3. Live production bundles in `/var/www/frontend2/dist/assets/Layout-*.js` on the server were updated immediately to suppress the banner across all non-Ameerelle companies and tenants.
