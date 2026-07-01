# Team Sync Updates

## 2026-07-02 / 2026-03-09
- **Sales Rep V2 Agent Template (NEW TEMPLATE)**: Created a new structured agent template `sales-rep-v2-agent` based on prompt engineering best practices from the `agency-agents` open-source project (123k ⭐). Key improvements: 5-step Sales Workflow (Discovery → Presentation → Objection Handling → Data Collection → Close), Critical Rules (Do's & Don'ts), Success Metrics, Failure Protocol (graceful degradation instead of "حصل عطل فني"), prioritized tool categorization (🔴→🟡→🟢), and structured Handoff Rules for multi-agent coordination.
- **Ready Agent Profiles & Merchant Locks (NEW FEATURE/GAP RESOLUTION)**:
  1. Resolved gaps in ready-to-use agents settings by adding advanced soul fields (welcome messages, language selections, and escalation strategies) to personalities.
  2. Implemented field-level editing locks (`lockIdentity`, `lockPersona`, `lockRules`, `lockCustomPrompt`) to prevent merchant tampering with core prompt templates.
  3. Integrated visual lock indicators (🔒) in merchant edit forms with dynamic read-only input behavior.
  4. Added PostgreSQL seeding for automatic DB state preparation with optimized template configs.
- **Documentation & Architecture Review**: Documented the multi-file agent template contract pattern (agent.json + SOUL.md + TOOLS.md + AGENTS.md → single XML agent_contract at runtime) and updated Structure.md with the agent templates architecture.

## 2026-07-01 / 2026-03-09
- **DeepSeek V4 Flash Tool Calling Stabilization (FIX/OPTIMIZATION)**: Implemented strict tool schema enforcement (`"strict": True`) for DeepSeek/OpenAI LLM clients and enabled capturing and forwarding of `reasoning_content` (thinking process) in the multi-turn agent chat history to prevent DSML XML tag leakage and formatting errors.
- **Agent Execution Pipeline Improvements (FIX/OPTIMIZATION)**: Refactored `skills_pipeline.py` and `validate_reply.py` to support parallel tool execution (via `asyncio.gather`), LLM JSON parse self-correction loops, strict fallback for failed output contracts, and output guardrail self-correction with reflection retries.
- **Silent Escalation and Takeover System (NEW FEATURE)**: Implemented a silent handoff system when AI agents encounter guardrail violations, schema formatting errors, or exceptions. Suppressed visible fallback error messages to customers and added Socket.IO events (`ai:escalation`) and DB logs (`ActivityLog`) to notify human moderators to take over the conversation seamlessly on WhatsApp, Telegram, Facebook, and Instagram channels.
- **Facebook Inbox Layout Responsiveness (FIX)**: Resolved the layout squeezed and action button collision/wrapping issues in `/facebook-inbox` on tablets and narrow viewports by collapsing secondary actions into a "More Actions" dropdown menu when screen space is limited.
- **WhatsApp Inbox Session Alignment Fix (FIX)**: Fixed `/whatsapp-inbox` displaying unassigned/draft WhatsApp sessions for admin roles. The list is now filtered to show only sessions that have an active assignment configured in settings.
- **NumberSidebar Search Crash Fix (FIX)**: Fixed potential null pointer TypeError in the settings page when searching numbers with missing `phoneNumber` fields.
- **Meta Cloud Status Resolution Fix (FIX)**: Fixed `META_CLOUD` provider sessions resolving to `DISCONNECTED` on the routing workspace page. Meta Cloud sessions are now resolved to `CONNECTED` identically to the WhatsApp Settings page.
- **Soft-Deleted Sessions Filtering Fix (FIX)**: Fixed soft-deleted/draft sessions (where `isDeleted: true` in metadata) displaying in the Routing Workspace page by mirroring the metadata filter used in the Settings page.
- **WhatsApp Workspace Dropdown Display Fix (FIX)**: Fixed selected WhatsApp session showing as database CUID ID instead of its friendly name in the select trigger after choosing a session on `/whatsapp`.
- **WhatsApp Workspace Session RBAC Access Fix (FIX)**: Fixed `/whatsapp` session selection list exposing all company numbers to moderators; it now filters the dropdown to only show the sessions assigned to the active moderator.

## 2026-06-30 / 2026-03-09
- **WhatsApp Template Broadcast UI Fix (FIX)**: Resolved the bug where the WhatsApp Session dropdown displayed the raw database CUID instead of the friendly name or display phone number for Meta Cloud sessions.
- **Project Break-Even Translation Fix (FIX)**: Resolved raw translation keys (like `projectBreakEven.title`) showing on the break-even page by creating dedicated locale section files (`projectBreakEven.json`) for Arabic and English to prevent them from being overwritten during i18n merge operations.
- **Documentation Sync**: Created the backend synchronization docs (`Bugs.md`, `Structure.md`, `TEAM_SYNC.md`) to comply with CI/CD rules and documented the fix.
