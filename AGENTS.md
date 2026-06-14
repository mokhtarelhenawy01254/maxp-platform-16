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

## Git Workflow — Prevents Edit/Commit Loss
- **ALWAYS commit file edits BEFORE running `git pull`, `git rebase`, or `git stash`.** The Edit tool writes directly to disk. If uncommitted edits exist when a `stash/pull/pop` cycle runs, those edits can be silently lost because the commit captures the old state while the working tree is reverted by stash.
- Safe sequence: `git add <files> && git commit -m "..."` → then `git pull --rebase` → then `git push`
- If `git stash` is unavoidable, first commit all staged work, then stash only truly untracked/experimental changes. Verify with `git status` before and after.

## Language
- User prefers Arabic for conversation, English for code and technical output unless specified otherwise
