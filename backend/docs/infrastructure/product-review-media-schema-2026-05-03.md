# Product Review Media Schema - 2026-05-03

## Summary

Production logs showed one product review request failing while reading review media because the `product_review_media` relation was not guaranteed by the Prisma schema.

The service already had a runtime `CREATE TABLE IF NOT EXISTS` safeguard, but deploys run `prisma db push` from `backend/prisma/schema`. Without a Prisma model, the deploy process cannot guarantee the table exists before the first review request after restart.

## Fix

- Added `ProductReviewMedia` to `backend/prisma/schema/products.prisma`.
- Added relation fields from `ProductReview` and `Company`.
- Added a defensive SQL migration for environments that still use migrations.
- Kept the runtime table guard in `productReviewMediaService` as a compatibility fallback.

## Verification

Expected checks:

- `npx prisma validate --schema=prisma/schema`
- `npm run schema:generate`
- Public review endpoint returns `200` for storefront review reads.
- Production logs no longer show fresh `relation "product_review_media" does not exist` errors after deploy.
