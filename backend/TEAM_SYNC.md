# Team Sync Updates

## 2026-07-03 / 2026-03-09
- **WhatsApp Workspace Responsive Overhaul (UI/UX)**: Implemented complete responsive layout harmony and mobile-native UX patterns for the WhatsApp module (`/whatsapp`) utilizing modern 2026 CSS features:
  1. Added dedicated `whatsapp-responsive.css` file containing: View Transitions API animations for smooth panel switching, `@starting-style` entry effects, Container Queries (`@container`) for responsive bubble scaling, scroll-driven header compression, glassmorphism headers, and mobile safe-area overrides.
  2. Integrated touch gesture swipe zones (`onTouchStart`/`onTouchEnd`) in `ChatWindow.tsx` and `WhatsAppChat.tsx` to swipe back to list on mobile.
  3. Replaced fixed grid layout with horizontal scrolling flex strip for filter pills on mobile with larger touch targets.
  4. Added a slide-up tray modal overlay (`wa-rich-tools-tray`) for chat input tools on mobile screens.
  5. Implemented container `:has(.whatsapp-workspace-root)` overrides in `index.css` to dynamically strip out dashboard container paddings and double scrolls.
  6. Added dark-mode theme compatibility to `AudioRecorder.tsx` by replacing hardcoded white backgrounds with themed surface variables.
  7. Redesigned the `EmojiPicker` on mobile screens to act as a full-width bottom sheet drawer with smooth slide-up animations and touch-outside dismissal support.
- **WhatsApp Inbox Auto-Assignment & Reassignment Hardening (FIX)**: Fixed bugs in the WhatsApp auto-routing and reassignment sweep mechanism:
  1. Unified incoming webhook sync `WhatsAppSyncService` to delegate all auto-assignments to the advanced `WhatsAppAssignmentEngineService`, ensuring online checks, capacity limits, working hours, and advisory locks are respected.
  2. Resolved the infinite 60-second reassignment loop (ping-pong) by adding a 5-minute cooldown period and making the SLA response timeout window start relative to `lastAssignedAt` if the agent was assigned after the message.
  3. Optimized the background sweep query to dynamically query active company assignments and filter by pending customer messages, cutting full table scan DB overhead.
  4. Secured the background interval against concurrent execution across PM2 cluster instances using PostgreSQL distributed advisory locks (`pg_try_advisory_lock`).
  5. Added Jest unit tests to verify reassignment cooldown and SLA timeout behaviors.
  6. Fixed a candidate pool building bug that prioritized direct `assignedUser` (number owner) over configured `routingUserIds` in Round Robin / Shared Inbox modes, ensuring correct distribution to employee agents.

## 2026-07-02 / 2026-03-09
- **AI Agent Sandbox Empty Reply Fix (FIX)**: Fixed `AI_SANDBOX_EMPTY_REPLY` errors on the sandbox testing tab (`/admin/ai-hub?tab=sandbox`). Resolved a `NameError` crash in `skills_pipeline.py` caused by an undefined `has_images` variable reference inside `_llm_call`, and implemented a fallback Arabic response when the LLM returns an empty message after multiple retries (due to provider timeouts or rate limits), preventing empty replies from reaching downstream backend pipelines.
- **DeepSeek DSML XML Tool Call Parsing (FIX)**: Fixed the bug where DeepSeek V4 models generated XML-like DSML tool calling markup inside plain text responses, which leaked to customers in chat sessions. Replaced the JSON-based DSML parser in `client.py` with a robust regex parser that correctly extracts tool calls and parameter values from spaced or standard XML DSML markup, performs automatic type coercion, and falls back to JSON-in-DSML legacy structures. Trigger conditions were also expanded to intercept DSML format leaks across alternative providers hosting DeepSeek models (e.g., OpenRouter, SambaNova).
- **Multimodal Image Pipeline Fix (FIX)**: Fixed a structural bug in `skills_pipeline.py` where customer image attachments were being passed as raw objects to the LLM instead of being formatted as OpenAI/Gemini compatible `image_url` parts via `build_user_content`. This resolved the issue where vision-capable models (like Gemini 2.5 Flash) could not see or recognize images sent in the chat.
- **Sales Rep V2 Agent Template (NEW TEMPLATE)**: Created a new structured agent template `sales-rep-v2-agent` based on prompt engineering best practices from the `agency-agents` open-source project (123k ⭐). Key improvements: 5-step Sales Workflow (Discovery → Presentation → Objection Handling → Data Collection → Close), Critical Rules (Do's & Don'ts), Success Metrics, Failure Protocol (graceful degradation instead of "حصل عطل فني"), prioritized tool categorization (🔴→🟡→🟢), and structured Handoff Rules for multi-agent coordination.
- **Ready Agent Profiles & Merchant Locks (NEW FEATURE/GAP RESOLUTION)**:
  1. Resolved gaps in ready-to-use agents settings by adding advanced soul fields (welcome messages, language selections, and escalation strategies) to personalities.
  2. Implemented field-level editing locks (`lockIdentity`, `lockPersona`, `lockRules`, `lockCustomPrompt`) to prevent merchant tampering with core prompt templates.
  3. Integrated visual lock indicators (🔒) in merchant edit forms with dynamic read-only input behavior.
  4. Added PostgreSQL seeding for automatic DB state preparation with optimized template configs.
  5. Implemented `spawnReadyAgentsService.js` to automatically provision and configure all active ready profiles for new company activations (free and paid bundles) instead of requiring manual creation.
  6. Hardened the Super Admin profiles editor page with personality field validation, synced channels, auto-slug generation, and profile cloning/duplication.
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
