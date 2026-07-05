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
