# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260728-001] correction

**Logged**: 2026-07-28T00:00:00+03:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Do not infer Baileys history payload shape solely from public `Chat` types when the runtime history processor mutates the payload.

### Details
The initial history-sync plan incorrectly treated `chat.messages` as absent. In Baileys 6.7.23, `processHistoryMessage` removes the full message array but restores the most recent message on each chat before emitting `messaging-history.set`. Completion semantics also require distinguishing raw history notifications from the event-buffer's consolidated payload: `isLatest` is calculated from local processed credentials, then retained while the buffer merges events. The HistorySync protobuf additionally exposes official phone-number-to-LID mappings that this Baileys version does not forward.

### Suggested Action
Before changing history import logic, inspect the installed Baileys runtime pipeline (`history.js`, `process-message.js`, and `event-buffer.js`), preserve the zero-message contact filter, and add a maintained adapter/patch path for `phoneNumberToLidMappings`.

### Metadata
- Source: user_feedback
- Related Files: apps/backend/services/whatsapp/WhatsAppManager.js, apps/backend/node_modules/@whiskeysockets/baileys/lib/Utils/history.js, apps/backend/node_modules/@whiskeysockets/baileys/lib/Utils/event-buffer.js
- Tags: baileys, history-sync, lid, correction

---

## [LRN-20260702-001] knowledge_gap

**Logged**: 2026-07-02T12:00:00Z
**Priority**: high
**Status**: resolved
**Area**: docs

### Summary
My training data only goes up to early 2024. All AI frameworks, models, and agent tools info is stale.

### Details
Discovered during conversation with user about model knowledge cutoff. User pointed out that I might know things up to 2024 but we're in 2026 now.

### Suggested Action
Always check `ai-knowledge-base.md` before making claims about AI models/frameworks. Use the `agentic-ai-research-radar` Fresh Research Rule. Browse current official sources.

### Resolution
- **Resolved**: 2026-07-02T12:00:00Z
- **Notes**: Created `ai-knowledge-base.md`, `source-map.md` with verified 2026 sources, Knowledge Update Protocol in AGENTS.md, and weekly scheduled job for automated refresh.

---

## [LRN-20260702-002] system_error

**Logged**: 2026-07-02T12:00:00Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
`opencode` binary not on system PATH — scheduled tasks fail because schtasks can't find the executable.

### Details
`schedule_job` tool constructs `schtasks /TR opencode ...` but `opencode-cli.exe` is only at `C:\Users\mokhtar\AppData\Local\OpenCode\opencode-cli.exe`, not on PATH. This caused the initial schedule_job attempt to fail silently.

### Suggested Action
Use full path to binary when creating scheduled tasks, or create a wrapper PowerShell script.

### Resolution
- **Resolved**: 2026-07-02T12:00:00Z
- **Notes**: `.opencode/scripts/refresh-ai-knowledge.ps1` uses full path to `opencode-cli.exe`. Task scheduled via direct `schtasks` command.

---
