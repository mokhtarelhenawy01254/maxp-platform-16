# Tasks Compact Header - 2026-05-05

## Scope

The `/tasks` workspace UI was tightened to reduce vertical height and remove oversized visual blocks while keeping the existing task workflow intact.

## Changes

- Reworked the workspace tabs into a flatter segmented strip so the page opens with navigation instead of a row of bulky mini-cards.
- Replaced the tall task command area with a denser operational header that keeps only scope, view state, key counts, a quick density toggle, and the primary actions.
- Restored normal reading sizes for task titles, descriptions, controls, and bulk actions so the compact pass no longer relies on shrinking typography.
- Reduced search/filter surface height through spacing, control sizing, and chip rhythm instead of pushing text down to tiny sizes.
- Tightened the task queue container, table header, row padding, badges, mobile cards, progress bars, and pagination while keeping the information hierarchy readable.
- Added persisted workspace density preferences (`compact` / `comfortable`) with matching scoped `.tasks-page` control overrides.

## Notes

- Behavior and data flow are unchanged.
- Density now lives in the same saved workspace settings as scope, sorting, and page size, so the page can stay compact without becoming visually cramped for heavy daily use.
- Primary actions remain available: filters, export/bulk actions, project creation, task creation, task status changes, view/edit/delete, and pagination.
- The page should now read as a focused operations screen rather than a stack of large cards.
