# Notification Settings

## What changed

- Added a real `Web Push` browser channel to `Notification Settings`
- Wired both `order_created` and `customer_message` to optionally send a browser/system notification
- Added permission-aware UX so the page explains whether browser permission is:
  - granted
  - waiting for approval
  - denied
  - unsupported

## Web Push behavior

1. The user enables `إشعار المتصفح` from `/notification-settings`
2. After saving, the frontend registers `/push-sw.js`, requests a `PushSubscription`, and syncs it to the backend
3. The backend stores both notification preferences and browser subscriptions per `companyId + userId`
4. When a supported event happens, the backend checks:
   - global notifications are enabled
   - browser channel is enabled
   - the notification type allows the `browser` channel
   - quiet hours are not active
5. If all checks pass, the backend sends a real `web-push` payload and the service worker shows a system notification
6. Clicking the notification focuses an open app window or opens the target route directly

## Supported background events

- `order_created`
  - opens `/orders?search=<orderNumber>`
- `customer_message`
  - opens `/facebook-inbox?conversationId=<conversationId>`

## Persistence

- Backend settings are now persisted in PostgreSQL through:
  - `NotificationPreference`
  - `BrowserPushSubscription`
- The frontend still caches the latest local browser push state in `localStorage` so the UI can react instantly without reloading

## Notes

- When `Web Push` is active, in-page fallback popups are suppressed to avoid duplicates
- If the page is closed but the browser still supports background push for the current profile, notifications can continue to appear
- A one-time browser permission grant is still required per user/device/profile
- If the browser has already denied notifications for the site, the page now switches from `طلب إذن المتصفح` to an explicit recovery state with `تحديث حالة الإذن` plus guidance to re-allow notifications from browser/site settings first
- The `اختبار الإشعار` action now falls back to a non-browser channel automatically when the browser channel is not globally active or the permission is not granted, instead of failing with a misleading push-subscription error
- The settings page now includes a `تشخيص Web Push` panel that reads the live browser state and shows:
  - browser support
  - notification permission
  - service worker registration
  - whether a real push subscription exists
  - the locally cached push state
  - a short actionable diagnosis when something is missing or mismatched
- The same browser diagnostics panel now includes a dedicated `اختبار Web Push الكامل` block with:
  - `اختبار طلب جديد`
  - `اختبار رسالة عميل`
- These buttons do not rely on the old in-page `Notification API` fallback.
  - They call the backend `/notifications/test` route
  - send a real `web-push` payload
  - force the service worker to show a system notification for the test only, even while the page is still open
  - pin the test notification with `requireInteraction=true` so the page can verify that the push really arrived

## Files

- `frontend/src/pages/NotificationSettings.tsx`
- `frontend/src/components/notifications/NotificationDropdown.tsx`
- `frontend/src/utils/browserNotifications.ts`
- `frontend/src/utils/notificationSettings.ts`
- `frontend/src/utils/pushNotifications.ts`
- `frontend/public/push-sw.js`
- `backend/routes/notificationRoutes.js`
- `backend/services/browserPushService.js`
- `backend/services/notificationPreferencesService.js`
