# Marketplace App Deactivation - 2026-05-23

## Summary
Added the ability for merchants to deactivate (uninstall) their activated marketplace apps directly from the marketplace listing page and app details page, without needing to navigate to My Apps.

## Scope
- **In scope**: Deactivation button on marketplace grid cards + app details sidebar
- **In scope**: Confirmation dialog with warning before deactivation
- **In scope**: Real-time UI state update after deactivation (app marked as not installed)
- **Out of scope**: Bundle unsubscription, enterprise plan cancellation, theme deactivation

## Implementation

### Frontend
- `frontend/src/pages/marketplace/Marketplace.tsx`:
  - Added `uninstallingApp` state to track loading per-app
  - Added `confirmUninstallApp` state for the confirmation dialog
  - Added `handleUninstall()` function that calls `POST /marketplace/apps/:slug/uninstall`
  - Replaced passive "التطبيق نشط" text with active "نشط" badge + "إلغاء" button
  - Added confirmation dialog with AlertTriangle icon, warning message, and "تراجع"/"تأكيد الإلغاء" buttons
  - On success: updates local state via `setApps` toggling `isInstalled: false`

- `frontend/src/pages/marketplace/AppDetails.tsx`:
  - Added `uninstalling` and `confirmUninstall` state
  - Added `handleUninstall()` function mirroring marketplace logic
  - When app is installed, shows both "تحديث الاشتراك" and "إلغاء التفعيل" buttons
  - Added same confirmation dialog pattern

### Backend (no changes needed)
- `POST /api/v1/marketplace/apps/:slug/uninstall` already existed in `marketplaceController.uninstallApp`
- The endpoint sets `companyApp.status = 'CANCELLED'` (soft delete)
- No new API, middleware, or DB schema changes required

## Flow
1. Merchant sees installed app on marketplace grid or details page
2. Clicks "إلغاء" (grid) or "إلغاء التفعيل" (details)
3. Confirmation dialog appears: "هل أنت متأكد من إلغاء تفعيل هذه الأداة؟ سيتم إلغاء الخدمة وقد تفقد بعض الإعدادات المرتبطة بها."
4. Merchant clicks "تأكيد الإلغاء" or "تراجع"
5. On confirm: `POST /api/v1/marketplace/apps/:slug/uninstall` → `status = 'CANCELLED'`
6. On success: toast notification, app immediately marked as not installed in UI
7. On failure: error toast with server message

## Verification
- Build: `cd frontend && npx vite build` (passes with no errors)
- Backend syntax: `node -e "require('./controller/marketplaceController')"` (passes)
- Manual: Navigate to `/marketplace`, install an app, verify "إلغاء" button appears, click it, confirm dialog opens, confirm, verify app shows as uninstalled
- Manual: Navigate to `/marketplace/:slug` for an installed app, verify "إلغاء التفعيل" button works

## Edge Cases
- Uninstalling requires authentication (401 → redirect to login)
- Uninstalling a non-installed app returns 404 with "الأداة غير مفعلة"
- Loading spinner on the button while request is in flight
- Button disabled during request to prevent double-click
