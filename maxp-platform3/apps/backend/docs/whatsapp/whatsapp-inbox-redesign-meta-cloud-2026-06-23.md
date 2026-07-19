# WhatsApp Inbox Redesign + Meta Cloud API Improvements

## Date
2026-06-23

## Changes

### WhatsApp Inbox UI Redesign (5 frontend files)
- Simplified all whatsapp-inbox pages to match platform dashboard design language
- Removed decorative gradients, heavy shadows, oversized border radii
- Replaced hardcoded colors with CSS variables (`bg-card`, `text-foreground`, etc.)
- Removed all helper/explanation text and descriptions
- Standardized border radii: `rounded-[34px/30px/28px/26px/24px]` → `rounded-xl` or `rounded-lg`
- Standardized buttons: `rounded-2xl` → `rounded-lg` with `bg-primary`

Files:
- `apps/frontend/src/pages/whatsapp-inbox/WhatsAppNumberSettings.tsx`
- `apps/frontend/src/pages/whatsapp-inbox/WhatsAppInbox.tsx`
- `apps/frontend/src/pages/whatsapp-inbox/ModeratorDashboard.tsx`
- `apps/frontend/src/pages/whatsapp-inbox/InboxSettingsPage.tsx`
- `apps/frontend/src/pages/whatsapp-inbox/WhatsAppChat.tsx`

### Meta Cloud API — Session check bypass
- `whatsappController.js`: Skip in-memory session check for META_CLOUD provider sessions
- `WhatsAppManager.js`: Route `onWhatsApp` checks to `MetaCloudProvider.checkContact` for META_CLOUD sessions
- `MetaCloudProvider.js`: New `checkContact()` function using `/contacts` endpoint

### Frontend WhatsApp Settings — Cache invalidation
- `WhatsAppSettings.tsx`: Added `invalidateSessionsCache()` to clear IndexedDB + React Query cache on create/update/delete/disconnect

### ChatSidebar placeholder fix
- `ChatSidebar.tsx`: Added missing `placeholder` prop to Select component
