# Team Sync Updates

## 2026-07-04 / 2026-03-09
- **silentEscalationService Import Fix (FIX)**: Fixed a server crash in the Facebook auto-reply escalation loop:
  1. Updated `apps/backend/services/silentEscalationService.js` to correctly import the shared database client wrapper from `./sharedDatabase` instead of the non-existent `../prisma/client`, resolving `MODULE_NOT_FOUND` runtime crashes during human takeover handoffs.
- **AI Service Sandbox Empty Reply Fix (FIX)**: Fixed `AI_SANDBOX_EMPTY_REPLY` errors, context gaps, and multimodal image mapping issues in follow-up chat completions:
  1. Updated `_build_followup_messages` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to inject the `skills_block` using `get_skills_block` so the follow-up LLM can see the full skill instructions (such as offering alternatives for empty results).
  2. Injected conversation history (`recentMessages`) in the follow-up messages context to prevent the LLM from losing conversational context.
  3. Added a 60-second request timeout and 10-second connect timeout for `AsyncOpenAI` in `apps/ai-service/src/llm/client.py` using `httpx.Timeout` to prevent requests from hanging indefinitely.
  4. Updated unit tests in `tests/pipeline/test_skills_pipeline.py` and `tests/llm/test_gemma_client.py` to align with the design decisions of the pipeline.
  5. Resolved a multimodal context gap in `_build_followup_messages` by swapping the plain text `ctx.message` for `build_user_content(ctx.message, ctx.attachments)` for the current user message, ensuring vision-capable models retain access to attached images in the follow-up completion.
- **DeepSeek reasoning_content Sandbox Fix (FIX)**: Fixed a bug where DeepSeek-R1 (thinking mode) follow-up completions failed on tools synthesis turns, returning raw lists instead of Yasmine's Egyptian Arabic sales rep replies:
  1. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to preserve `reasoning_content` and `reasoning` keys in the serialized assistant messages array. This satisfies DeepSeek's validation requirement that assistant messages carrying reasoning steps must pass them back in consecutive turns, resolving the 400 Bad Request API errors.
  2. Fixed an `ImportError` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` where `ALL_TOOLS` was incorrectly imported from `src.skills.integration` instead of `src.tools.registry`.
  3. Cached the system prompt inside `ctx.system_prompt` during execution so that `compiled_system_prompt` is returned correctly in sandbox trace logs for easier debugging.
  4. Mapped `compiled_system_prompt` from the Python response to `result.compiledSystemPrompt` inside `runSelectedAgentInPython` in `aiSandboxController.js` to ensure system prompt visualization in the Sandbox UI.
- **WhatsApp Inbox Permission Distribution Fix (FIX)**: Fixed a bug where moderators/agents could see conversations, read messages, and receive real-time updates for WhatsApp numbers they are not assigned to:
  1. Updated `getConversations` and `getMessages` in `apps/backend/controller/whatsappController.js` to validate and filter session IDs using `getUserAccessibleSessionIds` for non-admin accounts.
  2. Refactored `getConversationAudience` in `apps/backend/services/whatsappRealtimeAudienceService.js` to build a precise list of authorized users (admins, leaders, assigned agents, and team/routing pool members).
  3. Set `fallbackToCompany` default to `false` in `emitToAudience` to restrict socket message events delivery only to authorized users.
  4. Added backend unit tests in `apps/backend/tests/services/whatsappRealtimeAudienceService.test.js` to secure and verify role/session isolation.
- **Product Search & DeepSeek Tool Calls Pipeline Fixes (FIX)**: Fixed catalog search, product discovery, and formatting mismatches for AI agents (like Yasmine) on the Swan store:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to support the `"results"` key returned by product search repository wrappers, preventing it from defaulting to an empty list and falling back to a dry "No products found" message.
  2. Wrapped single product response dictionaries (e.g. from `inventory_check`) in a list to format product details correctly instead of printing "No stock data available".
  3. Added robust formatting mapping for `offers_list_active` and `coupon_validate` tools to properly describe active promotions/coupons.
  4. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to inspect the `tool_calls` in assistant messages and serialize dictionary arguments to JSON strings, preventing DeepSeek API 400 Bad Request/Validation failures in follow-up chat completions.
  5. Updated `_generate_openai_compat` in `apps/ai-service/src/llm/client.py` to omit the `tools` and `tool_choice` parameters entirely if `tool_choice == "none"`, forcing DeepSeek models to naturally generate plain text and avoiding validation errors.
  6. Added comprehensive unit tests in `apps/ai-service/tests/pipeline/test_skills_pipeline.py` to verify the new formatting behaviors.
- **category_list Tool Formatting Mismatch Fix (FIX)**: Fixed a bug where requesting categories from the agent returned "لا توجد تصنيفات متاحة حالياً" (No categories available) even when categories were defined:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to correctly identify and process the `"categories"` key returned by the `category_list` tool.
  2. Extracted and formatted category names to display nicely in the agent's summary instead of falling back to the default "no results" message.
  3. Updated `apps/ai-service/docs/skills-pipeline-architecture.md` to document the category result formatting behavior.
- **Yasmine Greeting Repetition Prevention (REFACTOR)**: Addressed greeting repetition behavior in the Yasmine/sales-rep-v2 agent template:
  1. Added a strict instruction in `apps/backend/agents/sales-rep-v2-agent/SOUL.md` under the "Voice & Tone" section to prohibit repeating the greeting once the conversation is already in progress and the user has been initially greeted.


## 2026-07-03 / 2026-03-09
- **Company Role Resolution & Sidebar Fix (FIX)**: Fixed a critical bug where company accounts (OWNER, COMPANY_ADMIN) would lose sidebar access after page refresh, showing only 1–2 items instead of the full menu:
  1. Updated `/auth/login`, `/auth/me`, `/auth/companies`, and `/auth/switch-company` in `authController.js` to include the `roleRef` relation in `userCompanies` queries.
  2. Updated all role mapping logic to prefer `uc.roleRef?.key || uc.role` over the bare `uc.role` enum (which defaults to `AGENT`), preserving correct OWNER/COMPANY_ADMIN access context.
  3. Added `plan` field fallback in `buildCompanyResponseWithOnboarding()` (`companyOnboarding.js`) to ensure the company response always includes a plan.
  4. Set up `test_communication_platform` test database with full schema push. All 15 login tests pass.
  5. Resolved a critical permissions mismatch where `/auth/login` and `/auth/switch-company` did not load user permissions, causing the frontend to show all sidebar sections initially (due to fallback on empty permissions list) but collapse them upon page refresh (since `/auth/me` does load permissions). Permissions are now consistently loaded in all three auth endpoints.
  6. Aligned frontend `sidebar.ts` `DOMAIN_PERMISSIONS` keys with actual backend database values (changing legacy `conversations.view` to the database-seeded `inbox.view`, adding database-canonical `finance.invoices`/`finance.payments` to `procurement`, and `notifications.view` to `notifications`), securing consistent sidebar items visibility on reload.
- **Catalog Search Skill & Seeding Hardening (IMPROVEMENT/FIX)**: Standardized the `catalog-search` declarative skill for 2026 progressive disclosure:
  1. Rewrote `skill.json` to feature a comprehensive, scenario-based description, added 20 localized trigger phrases (Arabic and English), expanded allowed tools, and raised the max tool count to 6.
  2. Overhauled `SKILL.md` to document all parameters (including visual search and size/color attributes), added a complete decision tree, result formatting guidelines, and alternative recommendation loops.
  3. Added few-shot interactive dialog examples in `examples/conversations.md`.
  4. Updated `seed.py` to parse `triggerPhrases` from `skill.json` and persist them as a comma-separated list to the database's `trigger_phrases` column, enabling SQL intent routing.
  5. Refactored `integration.py` to load and cache `trigger_phrases` across DB and filesystem paths, and dynamically inject them into the system prompt's `<trigger_phrases>` XML block.
- **WhatsApp Workspace Responsive Overhaul (UI/UX)**: Implemented complete responsive layout harmony and mobile-native UX patterns for the WhatsApp module (`/whatsapp`) utilizing modern 2026 CSS features:
  1. Added dedicated `whatsapp-responsive.css` file containing: View Transitions API animations for smooth panel switching, `@starting-style` entry effects, Container Queries (`@container`) for responsive bubble scaling, scroll-driven header compression, glassmorphism headers, and mobile safe-area overrides.
  2. Integrated touch gesture swipe zones (`onTouchStart`/`onTouchEnd`) in `ChatWindow.tsx` and `WhatsAppChat.tsx` to swipe back to list on mobile.
  3. Replaced fixed grid layout with horizontal scrolling flex strip for filter pills on mobile with larger touch targets.
  4. Added a slide-up tray modal overlay (`wa-rich-tools-tray`) for chat input tools on mobile screens.
  5. Implemented container `:has(.whatsapp-workspace-root)` overrides in `index.css` to dynamically strip out dashboard container paddings and double scrolls.
  6. Added dark-mode theme compatibility to `AudioRecorder.tsx` by replacing hardcoded white backgrounds with themed surface variables.
  7. Redesigned the `EmojiPicker` on mobile screens to act as a full-width bottom sheet drawer with smooth slide-up animations and touch-outside dismissal support.
  8. Integrated touch swipe gestures (`Swipe-to-Archive`) on conversation cards inside the chat list sidebar on mobile screens with spring physics, auto-closing behaviors, and full RTL layout directions.
- **WhatsApp Inbox Auto-Assignment & Reassignment Hardening (FIX)**: Fixed bugs in the WhatsApp auto-routing and reassignment sweep mechanism:
  1. Unified incoming webhook sync `WhatsAppSyncService` to delegate all auto-assignments to the advanced `WhatsAppAssignmentEngineService`, ensuring online checks, capacity limits, working hours, and advisory locks are respected.
  2. Resolved the infinite 60-second reassignment loop (ping-pong) by adding a 5-minute cooldown period and making the SLA response timeout window start relative to `lastAssignedAt` if the agent was assigned after the message.
  3. Optimized the background sweep query to dynamically query active company assignments and filter by pending customer messages, cutting full table scan DB overhead.
  4. Secured the background interval against concurrent execution across PM2 cluster instances using PostgreSQL distributed advisory locks (`pg_try_advisory_lock`).
  5. Added Jest unit tests to verify reassignment cooldown and SLA timeout behaviors.
  6. Fixed a candidate pool building bug that prioritized direct `assignedUser` (number owner) over configured `routingUserIds` in Round Robin / Shared Inbox modes, ensuring correct distribution to employee agents.
- **Vite Chunk Load Recovery & Nginx Cache Control (FIX)**: Fixed frontend crashes on navigation after deployment where old chunks failed to fetch (404):
  1. Refactored `AdminAppBootstrap.tsx` to import `ErrorBoundary` statically instead of dynamically with `React.lazy`, ensuring the recovery mechanism is always active and doesn't fail to load itself when old chunks are deleted.
  2. Configured both `location /` blocks in `nginx_configs/maxp.online.conf` with Cache-Control headers (`no-cache, no-store, must-revalidate`, `Pragma "no-cache"`, `Expires "0"`) to prevent the browser from caching `index.html` and force it to fetch updated assets.

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
