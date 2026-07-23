# Return Requests Deduplication Fix — 2026-07-23

## Problem
The `/returns` page displayed duplicate `ReturnRequest` records for the same order. Multiple code paths created requests without database-level uniqueness, and race conditions between `ensureShippingReturnRequestsSynced` (runs on every page load), `autoCreateReturnRequest` (runs on order status change), and the manual/public creation endpoints allowed duplicates.

## Changes

### Database
- Added `@@unique([companyId, orderId])` constraint on `ReturnRequest` model in `prisma/schema/returns.prisma`
- Removed the now-redundant `@@index([companyId])`
- Created migration SQL at `prisma/migrations/add_return_requests_unique_constraint/migration.sql` to deduplicate existing data before the constraint is applied

### Controller
- `ensureShippingReturnRequestsSynced`: switched from per-order `create` in a loop to a single `createMany` with `skipDuplicates: true` for atomicity; cached the fallback customer lookup to avoid N+1 queries
- `createReturnRequest`: added explicit duplicate check before creation + P2002 error handling
- `createPublicReturnRequest`: same duplicate check + P2002 handling

### Service
- `autoCreateReturnRequest` in `orderService.js`: added `companyId` to the existing-request check + P2002 graceful handling for concurrent race conditions

## Deployment
1. Run the dedup SQL migration against the production database
2. Run `npx prisma db push --schema=prisma/schema --accept-data-loss`
3. Restart `maxp-backend`
