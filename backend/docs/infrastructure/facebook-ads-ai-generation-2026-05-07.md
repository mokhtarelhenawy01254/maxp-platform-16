# Facebook Ads AI Generation

## Scope

Facebook Ads now has an AI draft path for product launches. The flow creates three campaign ideas for a product URL, then hands each draft to the existing full-ad creation pipeline so campaign, ad set, ad, targeting, creative, budget, page, and pixel handling stay consistent with the current Meta integration.

## Super Admin Setting

The Super Admin AI Providers page exposes `Facebook Ads AI` routing:

- `SYSTEM_DEFAULT`: use the normal global AI runtime and failover behavior.
- `SPECIFIC_KEY`: pin Facebook Ads generation to one active `AiKey`.

The persisted setting lives in `GlobalAiConfig.settings.facebookAdsGeneration`:

```json
{
  "mode": "SYSTEM_DEFAULT",
  "aiKeyId": null
}
```

When a key is deleted or deactivated, the pinned Facebook Ads setting is reset to system default.

## Runtime Flow

- API route: `POST /api/v1/facebook-ads/ai/drafts`
- Controller: `controller/facebookAdsAiController.js`
- Service: `services/facebookAdsAiDraftService.js`
- Frontend entry: `/advertising/facebook-ads/ai-builder`

The service returns three drafts with `createFullAdData` payloads that match the existing `/facebook-ads/full-ad` contract. Defaults are Egypt, women, age 18-45, Advantage Audience disabled, `OUTCOME_SALES`, website purchase optimization, automatic placements, `SHOP_NOW`, and EGP budget supplied by the operator.

## Swan Production Helper

The ignored script `backend/scripts/create-swan-facebook-ai-campaigns.js` is intentionally force-added in the release. It is a one-off production helper for Swan's Chunky Sneaker launch.

Dry run:

```bash
cd /var/www/backend2
node scripts/create-swan-facebook-ai-campaigns.js
```

Live creation:

```bash
cd /var/www/backend2
SWAN_FACEBOOK_ADS_LIVE=1 \
SWAN_CAMPAIGN_STATUS=ACTIVE \
SWAN_CAMPAIGN_BUDGET=200 \
SWAN_AD_ACCOUNT_ID=1120545302307751 \
SWAN_PIXEL_ID=1989842325284174 \
node scripts/create-swan-facebook-ai-campaigns.js
```

Set `SWAN_FACEBOOK_ADS_ALLOW_EXISTING=1` only when intentionally creating another set with the same deterministic campaign names.

The helper exits explicitly after success or failure so open Prisma or HTTP handles do not keep SSH production runs hanging after the dry-run or live operation has finished.

## Verification

- Backend regression: `npx jest tests/services/facebookAdsAiDraftService.test.js --runInBand --testTimeout=30000`
- Backend syntax: `npm run check:syntax`
- Frontend build: `npm run build`
- Production deploy: push to `main`, watch `Deploy to Server`, then verify PM2 and `/api/v1/health` over SSH.
