# User Preferences

## Language
- Arabic for conversation, English for code/technical output

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
