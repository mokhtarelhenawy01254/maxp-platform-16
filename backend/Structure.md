### Turbo Records & Status Synchronization Architecture
1. **Unbound Bulk Status Refresh (`turboController.js` & `turboStatusSyncService.js`)**:
   - `GET /api/v1/turbo/records?refresh=true` — Performs a comprehensive 180-day bulk status sync across all company orders via `turboStatusSyncService.syncTurboStatusToOrder`.
   - Incorporates branch-presence heuristics: shipments with status `processing` but missing branch assignments (`branch` null/empty) or containing Arabic location phrases like `"في انتظاري التسليم لتربو"` are mapped to canonical `turbo_sent` ("قيد الانتظار").
   - Automatically converts legacy `processing` shipments to `turbo_sent` when not active in branch feeds.

### Sidebar Navigation & Path Matching
1. Refactored `isSidebarPathActive` in `matchSidebarPath.ts` to support generalized sub-path highlighting. It now returns true for sub-paths (e.g. `/orders/123` highlights `/orders`), while excluding root-level dashboards such as `/`, `/hr`, `/admin/booking`, and `/admin/education` to prevent duplicate active state styling.
2. Extracted `NavLink` into a standalone, file-scoped component within `ClassicSidebar.tsx` to optimize React rendering performance and avoid reconciliation re-mount loops.

### API Endpoints
1. Extended `/api/v1/returns/requests` endpoint (`getReturnRequests` in `returnController.js`):
   - Supports filtering return requests by company `ordersStartDate` setting stored in `returnSettings.reviewDisplayConfig` (`createdAt >= ordersStartDate`) or explicit `startDate` query parameter, ensuring only orders/returns on or after the system start date appear.
2. Extended `/ai-admin/logs` endpoint (`LogListResponse` schema):
   - `GET /api/v1/ai-admin/logs` — Extended response payload to include global aggregated stats (`success_count`, `failed_count`, and `avg_latency`) for the filtered keys and providers, computed across both PostgreSQL tables: `ai.provider_logs` (ORM) and `public.ai_provider_logs` (Raw SQL).
2. Added Facebook connected user details to the `/facebook-oauth/status` endpoint:
   - `GET /api/v1/facebook-oauth/status` — Now queries the database for the company's `facebookUserAccessToken` and makes a Graph API request to `GET /me` (fields: `id,name,picture`) to fetch the connected Facebook personal account profile info. Returns `facebookUser: { id, name, picture } | null`.
2. Added FastAPI REST admin API endpoints for agent guardrails (mounted under the FastAPI `/admin` router prefix):
   - `GET /agents/{agent_id}/guardrails` (List active rules)
   - `POST /agents/{agent_id}/guardrails` (Create and translate raw feedback text to structured Excuse/Rebuttal/Action JSON via LLM + generate embeddings)
   - `PUT /agents/{agent_id}/guardrails/{rule_id}` (Edit rule details/state)
   - `DELETE /agents/{agent_id}/guardrails/{rule_id}` (Soft delete/deactivate rule)
   - `POST /agents/{agent_id}/guardrails/conflict-check` (Check semantic similarity conflicts against existing rules with 0.85 threshold)
   These endpoints are proxied dynamically on the frontend via the Express `/api/v1/ai-admin` route.

18. **WhatsApp Inbox AI Message Auto-Correction** — New Express endpoint for inline AI response correction:
    - `POST /api/v1/whatsapp-inbox/conversations/:conversationId/messages/:messageId/correct` — Accepts `{ correction: string }`, resolves the preceding customer message, creates a `correction_auto` guardrail rule via the AI Service, sends the corrected text to the customer via WhatsApp, and updates conversation state. Protected by `conversationAccessGuard` and `requireDbPermission('inbox.send')`.
19. **Unified Inbox AI Message Auto-Correction** — General Express endpoint for inline AI response correction across multiple platforms (WhatsApp, Facebook, Instagram, Telegram):
    - `POST /api/v1/unified-inbox/conversations/:conversationId/messages/:messageId/correct` — Accepts `{ correction: string }`, resolves the preceding customer message, creates a `correction_auto` guardrail rule via the AI Service, sends the corrected text to the customer via the appropriate platform-specific delivery method, updates conversation state, and persists the message to the database (for non-WhatsApp channels). Protected by `conversationAccessGuard` and `requireDbPermission('inbox.send')`.
20. **Customer Tags (Distinct list)** — GET /api/v1/customers/tags/distinct: Returns a list of unique tags used by the company's customers along with the count of customers having each tag. Used for tags filter dropdowns in customer lists and WhatsApp template broadcasts.
21. **Customer List Tag Criteria** — POST /api/v1/broadcast/customer-lists: Updated list creation and list membership resolution (`getCustomersInList`) to support `criteria.type === 'tag'` using Prisma relation filtering to select customers based on their assigned tags JSON array.

2. The backend endpoint `/api/v1/ai-image/model-config` (handled by `getModelConfig` in `aiImageController.js`) now has its `allowedModels` payload fully consumed by the newly introduced model selection dropdown in the AI Image Generator interface.
3. The backend template creation endpoint `/api/v1/whatsapp-templates/templates` (handled by `whatsappMetaTemplateController.createMetaTemplate`) was updated to propagate Meta's detailed API error payloads (including `error_user_title`, `error_user_msg`, and Meta subcodes) with the correct HTTP status code instead of swallowing them with a generic 500 status.
4. The backend authentication endpoints `/auth/login`, `/auth/me`, `/auth/companies` (handled by `getUserCompanies`), and `/auth/switch-company/:companyId` were updated to select and include the `roleRef` relation inside `userCompanies` queries, ensuring that role resolution prefers custom/assigned role keys (`uc.roleRef?.key || uc.role`) over the database default enum (`AGENT`), preserving administrative and owner access on page reload or switch. Additionally, `/auth/login` and `/auth/switch-company/:companyId` now load and return user permissions consistently via `permissionService.getUserPermissions`, and return the context-aware selected company object (including role and activeApps) to prevent frontend sidebar collapsing or inconsistency on reload/switch.
5. The backend endpoints `/api/v1/whatsapp/conversations` and `/api/v1/whatsapp/conversations/:jid/messages` (handled by `whatsappController.getConversations` and `whatsappController.getMessages` respectively) were updated to check and enforce user-specific number access permissions via `getUserAccessibleSessionIds` for non-admin accounts.
6. The WebSocket audience resolution inside `whatsappRealtimeAudienceService.js` was overhauled to construct precise target sets (including admins, leaders, and authorized agents/team members) and default `fallbackToCompany` to `false` for socket message event deliveries, stopping company-wide message leaks.
7. The backend query logic for `/api/v1/whatsapp-inbox/sessions` was updated inside `getUserAccessibleSessionIds` helper to restrict returned sessions to those with active assignments.
8. The workspace query logic `/api/v1/admin/whatsapp-numbers/workspace` was updated inside `numberAssignmentService.js` to ensure Meta Cloud provider sessions resolve to `CONNECTED` and to filter out soft-deleted sessions (where `isDeleted: true` is in metadata) to align with the Settings page.
9. The backend endpoint `/api/v1/whatsapp/sessions` (handled by `whatsappController.getSessions`) was updated to restrict returned sessions to only user-accessible sessions for non-admin roles (moderators/employees) using `getUserAccessibleSessionIds`.
10. The AI Service agent pipeline stages (`skills_pipeline.py` and `validate_reply.py`) were modified to support concurrent tool execution, tool arguments self-correction, strict Pydantic contract fallbacks, and output guardrail self-correction. Additionally, `client.py` and `skills_pipeline.py` were enhanced to support strict tool schemas, capture/propagate `reasoning_content` to stabilize DeepSeek V4 Flash tool calling, and parse XML-like DSML tool calling markup natively to prevent raw protocol leaks in chat sessions. Finally, `skills_pipeline.py` was refactored to use `build_user_content` from `src.context.multimodal`, fixing the customer image attachment pipeline for vision-capable models (like Gemini 2.5 Flash), resolved empty reply crashes causing `AI_SANDBOX_EMPTY_REPLY` downstream, updated `_format_tool_results` to correctly extract and format categories lists returned by the `category_list` tool, and expanded formatting to handle the `"results"` key (used by product search wrappers), single-product dictionaries (from `inventory_check`), and structured summaries for `offers_list_active`, `coupon_validate`, `order_lookup`, and `customer_info` tools. The `_normalize_openai_messages` method in `client.py` was also updated to sanitize tool call `arguments` fields, serializing Python `dict` objects to JSON strings, preserve `reasoning_content` and `reasoning` keys in the serialized assistant messages array to satisfy DeepSeek API schema requirements, and `_generate_openai_compat` was updated to omit the `tools` and `tool_choice` parameters entirely if `tool_choice == "none"` to prevent DeepSeek API 400 validation and completion failures during follow-up chat completions. Finally, updated the follow-up tool schemas builder (`_build_tool_dicts`) inside `skills_pipeline.py` to resolve tools from `allowed_skills` as well as `allowed_tools`, and set the follow-up call's default `tool_choice` to `"none"` to completely omit these parameters during follow-up execution, resolving DeepSeek completions schema validation failures (400 Bad Request) and "Thinking mode does not support this tool_choice" errors. Also updated the self-review reply rewrite handler (`_correct_output` inside `validate_reply.py`) to summarize tool outputs and pass them in the correction prompt, resolving context loss and hallucinations during rewrites, and corrected the rule-retrieval fallback (`get_relevant_rules` in `merchant_rules.py`) to return an empty list when no matches are found, stopping prompt pollution from unrelated rules. The self-review judge (`_self_review` in `validate_reply.py`) was also completely overhauled to feed the judge model the agent's core instructions summary (via `_extract_agent_identity`), the last 5 conversation history turns (via `_extract_conversation_context`), agent type, and channel information to eliminate blind-review errors. Tool evidence constraints were also increased to prevent truncation of database data. Finally, the self-review judge pipeline in `validate_reply.py` was upgraded to an active editor/polishing layer by expanding the prompt to distinguish between factual errors and human-like initiatives, modifying the JSON schema to output `need_polish` and `polished_reply` fields, and directly applying the `polished_reply` to eliminate redundant LLM correction loops. The maximum retry count `MAX_OUTPUT_RETRIES` was reduced from 2 to 1 to bound response latency, `_correct_output` was updated to inject persona guidelines from `create-premium-human-agent` into fallback rewrites, and `_llm_call` in `skills_pipeline.py` was updated to persist the compiled conversation messages history directly into `ctx.messages` so downstream validation and review stages can access the full context of prior conversation turns.
11. The Python `/chat` endpoint (`api/chat.py`) was updated to support `status: "escalated"` with optional `escalation` metadata.
12. A new `silentEscalationService.js` was introduced in the backend to manage Socket.IO events (`ai:escalation`) and DB `ActivityLog` creation for silent human handoffs.
13. The backend sandbox chat endpoint `/api/v1/ai-sandbox/chat` (handled by `aiSandboxController.sendChatMessage` / `runSelectedAgentInPython`) was updated to map `compiled_system_prompt` from the Python response to `result.compiledSystemPrompt`, enabling system prompt visualization in the Sandbox UI.
14. The backend endpoint `/api/v1/whatsapp/messages/upload-send` (handled by `whatsappRoutes.js`) was updated to support explicit `ptt` flag and override media classification to `'audio'` when file name is `'voice_note.webm'`, ensuring playable push-to-talk voice messages are delivered to WhatsApp.
15. The backend endpoint `/api/v1/whatsapp/messages/upload-send` MIME types whitelist was expanded to support common browser/client recording formats (`audio/wav`, `audio/x-wav`, `audio/wave`, `audio/x-pn-wav`, `audio/x-m4a`, `audio/aac`, `audio/x-aac`, `application/zip`, `application/x-zip-compressed`, `application/rar`, `application/x-rar-compressed`, `application/octet-stream`), and detailed console error logging was added to Multer's `fileFilter` for rejections.
16. The AI Service agent model resolution logic (`_resolve_agent_model` in `agent_registry.py`) was updated to prioritize the company-specific model override (`db_agent.model`) over the template's default model policy (`template.model_policy.get("default")`), ensuring company-level customizations are correctly respected.
17. The WhatsApp Baileys integration was hardened against transient connection errors (403/Bad MAC) by treating them as reconnectable instead of terminal logouts, preventing destructive credentials wiping. Reconnections now attempt indefinitely with an exponential backoff capped at 5 minutes. Additionally, `isValidAuthState` was refactored to preserve unpaired session credentials during the `QR_PENDING` phase.

### Frontend Pages & Redesigns
1. **Agent Profiles Page & Guardrails Tab (`AgentProfilesPage.tsx` / `AgentGuardrailsTab.tsx`)**:
   - Integrated the "القواعد والتعلم" (Guardrails & Learning) settings tab with a Lucide lock icon.
   - Built a comprehensive, localized control interface.
   - Implements raw feedback text submission with real-time translation and embedding generation.
   - Incorporates a semantic conflict checking modal dialog to alert merchants of rule overlap.
   - Displays a dynamic grid of rules (Excuse, Rebuttal, Action, Source tags, and active status Switch toggle).
   - Features an inline sandbox chat playground on the left allowing merchants to test agent rule compliance immediately, complete with metadata tags showing triggered guardrail IDs.
2. **AI Image Generator Redesign (`/admin/ai-image-generator`)**: Re-architected the page to feature a balanced, borderless 12-column split-canvas layout conforming to 2026 aesthetics:
   - **Page Header**: Removed the heavy decorative hero banner (`SettingsPageHero`) and the outer white bordered shell (`SettingsPageShell`) to let the workspace blend directly on the page background, starting with a clean, low-profile text header.
3. **Dashboard Welcome State Removal**: Removed the welcome state (`DashboardWelcomeState`) and its conditional rendering logic from the main dashboard (`MainDashboardPage.tsx`). The main dashboard metrics, charts, and activity feeds are now always visible to new users or companies without the ecommerce application active. The unused `DashboardWelcomeState.tsx` file was deleted.
   - **Configuration Column (7 cols)**: Renders the "Core Product Information" form fields directly onto the page canvas without enclosing Card borders. Replaces heavy nested card sections with borderless, flat macOS/iOS-style collapsible accordion sections separated by thin dividers (`border-b border-slate-100`). Restructured the presets into a borderless row of clean tags (Chips) that transition smoothly on hover.
   - **Preview & Actions Column (5 cols)**: Sticky control panel styled as a floating glassmorphic pane (`backdrop-blur-md bg-white/70 dark:bg-slate-900/40`) with soft shadows instead of qausi-cards. The responsive advertisement mockup (`AspectPreview`) floats as a borderless canvas widget with multi-level soft shadows.
   - **Full-Width Gallery Section (12 cols)**: Renders previously generated images in a borderless grid layout with rounded corners, aspect ratio indicators, hover scale effects, and the "Clone Settings" metadata restoration shortcut.
4. **Branches Management Page Overhaul (`/admin/booking/branches`)**: Re-architected and polished the branches layout and management popup for premium UX:
   - **Branch working days**: Circular badges for working days (desktop/mobile) with dynamic hover tooltips showing hours.
   - **Branch modal**: Embedded scrollable container to support viewport constraints, customized file upload container widget, and active days dependency constraints for gender selection.
   - **Unified Header Filter**: Positioned a global branch selector dropdown next to advanced filtering options on the Booking Management Page.

### Database Schema Models
1. **AgentGuardrailRule Table (`ai.agent_guardrail_rules`)**: Added the database table inside the `ai` schema to house merchant-defined rules. Registered under SQLAlchemy `AgentGuardrailRule` model and migrated using Alembic head revision `5049cf2020f5_add_agent_guardrail_rules.py`.
2. The database seeding script for the `ai.skills` table (`seed.py`) was corrected to map `triggerPhrases` from `skill.json` to the database column `trigger_phrases`, enabling SQL intent routing.
3. **whatsAppSessionId field in BroadcastCampaign** — Added an optional `whatsAppSessionId` field to the `BroadcastCampaign` model in `marketing.prisma` to link broadcast campaigns with the specific WhatsApp session. Updated `POST /api/v1/broadcast/campaigns` to store this field, and both the sending controller and background scheduler `broadcastSchedulerService.js` to load and use it during execution, bypassing the 24-hour customer activity restriction for WhatsApp template campaigns.

### Agent Templates & Declarative Skills
7. A new structured agent template `sales-rep-v2-agent` was added to `apps/backend/agents/` with an improved prompt architecture inspired by the `agency-agents` open-source framework (123k ⭐). The template features: segmented SOUL.md (Identity, Voice, Sales Workflow, Critical Rules, Success Metrics, Failure Protocol), prioritized TOOLS.md (🔴 Essential → 🟡 Supporting → 🟢 Learning), and structured AGENTS.md (Handoff Rules). The `SOUL.md` was recently updated with a Voice & Tone constraint to prevent repeated greetings during active chat threads.
8. The `catalog-search` declarative skill was completely redesigned and standardized for 2026 progressive disclosure:
   - **`skill.json`**: Upgraded description to support contextual matching, added 20 localized trigger phrases, expanded allowed tools, and raised the max tool count limit.
   - **`SKILL.md`**: Added a comprehensive decision tree, explicit parameter documentation (for visual search and size/color attributes), failure handling paths, and output templates.
   - **`conversations.md`**: Created new few-shot interactive dialog examples to steer the agent's behavior.
   - **`integration.py` & `seed.py`**: Enabled caching and prompt injection of trigger phrases inside the system prompt's `<skill>` XML blocks, resolving intent routing gaps.

### AI Agent Templates Unification & View Simplification
8. Removed legacy ready agent profiles and constraints/locks. AI templates (`AgentTemplate`) are now the single source of truth for agent behavior and configurations.
9. Decommissioned `spawnReadyAgentsService.js` and removed quick-create seeding logic.
10. Refactored merchant agent creation (`AgentProfilesPage.tsx`) to directly use AI templates and provision overriding configuration records in the `agents` table mapped to `AgentTemplate` slugs.
11. Simplified the Merchant Agent Profiles view (`AgentProfilesPage.tsx`) to hide complex system fields (persona, goal, tasks, boundaries, welcome messages, escalation options, language). Merchants now edit and view only **3 items**: **Agent Name**, **Tone / Way of Replying**, and **Additional Instructions**.
12. Simplified the agent creation wizard to a **single step** (Template + Name + Icon), allowing templates to fully drive the default configuration values.
13. Preserved all hidden/system prompt configurations inside the `SOUL.md` content on the backend during merchant updates of the simplified fields.

### System Architecture
- **Order Sync Queue Service Overhaul**: Migrated the background database-backed sync queue service (`SyncQueueService`) from raw SQL to native Prisma Client ORM query structures. This eliminates PostgreSQL naming mismatches (where `order_id` / `consumer_id` snake_case references threw column mapping exceptions on camelCase DB schemas) and enforces strict database query typing and security.
- **Vite Chunk Load Recovery & Cache Control Routing**: Overhauled the frontend root error boundary structure in `AdminAppBootstrap.tsx` to statically import the `ErrorBoundary` component, ensuring the application can capture module loading failures (due to deleted assets during production updates) and successfully execute chunk load recovery (automatic window reloads). Hardened the Nginx static assets mapping in `nginx_configs/maxp.online.conf` by adding strict Cache-Control headers (`no-cache, no-store, must-revalidate`) for the SPA `/` location blocks, preventing browsers and proxy CDNs from caching `index.html` and forcing them to fetch the most updated hashed asset references.
- **WhatsApp Workspace Responsive Overhaul**: Introduced container `:has()` layout overrides in `index.css` to dynamically strip container paddings and avoid double scrolls when browsing the `/whatsapp` path. Leveraged modern 2026 CSS layout patterns: View Transitions API for seamless sliding transitions, `@starting-style` entry animations for conversation cards/messages, `@container` queries for screen-width sensitive chat bubble sizing, and CSS-native Scroll-Driven Animations for header compression on scrolling. Added touch event swipe capture for mobile back-to-list navigation, responsive overlay trays for entry tools, themed container compatibility for the audio recorder component, sliding bottom sheet drawer configurations for the emoji picker, and touch swipe gestures (`Swipe-to-Archive`) for conversation cards in the chat list.
- Added **Silent Takeover & human-in-the-loop** event-driven pattern via Socket.IO: on AI failure (e.g. guardrail blocks or JSON parsing exhaustion), the thread is marked as needing human intervention, notifying moderators instantly without alerting the customer.
- Agent templates follow a **multi-file contract** pattern: `agent.json` (manifest) + `SOUL.md` (persona/workflow) + `TOOLS.md` (tool instructions) + `AGENTS.md` (handoff rules), assembled into a single XML `<agent_contract>` at runtime by `template_registry.py`.
- Unified **WhatsApp Auto-Assignment**: Unified incoming webhook message sync and background sweeps under a single advanced `WhatsAppAssignmentEngineService`, ensuring all incoming chats respect online status, workload capacity, working hours, and transactional locks. Additionally, corrected the candidate pool generation to prioritize configured employee lists (`routingUserIds`) over direct number owners in Round Robin and Shared Inbox modes.
- **Distributed Sweep Coordination**: Background monitor sweeps utilize PostgreSQL session-level advisory locks (`pg_try_advisory_lock`) to coordinate single-instance execution across PM2 cluster nodes.
- **Assignment-Relative SLA Cooldown**: Implemented a 5-minute cooldown and assignment-relative SLA timeout calculation based on `lastAssignedAt` to eliminate 60-second reassignment ping-pong loops between moderators.
- **GramJS Unhandled Rejection Alert Loop Isolation**: Added `isGramJsResolveError` helper in `recoverableUnhandledRejection.js` to identify and ignore `resolve() called for non-request instance` errors from the GramJS library, preventing an infinite feedback loop where unhandled rejections trigger Telegram alerts, which in turn generate new Telegram updates and trigger new errors.
- **Merchant Guardrails Similarity Matching Threshold**: Lowered the default cosine similarity threshold inside `MerchantRuleGuardrail.get_relevant_rules` from 0.75 to 0.65 to ensure reliable semantic matching against customer messages featuring colloquial dialect variations.
- **Compiled System Prompt Observability & Context Pipeline**: Refactored `_llm_call` in the skills pipeline to re-assign the fully-assembled system prompt (`enriched_prompt`) back to the `PipelineContext.system_prompt` field, ensuring it is propagated correctly to sandbox logs and database session traces.
- **WhatsApp Baileys Wrapped Messages Unwrapping**: Enhanced the `extractMessageContent()` method in `WhatsAppManager.js` to recursively unwrap container structures (such as `viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`, `ephemeralMessage`, and `documentWithCaptionMessage`) before extracting the underlying message type and content. This ensures full coverage for ephemeral and view-once media incoming messages.
- **WhatsApp Baileys Zombie Session Detection Hardening**: Hardened the zombie check routine in `WhatsAppManager.js` during connection updates by verifying that `sock.user` is also missing before classifying a session with `registered: false` as a zombie, preventing active sessions from being accidentally wiped and disconnected right after successful pairing.

### AI Agent Pause Toggle System
1. **API Support (`PUT /conversations/:id`)**:
   - `conversationCrudController.js` and `unifiedInboxController.js` (PUT `/api/v1/unified-inbox/conversations/:id`) now accept and process the `aiEnabled` boolean parameter in requests body, updating the corresponding database field on the `Conversation` model (and matching customer conversations for WhatsApp contacts).
2. **Channel Auto-Reply Interceptors**:
   - Integrated check for `conversation.aiEnabled !== false` into:
     - `WhatsAppInboundService.js` (Meta Cloud WhatsApp webhook)
     - `WhatsAppManager.js` (Baileys WhatsApp socket handler)
     - `TelegramBotService.js` (Telegram update webhook)
     - `allFunctions.js` (Facebook Messenger and Instagram webhook routing)
3. **Frontend Integration**:
   - Implemented `toggleAi` method in `useConversationActions.ts` hook.
   - Updated `whatsappController.getConversations` and `unifiedInboxController.getUnifiedConversations` to return the `conversations` list containing `aiEnabled` states.
   - Added interactive `🤖` toggle buttons to pause/resume AI replies in:
     - `whatsapp-inbox/WhatsAppChat.tsx`
     - `whatsapp/WhatsAppChat.tsx`
     - `TelegramConversationsPro.tsx`
     - `MessengerChat-final.tsx`
     - `FacebookInbox.tsx`
     - `InstagramInbox.tsx`
     - `UnifiedInbox.tsx`

### Facebook OAuth Configuration & Webhook Verification
1. **Single Source of Truth Configuration (`facebook-oauth-config.json`)**:
   - Removed hardcoded fallback Facebook app secrets from `facebookAppConfig.js`.
   - Unified config loading to read `appId` and `appSecret` dynamically from `facebook-oauth-config.json` (managed via `/super-admin/facebook-oauth`) with environment variable overrides.
   - Secured by clearing committed credentials in Git, adding it to `.gitignore`, and providing `facebook-oauth-config.example.json` as a baseline template.
   - Updated `webhookController.js` to verify Meta webhook signatures using the app secret resolved from this unified module fallback.

### AI Agent Sandbox
1. **Agent Skills Visual Strip**:
   - Added a dedicated skills display bar below the HeaderBar in `/admin/ai-hub?tab=sandbox` page (`AIAgentSandboxPage.tsx`).
   - Fetches the rich skill list (including `displayName` and `description`) from the agent profile API on agent switch and displays them as a horizontal row of themed badges with a `Sparkles` icon.
2. **Active Skill Context Tracing & Display Name Mapping**:
   - Updated Python `skills_pipeline.py` to assign the matching resolved skill tool's properties to `ctx.active_skill_context` during the tool execution phase.
   - Updated `ChatArea.tsx` and `AIAgentSandboxPage.tsx` to pass the loaded agent skill profile details and map the active skill ID returned in the metadata to its localized friendly `displayName` on assistant chat bubble badges.


### Company Dashboard Layout Optimization
1. **Grid Layout Sizing & Row Density**:
   - Refactored the core grid layout inside `AppWidgetGrid.tsx` to enable `grid-flow-row-dense` row packing.
   - Wrapped the active cards in conditional wrapper `div`s that dynamically assign responsive column-spanning tags (`sm:col-span-2 xl:col-span-2`) for double-width widgets, ensuring complete layout grid utilization without empty spaces.
2. **Button Sizing & RTL Alignments**:
   - Standardized button elements inside `AppWidgetCard.tsx` and `AppWidgetMini.tsx` to use full-width stretching (`w-full`) and logical text-start alignments (`text-start`), ensuring clean RTL layout compliance.
   - Integrated micro-interactions such as scaling icons on group-hover (`group-hover:scale-110`) and slight translations (`hover:-translate-y-1.5`) for a premium user experience.

### Customer vs. Lead Architecture
1. **Unified Storage Model**: Both Customers (`/customers`) and Leads (`/leads`) share a single PostgreSQL database table/model (`Customer`, mapped to `"customers"` in Prisma). They are distinguished using the `status` enum field (`CustomersStatus` in `enums.prisma`).
2. **Transition & Auto-Promotion**:
   - Incoming WhatsApp conversations from unsaved contacts automatically create a `Customer` with `status: 'LEAD'` via `WhatsAppSyncService.js`.
   - Once a lead submits a successful order, `enhancedOrderService.js` automatically upgrades their status from `LEAD` to `ACTIVE`.
3. **Frontend Routing Division**:
   - `/customers` is rendered by `CustomerList.tsx` showing all customer profiles (leads, active, inactive, blocked) with status filter toggles.
   - `/leads` is rendered by `LeadsList.tsx` displaying profiles pre-filtered to `status: 'LEAD'`, serving as a focused pipeline for prospects.
4. **WhatsApp Automation Integrations**:
   - `LeadCategory` classifies leads (e.g. VIP, Warm Lead) and associates them with automatic follow-up and engagement sequences via `LeadFollowUpEnrollment` and `CustomerJourney` models defined in `whatsapp_automation.prisma`.

### 2026 SOTA Agent Refactoring (No-Heuristics)
1. **Removal of 2024-era Heuristic Hooks**: Fully deprecated and deleted `HotelEnforcementHook` (`hotel_hook.py`) from the pipeline hooks, eliminating brittle regex parsers, Egyptian mobile phone number matchers, Arabic month conversion dictionaries, and hardcoded `hotel_reserve` tool-call injection.
2. **LLM-Native Tool Calling & Slot-Filling**: The `hotel-agent` now relies on clean, native tool calling schemas where the LLM itself evaluates the user's intent to book, parses arguments from context, and manages parameter validation (Pydantic schemas) dynamically.
3. **Conversational Slot-Filling Prompting**: Enhanced `SOUL.md` and `TOOLS.md` prompts inside the `hotel-agent` templates directory to instruct the model to conversationally gather missing required fields (name, phone, dates) rather than inventing mock values or aborting.
4. **Pydantic ValidationError Handling**: Upgraded `_execute_one_tool` inside the skills pipeline (`skills_pipeline.py`) to catch validation errors (`ValidationError`) from Pydantic input models during tool calling, formats them into a structured human-readable parameter-by-parameter error description, and feeds them back as a tool execution error to the LLM to guide self-correction.

### Webhook and Controller Status Sync Realignment
1. **OrderStatus and PaymentStatus Webhook and Controller Alignment**: Corrected delivered shipment mapping in `routes/turboWebhook.js` and `controller/turboController.js` to set `status` to `'DELIVERED'` (conforming to `OrderStatus` enum values) and `paymentStatus` to `'COMPLETED'` (conforming to `PaymentStatus` enum values).
2. **Service Enum Sync**: Corrected `services/orderInvoiceService.js` to set order `paymentStatus` to `'COMPLETED'` instead of `'PAID'` to avoid database enum validation crashes (500 Internal Server Errors).
