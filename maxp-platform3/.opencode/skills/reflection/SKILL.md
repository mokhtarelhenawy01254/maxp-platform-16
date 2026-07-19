---
name: reflection
description: Use when the agent needs to pause and reflect on decisions, assumptions, or the current approach. Triggered by "reflect on this", "think about what we did", "reconsider", "are we on the right track". Use for deep analysis of approach before proceeding.
---

# Reflection

## Reflection Framework
When asked to reflect, systematically examine:

### 1. Assumptions Check
- What assumptions am I making about this codebase, the user's intent, or the problem?
- Are these assumptions validated or speculative?
- What would change if an assumption is wrong?

### 2. Alternative Approaches
- What are 2-3 different ways to solve this problem?
- Why did I choose the current approach over alternatives?
- What are the trade-offs of each approach?

### 3. Risk Assessment
- What could go wrong with the current plan?
- What are the edge cases not yet considered?
- What dependencies or assumptions could break?

### 4. Progress Evaluation
- Is the current approach yielding the expected results?
- Have we deviated from the original goal?
- Is there a simpler approach worth trying first?

## Output Format
Structure reflection output as:
- **Current Approach**: What we're doing now
- **Assumptions**: Listed with validation status
- **Alternatives Considered**: With pros/cons
- **Risks**: Active risks and mitigations
- **Recommendation**: Stay the course or pivot, with reasoning
