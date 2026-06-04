# Facebook Ads Decision Reports - 2026-05-04

## Scope

- Improved `/advertising/facebook-ads` with clearer Arabic campaign controls, persisted filters, and an explicit date range selector.
- Improved `/advertising/facebook-ads/decision-reports` with persisted report filters and campaign-level diagnostics.
- Added `GET /api/v1/facebook-ads/reports/performance-breakdown` for Meta Insights breakdown reporting.

## Backend Contract

`performance-breakdown` accepts `startDate`, `endDate`, `adAccountId`, and `breakdown`.

Supported breakdown values:

- `age_gender`
- `placement`
- `platform`
- `device`
- `country`
- `region`

The response groups totals by breakdown row and by campaign so the UI can show where the problem is: audience, placement, device, creative engagement, conversion path, or delivery fatigue.

## Verification

- `backend`: `npx jest tests/controller/facebookAdsController.performanceSummary.test.js --runInBand`
- `frontend`: focused ESLint on the two Facebook Ads pages, service, and report-filter utility.
- `frontend`: `npm run build`
