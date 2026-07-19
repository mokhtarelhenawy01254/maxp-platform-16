# Company Signup Bonus Schema Sync - 2026-04-25

## Issue

Local development started returning `500` from `GET /api/v1/settings/company`.

Prisma error:

- `The column companies.signupTrialBonusDays does not exist in the current database.`

## Root Cause

The `Company` model in `backend/prisma/schema/core.prisma` already included the signup bonus fields, but the local PostgreSQL `companies` table had not been updated to include them.

Missing columns:

- `signupTrialBonusDays`
- `signupBonusUsers`
- `signupBonusProducts`
- `signupBonusOrdersPerMonth`
- `signupBonusCustomers`
- `signupCouponCode`
- `signupCouponRedeemedAt`

## Why This Was Not Fixed With `prisma db push`

Running `npx prisma db push --schema=prisma/schema --skip-generate` reported unrelated destructive changes, including dropping non-empty template tables. That made a broad schema push unsafe for this fix.

## Applied Fix

1. Added targeted SQL at `backend/prisma/migrations/20260425_add_company_signup_bonus_columns/migration.sql`.
2. Applied it with:

```bash
npx prisma db execute --schema=prisma/schema --file=prisma/migrations/20260425_add_company_signup_bonus_columns/migration.sql
```

3. Hardened `backend/routes/settingsRoutes.js` so `/settings/company` only selects the fields it actually needs instead of doing a full `Company` row fetch.

## Verification

- Confirmed all seven columns now exist in local PostgreSQL.
- Verified `GET http://localhost:3007/api/v1/settings/company` returns `200` with a real DB-backed user/company pair.
