# Production Stability, Status Filters, and Preview Routing (2026-06-03)

## Scope
This release records the production backend stability hotfix plus merchant-facing status and preview-link updates.

## Backend Runtime Stability
- Added `backend/utils/recoverableUnhandledRejection.js` to classify recoverable WhatsApp Baileys `Connection Closed` Boom 428 rejections.
- Updated `backend/server.js` so those recoverable socket closures do not terminate the Node process.
- Kept unrelated unhandled rejections fatal so production alerts and crash visibility remain intact.
- Updated `backend/ecosystem.config.js` to run the production backend on port `3007`, matching the Nginx upstream contract.

## WhatsApp Session Health
- Extracted socket ready-state lookup into `getSocketReadyState`.
- Added `classifySessionSocketHealth` for focused testing.
- Treated connected/authenticating sessions as alive when Baileys does not expose a numeric websocket readyState.
- Removed the transient `AUTHENTICATING` value from session restore database filters because production Prisma enums persist the equivalent DB state as `CONNECTING`.

## Merchant Order Statuses
- Updated the order status controller to read `effectiveCompanyId` before falling back to `companyId`.
- Updated the orders workspace to hydrate both order and payment status definitions from `/order-status`.
- Preserved safe default statuses and appended the selected status when it is not part of the fetched/default list.
- Kept trash statuses out of normal filter and bulk-update status options.

## Storefront Product Preview
- Updated product preview URL generation to prefer public storefront product paths.
- Used store slug and custom domain routing data when available.
- Preserved the path-scoped `companyId` fallback for environments without storefront routing data.

## Regression Coverage
- `backend/tests/utils/recoverableUnhandledRejection.test.js`
- `backend/tests/services/WhatsAppManager.messageCapture.test.js`
- `frontend/src/pages/products/utils/__tests__/productPreviewUrl.test.ts`

## Release Checks
- Backend syntax check.
- Customer intent architecture guard.
- Arabic hardcoded string scan on staged JS/TS/TSX changes.
- Documentation compliance script.
- Frontend type-check and production build.
- SSH production verification: PM2 status/logs, backend health endpoint, Nginx test, and storefront smoke checks.
