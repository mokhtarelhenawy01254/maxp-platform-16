# Super Admin Companies UI Notes

Date: `2026-04-25`

## What changed

- Moved the Facebook page check from a dedicated side panel into a compact inline search workspace inside the main companies panel.
- Kept Facebook lookup results hidden until the admin actively searches, so the companies surface stays focused and less cramped.
- Tightened the shared `ResponsiveOverlay` shell used by the page's dialogs and sheets by improving header separation, body padding, and footer rhythm.

## Why

The previous layout gave the Facebook lookup a permanent column, which reduced the available space for the companies list and made the page feel less aligned with adjacent admin screens. The new layout keeps the companies workflow as the primary surface and treats Facebook lookup as a supporting tool.

## Affected file

- `frontend/src/pages/SuperAdminCompanies.jsx`
