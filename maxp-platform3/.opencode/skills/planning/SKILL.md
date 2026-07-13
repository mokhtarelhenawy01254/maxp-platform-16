---
name: planning
description: Use for creating structured plans before executing complex multi-step tasks. Triggered by "create a plan", "what's the plan", "how should we approach this", "break this down". Use proactively for any task requiring 5+ distinct steps or multiple files.
---

# Planning

## Planning Framework
Before executing any complex task, create a structured plan:

### 1. Goal Definition
- What is the desired outcome? Be specific and measurable.
- What are the constraints (time, tools, compatibility)?
- What is the success criteria?

### 2. Task Decomposition
- Break the goal into independent, ordered sub-tasks
- Each sub-task should be testable independently
- Identify dependencies between sub-tasks

### 3. Risk Identification
- What could go wrong at each step?
- What are the rollback/recovery options?
- Which steps have the highest uncertainty?

### 4. Resource Assessment
- What files need to be read or modified?
- What tools are needed?
- What information is missing that needs research first?

### 5. Execution Order
- Order steps by dependency
- Batch independent steps for parallel execution
- Include verification checkpoints between major steps

## Plan Format
```markdown
## Goal: [One sentence]

## Steps
1. [Step name] — [What, why, expected outcome] — Depends on: [none / step N]
2. [Step name] — [Description] — Depends on: [step 1]
...

## Risks
- [Risk]: [Mitigation]

## Verification
- [How to verify success at each checkpoint]
```

## Using TodoWrite
Always use the todowrite tool to track plan execution. Mark steps as:
- `pending` → not started
- `in_progress` → currently working (only one at a time)
- `completed` → finished and verified
- `cancelled` → no longer needed
