# Task Project Statistics Fix - 2026-05-03

## Summary

The production task-system runner found that project statistics did not count linked tasks after they were marked `COMPLETED`.

Root cause:

- Task statuses are stored and returned as uppercase enum values such as `COMPLETED`, `IN_PROGRESS`, and `PENDING`.
- `projectController` compared task statuses against lowercase values: `completed`, `in_progress`, and `pending`.
- As a result, `GET /projects/:id` returned the completed task but reported `completedTasks=0` and `completionRate=0`.

## Fix

- Normalize task status before project-stat comparisons.
- Apply the same comparison behavior to project list progress and project detail statistics.
- Add focused regression coverage for uppercase task statuses.

## Verification

Local checks:

- `node --check backend/controller/projectController.js`
- `npx jest tests/controller/projectController.stats.test.js --runInBand`

Production validation planned after deploy:

- Run the task-system internal project workflow again.
- Confirm `TASK-REG-PROJECT-001` passes.
- Confirm temporary QA project/category/task records are cleaned up after the run.
