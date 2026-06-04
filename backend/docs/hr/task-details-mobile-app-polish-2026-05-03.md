# Task Details Mobile App Polish - 2026-05-03

## Context

The task details page for HR/task management had already removed the fixed mobile action overlay, but the mobile layout still behaved like a compressed desktop page in several places.

Observed issues on a 390px viewport:

- The hero actions were simple wrapped web buttons instead of a primary mobile action plus secondary actions.
- The mobile summary hid the assignee and estimated time cards, so the first screen did not show all key task data.
- Long Arabic task descriptions appeared as a dense block too early in the page.
- The main content grid could overflow horizontally because grid children kept their default minimum content width with mixed Arabic and English text.

## Change

Updated `frontend/src/pages/tasks/TaskDetails.tsx` to make the mobile task details page feel closer to an app screen:

- Tightened mobile page spacing and hero card radius/padding.
- Promoted the timer action to a full-width primary mobile button, with watch/edit as a two-column secondary row.
- Displayed progress, due date, tracked time/estimate, and assignee in a complete two-by-two mobile summary grid.
- Added safer truncation and two-line hints for summary stat cards.
- Collapsed long descriptions on mobile after a short preview and added a mobile-only expand/collapse control.
- Added `min-w-0` to the main task details grid columns so panels shrink correctly instead of overflowing off-screen.

## Verification

- Frontend production build passed locally with `npm run build`.
- Local Playwright visual check at 390px loaded production task data through the production API and confirmed:
  - `scrollWidth` equals `clientWidth` at `390px`.
  - Assignee `Yomna Mohamed` is visible in the mobile summary.
  - Estimated time `32` hours is visible in the mobile summary.
  - No non-tab panel overflow remains.
  - Long description preview uses the mobile expand control.

Artifacts:

- `artifacts/task-visual-review-2026-05-03-local-polish/mobile-polished-local-final.png`
- `artifacts/task-visual-review-2026-05-03-local-polish/mobile-polished-local-final.json`
