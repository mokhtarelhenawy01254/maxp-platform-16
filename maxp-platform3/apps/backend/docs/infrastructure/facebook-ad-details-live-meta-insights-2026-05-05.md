# Facebook Ad Details Live Meta Insights Fix

## Problem

`/advertising/facebook-ads/ads/:adId` was mixing two different data sources:

- The KPI cards, funnel diagnosis, verdict, and recommendations were built only from persisted `facebookAdInsights` rows.
- The age/gender, placement, and device breakdown sections were fetched live from Meta.

This produced contradictory screens for synced ads. A page could show purchases and placement rows in the lower breakdown cards while the header verdict still said `لا توجد بيانات كافية` because local rows were empty or stale.

## Root Cause

`getAdDetails` in `backend/controller/facebookAdsController.js` aggregated only local Prisma insight rows:

- current ad summary
- previous period summary
- ad set summary
- campaign summary
- sibling ad comparisons

Live Meta insight fetching was only used for:

- breakdown report endpoint
- quality metrics

## Fix

Updated ad-details diagnostics to prefer live Meta insights when the ad is synced and a company ads token exists.

### Backend changes

- Added `aggregateMetaInsights()` to normalize live Meta rows through the same totals builder used by local persisted rows.
- Added `getMetaInsightsOrNull()` helper for safe live pulls by ad, ad set, and campaign node IDs.
- `getAdDetails()` now attempts live Meta hydration for:
  - current ad period
  - previous comparison period
  - parent ad set period
  - parent campaign period
  - sibling ads within the same ad set
  - ad quality metrics
- If Meta data is unavailable, the endpoint falls back to persisted local rows without breaking the page.
- Response metadata now exposes:
  - `performanceSource`
  - `fallbackSource`
  - `metaInsightError`

### Date handling hardening

The controller also now parses `YYYY-MM-DD` inputs as local date parts instead of relying on `new Date("YYYY-MM-DD")`, which can shift the calendar day because of UTC parsing semantics.

## Frontend changes

`frontend/src/pages/advertising/AdDetails.tsx` now shows a compact data-source badge:

- `Meta مباشر` when the KPI/funnel layer is backed by live Meta data
- `محلي` when the page had to fall back to stored local rows

This makes it clear whether the diagnostic cards are reading fresh Meta performance or cached local history.

## Verification

- `node --check backend/controller/facebookAdsController.js`
- `npx jest backend/tests/controller/facebookAdsController.performanceSummary.test.js --runInBand`
- Added controller coverage for live Meta hydration on ad-details responses

## Outcome

The ad details page now uses one consistent performance source for the main diagnosis layer, so missing local sync rows no longer hide valid purchases, spend, and verdict signals for synced Meta ads.
