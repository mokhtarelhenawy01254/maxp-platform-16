# System Structure & Architecture

### API Endpoints
No API endpoints were modified or added, but:
1. The backend authentication endpoints `/auth/login`, `/auth/me`, `/auth/companies` (handled by `getUserCompanies`), and `/auth/switch-company/:companyId` were updated to select and include the `roleRef` relation inside `userCompanies` queries, ensuring that role resolution prefers custom/assigned role keys (`uc.roleRef?.key || uc.role`) over the database default enum (`AGENT`), preserving administrative and owner access on page reload or switch.
2. The backend query logic for `/api/v1/whatsapp-inbox/sessions` was updated inside `getUserAccessibleSessionIds` helper to restrict returned sessions to those with active assignments.
3. The workspace query logic `/api/v1/admin/whatsapp-numbers/workspace` was updated inside `numberAssignmentService.js` to ensure Meta Cloud provider sessions resolve to `CONNECTED` and to filter out soft-deleted sessions (where `isDeleted: true` is in metadata) to align with the Settings page.
4. The backend endpoint `/api/v1/whatsapp/sessions` (handled by `whatsappController.getSessions`) was updated to restrict returned sessions to only user-accessible sessions for non-admin roles (moderators/employees) using `getUserAccessibleSessionIds`.
5. The AI Service agent pipeline stages (`skills_pipeline.py` and `validate_reply.py`) were modified to support concurrent tool execution, tool arguments self-correction, strict Pydantic contract fallbacks, and output guardrail self-correction. Additionally, `client.py` and `skills_pipeline.py` were enhanced to support strict tool schemas, capture/propagate `reasoning_content` to stabilize DeepSeek V4 Flash tool calling, and parse XML-like DSML tool calling markup natively to prevent raw protocol leaks in chat sessions. Finally, `skills_pipeline.py` was refactored to use `build_user_content` from `src.context.multimodal`, fixing the customer image attachment pipeline for vision-capable models (like Gemini 2.5 Flash), and resolved empty reply crashes causing `AI_SANDBOX_EMPTY_REPLY` downstream.
6. The Python `/chat` endpoint (`api/chat.py`) was updated to support `status: "escalated"` with optional `escalation` metadata.
7. A new `silentEscalationService.js` was introduced in the backend to manage Socket.IO events (`ai:escalation`) and DB `ActivityLog` creation for silent human handoffs.

### Database Schema Models
No database models or Prisma schemas were modified. However, the database seeding script for the `ai.skills` table (`seed.py`) was corrected to map `triggerPhrases` from `skill.json` to the database column `trigger_phrases`, enabling SQL intent routing.

### Agent Templates & Declarative Skills
7. A new structured agent template `sales-rep-v2-agent` was added to `apps/backend/agents/` with an improved prompt architecture inspired by the `agency-agents` open-source framework (123k ⭐). The template features: segmented SOUL.md (Identity, Voice, Sales Workflow, Critical Rules, Success Metrics, Failure Protocol), prioritized TOOLS.md (🔴 Essential → 🟡 Supporting → 🟢 Learning), and structured AGENTS.md (Handoff Rules).
8. The `catalog-search` declarative skill was completely redesigned and standardized for 2026 progressive disclosure:
   - **`skill.json`**: Upgraded description to support contextual matching, added 20 localized trigger phrases, expanded allowed tools, and raised the max tool count limit.
   - **`SKILL.md`**: Added a comprehensive decision tree, explicit parameter documentation (for visual search and size/color attributes), failure handling paths, and output templates.
   - **`conversations.md`**: Created new few-shot interactive dialog examples to steer the agent's behavior.
   - **`integration.py` & `seed.py`**: Enabled caching and prompt injection of trigger phrases inside the system prompt's `<skill>` XML blocks, resolving intent routing gaps.

### Ready Agent Profiles & Merchant Locks
8. Added ready agent profiles manager endpoints in `superAdminRoutes.js` (`POST /agents/quick-profiles`) supporting merchant constraint flags (`lockIdentity`, `lockPersona`, `lockRules`, `lockCustomPrompt`).
9. Implemented database seeding file `apps/backend/prisma/seed-quick-profiles.js` to populate default templates.
10. Added `spawnReadyAgentsService.js` to automatically provision active profiles for new merchant registrations/subscriptions.
11. Hardened the Super Admin page (`SuperAdminAgentProfiles.tsx`) with personality field validations, auto-slug generation, synced channels, and profile cloning.

### System Architecture
- **Vite Chunk Load Recovery & Cache Control Routing**: Overhauled the frontend root error boundary structure in `AdminAppBootstrap.tsx` to statically import the `ErrorBoundary` component, ensuring the application can capture module loading failures (due to deleted assets during production updates) and successfully execute chunk load recovery (automatic window reloads). Hardened the Nginx static assets mapping in `nginx_configs/maxp.online.conf` by adding strict Cache-Control headers (`no-cache, no-store, must-revalidate`) for the SPA `/` location blocks, preventing browsers and proxy CDNs from caching `index.html` and forcing them to fetch the most updated hashed asset references.
- **WhatsApp Workspace Responsive Overhaul**: Introduced container `:has()` layout overrides in `index.css` to dynamically strip container paddings and avoid double scrolls when browsing the `/whatsapp` path. Leveraged modern 2026 CSS layout patterns: View Transitions API for seamless sliding transitions, `@starting-style` entry animations for conversation cards/messages, `@container` queries for screen-width sensitive chat bubble sizing, and CSS-native Scroll-Driven Animations for header compression on scrolling. Added touch event swipe capture for mobile back-to-list navigation, responsive overlay trays for entry tools, themed container compatibility for the audio recorder component, sliding bottom sheet drawer configurations for the emoji picker, and touch swipe gestures (`Swipe-to-Archive`) for conversation cards in the chat list.
- Added **Silent Takeover & human-in-the-loop** event-driven pattern via Socket.IO: on AI failure (e.g. guardrail blocks or JSON parsing exhaustion), the thread is marked as needing human intervention, notifying moderators instantly without alerting the customer.
- Agent templates follow a **multi-file contract** pattern: `agent.json` (manifest) + `SOUL.md` (persona/workflow) + `TOOLS.md` (tool instructions) + `AGENTS.md` (handoff rules), assembled into a single XML `<agent_contract>` at runtime by `template_registry.py`.
- Unified **WhatsApp Auto-Assignment**: Unified incoming webhook message sync and background sweeps under a single advanced `WhatsAppAssignmentEngineService`, ensuring all incoming chats respect online status, workload capacity, working hours, and transactional locks. Additionally, corrected the candidate pool generation to prioritize configured employee lists (`routingUserIds`) over direct number owners in Round Robin and Shared Inbox modes.
- **Distributed Sweep Coordination**: Background monitor sweeps utilize PostgreSQL session-level advisory locks (`pg_try_advisory_lock`) to coordinate single-instance execution across PM2 cluster nodes.
- **Assignment-Relative SLA Cooldown**: Implemented a 5-minute cooldown and assignment-relative SLA timeout calculation based on `lastAssignedAt` to eliminate 60-second reassignment ping-pong loops between moderators.

