# PHASE 8 — FRONTEND AUDIT

## 8.1 CRITICAL: nested duplicate QueryClients (both live)
CONFIRMED chain: main.tsx → AdminAppBootstrap mounts QueryClientProvider with **utils/queryClient** (retry 1, staleTime 30s) → App.tsx root wraps `<AppProviders>` (line ~7509) which mounts a SECOND provider with **config/queryClient** (retry 3, exp backoff ≤30s, staleTime 5min). The outer client is a useless shell; all admin queries actually run on config defaults — including retry-3-on-mutations. Not dead code: an architectural accident.

## 8.2 Data-fetching discipline
- 560 raw `fetch(` occurrences in src/pages; 178 page files fetch inside useEffect bypassing react-query entirely; apiClient imported directly by 347 files but pages/admin/hotel/shared.ts builds a private mini-API layer with 32 raw fetches.
- Same-endpoint-twice in-file: only 3 mild cases (hr/AssignShift.tsx, CompanyLinks.tsx, employee/MyResignation.tsx).
- AbortController usage: 47 matches vs 178 useEffect-fetch files → majority of async setState has no cancellation. `.then(setState)` without guards: 13 confirmed spots (admin/booking/WorkflowPage.tsx:63/66, customers/CustomerList.tsx:156, BookingReportsTab ×2, BookAppointmentPage ×2, EducationFunnelPage ×2, RadiologyPatientsTab).

## 8.3 Optimistic updates
Only hooks/useWhatsAppMutations.ts uses them. `useArchiveConversation` (:451-487) mutates cache with NO onError rollback — CONFIRMED missing revert. useMarkAsRead has cache write without snapshot/no onError (HC low harm).

## 8.4 Dead code / duplicates
- Root .jsx/.tsx pairs (WalletManagement/UsersManagement/SuperAdminUsersManagement/CompanyLinks) are one-line re-export SHIMS — all live; Vite resolves .jsx first. Not dead.
- REAL dead duplicate: **hooks/useSocket.tsx** shadowed by useSocket.ts under Vite resolution; zero explicit importers.
- pages/whatsapp/WhatsAppChat.tsx.bak in source tree.
- woocommerce/hooks/useWooCommerceImportEnhanced.ts entirely unused (rogue io() connection inside it too).
- 20 unused hooks confirmed by import graph: useAbout, useAutoGeolocation, useBlog, useContact, useElessi* (×5), useFAQ, useGtm, useLoadingWithRetry, useLocalizedText, useOrderConfirmation, usePDPLogic, useRealTimeMessaging, useSmartScroll, useTikTokPixel, useTrackOrder, useWishlistPage.
- services/api.ts re-export shim imported by 92 files (should import apiClient directly); apiService.ts used by only 5.

## 8.5 Rendering performance
Virtualization only in WhatsAppChat/ChatWindow/OrdersMobileList/OrderConfirmationQueue. Worst unvirtualized: pages/orders/Orders.tsx (102KB single file, desktop table), customers/CustomerList.tsx:484 direct map. Bulk payload smell: hr/Benefits.tsx:162 `?limit=1000`.

## 8.6 Realtime
Healthy overall: singleton services/socketService.ts (single io() at :564); all 15 listener files have cleanup. Exceptions: two rogue connections in woocommerce import hooks (:44, :396) bypassing singleton (one in the dead hook).

## 8.7 Error/loading states
36 of 241 page files (~15%) have fetch with ZERO catch blocks; MainDashboardPage relies on react-query without rendering any error UI. Sampled: ProductsAnalytics, DeliveryReturnsAnalytics, EducationStudentProfilePage, TeacherSchedule/Payments etc.

## 8.8 i18n
75 admin-page files contain hardcoded Arabic literals despite full locales/ar infra (worst: AIImageGenerator 205 lines, EducationManagementPage 161, HotelManagementPage 79).

## 8.9 What is done RIGHT
- Single canonical axios client w/ queued refresh + transient retries (apiClient.ts).
- Token hygiene: access in sessionStorage, refresh httpOnly cookie.
- Socket singleton + disciplined cleanup.
- Storefront zustand stores persisted appropriately.
