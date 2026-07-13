# Facebook Creative Preview v25 Fix - 2026-05-08

## Context

Production verification of a new Swan Sparkle Sneakers ad showed that ad previews,
recommendations, quality metrics, and async reports were working, but the creative
preview helper failed against Meta Graph API v25.0.

## Root Cause

`FacebookAdsService.getCreativePreview` called the ad account `generatepreviews`
edge with `creative_id`. Meta v25.0 expects either the creative preview edge
(`/{creativeId}/previews`) or a `creative` object parameter on `generatepreviews`.

## Change

- Read creative previews from `/{creativeId}/previews`.
- Keep a fallback to `/{adAccountId}/generatepreviews` using
  `creative={"creative_id":"..."}`.
- Added unit coverage for the primary preview edge and the v25 fallback shape.

## Verification

- `node --check backend/services/facebookAdsService.js`
- `npx jest tests/services/facebookAdsService.creatives.test.js --runInBand`
