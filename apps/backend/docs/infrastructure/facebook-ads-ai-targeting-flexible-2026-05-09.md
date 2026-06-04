# Facebook Ads AI targeting and flexible creative

Date: 2026-05-09

## Scope

Facebook Ads AI Builder now generates publish-ready drafts with:

- AI audience plans inside `createFullAdData.targeting.aiAudiencePlan`.
- Safe Advantage Audience / targeting expansion flags, bounded by the operator's selected country, gender, and age range.
- Multiple primary text, headline, and description variations.
- `creativeType: "FLEXIBLE"` / `dynamicCreative: true` drafts that publish through the full-ad flow.
- `generationOptions` on new draft payloads, so the UI can restore explicitly-basic drafts while keeping AI + flexible as the default for older history that did not record these modes.
- Write-route role gates on Facebook Ads mutations, so only `SUPER_ADMIN`, `OWNER`, `COMPANY_ADMIN`, and `MANAGER` can generate, mutate, or publish ad assets.

## Backend contract

`FacebookAdsService.createFullAd` supports `SINGLE_IMAGE`, `SINGLE_VIDEO`, `CAROUSEL`, and `FLEXIBLE`.

For flexible ads the service:

1. Uploads URL assets to Meta before campaign creation when needed.
2. Creates the ad set with `is_dynamic_creative: true`.
3. Builds an ad creative using `asset_feed_spec` from prepared media hashes/video IDs plus text variation arrays.
4. Persists `dynamicCreative`, `flexibleAssets`, variation arrays, and the generated `assetFeedSpec` in the stored ad creative JSON.

AI-generated audience interests are stored as human-readable suggestions in the draft. During full-ad publish, the controller resolves those suggestions through Meta Targeting Search and only sends valid Meta `interests` IDs when the lookup succeeds. If lookup fails, the ad remains Advantage Audience / broad with the AI plan kept as operator-facing metadata instead of sending invented IDs.

## Safety

AI Builder bulk publish still forces `status: "PAUSED"` and clears active-publish confirmation tokens. Operators can review drafts in the full wizard before any ACTIVE launch.

Additional production guards:

- Full-ad publish now prefers a saved ad-account token and only falls back to a company token, so a valid account-scoped token can publish even if the company-level token is absent.
- Pixel discovery for AI Builder uses the same account-scoped token fallback, so isolated Ads OAuth can support the full generation form without relying on Messenger/page tokens.
- AI draft destination validation checks both product slug and host to prevent a matching slug on another origin from passing review.
- If a Meta campaign is created and then successfully rolled back after an Ad Set failure, the AI draft lock is released so the operator can retry with a new request id. Uncertain or partial Meta writes still stay locked for manual review.
- Review cards stay compact by default but include an expandable details area for full copy, variants, and audience summary before bulk PAUSED publish.
- Ads OAuth state is signed and callback user/company access is verified before storing credentials; non-manager roles cannot initiate the isolated Ads token flow.

## Verification

Covered by:

- `backend/tests/controller/facebookAdsController.fullAd.test.js`
- `backend/tests/services/facebookAdsAiDraftService.test.js`
- `backend/tests/services/facebookAdsService.creatives.test.js`
- `backend/tests/routes/facebookAdsRoutes.tools.test.js`
- `backend/tests/routes/facebookOAuthRoutes.ads.test.js`
- `frontend/src/pages/advertising/__tests__/FacebookAdsAiBuilder.helpers.test.ts`
