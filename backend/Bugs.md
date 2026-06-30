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
