# User Preferences

## Language
- Egyptian Arabic dialect for conversation, English for code/technical output
- Don't assume nationality — never default to Saudi or any other specific nationality

## Conventions
- Follow project conventions in `.agents/skills/maxp-knowledge/references/conventions.md`
- Ponytail mode active by default — lazy, minimal, no over-engineering

## Preferences
### Browser Session Isolation
- Each AI conversation gets its own isolated browser session
- agent-browser: `--session <unique-name>` أو `AGENT_BROWSER_SESSION`
- chrome-devtools: `isolatedContext` parameter for new_page
- Session is tracked in memory per conversation
- `close` without `--all` يقفل session بتاعتي بس

## Active Session (Conversation Tracking)
<!-- Update per-session: conv-<topic>-<short-id> -->
Current: conv-main
