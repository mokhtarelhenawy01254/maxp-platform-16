# Super Admin Multi-Task Timer Fix - 2026-05-25

## Summary

Super Admin dev task time tracking now supports multiple simultaneous task timers for the same dev member. The duplicate guard only blocks a second running timer on the same task/member pair.

## Backend Contract

- `POST /api/v1/super-admin/dev/tasks/:taskId/timer/start`
  - Allows starting a timer when the current member has another task timer running.
  - Returns `400` only when the same member already has a running timer for the same task.
- `GET /api/v1/super-admin/dev/timer/active`
  - Preserves `data` as the primary timer for legacy consumers.
  - Adds `timers[]` with every running timer for the current member.
- `POST /api/v1/super-admin/dev/tasks/:taskId/timer/pause`
  - Accepts optional `timerId` to pause a specific running record.
- `POST /api/v1/super-admin/dev/tasks/:taskId/timer/stop`
  - Already accepts optional `timerId`; frontend now passes it from active timer cards.

## Frontend Contract

- `TimerContext` keeps `activeTimer` for legacy callers and adds:
  - `activeTimers[]`
  - `elapsedSecondsByTask`
  - `getTimerForTask(taskId)`
  - `getElapsedSecondsForTask(taskId)`
- `DevTaskDetails` renders timer controls from the displayed task's timer only.
- `ActiveTimers` marks current-user timers by `timer.id` or `taskId` and sends `timerId` for pause/resume/stop actions.
- System user post-auth routing now sends users directly to `/super-admin/dev-dashboard`.

## Verification

- Local API smoke created two temporary tasks, started both task timers concurrently, verified a duplicate timer on the first task returned `400`, confirmed both active timer endpoints showed the running timers, then stopped both timers and deleted the temporary data.
- `npx jest tests/integration/superAdminDev.test.js --runInBand --testTimeout=30000 --forceExit` covers the same-member/different-task start behavior and asserts the duplicate guard query is scoped by `taskId`.
- Backend syntax checks passed.
- Frontend production build passed with deployment-style environment flags.
- Touched frontend files had no filtered TypeScript errors; the full frontend type-check still fails on pre-existing unrelated project-wide TypeScript debt.
