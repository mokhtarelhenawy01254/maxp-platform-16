# Order Preparation Hold App in Marketplace (2026-09-09)

## Context
The user requested adding `/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP` as a dedicated, fully functional application in the MaxP Marketplace (`https://maxp.online/marketplace`).

## Changes
1. **Catalog Specification (`apps/backend/catalog/marketplace/apps.json`)**:
   - Registered `order-preparation-hold` as a `FREE` app under category `ORDER_OPS`.
   - Connected `mainRoute` and `adminRoute` to `/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP`.
   - Configured features `onHoldQueue` and `fastResolution` with audience and positioning copy.
   - Cleared unnecessary legacy `requiredApps` (`store-basic`).

2. **Backend Catalog Service & Synchronization (`marketplaceCatalogService.js`, `sync_target_marketplace_catalog_entries.js`)**:
   - Enabled `mainRoute` and `adminRoute` propagation in `_withDefaultsForApp`.
   - Updated `sync_target_marketplace_catalog_entries.js` to persist `mainRoute`, `adminRoute`, `pricingModel`, `requiredApps`, and feature metadata into the PostgreSQL `MarketplaceApp` table for both new and existing entries.
   - Added seed data in `marketplaceSeed.js` and `marketplaceCompleteSeed.js`.

3. **Frontend Marketplace Integration (`marketplace.ts`, `featureCatalog.ts`, `AppDetails.tsx`, `AppCard.tsx`)**:
   - Unified `APP_ROUTE_MAP` and `getAppDestination` in `utils/marketplace.ts`.
   - Added `onHoldQueue` and `fastResolution` feature definitions in `featureCatalog.ts`.
   - Added direct "فتح التطبيق" (Open App) button in `AppDetails.tsx` when installed, as well as an immediate launch action in the installation success toast.
   - Added direct launch link in `AppCard.tsx` popover preview.

4. **Production DB Verification**:
   - Synchronized the `order-preparation-hold` record directly into the production PostgreSQL database.
   - Verified that `GET /api/v1/marketplace/apps/order-preparation-hold` returns `mainRoute: "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP"`, `pricingModel: "FREE"`, and `requiredApps: []`.
