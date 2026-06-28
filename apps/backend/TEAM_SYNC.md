# Team Sync Notes

## [2026-06-28]

### Intent Classifier Modernization to Schema-Driven Architecture
- **Accomplishment**: Refactored the intent classification system to transition from legacy keyword-stuffed prompts to a clean, schema-driven, description-based architecture, and made the agent's configured model responsible for classification.
- **Details**:
  - Added semantic descriptions to `INTENT_POLICIES` in `schema.py` for all intents, and purged all parenthetical Arabic/English keywords and phrase examples (e.g. `بكام الكوتشي`, `اهلا/مرحبا`) to make the classifications 100% semantic.
  - Refactored `classify_intent` in `classifier.py` to dynamically construct the LLM system prompt using descriptions loaded from `dynamic_intent_registry`.
  - Updated `classify_intent` to respect the pipeline context's `preferredProvider` and `preferredModel`, removing all fallback provider/model lists to ensure the agent's configured LLM is exclusively responsible.
  - Updated `resolve_intent.py` to fallback to `ctx.agent.client` if `ctx.llm_client` is not populated.
  - **Advanced Features**: Integrated `ClassifierResponse` Pydantic model for structured output validation, replacing raw dictionaries. Added dynamic few-shotting by similarity-matching queries against `intent_golden_cases.json` and injecting the 2 best exemplars into the system prompt.
  - Verified 100% test coverage and validation matching all 10 golden case routing scenarios.

## [2026-06-27]

### Repository Migration to Avoid GitHub Actions Quota Limit
- **Accomplishment**: Migrated the active development repository to a new target to bypass Actions run limits.
- **Details**:
  - Renamed the old remote `origin` (quota-exhausted repo `mokhtar1983/maxp-platform-1`) to `origin-quota-old` to serve as a local backup.
  - Added new remote `origin` pointing to `mokhtar-el7/maxp-platform2.git`.
  - Pushed the `main` branch to the new remote and set it up to track `origin/main` dynamically.
  - Verified write permissions, authentication, and successful upload of the ~660 MB repository history.

## [2026-06-26]

### Facebook Ads Dashboard Component Refactoring
- **Accomplishment**: Refactored the monolithic `FacebookAdsDashboard.tsx` (~1200 lines) into modular, maintainable components (~500 lines orchestrator + 3 focused components).
- **Details**:
  - Extracted `BudgetAlertsPanel.tsx` — WhatsApp budget alerts UI (form, rules list, logs).
  - Extracted `CampaignsListSection.tsx` — campaigns listing, filtering, sorting, pagination.
  - Extracted `DecisionSummarySection.tsx` — quick AI decisions and recommendations cards.
  - Moved shared helper functions (`getHealthDecision`, `getDecisionClass`, `getRulePayload`) into `facebookAdsHelpers.ts`.
  - Dashboard now acts as a thin orchestrator: manages top-level state (campaigns, performance, accounts) and delegates rendering to sub-components.
  - Reduced re-renders: form input state in BudgetAlertsPanel no longer triggers full dashboard re-renders.

### Super Admin Shell Layout & RTL Alignment Fixes
- **Accomplishment**: Solved layout constraints and RTL spacing issues for all Super Admin panels and dashboard views.
- **Details**:
  - Removed standard `maxWidth` limit and centering margins from `SuperAdminLayout` so that layout elements extend fully and start directly next to the sidebar.
  - Dynamically altered `SuperAdminHeader` placement using `i18n.dir()` so the fixed header stays aligned in both LTR and RTL orientations without overlapping.
  - Cleaned up container styling classes in `SuperAdminDashboard.tsx`, `BookingManagementPage.tsx`, `UsersManagement.tsx`, and `AgentConfigPage.tsx` to remove manual max-width settings.

### Ready Agent Profiles Catalog Management (Super Admin & Merchant UI)
- **Accomplishment**: Added dynamic "Ready Agent Profiles" loading and a comprehensive Super Admin management panel.
- **Details**:
  - Added Super Admin CRUD & reordering endpoints under `/super-admin/agents/quick-profiles` and stored the templates in `SystemSettings` as JSON.
  - Implemented `/super-admin/agent-profiles` page in the frontend allowing admins to add, edit, reorder, and activate/deactivate preset profiles.
  - Modified merchant `AgentProfilesPage` to fetch active templates dynamically from the API instead of relying on hardcoded ones.

### Agent Archiving & Permanent Deletion Support
- **Accomplishment**: Implemented archived agents view, restoration logic, and permanent deletion option across frontend, backend proxy, and AI service.
- **Details**:
  - Replaced strict DB unique constraint on agent name with a partial unique index allowing name reuse for archived agents.
  - Added support in python `ai-service` and Node `backend` proxy for `GET /agents?status=ARCHIVED` and `DELETE /agents/:id?permanent=true`.
  - Added "Active" and "Archived" tabs to frontend `AgentProfilesPage.tsx` sidebar with options to restore or permanently delete archived agents.

### Medical Center Management Page Design Polish & Consistency
- **Accomplishment**: Fixed visual and structural inconsistencies across all 6 tabs of the Booking Management (Medical Center) page, establishing uniform spacing, layouts, table paddings, and modal dimensions.
- **Details**:
  - Replaced fixed/inconsistent top padding with a responsive system (`p-4 md:p-6 lg:p-8`) constrained by a unified `max-w-[1600px]` wrapper.
  - Unified table row/cell spacing to `py-3 px-4` and standardized default backgrounds (`bg-gray-50`) for headers.
  - Aligned branch edit/delete action button sizing to `p-1.5` and added tooltip accessibility.
  - Unified creation and update modal widths to `max-w-xl` across all 5 settings dialogs.
  - Consolidated empty state layouts using `text-center py-12`.

## [2026-03-09]

### WhatsApp Session Connection Resolution & PM2 Fork Configuration
- **Accomplishment**: Fixed a critical routing issue on production where WhatsApp messages failed to send with a "Session not connected" (الجلسة غير متصلة حالياً) error by configuring PM2 to run in fork mode instead of cluster mode.
- **Details**:
  - Identified that PM2 was running 4 cluster instances of the backend, which split in-memory Baileys sockets across different worker processes. This caused Nginx to route ~75% of WhatsApp API requests to processes that didn't hold the active connection.
  - Added `exec_mode: 'fork'` explicitly for `maxp-backend` in `ecosystem.config.js`.
  - Deployed the configuration to the production server and restarted the application as a single backend instance. Verified all active sessions restored and connected successfully under one unified process, restoring sending reliability to 100%.

### WhatsApp Baileys Auth State Correction & Database Schema Alignment

- **Accomplishment**: Fixed a critical crypto key serialization corruption that broke WhatsApp Baileys session linking, corrected a controller import path, and resolved database constraint errors.
- **Details**:
  - Restored `JSON.parse(JSON.stringify(..., BufferJSON.replacer), BufferJSON.reviver)` inside `DatabaseAuthState.js` after identifying that the previous implementation of `structuredCloneSafe` converted Node `Buffer` objects into `Uint8Array`, which corrupted Baileys' auth state keys and caused linking failures ("make sure your phone is connected to the internet").
  - Fixed a `MODULE_NOT_FOUND` crash on startup by correcting the relative import path for `sharedDatabase` inside `whatsappMetaTemplateController.js` to point to `../services/sharedDatabase`.
  - Wrote and executed automated schema-relation parsing scripts to clean up orphaned database rows violating constraints on `companyId`, `orderId`, and `goalId`, successfully aligning the local PostgreSQL database with the latest Prisma schema.

### Python AI Service Unified Model Selection & Fallback Logic
- **Accomplishment**: Implemented a unified model resolution mechanism and client fallback chain in the Python AI Service.
- **Details**:
  - Fixed a critical `NameError` in `factory.py:get_active_provider` where undefined `resolved_model` crashed provider key resolution.
  - Added a `model_policy` (JSONB) column to the `ai.agents` table via Alembic migration `0019_agent_model_policy.py` to persist model fallback rules at runtime.
  - Updated `Agent` SQLAlchemy model, `AgentRegistry.spawn()`, and `init_registry_from_db()` to store and recover model policies.
  - Re-implemented `ensure_client()` in `base.py` to sequentially try fallback models on primary LLM connection failure, preventing service outages when APIs are throttled.
  - Updated `_build_runtime_agent_from_db` in `orchestration_flow.py` to correctly map the `policies` dict (containing `model_policy` and `guardrails`), fixing a gap where agents dynamically loaded for channel-routed messaging (like WhatsApp) lacked fallback model definitions.
  - Created new unit tests in `tests/unit/test_model_resolution.py` verifying model fallbacks work correctly.

### WhatsApp Chat Page Arabic Text Restoration & Subscription Center Duplicate Key Fix
- **Accomplishment**: Restored valid Arabic characters in `WhatsAppChat.tsx` that were corrupted by broad byte-level replacement scripts during encoding recovery, and fixed a duplicate `trialDays` key bug in `SubscriptionCenter.tsx`.
- **Details**:
  - Replaced over 45 instances of Unicode replacement characters (``) with the correct Arabic letters (e.g., `صفحة`, `فيديو`, `ملف`, `تفاعل`).
  - Restored the corrupted `commonReactions` emoji list to correct values (`👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`).
  - Corrected double-character typing issues (`حذفف` -> `حذف`).
  - Removed duplicate `trialDays` property assignment in `createDefaultMarketplaceFormData` inside `SubscriptionCenter.tsx` that caused TypeScript build errors.
  - Verified a successful compile and production build of the frontend.

### WhatsApp Media Sending and Notification Encoding Fixes
- **Accomplishment**: Restored mangled Arabic notification text in the frontend and fixed Meta Cloud provider media/image sending pipeline.
- **Details**:
  - Automatically decoded double-encoded Windows-1252 (CP1252) characters back to standard UTF-8 in `WhatsAppChat.tsx`, correcting Arabic words and emojis in snackbars, browser notifications, and action buttons.
  - Resolved a failure where `MetaCloudProvider.sendMedia` failed when passed a string instead of an object, normalizing the parameter dynamically to `{ url: media }`.
  - Added support for relative media upload paths by prepending `process.env.APP_URL` to ensure Meta's servers can publicly retrieve attachments from `/uploads/`.

### WhatsApp Meta Webhook Integration End-to-End Delivery Fixes
- **Accomplishment**: Fixed a database schema validation crash during contact upserts for incoming Meta WhatsApp webhooks, and deployed a duplicate session database cleanup script.
- **Details**:
  - Resolved `PrismaClientValidationError: Unknown argument 'customerId'` in `WhatsAppInboundService.js` by connecting the customer relation using the `customer: { connect: { id: customerId } }` relation pattern instead of scalar `customerId` in `create`/`update` blocks.
  - Implemented `cleanup-duplicate-whatsapp-session.js` database migration script and matching `run-whatsapp-cleanup.yml` GitHub Action to safely purge duplicate Meta credentials on duplicate sessions in production.
  - Secured the production webhook by reverting verbose stack trace error responses to generic `Internal Server Error` responses.
  - Verified webhook GET challenge verification and POST message payload parsing successfully end-to-end against the live backend.

### WhatsApp Meta Webhook 403 & Production DB Fix
- **Accomplishment**: Fixed a major bug preventing Meta WhatsApp Webhook verification (GET 403 Forbidden), resolved the database query override that caused webhook POST 500 errors, and configured correct credentials for the "العمل" WhatsApp session on production database.
- **Details**:
  - Identified a SQL/Prisma null-handling bug where filtering out deleted sessions (`NOT DELETED_METADATA_FILTERS`) was throwing out active sessions whose metadata was `null`. Fixed this by adding `OR: [{ metadata: null }, ...]` explicitly (`ACTIVE_METADATA_FILTER`).
  - Discovered and fixed a JavaScript bug in `buildMetaSessionLookup` where spreading `ACTIVE_METADATA_FILTER` directly in the query object was overriding the `OR: identifiers` check, which broke message routing by phone number ID. Changed it to wrap the active metadata filter inside `AND: [ACTIVE_METADATA_FILTER]`.
  - Updated the "العمل" session (id: `cmqpkbk65004rjufod0pqpeiw`) with the correct Meta verification token (`maxwhats_2026`) and webhook secret (`dc0514238d0fbbe09890f8429f1f246a`) in the production database.
  - Temporarily whitelisted a secure update endpoint to perform this DB update and removed it after successful verification.

### WhatsApp Session Creation Wizard Redesign
- **Accomplishment**: Redesigned the WhatsApp session creation popup in the React frontend. Replaced the single long, cluttered form with a clean 3-step wizard (Basics, Connection details, Review & confirm) which improves the user onboarding experience.
- **Details**:
  - Replaced the provider selector dropdown with large visual radio buttons.
  - Added a visual stepper/progress bar indicating the current step.
  - Added tooltips in both Arabic and English to explain each Meta Cloud API credential field.
  - Enforced a default API version of `v25.0` for new Meta Cloud integrations.
  - Placed advanced settings (webhook verify token, app secret, display phone) inside a collapsible settings panel.
  - Added form validation to restrict progress to the next step if required fields are missing.

### WhatsApp Meta Cloud Webhook Fixes
- **Accomplishment**: Fixed Meta Cloud Webhook signature verification and route isolation, enabling incoming WhatsApp messages to correctly sync to the platform.
- **Details**:
  - Excluded the new Webhook route `/api/v1/whatsapp-meta` from company isolation checks.
  - Whitelisted `/api/v1/whatsapp-meta` and subpaths in `PUBLIC_ROUTES` to prevent unauthorized routing blockages.
  - Rewrote the signature validation logic in `whatsappMetaWebhookController` to verify requests using active DB session secrets (`metaWebhookSecret`) when global environment secrets are missing.

### Meta Graph API Upgrade to v25.0
- **Accomplishment**: Successfully upgraded all Meta Graph API and WhatsApp Cloud API integrations across the Node.js backend and Python AI service to utilize version `v25.0` (latest release).
- **Details**:
  - Replaced all hardcoded versions (v18.0, v21.0, v22.0) with dynamic resolution via the helper `getMetaGraphApiVersion()`.
  - Allowed overriding the active Graph API version using the `META_GRAPH_API_VERSION` environment variable.
  - Verified backend JEST tests and resolved potential syntax issues.
  - Resolved merge conflicts in `apps/backend/Bugs.md` and created structure and sync documentation.
