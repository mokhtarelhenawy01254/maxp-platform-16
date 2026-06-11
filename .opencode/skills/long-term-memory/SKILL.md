---
name: long-term-memory
description: Use when storing, retrieving, or managing information that persists across sessions. Triggered by "remember this", "store this", "what do you remember about X", "recall". Use for maintaining project knowledge, user preferences, and learned patterns across conversations.
---

# Long Term Memory

## Storage Strategy
- Store important project facts in `.opencode/memory/` as structured markdown files
- Use categorized files: `project-context.md`, `user-preferences.md`, `learned-patterns.md`, `decisions.md`
- Each entry should include: timestamp, context, key information, and relevance tags

## Retrieval Process
1. When the user asks about past information, check memory files first
2. Search by relevance tags before full-text search
3. Present retrieved information with its original context and timestamp
4. If information seems outdated, confirm with the user before using it

## File Structure
```
.opencode/memory/
├── project-context.md      # Architecture, tech stack, key files
├── user-preferences.md     # User's coding style, preferred tools, naming conventions
├── learned-patterns.md     # Patterns discovered across sessions
├── decisions.md            # Key decisions made and their rationale
└── session-logs/           # Per-session summaries
```

## When to Store
- User explicitly asks to remember something
- A significant architectural decision is made
- User expresses a preference or convention
- A non-obvious bug or pattern is discovered
- Configuration changes that affect future work
