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
