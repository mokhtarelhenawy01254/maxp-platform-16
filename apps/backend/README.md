# Backend Notes

## Current Focus
- Instagram DM Integration & Alignment: Integrated full Instagram DM messaging support spanning database schemas, connected page mapping, webhook receivers, Socket.io event broadcasting, localized sidebar navigation, and glassmorphic inbox views. Resolved the frontend TypeError (reading 'all') in InboxTabs and Temporal Dead Zone ReferenceError in InstagramInbox.tsx, ensuring the build compiles successfully and is deployed cleanly to the VPS.
- WhatsApp History Recovery on Session Reconnect: Implemented automatic session history migration in `WhatsAppManager.js` to transfer messages and contact history from older disconnected sessions to newly active sessions.
- Order Edit Permissions & Ownership Logic: Implemented ownership validation checking on status update and detail patch operations to prevent employees and moderators from modifying orders they did not create.
- Facebook Pages stale database conflict resolution: Purged stale historical bindings for Boom fashion 7, Alpha store 50, Hello Gift, and Italiano Store 2 from the `facebookPage` and `skippedFacebookPage` tables on the production VPS, enabling clean, conflict-free re-linking via standard Facebook OAuth onboarding.
- Shipping replies now have a grounded safety net: if Gemini keeps the product price/shipping facts but outputs a wrong final total, `CoreAIAgent` falls back to the authoritative shipping blueprint before sending.
- Governorate-only follow-ups now reuse grounded product memory: if a product was already discussed, `CoreAIAgent` can turn a bare governorate message into the final total; otherwise it returns shipping-only pricing.
- CoreAIAgent catalog browse now uses real display prices (`product.price` or the first priced variant when the parent price is `0`), its final response price validator now scopes multi-product browse replies per product instead of collapsing everything onto one grounded price, follow-up phrases like `كده الإجمالي كام` now inherit the grounded product + governorate correctly, and intent routing now has typo-tolerant semantic fallback for browse, price, shipping, image, and order phrasing.
- CoreAIAgent deterministic reply paths now run through Gemini as authoritative blueprints: catalog, variant, image, clarification, price, and shipping facts stay grounded, but the final customer-facing wording is AI-generated unless the model/key path fails.
- AI shipping replies now resolve governorate prices from the Store Settings shipping zones, strip governorate noise from product search, and calculate grounded totals from `product/variant price + shipping class fee + governorate shipping`.
- Manual/admin order creation now protects configured shipping prices: unresolved shipping lookups no longer submit `0`, and the backend can recover shipping from configured zones before persisting a zero-cost order.
- Product variant presentation now round-trips cleanly: editor-side `variantSettings` are rehydrated from saved metadata, persisted as a dedicated payload field, and honored in storefront rendering.
- Live storefront deployment is now explicitly documented as a copy-based runtime on the VPS: production domains serve `/var/www/frontend2/dist`, so GitHub pushes and live frontend refreshes are separate steps.
- Product authoring is now aligned with the live storefront preview flow: mixed-shape product images resolve correctly in manual-order pickers, the product description field uses a richer editor, and admin preview now works on the same-origin `/store/...` storefront path.
- AI Conversation Summaries are now manually editable: operators can correct extracted product, selection, and customer metadata in the Facebook Inbox sidebar, with changes persisting to the conversation's metadata JSON field.
- Attendance auto-close is now audited, reviewable by HR, and bounded by the midnight business-day rollover.
- Employee attendance history now uses stable date normalization, real pagination/filtering, and persisted `workMode`.
- Lateness calculation now follows the employee's **effective shift** continuously, using the latest active assignment instead of falling back to the company default start time.
- Employee leave and advance self-service pages now use dedicated employee-safe config endpoints instead of HR-only settings routes.
- Employee advance creation now resolves the acting employee on the server for non-HR roles, and shared request forms rely on a ref-safe `Input` component for `react-hook-form`.
- HR notification settings are now persisted and enforced across leave, attendance, warning, payroll, probation, and contract-expiry flows.
- Additional HR notification recipients can now be selected from the active employee directory inside `/hr/settings`.
- HR notification toggles in `/hr/settings` now govern WhatsApp delivery too when the WhatsApp section is enabled and recipients are configured.
- Attendance WhatsApp alerts are now restricted to issue cases only: late check-in and early check-out.
- HR settings now exposes a WhatsApp delivery readiness state (`notificationHealth`) so operators can immediately see whether recipients and a connected session are in place.
- The HR owner notification agent now reports real delivery outcomes, surfaces `no_session` instead of false success, and uses timeouts around AI generation to avoid blocking message delivery.
- Legacy HR notification defaults are upgraded automatically to the modern event set so older companies do not silently miss newer event categories.
- Reward details now render safely for custom or legacy reward rows where `rewardType` is absent.
- The deploy helper script has been aligned with the safer Bash parsing logic already used in the GitHub Actions workflow.

## Key Docs
- `backend/Bugs.md`: chronological incident, fix, and validation log.
- `backend/Structure.md`: architecture-level view of recent backend and operations changes.
- `backend/TEAM_SYNC.md`: execution log for repo sync, QA, and deployment-related activity.

## AI Shipping Pricing Stack
- `backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`: also covers governorate-only follow-ups both with and without grounded product context.
- `backend/services/CoreAIAgent.js`: strips shipping/governorate noise from product search, suppresses browse mode for shipping follow-ups, prefers priced variants when parent product price is `0`, validates multi-product catalog prices against the correct browse item before delivery, uses typo-tolerant semantic intent matching for routing, and now feeds catalog/variant/image/price/shipping reply facts into Gemini as authoritative blueprints instead of returning fixed customer-facing strings directly.
- `backend/services/shippingService.js`: supports `findShippingInfo(..., { allowFlatShipping: false })` so AI pricing can use governorate zones from Store Settings instead of flat-shipping promotion overrides.
- `backend/controller/shippingZoneController.js`: canonical governorate-to-zone resolution through `resolveShippingQuoteForGovernorate(...)`, which remains the authoritative zone source.
- `backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`: regression coverage for `product + governorate` shipping totals and browse-suppression behavior.
- `backend/tests/services/shippingService.test.js`: regression coverage for bypassing flat shipping in the AI path while preserving legacy default behavior for other callers.

## Manual Order Shipping Recovery Stack
- `frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx`: blocks order confirmation while shipping is still loading and avoids sending unresolved `shippingCost: 0`.
- `backend/services/enhancedOrderService.js`: recovers configured shipping when manual/admin order payloads submit zero shipping for a known governorate/company.
- `backend/services/shippingService.js`: delegates shipping lookup to the canonical zone resolver instead of a legacy matching path.
- `backend/controller/shippingZoneController.js`: owns canonical governorate-to-zone resolution through `resolveShippingQuoteForGovernorate(...)`.
- `backend/tests/services/enhancedOrderService.test.js`: regression tests for recovered shipping and legitimate zero-fallback scenarios.

## Product Authoring & Preview Stack
- `frontend/src/pages/products/ProductNewFinal.tsx`: restores saved `variantSettings` into live editor state when reopening products.
- `frontend/src/pages/products/hooks/useProductApi.ts`: persists `variantSettings` as a dedicated API field plus mirrored metadata.
- `frontend/src/storefront/sections/ProductInfo.tsx`: forwards resolved variant settings into the storefront selector.
- `frontend/src/storefront/components/VariantSelector.tsx`: enforces clean separation between thumbnail, circle, dropdown, and button swatch modes.
- `frontend/src/storefront/__tests__/variantSelector.test.tsx`: regression coverage for storefront swatch rendering under the Arabic copy path.
- `frontend/src/utils/imageUrl.ts`: shared image normalization helpers for product arrays, JSON strings, and object payloads.
- `frontend/src/pages/admin/ManualOrder/components/ProductSearchColumn.tsx`: manual-order picker now resolves real product/variant images through the shared helper.
- `frontend/src/components/facebook-inbox/Modals/QuickOrderModal.tsx`: quick-order product mapping now resolves product and variant images safely.
- `frontend/src/pages/orders/components/SimplifiedProductSelectionModal.tsx`: simplified product selection now uses the same image normalization path.
- `frontend/src/components/RichTextEditor.tsx`: richer Quill toolbar for product descriptions.
- `frontend/src/pages/products/components/tabs/BasicTab.tsx`: product description now uses the shared rich-text editor.
- `frontend/src/pages/products/ProductNewFinal.tsx`: canonical preview URL builder and safer popup preview launch.
- `frontend/src/storefront/hooks/useProduct.ts`: preview product fetch with admin-first/public-fallback behavior.
- `frontend/src/services/apiClient.ts`: public storefront auth-error guard for preview/store routes.
- `frontend/src/storefront/StorefrontShell.tsx`: root and `/store/...` storefront route support.

## AI Summary Editing Stack
- `frontend/src/hooks/inbox/useConversationActions.ts`: extended with `updateConversation` to support generic partial updates.
- `frontend/src/pages/facebook-inbox/FacebookInbox.tsx`: orchestrates the `aiSummary` update flow and reloads the conversation list.
- `frontend/src/components/facebook-inbox/CustomerProfile/CustomerProfile.tsx`: provides the interactive edit mode and form fields for metadata overrides.
- `backend/controller/conversation/conversationCrudController.js`: handles the backend logic for deep-patching the `metadata.coreAi.conversationSummary` object.

## Attendance Auto-Close Stack
- `backend/cron/attendanceAutoCheckoutCron.js`: reminder and auto-close orchestration.
- `backend/services/hr/attendanceService.js`: business rules, export hooks, review actions, and employee fixes.
- `backend/services/hr/shiftAssignmentResolver.js`: resolves the effective shift for the requested attendance day.
- `backend/controller/hrController.js`: employee and HR endpoints for attendance review flows.
- `backend/prisma/schema/hr.prisma`: `AttendanceAutoCloseAudit` model and HR settings toggles.
- `frontend/src/pages/hr/Attendance.tsx`: HR review queue.
- `frontend/src/pages/employee/MyAttendance.tsx`: employee midnight refresh and corrected history.

## HR Notification Stack
- `backend/controller/hrController.js`: reads and updates persisted HR notification settings.
- `backend/services/hr/hrNotificationService.js`: central in-app HR/admin/manager notification dispatch.
- `backend/services/hr/hrOwnerNotificationAgent.js`: WhatsApp owner/admin delivery with truthful send evaluation, AI timeouts, connected-session prechecks, and normalized HR action-type gating.
- `backend/cron/hrLifecycleNotificationCron.js`: lifecycle reminders for probation end and contract expiry.
- `backend/services/hr/leaveService.js`: leave-request notification trigger.
- `backend/services/hr/attendanceService.js`: attendance-issue notification trigger.
- `backend/services/hr/warningService.js`: warning-issued notification trigger.
- `backend/services/hr/payrollService.js`: payroll-generation notification trigger.
- `frontend/src/pages/hr/HRSettings.tsx`: HR settings UI with dropdown-based recipient selection.

## Reward Details Robustness
- `frontend/src/pages/hr/rewards/RewardDetails.tsx`: safely renders legacy/custom rewards when `rewardType` is missing and guards malformed `calculationDetails` payloads.

## Verification Snapshot
- Instagram DM integration, WhatsApp reconnection fixes, and Order Edit validation verified on `2026-05-31`.
- Backend syntax checks passed on `2026-05-31` for all new and modified modules.
- `frontend` production build completed successfully with zero compile-time errors on `2026-05-31`.
- Checked documentation compliance with `node scripts/verify-docs.js` on `2026-05-31` (passed).
- Targeted Jest coverage passed on `2026-04-19` for `backend/tests/services/CoreAIAgent.catalogVariantContext.test.js` and `backend/tests/services/shippingService.test.js`.
- Backend syntax checks passed on `2026-04-19` for `backend/services/CoreAIAgent.js`, `backend/services/shippingService.js`, `backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`, and `backend/tests/services/shippingService.test.js`.
- Targeted Jest coverage passed on `2026-04-18` for `backend/tests/services/enhancedOrderService.test.js` and `backend/tests/controller/shippingZoneController.test.js`.
- `frontend` production build passed on `2026-04-18`; the first sandboxed attempt failed with `spawn EPERM`, but the build succeeded when rerun outside the sandbox.
- `scripts/verify-docs.js` was reviewed again on `2026-04-18`; it still prefers staged diffs locally and uses `git diff-tree` as its fallback path.
- `C:\Program Files\Git\bin\bash.exe -n backend/deploy.sh` and `C:\Program Files\Git\bin\bash.exe -n deploy.sh` both passed on `2026-04-18`.
- SSH review on `2026-04-18`: explicit production SSH to `root@mokhtarelhenawy.online` succeeded and returned hostname `srv974554`, while GitHub SSH still fails with `Permission denied (publickey)`, so pushes continue over HTTPS.
- VPS deployment diagnosis on `2026-04-16` confirmed that live storefront domains are served from `/var/www/frontend2/dist`, while the runtime directories on the server are copied deployments rather than active Git working trees.
- Production data verification on `2026-04-16` confirmed that `variantSettings` are saved correctly in live product metadata (for example `swan-sneaker-2` under `companyId=swan`), so the remaining live mismatch was traced to stale frontend assets rather than backend persistence.
- `git fetch origin main` + `git pull --ff-only origin main` reported `Already up to date.` on `2026-04-16` before the current push cycle, and `git rev-list --left-right --count HEAD...origin/main` returned `0 0`.
- Targeted Vitest coverage passed for `frontend/src/storefront/__tests__/variantSelector.test.tsx`.
- `frontend` production build passed again on `2026-04-16` after the variant-settings persistence and swatch-rendering changes.
- `C:\Program Files\Git\bin\bash.exe -n backend/deploy.sh` and `C:\Program Files\Git\bin\bash.exe -n deploy.sh` both passed on `2026-04-16`.
- `git fetch origin main` + `git pull --ff-only origin main` reported `Already up to date.` on `2026-04-16`, so there were no upstream conflicts before the current documentation/push cycle.
- Targeted Jest tests passed for `frontend/src/utils/__tests__/imageUrl.test.ts`.
- `frontend` production build passed on `2026-04-16` after the product preview/storefront route recovery.
- Remaining frontend build warnings are still non-blocking: unresolved runtime `Geist` font assets and the known circular/manual-chunk warnings.
- `scripts/verify-docs.js` was updated on `2026-04-16` so local runs validate staged files first instead of accidentally reading only the previous commit diff.
- `node --check backend/scratch_check_duplicates.js` passed on `2026-04-16`.
- SSH review on `2026-04-16`: `ssh max-p-vps` succeeded from this workstation, while GitHub SSH still fails with `Permission denied (publickey)`, so repository pushes continue over HTTPS.
- Backend syntax checks passed for the attendance service, controller, and cron.
- Backend syntax checks passed for the effective shift resolver.
- Backend syntax checks passed for the HR notification controller/service/cron wiring.
- Backend syntax checks passed for the HR WhatsApp alignment changes.
- Backend syntax checks passed for the HR owner notification delivery-diagnostics changes.
- Backend syntax checks passed for the HR settings notification-health controller changes.
- Targeted Jest tests passed for auto-close cron behavior and HR review endpoints.
- Targeted Jest tests passed for effective shift fallback behavior.
- `frontend` production build passed on `2026-04-07`.
- `frontend` production build passed again on `2026-04-07` after the `/my-leaves`, `/my-advances`, and shared input registration fixes.
- `frontend` production build passed on `2026-04-08` after the HR notification settings and recipient-picker updates.
- `frontend` production build passed again on `2026-04-08` after aligning HR settings toggles with WhatsApp delivery and clarifying the notification UI copy.
- `frontend` production build passed again on `2026-04-08` after the WhatsApp delivery-readiness UI and `RewardDetails.tsx` null-safety fixes.
- Local SSH review found that GitHub SSH and the configured VPS alias are not authenticated from this workstation, so repository sync currently continues over HTTPS.

## Useful Commands
```bash
npm run schema:generate
npm test -- --runInBand --testPathPattern=attendanceAutoCheckoutCron
npm test -- --runInBand --testPathPattern=attendanceAutoCloseReview
npm test -- --runInBand --testPathPattern=shiftAssignmentResolver
node --check backend/controller/advanceController.js
node scripts/verify-docs.js
```
