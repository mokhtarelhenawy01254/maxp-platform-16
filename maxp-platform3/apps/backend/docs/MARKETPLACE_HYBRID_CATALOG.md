# Marketplace Hybrid Catalog (Phase 1 + Phase 2)

This project now supports a hybrid marketplace catalog architecture:

- Catalog source files:
  - `backend/catalog/marketplace/index.json`
  - `backend/catalog/marketplace/apps.json`
  - `backend/catalog/marketplace/bundles.json`
  - `backend/catalog/marketplace/categories.json`
- Validation:
  - `backend/services/catalog/marketplaceCatalogValidator.js`
- Loader + cache service:
  - `backend/services/catalog/marketplaceCatalogService.js`
- Validation command:
  - `npm run catalog:validate` (from `backend`)
- Drift diff command:
  - `npm run catalog:diff` (compare file catalog vs DB snapshot)
- Safe target sync command:
  - `npm run catalog:sync-target -- --dry-run` previews catalog apps/bundles missing from DB.
  - `npm run catalog:sync-target -- --only-missing` inserts missing apps/bundles only; it does not overwrite existing DB rows.
  - `npm run catalog:sync-target -- --only-missing --fail-on-missing` exits non-zero if any catalog entry remains unresolved after sync.
 - Super Admin diff API:
   - `GET /api/v1/super-admin/marketplace-management/catalog/diff`
   - Optional query: `includeDetails=false` to return totals-only payload
- Feature flag:
  - `CATALOG_SOURCE=db|file|hybrid`
  - Default behavior:
    - production: `db`
    - development/test when unset: `hybrid`

## Implemented

- File catalog schema + validation + hash snapshot cache.
- Read endpoints now support `file/hybrid` modes:
  - `GET /api/v1/marketplace/apps`
  - `GET /api/v1/marketplace/apps/:slug`
  - `GET /api/v1/marketplace/categories`
  - `GET /api/v1/marketplace/bundles`
  - `GET /api/v1/marketplace/bundles/:slug`
- In `hybrid` mode, runtime DB state is merged into file catalog where applicable:
  - app install count, rating, review count
  - installation status for authenticated company (`isInstalled`, `activePricingModel`)
- Operational/financial flows remain DB-backed (unchanged):
  - install/uninstall, wallet, transactions, subscriptions, reviews writes
- Write-flow bridge for file-defined catalog entries:
  - `POST /api/v1/marketplace/apps/:slug/install` now auto-syncs app definition from file catalog into DB if missing.
  - `POST /api/v1/marketplace/bundles/:slug/subscribe` now resolves bundle from DB or file catalog and auto-syncs bundle apps into DB before wallet/transaction processing.
- Test coverage for catalog source modes:
  - `backend/tests/controller/marketplaceController.hybrid.test.js` covers `file`, `db`, and `hybrid` read behavior.
- Super Admin visibility:
  - `frontend/src/pages/super-admin/SubscriptionCenter.tsx` shows catalog drift summary/details from `GET /catalog/diff`.
- Production deploy safety:
  - GitHub Actions runs `npm run catalog:sync-target -- --only-missing --fail-on-missing` after Prisma `db push`/seeding and before PM2 restart.
  - This keeps production `CATALOG_SOURCE=db` from hiding newly shipped file-defined marketplace apps.
  - Deploy fails before PM2 restart if a broken catalog app/bundle cannot be synced.
  - After PM2 reload, deploy verifies `GET /api/v1/marketplace/apps?page=1&limit=200` returns the full page (`data.length === pagination.total`).
- Frontend smoke test coverage:
  - `frontend/src/pages/super-admin/__tests__/SubscriptionCenter.catalogDiff.test.tsx`
  - Run: `npx jest --config jest.config.cjs src/pages/super-admin/__tests__/SubscriptionCenter.catalogDiff.test.tsx --runInBand` (from `frontend`)

## Next phase

- Add browser-level E2E (real navigation/login) on top of current component smoke tests.
