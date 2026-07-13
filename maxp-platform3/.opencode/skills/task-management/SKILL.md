---
name: task-management
description: Use for organizing, prioritizing, and tracking multiple tasks across a session. Triggered by "manage these tasks", "prioritize", "what should I work on next", "track progress". Use when the user provides multiple tasks or when the session scope is large.
---

# Task Management

## Core Workflow
1. **Capture**: Collect all tasks from the user's request
2. **Clarify**: For ambiguous tasks, ask clarifying questions before planning
3. **Organize**: Group related tasks, identify dependencies
4. **Prioritize**: Order by urgency, dependency chain, and user-specified priority
5. **Execute**: Work through tasks using the todowrite tool
6. **Review**: After completion, verify each task's outcome

## Priority Levels
- **High**: Blocking other work, user explicitly asked first, production issue
- **Medium**: Important but not blocking, part of the main request
- **Low**: Nice-to-have, can be deferred, follow-up improvements

## Tracking with TodoWrite
Always use the todowrite tool to maintain visibility:
- One task `in_progress` at a time
- Mark `completed` only after verification (tests pass, lint clean, etc.)
- If blocked, add a follow-up task describing the blocker
- Update status in real-time, not in batches

## Context Switching
When interrupted with a new request:
1. Note the current state of the in-progress task
2. Create a reminder task to resume it
3. Address the new request
4. Return to the original task using the reminder

## Reporting
When asked for status:
- Completed: X/Y tasks
- In progress: [current task with brief status]
- Blocked: [tasks and blockers]
- Next: [next task to be picked up]
