# Backend Bugs Log

### [FIX] AI Sandbox Empty Reply (`AI_SANDBOX_EMPTY_REPLY`)
- **Date**: 2026-07-02
- **Description**: The AI Agent Sandbox under `/admin/ai-hub?tab=sandbox` intermittently returned empty replies causing `AI_SANDBOX_EMPTY_REPLY` errors downstream.
- **Root Cause**: 
  1. An undefined variable `has_images` in `skills_pipeline.py` (referenced inside `_llm_call`) caused a `NameError` crash which was intercepted silently, returning an empty string reply fallback to the Node backend instead of forwarding the error code.
  2. The pipeline execution path for direct responses fell back to setting `ctx.final_reply` directly from `provider_response.text` without validation. If the LLM returned empty text after retries (e.g. during rate limits or cold-start timeouts), this empty string was returned to the Node backend, which registered it as an empty assistant response and triggered `AI_SANDBOX_EMPTY_REPLY`.
- **Resolution**:
  1. Defined the `has_images` flag properly using `bool(ctx.attachments)` in `_llm_call`.
  2. Implemented a robust Arabic fallback message ("عذراً، لم أتمكن من معالجة طلبك...") if the LLM fails to return any text response even after retries, avoiding empty string returns.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] DeepSeek DSML XML Tool Call Leak & Parsing Failures
- **Date**: 2026-07-02
- **Description**: DeepSeek V4 models generated XML-like DSML tool calling tags (e.g. `<DSML | | invoke name="inventory_check" | | >...`) inside plain text responses, which leaked to the customer in chat sessions instead of executing the tools.
- **Root Cause**: The python `_parse_dsml_tool_calls` parser in `LLMClient` assumed the content inside DeepSeek DSML tags was a JSON array, failing to match the native XML-like DSML tags outputted by DeepSeek V4 models. Additionally, the parser was only triggered when the provider was exactly `"DEEPSEEK"`, failing to intercept DSML output when DeepSeek models were invoked via other providers (like OpenRouter or SambaNova).
- **Resolution**:
  1. Updated the regexes in `apps/ai-service/src/llm/client.py` to correctly parse standard and spaced XML-like DSML invoke and parameter tags, extracting parameters and auto-detecting types.
  2. Maintained the legacy JSON-based DSML parser as a fallback.
  3. Expanded the trigger condition in `_generate_openai_compat` to check for DSML formatting when the model contains "deepseek" or when text explicitly contains DSML markup.
  4. Added unit tests covering spaced XML patterns, type conversions, and legacy fallbacks.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/tests/llm/test_deepseek_stabilization.py`

### [FIX] Broken Multimodal Image Pipeline for AI Agents (Raw Attachment Object Leak to LLM)
- **Date**: 2026-07-02
- **Description**: AI Agents were unable to recognize or see image attachments sent by customers. Even when using multimodal models (like Gemini 2.5 Flash), agents would reply "I cannot see the image" or ask the customer to describe it.
- **Root Cause**: In the primary LLM pipeline stage (`skills_pipeline.py`), the message assembler was appending raw attachment objects `list(ctx.attachments)` directly to the multipart user content instead of formatting them as OpenAI-compatible `image_url` parts using `build_user_content` from `src.context.multimodal`. This caused the LLM providers (Google, OpenAI) to ignore the invalid attachment payloads completely.
- **Resolution**: Refactored the user content assembly in `skills_pipeline.py` to import and call `build_user_content(ctx.message, ctx.attachments)` from `src.context.multimodal`, ensuring all images are correctly structured into standard `image_url` components before sending the request to the LLM client.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [IMPROVEMENT] Sales Rep V2 Agent Template — Structured Prompt Architecture
- **Date**: 2026-07-02
- **Description**: The original `sales-rep-agent` template had flat, unstructured prompts that caused the LLM to lose track of sales workflow steps during long conversations, forget critical rules (e.g., not inventing prices), and display raw technical error messages ("حصل عطل فني") to customers when tool calls failed.
- **Resolution**: Created `sales-rep-v2-agent` with a segmented prompt architecture inspired by the `agency-agents` open-source project (123k ⭐):
  1. **SOUL.md**: Added 6 structured sections — Identity & Vibe, Voice & Tone, Sales Workflow (5-step process), Critical Rules (Do's & Don'ts), Success Metrics, and Failure Protocol.
  2. **TOOLS.md**: Categorized tools by priority (🔴 Essential → 🟡 Supporting → 🟢 Learning) with explicit "when to use / when NOT to use" instructions per tool.
  3. **AGENTS.md**: Replaced flat rule list with structured Handoff Rules (when to escalate to support, human, or marketing agents).
- **Files Added**:
  - `apps/backend/agents/sales-rep-v2-agent/agent.json`
  - `apps/backend/agents/sales-rep-v2-agent/SOUL.md`
  - `apps/backend/agents/sales-rep-v2-agent/TOOLS.md`
  - `apps/backend/agents/sales-rep-v2-agent/AGENTS.md`

### [FIX] DeepSeek V4 Flash Function Calling Instability (XML/DSML Leak & JSON Parsing Failures)
- **Date**: 2026-07-01
- **Description**: DeepSeek V4 Flash model showed tool-calling instability, sometimes outputting native XML tags (`<｜DSML｜tool_calls>`) inside text blocks, omitting parameters, or failing to match the expected JSON schema.
- **Root Cause**:
  1. **Lax Tool Schemas**: Without strict schema constraints (`strict: true`), the model's token distribution drifted into raw text/DSML tags.
  2. **Chat History Mismatch**: The model requires its thinking tokens (`reasoning_content`) to be passed back in subsequent history turns. If dropped, it loses context and defaults to native DSML formatting.
- **Resolution**:
  1. Modified `LLMClient` to automatically inject `"strict": true` into function definitions for OpenAI and DeepSeek providers.
  2. Captured `reasoning_content` from OpenAI-compatible chat responses.
  3. Modified `skills_pipeline.py` to preserve and forward `reasoning_content` in the assistant role history during follow-up tool execution turns.
  4. Added explicit negative constraints to the fallback system prompt forbidding XML/DSML leakage.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] WhatsApp Session Dropdown Displayed Raw CUID for Meta Cloud
- **Date**: 2026-06-30
- **Description**: The WhatsApp Session dropdown in the template broadcast page displayed the raw database CUID instead of the friendly name or phone number for Meta Cloud sessions.
- **Root Cause**:
  1. For Meta Cloud sessions, the phone number is stored in `metaDisplayPhoneNumber` instead of `phoneNumber` (which is `null`).
  2. The dropdown used `{s.name || s.phoneNumber || s.id}` to display the session label. When `name` was missing/empty or matched the CUID itself, and `phoneNumber` was `null`, it fell back to the CUID `id`.
- **Resolution**:
  1. Updated the `Session` interface in the frontend page to include `provider` and `metaDisplayPhoneNumber`.
  2. Modified the dropdown rendering logic to detect if the session's name is a CUID (or matches the session ID), and display `metaDisplayPhoneNumber` or `phoneNumber` as the primary fallback before displaying the raw ID.
- **Files Modified**:
  - `apps/frontend/src/pages/whatsapp/WhatsAppTemplateBroadcast.tsx`

### [FIX] Broken translations on Project Break-Even page
- **Date**: 2026-06-30
- **Description**: Translation keys like `projectBreakEven.title` were displayed raw on the page instead of their Arabic/English translations.
- **Root Cause**:
  1. The page-level translation keys for `projectBreakEven` were manually added directly in `translation.json` files but were missing from the `sections/` directory.
  2. The `merge-translations.js` script (which runs on build/dev) automatically overwrites `translation.json` with the combined content of the JSON files in `sections/`. Consequently, the manual edits were overwritten, causing translation loading to fail.
- **Resolution**:
  1. Created dedicated translation files `apps/frontend/src/locales/ar/sections/projectBreakEven.json` and `apps/frontend/src/locales/en/sections/projectBreakEven.json` containing the translation keys.
  2. Ran the merge script to safely regenerate `translation.json` files with `projectBreakEven` as a root-level key.
- **Files Modified**:
  - `apps/frontend/src/locales/ar/sections/projectBreakEven.json`
  - `apps/frontend/src/locales/en/sections/projectBreakEven.json`

### [FIX] WhatsApp Inbox Displaying Unassigned/Inactive Sessions for Admins
- **Date**: 2026-07-01
- **Description**: The WhatsApp inbox page (`/whatsapp-inbox`) displayed unconfigured, draft, or disconnected sessions for admin roles, which differed from the settings page (which only showed configured assignments).
- **Root Cause**:
  1. For admin roles, the `getUserAccessibleSessionIds` helper in `numberAccessGuard.js` was querying all `whatsAppSession` records directly from the DB, bypassing `whatsAppNumberAssignment` entirely.
  2. For `Harf Online`, this resulted in all 8 sessions (like `ww`, `22`, `Sales S5`, etc.) showing up in the inbox sidebar, even though only 2 (`Harf ACC` and `SalesApiss`) were active in the settings.
  3. Furthermore, `NumberSidebar.tsx` was vulnerable to a frontend TypeError crash during search if a session's `phoneNumber` was `null` (which was true for 7 of Harf's sessions).
- **Resolution**:
  1. Modified `getUserAccessibleSessionIds` in `apps/backend/middleware/numberAccessGuard.js` to ensure even admin users only retrieve sessions linked to an active assignment (`isActive: true` on `whatsAppNumberAssignment`).
  2. Updated `apps/frontend/src/pages/whatsapp-inbox/components/NumberSidebar.tsx` to handle `null` phone numbers safely by adding an empty string fallback before invoking `toLowerCase()`.
- **Files Modified**:
  - `apps/backend/middleware/numberAccessGuard.js`
  - `apps/frontend/src/pages/whatsapp-inbox/components/NumberSidebar.tsx`

### [FIX] Meta Cloud WhatsApp Session showing Disconnected in Routing Workspace
- **Date**: 2026-07-01
- **Description**: Meta Cloud API sessions (like `SalesApiss`) were shown as CONNECTED on the Settings page but as DISCONNECTED in the Routing Workspace page.
- **Root Cause**:
  1. Meta Cloud sessions are webhook-based and are not managed in the in-memory Baileys `activeSessions` map.
  2. The `getRoutingWorkspace` query in `numberAssignmentService.js` was falling back to the database status for any session not in `activeSessions`, resulting in `DISCONNECTED` for `SalesApiss`.
  3. The main WhatsApp Settings page resolves any `META_CLOUD` provider session to `connected` as it doesn't rely on web socket uptime.
- **Resolution**:
  1. Updated `getRoutingWorkspace` in `apps/backend/services/numberAssignmentService.js` to explicitly resolve `META_CLOUD` sessions as `CONNECTED`.
- **Files Modified**:
  - `apps/backend/services/numberAssignmentService.js`

### [FIX] Soft-deleted WhatsApp Sessions Showing in Routing Workspace
- **Date**: 2026-07-01
- **Description**: Drafts or soft-deleted sessions (where `isDeleted: true` is in metadata) were showing up in the Routing Workspace page, whereas they were correctly hidden on the main WhatsApp Settings page.
- **Root Cause**:
  1. The Settings page API filters out sessions with `isDeleted: true` in their metadata.
  2. The `getRoutingWorkspace` service query did not query or filter based on metadata, showing all 8 historical sessions (including drafts/deleted ones like `ww`, `22`, `Sales S5`, `sss`, `sales api`, `SalesApi`).
- **Resolution**:
  1. Updated `getRoutingWorkspace` in `apps/backend/services/numberAssignmentService.js` to query `metadata` and filter out sessions with `isDeleted: true`.
- **Files Modified**:
  - `apps/backend/services/numberAssignmentService.js`

### [FIX] WhatsApp Session Dropdown showing CUID ID instead of Friendly Name
- **Date**: 2026-07-01
- **Description**: The WhatsApp Workspace select dropdown trigger rendered the raw CUID ID instead of the friendly name after choosing a session.
- **Root Cause**:
  1. Headless Select from `@base-ui/react` relies on mounted item text registrations to translate values to labels. Because the list is unmounted when closed and sessions load asynchronously, the trigger fallback displayed the raw ID.
- **Resolution**:
  1. Replaced the `SelectValue` component in `ChatSidebar.tsx` with a custom `span` that manually resolves the selected ID to `session.name` from the `sessionOptions` list.
- **Files Modified**:
  - `apps/frontend/src/pages/whatsapp/components/ChatSidebar.tsx`

### [FIX] WhatsApp Workspace session list did not restrict access for moderators
- **Date**: 2026-07-01
- **Description**: Employees/moderators could see and select all WhatsApp sessions of the company in the `/whatsapp` dropdown menu, bypassing routing restrictions.
- **Root Cause**:
  1. The `/api/v1/whatsapp/sessions` endpoint returned all sessions for the company without verifying active number assignments for the authenticated user.
- **Resolution**:
  1. Updated `getSessions` in `apps/backend/controller/whatsappController.js` to filter the returned sessions using `getUserAccessibleSessionIds` for non-admin roles.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js`

### [FIX] Facebook Inbox layout squeezed on tablet and narrow viewports
- **Date**: 2026-07-01
- **Description**: The Facebook Inbox chat header actions overflowed and wrapped in a squeezed layout on tablets (e.g. iPad) and on desktop screens when the customer details panel was open.
- **Root Cause**:
  1. The chat header rendered all 8 action buttons inline when not on mobile, regardless of the actual space available.
  2. In narrow viewports (like tablet or when the profile panel is open on desktop), the chat window column gets squeezed to less than 500px, causing the 8 action buttons in the header to wrap, overlap, and collide with the customer name/identity.
- **Resolution**:
  1. Introduced `showDesktopMoreMenu` state variable to toggle a secondary actions dropdown.
  2. Defined `shouldCollapseActions = !isWideDesktop || showPinnedContextPanel` to identify when the viewport or column space is constrained.
  3. When space is constrained, we collapse the secondary actions (Quick Order, Snooze, Copy Link, Notes, Delete) into a clean "More Actions" dropdown menu using the existing `MoreHorizontal` icon and custom classes (`business-dropdown-surface`, `business-dropdown-option`), while keeping critical actions inline (Mark as Done, Star/Priority, Profile Toggle).
- **Files Modified**:
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx`

### [FIX] Sequential Execution Latency in Skills Pipeline
- **Date**: 2026-07-01
- **Description**: The agent was executing multiple tool calls sequentially, leading to high latency when multiple tools were invoked.
- **Root Cause**: The tool execution loop in `skills_pipeline.py` iterated and ran `await skill.execute` sequentially.
- **Resolution**: Refactored the loop to execute tool calls concurrently using `asyncio.gather`.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Missing Tool Arguments JSON Parsing Failure in Skills Pipeline
- **Date**: 2026-07-01
- **Description**: If the LLM generated invalid JSON arguments, the system fell back to empty arguments `{}`, causing the tools to run with incomplete inputs.
- **Root Cause**: A try-except block caught the JSONDecodeError and silenced it by setting `arguments = {}`.
- **Resolution**: Implemented a self-correction mechanism that catches `parse_error`, informs the LLM of the syntax error, and retries the tool execution with corrected parameters.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Output Contract Validation Bypass in validate_reply
- **Date**: 2026-07-01
- **Description**: If the final response failed validation against the `AgentResponse` Pydantic model (or failed JSON parsing), the unvalidated raw text was returned to the user, bypassing the contract safety.
- **Root Cause**: The except block in `validate_reply.py` fell back to `ctx.final_reply = reply`.
- **Resolution**: Integrated Pydantic and JSON validation check within the main retry loop of `validate_reply.py`. Implemented an LLM self-correction reflection loop (`_correct_validation_error`) that catches the validation/parsing errors, sends them back to the LLM with the target schema description, and retries generation up to 2 times, returning a clean fallback message only on final exhaustion.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`

### [FIX] Rigid Guardrail Output Blocking
- **Date**: 2026-07-01
- **Description**: When output guardrails were violated, the conversation was immediately blocked, causing a poor user experience.
- **Root Cause**: An immediate early return with status `GUARDRAIL_BLOCKED` occurred upon any violation.
- **Resolution**: Implemented a self-correction reflection loop that retries up to 2 times, prompt-injecting the violation details to let the LLM rephrase its answer safely.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`

### [FIX] AI Fallback Error Message Leakage & Lack of Takeover (Silent Escalation)
- **Date**: 2026-07-01
- **Description**: When output validation, guardrails, or LLM execution failed completely, the system either sent a static Arabic error message to the customer (revealing it is an AI) or left the customer hanging without escalating to a human moderator.
- **Root Cause**: Hardcoded fallback error messages in `validate_reply.py` and lack of human takeover routing on failure.
- **Resolution**: 
  1. Updated Python pipeline context and stages to suppress fallback text and return `status="escalated"` with `reply=None` and `escalation` metadata.
  2. Created a Node.js `silentEscalationService` that logs silent escalation events in `ActivityLog` and emits `ai:escalation` Socket.IO events to the company workspace room.
  3. Integrated escalation checks into all 5 channel handlers (WhatsAppInboundService, WhatsAppManager, TelegramBotService, Facebook auto-reply, Instagram auto-reply) to intercept failures, trigger human takeover, and prevent messages from sending to the customer.
- **Files Modified**:
  - `apps/ai-service/src/contracts/response_schema.py`
  - `apps/ai-service/src/pipeline/context.py`
  - `apps/ai-service/src/pipeline/stages/validate_reply.py`
  - `apps/ai-service/src/workflows/orchestration_flow.py`
  - `apps/ai-service/src/api/chat.py`
  - `apps/ai-service/tests/unit/test_phase4.py`
  - `apps/backend/services/silentEscalationService.js` [NEW]
  - `apps/backend/services/whatsapp/WhatsAppInboundService.js`
  - `apps/backend/services/whatsapp/WhatsAppManager.js`
  - `apps/backend/services/TelegramBotService.js`
  - `apps/backend/utils/allFunctions.js`

### [FIX/IMPROVEMENT] Ready Agent Profiles Gaps Resolution & Merchant Editing Constraints
- **Date**: 2026-07-02
- **Description**: Gaps identified between the Super Admin agent profiles management and the merchant agent creation flow. Super admins could not set advanced SOUL configurations (welcome messages, language, escalation policies, custom instructions) for ready-to-use agents, nor could they define editing locks (read-only restrictions) to preserve core business logic for merchant agents.
- **Root Cause**:
  1. The Super Admin `ReadyProfile` schema in both frontend and backend lacked fields for locks (`lockIdentity`, `lockPersona`, `lockRules`, `lockCustomPrompt`) and advanced soul fields (`welcome`, `language`, `escalation`, `customPrompt`).
  2. The Merchant `AgentProfilesPage` did not enforce these locks at the input field level, allowing merchants to edit restricted settings.
  3. No seeding script existed to initialize DB settings for these ready agents upon clean setup.
- **Resolution**:
  1. Modified `apps/backend/routes/superAdminRoutes.js` (POST handler) to capture and save locks.
  2. Modified `apps/frontend/src/pages/super-admin/SuperAdminAgentProfiles.tsx` to add toggles for locks and inputs for advanced soul fields under personalities.
  3. Modified `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx` to pass locks/soul fields during quick-create and apply read-only locks to edit form inputs with visual lock indicators.
  4. Created a DB seeding script `apps/backend/prisma/seed-quick-profiles.js` to pre-populate default agent profiles (including sales-rep-v2-agent) and their default lock profiles.
  - `apps/backend/prisma/seed-quick-profiles.js` [NEW]

### [FIX/IMPROVEMENT] Automatic Default Agent Provisioning & Super Admin UX Hardening
- **Date**: 2026-07-02
- **Description**: Merchants had to manually spawn ready agents from the templates page upon subscription. Also, the Super Admin profiles form lacked input validation for personalities (allowing empty configs), supported incomplete channel options, had manual slug creation, and lacked a clone feature for existing agents.
- **Root Cause**:
  1. Subscription activation controllers (`platformSubscriptionController.js` and `marketplaceController.js`) only spawned a single `support-agent` instance, leaving the rest of the ready agents unprovisioned.
  2. The Super Admin page lacked validation rules on nested personality fields, missed channels (`instagram`, `telegram`, `web`), and had a small/crowded layout container.
- **Resolution**:
  1. Created `spawnReadyAgentsService.js` to read all active ready profiles from database, auto-generate their default configs, and deploy (spawn + configure) them automatically on subscription.
  2. Integrated `spawnAllReadyAgents` helper in subscription activation routes.
  3. Added personality validations in Super Admin form, synced missing channels, enlarged form container to `3xl`, auto-generated slugs from English titles, and implemented a **Clone** button to duplicate profiles.
- **Files Modified/Added**:
  - `apps/backend/services/spawnReadyAgentsService.js` [NEW]
  - `apps/backend/controller/platformSubscriptionController.js`
  - `apps/backend/controller/marketplaceController.js`
  - `apps/frontend/src/pages/super-admin/SuperAdminAgentProfiles.tsx`
