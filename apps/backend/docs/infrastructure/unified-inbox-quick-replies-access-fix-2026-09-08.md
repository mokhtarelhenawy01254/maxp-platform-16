# Unified Inbox Quick Replies & App Access Authorization Fix — 2026-09-08

## Summary

Fixed a `403 Forbidden` error when fetching `/api/v1/unified-inbox/quick-replies` and accessing Unified Inbox routes from company accounts with active messaging channels (WhatsApp, Facebook, Instagram, TikTok, Telegram, CRM). Also eliminated duplicate Socket.IO `new_message` listener registrations that caused duplicated message notifications and logs.

## Root Cause

1. **Missing `unified-inbox` Aliases in `LEGACY_APP_SLUG_ALIASES`**:
   `checkAppAccess.js` had aliases mapping `whatsapp-business` -> `['..., unified-inbox']`, but did NOT define `unified-inbox` as a target slug in `LEGACY_APP_SLUG_ALIASES`. As a result, when companies with active `whatsapp-business`, `facebook-pages-connect`, `crm-lite`, etc. accessed `/unified-inbox/*` endpoints, `candidateSlugs` only checked `['unified-inbox']`, which the vast majority of companies did not have directly installed in `CompanyApp`. This threw `403 Forbidden: هذه الميزة تتطلب تفعيل: Unified Inbox`.

2. **Unnecessary App Access Requirement on Quick Replies**:
   The `/quick-replies` endpoint (`GET /api/v1/unified-inbox/quick-replies`) is called by `QuickReplyDropdown.tsx` across all inboxes (Facebook Messenger, Instagram, WhatsApp, Unified Inbox). Enforcing `checkAppAccess('unified-inbox')` on fetching saved message snippets blocked agents from loading their quick replies. Furthermore, `unifiedInboxController.getQuickReplies` lacked fallback resolution for `req.headers['x-company-id']` / `req.query.companyId` and returned `403` for `SUPER_ADMIN` users when `companyId` was null.

3. **Socket.IO Duplicate Listener Accumulation**:
   In `useSocket.ts`, the `new_message` listener was registered inside `newSocket.on("connect", ...)` without removing previous listeners (`newSocket.off("new_message")`). On reconnections, listeners accumulated, logging `[NEW-MESSAGE]` multiple times for every incoming message.

## Changes Made

### 1. `apps/backend/middleware/checkAppAccess.js`
Added `'unified-inbox'` to `LEGACY_APP_SLUG_ALIASES`:
```javascript
  'unified-inbox': [
    'whatsapp-business',
    'whatsapp-integration',
    'whatsapp-inbox',
    'facebook-pages-connect',
    'instagram-business',
    'tiktok-integrations',
    'telegram-business',
    'telegram-integration',
    'crm-lite',
    'crm-basic'
  ],
```

### 2. `apps/backend/routes/unifiedInboxRoutes.js`
Removed `checkAppAccess('unified-inbox')` from `GET /quick-replies`, allowing authenticated users (`verifyToken.authenticateToken`) to retrieve their company's saved replies without app blocking.

### 3. `apps/backend/controller/unifiedInboxController.js`
Added companyId fallback resolution from headers and query parameters, and graceful handling for `SUPER_ADMIN` (returning `{ success: true, data: [] }` instead of `403` when no company is selected).

### 4. `apps/frontend/src/hooks/useSocket.ts`
Added `newSocket.off("new_message")` before `newSocket.on("new_message", ...)` to prevent duplicate event listener registration on reconnects.

## Verification

- Tested backend syntax: `node -c` on all modified files passed without errors.
- Verified company app access aliases against production database schema.
