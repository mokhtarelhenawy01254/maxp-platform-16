---
name: decision-making
description: Use for making structured decisions about architecture, tooling, approach, or implementation details. Triggered by "help me decide", "which approach", "what should we use", "evaluate options". Use when the user faces a choice between multiple viable options.
---

# Decision Making

## Decision Framework

### 1. Frame the Decision
- What is the decision that needs to be made?
- Why is it important?
- What is the deadline or urgency?

### 2. Identify Options
- List all viable alternatives
- Include "do nothing" or "defer" as options when appropriate
- For each option, describe at a high level

### 3. Define Criteria
Establish evaluation criteria with weights:
- **Functional**: Does it solve the problem?
- **Technical**: Performance, scalability, maintainability
- **Practical**: Implementation effort, learning curve
- **Strategic**: Alignment with existing tech stack, future plans
- **Risk**: Stability, community support, vendor lock-in

### 4. Evaluate Options
For each option, rate against each criterion:
| Criterion | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| Functional | High   | 8/10     | 7/10     | 9/10     |
| Technical | Medium | 6/10     | 9/10     | 5/10     |
| Practical | High   | 7/10     | 5/10     | 8/10     |
| Risk      | Medium | 8/10     | 6/10     | 4/10     |
| **Weighted Total** | | **X** | **Y** | **Z** |

### 5. Decide and Document
- State the recommended option with rationale
- Note key trade-offs accepted
- Document the decision in `.opencode/memory/decisions.md`

## Decision Documentation Format
```markdown
## Decision: [Title]
- **Date**: YYYY-MM-DD
- **Context**: [What led to this decision]
- **Options Considered**: 
  - Option A: [Description] — Rejected because [reason]
  - Option B: [Description] — **Selected**
- **Rationale**: [Why this was chosen]
- **Trade-offs**: [What we're sacrificing]
- **Reversible**: Yes / No — [If reversible, under what conditions]
```

## When to Defer
Consider deferring a decision when:
- Critical information is missing that could be gathered
- The cost of reversing is low and more data will emerge
- The decision doesn't block immediate progress
- Multiple options are equally viable
