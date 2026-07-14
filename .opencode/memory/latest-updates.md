# Latest Updates

## 2026-07-14: Hotel Booking Module (Rooms + Services) — Full Build & QA

### New Module Summary
Built a complete hotel/accommodation booking module for a client who owns a hotel and needs room reservations + extra services during stay.

### What's New
- **Prisma schema** (`apps/backend/prisma/schema/hotel.prisma`):
  - `HotelProperty`, `HotelRoomType`, `HotelRoom`, `HotelReservation`, `HotelReservationRoom`, `HotelFolioItem`, `HotelRoomRate`
  - Enums: `HotelRoomStatus`, `HotelReservationStatus`, `HotelFolioItemType`
- **Backend** (`apps/backend/controller/hotelController.js`, `apps/backend/routes/hotelRoutes.js`):
  - Full CRUD for properties, room types, rooms, reservations, folio items, room rates
  - `GET /api/v1/hotel/properties/:id/availability` with effective pricing (base + seasonal rates)
  - Transactional reservation creation with auto room assignment when `roomId` is omitted
  - Reservation status workflow: PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT, with CANCELLED
  - Room status updates automatically on check-in/check-out/cancel
  - Manual room status endpoint (`PATCH /api/v1/hotel/rooms/:id/status`) for MAINTENANCE/CLEANING
  - Folio add/remove with automatic `totalAmount` update
- **Frontend** (`apps/frontend/src/pages/admin/hotel/`):
  - `HotelManagementPage.tsx` — 5-tab admin page (Properties, Room Types, Rooms, Reservations, Folio & Rates)
  - Extracted modals to top-level components: `Modal.tsx`, `PropertyModal.tsx`, `RoomTypeModal.tsx`, `RoomModal.tsx`, `ReservationModal.tsx`, `FolioModal.tsx`, `RateModal.tsx`
  - Shared types/API helpers in `hotel/shared.ts`
  - Route `/admin/hotel/*` lazy-loaded in `App.tsx`
  - Sidebar entry gated by `hotel-app` marketplace app
  - Arabic/English locale labels added
- **Marketplace** (`apps/backend/scripts/marketplaceSeed.js`): added `hotel-app` (249 EGP/mo, 14-day trial)
- **AI Agent** (`apps/backend/agents/hotel-agent/`): `agent.json`, `SOUL.md`, `AGENTS.md`, `TOOLS.md`, `PERSONA.md`
- **Python AI Tools** (`apps/ai-service/src/tools/`):
  - `hotel_tools.py` — backend API client functions
  - `definitions/hotel.py` — Pydantic models + FunctionTool instances + `__all_tools__`
  - `role_tools.yaml` — `HOTEL` role added with 7 tools

### Bugs Found & Fixed During QA
| # | Bug | Fix |
|---|-----|-----|
| 1 | Migration SQL used `snake_case` columns (`company_id`) but Prisma expects `camelCase` (`companyId`) | Recreated tables with `hotel_fix.sql`, then updated `add_hotel_module.sql` with quoted camelCase columns |
| 2 | `createReservation` required explicit `roomId`; AI/front-end couldn't book by room type only | Auto-assign first available room of requested type if `roomId` is missing |
| 3 | Frontend modals crashed with React Rules-of-Hooks error (`renderModal()` called `useState` conditionally) | Extracted all modals into top-level components and conditionally rendered them as JSX elements |
| 4 | Folio GET route was missing | Added `getFolioItems` controller function and `GET /reservations/:reservationId/folio` |

### QA Results
- **Backend API:** 13/13 tests passed end-to-end (create property, room types, rooms, availability, reservation, confirm, check-in, folio, checkout, cancel, list, maintenance status)
- **Frontend browser:** page renders, tabs switch, modals open after refactor (tested with `admin@hotelsalam.com` test company)
- **Migration:** `npx prisma generate` passed; manual SQL migration ready at `apps/backend/prisma/migrations/add_hotel_module.sql`

### Files Modified
- `apps/backend/prisma/schema/hotel.prisma`
- `apps/backend/controller/hotelController.js`
- `apps/backend/routes/hotelRoutes.js`
- `apps/backend/server.js`
- `apps/backend/scripts/marketplaceSeed.js`
- `apps/backend/prisma/migrations/add_hotel_module.sql`
- `apps/backend/agents/hotel-agent/agent.json`, `SOUL.md`, `AGENTS.md`, `TOOLS.md`, `PERSONA.md`
- `apps/ai-service/src/tools/hotel_tools.py`
- `apps/ai-service/src/tools/definitions/hotel.py`
- `apps/ai-service/src/tools/role_tools.yaml`
- `apps/frontend/src/pages/admin/hotel/HotelManagementPage.tsx`
- `apps/frontend/src/pages/admin/hotel/shared.ts`
- `apps/frontend/src/pages/admin/hotel/Modal.tsx`
- `apps/frontend/src/pages/admin/hotel/PropertyModal.tsx`
- `apps/frontend/src/pages/admin/hotel/RoomTypeModal.tsx`
- `apps/frontend/src/pages/admin/hotel/RoomModal.tsx`
- `apps/frontend/src/pages/admin/hotel/ReservationModal.tsx`
- `apps/frontend/src/pages/admin/hotel/FolioModal.tsx`
- `apps/frontend/src/pages/admin/hotel/RateModal.tsx`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/config/sidebar.ts`
- `apps/frontend/src/locales/ar.ts` and `apps/frontend/src/locales/en.ts`

### Still To Do / Next Phase
- Production deployment: run `apps/backend/prisma/migrations/add_hotel_module.sql` on live DB
- AI Agent conversation smoke test (agent registry reload + chat)
- Add unique constraints/indexes on overlapping reservation date ranges if high concurrency expected
- Optional: online check-in form for guests, OTA channel mockup

## 2026-07-13: Responsive Design Overhaul — 1366×768 Laptop Optimization

### Phase 1: Auto-collapse Sidebar at 1366px
- **File:** `apps/frontend/src/components/layout/Layout.tsx`
- Added `isCompact` state for screens <1400px with sidebar collapsed to 80px rail
- `useEffect` with `matchMedia('(max-width: 1399px)')` — collapses on resize below threshold
- Saves/restores manual toggle preference, respects manual override over auto-collapse
- Transition: `data-collapsed` attribute on ThreeTierSidebar (300ms cubic-bezier)
- **Impact:** Frees ~200px content width on all pages at once

### Phase 2: `max-w-7xl` → `max-w-6xl 2xl:max-w-7xl` (80 pages + 4 components)
- **80 occurrences** across 40 page files updated with responsive max-w pattern
- **Pages:** Landing pages (MainAdsLanding, PlatformLanding*, EmployeesLanding, MgAgencyLeadLanding, MaxPMerchantsLanding, RestaurantThemeDemo), marketplace (AppSettings, Bundles, BundleDetails), super-admin (BillingOverview, PlatformSiteHomepageTemplates, SkillDetailPage, SuperAdminLandingPages, SuperAdminMarketingLinks), HR (CreatePromotion, EditPromotion, WarningDetails, 4 work-reporting pages), conversations (CampaignPredictionCalculator, CampaignResultsPredictor, SentMessagesStats), products (ProductNewFinal, ProductsTrash), settings (StorePages, AgentInboxKeyPage), subscription (AppPricingSheet), plus AffiliateProfile, MerchantPortalDashboard, MerchantProfileDetails, AgentWorkspace, PartnerDashboard, WhatsAppRoutingWorkspace, WooCommerceSync, CompanyActivity, MyActivity, ad pages, ErrorLogsPage, OrderWorkflow
- **Components (4 files):** FooterElite (×2), FooterLuxe (×2), AppDashboardPage, StorefrontPreviewModal
- **Pattern:** `max-w-7xl` → `max-w-6xl 2xl:max-w-7xl`

### Phase 3: Dashboard xl/2xl Grid Overrides
- **File:** `apps/frontend/src/pages/dashboard/MainDashboardPage.tsx`
  - MetricCards: `lg:grid-cols-4` → `lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`
  - Chart area: `lg:grid-cols-3` → `lg:grid-cols-3 xl:grid-cols-[minmax(0,1.5fr)_350px] 2xl:grid-cols-[minmax(0,1.8fr)_380px]`
- **File:** `apps/frontend/src/pages/dashboard/DashboardMetricRail.tsx`
  - MetricRail: `lg:grid-cols-6` → `lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10`

### Phase 4: `100vh` → `100dvh` (26 files)
- **18 files** with `calc(100vh-64px)` → `calc(100dvh-64px)`: WhatsAppChat, WhatsAppInbox, WhatsAppRoutingWorkspace, InstagramInbox, TelegramConversationsPro, POS, UnifiedCommentsSplit, AIChatPage, ManualOrderPage, 6 SuperAdmin pages (AIChatPage, AITemplates, AITemplateDetail, AIProductEmbeddings, SkillDetailPage), 4 admin agent pages (AgentCatalogPage, AgentSkillsPage, AgentTeamMapPage, AgentToolsPage)
- **6 files** with other calc heights → `100dvh`: AgentProfilesPage (140/90px), AgentGuardrailsTab (280px), PayrollTesting (300px ×3), PayrollSimulator (180px), TelegramUserbot (100px)

### Build
- `npm run build -- --filter=frontend` succeeded (dist/, 6501 modules)

## 2026-07-13: Unified Comments Page (PostsManagement.jsx) Fixes

### Fixes Applied
- **File:** `apps/frontend/src/pages/comments/PostsManagement.jsx` — complete rewrite
- **Layout:** Removed 3-column layout; middle column (page details, Delay Reply toggle, stats) moved to **settings bar at top**
- **Mobile responsive:** Desktop = 2-column (pages sidebar | posts). Mobile = collapsible pages dropdown with ChevronDown, sidebar becomes modal dialog, settings bar wraps
- **Connected dead elements:** Delay Reply toggle calls `CommentService.setPageResponseMethod()`, stats show real post data (auto-reply count, total comments), settings gear → `/posts/:postId/settings`, "التعليقات" button → `/posts/:postId/comments`, refresh button
- **Arabic text:** All text converted (timeAgo, labels, headers, placeholders, stats)
- **Error handling:** Error banner with AlertCircle icon + "إعادة المحاولة" retry button + dismiss
- **Performance:** `loading="lazy"` on images, proper loading/empty states
- **Build:** `npx eslint` passed, `npx vite build` succeeded
- **Testing:** Desktop (1440x900) + Mobile (375x812) verified — loads, renders, responsive

## 2026-07-11: WhatsApp Cloud Embedded Sign-Up (Facebook OAuth)

### New Feature
- **WhatsApp Cloud Connect page** at `/whatsapp/cloud-connect` — 3-step wizard (intro → connecting → success/error)
- **Facebook OAuth flow**: Redirect → user grants permissions → code exchange → long-lived token → WABA query → DB session
- **Backend**: `GET /facebook/config` (appId + redirectUri), `POST /facebook/connect` (code exchange + WABA provisioning)
- **Prisma**: All fields exist (`metaPhoneNumberId`, `metaWabaId`, `metaBusinessId`, `metaAccessToken`, `metaApiVersion`, `META_CLOUD` enum)
- **i18n**: Arabic/English sidebar label + page in-page text
- **`.env`**: Created `apps/backend/.env` + `apps/frontend/.env` with Facebook App credentials
- **Files modified**: `whatsappController.js`, `whatsappRoutes.js`, `App.tsx`, `sidebar.ts`, `sidebar.json`, `WhatsAppCloudConnect.tsx`, `whatsapp/index.ts`

### Still Needed
- Set real `FACEBOOK_APP_SECRET` in `apps/backend/.env`
- Add `http://localhost:3001/whatsapp/cloud-connect` to Facebook App's Valid OAuth Redirect URIs
- Enable `business_management`, `whatsapp_business_messaging`, `whatsapp_business_management` permissions (Advanced Access)

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
