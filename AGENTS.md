# MaxP Platform — Agent Rules

## Skill Loading Protocol
- At session start, load `maxp-knowledge` skill first for project context
- Be proactive: when a task matches a skill's description, load it immediately without waiting for the user to ask
- Skills are available in the system prompt's `<available_skills>` list — use them

## Memory & Continuity — الحوارات ما تبوظش
- At session start: **Must** read `project-context.md`, `user-preferences.md`, `decisions.md`, `learned-patterns.md`, **`ai-knowledge-base.md`** from `.opencode/memory/` before any work
- After every significant task: update memory files with decisions, fixes, and new patterns
- Use `long-term-memory` skill when storing/retrieving information across sessions
- Use `memory-retrieval` skill when searching stored information

## Knowledge Update Protocol — منع المعلومات القديمة
- Before making ANY claim about an AI framework, model, SDK, protocol, or tool: check `ai-knowledge-base.md` first
- If the knowledge base is outdated (older than 1 month) or missing the topic: **Must** browse current official sources before answering
- Use the `agentic-ai-research-radar` skill's Fresh Research Rule: official docs → blogs → papers → community
- **GitHub مصادر حية**: تابع GitHub Trending (أسبوعيًا) لاكتشاف frameworks جديدة، و GitHub Releases لأحدث إصدارات المشاريع المعروفة (OpenAI SDK, LangGraph, Hermes, Paperclip)، و Issues للـ bugs والـ workarounds
- Track sources checked in source-map.md with date and confidence
- Worst case = giving confidently wrong info about a 2026 framework using 2024 knowledge

## Session Initialization Protocol — منع التخمين
1. Load `maxp-knowledge` skill → read `latest-updates.md`, `conventions.md`, `architecture.md`
2. Read all `.opencode/memory/*.md` files
3. If prior session log exists, read last entry to know where we stopped
4. Now start the task — never before reading memory

## Context Compression Protocol — منع فقدان السياق
- Every 15-20 tool calls: evaluate if context needs compression
- Use `compress` tool on closed/complete sections before they grow stale
- After compression, update `session-log.md` with the compressed summary
- If switching topics: close previous topic first (summarize → compress → continue)

## On-Demand Research Trigger
- When user says "ابحث عن X" / "research X" / "حدث قاعدة المعرفة" / "check latest on X":
  1. Fetch current official sources for the topic
  2. Update `ai-knowledge-base.md` with findings
  3. Update `source-map.md` with new verification dates
  4. Summarize changes to user

## Git Workflow — Prevents Edit/Commit Loss
- **ALWAYS commit file edits BEFORE running `git pull`, `git rebase`, or `git stash`.** The Edit tool writes directly to disk. If uncommitted edits exist when a `stash/pull/pop` cycle runs, those edits can be silently lost because the commit captures the old state while the working tree is reverted by stash.
- Safe sequence: `git add <files> && git commit -m "..."` → then `git pull --rebase` → then `git push`
- If `git stash` is unavoidable, first commit all staged work, then stash only truly untracked/experimental changes. Verify with `git status` before and after.

## Language
- User prefers Arabic for conversation, English for code and technical output unless specified otherwise

## Browser Isolation — Multi-Task Conflict Prevention
- **Every task that uses the browser MUST create its own isolated context.** This prevents cookie/session/auth conflicts between tasks running simultaneously.
- Pattern:
  ```
  chrome-devtools_new_page({ url: "<target>", isolatedContext: "task-<short-description>" })
  ```
- Close pages when done with `close_page` to free resources.
- NEVER rely on pages created by other tasks. Always create your own. They are not shared.
