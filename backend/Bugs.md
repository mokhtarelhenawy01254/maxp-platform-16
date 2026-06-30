# Backend Bugs Log

### [FIX] WhatsApp Session Dropdown Displayed Raw CUID for Meta Cloud
- **Date**: 2026-06-30
- **Description**: The WhatsApp Session dropdown in the template broadcast page displayed the raw database CUID instead of the friendly name or phone number for Meta Cloud sessions.
- **Root Cause**:
  1. For Meta Cloud sessions, the phone number is stored in `metaDisplayPhoneNumber` instead of `phoneNumber` (which is `null`).
  2. The dropdown used `{s.name || s.phoneNumber || s.id}` to display the session label. When `name` was missing/empty or matched the CUID itself, and `phoneNumber` was `null`, it fell back to the CUID `id`.
- **Resolution**:
  1. Updated the `Session` interface in the frontend page to include `provider` and `metaDisplayPhoneNumber`.
  2. Modified the dropdown rendering logic to detect if the session's name is a CUID (or matches the session ID), and display `metaDisplayPhoneNumber` or `phoneNumber` as the primary fallback before displaying the raw ID.
- **Files Modified**:
  - `apps/frontend/src/pages/whatsapp/WhatsAppTemplateBroadcast.tsx`

### [FIX] Broken translations on Project Break-Even page
- **Date**: 2026-06-30
- **Description**: Translation keys like `projectBreakEven.title` were displayed raw on the page instead of their Arabic/English translations.
- **Root Cause**:
  1. The page-level translation keys for `projectBreakEven` were manually added directly in `translation.json` files but were missing from the `sections/` directory.
  2. The `merge-translations.js` script (which runs on build/dev) automatically overwrites `translation.json` with the combined content of the JSON files in `sections/`. Consequently, the manual edits were overwritten, causing translation loading to fail.
- **Resolution**:
  1. Created dedicated translation files `apps/frontend/src/locales/ar/sections/projectBreakEven.json` and `apps/frontend/src/locales/en/sections/projectBreakEven.json` containing the translation keys.
  2. Ran the merge script to safely regenerate `translation.json` files with `projectBreakEven` as a root-level key.
- **Files Modified**:
  - `apps/frontend/src/locales/ar/sections/projectBreakEven.json`
  - `apps/frontend/src/locales/en/sections/projectBreakEven.json`

### [FIX] WhatsApp Inbox Displaying Unassigned/Inactive Sessions for Admins
- **Date**: 2026-07-01
- **Description**: The WhatsApp inbox page (`/whatsapp-inbox`) displayed unconfigured, draft, or disconnected sessions for admin roles, which differed from the settings page (which only showed configured assignments).
- **Root Cause**:
  1. For admin roles, the `getUserAccessibleSessionIds` helper in `numberAccessGuard.js` was querying all `whatsAppSession` records directly from the DB, bypassing `whatsAppNumberAssignment` entirely.
  2. For `Harf Online`, this resulted in all 8 sessions (like `ww`, `22`, `Sales S5`, etc.) showing up in the inbox sidebar, even though only 2 (`Harf ACC` and `SalesApiss`) were active in the settings.
  3. Furthermore, `NumberSidebar.tsx` was vulnerable to a frontend TypeError crash during search if a session's `phoneNumber` was `null` (which was true for 7 of Harf's sessions).
- **Resolution**:
  1. Modified `getUserAccessibleSessionIds` in `apps/backend/middleware/numberAccessGuard.js` to ensure even admin users only retrieve sessions linked to an active assignment (`isActive: true` on `whatsAppNumberAssignment`).
  2. Updated `apps/frontend/src/pages/whatsapp-inbox/components/NumberSidebar.tsx` to handle `null` phone numbers safely by adding an empty string fallback before invoking `toLowerCase()`.
- **Files Modified**:
  - `apps/backend/middleware/numberAccessGuard.js`
  - `apps/frontend/src/pages/whatsapp-inbox/components/NumberSidebar.tsx`

### [FIX] Meta Cloud WhatsApp Session showing Disconnected in Routing Workspace
- **Date**: 2026-07-01
- **Description**: Meta Cloud API sessions (like `SalesApiss`) were shown as CONNECTED on the Settings page but as DISCONNECTED in the Routing Workspace page.
- **Root Cause**:
  1. Meta Cloud sessions are webhook-based and are not managed in the in-memory Baileys `activeSessions` map.
  2. The `getRoutingWorkspace` query in `numberAssignmentService.js` was falling back to the database status for any session not in `activeSessions`, resulting in `DISCONNECTED` for `SalesApiss`.
  3. The main WhatsApp Settings page resolves any `META_CLOUD` provider session to `connected` as it doesn't rely on web socket uptime.
- **Resolution**:
  1. Updated `getRoutingWorkspace` in `apps/backend/services/numberAssignmentService.js` to explicitly resolve `META_CLOUD` sessions as `CONNECTED`.
- **Files Modified**:
  - `apps/backend/services/numberAssignmentService.js`
