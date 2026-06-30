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
