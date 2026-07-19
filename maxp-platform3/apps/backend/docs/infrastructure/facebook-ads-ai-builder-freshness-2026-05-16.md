# Facebook Ads AI Builder Freshness - 2026-05-16

## Scope

The `/advertising/facebook-ads/ai-builder` flow was updated after Swan testing exposed two usability risks:

- Old stored AI drafts were auto-loaded into the builder, so users could mistake history for a new AI answer.
- When the same product/settings were used repeatedly, the AI could reuse recent campaign names and copy.

## Changes

- The builder now starts with an empty result area. Recent drafts are available only through the explicit "previous drafts" action.
- New generation clears any displayed history before requesting AI output.
- The frontend sends a per-request freshness token with the AI draft request.
- The backend adds the freshness token and recent same-product draft copy to the model prompt as exclusion context.
- If the model still returns copy that matches recent drafts, sanitization replaces that campaign with rotated fallback copy.
- Fallback drafts now rotate by request/product context instead of always returning the same first variants.
- Recent draft context now covers the latest 30 same-product drafts. Fallback generation now has an expanded fresh variant pool, and prefers those fresh variants before older base templates when recent history exists.

## Campaign Hierarchy Check

Controller regression coverage confirms the existing hierarchy supports:

- More than one ad set under the same campaign.
- More than one ad under the same ad set.

The current AI Builder still generates one full campaign draft per idea. The lower-level APIs can already create additional ad sets and ads under existing parent records.

## Verification

- `backend/tests/services/facebookAdsAiDraftService.test.js`
- `backend/tests/controller/facebookAdsController.fullAd.test.js`
- `frontend/src/pages/advertising/__tests__/FacebookAdsAiBuilder.helpers.test.ts`
- Frontend production build
