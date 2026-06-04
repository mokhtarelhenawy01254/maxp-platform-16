# Company Onboarding Flow

## Goal

Make new company signup lead into a real, persisted onboarding journey instead of a visual-only wizard.

## Current Flow

1. `POST /api/v1/auth/register`
2. Backend provisions company defaults and seeds `company.settings.onboarding`
3. Frontend redirects the new owner to `/onboarding`
4. Wizard loads and saves progress through:
   - `GET /api/v1/company-dashboard/onboarding`
   - `PUT /api/v1/company-dashboard/onboarding`
   - `POST /api/v1/company-dashboard/onboarding/complete`
5. Dashboard reads onboarding summary from `GET /api/v1/company/dashboard`

## Persisted State

Stored under `company.settings.onboarding`.

Tracked fields:
- `status`
- `currentStep`
- `nextStepId`
- `completedSteps`
- `channelsDeferred`
- `profile.workspaceName`
- `profile.industry`
- `profile.currency`
- `profile.tone`
- `profile.whatsappNumber`
- `profile.phone`

Initial signup behavior:
- new companies now start at a real `1/4` onboarding state with `welcome` only
- the `identity` step is no longer auto-completed just because the default tone is seeded
- default company provisioning now also installs `ecommerce-basic` so the post-activation orders flow is accessible
- the registration form now accepts Arabic workspace names and trims them before submission; public storefront slugs are generated automatically from the display name instead of forcing English-only input
- the onboarding `operations` step now exposes the public storefront slug directly, including:
  - live availability checking
  - “use workspace name” slug suggestion
  - immediate slug persistence before leaving the step
- signup and activation funnel analytics now persist internally under `company.settings.funnelAnalytics`
  - registration seeds `register_completed`
  - onboarding records `started`, `step_viewed`, `step_saved`, `step_completed`, `skipped`, and `completed`
  - dashboard activation records the current launch state through `activation_viewed` and `activation_completed`

Operational scripts:
- `backend/scripts/backfillEcommerceBasic.js`
  - dry-run by default
  - use `--apply` to install `ecommerce-basic` for older active companies that still miss it
- `backend/scripts/cleanupCodexActivationTestData.js`
  - deletes the Codex onboarding / provisioning test companies created during this rollout verification

## Frontend Behavior

- Auth redirects now use onboarding state:
  - incomplete company owner -> `/onboarding`
  - completed company owner -> `/company-dashboard`
  - system roles -> `/super-admin`
- The onboarding wizard now renders inside a dedicated centered stage within `AuthLayout`, so the card stays visually centered on wide RTL screens while still relaxing to a top-aligned layout on mobile widths.
- Dashboard shows:
  - resume card while onboarding is incomplete
  - checklist based on real onboarding state instead of hardcoded items
  - activation card after onboarding completion to push the company toward first real value
- Completing onboarding clears dashboard cache before redirect so the user sees the updated state immediately.

## Activation Follow-up

After onboarding is complete, the dashboard now continues with a lightweight `activation` phase instead of dropping the user into a generic dashboard.

Tracked activation signals:
- first sellable product exists
- storefront slug / public link exists
- communication channel decision exists
- first order exists

Activation behavior:
- shows `الإطلاق الأول` card with progress and next action
- routes the owner to the next practical step:
  - `/products/new`
  - public storefront or `/settings/store`
  - `/whatsapp`
  - `/orders/manual`
- swaps the old generic quick checklist with a first-launch checklist tied to live company data
- when all four activation signals are complete, the dashboard now shows an explicit success state instead of dropping back to a generic empty top section

## Funnel Analytics

Stored under `company.settings.funnelAnalytics`.

Tracked sections:
- `register`
  - `firstCompletedAt`
  - `lastCompletedAt`
  - `source`
  - `partnerCode`
  - `promoCode`
- `onboarding`
  - `status`
  - `startedAt`
  - `completedAt`
  - `lastViewedStepId`
  - `lastSavedStepId`
  - `lastSkippedStepId`
  - per-step `viewCount`, `saveCount`, `skipCount`, `completedAt`
- `activation`
  - `status`
  - `startedAt`
  - `completedAt`
  - `lastViewedStepId`
  - `completedStepIds`
  - per-step `viewCount` and `completedAt`
- `recentEvents`
  - capped rolling log of the latest funnel events for debugging and future admin reporting

API touchpoints:
- `POST /api/v1/auth/register`
  - seeds `register_completed`
- `PUT /api/v1/company-dashboard/onboarding`
  - records `onboarding_step_saved`, `onboarding_step_completed`, or `onboarding_skipped`
- `POST /api/v1/company-dashboard/onboarding/complete`
  - records final onboarding completion
- `POST /api/v1/company-dashboard/funnel-events`
  - lightweight tracking endpoint used by frontend view-state events
  - now also accepts `X-Funnel-Event-Type` as a fallback source for the event type so tracking stays resilient even if request body parsing is inconsistent in some environments

## Internal Visibility

Super admin visibility now surfaces the funnel in two places:
- `GET /api/v1/admin/companies`
  - each company now returns a parsed `funnelAnalytics` summary
  - `frontend/src/pages/SuperAdminCompanies.jsx` shows:
    - top-level funnel counters for registered, onboarding, activation, activated, and untracked companies
    - per-company funnel status inside the companies table/cards
    - stage filters for `سجل ولم يبدأ`, `Onboarding جارٍ`, `التفعيل جارٍ`, `مفعلة`, and `بدون Funnel`
    - `آخر نشاط` derived from the latest funnel event or fallback timestamps
    - a primary quick action per company that opens the best next step:
      - `/onboarding` for setup-stage accounts
      - `/products/new`, `/settings/store`, `/whatsapp`, or `/orders/manual` for activation-stage accounts
    - follow-up saved views and stale monitoring:
      - `تحتاج متابعة الآن`
      - `متوقف 72 ساعة+`
      - per-row stale badges such as `نشط مؤخرًا`, `متوقف 24 ساعة+`, and `متوقف 72 ساعة+`
      - summary alert with CTA when stale companies exist
    - operational follow-up controls:
      - `GET /api/v1/admin/companies/follow-up-owners` returns the active internal staff who can own a stalled account
      - `PUT /api/v1/admin/companies/:companyId/follow-up` stores the assigned owner, current follow-up status, last note, the next scheduled follow-up time, and a compact history log in company settings
      - the companies table/cards now surface follow-up status badges such as `بدون مسؤول`, `بانتظار المتابعة`, `تم التواصل`, `بانتظار رد العميل`, and `تم الحل`
      - reminder-aware follow-up states now also drive:
        - `متابعتي اليوم`
        - `مستحقة الآن`
        - scheduled follow-up labels directly inside the `الرحلة` column
      - automation-aware follow-up states now also drive:
        - `تذكير مطلوب`
        - `تصعيد مطلوب`
        - `تم التصعيد`
        - saved view `تصعيد مطلوب`
      - the top of `frontend/src/pages/SuperAdminCompanies.jsx` now includes a personalized reminder CTA:
        - `لديك X متابعة مستحقة اليوم`
        - quick entry into the saved view for accounts assigned to the current admin and due today
      - the actions menu now includes `إسناد المتابعة` / `إدارة المتابعة`
      - a follow-up modal on `frontend/src/pages/SuperAdminCompanies.jsx` lets the team assign ownership, update status, leave an internal note, and schedule the next action with:
        - `datetime-local` picker
        - quick buttons for `بعد 24 ساعة`, `بعد 72 ساعة`, and `مسح الموعد`
        - inline visibility for the next follow-up time and recent history entries
        - automation controls:
          - `تسجيل التذكير`
          - `تسجيل التصعيد`
          - visibility for `آخر تذكير مسجل` و `آخر تصعيد مسجل`
- `GET /api/v1/admin/companies/:companyId`
  - company detail responses now include `funnelAnalytics`
  - company detail responses now also include parsed `followUp`
  - `frontend/src/pages/super-admin/SuperAdminCompanyDetails.jsx` shows:
    - current funnel stage
    - registration / onboarding / activation progress
    - recent funnel events timeline
  - local dev fallback added: if coupon redemption tables are missing, company details now retry without coupon joins instead of failing the whole page
- `PUT /api/v1/admin/companies/:companyId/follow-up`
  - when follow-up automation actions are logged:
    - `markReminderSent`
    - `markEscalated`
  - the backend now also:
    - creates an internal `Notification` for the assigned owner immediately
    - emits `notification:new` over socket for connected owners
    - attempts `sendBrowserPushToUser(...)` as a best-effort step when that owner has a company-scoped push context
  - follow-up update responses now include `notificationDeliveries` for debugging / verification of:
    - `notificationId`
    - `browserPush`
    - `skipped`
    - `reason`

## Verification Notes

Browser-tested on `http://localhost:3001` with backend on `http://localhost:3007`:
- new signup lands on `/onboarding`
- partial progress returns to dashboard with resume state
- completing onboarding removes resume state
- logging back in after completion goes straight to `/company-dashboard`
- completed onboarding now shows the `الإطلاق الأول` activation card
- activation CTA was tested and successfully navigated to `/products/new`
- after creating a product and a manual order, the dashboard reached full activation and now shows the `الإطلاق اكتمل` success card
- a fresh signup created after the provisioning fix now returns `activeApps` including `ecommerce-basic`
- a fresh signup created after the onboarding normalization fix now starts with `completedCount: 1` and `completedSteps: [welcome]`
- Arabic-name signup verification now succeeds with a generated slug such as `byt-alatwr-alshrqya`, while the owner still lands on `/onboarding` with `completedCount: 1`
- browser verification now also confirms that changing the slug during onboarding persists immediately; a test account advanced from `operations` to `identity` with `companySlug = dar-alqahwa-lab` and `completedCount = 2`
- after backend restart, a full browser signup -> onboarding -> dashboard run on `http://localhost:3001` produced persisted funnel analytics with:
  - `register.source = auth_register`
  - onboarding `status = completed`
  - activation `status = in_progress`
  - `recentEvents` containing `register_completed`, onboarding step events, `onboarding_completed`, and `activation_viewed`
- super admin browser verification now confirms:
  - `/super-admin/companies` shows the new funnel overview counters and per-company `الرحلة` column
  - `/super-admin/companies` now also shows the new `آخر نشاط` column plus next-step quick actions such as `استكمال الـ onboarding` and `إضافة أول منتج`
  - filtering the companies list by `التفعيل جارٍ` narrows the table to tracked activation-stage companies only
  - clicking a next-step quick action now impersonates the company admin and redirects straight to the relevant internal page such as `/products/new`
  - stale follow-up verification on local codex test companies now shows:
    - `تحتاج متابعة الآن = 3`
    - `متوقفة 24 ساعة+ = 3`
    - `متوقفة 72 ساعة+ = 1`
  - rows now show stale badges inline in the `آخر نشاط` column, e.g. `متوقف 24 ساعة+` and `متوقف 72 ساعة+`
  - follow-up verification on the same screen now confirms:
    - a tracked stalled company can be assigned to an internal owner such as `Mokhtar Mokhtar`
    - the row now shows the follow-up badge `تم التواصل` plus the owner label inline under `الرحلة`
    - opening the actions menu and choosing `إدارة المتابعة` opens a modal with:
      - current status
      - current owner
      - last updated timestamp
      - next scheduled follow-up badge / datetime
      - note field
      - recent follow-up history
    - saving a note from the modal persists immediately through `PUT /api/v1/admin/companies/:companyId/follow-up`
  - reminder-queue verification now confirms:
    - `متابعتي اليوم = 1` appears in the KPI area for the current super admin
    - a tracked company row can show `بانتظار رد العميل`, `Super Admin`, and `مستحقة الآن` together
    - forcing the `متابعتي اليوم` saved view narrows the table to `1 نتيجة`
    - a transient dev-only `useAuth must be used within an AuthProvider` HMR regression was eliminated by keeping the auth context singleton across hot reloads in `frontend/src/hooks/useAuthSimple.tsx`
  - follow-up automation verification now confirms:
    - the KPI area shows the new counters `تذكير مطلوب` and `تصعيد مطلوب`
    - a row can move from `تذكير مطلوب` to `تم التصعيد` after logging the automation action
    - `PUT /api/v1/admin/companies/:companyId/follow-up` now also supports:
      - `markReminderSent`
      - `markEscalated`
      - `clearReminderLog`
      - `clearEscalationLog`
    - follow-up responses now include:
      - `lastReminderSentAt`
      - `lastEscalatedAt`
      - matching history entries such as `reminder_sent` and `escalated`
  - follow-up notification wiring verification now confirms:
    - logging `markReminderSent` creates a real `follow_up_reminder` notification record for the owner
    - logging `markEscalated` creates a real `follow_up_escalation` notification record for the owner
    - both notifications are queryable immediately through `GET /api/v1/notifications/recent`
    - local super-admin test account in this environment has `companyId = null`, so browser push remains `best-effort` and currently returns `null` while the in-app notification still persists correctly
  - a real tracked test company appeared as `التفعيل جارٍ`
  - `/super-admin/companies/:companyId` shows both `رحلة العميل الجديد` and `آخر أحداث الـ Funnel`
