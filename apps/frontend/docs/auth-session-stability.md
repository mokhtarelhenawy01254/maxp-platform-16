# Auth Session Stability

## Problem

Users could be forced back to `/auth/login` even while their account should still be considered active.

## Root Causes

- `accessToken` expires after `24h`, but `AuthProvider` used to clear the whole session immediately when it noticed the token had expired locally or when `/auth/me` returned `401/403`.
- `apiClient` tried to refresh on `401`, but if that refresh failed for a transient backend reason, it still treated the failure as a real logout case.
- The backend `/auth/refresh` endpoint returned `401` for every failure path, including temporary Prisma/database availability problems, which made frontend clients think the refresh token itself was invalid.
- The shared Prisma layer could still surface `Engine is not yet connected` after a disconnect window because many callers received the raw shared client instance directly, which bypassed the reconnect guard on subsequent queries.

## Fix

- Added shared frontend refresh logic in `frontend/src/utils/sessionRefresh.ts`.
- `frontend/src/hooks/useAuthSimple.tsx` now attempts a refresh before clearing stored auth state.
- `frontend/src/services/apiClient.ts` now preserves the session when refresh fails for transient reasons and only forces logout for real auth failures.
- `backend/controller/authController.js` now distinguishes:
  - `401` for invalid refresh tokens
  - `503` for temporary auth/database availability failures
  - `500` for unexpected refresh handler failures
- `backend/services/sharedDatabase.js` now routes `getSharedPrismaClient()` calls through a persistent guarded proxy so queries re-check connection state before execution, and shared disconnects mark the connection as stale so the next request reconnects cleanly.
- `frontend/src/utils/tokenManager.ts` now backfills legacy `token` storage into the canonical `accessToken` key and keeps both keys mirrored during the migration window so older sessions do not break.
- High-traffic frontend surfaces that were still reading `localStorage.getItem("accessToken")` directly have started moving to `tokenManager`, including:
  - `frontend/src/App.tsx`
  - `frontend/src/components/ProtectedRoute.tsx`
  - `frontend/src/components/ActiveUsersMonitor.jsx`
  - task surfaces like `KanbanBoard`, `CalendarView`, `TaskNotifications`, `TaskTemplates`, `TimeReports`, `TaskDetails`, and `TaskDetailsModal`
- Additional owner/admin surfaces now use the same centralized token path:
  - `frontend/src/pages/platform-integrations/InternalIntegrations.tsx`
  - `frontend/src/pages/platform-integrations/GoogleSheetsIntegration.tsx`
  - `frontend/src/pages/products/EasyOrdersImport.tsx`
  - `frontend/src/pages/woocommerce/WooCommerceSync.tsx`
  - `frontend/src/pages/woocommerce/hooks/useWooCommerceImport.ts`
  - `frontend/src/pages/woocommerce/hooks/useWooCommerceSettings.ts`
  - `frontend/src/pages/woocommerce/hooks/useWooCommerceExport.ts`
  - `frontend/src/pages/woocommerce/hooks/useWooCommerceImportEnhanced.ts`
  - `frontend/src/pages/woocommerce/hooks/useWooCommerceProducts.ts`
  - `frontend/src/pages/woocommerce/hooks/useWooCommerceStatus.ts`
  - `frontend/src/pages/super-admin/DevTaskDetails.tsx`
  - `frontend/src/pages/super-admin/DevTasksList.tsx`
  - `frontend/src/pages/super-admin/SubscriptionCenter.tsx`
- The remaining `frontend/src/pages/super-admin` auth consumers were also migrated to `tokenManager`, including:
  - `ActiveTimers`
  - `DatabaseMigration`
  - `DevDashboardUnified`
  - `DevKanbanBoard`
  - `DevLeaderboard`
  - `DevProjects`
  - `DevReleases`
  - `DevTaskForm`
  - `DevTaskSettings`
  - `DevTeam`
  - `EscalationHistory`
  - `StaffCompanyAccess`
  - `SystemMonitoring`
- `frontend/src/components/ProtectedRoute.tsx` also no longer declares a `useEffect` inside a conditional auth branch, which removes a fragile hook-order violation from the login redirect path.
- A final sweep migrated the remaining direct auth consumers in `frontend/src` to `tokenManager` too, including:
  - AI and diagnostics surfaces such as `components/ai/ResponseRulesSettings`, `pages/ai/AIManagement`, `components/FacebookDiagnostics`, and `pages/DebugAuth`
  - operational pages such as `pages/AlertSettings`, `pages/ReportsPage`, `pages/EmployeeStatsReport`, `pages/PageEngagementStats`, `pages/QualityDashboard`, `pages/coupons/Coupons`, and `pages/products/WooCommerceImport`
  - inventory, shipping, and task integrations surfaces such as `components/inventory/UpdateInventoryDialog`, `pages/shipping/ShippingCompanies`, and `pages/tasks/components/TaskIntegrationsTab`
  - shared services/utilities such as `services/companyAwareApi.ts`, `services/errorTracking.ts`, and `utils/printPreparationSlip.ts`
- Focused search now shows:
  - no remaining direct `localStorage/sessionStorage accessToken` reads, writes, or removals anywhere under `frontend/src`
  - no remaining direct legacy `localStorage/sessionStorage token` reads, writes, or removals anywhere under `frontend/src`

## Verification

- Focused auth/session tests passed earlier for refresh and legacy token migration.
- Additional live smoke test on `http://127.0.0.1:3001/tasks/templates` succeeded with a legacy-only session:
  - only `localStorage.token` was seeded before navigation
  - `accessToken` was auto-created from the legacy token
  - the page stayed on `/tasks/templates`
  - the `قوالب المهام` heading rendered
  - no redirect to `/auth/login` occurred
- Screenshot: `H:/max_p_new/tmp-auth-legacy-tasks-templates.png`
- Additional live smoke test on `http://127.0.0.1:3001/platform-integrations` also succeeded with a legacy-only session:
  - `#google-sheets` loaded successfully
  - `accessToken` was auto-created from the legacy token
  - the Google Sheets panel rendered its heading and preview action
  - switching to the `الربط الداخلي` tab from inside the page worked without redirecting to login
- Additional live smoke test on `http://127.0.0.1:3001/platform-integrations#woocommerce` also succeeded with a legacy-only session:
  - the page stayed authenticated
  - `accessToken` was auto-created from the legacy token
  - the WooCommerce heading rendered
  - the `استيراد طلبات` and `الإعدادات` tabs rendered
- Focused search now shows no remaining direct `localStorage/sessionStorage accessToken` reads anywhere under `frontend/src/pages/super-admin`.
- Additional browser verification using a generated valid `SUPER_ADMIN` legacy-only token also succeeded on:
  - `/super-admin/dev-dashboard`
  - `/super-admin/dev-projects`
  - `/super-admin/dev-releases`
  - `/super-admin/dev/team`
  - `/super-admin/dev-settings`
  - `/super-admin/staff-access`
  - `/super-admin/dev-tasks/new`
  - `/super-admin/dev-kanban`
  - `/super-admin/active-timers`
  - `/super-admin/system-monitoring`
  - `/super-admin/dev/escalations`
  - `/super-admin/db-migration`
  - `/super-admin/dev-leaderboard`
- For every route above:
  - only legacy `token` was seeded before navigation
  - no redirect to `/auth/login` occurred
  - `accessToken` was auto-created from the legacy token during page load
  - the expected page shell and heading rendered
- Screenshots:
  - `H:/max_p_new/tmp-auth-legacy-platform-integrations.png`
  - `H:/max_p_new/tmp-auth-legacy-platform-integrations-internal.png`
  - `H:/max_p_new/tmp-auth-legacy-platform-integrations-woocommerce.png`
  - `H:/max_p_new/tmp-auth-legacy-super-admin-dev-projects.png`
  - `H:/max_p_new/tmp-auth-legacy-super-admin-dev-task-form.png`
- Additional live browser verification using a generated valid `OWNER` legacy-only token also succeeded on:
  - `/settings/profile`
  - `/settings/custom-domain`
  - `/settings/store-pages`
  - `/settings/scheduled-orders`
  - `/settings/facebook-oauth`
  - `/appointments`
  - `/ai-management`
  - `/monitor-reports`
  - `/coupons`
  - `/shipping-companies`
  - `/employee-stats`
- For every route above:
  - only legacy `token` was seeded before navigation
  - `accessToken` was auto-created from the legacy token during page load
  - `/auth/me` returned `200`
  - no redirect to `/auth/login` occurred
  - the expected page heading rendered
- Additional screenshots:
  - `H:/max_p_new/tmp-auth-legacy-settings-store-pages.png`
  - `H:/max_p_new/tmp-auth-legacy-appointments.png`
  - `H:/max_p_new/tmp-auth-legacy-monitor-reports.png`
  - `H:/max_p_new/tmp-auth-legacy-shipping-companies.png`

## Expected Behavior

- Active users should stay signed in across normal access-token expiry as long as refresh succeeds.
- Temporary backend hiccups during refresh should no longer force an immediate logout.
- Temporary Prisma engine disconnects should self-heal on the next guarded query instead of leaving the auth flow exposed to stale client state.
- Older sessions that still only have `localStorage.token` should continue to work and auto-migrate to `accessToken`.
- Real invalid/expired refresh tokens still correctly clear the session and send the user back to login.
