# Task Details Mobile Action Bar Fix - 2026-05-03

## Context

The production task details page used a fixed mobile action bar at the bottom of the viewport. On narrow screens this bar overlapped the tab strip and task content, making the first mobile viewport look crowded and partially covered.

## Change

- Removed the visible fixed bottom action bar from the mobile task details page.
- Reduced the task details page bottom padding on the normal loaded state from `pb-28` to `pb-6`.
- Kept the primary task actions available in the hero card: start timer, follow, and edit.
- Kept the in-page horizontal task tabs as the source of tab navigation.

## Verification

- `npm run build` from `frontend/` completed successfully.
- Local Playwright check at 390px loaded the target task details page and confirmed:
  - no horizontal overflow (`scrollWidth === clientWidth === 390`);
  - no visible fixed bottom action bar;
  - the Arabic task title, description, due date, and estimate render in the task page.

## Notes

This is a narrow visual fix for task details on mobile. It does not change task API behavior, timers, comments, subtasks, or permissions.
