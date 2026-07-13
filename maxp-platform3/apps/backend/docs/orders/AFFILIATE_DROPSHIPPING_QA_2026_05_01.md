# Affiliate And Dropshipping QA Notes - 2026-05-01

## Purpose

This note records the backend-facing documentation update for the affiliate and
dropshipping stabilization work that landed on `main` on 2026-05-01.

The broader QA reports live under the repository-level `docs/` directory, but
the production deploy guard expects backend-impacting changes to be mirrored in
one of the backend documentation areas. This file links the order-routing,
merchant-order, and commission changes to that backend documentation set.

## Backend Scope

- Added public affiliate and merchant route coverage.
- Hardened affiliate settings, merchant management, commission, and public
  registration route scoping.
- Added dropshipping service coverage for merchant product links, merchant
  order creation, availability checks, and auto-fulfillment.
- Updated Prisma order/product schema relations so one order can create multiple
  merchant orders, keyed by `merchantId + orderId`.
- Added a migration for the `MerchantOrder` relation update:
  `20260501100000_allow_multiple_merchant_orders_per_order`.

## Verification

- Backend affiliate/merchant/dropshipping focused suites were added with route,
  integration, and service coverage.
- Frontend affiliate/merchant route and page tests were added to protect the
  new navigation and public registration flows.
- The root QA evidence is documented in:
  `docs/affiliate-module-qa-execution-2026-05-01.md`.

## Production Baseline Follow-Up

- The `main` production deploy was watched through the `Deploy to Server`
  workflow and production health was verified afterward.
- Production already had the required `MerchantOrder` index shape:
  `merchant_orders_merchantId_orderId_key` exists and the old
  `merchant_orders_orderId_key` index is absent.
- Because production did not have `_prisma_migrations`, Prisma reported the
  historical migrations as pending. To avoid replaying old SQL against live
  data, the production migration history was baselined with
  `prisma migrate resolve --applied`.
- No destructive SQL was run: no `DROP TABLE`, `TRUNCATE`, or `DELETE`.
- A schema-only snapshot was written before the metadata baseline:
  `/var/www/backend2/backups/prisma-baseline-20260501T160457Z/schema-before-baseline.sql`.
- After the baseline, `prisma migrate status --schema=prisma/schema` reported
  `Database schema is up to date!`.

## 2026-05-02 Portal And Role-Boundary Release

This follow-up completes the affiliate and dropshipping runtime slice with a
merchant-facing portal, public signup hardening, and stricter role separation.

- Public affiliate and merchant signup routes are mounted under the public API
  namespace and keep company slug handling explicit.
- Merchants can receive a limited `MERCHANT` login for their company, land on
  `/merchant-portal`, and manage only their own products, order status, and
  tracking information.
- Affiliate users land on `/affiliates/dashboard`, keep affiliate-only sidebar
  tools, and are redirected away from company/admin/merchant private screens.
- External affiliate and merchant profiles are separated from the employee HR
  profile so salary, custody, warnings, and internal files do not appear.
- Commission and dropshipping services now keep selected supplier/merchant
  context through order routing and reporting so affiliate, merchant, platform,
  and company values remain aligned.
- The complete scenario matrix and UAT evidence are recorded in:
  `docs/affiliate-dropshipping-complete-scenarios-ar-2026-05-02.md`,
  `docs/affiliate-dropshipping-complete-uat-2026-05-02.md`, and
  `docs/merchant-portal-uat-2026-05-02.md`.

Verification for this release covered the backend UAT script, focused frontend
route/sidebar tests, targeted lint, frontend build, browser role-boundary
checks, and mobile smoke checks for affiliate and merchant dashboards.

