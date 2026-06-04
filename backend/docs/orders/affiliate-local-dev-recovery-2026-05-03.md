# Affiliate Local Dev API Recovery - 2026-05-03

## Context

The affiliate marketer UI on `localhost:3000` was showing 500 responses for the main app boot requests:

- `/api/v1/auth/me`
- `/api/v1/companies/current`
- `/api/v1/notifications/recent`
- `/api/v1/products?page=1&limit=200&manualOrder=true`
- `/api/v1/turbo/governments`

## Root Causes

1. Redis was not running locally, so the backend startup path was incomplete.
2. `npm run dev` hit the known Windows Prisma engine rename lock during `prisma generate`.
3. The backend could not boot cleanly until unresolved merge markers were removed from Facebook/proxy image modules.
4. The local database was behind the Prisma schema for affiliate identity-document fields. `prisma db push --skip-generate` was not used because it warned about dropping existing TikTok storefront columns with data.

## Recovery Applied

- Started local Redis from `Redis-Portable/Redis-5.0.10`.
- Started the backend directly with `node server.js` on port `3008`.
- Removed backend conflict markers in:
  - `backend/controller/facebookAdsController.js`
  - `backend/services/facebookAdsService.js`
  - `backend/controller/proxyImageController.js`
  - `backend/routes/facebookOAuthRoutes.js`
- Applied only additive local SQL for missing affiliate columns/tables:
  - `affiliates.identityDocument*`
  - `affiliate_settings.requireIdentityDocument`
  - `affiliate_settings.identityDocumentLabel`
  - `affiliate_payouts.proof*`
  - `affiliate_identity_document_versions`
  - `affiliate_review_logs`

No destructive schema operation or TikTok storefront column drop was performed.

## Verification

Real API calls through `localhost:3000` returned 200 for:

- health
- current user
- current company
- recent notifications
- notification settings
- Turbo governments
- manual-order product catalog
- affiliate order list

Real Playwright UI smoke, without API mocks, passed on mobile `390x844` and desktop `1366x900` for:

- affiliate orders
- affiliate order details
- order-linked ticket creation
- affiliate create-order product loading

Report and screenshots are under `frontend/tmp/affiliate-real-ui-smoke/`.
