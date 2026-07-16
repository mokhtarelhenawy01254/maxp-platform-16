# Learned Patterns

## 2026-07-14 — Hotel Module: Prisma camelCase in Raw SQL Migrations

- **Problem:** The first migration SQL for hotel tables used `snake_case` columns (`company_id`) because of PostgreSQL naming convention, but Prisma expects `camelCase` (`companyId`) for all fields defined in the schema. The app failed with `column "companyId" does not exist` on queries.
- **Solution:** Use quoted camelCase column names in raw SQL migrations: `CREATE TABLE "HotelRoom" (id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE, "propertyId" TEXT, ...);`. Every camelCase column must be quoted.
- **Verification:** Run `npx prisma generate` and then hit a real endpoint that reads/writes the table; if any column name mismatch remains Prisma throws a clear DB error.

## 2026-07-14 — Hotel Module: Auto-Assign Room from Room Type

- **Problem:** Reservation creation originally required the caller to pass an explicit `roomId`. Front-end users and AI agents think in room types, not individual room IDs.
- **Solution:** In `hotelController.js#createReservation`, if `roomId` is missing for a line item, pick the first `AVAILABLE` room of that `roomTypeId` that does not have an overlapping reservation in the requested date range. If an occupied room later frees up, the same logic still works.
- **Edge case:** Multi-room bookings — each line item can either specify a `roomId` or rely on auto-assignment independently.

## 2026-07-14 — Hotel Module: Avoid Conditional Hooks in Modal Rendering

- **Problem:** `HotelManagementPage.tsx` had `renderModal()` function defined inside the component that returned JSX using `useState` hooks internally. React raised a Rules of Hooks error whenever the modal changed, causing the page to reset to the first tab instead of opening the modal.
- **Solution:** Extract every modal to a top-level component file. In the parent, use conditional JSX: `{modal?.type === 'reservation' && <ReservationModal ... />}`. This keeps hooks at component top level and avoids hook-order changes during re-renders.
- **Pattern:** Any modal that owns its own state should be a separate component, not a nested renderer function.

# Learned Patterns

## 2026-07-12 — SSH Key Generation in PowerShell (Passphrase Bug)
- **Problem:** `ssh-keygen -t ed25519 -N "mysecret" -f keyfile` in PowerShell sets the passphrase to literal `"mysecret"` (with quotes) because PowerShell passes the double-quotes as part of the argument value.
- **Solution:** Use single quotes for the `-N` argument: `-N 'mysecret'`. Or omit `-N` entirely and use stdin pipe. On Windows, `ssh-keygen` from OpenSSH for Windows interprets quoted strings literally.
- **Verification:** `ssh-keygen -y -f keyfile` prompts for passphrase — if quotes were included, entering the value without quotes fails.
- **Best practice for non-interactive CI:** Generate key with `-N '""'` (empty passphrase, single-quoted empty string) or pipe `""` via stdin.

## 2026-07-10 — TypeScript TS2367 Type Overlap in Tabs switching
- **Problem:** Adding a new literal to a locally declared `type Tab = "settings" | "guardrails"` can trigger `TS2367: This comparison appears to be unintentional because the types have no overlap` error at compile-time, even if state and interfaces are correctly declared.
- **Solution:** Cast the state variable to `string` in comparison blocks: `(tab as string) === "guardrails"`. This satisfies the compiler while preserving type safety for state functions.

## 2026-07-10 — Redis Cache invalidation in dynamic rule tables
- **Problem:** Reading dynamic agent rules on every incoming chat message creates high DB overhead. Caching them indefinitely risks serving stale configurations after updates.
- **Solution:** Implement a **write-through invalidation pattern**. Cache the entire list of parsed rules at key `guardrails:{agent_id}` with a safety TTL (e.g. 5 minutes). On any database write operation (Insert, Update, Delete/Deactivate), perform an explicit invalidation `await redis_client.delete(f"guardrails:{agent_id}")` so the next chat transaction retrieves fresh rule definitions.

## 2026-07-10 — Image Delivery Pipeline for AI Agents

### Problem
Agent Ahmed returned `landmarkImage` URLs in text but images never appeared in chat (sandbox/WhatsApp/Facebook).

### Solution — Multi-Layer Pipeline
1. **Backend URL resolution**: `getAllBranches()` constructs full `https://maxp.online/uploads/...` URLs using `req.protocol://req.get('host')`. On-read migration converts legacy base64 to file paths.
2. **Base64-to-file conversion**: `saveBase64AsFile()` in `bookingBranchesController.js` writes `data:image/...` strings to `uploads/booking-branches/` directory.
3. **Auto-populate from tool evidence**: `skills_pipeline.py` scans `ctx.tool_evidence` for `landmarkImage` in `booking_info` results and populates `ctx.response_attachments` automatically.
4. **Snapshot preservation**: `sdk_workflow.py` must carry `response_attachments` between pipeline stages (was lost during serialization).
5. **Channel delivery**: WhatsApp/Facebook handlers iterate `response_attachments` after sending text and call `sendImage()` for HTTP(S) URLs (skip `data:` URIs — only work in sandbox UI).
6. **Role access**: `PHYSIOTHERAPY` role must be in `role_tools.yaml` with `booking_info` tool for customer-facing agents.

### Lesson
When building image delivery for AI agents, trace the ENTIRE pipeline end-to-end: tool output → pipeline context → result → channel handler → send method. Each layer has its own constraints (base64 only works in browser, relative URLs need public base, channel workers need explicit media-send calls).

### Key Files
- `apps/backend/controller/bookingBranchesController.js` — `saveBase64AsFile()`, URL construction
- `apps/ai-service/src/pipeline/stages/skills_pipeline.py` — auto-populate attachments
- `apps/ai-service/src/pipeline/sdk_workflow.py` — snapshot serialization
- `apps/backend/services/whatsapp/WhatsAppInboundService.js` — channel delivery
- `apps/backend/utils/allFunctions.js` — Facebook channel delivery
- `apps/ai-service/src/tools/role_tools.yaml` — PHYSIOTHERAPY role access

## 2026-07-08 — Skill/Tool System Unification

### Problem
MaxP had two parallel systems: `ALL_TOOLS` (47 FunctionTools from `definitions/`) and `SkillRegistry` (19 Skills from `register_all.py`). Pipeline used fallback chain: `registry.get()` → `ALL_TOOLS.get()`. This caused silent failures and registration gaps.

### Solution
Unified both systems into `SkillRegistry` as single source of truth:
- `SkillRegistry.register_tool(FunctionTool)` — new method
- `SkillRegistry.resolve(name)` — single lookup, converts Skill → FunctionTool automatically
- Pipeline `_execute_one()` uses `registry.resolve()` only — no fallback
- ALL_TOOLS kept as deprecated dict for backward-compatible re-exports

### Key Files Changed
- `apps/ai-service/src/skills/registry.py` — expanded with FunctionTool support
- `apps/ai-service/src/tools/registry.py` — auto-registers tools, updated consumers
- `apps/ai-service/src/pipeline/stages/skills_pipeline.py` — removed ALL_TOOLS fallback + import
- `scripts/validate-agent-skills.js` — unified CI validation (23 agents, 31 skills, 0 errors)

### Lesson
Single-registry pattern matches 2026 industry standard (OpenAI Agents SDK, Microsoft Agent Framework). DeepSeek V4 API compatible (same OpenAI wire format).

## 2026-07-11 — AI Visual Search: Python-First Architecture

### Problem
Backend `visualSearchProduct` used a mock embedding service (`{ generateMultimodalEmbeddingAsync: async () => null }`) — always returned null. No real embeddings ever generated. Client-side cosine similarity on old `products.embeddingImage` (possibly different embedding model) returned 3% noise.

### Solution — Python-First Proxy Pattern
1. **ai-service owns all AI logic**: `POST /admin/search/visual` wraps `vector_product_search()` (Gemini embedding + pgvector + RRF fusion)
2. **Backend becomes proxy**: `visualSearchProduct` validates auth, converts file to base64, forwards to ai-service, returns results. No duplicate AI logic.
3. **DB unification**: One database (`maxp`) for all services. ai-service `.env.production` must match backend's DB (was incorrectly pointing to `maxp_ai`).

### When Adding AI Endpoints
- Node.js controller → calls `aiServiceAdminClient.xxx()` method → ai-service Python endpoint
- No direct DB queries for AI data from backend
- No embedding generation, no vector search, no ML in backend
- No mock services that silently return null

### SQL Raw INSERT in ai-service (for logging/analytics)
When writing raw SQL in Python ai-service that interfaces with a Prisma-managed DB schema:
- Use **camelCase quoted** column names: `"companyId"` not `company_id`
- Use `ON CONFLICT DO NOTHING` with deterministic IDs for idempotency (avoids duplicates from async duplicate calls)
- Quote every camelCase column: `INSERT INTO search_analytics (id, "companyId", query, "resultsCount", "wasSuccessful", "responseTime", intent, metadata)

## 2026-07-11 — Tool Result Format Fallbacks in skills_pipeline

### Problem
When the follow-up LLM call in `skills_pipeline.py` returned empty text (happens with DeepSeek when `tool_choice="none"`), the code fell back to `_format_tool_results()` which only handled a few tools (inventory_check, offers_list_active, coupon_validate, product_search, order_lookup, customer_info). Any tool not in that list — including `booking_info`, `booking_reserve_skill`, `booking_slots`, `booking_status` — printed the generic Arabic message "تم تنفيذ {tool_name} بنجاح."

### Solution
Added specific format handlers in `_format_tool_results()` for each booking tool:
- `booking_info` (line 503): formats branch name, address, phone, working days + top 5 service names
- `booking_reserve_skill` (line 530): formats booking confirmation (branch, doctor, service, date, time, price)
- `booking_slots` (line 546): formats available time slots
- `booking_status` (line 561): formats booking status details

### Pattern
When adding a new tool/skill that returns structured data and is called in the skills pipeline:
1. Add a format handler in `_format_tool_results()` at `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
2. Match on `tool_result.get("tool")` or `name`
3. Extract readable fields from the `result` dict
4. Return Arabic-formatted text

### Key Files
- `apps/ai-service/src/pipeline/stages/skills_pipeline.py` — `_format_tool_results()` function

## 2026-07-16 — Auto-Invoice Generation on Status Change
- **Problem:** `OrderInvoiceSettings.autoGenerate` and `autoGenerateOnStatus` existed in DB schema and settings UI but no backend code checked them — invoices never auto-generated.
- **Solution:** Added checks in two trigger points:
  1. `orderService.js:updateOrderStatus` → background async block (after WhatsApp notifications). Triggers when main order status matches `autoGenerateOnStatus`.
  2. `routes/orders.js` preparation status handler → background IIFE after order update. Triggers when preparation status (PACKAGED, READY_TO_SHIP, etc.) OR mapped status matches `autoGenerateOnStatus`.
- **`autoGenerateOnStatus` format:** Comma-separated status codes (e.g., `PACKAGED,READY_TO_SHIP`). Supports `*` wildcard for all status changes.
- **Files changed (both `apps/` and `maxp-platform3/`):**
  - `services/orderService.js` — added auto-invoice block
  - `routes/orders.js` — added auto-invoice block in preparation handler
  - `frontend/src/pages/settings/OrderInvoiceSettings.tsx` — added preparation statuses to dropdown

## 2026-07-16 — Company Dashboard: Responsive CSS Grid & RTL Sizing
- **Problem:** Widget cards in a responsive CSS Grid can leave empty gaps and fail to stretch, particularly under RTL layout flow. Buttons inside grid items do not automatically fill their columns if they are not explicitly styled with width utilities.
- **Solution:** 
  1. Add `grid-flow-row-dense` to the grid container to pack cells tightly and resolve large gaps.
  2. Wrap grid items in responsive column span containers (`sm:col-span-2 xl:col-span-2` instead of just desktop-only layout spans).
  3. Standardize inner elements (like card buttons) to stretch fully (`w-full`) and align text logically to start (`text-start`) instead of using hardcoded left/right alignments.
  4. Cast i18n translation function returns `t(...)` using `as string` when assigning to native HTML attributes like `title` that expect plain strings, preventing TypeScript `TS2322` errors.
  5. Avoid accessing array elements directly (e.g. `data.metrics[0].label`) without checking both the array and the item presence first, preventing `TS2532: Object is possibly 'undefined'` compilation errors.

