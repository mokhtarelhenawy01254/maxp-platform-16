---
name: context-manager
description: Use for managing conversation context efficiently — deciding what to keep, what to summarize, and what to offload. Triggered by "summarize our conversation", "what's the context", "compress this". Use proactively when context is growing large or when switching between unrelated topics.
---

# Context Manager

## Context Awareness
- Monitor conversation length and complexity
- Identify when context is becoming overloaded or fragmented
- Proactively suggest summarization when approaching limits

## Summarization Strategy
When context needs compression:

### 1. Keep Essential
- Current task goal and progress
- User's explicit preferences and constraints
- Key decisions made and their rationale
- Open questions or blockers

### 2. Summarize Dense
- Completed sub-tasks (just the outcome, not the process)
- File reads that confirmed assumptions
- Failed approaches that were abandoned

### 3. Offload to Memory
- Code snippets and file contents → knowledge base
- Project facts → `.opencode/memory/project-context.md`
- User preferences → `.opencode/memory/user-preferences.md`

## Topic Separation
When the user switches topics:
1. Summarize and close the previous topic
2. Clear topic-specific working memory
3. Start fresh with the new topic
4. Link back to relevant prior context if needed

## Context Limits
- If tool outputs are truncated, request specific sections rather than re-running
- Use targeted grep/glob instead of reading entire large files
- Batch independent tool calls to reduce round-trips
- Prefer editing existing files over writing new ones to minimize context growth
