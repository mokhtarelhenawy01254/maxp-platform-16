# System Structure & Architecture

### API Endpoints
No API endpoints were modified or added, but:
1. The backend query logic for `/api/v1/whatsapp-inbox/sessions` was updated inside `getUserAccessibleSessionIds` helper to restrict returned sessions to those with active assignments.
2. The workspace query logic `/api/v1/admin/whatsapp-numbers/workspace` was updated inside `numberAssignmentService.js` to ensure Meta Cloud provider sessions resolve to `CONNECTED` and to filter out soft-deleted sessions (where `isDeleted: true` is in metadata) to align with the Settings page.
3. The backend endpoint `/api/v1/whatsapp/sessions` (handled by `whatsappController.getSessions`) was updated to restrict returned sessions to only user-accessible sessions for non-admin roles (moderators/employees) using `getUserAccessibleSessionIds`.
4. The AI Service agent pipeline stages (`skills_pipeline.py` and `validate_reply.py`) were modified to support concurrent tool execution, tool arguments self-correction, strict Pydantic contract fallbacks, and output guardrail self-correction. Additionally, `client.py` and `skills_pipeline.py` were enhanced to support strict tool schemas, capture/propagate `reasoning_content` to stabilize DeepSeek V4 Flash tool calling, and parse XML-like DSML tool calling markup natively to prevent raw protocol leaks in chat sessions. Finally, `skills_pipeline.py` was refactored to use `build_user_content` from `src.context.multimodal`, fixing the customer image attachment pipeline for vision-capable models (like Gemini 2.5 Flash).
5. The Python `/chat` endpoint (`api/chat.py`) was updated to support `status: "escalated"` with optional `escalation` metadata.
6. A new `silentEscalationService.js` was introduced in the backend to manage Socket.IO events (`ai:escalation`) and DB `ActivityLog` creation for silent human handoffs.

### Database Schema Models
No database models or Prisma schemas were modified.

### Agent Templates
7. A new structured agent template `sales-rep-v2-agent` was added to `apps/backend/agents/` with an improved prompt architecture inspired by the `agency-agents` open-source framework (123k ⭐). The template features: segmented SOUL.md (Identity, Voice, Sales Workflow, Critical Rules, Success Metrics, Failure Protocol), prioritized TOOLS.md (🔴 Essential → 🟡 Supporting → 🟢 Learning), and structured AGENTS.md (Handoff Rules).

### Ready Agent Profiles & Merchant Locks
8. Added ready agent profiles manager endpoints in `superAdminRoutes.js` (`POST /agents/quick-profiles`) supporting merchant constraint flags (`lockIdentity`, `lockPersona`, `lockRules`, `lockCustomPrompt`).
9. Implemented database seeding file `apps/backend/prisma/seed-quick-profiles.js` to populate default templates.
10. Added `spawnReadyAgentsService.js` to automatically provision active profiles for new merchant registrations/subscriptions.
11. Hardened the Super Admin page (`SuperAdminAgentProfiles.tsx`) with personality field validations, auto-slug generation, synced channels, and profile cloning.

### System Architecture
- Added **Silent Takeover & human-in-the-loop** event-driven pattern via Socket.IO: on AI failure (e.g. guardrail blocks or JSON parsing exhaustion), the thread is marked as needing human intervention, notifying moderators instantly without alerting the customer.
- Agent templates follow a **multi-file contract** pattern: `agent.json` (manifest) + `SOUL.md` (persona/workflow) + `TOOLS.md` (tool instructions) + `AGENTS.md` (handoff rules), assembled into a single XML `<agent_contract>` at runtime by `template_registry.py`.

