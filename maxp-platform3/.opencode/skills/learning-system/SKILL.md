---
name: learning-system
description: Use for systematically learning from interactions, codebase exploration, and user feedback. Triggered by "learn the codebase", "study this pattern", "what did you learn", "update your understanding". Use to build deeper understanding over time.
---

# Learning System

## Learning Cycle
1. **Observe**: Gather raw information (code patterns, user feedback, tool outputs)
2. **Abstract**: Extract general principles, patterns, and rules
3. **Generalize**: Apply the learned pattern to predict future scenarios
4. **Validate**: Test the generalization against reality
5. **Correct**: Update the mental model when predictions fail

## Knowledge Categories
- **Codebase Architecture**: Module structure, data flow, dependencies
- **Conventions**: Coding style, naming, file organization, testing patterns
- **Domain Knowledge**: Business logic, user workflows, industry terms
- **User Preferences**: Communication style, level of detail expected, tools preferred
- **Tool Efficiency**: Which tools work best for which tasks in this environment

## Learning Triggers
- Exploring a new file or module
- Encountering an unfamiliar pattern
- User corrects a mistake or provides feedback
- A tool call succeeds or fails in an unexpected way
- Completing a task and reviewing the approach used

## Documentation
Store learnings in `.opencode/memory/learned-patterns.md` with:
- The pattern discovered
- Context where it was observed
- How it should influence future behavior
- Confidence level (speculative, confirmed, reinforced)
