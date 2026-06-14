# MaxP Platform — Agent Rules

## Skill Loading Protocol
- At session start, load `maxp-knowledge` skill first for project context
- Be proactive: when a task matches a skill's description, load it immediately without waiting for the user to ask
- Skills are available in the system prompt's `<available_skills>` list — use them

## Memory & Continuity
- At session start, read `.opencode/memory/` files to recall cross-session context
- After significant work, update session logs and relevant memory files
- Use `long-term-memory` skill when storing/retrieving information across sessions
- Use `memory-retrieval` skill when searching stored information

## Language
- User prefers Arabic for conversation, English for code and technical output unless specified otherwise
