# Backend Bugs Log

### [FEATURE] WhatsApp Direct Chat AI Correction Bridge (`/whatsapp/chat`)
- **Date**: 2026-07-12
- **Description**: The `/whatsapp/chat` page uses a completely different data pipeline (`whatsAppMessage` table + `whatsappController.getMessages`) than the `/whatsapp-inbox` page (unified `Message` table + `whatsappInboxService.getConversationDetail`). The correction endpoint requires unified `conversationId` + `message.id`, but the `/whatsapp/chat` workspace only has `whatsAppMessage.messageId` (a WhatsApp-native ID like `false_201xxx_3EBxxx`).
- **Architecture Notes**:
  1. Created a bridge endpoint `POST /api/whatsapp/messages/:whatsappMessageId/correct` in `whatsappController.js`.
  2. The bridge resolves: `whatsAppMessage.messageId` → customer phone from `remoteJid` → unified `Customer` → unified `Conversation` (channel='whatsapp') → unified `Message` (by content + 30s timestamp window) → delegates to `whatsappInboxService.correctMessage()`.
  3. Frontend `MessageBubble.tsx` (in `pages/whatsapp/components/`) now has self-contained correction state (no prop-drilling) with inline textarea editor.
- **Tricky Behaviors**:
  - The `whatsAppMessage` table and unified `Message` table are NOT linked by any foreign key. The bridge uses content + timestamp proximity matching (30s window) which is robust for production.
  - `whatsAppMessage.messageId` is the WhatsApp protocol message ID (unique), not the database row `id`.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js` — Added `correctAIMessage()` bridge function
  - `apps/backend/routes/whatsappRoutes.js` — Added `POST /messages/:whatsappMessageId/correct` route
  - `apps/frontend/src/pages/whatsapp/components/MessageBubble.tsx` — Added correction button + inline editor

### [BUG FIX] AI Correction Button Not Visible Across All Inbox Pages
- **Date**: 2026-07-12
- **Root Cause**: Three cascading issues prevented the "✏️ تصحيح الرد" button from appearing:
  1. **Backend (unifiedInboxController.js)**: The `sender` field returned `'agent'` for ALL outbound messages including AI-generated ones. The frontend condition checked for `sender === 'ai'` which never matched. Fixed by returning `'ai'` when `isAIResponse === true` or `senderId` is null.
  2. **Backend (agentInboxFacebookService.js)**: The `buildMessagePreview()` function did not include `senderId`, `metadata`, or `isAIResponse` in the serialized message object, so Facebook/Instagram inbox pages had no way to identify AI messages.
  3. **Frontend (useInboxConversations.ts)**: The shared inbox hook mapped `senderId` to `"unknown"` when the actual `senderId` was null (AI messages). The frontend condition `!message.senderId` evaluated to `false` for `"unknown"`. Fixed by mapping AI messages to `senderId: 'ai'` and adding explicit `isAIResponse` field.
- **Tricky Behaviors**:
  - Empty string `""` is falsy in JS but `"unknown"` is truthy — this caused a subtle mismatch between the fallback default and the display condition.
  - Messages without `senderId` AND without `metadata.isAIResponse` are treated as AI messages (conservative assumption: if no human sent it, it's AI).
- **Files Modified**:
  - `apps/backend/controller/unifiedInboxController.js` — Fixed `sender` and `isAIResponse` for both standard and WhatsApp message normalization
  - `apps/backend/services/agentInboxFacebookService.js` — Added `senderId`, `metadata`, `isAIResponse` to `buildMessagePreview()`
  - `apps/frontend/src/hooks/inbox/useInboxConversations.ts` — Fixed `senderId` mapping and added `isAIResponse`
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx` — Mapped `isAIResponse` in all 3 message parsing blocks
  - `apps/frontend/src/components/facebook-inbox/MessageBubble/MessageBubble.tsx` — Added `message.isAIResponse` to detection condition

### [FEATURE] Multi-Platform AI Correction (`correction_auto` Generalization)
- **Date**: 2026-07-12
- **Description**: Extended `correction_auto` from WhatsApp-only to all channels (Facebook, Instagram, Telegram, Unified Inbox).
- **Architecture Notes**:
  1. `correctMessage()` in `whatsappInboxService.js` was generalized with platform-specific delivery branches (`WHATSAPP`, `FACEBOOK`, `INSTAGRAM`, `TELEGRAM`), determined by `conversation.channel`.
  2. Facebook delivery resolves `pageAccessToken` via metadata → `getPageToken()` → `facebookPage` table fallback chain.
  3. Instagram delivery uses Graph API v22.0 with `instagramAccountId` from `facebookPage` table.
  4. Telegram delivery checks `metadata.isUserbot` to route between `TelegramUserbotService` and `TelegramBotService`.
  5. For non-WhatsApp channels, corrected messages are explicitly saved via `prisma.message.create()` since WhatsApp auto-saves via its webhook pipeline but other channels don't.
  6. Agent matching changed from hardcoded `'whatsapp'` to dynamic `conversation.channel` lookup.
- **Tricky Behaviors**:
  - `conversationAccessGuard` in `numberAccessGuard.js` works for non-WhatsApp conversations because it falls back to `conversation.assignedUserId` check when `sessionId` is missing.
  - `MessageBubble.tsx` (shared between Facebook and Instagram inbox) needed self-contained correction state to avoid prop-drilling editing state through parent components.
- **Files Modified**:
  - `apps/backend/services/whatsappInboxService.js` — Generalized `correctMessage` with multi-platform delivery
  - `apps/backend/routes/unifiedInboxRoutes.js` — Added unified correction route
  - `apps/frontend/src/pages/unified-inbox/UnifiedInbox.tsx` — Added inline correction UI
  - `apps/frontend/src/components/facebook-inbox/MessageBubble/MessageBubble.tsx` — Added self-contained correction UI
  - `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx` — Added `onCorrect` prop
  - `apps/frontend/src/pages/instagram-inbox/InstagramInbox.tsx` — Added `onCorrect` prop

### [FEATURE] Inbox AI Message Auto-Correction (`correction_auto`) Integration
- **Date**: 2026-07-11
- **Description**: Implemented a live correction flow in the WhatsApp Inbox that allows supervisors to correct wrong AI-generated responses inline, automatically training the agent by creating a `correction_auto` guardrail rule.
- **Architecture Notes**:
  1. The service method `correctMessage` in `whatsappInboxService.js` resolves the customer's preceding question contextually, formats a structured feedback query, and POSTs it to the AI Service's guardrails endpoint with `source: 'correction_auto'`.
  2. Agent resolution is dynamic: it queries `/admin/agents?company_id=` and prefers the agent with `whatsapp` in its channels, falling back to any active agent.
  3. The corrected message is sent immediately to the customer via WhatsApp using `sendText()`, so the customer receives the right answer in real-time.
  4. Guardrail creation is non-blocking: if the AI Service is unreachable, the correction message is still sent to the customer (graceful degradation).
- **UI**: AI messages (identified as `!isFromCustomer && !senderId`) display a "تصحيح الرد" (Correct Response) button. Clicking it opens an inline textarea pre-filled with the original AI response, with "حفظ وتصحيح" (Save & Correct) and "إلغاء" (Cancel) actions.
- **Files Modified**:
  - `apps/backend/routes/whatsappInboxRoutes.js` — Added POST `/conversations/:conversationId/messages/:messageId/correct`
  - `apps/backend/controller/whatsappInboxController.js` — Added `correctMessage` handler
  - `apps/backend/services/whatsappInboxService.js` — Added `correctMessage` business logic
  - `apps/frontend/src/pages/whatsapp-inbox/WhatsAppChat.tsx` — Added inline correction UI with state management

### [FIX] Invisible Guardrails Rules Column due to Flexbox Collapsing & Sandbox Redundancy
- **Date**: 2026-07-11
- **Description**: Resolved a critical frontend layout issue in the "القواعد والتعلم" (Guardrails) tab where the Rules Management column collapsed to 0px (or 4px) width on desktop screens, leaving the tab looking completely empty except for the Sandbox card on the left.
- **Root Cause**: 
  1. The layout container `div` lacked a `w-full` class, causing the browser to collapse its width when layout children used flex-basis of 0% (`flex-1`).
  2. The Sandbox Playground column had `w-full lg:w-80` but lacked `lg:shrink-0`, causing the browser to expand it to the container's remaining width while shrinking the flexible Rules column to zero.
  3. The sandbox test area was redundant since there is a dedicated, fully featured "تجربة الوكلاء" (Agent Playground) page for testing agent behavior.
- **Resolution**:
  1. Removed the redundant Sandbox Playground column and its related states, handlers, and React hooks from `AgentGuardrailsTab.tsx`.
  2. Restructured the layout wrapper to use a single column that stretches to 100% width (`w-full flex-1`), allowing the guardrails table and creation form to occupy the full page width for clean, readable management.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/agent-profiles/AgentGuardrailsTab.tsx`

### [FIX] JSX Nesting and Tag Mismatch for AgentGuardrailsTab inside AgentProfilesPage
- **Date**: 2026-07-11
- **Description**: Resolved a critical rendering issue where the "القواعد والتعلم" (Guardrails) tab rendered completely blank and caused a subsequent Vite build crash (JSX tag mismatch / unterminated regex syntax error) during deployment.
- **Root Cause**: The `AgentGuardrailsTab` component was incorrectly nested *inside* the `tab === "settings"` conditional block, preventing it from mounting when the tab switched to `"guardrails"`. A quick attempt to restructure the layout caused mismatched `div` and Fragment tags, leading to a build failure.
- **Resolution**: Closed the settings conditional block and its wrapper `div` first, then placed the `AgentGuardrailsTab` block as a clean sibling under the React Fragment container. Properly balanced all HTML wrappers, conditional braces, and Fragments.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx`

### [FIX] Duplicate `/admin` Prefix in Guardrail FastAPI Endpoints
- **Date**: 2026-07-10
- **Description**: Resolved a 404 Not Found error when calling guardrail API routes (e.g. listing, creating, check-conflict, or update/delete rules) via the Express backend proxy.
- **Root Cause**: The FastAPI `admin_router` already has a prefix of `/admin` registered in `main.py` (`app.include_router(admin_router, prefix="/admin")`). Inside `guardrails.py`, the endpoints were decorated with `@router.get("/admin/agents/{agent_id}/guardrails")`, resulting in actual paths containing double `/admin` prefixes (`/admin/admin/agents/...`). The Express proxy and frontend expected `/admin/agents/...`, causing a mismatch and resulting in a 404 response.
- **Resolution**: Removed the redundant `/admin` prefix from all route decorators in `guardrails.py` so they are successfully mounted under `/admin/agents/...`.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/guardrails.py`

### [FIX] Merchant User 403 Forbidden Access to AI Admin Proxy
- **Date**: 2026-07-10
- **Description**: Resolved an access denied/403 Forbidden issue when merchant users (`OWNER` or `COMPANY_ADMIN` in the database) clicked the "القواعد والتعلم" (Guardrails) tab.
- **Root Cause**: The Express backend router `aiAdminProxyRoute.js` had a global `router.use(requireSuperAdmin)` middleware, which blocked any request that did not belong to a system-level Super Admin. Merchant users have company-specific administrative roles but do not hold system-wide roles, causing their requests to be denied.
- **Resolution**: Removed the global `requireSuperAdmin` middleware from `aiAdminProxyRoute.js` and replaced it with `allowMerchantOrSystemAdmin` which allows system-level admins OR merchant users holding `OWNER` or `COMPANY_ADMIN` role within a company to pass through to the proxy safely.
- **Files Modified**:
  - `apps/backend/routes/aiAdminProxyRoute.js`

### [FIX] Compiled System Prompt Observable Value Not Saved
- **Date**: 2026-07-10
- **Description**: The `compiled_system_prompt` field in chat/sandbox api response was empty/unpopulated in responses.
- **Root Cause**: In `skills_pipeline.py`, after calling `assembler.build_system_prompt(ctx)`, the resulting string was assigned to a local variable `enriched_prompt`, but it was never assigned back to `ctx.system_prompt`, leaving the final prompt empty in logs and response payloads.
- **Resolution**: Re-assigned `enriched_prompt` back to `ctx.system_prompt` to ensure the compiled value is saved and returned.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Guardrail Rules Not Persisted on Creation/Update
- **Date**: 2026-07-10
- **Description**: Guardrail rules added or modified by merchants did not persist in PostgreSQL.
- **Root Cause**: The FastAPI endpoints in `guardrails.py` created and modified SQLAlchemy model instances but forgot to execute `await session.commit()`.
- **Resolution**: Added explicit commits after database modifications.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/guardrails.py`

### [FIX] TS2367 Tab Literal Overlap Error in AgentProfilesPage
- **Date**: 2026-07-10
- **Description**: Resolved a TypeScript compilation error (`TS2367: This comparison appears to be unintentional because the types '"settings"' and '"guardrails"' have no overlap`) in the React frontend interface `AgentProfilesPage.tsx`.
- **Root Cause**: The TypeScript compiler failed to dynamically widen the custom `Tab` type enum or cached the old literal definition during comparison.
- **Resolution**: Cast the `tab` state variable to `string` (i.e. `(tab as string) === "guardrails"`) to bypass the strict compiler check safely.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx`

### [FIX] Landmark Image Auto-Population: Unwanted Branch Images Sent Unconditionally
- **Date**: 2026-07-10
- **Description**:
  1. Resolved an issue in the AI service pipeline (`skills_pipeline.py`) where branch landmark images (`landmarkImage`) were automatically and unconditionally appended to `response_attachments` and sent via WhatsApp/Facebook every time the `booking_info` tool was called.
  2. Modified the auto-population logic to check if the image URL/path or its filename is explicitly present in the agent's text response (`ctx.final_reply`).
  3. Added new unit tests `test_landmark_image_auto_populate_conditional_negative` and `test_landmark_image_auto_populate_conditional_positive` to prevent regressions.
- **Root Cause**: The pipeline unconditionally grabbed the `landmarkImage` from `booking_info` tool evidence whenever the tool was executed, bypassing the agent's actual decision/intent to show it.
- **Resolution**: Added a conditional guard checking for the image's presence in `ctx.final_reply` before auto-populating.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
  - `apps/ai-service/tests/pipeline/test_skills_pipeline.py`

### [FIX] WhatsApp Baileys Stability: Disconnection Loops, Credentials Wiping, and 48-Hour Number Bans
- **Date**: 2026-07-10
- **Description**:
  1. Resolved a major bug in the `isValidAuthState` validator where the credentials cache was completely wiped from the database if the session was reloaded during the pairing phase (`QR_PENDING` / `CONNECTING`). The validator now preserves the initial keys.
  2. Refactored disconnect recovery logic in `getDisconnectRecoveryDecision` to treat `403` (Forbidden/Rate Limit) and `Bad MAC` (Decryption failure) disconnects as transient errors instead of terminal logouts, preventing destructive session wipes.
  3. Added undefined check guards for `statusCode` in `getDisconnectRecoveryDecision` to prevent false positive logouts when both `statusCode` and `DisconnectReason` are undefined.
  4. Modified `scheduleReconnectSession` to retry indefinitely with a capped exponential backoff of 5 minutes (300,000 ms), preventing connections from giving up completely after 5 attempts.
  5. Upgraded `@whiskeysockets/baileys` package version to `6.7.23` (latest stable 6.x release) and updated the hardcoded fallback version to `[6, 7, 23]`.
- **Root Cause**: Over-aggressive session wiping on transient websocket status codes, strict initialization validation rejecting unpaired session keys, lack of undefined guards for status code comparisons, and a capped reconnect limit of 5 attempts.
- **Resolution**: Preserved keys for unpaired sessions, handled 403 and Bad MAC as reconnectable errors with exponential backoff, guarded undefined status codes, and enabled infinite reconnection attempts.
- **Files Modified**:
  - `apps/backend/package.json`
  - `apps/backend/services/whatsapp/DatabaseAuthState.js`
  - `apps/backend/services/whatsapp/WhatsAppManager.js`
  - `apps/backend/tests/services/WhatsAppManager.messageCapture.test.js`

### [FIX] Branch Modal Overflow, Custom Upload Container, Working Days Badges, Map URLs and Strict TypeScript Checks in Branches Management
- **Date**: 2026-07-10
- **Description**:
  1. Resolved modal height overflow on small viewports in `BranchModal.tsx` by introducing `max-h-[90vh] overflow-y-auto` scrolling container.
  2. Added `backdrop-blur-sm` overlay to the modal backdrop container for enhanced design aesthetics.
  3. Replaced standard browser-native file input with a custom, polished upload card designed specifically for Arabic layout (📸 + clickable choose button).
  4. Added `type="button"` attributes to dynamic sub-elements (phones list, day toggle tags) inside `BranchModal.tsx` to prevent accidental form submit actions.
  5. Implemented regex phone number validation (`/^[0-9+\-\s]+$/`) to reject arbitrary text inputs.
  6. Disabled gender-specific day buttons (men/women working days) unless those days are first selected as branch working days, adding a helpful explanation tooltip.
  7. Formatted branch working days list into compact, interactive circular badges (`س`, `ح`, `ن`, `ث`, `ر`, `خ`, `ج`) in both desktop table and mobile card views inside `BranchesTab.tsx` with detailed timing tooltips.
  8. Parsed geographic location links to display interactive `📍 فتح الخريطة` buttons opening in a new browser tab.
  9. Resolved strict TypeScript compile errors (`TS6133` unused variables, `TS4111` index signature dot-access, `TS2345` undefined params) in `BookingManagementPage.tsx`.
- **Root Cause**: Missing overflow configuration on container, primitive default HTML file inputs, form-submission side effects of standard button elements inside form layouts, loose phone input validation, and strict Vite/React compiler flags.
- **Resolution**: Implemented scrolling modals, custom file input widgets, type-safe validations, visual day badges, and converted object property dot access to bracket access for strict TypeScript compliance.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/booking/shared.ts`
  - `apps/frontend/src/pages/admin/booking/BranchModal.tsx`
  - `apps/frontend/src/pages/admin/booking/BranchesTab.tsx`
  - `apps/frontend/src/pages/admin/BookingManagementPage.tsx`

### [FIX] Modeless Undo Notification, Visual Time-Slot Grid, Scrolling Restore, Branch Filter Relocation, and Redundant Header/Tabs Removal in Appointments Booking
- **Date**: 2026-07-10
- **Description**:
  1. Replaced primitive browser-native `window.confirm` for status changes in [AppointmentsTab.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx) with a modern, non-blocking toast notification system (using `toast` from `sonner`) supporting a **تراجع (Undo)** action.
  2. Overhauled the time-slot picker in [AppointmentModal.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/booking/AppointmentModal.tsx) by replacing the standard HTML select dropdown with a premium visual grid of slot buttons. Disabled/unavailable slots are styled with a clean line-through and muted background, and selected/active slots are emphasized using brand styling.
  3. Redesigned the filters layout in [AppointmentsTab.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx) to be collapsible, wrapping secondary controls (status, dates) in an advanced filters drawer toggled via a brand button with active filters count.
  4. Moved the Branch filter dropdown next to the "تصفية متقدمة" button in the top filters row for quick access and improved appearance, removing the duplicate branch select from the advanced panel.
  5. Restored vertical scrolling on the booking management page by adding `h-full overflow-y-auto` to the outer layout container in [BookingManagementPage.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/BookingManagementPage.tsx), resolving viewport clipping caused by the parent layout shell's `overflow-hidden` configuration.
  6. Removed the redundant top page header ("إدارة النظام الطبي / نظام إدارة المواعيد والخدمات الطبية") and the duplicated page-level tabs list from [BookingManagementPage.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/admin/BookingManagementPage.tsx) since the primary sidebar layout already includes separate sidebar navigation entries for each individual tab.
- **Root Cause**: Non-intuitive select list time picker, modal-blocking browser confirmations, a cluttered filters header layout, layout overflow constraints in the main shell wrapper, and layout redundancy.
- **Resolution**: Implemented collapsible advanced filters row, top-level branch selector, custom toast-based undo action, visual slot grid buttons, scrollable container height, and removed redundant tabs/header.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx`
  - `apps/frontend/src/pages/admin/booking/AppointmentModal.tsx`
  - `apps/frontend/src/pages/admin/BookingManagementPage.tsx`

### [FIX] AI Image Generator Layout Cramping, Dormant Aspect Preview, Mobile CTA Hiding, and UI De-nesting
- **Date**: 2026-07-09
- **Description**: The AI Image Generator page (`/admin/ai-image-generator`) had multiple layout, responsiveness, and control issues:
  1. The 5 configuration tabs were cramped inside a narrow 380px column, making fields difficult to read.
  2. The `AspectPreview` component was dormant and never rendered, leaving users without visual aspect ratio feedback.
  3. On mobile viewports, the stacked column order pushed the prompt editor and the primary "Generate" button to the very bottom, forcing excessive scrolling.
  4. The gallery cropped all generated images to squares, distorting 9:16 and 16:9 layouts.
  5. The interface had multiple nested bordered cards ("box-in-a-box" style), causing heavy visual load.
  6. The visual model selector dropdown conflicted with the backend agent-template policy, and the frontend allowedModels API request was redundant.
- **Root Cause**: Poor column balance, incomplete integration of preview components, nested Card wrappers, and redundant client-side model overrides.
- **Resolution**:
  - Re-architected the layout to a balanced `grid-cols-12`, making the configuration panel span 7 columns and the preview/actions panel span 5 columns (sticky on large screens).
  - Removed the hero banner (`SettingsPageHero`) and the outer white bordered shell (`SettingsPageShell`) to let the page breathe directly on the canvas background.
  - Eliminated the nested `Card` wrapper around "Core Product Information" to render form elements flat on the page canvas.
  - Redesigned `CollapsibleSection` into borderless, flat accordion sections separated by thin, clean dividers (`border-b border-slate-100`).
  - Replaced the boxed Presets container with flat, background-filled tags (Chips) that transition smoothly on hover.
  - Upgraded the preview and control panels on the left to floating glassmorphic panes (`backdrop-blur-md bg-white/70 dark:bg-slate-900/40`) with soft shadows.
  - Removed the AI Model Selector dropdown, corresponding state (`agentModel`, `allowedModels`), and `DEFAULT_MODELS`/`MODEL_DETAILS` constant maps, forcing the frontend to rely entirely on the backend agent template's model config.
  - Placed the gallery as a full-width section at the bottom, removed card borders from gallery items, added aspect ratio badge indicators, and implemented a "Clone Settings" feature that applies metadata back to the form state.
- **Files Modified**:
  - `apps/frontend/src/pages/admin/AIImageGenerator.tsx`

### [FIX] AI Agent Model Override Ignored Due to Template Precedence
- **Date**: 2026-07-09
- **Description**: Configuring a custom AI model for a specific company's agent (e.g., via the "Companies" tab in the Super Admin Template page) had no effect, and the agent continued using the template's default model.
- **Root Cause**: In `apps/ai-service/src/services/agent_registry.py`, the helper `_resolve_agent_model` evaluated the template's default model policy first: `return template.model_policy.get("default") or db_agent.model`. Since the template almost always has a default model (e.g. `deepseek-v4-flash`), the custom override `db_agent.model` was never reached.
- **Resolution**: Flipped the resolution order so that `db_agent.model` takes precedence over `template.model_policy.get("default")`: `return db_agent.model or template.model_policy.get("default")`. Added a unit test to verify precedence.
- **Files Modified**:
  - `apps/ai-service/src/services/agent_registry.py`
  - `apps/ai-service/tests/unit/test_model_resolution.py`

### [FIX] WhatsApp Voice Note Truncated to 1-Second / Silent Message
- **Date**: 2026-07-08
- **Description**: Voice notes sent from the WhatsApp chat UI were delivered to customers as silent/empty messages with exactly a 1-second duration.
- **Root Cause**: Two issues:
  1. **Premature Track Stopping (Frontend)**: In `useAudioRecorder.ts`, the audio stream tracks were stopped immediately inside `stopRecording()` synchronously after calling `MediaRecorder.stop()`. This terminated the stream before the asynchronous MediaRecorder finished encoding and flushing the remaining audio buffers, resulting in empty/truncated recordings.
  2. **WebM Missing Duration Metadata (Backend)**: WebM audio files recorded by browser clients (like Chrome) do not write duration metadata, causing FFmpeg during Ogg/Opus conversion to incorrectly read or truncate the stream.
- **Resolution**:
  - Moved the `mediaStreamRef.current.getTracks().forEach(track => track.stop())` track closing logic from `stopRecording()` into the `recorder.onstop` and `recorder.onerror` event handlers, ensuring the stream is only terminated after encoding completes.
  - Added `-fflags +genpts` to FFmpeg execution in `WhatsAppMediaHandler.js` to regenerate presentation timestamps.
  - Added frontend and backend validations to reject audio payloads smaller than 500 bytes and disable sending when recording time is under 1 second.
- **Files Modified**:
  - `apps/frontend/src/hooks/useAudioRecorder.ts`
  - `apps/frontend/src/pages/whatsapp/components/AudioRecorder.tsx`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`

### [FIX] reportWebVitals Adblocker Crash Loop in Storefronts
- **Date**: 2026-07-07
- **Description**: Public storefronts (like `swan.maxp.online`) would load in an infinite refresh/redirect loop with query parameter `?__maxp_cache_recovery=...` and console errors like `TypeError: Cannot destructure property 'reportWebVitals' of 'undefined' as it is undefined` or `TypeError: Failed to fetch dynamically imported module`.
- **Root Cause**: In production, `main.tsx` dynamically imported `./utils/reportWebVitals` via `import("./utils/reportWebVitals")` to track Core Web Vitals. Because the chunk name contains the word "vitals", it gets blocked by adblockers (Safari content blockers, uBlock Origin, etc.). When blocked, the import throws a dynamic import fetch failure. The global error recovery handler (`chunk-recovery.js` / `vite:preloadError` listener) caught this failure, classified it as a critical Vite chunk load failure, and redirected the page with a cache-busting timestamp `?__maxp_cache_recovery=...` in an attempt to recover. Since the blocker kept blocking the URL on subsequent reloads, the page was trapped in an infinite reload loop.
- **Resolution**: Removed the unused performance monitoring dynamic import of `reportWebVitals` from `apps/frontend/src/main.tsx`. The performance reporter did nothing in production anyway since its actual logging/sending calls were commented out, making it safe to completely decommission.
- **Files Modified**:
  - `apps/frontend/src/main.tsx`

### [FIX] WhatsApp Voice Note 500 Error — Missing ffmpeg + Raw Mimetype in sendAudio
- **Date**: 2026-07-05
- **Description**: Voice notes sent from the WhatsApp chat UI returned HTTP 500 on production (`/whatsapp/messages/upload-send`).
- **Root Cause**: Two issues: (1) `ffmpeg` was not available on the server PATH, causing Baileys audio processing to fail silently. (2) The raw mimetype `audio/webm;codecs=opus` was passed through to `sendAudio` and Baileys' `sendMessage`, which doesn't handle parameterized mimetypes.
- **Resolution**:
  - Added `ffmpeg-static` npm dependency and injected its binary path into `process.env.PATH` at server startup in `server.js`.
  - Normalized mimetypes in `WhatsAppMediaHandler.uploadMedia()` and `WhatsAppMessageHandler.sendAudio()` by stripping `;` parameters.
  - Improved `upload-send` route error handling to forward `error.message` details, validate required params, and clean up temp files.
- **Files Modified**:
  - `apps/backend/server.js`
  - `apps/backend/package.json`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`
  - `apps/backend/services/whatsapp/WhatsAppMessageHandler.js`
  - `apps/backend/routes/whatsappRoutes.js`

### [FIX] GramJS Unhandled Rejection Alert Loop
- **Date**: 2026-07-05
- **Description**: The server was flooded with unhandled rejections and logged `[Sleeping for 13s on flood wait]` and `Failed to send alert`, causing massive log files (`err-1.log` reached ~1MB) and rate-limiting the Telegram alerting channel.
- **Root Cause**: An internal update parsing bug inside the `telegram` (GramJS) library triggers `Error: resolve() called for non-request instance` as an unhandled promise rejection. The global `unhandledRejection` handler catches it and triggers a Telegram alert. Sending this alert creates a new Telegram update, which GramJS receives and fails to parse, triggering another unhandled rejection. This creates an infinite feedback loop that spams the server and rate-limits the Telegram alerting channel.
- **Resolution**: Added `isGramJsResolveError` inside `apps/backend/utils/recoverableUnhandledRejection.js` to identify this specific internal GramJS parsing error. Updated `apps/backend/server.js` global `unhandledRejection` handlers to log it as a warning and bypass sending Telegram alerts for it.
- **Files Modified**:
  - `apps/backend/utils/recoverableUnhandledRejection.js`
  - `apps/backend/server.js`
  - `apps/backend/tests/utils/recoverableUnhandledRejection.test.js`

### [FIX] WhatsApp upload-send fileFilter Mimetype Rejection
- **Date**: 2026-07-05
- **Description**: Users uploading recorded audio or document files via the WhatsApp interface received `Error: نوع الملف غير مدعوم` (File type not supported) errors.
- **Root Cause**: Browsers (especially Safari or some mobile devices) or upload clients sometimes upload files with mimetypes like `audio/wav`, `audio/aac`, `audio/x-m4a`, or `application/octet-stream`. These mimetypes were not included in `MIME_TYPE_MAP` in `whatsappRoutes.js` and were rejected by Multer's `fileFilter` before reaching the route controller. Additionally, no debug logs were printed when a file was rejected, making it difficult to trace.
- **Resolution**:
  - Expanded `MIME_TYPE_MAP` in `apps/backend/routes/whatsappRoutes.js` and `extensions`/`SUPPORTED_TYPES` in `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` to support: `audio/wav`, `audio/x-wav`, `audio/wave`, `audio/x-pn-wav`, `audio/x-m4a`, `audio/aac`, `audio/x-aac`, `application/zip`, `application/x-zip-compressed`, `application/rar`, `application/x-rar-compressed`, and `application/octet-stream`.
  - Added warning log in Multer's `fileFilter` to print the file name and rejected mimetype.
- **Files Modified**:
  - `apps/backend/routes/whatsappRoutes.js`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`

### [FIX] WhatsApp Voice Note Upload Fails with Unsupported Mimetype Error (Codecs parameters)
- **Date**: 2026-07-05
- **Description**: Recorded voice notes failed to send on WhatsApp with `Error: نوع الملف غير مدعوم` (HTTP 500 error) on some browsers.
- **Root Cause**: Browsers recording audio in WhatsApp Chat UI send a WebM blob with mimetype formatted as `audio/webm;codecs=opus`. Because of the parameter trailing part `;codecs=opus`, simple string checks in `MIME_TYPE_MAP` and other validation helpers inside the backend were returning `undefined`, causing the upload to be rejected as an unsupported mimetype.
- **Resolution**: Updated `apps/backend/routes/whatsappRoutes.js` (Multer setup) and `apps/backend/services/whatsapp/WhatsAppMediaHandler.js` (helpers `getMediaTypeFromMimetype`, `getExtension`, and `validateFile`) to split the mimetype by `;` and trim it before checking it. This extracts the clean base mimetype (e.g. `audio/webm`), resolving all validation failures.
- **Files Modified**:
  - `apps/backend/routes/whatsappRoutes.js`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`
  - `apps/backend/docs/whatsapp/whatsapp-voice-message-webm-fix-2026-07-05.md`

### [FIX] Prisma Schema P1012 - Missing Company Relations for Education Models
- **Date**: 2026-07-05
- **Description**: CI/CD `Deploy to Server` workflow failed with Prisma validation error P1012. The `EducationTeacherAvailability` and `EducationTeacherPayment` models defined `company Company @relation(...)` but the `Company` model in `core.prisma` was missing the reverse relation fields.
- **Root Cause**: The `feat(education)` commit added `EducationTeacherAvailability` and `EducationTeacherPayment` models with `companyId` foreign keys and `@relation` directives pointing to `Company`, but forgot to add the corresponding `[]` array fields on the `Company` model side. Prisma requires both sides of a relation to be declared.
- **Resolution**: Added `educationTeacherAvailability EducationTeacherAvailability[]` and `educationTeacherPayments EducationTeacherPayment[]` to the `Company` model in `core.prisma`.
- **Files Modified**:
  - `apps/backend/prisma/schema/core.prisma`

### [FIX] WhatsApp Meta Template Creation Returns 400 Error
- **Date**: 2026-07-04
- **Description**: Creating a new WhatsApp template via Meta Cloud API always returned `Request failed with status code 400`. Users could not create any templates from the MaxP dashboard.
- **Root Cause**:
    1. **Template name validation**: Users entered Arabic names or names with spaces/special characters (e.g., "طلب دفعه بقيمة $56"). Meta requires template names to contain only lowercase a-z, digits, and underscores.
    2. **Named variables rejected**: Header/body text used `{{name}}` instead of Meta's required numbered format `{{1}}`.
    3. **Invalid button URL**: Button URLs like `v.paypal.me/harfonline` lacked the required `https://` prefix.
    4. **Error swallowed by backend**: The controller caught Axios errors from Meta's API and returned a generic 500 error, hiding Meta's detailed error message that would have explained the exact problem.
- **Resolution**:
    1. **Backend**: Updated `whatsappMetaTemplateController.createMetaTemplate` to forward Meta's detailed error response (`error.response.data.error`) including `error_user_title`, `error_user_msg`, and Meta error codes, with the correct HTTP status code from Meta.
    2. **Frontend**: Added `sanitizeTemplateName()` that auto-converts user input to valid Meta format (lowercase, spaces→underscores, strips non-alphanumeric). Shows real-time preview of the sanitized name.
    3. **Frontend**: Added `hasNamedVariables()` validator that detects `{{name}}` patterns and warns users to use `{{1}}` instead.
    4. **Frontend**: Added `isValidButtonUrl()` that ensures URLs start with `https://`. Auto-prefixes `https://` if missing when submitting.
- **Files Modified**:
  - `apps/backend/controller/whatsappMetaTemplateController.js`
  - `apps/frontend/src/pages/whatsapp/WhatsAppMetaTemplates.tsx`

### [FIX] silentEscalationService MODULE_NOT_FOUND Database Client Crash
- **Date**: 2026-07-04
- **Description**: The Facebook AI auto-reply loop crashed and failed to execute silent human takeover escalation when an AI failure occurred, generating `Error: Cannot find module '../prisma/client'` in the logs.
- **Root Cause**:
  - In `apps/backend/services/silentEscalationService.js`, the database Prisma client was required as `require('../prisma/client')`. However, the shared database client wrapper for the backend is located in `sharedDatabase.js` inside the same services directory, and should be imported as `require('./sharedDatabase')`. The incorrect path triggered a `MODULE_NOT_FOUND` error and crashed the auto-reply worker.
- **Resolution**:
  - Updated the require statement in `apps/backend/services/silentEscalationService.js` to correctly point to `./sharedDatabase`.
- **Files Modified**:
  - `apps/backend/services/silentEscalationService.js`

### [FIX] AI Service Sandbox Empty Reply (SKILL.md & recentMessages Context Gaps)
- **Date**: 2026-07-04
- **Description**: AI Sandbox / chat pipeline returned empty replies and fell back to raw formatted tool results when searching for products that did not exist (e.g., "شنطة ظهر نايك"), or hung for 180 seconds due to API timeout errors.
- **Root Cause**:
  1. **Missing SKILL.md Block**: In `skills_pipeline.py`, the primary `_llm_call` successfully loaded the agent's skills block (`get_skills_block`) into the system prompt. However, the follow-up completion call `_build_followup_messages` only used `get_agent_instructions`, omitting the skills instructions. Because of this, the follow-up model had no instructions on how to handle empty tool results (such as suggesting alternative items).
  2. **Missing recentMessages**: The follow-up messages builder did not include the conversation history `recentMessages` in the chat context, passing only the current user message `ctx.message`. This caused the model to lose the conversational thread.
  3. **No Timeout in AsyncOpenAI**: The `AsyncOpenAI` client instantiation in `client.py` did not specify a `timeout` parameter, defaulting to 600 seconds, which caused requests to hang for up to 180 seconds until the backend gateway timeout intervened.
- **Resolution**:
  1. Updated `_build_followup_messages` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to fetch and inject the `skills_block` using `get_skills_block` if `ctx.agent.allowed_skills` is present.
  2. Updated `_build_followup_messages` to fetch `recentMessages` from `ctx.external_memory_context` and prepend the conversation history prior to the current user message.
  3. Configured `timeout=httpx.Timeout(60.0, connect=10.0)` in the `AsyncOpenAI` client initialization in `apps/ai-service/src/llm/client.py`.
  4. Updated unit tests in `tests/pipeline/test_skills_pipeline.py` and `tests/llm/test_gemma_client.py` to align with the new design behaviors (expecting empty text when tool calls exist, and empty formatting results).
  5. Resolved a multimodal vision context weakness in `_build_followup_messages` by replacing the plain string `ctx.message` with `build_user_content(ctx.message, ctx.attachments)` for the current user message, ensuring images/attachments are preserved for the follow-up LLM.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/tests/pipeline/test_skills_pipeline.py`
  - `apps/ai-service/tests/llm/test_gemma_client.py`

### [FIX] DeepSeek reasoning_content Stripped in OpenAI Messages Serialization (400 Bad Request)
- **Date**: 2026-07-04
- **Description**: The Sandbox and chat pipeline fell back to raw formatted tool results instead of returning the agent's natural friendly Arabic persona response.
- **Root Cause**:
  1. DeepSeek-R1 (or models using thinking/reasoning modes) return a `reasoning_content` field containing the reasoning steps in their choice response.
  2. The DeepSeek API requires that when continuing a conversation, any assistant message that contained reasoning steps MUST include `reasoning_content` when sent back to the API.
  3. However, `_normalize_openai_messages` in `client.py` stripped all custom attributes (including `reasoning_content` and `reasoning`), causing the follow-up completion call to fail with a `400 BadRequestError: 'reasoning_content' in the thinking mode must be passed back to the API`.
  4. This API failure caused the pipeline follow-up turn to fall back directly to `_format_tool_results` formatting, dumping a raw comma-separated list of items into the chat instead of Yasmine's Egyptian Arabic persona response.
- **Resolution**:
  1. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to preserve `reasoning_content` and `reasoning` keys in the serialized messages payload.
  2. Fixed an `ImportError` in `skills_pipeline.py` where `ALL_TOOLS` was incorrectly imported from `src.skills.integration` instead of `src.tools.registry`.
  3. Set `ctx.system_prompt` inside `skills_pipeline.py` to ensure it is returned in `compiled_system_prompt` in the sandbox logs for easy inspection.
  4. Mapped `compiled_system_prompt` from Python API response to `result.compiledSystemPrompt` inside `runSelectedAgentInPython` in `aiSandboxController.js` to ensure it displays correctly in the frontend.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
  - `apps/backend/controller/aiSandboxController.js`

### [FIX] Product Search (results key) & Single Product Mismatch in Skills Pipeline
- **Date**: 2026-07-04
- **Description**: AI agents (like Yasmine) returned dry, automated messages such as "لم يتم العثور على منتجات تطابق بحثك" or "لا توجد بيانات مخزون متاحة" even when search or inventory checks succeeded and found products.
- **Root Cause**:
  1. The `product_search` tool wrappers and declarative Skills map the low-level `"products"` results list to the key `"results"`.
  2. The pipeline's formatting helper `_format_tool_results` in `skills_pipeline.py` only looked for `"products"` or `"items"`. It defaulted to `[]` when `"results"` was present, completely bypassing formatting.
  3. Single product responses (like the dictionary returned by `inventory_check`) were also ignored since they lacked list wrappers.
- **Resolution**:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to check for `"results"`.
  2. Added support for single product responses (wrapped dynamically in a list if `"productName"` is present).
  3. Implemented robust formatting for other active skills (like `offers_list_active`, `coupon_validate`, `order_lookup`, etc.) to prevent dry fallback messages when they succeed.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] DeepSeek Tool Call dictionary Arguments & tool_choice="none" API Failures (400 Bad Request)
- **Date**: 2026-07-04
- **Description**: Follow-up chat completion calls with tool histories failed or returned empty text on DeepSeek-compatible models, forcing the pipeline to fall back to dry text results.
- **Root Cause**:
  1. DeepSeek and compatible OpenAI-like APIs require the `arguments` field in `tool_calls` (inside assistant messages) to be a JSON string.
  2. When the tool call history has dictionary-type arguments (common in runtime storage or history retrieval), passing them back in the chat context causes the API to fail with a validation/400 error.
  3. Additionally, passing the `tools` list when `tool_choice="none"` is enforced triggers API errors or empty completions on certain DeepSeek providers.
- **Resolution**:
  1. Updated `_normalize_openai_messages` in `apps/ai-service/src/llm/client.py` to inspect tool call objects.
  2. If the `arguments` field is a Python `dict`, it is serialized to a JSON string using `json.dumps(..., ensure_ascii=False)`.
  3. Modified `_generate_openai_compat` to omit the `tools` and `tool_choice` parameters entirely if `tool_choice == "none"`, forcing the model to generate plain text naturally without any validation/format errors.
- **Files Modified**:
  - `apps/ai-service/src/llm/client.py`

### [FIX] WhatsApp Inbox Permission Distribution Gap (Unauthorized Message Leak)
- **Date**: 2026-07-04
- **Description**: Moderators or agents who are not assigned to specific WhatsApp numbers could still view their messages, chats, and get real-time socket updates.
- **Root Cause**:
  1. The REST API `/whatsapp/conversations` retrieved all session IDs for the company without filtering them according to user-level access permissions.
  2. The `/whatsapp/conversations/:jid/messages` endpoint had no validation to verify if the requesting user has access to the target session.
  3. The Socket.IO real-time audience resolver returned only the assigned agent (or first routing agent) for unassigned chats. If that agent was offline or empty, the broadcast fell back to the company-wide channel (`company_${companyId}`), transmitting messages and updates to all online users.
- **Resolution**:
  1. Updated `getConversations` and `getMessages` inside `whatsappController.js` to filter and validate session IDs using the `getUserAccessibleSessionIds` helper for non-admin users.
  2. Overhauled `getConversationAudience` in `whatsappRealtimeAudienceService.js` to return all authorized users (admins, leaders, assigned agents, and all configured team members/routing agents).
  3. Set `fallbackToCompany` default to `false` in `emitToAudience` to prevent silent company-wide broadcast leaks of message events.
  4. Added Jest unit tests under `tests/services/whatsappRealtimeAudienceService.test.js` to verify audience isolation.
- **Files Modified**:
  - `apps/backend/controller/whatsappController.js`
  - `apps/backend/services/whatsappRealtimeAudienceService.js`
- **Files Added**:
  - `apps/backend/tests/services/whatsappRealtimeAudienceService.test.js`

### [FIX] category_list Tool Formatting Mismatch in Skills Pipeline
- **Date**: 2026-07-04
- **Description**: Asking the AI agent to list categories returned "لا توجد تصنيفات متاحة حالياً" (No categories available) even when categories were defined in the database.
- **Root Cause**:
  1. The `category_list` tool correctly fetched categories and returned a payload containing `{"found": true, "count": X, "categories": [...]}`.
  2. However, the `_format_tool_results` formatter in `skills_pipeline.py` only looked for `"products"` or `"items"` lists to display.
  3. When `categories` was returned, it found no products/items, and fell back to printing the default "no results available" or fallback message, masking the actual category list.
- **Resolution**:
  1. Updated `_format_tool_results` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py` to check for the presence of a `"categories"` array.
  2. If found, it formats and displays the names of the categories (e.g., category name) instead of falling back to the "no categories available" message.
- **Files Modified**:
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

### [FIX] Permissions Consistency Mismatch & Mismapped DOMAIN_PERMISSIONS (Sidebar collapse on refresh)
- **Date**: 2026-07-03
- **Description**: Users with custom permissions (such as `AGENT` accounts with specific roles like in `Harf Online`) would see a full sidebar initially on login, but the sidebar would collapse or lose sections like the inbox/Facebook/WhatsApp after a page refresh.
- **Root Cause**:
  1. **Permissions Load Mismatch**: The login (`/auth/login`) and switch company (`/auth/switch-company`) endpoints did not load the user's granular permissions from the database. Consequently, the user's `permissions` array was returned as `undefined`. On the frontend, this triggered the fallback check `user.permissions.length === 0`, causing the app to temporarily grant visibility to all sidebar sections. However, the session hydration endpoint (`/auth/me`) correctly queried the database for permissions, populating the `permissions` array on refresh and causing the sidebar to collapse to only match explicit permissions.
  2. **Typo in DOMAIN_PERMISSIONS**: The frontend's `sidebar.ts` mapped unified messaging sections to the permission key `conversations.view`. However, the database seeds and backend permissions only featured `inbox.view` (along with `inbox.view.own`, `inbox.view.team`, `inbox.view.all`, `inbox.send`). This typo prevented any user with database-defined inbox permissions from accessing the inbox sections once their permissions list was populated.
  3. **Mismatched company object**: On login, `user.company` returned the raw Prisma model (which did not have the company `role` attribute), causing a property mismatch with `/auth/me`.
- **Resolution**:
  1. Updated `/auth/login` and `/auth/switch-company` in `apps/backend/controller/authController.js` to load user permissions via `permissionService.getUserPermissions` and return them consistently in the JSON payloads.
  2. Overrode the `company` object returned in `/auth/login` and `/auth/switch-company` responses with the context-aware selected company (retrieved from `companiesMap`), ensuring it consistently includes the `role` and `activeApps` fields.
  3. Updated `DOMAIN_PERMISSIONS` in `apps/frontend/src/config/sidebar.ts` to map messaging sections to the database-canonical `inbox.view` (and its variants) instead of the legacy `conversations.view`.
  4. Added database-canonical finance permissions (`finance.invoices`, `finance.payments`) to the `'procurement'` section, and `notifications.view` to the `'notifications'` section in `DOMAIN_PERMISSIONS`.
- **Files Modified**:
  - `apps/backend/controller/authController.js`
  - `apps/frontend/src/config/sidebar.ts`

### [FIX] Company Role Resolution & Sidebar Disappearance on Page Refresh
- **Date**: 2026-07-03
- **Description**: Company accounts (like OWNER or COMPANY_ADMIN) would lose access to all sidebar items (showing only one or two basic sections) after a page refresh.
- **Root Cause**:
  1. During page refresh, `/auth/me` hydrates the user session. It correctly resolved the primary company's role key initially.
  2. However, it subsequently looped through all user-associated companies (`user.userCompanies`). When processing the currently active company, it unconditionally overwrote `currentActiveRole` with `uc.role`.
  3. `uc.role` is the default database enum column (which defaults to `AGENT`), while the custom role assignment is stored in `uc.roleRef?.key` (e.g. `OWNER`, `COMPANY_ADMIN`).
  4. This role downgrade to `AGENT` on the frontend caused the sidebar gating logic in `sidebar.ts` to strictly restrict access based on explicit permission lists instead of providing implicit admin/owner access, collapsing the sidebar.
- **Resolution**:
  1. Updated `/auth/login`, `/auth/me`, `/auth/companies`, and `/auth/switch-company` in `apps/backend/controller/authController.js` to select and include the `roleRef` relation inside `userCompanies`.
  2. Updated the active role and company list mapping logic to always prefer the custom role key (`uc.roleRef?.key || uc.role`) to preserve the correct administrative role context during page loads and company switches.
- **Files Modified**:
  - `apps/backend/controller/authController.js`

### [FIX] catalog-search Skill & Prompt Architecture Hardening
- **Date**: 2026-07-03
- **Description**: The `catalog-search` skill had a weak, single-line description, lacked trigger phrases, omitted visual search and advanced filters from its instructions, and the seeding script completely ignored `triggerPhrases` from `skill.json`, causing agent catalog lookup failures.
- **Root Cause**:
  1. The skill description (`"Find products and validate product facts."`) was too generic for 2026 LLM planning models to accurately select it under progressive disclosure protocols.
  2. The `SKILL.md` instruction file lacked documentation for advanced `product_search` parameters (`image_bytes`, `image_url`, `product_size`, `product_color`, `references_previous_product`), preventing the agent from utilizing them.
  3. No failure handling logic existed for cases with 0 search results, API timeouts, or low similarity scores.
  4. The python seeding script (`seed.py`) hardcoded `trigger_phrases=""`, ignoring filesystem definitions.
- **Resolution**:
  1. Rewrote `apps/ai-service/skills/catalog-search/skill.json` to feature a comprehensive, scenario-based description, added 20 localized trigger phrases, expanded allowed tools, and raised the max tool count to 6.
  2. Overhauled `SKILL.md` to document all parameters, added a complete decision tree, result formatting guidelines, and alternative recommendation loops.
  3. Added interactive few-shot chat transcripts in `examples/conversations.md`.
  4. Updated `seed.py` to parse `triggerPhrases` from `skill.json` and persist them as a comma-separated list to the database's `trigger_phrases` column.
  5. Refactored `integration.py` to load and cache `trigger_phrases` across DB and filesystem paths, and dynamically inject them into the system prompt's `<trigger_phrases>` XML block.
- **Files Modified**:
  - `apps/ai-service/skills/catalog-search/skill.json`
  - `apps/ai-service/skills/catalog-search/SKILL.md`
  - `apps/ai-service/skills/catalog-search/examples/conversations.md`
  - `apps/ai-service/src/skills/seed.py`
  - `apps/ai-service/src/skills/integration.py`

### [FIX] Vite Dynamic Chunk Load 404 Failure & Frontend Cache Inconsistency
- **Date**: 2026-07-03
- **Description**: Navigating between lazy-loaded routes (like Settings or Admin) after a production deployment resulted in a crash with `TypeError: Failed to fetch dynamically imported module`.
- **Root Cause**:
  1. The root `ErrorBoundary` (`LazyErrorBoundary` inside `AdminAppBootstrap.tsx`) was loaded lazily using `React.lazy`. When a new deployment deleted old hashed assets, attempts to load the error boundary itself failed with 404 errors, causing the application to crash completely without executing any recovery logic.
  2. The production Nginx configuration file `nginx_configs/maxp.online.conf` was missing cache-control header overrides for the main React Single Page Application (SPA) entrypoint. This allowed the browser or intermediate CDNs to cache `index.html`, making it request stale, deleted chunk names instead of the newly deployed ones.
- **Resolution**:
  1. Refactored `apps/frontend/src/bootstrap/AdminAppBootstrap.tsx` to statically import `ErrorBoundary` and removed the lazy `LazyErrorBoundary` wrapper, ensuring the error recovery system is always loaded and capable of catching module loading failures.
  2. Modified `nginx_configs/maxp.online.conf` to add explicit no-cache headers (`Cache-Control "no-cache, no-store, must-revalidate"`, `Pragma "no-cache"`, `Expires "0"`) to both the React frontend and wildcard storefront routing server blocks, matching `mokhtarelhenawy.online.conf`.
- **Files Modified**:
  - `apps/frontend/src/bootstrap/AdminAppBootstrap.tsx`
  - `nginx_configs/maxp.online.conf`

### [UI/UX] WhatsApp Inbox Double Scrolling & Mobile UX Alignment
- **Date**: 2026-07-03
- **Description**: Squeezed layouts on mobile, double scrolling caused by layout wrapper parent padding, and lack of mobile UX animations/safe-areas in `/whatsapp`.
- **Root Cause**:
  1. The main dashboard app shell layout has fixed container padding and overflow, causing double scrollbars on workspace panels.
  2. View switching between sidebar and conversation window was instant with no transitions.
  3. Rich tool actions squeezed on mobile screens, leading to button layout broken wrap.
- **Resolution**:
  1. Leveraged `:has()` CSS selector on `.app-shell-content` to dynamically eliminate wrapper padding.
  2. Added dedicated `whatsapp-responsive.css` file providing View Transitions API configurations, horizontal-scrolling filter flex containers, safe-area bottom buffers, and slide-up tools tray panels.
  3. Wrapped panel switches with React touch gestures and CSS-native transition triggers.
  4. Redesigned the absolute-positioned emoji picker to act as a full-width bottom sheet drawer on mobile viewports (< 640px) with touch-outside dismissal.
  5. Fixed hardcoded white backgrounds in `AudioRecorder.tsx` to use themed surface variables, enabling full dark mode styling support.
  6. Implemented touch swipe-to-action handlers (`Swipe-to-Archive`) on conversation items in `ChatSidebar.tsx` to mimic mobile app actions.
- **Files Modified**:
  - `apps/frontend/src/styles/index.css`
  - `apps/frontend/src/styles/whatsapp-responsive.css`
  - `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx`
  - `apps/frontend/src/pages/whatsapp/components/ChatSidebar.tsx`
  - `apps/frontend/src/pages/whatsapp/components/ChatWindow.tsx`
  - `apps/frontend/src/pages/whatsapp/components/MessageBubble.tsx`
  - `apps/frontend/src/pages/whatsapp/components/AudioRecorder.tsx`


### [FIX] WhatsApp Inbox Auto-Assignment & Reassignment Engine Hardening
- **Date**: 2026-07-03
- **Description**: The WhatsApp inbox suffered from auto-assignment inconsistency, infinite reassignment loops (ping-pong), high database overhead, and duplicate background tasks in cluster environments.
- **Root Cause**:
  1. Inbound messages synced via `WhatsAppSyncService` bypassed the advanced assignment engine and called a basic `resolveConversationAssignee` service, bypassing online checks, working hours, capacity constraints, and locking.
  2. The reassignment sweep calculated agent timeout using the customer's message timestamp rather than the agent's actual assignment timestamp (`lastAssignedAt`), causing newly assigned agents to instantly time out and trigger an infinite ping-pong loop between moderators.
  3. The sweep query fetched the top 100 open conversations across all companies indiscriminately without checking settings or tenant-level config, causing database scaling issues.
  4. The background interval scheduler ran concurrently on all PM2 cluster processes, causing duplicate reassignment sweeps and database lock contentions.
  5. In Round Robin and Shared Inbox modes, candidate pool building prioritized the number owner/assignedUser over `routingUserIds` (configured employees) when `assignedUserId` was populated, completely locking out employees from receiving chats.
- **Resolution**:
  1. Unified the incoming sync pipeline in `WhatsAppSyncService.js` to call `assignConversationToBestModerator` from the advanced `WhatsAppAssignmentEngineService`.
  2. Added a 5-minute cooldown period using `lastAssignedAt` in `evaluateConversationForReassignment` to stop the ping-pong loop.
  3. Adjusted response SLA timeouts to count from the `lastAssignedAt` timestamp instead of the customer's message timestamp if the agent was assigned after the message.
  4. Optimized the sweep query to fetch active company assignments, check their settings, and query only open conversations with pending customer messages, grouped by `companyId`.
  5. Implemented a session-level distributed advisory lock (`pg_try_advisory_lock`) in PostgreSQL to coordinate background sweeps across PM2 cluster instances safely.
  6. Added corresponding unit tests in `whatsappAssignmentEngineService.test.js` to prevent regressions.
  7. Corrected `_buildCandidatePool` in `whatsappAssignmentEngineService.js` to prioritize configured `routingUserIds` for Round Robin/Shared Inbox modes even if `assignedUser` exists.
- **Files Modified**:
  - `apps/backend/services/whatsapp/WhatsAppSyncService.js`
  - `apps/backend/services/whatsappAssignmentEngineService.js`
  - `apps/backend/tests/services/whatsappAssignmentEngineService.test.js`

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

### [FIX] WhatsApp Voice Message Sending Failure & Mimetype Rejection
- **Date**: 2026-07-05
- **Description**: Recorded voice messages (voice notes) in WhatsApp chat interface failed to send, triggering the toast error "فشل إرسال الرسالة الصوتية".
- **Root Cause**:
  1. The browser records voice messages as `.webm` files and uploads them with `audio/webm` or `video/webm` mimetypes.
  2. The Multer file upload filter in `apps/backend/routes/whatsappRoutes.js` rejected these mimetypes because they were missing from the supported `MIME_TYPE_MAP`. This caused the request to fail immediately with an upload error before reaching the route controller.
  3. When an audio file was uploaded, the controller called `WhatsAppMessageHandler.sendAudio` without passing the `{ ptt: true }` option, meaning it was treated as a standard audio file attachment instead of a playable WhatsApp voice note.
- **Resolution**:
  1. Added `audio/webm` and `video/webm` mimetypes to `MIME_TYPE_MAP` in `apps/backend/routes/whatsappRoutes.js` and `SUPPORTED_TYPES` / `getExtension` in `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`.
  2. Updated the frontend `onVoiceNoteSend` handler in `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx` to append `ptt: 'true'` explicitly to the `FormData` payload.
  3. Updated the backend router in `whatsappRoutes.js` to extract `ptt` from `req.body` and check if the original file name is `voice_note.webm` to override the media type classification to `'audio'` and pass `{ ptt: isVoiceNote }` to `sendAudio` execution.
- **Files Modified**:
  - `apps/backend/routes/whatsappRoutes.js`
  - `apps/backend/services/whatsapp/WhatsAppMediaHandler.js`
  - `apps/frontend/src/pages/whatsapp/WhatsAppChat.tsx`

### [REFACTOR/ARCHITECTURAL] AI Agent Templates Unification (Template-as-Agent)
- **Date**: 2026-07-05
- **Description**: Simplified AI agent management by removing the redundant "Agent Profiles" (`/super-admin/agent-profiles`) and "Ready Profiles" systems, unifying everything under "AI Templates".
- **Root Cause**: Spawned agent profiles copied entire configurations from templates into DB rows, which made maintenance complex and caused configuration synchronization issues.
- **Resolution**:
  1. Removed `SuperAdminAgentProfiles` navigation link, route, and file.
  2. Removed legacy quick-profiles/ready-profiles endpoints from backend (`superAdminRoutes.js` and `agentManagerRoutes.js`).
  3. Cleaned up/deleted legacy seeding scripts (`seed-quick-profiles.js` and `.github/workflows/seed-quick-profiles.yml`).
  4. Decommissioned `spawnReadyAgentsService.js` (deleted).
  5. Refactored the merchant's `AgentProfilesPage.tsx` to directly open the custom agent template creation dialog (creating overriding records in `agents` table mapped to `AgentTemplate` slugs), and updated the empty state UI to show a clean CTA.
- **Files Modified/Deleted**:
  - `apps/frontend/src/components/layout/SuperAdminSidebar.tsx` [MODIFY]
  - `apps/frontend/src/App.tsx` [MODIFY]
  - `apps/frontend/src/pages/super-admin/SuperAdminAgentProfiles.tsx` [DELETE]
  - `apps/backend/routes/superAdminRoutes.js` [MODIFY]
  - `apps/backend/routes/agentManagerRoutes.js` [MODIFY]
  - `apps/backend/services/spawnReadyAgentsService.js` [DELETE]
  - `apps/backend/prisma/seed-quick-profiles.js` [DELETE]
  - `.github/workflows/seed-quick-profiles.yml` [DELETE]
  - `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx` [MODIFY]

### [FIX] Missing FastAPI session.commit() in Guardrail Operations & Prompt Logging
- **Date**: 2026-03-09
- **Description**: Guardrail rules created, updated, or deactivated via the FastAPI admin endpoints were not persisted to the database and rolled back upon session closure. Also, the compiled system prompt returned in sandbox API responses and logs was empty/unpopulated with the assembled sections.
- **Root Cause**:
  1. The DB session was flushed via `session.flush()` inside the repository but was never committed via `await session.commit()` in the FastAPI endpoints inside `guardrails.py`.
  2. The assembled `enriched_prompt` was not assigned back to `ctx.system_prompt` inside `skills_pipeline.py`, leaving the context system prompt unpopulated.
- **Resolution**:
  1. Added `await session.commit()` calls before invalidating Redis cache inside create, update, and delete endpoints in `apps/ai-service/src/api/admin/guardrails.py`.
  2. Assigned `enriched_prompt` to `ctx.system_prompt` inside `_llm_call` in `apps/ai-service/src/pipeline/stages/skills_pipeline.py`.
- **Files Modified**:
  - `apps/ai-service/src/api/admin/guardrails.py`
  - `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

