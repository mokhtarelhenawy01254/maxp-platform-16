# Team Sync Updates

## 2026-07-01 / 2026-03-09
- **WhatsApp Inbox Session Alignment Fix (FIX)**: Fixed `/whatsapp-inbox` displaying unassigned/draft WhatsApp sessions for admin roles. The list is now filtered to show only sessions that have an active assignment configured in settings.
- **NumberSidebar Search Crash Fix (FIX)**: Fixed potential null pointer TypeError in the settings page when searching numbers with missing `phoneNumber` fields.
- **Meta Cloud Status Resolution Fix (FIX)**: Fixed `META_CLOUD` provider sessions resolving to `DISCONNECTED` on the routing workspace page. Meta Cloud sessions are now resolved to `CONNECTED` identically to the WhatsApp Settings page.
- **Soft-Deleted Sessions Filtering Fix (FIX)**: Fixed soft-deleted/draft sessions (where `isDeleted: true` in metadata) displaying in the Routing Workspace page by mirroring the metadata filter used in the Settings page.
- **WhatsApp Workspace Dropdown Display Fix (FIX)**: Fixed selected WhatsApp session showing as database CUID ID instead of its friendly name in the select trigger after choosing a session on `/whatsapp`.
- **WhatsApp Workspace Session RBAC Access Fix (FIX)**: Fixed `/whatsapp` session selection list exposing all company numbers to moderators; it now filters the dropdown to only show the sessions assigned to the active moderator.

## 2026-06-30 / 2026-03-09
- **WhatsApp Template Broadcast UI Fix (FIX)**: Resolved the bug where the WhatsApp Session dropdown displayed the raw database CUID instead of the friendly name or display phone number for Meta Cloud sessions.
- **Project Break-Even Translation Fix (FIX)**: Resolved raw translation keys (like `projectBreakEven.title`) showing on the break-even page by creating dedicated locale section files (`projectBreakEven.json`) for Arabic and English to prevent them from being overwritten during i18n merge operations.
- **Documentation Sync**: Created the backend synchronization docs (`Bugs.md`, `Structure.md`, `TEAM_SYNC.md`) to comply with CI/CD rules and documented the fix.
