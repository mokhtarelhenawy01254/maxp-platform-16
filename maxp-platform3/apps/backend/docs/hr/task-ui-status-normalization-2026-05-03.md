# Task UI Status Normalization - 2026-05-03

## Context

Production task APIs can return task statuses in enum form such as `PENDING`, `IN_PROGRESS`, and `COMPLETED`.
The task table UI previously compared those values against lowercase strings when deciding whether to show the start and complete actions.

## Change

- Normalize task statuses before rendering status action buttons.
- Normalize task statuses before choosing status labels, colors, icons, overdue behavior, and WhatsApp completion event logic.
- Normalize task status and priority values before opening the edit modal select inputs.
- Add regression coverage for uppercase API statuses in the task table.

## Validation

- Targeted task table Jest coverage verifies that `PENDING` shows the start action and `IN_PROGRESS` shows the complete action.
- Production lifecycle smoke testing should create a task, start it from the UI, complete it from the UI, then remove the test task.
