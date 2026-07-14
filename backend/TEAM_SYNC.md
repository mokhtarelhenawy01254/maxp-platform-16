# Team Sync Updates

## 2026-07-14 / 2026-03-09
- **AI Agent Pause Toggle System (FEATURE / COMPLETE)**: Implemented conversation-level toggling to pause/resume AI replies across all channels (WhatsApp, Facebook, Instagram, Telegram):
  1. Updated `conversationCrudController.js` and `unifiedInboxController.js` to support updating `aiEnabled` on specific conversation rows.
  2. Added `aiEnabled !== false` validation checks before triggering agent auto-replies in `WhatsAppInboundService.js`, `WhatsAppManager.js`, `TelegramBotService.js`, and `allFunctions.js`.
  3. Integrated client toggle support in `useConversationActions.ts` hook.
  4. Added premium visual toggle buttons (🤖 icon) in `WhatsAppChat.tsx`, `ChatWindow.tsx`, `TelegramConversationsPro.tsx`, `MessengerChat-final.tsx`, `FacebookInbox.tsx`, `InstagramInbox.tsx`, and `UnifiedInbox.tsx`.
- **WhatsApp Baileys Wrapped Messages Support (BUGFIX / CRITICAL)**: Added support for incoming wrapped messages (such as `viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`, `ephemeralMessage`, and `documentWithCaptionMessage`) by recursively unwrapping them in `extractMessageContent` in `WhatsAppManager.js` before processing, avoiding message loss.
- **WhatsApp Message Handler Mocking (BUGFIX)**: Fixed failing tests in `WhatsAppMessageHandler.sendTextSession.test.js` by adding `getSocketReadyState` to the mocked `WhatsAppManager` to resolve `TypeError: WhatsAppManager.getSocketReadyState is not a function`.
- **WhatsApp Baileys Zombie Session Detection Hardening (BUGFIX / CRITICAL)**: Resolved a critical issue where active, newly authenticated sessions were incorrectly identified as zombie sessions and wiped immediately after opening. Added a check to verify that both `creds.registered` is false AND `sock.user` is not defined before declaring a session as a zombie.

## 2026-07-13 / 2026-03-09
- **Facebook Inbox Space Optimization & Mobile Layout Clutter (FIX)**: Overhauled the layout structure of the Facebook Inbox page to eliminate wasted space on desktop and resolve cluttered displays on mobile viewports:
  1. Made the left conversation list column and right customer details column widths responsive. The conversation list reduces to `256px` and the profile column to `268px` on medium screens, freeing up over 60px of screen width for the chat thread.
  2. Reduced main workspace gap and padding (stage margins) to maximize content container space.
  3. Re-configured notes and profile drawers to occupy `85%` of mobile screens instead of `100%`, keeping the chat viewport visible in the background and making back-navigation more intuitive.
  4. Implemented viewport resize monitoring inside `CustomerProfile.tsx` to automatically transition action buttons (Sound, notifications, order, block) into a compact row on screens < 768px, hiding their labels (`sr-only`) to avoid wrapping and collision.
  5. Cleaned up typescript declared-but-unused compiler errors inside the profile component.
- **WhatsApp Dead Socket & Pre-Send Validation (BUGFIX / CRITICAL)**: Hardened unofficial WhatsApp connection stability and message delivery:
  1. Exported `getSocketReadyState` helper from `WhatsAppManager.js` to enable explicit check of WebSocket state.
  2. Integrated `readyState` verification inside `isSendableBaileysSession()` and `getBaileysSessionReadinessReason()` in `WhatsAppMessageHandler.js` to treat non-open socket connections (CONNECTING, CLOSING, CLOSED) as unsendable.
  3. Standardized session retrieval across all media, interactive buttons, list, and catalog sending actions in `WhatsAppMessageHandler.js` to fetch sessions through `getSendableBaileysSession()` rather than raw cache lookup, ensuring connection checks are performed before every type of outbound call.
  4. Added automatic retry mechanism in `sendText()`: if sending fails due to a dead socket connection, the system force-restarts the WhatsApp session in the background (`forceRestart: true`), waits for reconnect, and retries transmission once.

## 2026-07-12 / 2026-03-09
- **AI Service Self-Review Judge — Conversation History Context Fix (BUGFIX / CRITICAL)**: Fixed a bug where the self-review judge was operating without conversation history. Updated `_llm_call` in `skills_pipeline.py` to persist the assembled messages array (containing DB-backed conversation history and customer message) to `ctx.messages`. This ensures downstream stages (like the self-review judge) can access the full context of prior turns.
- **AI Service Active Polishing & Refinement Layer (FEATURE / COMPLETE)**: Overhauled the self-review judge pipeline in `validate_reply.py` to act as an active editor/polishing layer rather than a strict gatekeeper:
  1. Restructured the review judge prompt and guidelines to explicitly distinguish between harmful factual hallucinations (fake services, prices, doctors, branches) and natural human-like conversational initiative (paying cash, invoice retrieval, friendly greetings, apologies).
  2. Upgraded the judge JSON schema to output `need_polish` and `polished_reply` fields alongside the approved status.
  3. Modified `_self_review` logic to use the `polished_reply` directly when available, bypassing the redundant, slow, and dry fallback correction call to the main model (saving up to 30s of response latency).
  4. Reduced the maximum output retries (`MAX_OUTPUT_RETRIES`) from 2 to 1 to bound latency and prevent timeouts under heavy load.
  5. Enhanced `_correct_output` with persona-preserving instructions and guidelines from `create-premium-human-agent` to ensure fallback replies remain warm, natural, and human-like.
- **AI Service Self-Review Judge — Blind Context Overhaul (BUGFIX / CRITICAL)**: Major rewrite of the LLM-as-Judge self-review system in `validate_reply.py`:
  1. The judge now receives the agent's system prompt (first 2000 chars including persona, soul, and core instructions) via `_extract_agent_identity()`.
  2. The judge now receives the last 5 conversation turns via `_extract_conversation_context()` to understand context.
  3. The judge now receives the agent's template type and channel for tone/style evaluation.
  4. Tool evidence limits increased (500→1500 chars/value, 10→15 keys) to prevent data loss in rich responses.
  5. The review prompt was restructured into a 6-criteria rubric with explicit bias toward approval (reject only on clear factual errors, not style preferences).
- **AI Service Follow-up Request Tool Resolution & Thinking Mode Fix (BUGFIX / CRITICAL)**: Resolved DeepSeek follow-up API validation errors (400 Bad Request) after tool execution:
  1. Updated the follow-up tool definitions builder (`_build_tool_dicts`) in the AI Service pipeline (`skills_pipeline.py`) to resolve and include schemas from `allowed_skills` alongside `allowed_tools`.
  2. Set the follow-up call's default `tool_choice` to `"none"` in `_raw_llm_call`, allowing client.py to omit the `tools` and `tool_choice` parameters entirely for plain text generation. This prevents "Thinking mode does not support this tool_choice" errors when the chat history contains DeepSeek-R1 reasoning content.
- **AI Service Self-Review Context Retention & Guardrail Rule Refinement (BUGFIX / CRITICAL)**: Fixed the self-review/judge pipeline to prevent context loss and over-constraining the agent:
  1. Updated `_correct_output` in `validate_reply.py` to summarize and inject active tool execution results (`evidence_text`) into the correction prompt. This ensures that the rewriting model has full visibility of the database data (like services and prices) and prevents context-free hallucinations.
  2. Corrected the fallback match logic in `get_relevant_rules` (`merchant_rules.py`) to return an empty list `[]` instead of returning the first 5 active rules indiscriminately when there are no semantic or keyword matches. This stops unrelated business rules from polluting the agent's prompt on every single message.
- **AI Agent Self-Review Life Cycle & Model Selector Mismatch (BUGFIX / CRITICAL)**: Resolved a critical database model query mismatch in the AI self-review logs:
  1. Fixed the API `set_review_model` and `validate_reply.py` pipeline stage to query `Agent.id` instead of the non-existent `Agent.agent_id` property, stopping silent SQL failures and enabling proper guardrails checks.
  2. Implemented flexible JSON block parsing via `_try_parse_json_object` in the pipeline validation stage, resolving crashes when the model responds with Markdown-wrapped JSON.
  3. Increased evidence summarization limits to up to 10 keys, 500 characters per value, and 2000 characters for list/raw results, preserving tool execution context.
  4. Updated the Super Admin model selector override interface to dynamically fetch options from the backend `settingsData` object instead of using hardcoded lists.
  5. Corrected the LTR/RTL pagination control chevron arrow direction in the Arabic logs viewer dashboard.
- **WhatsApp Direct Chat AI Correction Bridge (FEATURE / COMPLETE)**: Added AI correction capabilities directly into the direct WhatsApp chat page (`/whatsapp/chat` workspace):
  1. Built a bridge endpoint `POST /api/whatsapp/messages/:whatsappMessageId/correct` that resolves native WhatsApp message ID to unified conversation and message records using proximity matching and customer identification.
  2. Implemented inline correction UI in `MessageBubble.tsx` (the one under `pages/whatsapp/components/` used by the direct WhatsApp workspace) allowing users to correct AI replies, which dynamically triggers learning for the AI agent.
- **AI Correction Button Visibility Fix (BUGFIX / CRITICAL)**: Fixed a 3-layer cascading bug that prevented the "✏️ تصحيح الرد" button from appearing on ANY inbox page (Unified, Facebook, Instagram, WhatsApp):
  1. Backend `sender` field returned `'agent'` instead of `'ai'` for AI-generated messages — frontend condition `sender === 'ai'` never matched.
  2. `agentInboxFacebookService.buildMessagePreview()` omitted `senderId`, `metadata`, and `isAIResponse` fields from serialized messages.
  3. Frontend `useInboxConversations` hook defaulted `senderId` to `"unknown"` (truthy) for AI messages — `!message.senderId` evaluated to `false`.
  4. Added `message.isAIResponse` as a third detection path in `MessageBubble.tsx` for maximum resilience.
- **Multi-Platform AI Correction (`correction_auto` Generalization) (FEATURE / COMPLETE)**: Extended the WhatsApp-only `correction_auto` feature to work across ALL inbox channels (Facebook, Instagram, Telegram, and Unified Inbox):
  1. Generalized `correctMessage()` in `whatsappInboxService.js` with multi-platform delivery: WhatsApp (via `sendText`), Facebook (via `sendProductionFacebookMessage`), Instagram (via Graph API), and Telegram (via `TelegramBotService` / `TelegramUserbotService`).
  2. Agent lookup now matches `conversation.channel` dynamically instead of hardcoded 'whatsapp'.
  3. Added `POST /conversations/:conversationId/messages/:messageId/correct` route in `unifiedInboxRoutes.js` with `conversationAccessGuard` middleware.
  4. Built inline correction UI in `UnifiedInbox.tsx` — AI messages show "🤖 رد تلقائي من الوكيل" badge with "✏️ تصحيح الرد" button.
  5. Built self-contained correction UI in `MessageBubble.tsx` (shared component) — used by both `FacebookInbox.tsx` and `InstagramInbox.tsx` with `onCorrect` callback for message reload.
  6. For non-WhatsApp channels, corrected messages are saved to DB via `prisma.message.create` (WhatsApp auto-saves via webhook).
  7. All channel failures are gracefully degraded: correction is saved even if platform delivery fails.

## 2026-07-11 / 2026-03-09
- **Inbox AI Message Auto-Correction Feature (`correction_auto`) (FEATURE / COMPLETE)**: Implemented a live correction flow in the WhatsApp Inbox enabling supervisors to correct wrong AI responses on-the-fly:
  1. Added `POST /conversations/:conversationId/messages/:messageId/correct` endpoint in Express backend with `conversationAccessGuard` and `inbox.send` permission.
  2. Implemented `correctMessage` service logic that: resolves the customer's preceding question, formats structured feedback, calls the AI Service guardrails API with `source: 'correction_auto'`, sends the corrected text to WhatsApp, and updates conversation state.
  3. Built inline correction UI in `WhatsAppChat.tsx` — AI messages (no `senderId`) show a "تصحيح الرد" button that opens a pre-filled textarea with "حفظ وتصحيح" / "إلغاء" actions.
  4. Guardrail creation is gracefully degraded: if the AI service is unreachable, the correction is still sent to the customer.
  5. Auto-generated rules appear in the "القواعد والتعلم" tab with source tag "تعلم تلقائي" for full auditability.
- **Agent Guardrails Sandbox Removal & Full-Width Layout Refactor (UX / IMPROVEMENT)**: Refactored the "القواعد والتعلم" (Guardrails) tab in Agent Profiles based on admin feedback:
  1. Removed the redundant Sandbox Playground chat area from the tab, deferring all testing activities to the dedicated "تجربة الوكلاء" (Agent Playground) page to reduce UI clutter.
  2. Redesigned the guardrails layout to occupy 100% width, resolving a flexbox layout collapse bug where the rules list shrank to zero width, and giving the manager a spacious table and input forms.
  3. Cleaned up unused state variables, event handlers, and Lucide icons to reduce bundle size and maintain code hygiene.
- **Agent Profiles Settings & Guardrails Layout Fix (BUGFIX / FRONTEND)**: Resolved a critical frontend layout and tag mismatch compilation bug on the Merchant Dashboard:
  1. Fixed JSX nesting where the newly added "القواعد والتعلم" (Guardrails) tab block was erroneously wrapped inside the settings conditional div, preventing it from mounting or rendering when clicked.
  2. Restructured the JSX hierarchy inside `AgentProfilesPage.tsx` to mount the `AgentGuardrailsTab` as a direct sibling of the settings block under the common Fragment.
  3. Balanced all closing `div` and Fragment tags, fixing the Vite production build failure (esbuild JSX tag mismatch and regex syntax error).
  4. Verified layout loading, components structure, and successful API integration with the FastAPI backend through headless browser tests.

## 2026-07-10 / 2026-03-09
- **Merchant Agent Guardrails & Dynamic Learning System (FEATURE / COMPLETE)**: Completed the full end-to-end architecture for merchant-defined conversational guardrails:
  1. Created `AgentGuardrailRule` SQLAlchemy model in `guardrail.py` and registered it in the models package.
  2. Implemented `GuardrailRepository` for CRUD and retrieval operations.
  3. Developed `MerchantRuleGuardrail` for vector-based similarity matching, caching (via Redis), and markdown prompt assembly.
  4. Created `GuardrailTranslator` to auto-translate plain Arabic dialect merchant feedback to structured JSON and detect rule conflicts.
  5. Integrated rule injection into the `ContextAssembler` compilation pipeline and rule validation checks in `validate_reply`.
  6. Created admin REST API router under `apps/ai-service/src/api/admin/guardrails.py` and registered it in the API routes index.
  7. Implemented keyword-based intersection fallback matching in `MerchantRuleGuardrail` when embeddings are unavailable.
  8. Built `AgentGuardrailsTab.tsx` frontend dashboard component with rule CRUD grid, conflict detection dialog, and inline sandbox chat playground.
  9. Integrated the tab into `AgentProfilesPage.tsx` as "القواعد والتعلم" with Lucide Lock icon, passing `agentId`, `companyId`, and model config.
  10. Created unit tests (`test_merchant_rules.py`) for cosine similarity, prompt formatting, and conflict detection — 3/3 passing.
  11. Lowered the default similarity threshold to `0.65` inside `MerchantRuleGuardrail` to ensure robust matching against Egyptian dialect messages on production.
  12. Fixed database commit rollback bug by adding `await session.commit()` in the guardrail REST API routes.
  13. Fixed compiled system prompt logging by re-assigning the fully assembled system prompt (`enriched_prompt`) back to the `PipelineContext.system_prompt` field in `skills_pipeline.py`.
  14. Removed the redundant `/admin` prefix from guardrail routes in `apps/ai-service/src/api/admin/guardrails.py` to fix 404 API errors under the FastAPI `/admin` router.
  15. Modified `aiAdminProxyRoute.js` to allow merchant users (`OWNER` / `COMPANY_ADMIN` company roles) to access the AI proxy, resolving the 403 Forbidden permission error on the "القواعد والتعلم" (Guardrails) tab.

- **Conditional Landmark Image Auto-Population in AI Pipeline (FIX / IMPROVEMENT)**: Fixed a bug where branch landmark images were unconditionally sent to the user as WhatsApp/Facebook attachments every time the `booking_info` tool was executed (e.g., when the user just greeted the bot or asked for working hours):
  1. Updated `skills_pipeline.py` to check if the image URL/path or its filename is explicitly present in the final reply text (`ctx.final_reply`) before populating `ctx.response_attachments`.
  2. Added unit tests `test_landmark_image_auto_populate_conditional_negative` and `test_landmark_image_auto_populate_conditional_positive` inside `test_skills_pipeline.py` to verify this behavior.
  3. Deployed the fix to the production server (`maxp-ai-service`) and verified successful operation.
- **WhatsApp Baileys Stability & Reconnection Overhaul (IMPROVEMENT / STABILITY)**: Hardened the unofficial WhatsApp integration (`@whiskeysockets/baileys`) against connection drops, pairing failures, and rate limits:
  1. Upgraded `@whiskeysockets/baileys` package version to `6.7.23` (latest stable 6.x release) and updated the hardcoded fallback version to `[6, 7, 23]`.
  2. Fixed a critical session wipe bug in `isValidAuthState` validator where the credentials cache was completely deleted from the database if the session was reloaded during the pairing phase (`QR_PENDING` / `CONNECTING`). The validator now preserves the initial keys.
  3. Refactored disconnect recovery logic in `getDisconnectRecoveryDecision` to treat `403` (Forbidden/Rate Limit) and `Bad MAC` (Decryption failure) disconnects as transient errors instead of terminal logouts, preventing destructive session wipes.
  4. Added undefined check guards for `statusCode` in `getDisconnectRecoveryDecision` to prevent false positive logouts when both `statusCode` and `DisconnectReason` are undefined.
  5. Overhauled `scheduleReconnectSession` to retry indefinitely with an exponential backoff capped at 5 minutes (300,000 ms), preventing connections from giving up completely after 5 attempts.
- **Appointments Management UI/UX & Visual Slot Picker (UI/UX / IMPROVEMENT)**: Refactored the appointments page (`/admin/booking/appointments`) and the booking modal to resolve space utilization and usability issues:
  1. Replaced browser-native blocking `window.confirm` alerts for status transitions (confirming, cancelling, completing bookings) with clean, non-blocking toast notifications (via `toast` from `sonner`) featuring a **تراجع (Undo)** action for immediate and frictionless state recovery.
  2. Redesigned the available slots selector in `AppointmentModal.tsx` to display as an interactive grid of buttons grouped side-by-side, replacing the primitive HTML select dropdown. Styled unavailable slots with line-throughs and muted backgrounds, and styled selected slots with high-contrast active backgrounds.
  3. Cleaned up the table filters header in `AppointmentsTab.tsx` by wrapping secondary status and date filters into a collapsible advanced filters drawer. The drawer is toggled by a brand button showing the number of active filters.
  4. Moved the Branch filter dropdown from the collapsible advanced panel to the top filters row next to "تصفية متقدمة", making it always visible for quick access with a clean, compact appearance.
  5. Restored vertical scrolling on the booking management page by adding `h-full overflow-y-auto` to the outer container in `BookingManagementPage.tsx`, fixing viewport clipping caused by the parent layout shell's `overflow-hidden` on the `<main>` wrapper.
  6. Removed redundant top page header ("إدارة النظام الطبي / نظام إدارة المواعيد والخدمات الطبية") and page-level tabs list from `BookingManagementPage.tsx`, as they duplicated the primary sidebar navigation.
- **Branches Management UI/UX & Modal Usability Overhaul (UI/UX / FEATURE)**: Redesigned the branches tab (`/admin/booking/branches`) and the branch form modal to align with 2026 UI aesthetics and address several functional constraints:
  1. Resolved viewport clipping on mobile/small displays by implementing a scroll container with a max height limit (`max-h-[90vh] overflow-y-auto`) and a `backdrop-blur-sm` overlay for the modal backdrop container.
  2. Upgraded the file upload field from a standard browser file input to a custom, modern Arabic-first card (with clear visual hints, a clickable choose button, and size limits verification).
  3. Formatted working days in desktop and mobile views from a verbose plain text column to compact, interactive circular day badges (`س`, `ح`, `ن`, `ث`, `ر`, `خ`, `ج`) with dynamic hover tooltips.
  4. Parsed location field URLs to display inline `📍 فتح الخريطة` buttons opening in a new browser tab.
  5. Resolved strict TypeScript compilation errors across `shared.ts`, `BranchModal.tsx`, `BranchesTab.tsx`, and `BookingManagementPage.tsx`.

## 2026-07-09 / 2026-03-09
- **Company Dashboard Welcome State Removal (UI/UX)**: Removed the `DashboardWelcomeState` component and its import/rendering rules from the main dashboard (`MainDashboardPage.tsx`) so that the core dashboard metrics and charts are always visible to new users or companies without the ecommerce application active. Deleted the unused `DashboardWelcomeState.tsx` file.
- **AI Image Generator Interface Redesign & 2026 Style Overhaul (UI/UX / FEATURE)**: Refactored the AI Image Generator page (`/admin/ai-image-generator`) layout to adopt a borderless 12-column split-canvas design. Removed the heavy header banner (`SettingsPageHero`) and the outer wrapper (`SettingsPageShell`) to let the workspace flow freely on the background canvas. Replaced all nested card wrappers ("box-in-a-box" style) by placing core inputs flat on the layout grid and converting `CollapsibleSection` components into borderless macOS-style settings accordions separated by thin dividers (`border-b border-slate-100`). Restructured quick presets into a simple borderless row of clean chips, and upgraded the preview panel and prompt control deck into floating glassmorphic panes (`backdrop-blur-md bg-white/70`) with soft, layered ambient shadows. Activated the dormant `AspectPreview` mockup visualizer, removed the redundant client-side model selector dropdown and associated state/constants, and cleaned up the allowedModels API sync to rely completely on backend template model config policies.
- **WhatsApp Workspace UI/UX Overhaul & Edge-to-Edge Desktop Layout (IMPROVEMENT)**: Overhauled the WhatsApp workspace interface for a premium, distraction-free desktop/laptop experience. Merged the sidebar header into a single horizontal bar (height `h-14`) and removed the workspace title and descriptions. Placed the session selector in a clean sub-bar below the header. Added support for edge-to-edge full viewport presentation (removing all margins and paddings around the panel relative to the app-shell sidebar and global header) by updating `Layout.tsx` (`shouldRemovePadding`) and making the outer container in `WhatsAppChat.tsx` borderless and shadowless. Changed the chat background in light mode to pure white (`#ffffff`), and modified the light-mode incoming message bubble color to light grey (`#f0f2f5`) to maintain contrast.
- **AI Agent Model Override Precedence (FIX)**: Fixed a bug where custom model configurations for specific company agents were ignored in favor of the template's default model policy. Flipped the resolution order in `agent_registry.py` to check `db_agent.model` first before falling back to `template.model_policy.get("default")`. Added corresponding unit tests in `test_model_resolution.py`.
- **Ollama Gemma4 Model Routing (FIX)**: Fixed `is_gemma_model()` in `gemma_chat_template.py` incorrectly routing Ollama-style Gemma models (e.g. `gemma4:31b-cloud`) to Google's Generative Language API instead of the Ollama provider. Added a `:` guard to exclude Ollama tag-format model names.

## 2026-07-08 / 2026-03-09
- **WhatsApp Voice Note Truncated to 1-Second / Silent Message (FIX)**: Fixed a critical bug where recorded WhatsApp voice notes were sent as empty/silent 1-second messages.
  1. **Frontend Stream Lifecycle Fix**: In `useAudioRecorder.ts`, moved track stopping logic from `stopRecording` into `onstop` and `onerror` handlers, preventing stream termination before the MediaRecorder completes encoding.
  2. **Backend FFmpeg Timing Restoration**: In `WhatsAppMediaHandler.js`, added `-fflags +genpts` before `-i` in the FFmpeg Ogg conversion command to force regeneration of presentation timestamps for WebM files (which lack duration headers).
  3. **Payload Size & Duration Validations**: Added validation to block empty/small uploads (<500 bytes) on both frontend and backend, and disabled the frontend send button if the recording duration is under 1 second (`recordingTime < 1`).

## 2026-07-07 / 2026-03-09
- **reportWebVitals Adblocker Crash Loop Fix (FIX)**: Fixed an infinite refresh/redirect loop (`?__maxp_cache_recovery=...`) affecting public storefronts (like `swan.maxp.online`) for users using adblockers (Safari content blockers, uBlock Origin, etc.). Removed the dynamic import of `reportWebVitals` from `apps/frontend/src/main.tsx` which was blocked by adblockers and triggered a critical chunk load error. The dynamic import was safe to remove as the reporting code was commented out in production anyway.

## 2026-07-05 / 2026-03-09
- **WhatsApp Voice Note 500 Fix — ffmpeg-static + Mimetype Normalization (FIX)**: Fixed production 500 error on `/whatsapp/messages/upload-send` for voice notes. Added `ffmpeg-static` dependency and injected its binary into `process.env.PATH` at startup. Normalized raw mimetypes (stripping `;codecs=opus`) in both `uploadMedia` and `sendAudio`. Improved route error handling with `error.message` forwarding, param validation, and temp file cleanup.
- **Merchant Agent Management & Creation Interface Simplification (UI/UX)**: Simplified the merchant's `AgentProfilesPage.tsx` interface to hide complex/system configurations (such as persona, goals, tasks, boundaries, welcome messages, escalation options, and language). The merchant now views and edits only **3 essential items**: **Agent Name**, **Tone / Way of Replying**, and **Additional Instructions**. Additionally, streamlined the agent creation wizard from a multi-step flow down to a **single step** (Template + Name + Icon Picker), with all other prompt instructions dynamically driven by the templates and fully preserved inside the `SOUL.md` database records during edits.
- **AI Agent Templates Unification (REFACTOR)**: Decommissioned the redundant ready-profiles and constraints/locks systems to treat AI templates (`AgentTemplate`) as the primary agent definition. Removed `SuperAdminAgentProfiles` navigation, routes, and components. Deleted `spawnReadyAgentsService.js` and legacy seeding scripts. Refactored the merchant's `AgentProfilesPage.tsx` to directly select and configure from AI templates, saving overriding records in the `agents` table mapped to `AgentTemplate` slugs.
- **GramJS Unhandled Rejection Alert Loop (FIX)**: Fixed an infinite feedback loop where GramJS `resolve() called for non-request instance` unhandled rejections triggered Telegram alerts, which in turn created new Telegram updates that re-triggered the same error. This flooded the server error logs (~1MB in `err-1.log`), rate-limited the alerting channel (`A wait of 237 seconds is required`), and consumed CPU. Added `isGramJsResolveError` classifier in `recoverableUnhandledRejection.js` and updated both `unhandledRejection` handlers in `server.js` to silently log and skip alerting for this internal GramJS parsing bug. Added regression tests.
- **WhatsApp upload-send Mimetype Expansion (FIX)**: Expanded the Multer `MIME_TYPE_MAP` whitelist and `WhatsAppMediaHandler` supported types to cover additional audio formats (`audio/wav`, `audio/x-wav`, `audio/wave`, `audio/x-pn-wav`, `audio/x-m4a`, `audio/aac`, `audio/x-aac`), archive formats (`application/zip`, `application/x-zip-compressed`, `application/rar`, `application/x-rar-compressed`), generic binary (`application/octet-stream`), and additional images (`image/svg+xml`, `image/bmp`). Added detailed `console.error` logging in the Multer `fileFilter` for rejected file uploads to facilitate future debugging.
- **WhatsApp Voice Note Mimetype Parameters Normalization (FIX)**: Fixed a bug where voice notes failed to send with an unsupported mimetype error (`Error: نوع الملف غير مدعوم`) on some browsers due to codecs parameters (e.g., `audio/webm;codecs=opus`):
  1. Updated `apps/backend/routes/whatsappRoutes.js` (Multer filename & fileFilter) to split and clean incoming mimetypes by stripping parameters before validation.
  2. Updated `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` (`getMediaTypeFromMimetype`, `getExtension`, and `validateFile`) to strip codecs parameters, ensuring correct matching of file types and extensions (saving as `.webm` instead of `.bin`).
- **Prisma Schema P1012 Fix (FIX)**: Fixed CI/CD deployment failure caused by missing reverse relation fields on the `Company` model for `EducationTeacherAvailability` and `EducationTeacherPayment`. Added both `[]` array fields to `core.prisma`. Validated with `npx prisma validate`.
- **WhatsApp Voice Note Send Fix (FIX)**: Fixed a bug where recording and sending a voice message in WhatsApp chat failed with "فشل إرسال الرسالة الصوتية":
  1. Updated `apps/backend/routes/whatsappRoutes.js` and `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` to support `audio/webm` and `video/webm` mimetypes, preventing Multer from rejecting uploaded voice messages.
  2. Configured `.webm` extensions in `WhatsAppMediaHandler.js` for webm audio/video types so they save cleanly without using the `.bin` fallback.
  3. Added explicit `ptt: 'true'` parameter to `FormData` on the frontend (`WhatsAppChat.tsx`) and extracted it on the backend, falling back to checking if the original name is `'voice_note.webm'`.
  4. Passed `{ ptt: isVoiceNote }` to `WhatsAppMessageHandler.sendAudio` in the router so recorded voice notes are delivered to WhatsApp as native voice messages (Push-To-Talk) instead of regular audio attachment files.

## 2026-07-04 / 2026-03-09
- **WhatsApp Meta Template Creation 400 Error Fix (FIX)**: Fixed a critical bug where template creation requests to Meta Cloud API returned a 400 bad request error:
  1. Updated `apps/backend/controller/whatsappMetaTemplateController.js` to forward Meta's detailed error responses (with parameters like `error_user_title`/`error_user_msg`) and correct status codes back to the frontend instead of swallowing them under a generic 500 status.
  2. Implemented name input sanitization helper on the frontend (`WhatsAppMetaTemplates.tsx`) to auto-format templates to Meta's strict conventions (lowercase, underscores, no special characters/spaces).
  3. Added frontend validation and warning prompts for numbered variable structures (`{{1}}` vs named parameters like `{{name}}`) and dynamic button link protocols (`https://`).
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
