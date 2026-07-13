# Reports Hub

## What Changed
- `/reports` no longer forces dark mode and now respects the active site theme like the rest of the app shell.
- Reworked the page from a "sidebar inside a sidebar" layout into a hub pattern:
  - core reports are selected from a card grid inside the page
  - the selected report expands below at full width
  - related destinations such as `/reports/profit-loss` and `/analytics` are surfaced as clear route cards instead of feeling scattered
- Removed the direct `Profit Analytics` item from the global sidebar so the reports section has fewer overlapping entry points.

## Why
- The previous root `/reports` route felt visually disconnected because it always switched the shell to dark mode.
- Navigation felt noisy because users had:
  - the global sidebar report group
  - an additional in-page left rail for report selection
  - a separate sidebar item for profit analytics
- The new structure keeps report discovery inside the hub page while preserving existing routes.

## Implementation Notes
- Theme behavior changed in `frontend/src/hooks/useTheme.tsx`.
- Sidebar cleanup changed in `frontend/src/config/sidebar.ts`.
- The hub layout lives in `frontend/src/pages/reports/Reports.tsx`.
- Existing routes remain valid:
  - `/reports`
  - `/reports/profit-loss`
  - `/analytics`
