# WhatsApp Tailwind Migration

## Goal

Move the WhatsApp workspace from mixed MUI layouts to a consistent `shadcn/ui + Tailwind` implementation, using the `impeccable` design brief as the guiding system.

## Design Direction

- Mode: light, RTL-aware operations workspace
- Tone: premium, calm, dense, practical
- Visual language: shared page shell, compact metric cards, consistent filters, cleaner data tables, and lower visual noise than the MUI version

## Scope

Primary route set under `frontend/src/pages/whatsapp/`:

- `WhatsAppChat.tsx`
- `WhatsAppSettings.tsx`
- `WhatsAppNotifications.tsx`
- `WhatsAppCustomerJourney.tsx`
- `WhatsAppAnalytics.tsx`
- supporting components under `frontend/src/pages/whatsapp/components/`

## Migration Plan

1. Establish shared WhatsApp Tailwind primitives
2. Convert medium-complexity reporting surfaces first
3. Reuse the same primitives in notifications and journey screens
4. Migrate the large interactive screens last: settings and chat

## Progress

### 2026-04-25

- Added `.impeccable.md` to lock the design context for the WhatsApp workspace migration.
- Added a shared `WhatsAppPageShell` Tailwind/shadcn foundation for page framing and metric surfaces.
- Migrated `WhatsAppAnalytics.tsx` away from MUI to `shadcn/ui + Tailwind`.
- Migrated `WhatsAppNotifications.tsx` away from MUI to `shadcn/ui + Tailwind`, including tabbed settings, template management, and modal workflows.
- Migrated `WhatsAppCustomerJourney.tsx` away from MUI to `shadcn/ui + Tailwind`, replacing the old timeline CSS and browser confirm flows with shared Tailwind patterns and shadcn dialogs.
- Migrated `WhatsAppSettings.tsx` away from MUI to `shadcn/ui + Tailwind`, including the settings workspace shell, session management dialogs, quick replies, privacy/business tools, and scoped admin sections.
- Started the chat migration by rebuilding `MessageBubble.tsx` and `ChatWindow.tsx` away from MUI, moving the reading and reply surface onto Tailwind primitives while keeping existing chat data flow intact.

### 2026-04-26

- Migrated `ChatSidebar.tsx` away from MUI to a Tailwind/shadcn implementation with session switching, archive toggles, contextual chat actions, status cards, and shared action patterns.
- Moved the outer `WhatsAppChat.tsx` loading/auth/layout shell off the MUI `Box` wrappers.
- Replaced the in-chat message context menu, forward dialog, and individual contact drawer inside `WhatsAppChat.tsx` with `shadcn/ui + Tailwind` surfaces.
- Fixed the forward-target selection to use contact JIDs instead of local contact IDs during message forwarding.
- Migrated the remaining `WhatsAppChat.tsx` dialog and drawer surfaces away from MUI, including poll creation, interactive buttons, list messages, product selection, starred messages, order building, location sharing, and status posting.
- Migrated the remaining WhatsApp-specific support components under `frontend/src/components/whatsapp/` away from MUI: `BroadcastDialog`, `BusinessProfileDialog`, `CheckNumberDialog`, `CreateGroupDialog`, `GroupInfoDrawer`, `LabelsDialog`, `PrivacySettingsDialog`, and `ProfileDialog`.
- Rebuilt `frontend/src/components/common/ConfirmDialog.tsx` on the shared shadcn/Tailwind stack so WhatsApp no longer depends on a legacy MUI confirm surface.
- Removed the final WhatsApp-area MUI dependency from `WhatsAppPageShell.tsx` by replacing the `Button` render-prop back action with a native `Link`-based Tailwind control, clearing the recurring Base UI console warning during QA.
- Visually verified the migrated WhatsApp workspace through mocked desktop/mobile browser captures after auth and API mocking, confirming the main desktop states for chat, contact info, analytics, notifications, journeys, and settings, plus mobile chat layout.
- Cleaned the remaining `WhatsAppChat.tsx` lint debt from legacy `any` usage and hook dependency warnings, and re-ran mocked desktop/mobile chat captures after the cleanup to confirm the chat layout still holds up.

### 2026-05-03

- Fixed the mobile WhatsApp chat layout so the conversation list is no longer squeezed under the header/filters. Mobile now behaves as a single-pane inbox/chat flow: the list gets the full workspace height, opening a contact switches to the chat, and the chat header includes a mobile-only back control.

### 2026-05-04

- Applied the mobile chat sizing fix to the current `main` frontend and manually deployed the rebuilt `dist` to production without a GitHub push. Production backup: `/var/www/frontend2/dist.manual-backup-20260504105735`.
- Verified `https://maxp.online/whatsapp?codexBust=20260504105735` loads the new bundle (`index-Cj_wxtRR.js`) and shows the mobile chat list immediately with the desktop summary hidden.

## Verification Notes

- `eslint` is clean for the migrated WhatsApp workspace, including `WhatsAppChat.tsx`.
- Browser QA after mocking auth/data showed clean renders for analytics, notifications, journeys, and settings.
- A follow-up mocked chat QA pass after the final lint cleanup showed clean desktop/mobile renders with no console noise beyond the expected Socket.IO connection errors from the missing realtime backend.
- Production mobile QA on 2026-05-04 used a short-lived authenticated preview token, confirmed `desktopSummaryVisible=false`, and captured `frontend/tmp/prod-whatsapp-mobile-maxp-fixed-20260504105735.png`.

## Remaining Risks

1. Browser verification used mocked auth/data because the local dev app redirects unauthenticated sessions to `/auth/login`; a final sign-off pass against a real authenticated backend would still be valuable.
