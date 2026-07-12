<<<<<<< HEAD
# Session Log — 2026-07-12 — Self-Review System (LLM-as-Judge) Full Stack

## What Happened
1. **Sprint 1 (Self-Review Engine)**: Added LLM-as-Judge quality review to `validate_reply.py` — `_get_flash_review_client`, `_self_review`, `_summarize_evidence`. Flash model checks merchant rules compliance, factual accuracy vs tool evidence, tone/language, hallucinations. Fail-open on errors.
2. **Sprint 2 (Review Log DB)**: Created `ReviewLog` model (`ai.self_review_log`) + `ReviewLogRepo` with CRUD and aggregation queries. Integrated DB logging into `_self_review` at every exit point. Migration SQL in `migrations/001_self_review_log.sql`.
3. **Sprint 3 (REST API)**: 4 endpoints in `api/admin/self_review.py` — `GET /admin/self-review/logs`, `GET /admin/self-review/stats`, `GET /admin/self-review/logs/export` (CSV), `PATCH /admin/self-review/agents/{agent_id}/review-model`.
4. **Sprint 4 (Dashboard UI)**: Full super-admin page at `/super-admin/self-review` — stats cards, Model Control Card (agent + model selector), filter bar, violations breakdown, agent summary table, log table with pagination, CSV export. Arabic/English i18n. Lazy route + sidebar.
5. **Per-agent review model**: `Agent.config.reviewModel` JSONB field. PATCH endpoint updates it. Engine reads it first. Dashboard has dropdown for it.
6. **Verification**: 26/26 pipeline tests pass (same 1 pre-existing failure in test_followup_empty_falls_back_to_tool_results).

## Key Files
- `apps/ai-service/src/pipeline/stages/validate_reply.py` [MODIFIED — self-review engine + DB logging]
- `apps/ai-service/src/db/models/review_log.py` [NEW]
- `apps/ai-service/src/db/models/__init__.py` [MODIFIED — ReviewLog import]
- `apps/ai-service/src/db/repo/review_log_repo.py` [NEW]
- `apps/ai-service/src/api/admin/self_review.py` [NEW]
- `apps/ai-service/src/api/admin/__init__.py` [MODIFIED — register router]
- `apps/ai-service/migrations/001_self_review_log.sql` [NEW]
- `apps/frontend/src/pages/super-admin/SuperAdminSelfReviewLogs.tsx` [NEW]
- `apps/frontend/src/services/selfReviewService.ts` [NEW]
- `apps/frontend/src/locales/{ar,en}/sections/superAdmin.json` [MODIFIED — i18n]
- `apps/frontend/src/App.tsx` [MODIFIED — lazy route]
- `apps/frontend/src/components/layout/SuperAdminSidebar.tsx` [MODIFIED — sidebar link]
- `docs/agentic_ai_planning/self-review-system-plan.md` [MODIFIED — updated file listing + Sprint 5]

## Remaining
- Apply migration: `psql -d yourdb -f apps/ai-service/migrations/001_self_review_log.sql`
- Monitor PM2 logs after deploy for latency (target: <500ms avg)

---
=======
# Session Log — 2026-07-11 — WhatsApp Cloud Embedded Sign-Up (Facebook OAuth)

## What Happened
1. **Goal**: Build WhatsApp Cloud Embedded Sign-Up feature — one-click Facebook OAuth to connect WhatsApp Business API.
2. **Frontend**: Created `WhatsAppCloudConnect.tsx` with 3-step wizard (intro → connecting → success/error), Facebook login button, session name input, method comparison card, callback handling from URL params, and unconfigured warning alert.
3. **Routing**: Added lazy import + route `/whatsapp/cloud-connect` in `App.tsx`, sidebar menu item with `GlobeAltIcon`, i18n keys in Arabic/English.
4. **Backend Routes**: `GET /facebook/config` → returns `{ appId, redirectUri, configured }`, `POST /facebook/connect` → exchanges OAuth code → long-lived token → queries WABA/phone numbers → creates `WhatsAppSession` in DB.
5. **Controller**: `getFacebookConfig` computes redirect URI from `FRONTEND_URL` env, `facebookConnect` calls Graph API v25.0 (from `META_GRAPH_API_VERSION` env var) for token exchange, business lookup, WABA query, and DB insert.
6. **Environment**: Created `apps/backend/.env` and `apps/frontend/.env` with Facebook App credentials, `FRONTEND_URL`, `META_GRAPH_API_VERSION`.
7. **OAuth Config**: Created `data/facebook-oauth-config.json` with permissions and webhook settings.
8. **Validation**: Verified all Prisma fields exist (metaPhoneNumberId, metaWabaId, metaBusinessId, metaAccessToken, metaApiVersion, META_CLOUD enum). Verified route mounting in server.js line 681. Verified redirect URI construction uses `envConfig.frontendUrl`.

## Key Files Modified / Created
- `apps/frontend/src/pages/whatsapp/WhatsAppCloudConnect.tsx` [NEW]
- `apps/frontend/src/pages/whatsapp/index.ts`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/config/sidebar.ts`
- `apps/frontend/src/locales/*/sections/sidebar.json`
- `apps/backend/controller/whatsappController.js`
- `apps/backend/routes/whatsappRoutes.js`
- `apps/backend/data/facebook-oauth-config.json` [NEW]
- `apps/backend/.env` [NEW]
- `apps/frontend/.env` [NEW]

## Still Needed (user action)
- Set real `FACEBOOK_APP_SECRET` in `apps/backend/.env`
- Register redirect URI `http://localhost:3001/whatsapp/cloud-connect` in Facebook App settings
- Enable `business_management`, `whatsapp_business_messaging`, `whatsapp_business_management` Advanced Access

---

>>>>>>> 581942ce (feat: WhatsApp Cloud Embedded Sign-Up (Facebook OAuth))
# Session Log — 2026-07-10 — Merchant Agent Guardrails & Dynamic Learning System

## What Happened
1. **Goal**: Implement a database-backed, semantic-RAG-filtered guardrail architecture allowing merchants to correct and train their agents directly from the dashboard.
2. **Database & Migration**: Created `AgentGuardrailRule` model and ran Alembic migration `5049cf2020f5_add_agent_guardrail_rules` to create the `ai.agent_guardrail_rules` table.
3. **AI Logic (Python)**:
   - Built `MerchantRuleGuardrail` for vector cosine similarity matching (with a robust keyword fallback matcher for offline/local states) and markdown table formatting.
   - Built `GuardrailTranslator` to translate raw dialect text to Modern Standard Arabic Excuse/Rebuttal/Action JSON via Gemini 2.5 Flash and identify semantic conflicts (> 0.85).
   - Injected relevant guardrails into prompt assembler (`assembler.py`) at priority 1.5 and wired violation hook in `validate_reply.py` to trigger silent takeover escalation (`ctx.escalation_requested = True`).
4. **Backend Layer (Express)**: Utilized the existing Express `/api/v1/ai-admin` proxy route to redirect all requests to FastAPI, avoiding the need for dedicated Express controller/route files.
5. **Frontend Dashboard UI**: Built `AgentGuardrailsTab.tsx` with rule CRUD grid, conflict warn dialog, and inline sandbox playground chat. Integrated it as "القواعد والتعلم" in `AgentProfilesPage.tsx`.
6. **TypeScript Fix**: Resolved TS2367 comparison error on custom `Tab` type enum by casting `(tab as string) === "guardrails"`.
7. **Verification**: Created unit tests (`test_merchant_rules.py`) and API router integration tests (`test_admin_guardrails.py`). Executed pytest and verified 13/13 tests passed successfully.

## Key Files Modified / Created
- `apps/ai-service/src/db/models/guardrail.py` [NEW]
- `apps/ai-service/src/db/repo/guardrail_repo.py` [NEW]
- `apps/ai-service/src/guardrails/merchant_rules.py` [NEW]
- `apps/ai-service/src/guardrails/translator.py` [NEW]
- `apps/ai-service/src/api/admin/guardrails.py` [NEW]
- `apps/ai-service/tests/unit/test_merchant_rules.py` [NEW]
- `apps/ai-service/tests/api/test_admin_guardrails.py` [NEW]
- `apps/frontend/src/pages/admin/agent-profiles/AgentGuardrailsTab.tsx` [NEW]
- `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx`
- `apps/ai-service/src/context/assembler.py`
- `apps/ai-service/src/pipeline/stages/validate_reply.py`
- `backend/Bugs.md`
- `backend/Structure.md`
- `backend/TEAM_SYNC.md`

---

# Session Log — 2026-07-10 — WhatsApp Business Trial Reset Fix

## What Happened
1. **Problem**: WhatsApp page kept returning 403 "انتهت الفترة التجريبية لـ WhatsApp Business API" after every deploy.
2. **Root cause**: `marketplaceSeed.js:1171-1190` migration code copies `whatsapp-integration` CompanyApp → `whatsapp-business` on every deploy. PostgreSQL `updateMany` returns MATCHED count (7), not MODIFIED count, so guard `if (count > 0)` always passes → overwrites `whatsapp-business` status='TRIAL' and expired `trialEndsAt` each deploy.
3. **Fix**: Added `isActive: true` to `updateMany` WHERE clause so it only matches apps NOT already hidden. All 7 old apps are `isActive: false` → migration skipped forever.
4. **Server fix**: Manually set `whatsapp-business` CompanyApp to `ACTIVE` with null `trialEndsAt`.
5. **Deploy**: Commit `c205ba18` → run 29070510073 ✅ (6m12s). Confirmed stable after deploy.

## Key Files Modified
- `apps/backend/prisma/seeds/marketplaceSeed.js` — added `isActive: true` to updateMany guard

## Key Decision
- Recorded in `decisions.md` as WhatsApp Seed Guard Pattern

---

# Session Log — 2026-07-10 — Appointments Booking Page UI/UX Enhancements

## What Happened
1. **Design Review**: Reviewed layout, filters row, and time-slot selection in the Appointments admin page (`/admin/booking/appointments`).
2. **Modeless Notification (Undo Pattern)**: Replaced primitive browser-native `window.confirm` for status changes in `AppointmentsTab.tsx` with a modern, non-blocking toast notification (`toast` from `sonner`) supporting a **تراجع (Undo)** action.
3. **Visual Time-Slot Picker**: Overhauled the time-slot picker in `AppointmentModal.tsx` by replacing the standard HTML select dropdown with a premium visual grid of slot buttons. Styled unavailable/occupied slots with line-throughs and muted backgrounds, and styled selected slots with high-contrast active backgrounds.
4. **Collapsible Advanced Filters**: Cleaned up the filters header in `AppointmentsTab.tsx` by wrapping secondary filters (status, dates, quick dates) in a collapsible advanced filters drawer toggled via a brand button with active filters count.
5. **Branch Filter Relocation**: Moved the Branch filter dropdown to the top filters row next to "تصفية متقدمة" for quick access and improved appearance, removing the duplicate branch select from the advanced panel.
6. **Scrolling Restore**: Added `h-full overflow-y-auto` to the outer container in `BookingManagementPage.tsx` to restore vertical scrolling, solving viewport clipping caused by `overflow-hidden` on the layout main wrapper.
7. **Redundant Header/Tabs Removal**: Removed redundant top page header and page-level tabs list from `BookingManagementPage.tsx` since the sidebar layout already provides separate navigation items for each tab.

## Key Files Modified
- `apps/frontend/src/pages/admin/BookingManagementPage.tsx`
- `apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx`
- `apps/frontend/src/pages/admin/booking/AppointmentModal.tsx`
- `backend/Bugs.md`
- `backend/TEAM_SYNC.md`

---

# Session Log — 2026-07-08 — Swan AI Image Generation Test + Debugging

## What Happened
1. **Deploy #437** (f0e4cb70) — initial image gen deployed, 2nd try
2. **Swan test #1** — generated image, returned empty `imageUrl` despite 1120 image_tokens
3. **Root cause #1**: Backend controller queried wrong schema (`ai.ai_keys` instead of `public.ai_keys`), wrong column (`key_value` instead of `apiKey`). Fixed.
4. **Deploy #441-443** — image URL extraction from `msg.images[0].image_url.url` confirmed working via SSH logs (503,639 char base64 data URL)
5. **Deploy #446** — image save to disk (`uploads/ai-images/{companyId}/{filename}`) deployed
6. **Swan test #2** — ✅ image generated + displayed + downloaded successfully
7. **Deploy #448** — Gallery (history, copy, delete, regenerate) deployed
8. **Issue**: Gallery showed 0 images because `uploads/ai-images/` dir was wiped by deploy
9. **Root cause #2**: `res.data?.data?.imageUrl` → frontend checked wrong nesting path
10. **Root cause #3**: `msg.images` could be `null` — `Array.isArray(null)` = `false`
11. **Swan test #3** — ✅ image generated with permanent URL + all action buttons working
12. **New feature**: Profile image upload support — backend accepts productImage, sends as reference to OpenRouter
13. **Deploy #461** — deployed (includes nested fix + null guard + product image upload)

## Key Files Modified
- `apps/backend/controller/aiImageController.js` — 5x (config, msg.images null guard, productImage, logging)
- `apps/frontend/src/pages/admin/AIImageGenerator.tsx` — 3x (nested imageUrl fix, productImage base64, lastParams)
- `.opencode/memory/latest-updates.md`
- `.opencode/memory/session-log.md`

## Server
- Host: 153.92.223.119
- PM2: maxp-backend (log: /var/www/backend2/logs/out-1.log)
- Deploy: main push → GitHub Actions "Deploy to Server"

---

# Session Log — 2026-07-08 — AI Company Consumption Dashboard

## New Feature: Super Admin AI Consumption Dashboard
- **Route:** `/super-admin/ai-consumption`
- **Backend:** `GET /api/v1/super-admin/ai/company-consumption` in `superAdminRoutes.js:881`
- **Frontend:** `SuperAdminAIConsumption.tsx` → KPIs (total cost, requests, active companies, error rate) + model distribution chart + sortable/filterable companies table
- **Sidebar:** "استهلاك الشركات" under AI Models group in SuperAdminSidebar.tsx
- **Data source:** Aggregates `AiProviderLog` (groupBy companyId/provider/model/status) + token estimates from `metadata` JSON + `modelCosts.js` for cost calculation
- **Lesson:** `Company` model has no `nameEn` field in Prisma schema — caused 500 error on first deploy. Fixed by removing `nameEn` from query and frontend type.

---

# Session Log — 2026-07-07 — AppDashboardPage Suspense Fix + reportWebVitals Fix

## reportWebVitals Adblocker Crash Loop
- **Issue:** Storefronts (like `swan.maxp.online`) stuck in infinite reload loop (`?__maxp_cache_recovery=...`)
- **Root cause:** Dynamic import of `./utils/reportWebVitals` blocked by adblockers (chunk has "vitals" in name) → Vite preload error handler triggers page reload → blocked again → infinite loop
- **Fix:** Removed the unused `reportWebVitals` dynamic import from `main.tsx`. The actual logging was commented out, so the import was dead code.
- **Files:** `apps/frontend/src/main.tsx`, `backend/Bugs.md`, `backend/TEAM_SYNC.md`

## AppDashboardPage Suspense Boundary
- **Issue:** `Cannot read properties of undefined (reading 'default')` crash navigating to `/apps`
- **Root cause:** `AppDashboardPage` loaded via `React.lazy()`. Two of three rendering locations in Layout.tsx (sidebar-full at L641, sidebar-right at L718) wrapped it **without** `<React.Suspense>`. The first location (L550) had it correctly. Depending on which layout path was used, the lazy component was rendered outside a Suspense boundary.
- **Fix:** Wrapped both occurrences with `<React.Suspense fallback={<ContentSkeleton />}>`
- **Verification:** Built successfully (`✓ built in 55.18s`), Layout chunk hash changed
- **Add translations:** Added missing `aiImageGenerator` and `profitabilityEngine` translation keys (already added to the new location, removed from old)
- **Commit:** `89bc7f2` → pushed to `main`

## Key Lessons
- 3 rendering locations for same lazy component = 3 Suspense boundaries needed
- Always check ALL layout branches when a lazy component is used conditionally
- The `vite:preloadError` handler prevents crash but Suspense is the correct fix for lazy components

---

# Session Log — 2026-07-06 — Analytics Status Filtering + Clickable Orders

## Changes
1. **Backend** (`analyticsController.js`): Added `ORDER_STATUS_VALUES` set to filter out payment statuses (PAID, PARTIALLY_PAID, FAILED) from analytics report queries at 3 endpoints
2. **Frontend** (`StatusSummaryReport.tsx`): Added `useNavigate`, changed status API call to include `statusType: order`, made order rows clickable navigating to `/orders/details/{orderNumber}`

### Deploy
- Commit `264363d54` → pushed to `main` → Deploy to Server workflow completed in 5m51s ✓

# Session Log — 2026-07-05 — Part 2

## AI Templates Companies Feature

### Built
1. **Python endpoint** `GET /admin/agent-templates/{slug}/companies` — lists companies using a template with per-field diff (modified/added/removed) comparing agent values to template defaults
2. **Express routes** — GET companies, PUT update, DELETE archive company agents
3. **Frontend "الشركات" tab** — table with company name, agent, status, version, diff count; expandable diff details
4. **EditCompanyAgentDialog** — modal for editing company-specific overrides (model, soul, rules, tools, skills)

### Files Modified
- `apps/ai-service/src/api/admin/agents_schemas.py` — 3 new Pydantic schemas
- `apps/ai-service/src/api/admin/agents.py` — new endpoint + imports
- `apps/backend/services/aiServiceAdminClient.js` — getTemplateCompanies()
- `apps/backend/routes/superAdminRoutes.js` — 3 new routes
- `apps/frontend/src/pages/super-admin/SuperAdminAITemplateDetail.tsx` — CompaniesTab component, editCompanyTarget dialog
- `apps/frontend/src/pages/super-admin/SuperAdminAITemplatesDialogs.tsx` — EditCompanyAgentDialog

### Verification
- Python AST parses ✓
- Express scripts parse ✓
- Route registration confirmed via FastAPI route list ✓
- Schema JSON serialization tested ✓

### Code review notes
- EditCompanyAgentDialog sends `allowed_channels` but Python field is `channels` — fixed by not sending it and relying on `allowed_tools`/`allowed_skills` send only
- `aiAdminProxyRoute` is at `express mount /api/v1/ai-admin → Python /admin/*`

---

# Session Log — 2026-07-04

## Facebook AI Auto-Reply Fixes — Final Summary

### Issues Fixed

1. **Prisma module path** — `silentEscalationService.js` used wrong path `../prisma/client`, fixed to `./sharedDatabase`
2. **getIO undefined** — Destructured import loses `this`, fixed to `socketService.getIO()`
3. **Python NoneType** — `dict.get(key, [])` returns `None` if key exists with null JSONB value. Fixed with `or []` at 4 locations
4. **Missing category field** — activityLog.create() required `category` and `description`
5. **field typo** — `details` → `metadata` in activityLog.create()
6. **Default model** — changed to `deepseek-chat` to avoid Groq 429 rate limits
7. **reply_to in Graph API v25.0** — Facebook's v25.0 API rejects `reply_to` in message object. Disabled.

### ياسمين Agent Configuration

- Changed channels from `["messenger"]` to include `"facebook"`
- Added `provider: "DEEPSEEK"` and `keyId` to config
- Model: `deepseek-v4-flash`

### Root Causes Discovered

1. Auto-reply saved AI response to DB but `sendFacebookMessage()` failed due to `reply_to` in Facebook API v25.0
2. ياسمين had `"messenger"` in channels but channel resolution looked for `"facebook"`
3. ياسمين had no `provider`/`keyId` in config, causing `ensure_client()` to fall back to generic routing

### Files Modified

- `apps/backend/services/silentEscalationService.js` — Prisma path, socketService import, category/description, details→metadata
- `apps/ai-service/src/api/chat.py` — `or []` guards (2 places)
- `apps/ai-service/src/pipeline/checkpointer.py` — `or []` guards (2 places)
- `apps/ai-service/src/pipeline/sdk_workflow.py` — `or []` guard
- `apps/backend/utils/production-facebook-fix.js` — Disabled `reply_to`
- `apps/ai-service/.env` — `DEFAULT_MODEL=deepseek-chat`
- Database: `ai.agents` table — channels and config for agent_LSqKxvBVSJL2AO7ItWQKZQ

### Server Access
- Host: 153.92.223.119 / srv974554.hstgr.cloud
- Backend: root + Mokhtar1234@#
- DB: appuser + mokhtar1234
- PM2: maxp-ai-service, maxp-backend, maxp-webhook-worker

---

# Session Log — 2026-07-05

## 5 Medical Human Agents (Named Personas)

### Agents Created (20 files total)
Each under `apps/backend/agents/<slug>/` with agent.json, SOUL.md, TOOLS.md, AGENTS.md:

| # | Agent | Slug | Persona |
|---|-------|------|---------|
| 1 | شهد — استشارية تجميل | aesthetic-advisor | MEDICAL_CENTER |
| 2 | أحمد — منسق علاج طبيعي | physio-coordinator | PHYSIOTHERAPY |
| 3 | مروة — منسقة أسنان | dental-care-specialist | MEDICAL_CENTER |
| 4 | كريم — مستشار تحاليل | medical-lab-analyst | MEDICAL_CENTER |
| 5 | يارا — منسقة دعم نفسي | mental-health-counselor | MEDICAL_CENTER |

### Deployment
- All template files SCP'd to `/var/www/backend2/agents/` on 153.92.223.119
- Templates seeded via `POST /admin/agent-templates` (all 5 CREATED)
- Quick profiles written directly to `systemSettings.agentQuickProfiles` via SQL (locks: lockIdentity=false, lockPersona=true, lockRules=true, lockCustomPrompt=true)
- Physio-coordinator agent already ACTIVE on physio company (cmqpbuw3y3oq1ju40or3mr8it). Filled missing soul/config/rules columns.

### Bugs Fixed
1. **booking_tools.py packages location** — packages nested in `branchServices[].packages`, not on service directly. Fixed and deployed.
2. **knowledge_search empty** — Physio company had 0 FAQs/Policies. Created 6 policies, backfilled embeddings. Now 6/6 in ai.knowledge_embeddings.
3. **booking_packages skill was thin wrapper** — Redesigned to aggregate pricing with `single_price`/`per_session`/`has_multi_session_packages`. SKILL.md made dynamic (no hardcoded prices). Descriptions to English.

### Key Decisions
- Skill handlers must add value over their dependency tools (per 2026 pattern)
- Tool/skill descriptions in English (machine-readable), SOUL content in Arabic
- Multi-session pricing lives in Policies (FAQ/POLICY), not booking system packages (single-session only for physio company)
- MaxP's 4-file agent contract + progressive disclosure matches 2026 OpenAI Agents SDK standard

---

# Session Log — 2026-07-11 — Visual Search Overhaul (Mock → ai-service Proxy) + Super Admin Monitoring

## What Happened

### Part 1: Super Admin Visual Search Monitoring Page
1. **Goal**: Add monitoring page for visual search analytics (success/fail rates, latency, results)
2. **Python**: Added `_log_search_analytic()` to `vector_product_search.py` — writes to `search_analytics` table with company_id, query, results_count, was_successful, latency, metadata (top_score, image_present, embedding_provider)
3. **Backend**: `GET /super-admin/ai/visual-search-logs` with pagination, filtering (days/company/status), summary stats
4. **Frontend**: `SuperAdminVisualSearchLogs.tsx` — summary cards, filter row, logs table, detail dialog, pagination
5. **Routing**: App.tsx lazy import + SuperAdminSidebar.tsx link

### Part 2: Bug Rescue — Silent Logging Failures
1. **Bug 1 — camelCase mismatch**: `_log_search_analytic()` raw SQL used `company_id`, `results_count` but DB columns are `"companyId"`, `"resultsCount"`. Fixed with quoted column names.
2. **Bug 2 — duplicate entries**: `vector_product_search()` called twice per request (Stage 0 pipeline + tool call). Fixed with deterministic SHA-256 dedup key + `ON CONFLICT (id) DO NOTHING`.
3. **Bug 3 — silent exception**: `asyncio.ensure_future()` with `try/except` swallowed all errors. No one checked logs for `search_analytic_log_failed`.

### Part 3: 3% Similarity Root Cause — Missing `ai.product_embeddings`
1. **Local DB `maxp`**: Table didn't exist, pgvector not installed. Created table with TEXT columns (not vector), backfilled 49/49 products.
2. **Production DB `maxp`**: Already had table (331 products) with pgvector + image_embeddings. Direct pgvector test = 83-100%.
3. **Real root cause**: `visualSearchProduct` at `productController.js:3691` uses mock `{generateMultimodalEmbeddingAsync: async () => null}` — always returns null. No real embedding ever generated.

### Part 4: Fix — Python-First Architecture
1. **ai-service**: Added `POST /admin/search/visual` endpoint wrapping `vector_product_search` (real Gemini embedding + pgvector + RRF fusion)
2. **Backend**: Rewrote `visualSearchProduct` to convert file to base64 and proxy to ai-service via `aiServiceAdminClient.visualSearch()`. Removed dead `cosineSimilarity`.
3. **Live test**: Image search → 75.04% exact match, Text search → 63.55% top match (vs 3% before)

### Key Decisions
- All AI visual search logic moved to Python ai-service (2026 direction)
- Backend becomes proxy (validate → forward → return)
- Database unified: all services use `maxp` (production `.env.production` already points there, just the ai-service `.env.production` was stale)
- New pattern: `backend/controller` AI features call `aiServiceAdminClient.xxx()` instead of implementing locally

### Key Files Changed
- `apps/ai-service/src/tools/vector_product_search.py` — `_log_search_analytic()`, dedup, direct `generate_embedding_with_provider()`, asyncio.ensure_future logging
- `apps/ai-service/src/api/admin/search.py` [NEW] — `POST /admin/search/visual` endpoint
- `apps/ai-service/src/api/admin/__init__.py` — registered search router
- `apps/backend/controller/productController.js` — rewrote visualSearchProduct as proxy, removed mock, removed cosineSimilarity
- `apps/backend/services/aiServiceAdminClient.js` — added `visualSearch()` method
- `apps/backend/routes/superAdminRoutes.js` — GET /super-admin/ai/visual-search-logs
- `apps/frontend/src/pages/super-admin/SuperAdminVisualSearchLogs.tsx` [NEW]
- `apps/frontend/src/App.tsx` — lazy import + route
- `apps/frontend/src/components/layout/SuperAdminSidebar.tsx` — sidebar link

### Server
- Host: srv974554.hstgr.cloud (153.92.223.119)
- PM2: maxp-ai-service, maxp-backend, maxp-webhook-worker
- DB: `maxp` with pgvector, 331 products, 86 Swan image_embeddings
- Deploy: commit `90864f65` → GitHub Actions → success
