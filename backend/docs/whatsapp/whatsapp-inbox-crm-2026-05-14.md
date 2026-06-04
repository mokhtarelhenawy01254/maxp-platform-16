# WhatsApp Inbox CRM

Full multi-moderator WhatsApp Inbox CRM with conversation management, number-based permissions, RBAC, per-moderator dashboard, internal notes, notifications, and settings pages.

## Current Operating Guarantees

- One customer conversation has one live owner only at any moment.
- Moderators are restricted to owned conversations; they cannot see or reply to another moderator's active chat.
- `TEAM_LEADER`, `COMPANY_ADMIN`, and `SUPER_ADMIN` can override ownership for escalations, transfers, and audits.
- Queue progression is standardized as `NEW` → `QUEUED` → `ASSIGNED` / `ACTIVE` → `PENDING` / `WAITING_CUSTOMER` → `ESCALATED` / `CLOSED`.
- The inbox no longer has a duplicate roles settings page; `/settings/roles` redirects to `/roles`, while operational inbox settings live in `/settings/inbox`.

## Architecture

### New Prisma Models (`backend/prisma/schema/whatsapp_inbox.prisma`)
- **ModeratorTeam** — Groups moderators under a Team Leader
- **ModeratorTeamMember** — Links users to teams
- **WhatsAppNumberAssignment** — Assigns a WhatsApp number exclusively to a moderator
- **ConversationModeratorNote** — Internal notes on conversations
- **ConversationTag** — Custom tags for conversations
- **ModeratorActivityLog** — Audit trail for moderator actions
- **ModeratorNotification** — In-app notifications for moderators
- **ModeratorDashboardCache** — Pre-computed dashboard stats (30m refresh)
- **InboxSettings** — Per-company inbox configuration

### Middleware
- **`numberAccessGuard.js`** — Ensures moderators only access their assigned number's chats/customers/data
- **`rbacMiddleware.js`** — 40+ granular permissions with role hierarchy (Super Admin → Company Admin / Admin → Team Leader → Moderator)

### Backend Services & Controllers
| Module | Service | Controller | Routes |
|--------|---------|------------|--------|
| Inbox CRM | `whatsappInboxService.js` | `whatsappInboxController.js` | `whatsappInboxRoutes.js` |
| Moderator Dashboard | `moderatorDashboardService.js` | `moderatorDashboardController.js` | `moderatorDashboardRoutes.js` |
| Internal Notes | — | `internalNotesController.js` | `internalNotesRoutes.js` |
| Number Assignment | `numberAssignmentService.js` | `numberAssignmentController.js` | `whatsappNumberAssignmentRoutes.js` |
| Inbox Notifications | `inboxNotificationService.js` | `inboxNotificationController.js` | `moderatorNotificationRoutes.js` |
| RBAC Admin | — | `rbacAdminController.js` | `rbacAdminRoutes.js` |
| Inbox Settings | — | `inboxSettingsController.js` | `inboxSettingsRoutes.js` |

### Routing & Ownership Engine
- **`whatsappAssignmentEngineService.js`**
  - Uses PostgreSQL advisory transaction locks to prevent duplicate assignment races.
  - Supports `ROUND_ROBIN`, `LEAST_LOAD`, and `SKILL_BASED` routing.
  - Handles automatic reassignment when the owner is offline, timed out, outside working hours, or above capacity.
- **`whatsappInboxSettingsService.js`**
  - Stores and normalizes JSON config blocks for assignment, ownership, queues, skills, SLA, notifications, and assignment-state cursors.
- **`whatsappInboxMetadata.js`**
  - Central source for queue-key derivation, session extraction, ownership flags, and SLA metadata helpers.
- **`WhatsAppSyncService.js`**
  - Writes `sessionId` into conversation metadata and triggers the assignment engine when inbound WhatsApp messages open or update conversations.

### Frontend Pages (`frontend/src/pages/whatsapp-inbox/`)
- **WhatsAppInbox.tsx** — Session-aware queue view with queue counters, search, moderator-capacity side panel, and owner-only conversation visibility
- **WhatsAppChat.tsx** — Owned chat workspace with transfer, assistance requests, internal notes, queue/SLA badges, and supervisor override tooling
- **ModeratorDashboard.tsx** — Localized operational dashboard with queue radar, connected numbers, workloads, and latest assigned threads
- **WhatsAppNumberSettings.tsx** — Admin number assignment & management with localized assignment workspace summaries
- **InboxSettingsPage.tsx** — Canonical inbox control center for assignment, ownership, queue, reassignment, skills, SLA, notifications, and working hours
- **InboxNotifications.tsx** — In-app notification center
- **queuePresentation.ts** — Shared queue label fallback helper used by inbox pages to avoid queue badge crashes on legacy payloads
- **index.ts** — Barrel exports

### Routing Note
- Legacy `/settings/roles` no longer has a separate inbox-specific page. App routing now sends that URL to the primary `/roles` management tool to avoid duplicate RBAC surfaces.

### RBAC Role Mapping
- `AGENT` → `MODERATOR` (own numbers only)
- `MANAGER` → `TEAM_LEADER` (team numbers)
- `COMPANY_ADMIN` / `ADMIN` / `OWNER` → `ADMIN` (all company numbers)
- `EMPLOYEE` → `MODERATOR` (legacy moderator alias)
- `SUPER_ADMIN` → `SUPER_ADMIN` (all companies)

### Admin UI Safety Notes
- `rbacAdminController.js` derives team leaders from `ModeratorTeamMember.isTeamLeader` instead of relying on a missing Prisma `leader` relation.
- `numberAccessGuard.js`, `moderatorDashboardService.js`, and `whatsappInboxService.js` normalize legacy role names before enforcing inbox visibility.
- Frontend admin pages translate common backend inbox/RBAC failures through `errorTranslation.ts` so operators see localized messages instead of raw English API text.

### Real-Time
- Socket.IO events for new messages, notifications, conversation updates
- Live sync via existing WhatsApp Baileys message pipeline
