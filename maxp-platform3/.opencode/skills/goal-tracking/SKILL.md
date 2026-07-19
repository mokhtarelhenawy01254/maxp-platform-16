---
name: goal-tracking
description: Use for tracking progress toward defined goals, measuring completion, and maintaining focus on the original objective. Triggered by "track progress", "are we on track", "what's remaining", "how close are we". Use for long-running or multi-session tasks.
---

# Goal Tracking

## Goal Definition
A well-defined goal has:
- **Objective**: Clear, specific outcome
- **Success Criteria**: Measurable conditions that indicate completion
- **Timeline**: Expected scope (this session, this week, etc.)
- **Dependencies**: What must be done first

## Progress Tracking

### Per-Session Tracking
- Use todowrite to track sub-tasks in real-time
- Calculate completion percentage: completed / total sub-tasks
- Note any scope changes (added or removed tasks)

### Cross-Session Tracking
Store goal progress in `.opencode/memory/goals/`:
```markdown
# Goal: [Description]
- **Started**: YYYY-MM-DD
- **Last Activity**: YYYY-MM-DD
- **Status**: [in-progress / blocked / completed]
- **Progress**: X/Y sub-tasks (Z%)
- **Blockers**: [List]
- **Next Steps**: [What to do when resuming]
```

## Progress Reporting
When asked for progress:
```
Goal: [description]
Progress: [X/Y] sub-tasks ([Z]%)
Status: [on-track / at-risk / blocked]
Completed: [list key completions]
Remaining: [list remaining items]
Blockers: [any blockers]
Estimated: [remaining estimate if applicable]
```

## Staying on Track
- Before starting each new sub-task, confirm it serves the goal
- If a sub-task expands in scope, flag it for user decision
- Periodically re-read the original goal to avoid scope creep
- When the user asks for something that diverges from the goal, note it and ask if it should be a separate goal

## Goal Completion
When all success criteria are met:
1. Mark the goal as completed
2. Archive the goal file with completion date
3. Summarize what was accomplished
4. Note any follow-up work for future goals
