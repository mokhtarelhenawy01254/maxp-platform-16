# Swan Ads Order Reconciliation - 2026-05-10

## Context

Swan operators compared `/company-dashboard` against Facebook Ads and saw different order counts for the same day. The dashboard counts real MaxP orders by company day, while Meta reports attributed purchases by campaign and attribution window. The UI also made it easy to read one campaign row as the account total.

## Shipped Fix

- Company dashboard date-only filters now resolve to company timezone day boundaries instead of relying on the server process timezone.
- Facebook Ads reporting windows now use the company timezone for local persisted insight and MaxP order reconciliation.
- Storefront purchase analytics resolve an incoming `orderNumber` to the real `Order.id` before saving `conversion_events`.
- Purchase tracking state now carries `orderId` where public order creation returns it.
- Delayed Meta Pixel purchase tracking returns the stable event id immediately so the thank-you flow can avoid duplicate retries.
- Product launch ad URLs now store `utm_campaign={{campaign.id}}` and `utm_campaign_name={{campaign.name}}` for future row-level reconciliation.
- Facebook Ads performance summary now includes MaxP order attribution totals and per-campaign MaxP attributed order counts alongside Meta purchase metrics.
- Decision summary calculation is concurrency-limited and falls back per row if one ad decision fails, so the report does not return a full 500.

## Operator Notes

- `مشتريات Meta` is the Meta-reported purchase count.
- `أوردرات MaxP` is the real order count from MaxP order records for the selected period.
- Campaign rows show both `Meta شراء` and `MaxP أوردر` because they answer different attribution questions.
- Swan still needs Conversions API enabled with a valid token for server-side Meta purchase delivery; this release fixes local linkage and reporting clarity, not the external CAPI credential configuration.

## Verification

- Backend focused Jest:
  - `tests/services/analyticsServiceConversionEvent.test.js`
  - `tests/services/facebookAdsDecisionService.test.js`
  - `tests/controller/facebookAdsController.performanceSummary.test.js`
- Frontend focused Vitest:
  - `src/storefront/__tests__/purchaseTrackingStorage.test.ts`
  - `src/storefront/__tests__/useCheckout.test.ts`
- Backend syntax checks passed for the touched controllers/services.
