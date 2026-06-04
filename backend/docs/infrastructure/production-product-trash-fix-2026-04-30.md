# Production Product Trash Fix - 2026-04-30

## Issue

- On `https://maxp.online/products`, deleting a product removed it from the current React state only.
- After a later refresh or refetch, the same product appeared again as if deletion never happened.

## Root Cause

- `backend/controller/productController.js` returned success from `DELETE /api/v1/products/:id` but executed `product.update({ data: {} })`, which did not modify the database.
- The product list endpoint did not exclude soft-deleted products.
- Trash endpoints were also incomplete:
  - `GET /products/trash/all` returned all company products instead of trashed products only.
  - `POST /products/:id/restore` and `DELETE /products/:id/permanent` did not verify trash state.
- Public storefront product queries could still surface soft-deleted products because `deletedAt` was not filtered.

## Fix

- Activated soft-delete behavior using `Product.deletedAt`.
- Updated admin product listing to filter with `deletedAt: null`.
- Updated single-product deletion to set `deletedAt = new Date()`.
- Updated trash listing to load only `deletedAt != null`, ordered by `deletedAt desc`.
- Updated restore to clear `deletedAt`.
- Updated permanent delete to only hard-delete products already in trash.
- Updated public storefront product lookups and storefront HTML SEO product resolution to exclude `deletedAt != null`.
- Added regression test coverage in `backend/tests/controller/productController.delete.test.js`.

## Verification

- Local syntax checks passed:
  - `node --check backend/controller/productController.js`
  - `node --check backend/routes/publicProductsRoutes.js`
  - `node --check backend/controller/storefrontHtmlController.js`
- Local regression test passed:
  - `npx jest backend/tests/controller/productController.delete.test.js --runInBand`
- Production runtime updated directly on `/var/www/backend2`.
- Production PM2 reload succeeded for:
  - `maxp-backend`
  - `maxp-webhook-worker`
- Production health check passed:
  - `http://127.0.0.1:3007/api/v1/health`

## Notes

- Jest emitted existing workspace warnings about duplicate mocks and duplicate package names under `tmp/` snapshots, but the targeted regression suite still passed.
- No frontend build or asset copy was required because this fix was backend-only.
