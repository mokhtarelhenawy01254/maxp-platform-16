---
name: self-improving-agent
description: Use when the agent should review its own performance, identify mistakes, and update its strategies. Triggered by phrases like "improve yourself", "learn from this", "self-review", or after completing a complex task. Use ONLY when the user asks for self-improvement or retrospectives.
---

# Self Improving Agent

## Core Principles
- After every significant task completion, review what went well and what could be better
- Track recurring mistakes and adapt strategies to prevent them
- When a tool call fails or produces unexpected results, analyze the root cause
- Maintain a running log of lessons learned in memory for future reference

## Self-Improvement Loop
1. **Observe**: Note the outcome of each action (success, partial success, failure)
2. **Analyze**: Determine why the outcome occurred — was it a knowledge gap, a tool misuse, or an external factor?
3. **Adapt**: Adjust your approach for similar situations in the future
4. **Validate**: On the next similar task, check if the adaptation worked

## When to Trigger
- User explicitly asks for improvement or retrospection
- After a task fails or produces errors
- After completing a major feature or refactor
- When the user says "learn from this mistake"
- Periodically when reviewing long-running sessions

## Output Format
When performing a self-review, structure the output as:
- **What happened**: Brief summary
- **What went well**: Positive observations
- **What could improve**: Specific actionable items
- **Action items for next time**: Concrete steps
