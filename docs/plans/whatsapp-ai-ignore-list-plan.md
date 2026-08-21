# Plan: WhatsApp AI Ignore List (Do-Not-Reply for Team Members)

**Generated**: 2026-08-21
**Estimated Complexity**: Low–Medium
**Status**: ⏳ Awaiting approval
**Owner**: Frontend + AI Service
**Estimated Sprints**: 2 (1 backend, 1 frontend + tests)

---

## 1. Goal

Allow company admins to maintain a list of phone numbers whose incoming WhatsApp messages the **AI agent must NOT auto-reply to**, while still:
- Receiving the message (visible in the inbox)
- Storing it in the conversation/thread
- Letting the team reply manually if they want

This is fundamentally different from the existing **Blocklist** (which blocks delivery at the WhatsApp API level). The new feature is an **AI behavior control**, not a delivery control.

### Use Cases
1. **Team internal comms**: CEO, support leads, sales reps messaging the WhatsApp business number should not be auto-replied to.
2. **VIP customers**: Optionally, allow opting specific customers out of AI replies.
3. **Testing**: QA team can mark their test numbers so the sandbox does not interfere with manual testing.

### Non-Goals
- This plan does **not** change Meta Cloud API webhook behavior.
- This plan does **not** affect the Blocklist.
- This plan does **not** add Telegram or Facebook ignore lists (can be added later as a separate feature).

---

## 2. UI Placement (Recommended: New Tab)

**File**: `apps/frontend/src/pages/whatsapp/WhatsAppSettings.tsx`

**Current Tabs** (6):
`[sessions] [general] [quick-replies] [business] [privacy] [labels]`

**After** (7):
`[sessions] [general] [quick-replies] [business] [privacy] [labels] [AI Agent]` ⭐

**Why a new tab**:
- Different concept from `privacy` (which is delivery-level)
- Room to grow (future: escalation rules, handoff, custom prompts per sender)
- Discoverable for company admins

**Inside the new tab** (`AI Agent`):
```
┌──────────────────────────────────────────────────┐
│  🤖 AI Agent Settings                            │
│  ────────────────────────────────────────────    │
│  ☑ Auto-reply enabled                            │
│                                                  │
│  Do-Not-Reply List  (3 numbers)                  │
│  ┌────────────────────────────────────────────┐  │
│  │ +201001234567  "Mokhtar (CEO)"      [✕]   │  │
│  │ +201007654321  "Ahmed (Sales Lead)" [✕]   │  │
│  │ +201119876543  "QA Test"            [✕]   │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [+ Add Number]  [📋 Bulk Import]                │
│                                                  │
│  ────────────────────────────────────            │
│  Skipped today: 7    •    This week: 42          │
└──────────────────────────────────────────────────┘
```

**Bulk Import Modal**:
```
┌────────────────────────────────────────┐
│  Bulk Import Phone Numbers             │
│  ────────────────────────────────────  │
│  Paste numbers, one per line:          │
│  ┌──────────────────────────────────┐  │
│  │ +201001234567, Mokhtar (CEO)     │  │
│  │ +201007654321, Ahmed (Sales)     │  │
│  │ +201119876543                    │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Format:  phone, optional label        │
│                                        │
│         [Cancel]  [Import 3]           │
└────────────────────────────────────────┘
```

---

## 3. Backend Changes (AI Service)

### 3.1. DB Migration
**File**: `apps/ai-service/migrations/versions/0026_whatsapp_ai_ignore_list.py`

```python
"""Add WhatsApp AI ignore list table."""
from alembic import op

revision = "0026_whatsapp_ai_ignore_list"
down_revision = "0025_agent_pause"  # confirm by inspecting the latest file


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS ai.whatsapp_ai_ignore_list (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL,
            phone_number TEXT NOT NULL,
            label TEXT,
            notes TEXT,
            added_by_user_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(company_id, phone_number)
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_wai_company_phone "
        "ON ai.whatsapp_ai_ignore_list(company_id, phone_number);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ai.idx_wai_company_phone;")
    op.execute("DROP TABLE IF EXISTS ai.whatsapp_ai_ignore_list;")
```

**Fields**:
| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | UUID NOT NULL | Tenant isolation |
| `phone_number` | TEXT NOT NULL | E.164 format without `+` (matches Meta's `sender_id`) |
| `label` | TEXT | Free text, e.g. "CTO", "Sales Lead" |
| `notes` | TEXT | Optional internal note |
| `added_by_user_id` | UUID | For audit |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Normalization**: Phone stored as digits only, no `+`, no `@s.whatsapp.net` (Meta sends like `201001234567`).

### 3.2. Worker Filter
**File**: `apps/ai-service/src/workers/agent_worker.py`
**Function**: `handle_whatsapp_message` (line 600)

Insertion point: after line 613 (basic validation), **before** any customer/thread creation.

```python
# --- Check AI ignore list (team members, VIP exclusions) ---
ignored = await session.execute(
    text(
        "SELECT 1 FROM ai.whatsapp_ai_ignore_list "
        "WHERE company_id = :cid AND phone_number = :pn LIMIT 1"
    ),
    {"cid": company_id, "pn": sender_id},
)
if ignored.scalar_one_or_none():
    logger.info(
        "wa_ai_reply_skipped_ignored",
        sender_id=sender_id,
        company_id=company_id,
    )
    return  # Message already saved by webhook layer; AI simply does not reply
```

**Note**: The message itself is still stored in the inbox (handled by the existing webhook pipeline before this function), so the user can see it. The worker just bails out before invoking the agent.

### 3.3. API Endpoints
**File**: `apps/ai-service/src/api/channels/whatsapp.py`

Add to the existing `router` (no new file):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/whatsapp/ai-ignore-list` | List all ignored numbers for the current company |
| `POST` | `/whatsapp/ai-ignore-list` | Add a single number (body: `phone_number`, `label?`, `notes?`) |
| `POST` | `/whatsapp/ai-ignore-list/bulk` | Bulk import (body: `[{phone_number, label?}, ...]`) |
| `DELETE` | `/whatsapp/ai-ignore-list/{id}` | Remove a number |
| `PATCH` | `/whatsapp/ai-ignore-list/{id}` | Edit label/notes |
| `GET` | `/whatsapp/ai-ignore-list/stats` | Counts: total, skipped today, skipped this week |

**Auth**: All endpoints require authenticated company session; pull `company_id` from session, never trust client.

**Phone normalization helper** (added in same file):
```python
def _normalize_phone(raw: str) -> str:
    """Strip +, spaces, dashes. Keep digits only. E.g. '+20 100-123-4567' -> '201001234567'."""
    return "".join(ch for ch in str(raw or "") if ch.isdigit())
```

---

## 4. Frontend Changes

### 4.1. New Tab in `WhatsAppSettings.tsx`

**File**: `apps/frontend/src/pages/whatsapp/WhatsAppSettings.tsx`

**Changes**:
1. Add `"ai-agent"` to the `TabId` union (line 96).
2. Add a new `TabDefinition` entry with `Bot` (or `Sparkles`) icon.
3. Add the `ai-agent` case in `tabsRequiringScopedSession` if needed (decision: do not require session, since this is company-scoped global config).
4. Add a new section: `TabPanel id="ai-agent"` containing the new component.
5. Render the new `<AIAgentSettingsTab />` component.

### 4.2. New Component
**File**: `apps/frontend/src/pages/whatsapp/components/AIAgentSettingsTab.tsx` (new, ~300 lines)

Internal subcomponents:
- `<AutoReplyToggle />` — enable/disable AI replies globally
- `<IgnoreListTable />` — list of numbers with delete buttons
- `<AddNumberDialog />` — add single number with label
- `<BulkImportDialog />` — paste multiple lines
- `<IgnoreListStats />` — skipped today / this week

**State management**: React Query (`@tanstack/react-query`) with:
- `useQuery({ queryKey: ['whatsapp-ai-ignore-list', companyId] })`
- `useQuery({ queryKey: ['whatsapp-ai-ignore-list-stats', companyId] })`
- `useMutation` for add/remove/bulk

### 4.3. Service Layer
**File**: `apps/frontend/src/services/whatsappAI.ts` (new, ~80 lines)

```ts
export const whatsappAIService = {
  list: (companyId: string) =>
    apiClient.get(`/ai/whatsapp/ai-ignore-list?company_id=${companyId}`),
  add: (companyId: string, body: { phone_number: string; label?: string }) =>
    apiClient.post(`/ai/whatsapp/ai-ignore-list?company_id=${companyId}`, body),
  bulkAdd: (companyId: string, items: Array<{ phone_number: string; label?: string }>) =>
    apiClient.post(`/ai/whatsapp/ai-ignore-list/bulk?company_id=${companyId}`, { items }),
  remove: (companyId: string, id: string) =>
    apiClient.delete(`/ai/whatsapp/ai-ignore-list/${id}?company_id=${companyId}`),
  edit: (companyId: string, id: string, body: { label?: string; notes?: string }) =>
    apiClient.patch(`/ai/whatsapp/ai-ignore-list/${id}?company_id=${companyId}`, body),
  stats: (companyId: string) =>
    apiClient.get(`/ai/whatsapp/ai-ignore-list/stats?company_id=${companyId}`),
};
```

### 4.4. i18n
**Files**:
- `apps/frontend/src/locales/ar.json`
- `apps/frontend/src/locales/en.json`

**New keys** (under `whatsappSettings`):
```json
{
  "aiAgent": {
    "tabLabel": "AI Agent",
    "tabDescription": "Control how the AI replies to WhatsApp messages",
    "autoReplyEnabled": "Auto-reply with AI",
    "autoReplyHelp": "When off, the AI does not respond to any incoming messages",
    "ignoreListTitle": "Do-Not-Reply List",
    "ignoreListHelp": "The AI will not auto-reply to messages from these numbers, but the messages will still be visible in the inbox",
    "addNumber": "Add Number",
    "bulkImport": "Bulk Import",
    "phoneNumber": "Phone Number",
    "phonePlaceholder": "+20 100 123 4567",
    "label": "Label",
    "labelPlaceholder": "e.g. CEO, Sales Lead, QA",
    "notes": "Notes",
    "empty": "No numbers on the list yet. The AI replies to everyone.",
    "remove": "Remove",
    "bulkImportTitle": "Bulk Import",
    "bulkImportHelp": "One per line. Format: phone, optional label",
    "bulkImportExample": "+201001234567, Mokhtar (CEO)",
    "confirmRemove": "Remove this number from the ignore list?",
    "statsTitle": "Skipped messages",
    "statsToday": "Today",
    "statsThisWeek": "This week",
    "statsAllTime": "All time"
  }
}
```

### 4.5. Route
The tab is internal to the existing `/whatsapp/settings` route. Activation: `/whatsapp/settings?tab=ai-agent` (already supported by `setSearchParams({ tab: tabId })` on line 906).

---

## 5. Testing

### 5.1. Backend Unit Test
**File**: `apps/ai-service/tests/test_whatsapp_ai_ignore_list.py` (new)

```python
async def test_ignored_sender_skips_ai_reply(monkeypatch, ...):
    # Setup: insert sender into ignore list
    # Action: enqueue a WhatsApp message from that sender
    # Assert: agent.process_task is NOT called
    pass

async def test_non_ignored_sender_triggers_ai_reply(...):
    # Setup: no entry in ignore list
    # Action: enqueue WhatsApp message
    # Assert: agent.process_task IS called
    pass

async def test_bulk_add_normalizes_phone_numbers(...):
    # Setup: bulk import with mixed formats (+20 100..., 20100..., 0020100...)
    # Assert: all stored as "201001234567"
    pass
```

### 5.2. Frontend Component Test
**File**: `apps/frontend/src/pages/whatsapp/components/__tests__/AIAgentSettingsTab.test.tsx` (new)

- Renders empty state
- Renders list of N items
- Opens add dialog, submits, expects list refresh
- Opens bulk import, parses CSV, expects N items added
- Removes an item with confirm

### 5.3. E2E (Optional, later)
- Company admin adds a number
- Team member sends WhatsApp message from that number
- Message appears in inbox
- AI does NOT send a reply (asserted by checking outbound message log)

---

## 6. Rollout / Migration

**Migration is additive only** (new table, no changes to existing tables). Safe to apply without downtime.

**Feature flag** (optional): Wrap the worker check in `if settings.USE_AI_IGNORE_LIST` defaulting to `True` so it can be disabled per env if a regression appears.

**Order of deployment**:
1. Run migration `0026` (creates empty table — no impact).
2. Deploy AI service with worker filter + API endpoints.
3. Deploy frontend with new tab.
4. Admins start adding numbers via UI.

**No data backfill needed** — table starts empty.

---

## 7. Risks & Open Questions

| # | Risk / Question | Mitigation |
|---|---|---|
| 1 | **Phone format mismatch** — Meta sends `201001234567`, admins may type `+20 100 123 4567` or `00201001234567` | Server-side normalization in `_normalize_phone` |
| 2 | **Multi-tenant leakage** — One company could query another's list | Strict `company_id` filter on every query; tested in test_5.1 |
| 3 | **Performance** — Adding a DB query on every incoming message | Indexed `(company_id, phone_number)` lookup, sub-ms. Negligible. |
| 4 | **Bulk import abuse** — 100k numbers in one POST | Add `MAX_BULK_SIZE = 500` per request, return 400 with count if exceeded |
| 5 | **Existing Blocklist confusion** — Users may add to wrong list | Distinct tab + clear copy: "AI will not reply. Message still arrives in inbox." vs Blocklist: "Message blocked entirely." |
| 6 | **Migration `down_revision`** — Need to confirm the actual head revision at the time of implementation | Will inspect `0025_agent_pause.py` for `revision` and `down_revision` before generating the new file |

---

## 8. File Manifest

### New Files
- `apps/ai-service/migrations/versions/0026_whatsapp_ai_ignore_list.py`
- `apps/frontend/src/services/whatsappAI.ts`
- `apps/frontend/src/pages/whatsapp/components/AIAgentSettingsTab.tsx`
- `apps/frontend/src/pages/whatsapp/components/__tests__/AIAgentSettingsTab.test.tsx`
- `apps/ai-service/tests/test_whatsapp_ai_ignore_list.py`

### Modified Files
- `apps/ai-service/src/workers/agent_worker.py` (insert filter at line ~614)
- `apps/ai-service/src/api/channels/whatsapp.py` (add 5 endpoints + `_normalize_phone`)
- `apps/frontend/src/pages/whatsapp/WhatsAppSettings.tsx` (add `ai-agent` tab + render new component)
- `apps/frontend/src/locales/ar.json` (add `whatsappSettings.aiAgent.*`)
- `apps/frontend/src/locales/en.json` (add `whatsappSettings.aiAgent.*`)

**Total**: 5 new files, 5 modified files. ~600 lines net.

---

## 9. Definition of Done

- [ ] Migration applied in dev DB; table created with index
- [ ] Worker test passes (ignored sender → no AI reply)
- [ ] API endpoints return correct data per company
- [ ] Frontend tab visible at `/whatsapp/settings?tab=ai-agent`
- [ ] Add / Bulk / Remove flows work end-to-end
- [ ] Arabic + English translations present
- [ ] Manual test: team member sends WA message → appears in inbox, AI does not reply
- [ ] No regression: non-team member still receives AI reply
- [ ] Plan reviewed and signed off by Mokhtar

---

## 10. Future Extensions (Not in Scope)

- Per-agent override (different agents ignore different lists)
- Time-based ignore (e.g., "ignore after hours for these numbers")
- Slack/email notification when ignored sender messages
- "Whisper mode" — AI prepares a draft reply for the human instead of sending
