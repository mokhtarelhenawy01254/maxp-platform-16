# [FEATURE] WhatsApp Inbox Routing Modes & Privacy Isolation

- **Date**: 2026-05-20
- **Scope**: WhatsApp inbox assignment, inbox settings, realtime delivery visibility, and admin routing UX.

## Summary

The WhatsApp inbox admin flow was unified into a single workspace:

1. ` /whatsapp-inbox `
   - Unified **WhatsAppRoutingWorkspace** page combining routing assignment + inbox settings.
   - Settings live in a slide-over panel — no separate `/settings/inbox` page.
   - Old pages `WhatsAppNumberSettings.tsx` + `InboxSettingsPage.tsx` deleted.

The legacy ` /settings/inbox ` path now redirects to `/whatsapp-inbox`.
The ` /notifications/inbox ` page redirects to the unified workspace.

## Supported Routing Modes

### 1. Direct Number Owner

- Each WhatsApp number is linked to exactly one employee.
- Any conversation received on that number is visible only to that employee.
- Other employees must not see:
  - messages
  - customer details
  - chat status
  - unread counters
  - realtime notifications for that conversation

### 2. Round Robin Distribution

- A single WhatsApp number can be linked to multiple employees.
- Each new customer conversation is auto-assigned to exactly one employee.
- Distribution currently uses equal round-robin sequencing.
- Once a conversation is assigned, only the assigned employee can see that conversation and its updates.

## Backend Changes

### Routing metadata

`WhatsAppNumberAssignment` now stores:

- `routingMode`
- `distributionStrategy`
- `routingUserIds`
- `roundRobinCursor`
- `lastDistributedUserId`
- `lastDistributedAt`

This enables both one-owner routing and deterministic round-robin assignment without separate tables.

### Conversation assignment

New service:

- `backend/services/whatsappConversationRoutingService.js`

Responsibilities:

- normalize routing mode and distribution strategy
- resolve effective routing users
- assign new conversations to the correct employee
- advance the round-robin cursor
- persist assignment metadata

### Visibility isolation

The inbox visibility model was tightened in three layers:

1. API filtering
   - Non-admin users only receive conversations they are allowed to view.
2. Access guards
   - Session access honors number-owner and routing-team membership.
   - Round-robin conversations reject access for non-assigned employees.
3. Realtime delivery
   - WhatsApp socket events and inbox notifications are emitted only to the authorized user audience instead of company-wide broadcast rooms.

New helper:

- `backend/services/whatsappRealtimeAudienceService.js`

This service computes the proper realtime audience for conversation-level events and emits to per-user rooms.

## Frontend Changes

### `/whatsapp-inbox`

- Admin roles now land on a routing workspace instead of the older multi-page inbox setup.
- Non-admin operational users keep the existing inbox/chat experience.
- The routing workspace includes:
  - number list
  - routing mode switch
  - employee selection
  - privacy summary
  - quick link to inbox settings

### `/settings/inbox`

The settings page was simplified to one operational surface covering:

- chat workflow defaults
- transfer and close policies
- notifications
- browser/sound behavior
- working hours
- privacy policy summary for routing modes

## Sidebar Access

- The WhatsApp sidebar now keeps the admin-facing shortcuts in this order:
  - `/whatsapp`
  - `/whatsapp/notifications`
  - `/whatsapp-inbox`
  - `/whatsapp/settings`
  - `/settings/inbox`
  - `/whatsapp/analytics`
- This keeps the classic WhatsApp entry and notifications shortcut visible first, while the newer routing and inbox settings pages stay one click away inside the same section.

### `/notifications/inbox`

- Redirects to `/settings/inbox`
- Prevents duplicate admin configuration pages

## Workspace Payload Stability

- The routing workspace API now returns `routingUsers` from the resolved assignment members for each number.
- This prevents the admin routing page from failing when sessions exist but the response is being assembled for display.

## Realtime Isolation Rules

For new inbound or outbound WhatsApp events:

- conversation updates go only to the assignee when a conversation is assigned
- direct-routing sessions fall back to the single mapped employee
- round-robin sessions never broadcast conversations to all employees on the same number

This applies to:

- new message events
- outgoing message events
- message status updates
- inbox notifications and unread badge updates

## Verification

- `backend: npm run check:syntax`
- `backend: npx prisma validate --schema=prisma/schema`
- `frontend: npm test -- --runInBand src/pages/whatsapp-inbox/__tests__/adminPages.test.tsx`
- `frontend: npm run build` with `NODE_OPTIONS=--max-old-space-size=8192`

## Test Coverage Follow-up

- A same-day test-only follow-up aligned `adminPages.test.tsx` with the final admin IA:
  - removed the obsolete `RolesSettings` coverage after the duplicate inbox roles surface was retired
  - loosened the Arabic live-refresh assertion to a regex so the heading still matches when surrounding copy shifts without changing the 30-second refresh contract

## Known Verification Note

- Full browser validation for the new admin flow depends on the backend changes being deployed together with the frontend because the new routing workspace consumes new WhatsApp admin APIs and stricter visibility logic.
