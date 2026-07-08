# Latest Updates

## 2026-07-08: AI Image Generator — Image Upload + Model Fixes

### Fix 1: `res.data.data.imageUrl` Nesting Bug
- **Issue**: Frontend checked `res.data?.imageUrl` but backend returns `{ success: true, data: { imageUrl } }` → nested under `data.data.imageUrl`
- **Fix**: Changed all response reads to `res.data?.data?.imageUrl`, error reads to `res.data?.data?.message || res.data?.message`
- **Files**: `apps/frontend/src/pages/admin/AIImageGenerator.tsx`

### Fix 2: `msg.images` Null Handling
- **Issue**: `Array.isArray(null)` returns `false`, skipping extraction of images from OpenRouter response
- **Fix**: Changed guard from `Array.isArray(msg.images)` to truthy check + `Object.values` fallback
- **Files**: `apps/backend/controller/aiImageController.js`

### Fix 3: Image In URL Extraction — `msg.images` Null
- **Issue**: OpenRouter Gemini Flash Image returns `msg.images` as null but image data embedded elsewhere
- **Fix**: Added `Object.values(msg.images)` fallback when `Array.isArray` is false but `msg.images` is truthy
- **Files**: `apps/backend/controller/aiImageController.js`

### New Feature: Product Image Upload to OpenRouter
- **Issue**: User uploads product image but backend ignores it, AI invents product
- **Fix**:
  - **Backend**: Accepts `productImage` (base64 data URL), sends as `image_url` content part in user message, system prompt instructs to use reference image
  - **Frontend**: Converts `primaryImage` File to base64 via FileReader, sends as `productImage` in POST body
- **Files**: `apps/backend/controller/aiImageController.js`, `apps/frontend/src/pages/admin/AIImageGenerator.tsx`

### Deploy History
- Commit `410e3efa` → Run #448 ✅ (gallery UX)
- Commit `d2830c2f` → Run #452 ❌ cancelled, fixed in #454 ✅ (msg.images null guard)
- Commit `3dbe3b05` → Run #459 ✅ (frontend nesting fix)
- Commit `bb2c4af5` → Run #461 ✅ (product image upload)

## 2026-07-08: AI Image Generator — Full UX + Gallery

### New Features
- **Image Gallery** — grid of generated images (up to 5 cols), hover overlay for view/open/delete
- **Delete confirmation dialog** — shows image thumbnail, confirm/cancel
- **Copy URL** — copies permanent image URL to clipboard
- **Open in new tab** — opens image URL directly
- **Regenerate** — re-sends last prompt with same params without refilling form
- **Gallery auto-refresh** after each successful generation

### Backend
- `GET /api/v1/ai-image/history` — reads `uploads/ai-images/{companyId}/` dir, returns sorted file list with metadata
- `DELETE /api/v1/ai-image/:filename` — deletes file with path traversal protection

### Frontend
- `AIImageGenerator.tsx` — added gallery section + preview action buttons + delete dialog + regenerate

### Images saved to disk
- `uploads/ai-images/{companyId}/{timestamp}-{random}.{jpg|png}` — permanent URL returned instead of data URL

### Deploy
- Commit `410e3efa` → pushed to `main` → Run #448 ✅ (~5 min)

## 2026-07-08: AI Image Generator — UX Refactor

### Improvements
- **RTL-first Arabic UI** — all labels, tabs, selects, helper hints in Arabic, right-to-left
- **Tab order optimized** — platform → product → brand → copy → style → campaign → output
- **Field grouping** — related controls grouped with `Field` helper and hint text
- **Inline validation** — generate disabled until product name or headline provided; helper message explains why
- **Live aspect preview** — aspect ratio shows pixel dimensions and preview indicator per platform
- **Action row redesign** — generate + reset placed below form, reset styled as outline
- **Result area** — auto-scroll on generation, improved empty state with current dimensions
- **Transparent background guard** — switch disabled unless format is PNG, with hint
- **Gallery polish** — image error handling, hover overlay actions, badge count, refresh button
- **Delete dialog** — shows image preview before confirming deletion

### Technical
- Fixed TypeScript issues in `AIImageGenerator.tsx` (`tsc` clean)
- Added `PRODUCT.md` / `DESIGN.md` for `impeccable` context gates

### Files Modified
- `apps/frontend/src/pages/admin/AIImageGenerator.tsx`
- `PRODUCT.md`, `DESIGN.md`

## 2026-07-04: AI Skills & Tools Merchant Sidebar Section — Bug Fix

### Root Cause
`buildCompanyResponseWithOnboarding` in `companyOnboarding.js:17` was deleting `settings` from the company response entirely. The sidebar's `isFeatureEnabled('aiToolsEnabled')` could never find `company.settings` — always returned `false`.

### Fix
- **Backend** (`companyOnboarding.js`): Instead of deleting `settings`, extract `aiToolsEnabled` as a top-level boolean in the company response
- **Frontend** (`sidebar.ts`): Changed `isFeatureEnabled` to check `currentCompany.aiToolsEnabled` (direct boolean) instead of parsing `company.settings` JSON

### Files Modified
- `apps/backend/utils/companyOnboarding.js` — 2 insertions, 5 deletions
- `apps/frontend/src/config/sidebar.ts` — removed `companySettings` parsing, simplified `isFeatureEnabled`

### Deploy
- Commit `95252c1d` → pushed to `main` → Deploy to Server workflow (retry succeeded after SSH timeout)

## 2026-07-06: Order Status Change 400 Bad Request Fix

### Root Cause
When changing order status via the quick status update button, the `/api/v1/orders-new/simple/:orderNumber/status` endpoint would fail with a 400 Bad Request and the message "الحالة المستهدفة غير موجودة في تعريفات المسار". This happened because `orderWorkflowService.evaluateStatusChange` strictly validated the target status against custom `OrderStatusDefinition` records, and did not properly fallback to valid system statuses if custom definitions were missing for companies with enabled workflow configurations. Also, it improperly enforced transition rules even when `isOverride: true` was passed.

### Fix
- **Backend** (`orderWorkflowService.js`): 
  - Added a `VALID_STATUSES` fallback inside `evaluateStatusChange` to recognize standard system statuses (e.g., `CONFIRMED`, `SHIPPED`) even if they lack explicit database definitions.
  - Set `isSystemFallback: true` on the dummy status definition and configured the service to skip writing to `orderWorkflowAuditLog` (which strictly requires a foreign key relation to an existing `OrderStatusDefinition` row) if the status is a fallback.
  - Adjusted the logic to correctly bypass the `config.enforceTransitions` rule when `isOverride` is true.

### Files Modified
- `apps/backend/services/orderWorkflowService.js` — modified `evaluateStatusChange` method.
