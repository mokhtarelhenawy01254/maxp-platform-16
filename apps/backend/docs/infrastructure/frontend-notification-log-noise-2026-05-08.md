# Frontend Notification Log Noise

## Summary

The frontend notification paths now share the `browserNotifications` helper for native desktop notifications in WhatsApp chat and Facebook Inbox.

## Behavior

- WhatsApp and Facebook Inbox no longer duplicate direct `new Notification(...)` construction.
- The shared helper falls back to `ServiceWorkerRegistration.showNotification(...)` when the browser rejects direct notification construction.
- WhatsApp message notifications keep the existing auto-close behavior through the helper's `autoCloseMs` option.
- Facebook Inbox still requests notification permission only when a native notification was not shown and the user has not denied permission.
- Super Admin active-user polling suppresses expected `401` and `403` responses so unauthorized views do not spam the console.

## 2026-05-20 Production Follow-Up

- Production `/facebook-inbox` logs showed repeated mobile browser failures for direct `Notification` construction.
- Re-centered Facebook Inbox and WhatsApp Chat on the shared helper so their local message paths cannot bypass the service-worker fallback.
- Added focused frontend coverage for the direct-notification rejection path to prevent this log-noise regression from returning.

## Reason

Some browser/runtime combinations throw recurring notification errors even when the app can safely use the service worker notification path. Centralizing the logic keeps inbox surfaces quieter without changing the user-facing notification controls.
