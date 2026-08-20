# Fix: Customer.phoneNormalized missing from Prisma schema (customer creation broken)

**Date**: 2026-08-02
**Domain**: Infrastructure ΓÇö Prisma Schema / Customers
**Type**: Bugfix

## Problem

Admin customer creation ("╪Ñ╪╢╪º┘ü╪⌐ ╪╣┘à┘è┘ä") and storefront guestΓåÆcustomer conversion
were failing on production with:

```
Invalid `prisma.customer.create()` ... Unknown argument `phoneNormalized`.
```

Root cause: commit `7c0877e3` ("dedupe customers by canonical phone") added
`phoneNormalized` usage to controllers/routes/services (customerController,
enhancedOrderService, publicOrdersRoutes, etc.) but **never added the field to
the `Customer` Prisma model** (neither the root `schema.prisma` nor the split
`prisma/schema/products.prisma` that the server generates from). The generated
Prisma client therefore lacks `phoneNormalized` on `Customer`, so every
create/update that sets it throws.

The field `phoneNormalized` already existed on `CustomerBlockRule`; the fix
adds it to `Customer` (which is what the dedupe code writes/queries).

## Fix

- `apps/backend/prisma/schema/products.prisma` ΓÇö added
  `phoneNormalized String?` to `model Customer` and an
  `@@index([phoneNormalized])`.
- `apps/backend/prisma/schema.prisma` ΓÇö same field added to the root
  `Customer` model to keep both schema copies in sync.

The production deploy runs `prisma db push --schema=prisma/schema`, which adds
the `phoneNormalized` column to the `customers` table, and
`prisma generate`, which regenerates the client with the field.

## Verification

- After deploy: `POST /api/v1/customers` (admin create) succeeds.
- Storefront checkout guestΓåÆcustomer conversion succeeds.
- `phoneNormalized` is populated with the canonical E.164 value (e.g.
  `+2010...`).
